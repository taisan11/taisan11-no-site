import type { APIRoute } from 'astro';

export const prerender = false;  // ← これを書くとこのページだけ動的になる（Hybridの肝）

export const GET: APIRoute = async ({ locals, cookies, request }) => {
    const kv: KVNamespace = locals.runtime.env.counter;

    // determine/count
    let count: number;
    if (cookies.get("session_id") && await kv.get(`session_${cookies.get("session_id")?.value}`)) {
        // セッションがある場合はカウントしない
        count = Number(await kv.get("count") ?? "0");
    } else {
        count = Number(await kv.get("count") ?? "0");
        count += 1;
        await kv.put("count", count.toString());
        // 一時間の間は再カウントしない
        const session_id = crypto.randomUUID();
        await kv.put(`session_${session_id}`, "1", { expirationTtl: 60 * 60 });
        cookies.set("session_id", session_id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });
    }

    // ETag + caching headers
    const etag = `"${count}"`;
    const cacheControl = "public, max-age=5, s-maxage=60, stale-while-revalidate=30";
    const vary = "Cookie";

    // handle conditional request
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
        return new Response(null, {
            status: 304,
            headers: {
                "Cache-Control": cacheControl,
                "ETag": etag,
                "Vary": vary,
            },
        });
    }

    return new Response(JSON.stringify({ count }), {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": cacheControl,
            "ETag": etag,
            "Vary": vary,
        },
    });
};

// 必要ならPOSTでも受け付けられる
export const POST: APIRoute = async ({ request, locals }) => {
    const kv: KVNamespace = locals.runtime.env.counter;
    let count = Number(await kv.get("count") ?? "0");
    count += 1;
    await kv.put("count", count.toString());

    return new Response(JSON.stringify({ count }), { status: 200 });
};