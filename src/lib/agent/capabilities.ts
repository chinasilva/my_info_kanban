import type { Permission } from "@/lib/auth/permissions";

export type AgentHttpMethod = "GET" | "POST" | "DELETE" | "PATCH";

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  method: AgentHttpMethod;
  path: string;
  requiredPermissions: Permission[];
  query?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, string>;
  multipart?: {
    field: string;
    filePlaceholder: string;
  };
}

export const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    id: "get_signals",
    name: "Get Signals",
    description: "Get signals with filters such as sourceType, tag, date, sourceId, cursor and limit.",
    method: "GET",
    path: "/api/signals",
    requiredPermissions: ["read:signals"],
    query: {
      limit: 10,
      days: 1,
      sourceType: "news",
    },
  },
  {
    id: "get_signal_detail",
    name: "Get Signal Detail",
    description: "Get detailed fields of one signal by id.",
    method: "GET",
    path: "/api/signals/{id}",
    requiredPermissions: ["read:signals"],
    pathParams: {
      id: "SIGNAL_ID",
    },
  },
  {
    id: "get_sources",
    name: "Get Sources",
    description: "List available sources and subscription status.",
    method: "GET",
    path: "/api/sources",
    requiredPermissions: ["read:sources"],
  },
  {
    id: "mark_as_read",
    name: "Mark As Read",
    description: "Mark a signal as read.",
    method: "POST",
    path: "/api/signals/{id}/read",
    requiredPermissions: ["write:signals"],
    pathParams: {
      id: "SIGNAL_ID",
    },
  },
  {
    id: "favorite_signal",
    name: "Toggle Favorite",
    description: "Toggle favorite status for a signal.",
    method: "POST",
    path: "/api/signals/{id}/favorite",
    requiredPermissions: ["write:signals"],
    pathParams: {
      id: "SIGNAL_ID",
    },
  },
  {
    id: "subscribe_source",
    name: "Subscribe Source",
    description: "Subscribe to a source.",
    method: "POST",
    path: "/api/sources/{id}/subscribe",
    requiredPermissions: ["write:sources"],
    pathParams: {
      id: "SOURCE_ID",
    },
  },
  {
    id: "unsubscribe_source",
    name: "Unsubscribe Source",
    description: "Unsubscribe from a source.",
    method: "DELETE",
    path: "/api/sources/{id}/subscribe",
    requiredPermissions: ["write:sources"],
    pathParams: {
      id: "SOURCE_ID",
    },
  },
  {
    id: "create_rss_source",
    name: "Create RSS Source",
    description: "Create a custom RSS source and subscribe to it.",
    method: "POST",
    path: "/api/sources/rss",
    requiredPermissions: ["write:sources"],
    body: {
      name: "My Feed",
      feedUrl: "https://example.com/feed.xml",
      icon: "📰",
    },
  },
  {
    id: "delete_rss_source",
    name: "Delete RSS Source",
    description: "Delete a custom RSS source created by current user.",
    method: "DELETE",
    path: "/api/sources/rss/{id}",
    requiredPermissions: ["write:sources"],
    pathParams: {
      id: "SOURCE_ID",
    },
  },
  {
    id: "import_opml",
    name: "Import OPML",
    description: "Import RSS feeds from OPML file.",
    method: "POST",
    path: "/api/sources/opml",
    requiredPermissions: ["write:sources"],
    multipart: {
      field: "file",
      filePlaceholder: "feeds.opml",
    },
  },
  {
    id: "read_article",
    name: "Read Article",
    description: "Generate summary or translation for article URL.",
    method: "GET",
    path: "/api/ai/read",
    requiredPermissions: ["read:article"],
    query: {
      url: "https://example.com/article",
      mode: "short",
    },
  },
  {
    id: "get_reading_history",
    name: "Get Reading History",
    description: "Get latest AI reading history.",
    method: "GET",
    path: "/api/ai/history",
    requiredPermissions: ["read:article"],
  },
  {
    id: "generate_podcast_script",
    name: "Generate Podcast Script",
    description: "Generate a podcast script from selected sources.",
    method: "POST",
    path: "/api/podcast/generate-script",
    requiredPermissions: ["read:signals"],
    body: {
      sourceIds: ["SOURCE_ID_1", "SOURCE_ID_2"],
      dateRange: 7,
      maxSignals: 10,
      language: "zh",
      style: "casual",
    },
  },
  {
    id: "run_fetch_job",
    name: "Run Fetch Job",
    description: "Trigger scraper fetch job.",
    method: "GET",
    path: "/api/cron/fetch",
    requiredPermissions: ["execute:jobs"],
  },
  {
    id: "run_process_pending",
    name: "Run Process Pending Job",
    description: "Trigger pending AI processing job.",
    method: "GET",
    path: "/api/cron/process-pending",
    requiredPermissions: ["execute:jobs"],
    query: {
      batchSize: 50,
      maxBatches: 3,
    },
  },
];

function buildQueryString(
  query: AgentCapability["query"]
): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  return params.toString();
}

function resolvePath(
  path: string,
  pathParams: AgentCapability["pathParams"]
): string {
  if (!pathParams) {
    return path;
  }

  let resolvedPath = path;
  for (const [key, value] of Object.entries(pathParams)) {
    resolvedPath = resolvedPath.replace(`{${key}}`, value);
  }
  return resolvedPath;
}

export function buildCapabilityCurl(
  capability: AgentCapability,
  baseUrl: string
): string {
  const resolvedPath = resolvePath(capability.path, capability.pathParams);
  const queryString = buildQueryString(capability.query);
  const endpoint = `${baseUrl}${resolvedPath}${queryString ? `?${queryString}` : ""}`;
  const authHeader = `-H "Authorization: Bearer $SIGNAL_API_KEY"`;

  if (capability.multipart) {
    return [
      `curl -s -X ${capability.method} "${endpoint}" \\`,
      `  ${authHeader} \\`,
      `  -F "${capability.multipart.field}=@${capability.multipart.filePlaceholder}"`,
    ].join("\n");
  }

  if (capability.body) {
    return [
      `curl -s -X ${capability.method} "${endpoint}" \\`,
      `  ${authHeader} \\`,
      '  -H "Content-Type: application/json" \\',
      `  -d '${JSON.stringify(capability.body)}'`,
    ].join("\n");
  }

  if (capability.method === "GET") {
    return [
      `curl -s -X GET "${endpoint}" \\`,
      `  ${authHeader}`,
    ].join("\n");
  }

  return [
    `curl -s -X ${capability.method} "${endpoint}" \\`,
    `  ${authHeader} \\`,
    '  -H "Content-Type: application/json"',
  ].join("\n");
}
