import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'zh', 'tw'],
    // Used when no locale matches
    defaultLocale: 'zh'
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signal.binaryworks.app";

// Agent 静态首页 HTML（Skill-first）
const AGENT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>High-Signal Aggregator - Skill Setup</title>
  <meta name="description" content="Skill-first API access for AI Agents">
  <link rel="alternate" type="application/json" href="/api/skill.json">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;min-height:100vh;background:linear-gradient(135deg,#0f172a,#1e293b);color:#e2e8f0;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{max-width:600px;width:100%;background:rgba(30,41,59,.8);border:1px solid rgba(148,163,184,.2);border-radius:16px;padding:32px}
    .badge{display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;margin-bottom:16px}
    h1{font-size:28px;margin-bottom:8px;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{color:#94a3b8;margin-bottom:24px}
    .warning{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#fbbf24;padding:12px 16px;border-radius:8px;margin-bottom:24px;font-size:14px}
    .section{margin-bottom:20px}
    .section-title{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px}
    code{background:#0f172a;padding:4px 8px;border-radius:4px;font-family:monospace;font-size:13px;color:#38bdf8}
    pre{background:#0f172a;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px}
    .tools{display:flex;flex-wrap:wrap;gap:8px}
    .tool{background:#334155;padding:6px 12px;border-radius:6px;font-size:12px}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Skill-Only</span>
    <h1>High-Signal Aggregator</h1>
    <p class="subtitle">AI-powered tech & finance signal aggregation</p>
    <div class="warning"><strong>Note:</strong> Install Skill first. MCP is removed.</div>
    <div class="section"><div class="section-title">Quick Start</div><pre>curl ${baseUrl}/api/skill.json</pre></div>
    <div class="section"><div class="section-title">Endpoints</div><code>/api/skill.json</code> - Skill manifest<br><code>/api/openclaw.json</code> - OpenClaw config<br><code>/agent-setup</code> - API key and setup guide</div>
    <div class="section"><div class="section-title">Auth</div><code>Authorization: Bearer $SIGNAL_API_KEY</code></div>
    <div class="section"><div class="section-title">Tools</div><div class="tools"><span class="tool">signals</span><span class="tool">sources</span><span class="tool">ai/read</span><span class="tool">podcast</span><span class="tool">rss/opml</span></div></div>
  </div>
</body>
</html>`;

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 排除不需要国际化处理的路径
    const excludedPaths = [
        '/api',
        '/_next',
        '/favicon.ico',
        '/.well-known',
    ];

    // 检查是否是排除的路径
    if (excludedPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // 根路径返回静态 Agent 信息（供 AI Agent 发现）
    // 通过 Accept header 区分人类用户和 AI Agent
    if (pathname === '/' || pathname === '') {
        const acceptHeader = request.headers.get('accept') || '';

        // 浏览器请求通常包含 text/html，让国际化中间件处理（重定向到本地化页面）
        if (acceptHeader.includes('text/html')) {
            return intlMiddleware(request);
        }

        // AI Agent 请求（只接受 application/json 或 */*），返回静态接入页面
        return new NextResponse(AGENT_HTML, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    }

    // 应用国际化中间件
    return intlMiddleware(request);
}

export const config = {
    // 匹配所有路径，但在中间件内部排除特定路径
    matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
