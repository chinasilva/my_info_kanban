"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, Loader2, Settings, Shield } from "lucide-react";
import { AGENT_CAPABILITIES, buildCapabilityCurl } from "@/lib/agent/capabilities";
import { DEFAULT_AGENT_PERMISSIONS } from "@/lib/auth/permissions";

const READ_WRITE_PERMISSIONS = [
  ...DEFAULT_AGENT_PERMISSIONS,
  "write:signals",
  "write:sources",
];

const JOB_RUNNER_PERMISSIONS = [...READ_WRITE_PERMISSIONS, "execute:jobs"];

type KeyScope = "readonly" | "readwrite" | "operator";

export default function AgentSetupPage() {
  const { data: session, status: sessionStatus } = useSession();
  const t = useTranslations("AgentSetup");

  const [copied, setCopied] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [keyScope, setKeyScope] = useState<KeyScope>("readonly");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://signal.binaryworks.app";
  const skillConfigUrl = `${baseUrl}/api/skill.json`;
  const openclawConfigUrl = `${baseUrl}/api/openclaw.json`;

  const keyPermissions = useMemo(() => {
    if (keyScope === "readwrite") return READ_WRITE_PERMISSIONS;
    if (keyScope === "operator") return JOB_RUNNER_PERMISSIONS;
    return DEFAULT_AGENT_PERMISSIONS;
  }, [keyScope]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generateApiKey = async () => {
    if (!session) return;
    setApiKeyLoading(true);
    try {
      const res = await fetch("/api/agent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Agent API Key (${keyScope})`,
          permissions: keyPermissions,
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

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[var(--color-background)] text-[var(--color-foreground)] pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-[var(--color-text-muted)]">{t("description")}</p>
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
            {t("quickStartSteps")}
          </div>
        </header>

        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("apiKey")}</h2>
            {sessionStatus === "authenticated" && (
              <button
                onClick={generateApiKey}
                disabled={apiKeyLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"
              >
                {apiKeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                {t("generateKey")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setKeyScope("readonly")}
              className={`border rounded-lg p-3 text-left ${keyScope === "readonly" ? "border-blue-500 bg-blue-500/10" : "border-[var(--color-border)]"}`}
            >
              <p className="font-medium">Read-Only</p>
              <p className="text-xs text-[var(--color-text-muted)]">signals/sources/article/insights</p>
            </button>
            <button
              onClick={() => setKeyScope("readwrite")}
              className={`border rounded-lg p-3 text-left ${keyScope === "readwrite" ? "border-blue-500 bg-blue-500/10" : "border-[var(--color-border)]"}`}
            >
              <p className="font-medium">Read-Write</p>
              <p className="text-xs text-[var(--color-text-muted)]">+ favorite, read, subscribe, RSS/OPML</p>
            </button>
            <button
              onClick={() => setKeyScope("operator")}
              className={`border rounded-lg p-3 text-left ${keyScope === "operator" ? "border-blue-500 bg-blue-500/10" : "border-[var(--color-border)]"}`}
            >
              <p className="font-medium">Operator</p>
              <p className="text-xs text-[var(--color-text-muted)]">+ cron jobs</p>
            </button>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs">
            <p className="mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Selected permissions
            </p>
            <code>{keyPermissions.join(", ")}</code>
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
                >
                  {copied === "apiKey" ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{t("apiKeyWarning")}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{t("apiKeyHint")}</p>
          )}
        </section>

        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
          <h2 className="text-lg font-semibold">Skill Configuration</h2>

          {[
            { label: "Skill Config URL", value: skillConfigUrl, key: "skillConfigUrl" },
            { label: "OpenClaw Config URL", value: openclawConfigUrl, key: "openclawConfigUrl" },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">{item.label}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-[#0d1117] rounded-lg font-mono text-sm break-all border border-[#30363d]">
                  {item.value}
                </code>
                <button
                  onClick={() => copyToClipboard(item.value, item.key)}
                  className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                >
                  {copied === item.key ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
                <a
                  href={item.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <p className="text-sm mb-2">{t("authHint")}</p>
            <code className="text-xs break-all">Authorization: Bearer {generatedApiKey || "YOUR_API_KEY"}</code>
          </div>
        </section>

        <section className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("availableTools")}</h2>
          <div className="space-y-4">
            {AGENT_CAPABILITIES.map((capability) => {
              const curl = buildCapabilityCurl(capability, baseUrl);
              return (
                <div key={capability.id} className="rounded-lg border border-[var(--color-border)] p-4 bg-[var(--color-background)]">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <code className="text-blue-400 text-sm">{capability.id}</code>
                    <span className="text-xs px-2 py-1 rounded bg-slate-700">{capability.method}</span>
                    <code className="text-xs">{capability.path}</code>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mb-2">{capability.description}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">
                    permissions: <code>{capability.requiredPermissions.join(", ")}</code>
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-[#0d1117] rounded-lg overflow-x-auto border border-[#30363d] text-xs">
                      <code className="font-mono text-green-400">{curl}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(curl, capability.id)}
                      className="absolute top-2 right-2 p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
                    >
                      {copied === capability.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
