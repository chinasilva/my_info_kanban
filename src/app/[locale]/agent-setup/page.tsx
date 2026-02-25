"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Bot, Copy, Check, Terminal, ChevronRight, Loader2, Settings, BookOpen, Download } from "lucide-react";

export default function AgentSetupPage() {
  const { data: session, status: sessionStatus } = useSession();
  const t = useTranslations("AgentSetup");
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://signal.binaryworks.app";

  const mcpServerUrl = `${baseUrl}/api/mcp`;
  const manifestUrl = `${baseUrl}/api/mcp.json`;
  const skillConfigUrl = `${baseUrl}/api/skill.json`;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // 生成 API Key
  const generateApiKey = async () => {
    if (!session) return;

    setApiKeyLoading(true);
    try {
      const res = await fetch("/api/agent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Agent API Key",
          permissions: ["read:signals", "read:sources", "read:article", "write:signals", "write:sources", "read:insights"],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedApiKey(data.key);
      }
    } catch (error) {
      console.error("Failed to generate API key:", error);
    } finally {
      setApiKeyLoading(false);
    }
  };

  // Claude Desktop 配置
  const claudeDesktopConfig = {
    mcpServers: {
      "high-quality-info": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch", mcpServerUrl],
        env: {
          API_KEY: generatedApiKey || "${API_KEY}",
        },
      },
    },
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[var(--color-background)] text-[var(--color-foreground)] pb-20 md:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-[var(--color-text-muted)]">{t("description")}</p>
          </div>
        </div>

        {/* Quick Start */}
        <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-blue-500" />
            {t("quickStart")}
          </h2>
          <div className="space-y-3 text-sm">
            <p>{t("quickStartSteps")}</p>
          </div>
        </section>

        {/* API Key Section */}
        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              {t("apiKey")}
            </h2>
            {sessionStatus === "authenticated" && !generatedApiKey && (
              <button
                onClick={generateApiKey}
                disabled={apiKeyLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"
              >
                {apiKeyLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                {t("generateKey")}
              </button>
            )}
          </div>

          {sessionStatus === "unauthenticated" ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
              {t("loginRequired")}
            </div>
          ) : generatedApiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-[#0d1117] rounded-lg font-mono text-sm break-all border border-[#30363d]">
                  {generatedApiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, "apiKey")}
                  className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                  title={t("copy")}
                >
                  {copied === "apiKey" ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{t("apiKeyWarning")}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{t("apiKeyHint")}</p>
          )}
        </section>

        {/* Server URLs */}
        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("serverUrls")}</h2>

          {/* MCP Server */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">
              MCP Server URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-[#0d1117] rounded-lg font-mono text-sm break-all border border-[#30363d]">
                {mcpServerUrl}
              </code>
              <button
                onClick={() => copyToClipboard(mcpServerUrl, "serverUrl")}
                className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                title={t("copy")}
              >
                {copied === "serverUrl" ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Manifest URL */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">
              Manifest URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-[#0d1117] rounded-lg font-mono text-sm break-all border border-[#30363d]">
                {manifestUrl}
              </code>
              <button
                onClick={() => copyToClipboard(manifestUrl, "manifestUrl")}
                className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                title={t("copy")}
              >
                {copied === "manifestUrl" ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Claude Desktop Config */}
        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold mb-4">{t("claudeDesktopConfig")}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {t("claudeDesktopHint")}
          </p>
          <div className="relative">
            <pre className="p-4 bg-[#0d1117] rounded-lg overflow-x-auto border border-[#30363d] text-sm">
              <code className="font-mono text-green-400">
                {JSON.stringify(claudeDesktopConfig, null, 2)}
              </code>
            </pre>
            <button
              onClick={() => copyToClipboard(JSON.stringify(claudeDesktopConfig, null, 2), "claudeConfig")}
              className="absolute top-2 right-2 p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
              title={t("copy")}
            >
              {copied === "claudeConfig" ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </section>

        {/* Available Tools */}
        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold mb-4">{t("availableTools")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "get_signals", desc: t("tools.get_signals") },
              { name: "get_signal_detail", desc: t("tools.get_signal_detail") },
              { name: "get_sources", desc: t("tools.get_sources") },
              { name: "read_article", desc: t("tools.read_article") },
              { name: "mark_as_read", desc: t("tools.mark_as_read") },
              { name: "favorite_signal", desc: t("tools.favorite_signal") },
              { name: "subscribe_source", desc: t("tools.subscribe_source") },
              { name: "search_signals", desc: t("tools.search_signals") },
              { name: "get_insights", desc: t("tools.get_insights") },
            ].map((tool) => (
              <div
                key={tool.name}
                className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]"
              >
                <code className="text-blue-400 text-sm font-mono">{tool.name}</code>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold mb-4">{t("authentication")}</h2>
          <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>{t("authHint")}</p>
            <div className="p-3 bg-[#0d1117] rounded-lg font-mono text-xs border border-[#30363d]">
              {`Authorization: Bearer ${generatedApiKey || "YOUR_API_KEY"}`}
            </div>
            <p>{t("authHint2")}</p>
          </div>
        </section>

        {/* Skill Installation Section */}
        <section className="bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-2xl p-6 border border-green-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-500" />
            {t("skillInstall") || "安装为 Skill"}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {t("skillInstallHint") || "让 AI Agent 通过 curl 调用此服务的工具"}
          </p>

          {/* Skill Config URL */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">
              Skill Config URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-[#0d1117] rounded-lg font-mono text-sm break-all border border-[#30363d]">
                {skillConfigUrl}
              </code>
              <button
                onClick={() => copyToClipboard(skillConfigUrl, "skillConfigUrl")}
                className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                title={t("copy")}
              >
                {copied === "skillConfigUrl" ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
              <a
                href={skillConfigUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Skill Usage Example */}
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("skillUsageHint") || "获取信号列表示例："}
            </p>
            <div className="relative">
              <pre className="p-4 bg-[#0d1117] rounded-lg overflow-x-auto border border-[#30363d] text-sm">
                <code className="font-mono text-green-400">
                  {`curl -s -X POST ${mcpServerUrl} \\
  -H "Authorization: Bearer $SIGNAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_signals","arguments":{}},"id":1}'`}
                </code>
              </pre>
              <button
                onClick={() => copyToClipboard(`curl -s -X POST ${mcpServerUrl} -H "Authorization: Bearer $SIGNAL_API_KEY" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_signals","arguments":{}},"id":1}'`, "skillExample")}
                className="absolute top-2 right-2 p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                title={t("copy")}
              >
                {copied === "skillExample" ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
