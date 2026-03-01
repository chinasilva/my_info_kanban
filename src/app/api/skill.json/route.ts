import { NextResponse } from "next/server";
import {
  AGENT_CAPABILITIES,
  buildCapabilityCurl,
} from "@/lib/agent/capabilities";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signal.binaryworks.app";

function buildSkillMarkdown(): string {
  const commandSections = AGENT_CAPABILITIES.map((capability) => {
    const example = buildCapabilityCurl(capability, baseUrl);
    return `### ${capability.id}

- Method: \`${capability.method}\`
- Path: \`${capability.path}\`
- Required permissions: \`${capability.requiredPermissions.join(", ")}\`
- Description: ${capability.description}

\`\`\`bash
${example}
\`\`\``;
  }).join("\n\n");

  return `# Signal Aggregator Skill

Use REST APIs directly with curl. MCP is not required.

## Prerequisites

- API Key (generate at ${baseUrl}/agent-setup)
- Environment variable: \`SIGNAL_API_KEY\`
- curl

## Install

1. Download this JSON from \`${baseUrl}/api/skill.json\`.
2. Put it into your Agent skill directory.
3. Set \`SIGNAL_API_KEY\`.
4. Run one read command to verify.

## Authentication

\`\`\`
Authorization: Bearer $SIGNAL_API_KEY
\`\`\`

## Commands

${commandSections}
`;
}

export async function GET() {
  const commands = AGENT_CAPABILITIES.map((capability) => ({
    id: capability.id,
    name: capability.name,
    description: capability.description,
    method: capability.method,
    path: capability.path,
    requiredPermissions: capability.requiredPermissions,
    example: buildCapabilityCurl(capability, baseUrl),
  }));

  const skillConfig = {
    name: "signal",
    description: "Skill-only agent access for high-quality tech and finance signals.",
    version: "2.0.0",
    argumentHint: "<command>",
    allowedTools: ["WebFetch", "Bash(curl *)"],
    installation: {
      description:
        "Install this JSON into your agent skill directory and configure SIGNAL_API_KEY.",
      skillMarkdown: buildSkillMarkdown(),
    },
    auth: {
      type: "bearer",
      header: "Authorization",
      prefix: "Bearer",
      envVar: "SIGNAL_API_KEY",
    },
    api: {
      baseUrl,
    },
    commands,
  };

  return NextResponse.json(skillConfig, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
