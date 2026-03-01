import { NextResponse } from "next/server";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signal.binaryworks.app";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>High-Signal Aggregator - Skill Setup for Agents</title>
  <meta name="description" content="Skill-first agent setup for High-Signal Aggregator APIs.">
  <link rel="alternate" type="application/json" href="/api/skill.json">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 920px; margin: 0 auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
    h1 { color: #60a5fa; }
    h2 { color: #22d3ee; margin-top: 30px; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; padding: 15px; border-radius: 8px; overflow-x: auto; }
    .box { background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .badge { display: inline-block; background: #0ea5e9; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 8px; }
    a { color: #7dd3fc; }
  </style>
</head>
<body>
  <span class="badge">Skill-Only</span>
  <span class="badge">Agent Ready</span>
  <h1>High-Signal Aggregator</h1>
  <p><strong>Install Skill first. MCP is removed from this service.</strong></p>

  <h2>Install Skill</h2>
  <div class="box">
    1. Get skill config: <a href="/api/skill.json">/api/skill.json</a><br>
    2. Put it into your agent skill directory<br>
    3. Generate API key at <a href="/agent-setup">/agent-setup</a><br>
    4. Set env var: <code>SIGNAL_API_KEY</code>
  </div>

  <h2>Auth</h2>
  <pre><code>Authorization: Bearer $SIGNAL_API_KEY</code></pre>

  <h2>Quick Check</h2>
  <pre><code>curl -s -X GET "${baseUrl}/api/signals?limit=5" \\
  -H "Authorization: Bearer $SIGNAL_API_KEY"</code></pre>

  <h2>Skill Config Endpoints</h2>
  <div class="box"><a href="/api/skill.json">/api/skill.json</a> - full skill command manifest</div>
  <div class="box"><a href="/api/openclaw.json">/api/openclaw.json</a> - OpenClaw command config</div>

  <h2>Core Features</h2>
  <ul>
    <li>Signals query/detail</li>
    <li>Source list/subscribe/unsubscribe</li>
    <li>RSS create/delete and OPML import</li>
    <li>AI article read/history</li>
    <li>Podcast script generation</li>
    <li>Optional job triggers (permission-gated)</li>
  </ul>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
