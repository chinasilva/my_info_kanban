import { NextResponse } from "next/server";
import {
  AGENT_CAPABILITIES,
  buildCapabilityCurl,
} from "@/lib/agent/capabilities";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signal.binaryworks.app";

function buildSetupDoc(): string {
  const commandLines = AGENT_CAPABILITIES.map((capability) => {
    return `### ${capability.id}

\`\`\`bash
${buildCapabilityCurl(capability, baseUrl)}
\`\`\``;
  }).join("\n\n");

  return `# OpenClaw Signal Config

OpenClaw should call this service through \`exec\` with curl.

## Prerequisites

1. Generate API key at ${baseUrl}/agent-setup
2. Set environment variable: \`SIGNAL_API_KEY\`

## Auth Header

\`\`\`
Authorization: Bearer $SIGNAL_API_KEY
\`\`\`

## Commands

${commandLines}
`;
}

export async function GET() {
  const commands = AGENT_CAPABILITIES.map((capability) => ({
    id: capability.id,
    method: capability.method,
    path: capability.path,
    description: capability.description,
    requiredPermissions: capability.requiredPermissions,
    exec: buildCapabilityCurl(capability, baseUrl),
  }));

  const openclawConfig = {
    name: "openclaw-signal",
    description: "Skill-first access to high-quality signal aggregation APIs.",
    version: "2.0.0",
    agentType: "openclaw",
    execConfig: {
      shell: "/bin/bash",
      allowedCommands: ["curl", "echo"],
      envVars: ["SIGNAL_API_KEY"],
    },
    installation: {
      description: "Use curl exec commands with bearer API key.",
      setup: buildSetupDoc(),
    },
    api: {
      baseUrl,
      auth: {
        type: "bearer",
        header: "Authorization",
        prefix: "Bearer",
        envVar: "SIGNAL_API_KEY",
      },
    },
    commands,
  };

  return NextResponse.json(openclawConfig, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
