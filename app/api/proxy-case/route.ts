import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl || !targetUrl.startsWith("https://cieden.com/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    }

    let html = await res.text();

    // Inject <base> so every relative URL resolves to cieden.com
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="https://cieden.com/" target="_blank" />`);

    // Inject styles: hide site header, nav, cookie banners — so only case content shows in iframe
    const iframeStyles = `
      <style>
        header, nav, [role="banner"],
        .cookie-banner, .cookie-consent, [class*="cookie"], [id*="cookie"],
        .popup-overlay, .modal-backdrop,
        [class*="navbar"], [class*="site-header"], [class*="main-nav"] { display: none !important; }
        body { overflow-x: hidden; }
      </style>
    `;
    html = html.replace("</head>", `${iframeStyles}</head>`);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
