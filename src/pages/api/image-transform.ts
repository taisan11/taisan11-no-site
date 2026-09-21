import type { APIRoute } from "astro";

export const prerender = false;

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_PIXELS = 40_000_000;
const MAX_DIMENSION = 8_000;
const FITS = new Set(["cover", "contain", "fill", "inside", "outside"]);

function numberField(form: FormData, name: string, fallback: number) {
  const value = Number(form.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function positiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_DIMENSION) {
    throw new Error(`${name} は1〜${MAX_DIMENSION}の整数で指定してください`);
  }
  return value;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return Response.json({ error: "画像ファイルを選択してください" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_INPUT_BYTES) {
      return Response.json({ error: "画像は20MB以下にしてください" }, { status: 413 });
    }

    const { default: sharp } = await import("sharp");
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: MAX_OUTPUT_PIXELS });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      return Response.json({ error: "画像のサイズを取得できませんでした" }, { status: 400 });
    }

    const cropWidth = numberField(form, "cropWidth", metadata.width);
    const cropHeight = numberField(form, "cropHeight", metadata.height);
    const cropLeft = numberField(form, "cropLeft", 0);
    const cropTop = numberField(form, "cropTop", 0);
    const hasCrop = ["cropLeft", "cropTop", "cropWidth", "cropHeight"].some((key) => form.has(key));

    let pipeline = image;
    if (hasCrop) {
      const width = positiveInteger(cropWidth, "切り抜き幅");
      const height = positiveInteger(cropHeight, "切り抜き高さ");
      if (!Number.isInteger(cropLeft) || !Number.isInteger(cropTop) || cropLeft < 0 || cropTop < 0 ||
          cropLeft + width > metadata.width || cropTop + height > metadata.height) {
        throw new Error("切り抜き範囲が元画像の外側です");
      }
      pipeline = pipeline.extract({ left: cropLeft, top: cropTop, width, height });
    }

    const resizeWidth = positiveInteger(numberField(form, "width", metadata.width), "リサイズ幅");
    const resizeHeight = positiveInteger(numberField(form, "height", metadata.height), "リサイズ高さ");
    if (resizeWidth * resizeHeight > MAX_OUTPUT_PIXELS) {
      throw new Error("出力画像が大きすぎます（合計4,000万画素まで）");
    }
    const fitValue = String(form.get("fit") || "inside");
    if (!FITS.has(fitValue)) throw new Error("不正なリサイズ方式です");

    const output = await pipeline
      .resize({ width: resizeWidth, height: resizeHeight, fit: fitValue as "cover" | "contain" | "fill" | "inside" | "outside" })
      .webp({ quality: 90 })
      .toBuffer();

    return new Response(output, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": 'attachment; filename="resized.webp"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "画像を処理できませんでした";
    return Response.json({ error: message }, { status: 400 });
  }
};
