export const AGENT_PERMISSIONS = [
  "read:signals",
  "read:sources",
  "read:article",
  "write:signals",
  "write:sources",
  "read:insights",
  "execute:jobs",
] as const;

export type Permission = (typeof AGENT_PERMISSIONS)[number];

export const DEFAULT_AGENT_PERMISSIONS: Permission[] = [
  "read:signals",
  "read:sources",
  "read:article",
  "read:insights",
];
