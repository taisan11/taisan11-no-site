import type { APIRoute } from "astro";

export const prerender = false;

function validUserAgent(userAgent: string | null): boolean {
    if (!userAgent) return false;

    const ua = userAgent.trim().toLowerCase();

    // ブラウザっぽくないUAを除外
    if (!ua.startsWith("mozilla/5.0")) {
        return false;
    }

    // よくあるbotを軽く除外
    if (
        ua.includes("bot") ||
        ua.includes("spider") ||
        ua.includes("crawler") ||
        ua.includes("curl") ||
        ua.includes("wget")
    ) {
        return false;
    }

    return true;
}

export const GET: APIRoute = async ({
    request,
    cookies,
    locals,
}) => {
    // 最新の Astro Cloudflare adapter では locals.runtime.env を使う
    const env = locals.runtime.env;
    const kv: KVNamespace = env.visitor_counter;

    const sessionId = cookies.get("session_id")?.value;

    let alreadyCounted = false;

    // Cookie がある場合だけ KV 確認
    if (sessionId) {
        const exists = await kv.get(`session_${sessionId}`);
        alreadyCounted = exists === "1";
    }

    const isValidUA = validUserAgent(
        request.headers.get("user-agent")
    );

    let count = Number((await kv.get("count")) ?? "0");

    if (isValidUA && !alreadyCounted) {
        count += 1;

        // NOTE:
        // KV は atomic increment がないので
        // 高トラフィックなら Durable Object or D1 推奨
        await kv.put("count", String(count));

        const newSessionId = crypto.randomUUID();

        await kv.put(
            `session_${newSessionId}`,
            "1",
            {
                expirationTtl: 60 * 30,
            }
        );

        cookies.set("session_id", newSessionId, {
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: 60 * 30,
        });
    }

    const etag = `"${count}"`;

    const ifNoneMatch =
        request.headers.get("if-none-match");

    if (ifNoneMatch === etag) {
        return new Response(null, {
            status: 304,
            headers: {
                "ETag": etag,

                // Cookie で内容が変わるので private
                "Cache-Control":
                    "private, max-age=5, stale-while-revalidate=30",
            },
        });
    }

    return Response.json(
        { count },
        {
            headers: {
                "ETag": etag,

                "Cache-Control":
                    "private, max-age=5, stale-while-revalidate=30",
            },
        }
    );
};

export const POST: APIRoute = async ({
    locals,
    request,
}) => {
    // 必要ならCSRFや認証を入れる
    const env = locals.runtime.env;

    const kv: KVNamespace = env.visitor_counter;

    let count = Number((await kv.get("count")) ?? "0");

    count += 1;

    await kv.put("count", String(count));

    return Response.json({ count });
};
