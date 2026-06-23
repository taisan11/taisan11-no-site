import { defineMdastPlugin } from "satteri"
import type { Link, Paragraph } from "mdast"
import { unfurl } from "unfurl.js"

export type HProperties = Record<string, string>

export type Transformer = {
  hName: string | ((url: URL) => Promise<string>)
  hProperties?: HProperties | ((url: URL) => Promise<HProperties>)
  match: (url: URL) => Promise<boolean>
}

export type RemarkEmbedOptions = {
  transformers: Transformer[]
}

const defaultRemarkEmbedOptions: Readonly<RemarkEmbedOptions> = {
  transformers: [],
}

type UnfurlMetadata = Awaited<ReturnType<typeof unfurl>>

const unfurlCache = new Map<string, Promise<UnfurlMetadata | null>>()

const getUnfurlMetadata = async (href: string): Promise<UnfurlMetadata | null> => {
  const cached = unfurlCache.get(href)
  if (cached) return cached

  const promise = unfurl(href).catch(() => null)
  unfurlCache.set(href, promise)
  return promise
}

export const oEmbedTransformer: Readonly<Transformer> = {
  hName: "oembed",
  hProperties: async (url) => {
    const metadata = await getUnfurlMetadata(url.href)

    if (metadata?.oEmbed != null) return { oEmbed: JSON.stringify(metadata.oEmbed) }
    return {} as HProperties
  },
  match: async (url) => {
    const metadata = await getUnfurlMetadata(url.href)
    return metadata?.oEmbed != null
  },
}

export const youTubeTransformer: Readonly<Transformer> = {
  hName: "iframe",
  hProperties: async (url): Promise<HProperties> => {
    const getYouTubeId = (url: URL): string | null => {
      // Handle youtu.be short links
      if (url.hostname === "youtu.be") {
        return url.pathname.slice(1) || null
      }
      // Handle www.youtube.com/watch?v=ID and www.youtube.com/embed/ID
      const regExp = /^.*(watch\?v=|embed\/)([^#&?]*).*/
      const match = url.href.match(regExp)
      if (match && match[2]) {
        return match[2]
      }
      // Handle www.youtube.com/v/ID
      const vMatch = url.pathname.match(/^\/v\/([^/?#]+)/)
      if (vMatch && vMatch[1]) {
        return vMatch[1]
      }
      return null
    }

    const videoId = getYouTubeId(url)
    if (!videoId) {
      throw new Error("Invalid YouTube URL")
    }

    return {
      src: `https://www.youtube.com/embed/${videoId}`,
      width: "100%",
      height: "360",
    }
  },
  match: async (url) => {
    return (
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtu.be"
    )
  },
}

export const googleSlidesTransformer: Readonly<Transformer> = {
  hName: "iframe",
  hProperties: async (url): Promise<HProperties> => {
    const getEmbedUrl = (isWeb: boolean) => {
      const path = url.pathname.split("/")

      if (isWeb) {
        path[path.length - 1] = "embed"
        return new URL(path.join("/"), url.origin)
      }

      if (path.length <= 3) {
        path.push("embed")
      } else {
        path[path.length - 1] = "embed"
      }
      return new URL(path.join("/"), url.origin)
    }

    const isWeb = url.pathname.startsWith("/presentation/d/e/")

    return {
      src: getEmbedUrl(isWeb).href,
      width: "100%",
      frameBorder: "0",
      allowFullScreen: "true",
      mozAllowFullScreen: "true",
      msAllowFullScreen: "true",
      style: "aspect-ratio: 960/569;",
    }
  },
  match: async (url) => {
    const isGoogleDocs = url.hostname === "docs.google.com"
    const isGoogleSlides = url.pathname.startsWith("/presentation/d/")
    return isGoogleDocs && isGoogleSlides
  },
}

const getHName = async (transformer: Transformer, url: URL) => {
  if (typeof transformer.hName === "function") return transformer.hName(url)
  return transformer.hName
}

const getHProperties = async (transformer: Transformer, url: URL) => {
  if (typeof transformer.hProperties === "function") return transformer.hProperties(url)
  return transformer.hProperties
}

export const remarkEmbed = (options: RemarkEmbedOptions = defaultRemarkEmbedOptions) => {
  return defineMdastPlugin({
    name: "remark-embed",
    link(node, ctx) {
      const firstChild = Array.isArray(node.children) ? node.children[0] : undefined
      const parent = ctx.parent(node) as Paragraph

      // Check if the paragraph only contains a single url link
      if (
        !parent ||
        parent.type !== "paragraph" ||
        parent.children.length !== 1 ||
        (node.data?.hName != null && node.data?.hName !== "a") ||
        !firstChild ||
        firstChild.type !== "text" ||
        firstChild.value !== node.url
      )
        return

      let url: URL
      try {
        url = new URL(node.url)
      } catch {
        return
      }

      // Satteri doesn't have a direct "async" mechanism inside the visitor like unified's `file.message` for deferred tasks,
      // but we can use `ctx.data` to store promises if we want to await them later, or just run them synchronously if possible.
      // However, `unfurl` is async. Satteri supports async visitors.
      return (async () => {
        for (const transformer of options.transformers) {
          if (!(await transformer.match(url))) continue

          const hName = await getHName(transformer, url)
          const hProperties = {
            ...(await getHProperties(transformer, url)),
            url: node.url,
          }

          // Satteri allows setting `data.hName` and `data.hProperties` to override rendering.
          ctx.setProperty(node, "data", {
            hName,
            hProperties,
          })
          ctx.setProperty(node, "children", [])
          return
        }
      })()
    }
  })
}

export const satteriRemarkBreaks = defineMdastPlugin({
  name: "satteri-remark-breaks",
  paragraph(node, ctx) {
    // We need to process text nodes inside paragraphs to replace newlines with breaks.
    const newChildren: any[] = []
    let changed = false

    for (const child of node.children) {
      if (child.type === "text" && child.value.includes("\n")) {
        changed = true
        const parts = child.value.split("\n")
        parts.forEach((part, i) => {
          if (part) {
            newChildren.push({ type: "text", value: part })
          }
          if (i < parts.length - 1) {
            newChildren.push({ type: "break" })
          }
        })
      } else {
        newChildren.push(child)
      }
    }

    if (changed) {
      ctx.setProperty(node, "children", newChildren)
    }
  }
})
