import { z } from "zod";

export const SourceTypeEnum = z.enum([
    "hackernews",
    "github",
    "producthunt",
    "twitter",
    "rss",
    "polymarket",
    "cryptopanic",
    "dune",
    "substack",
    "other"
]);

export const SourceSchema = z.object({
    id: z.string().cuid(),
    name: z.string().min(1),
    type: z.string(), // We use string to allow flexibility, but often it matches SourceTypeEnum
    baseUrl: z.string().url(),
    icon: z.string().nullable().optional(),
    config: z.record(z.string(), z.any()).nullable().optional(),
    isBuiltIn: z.boolean().default(false),
    isActive: z.boolean().default(true),
    lastFetched: z.date().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type Source = z.infer<typeof SourceSchema>;

export const CreateSourceSchema = SourceSchema.pick({
    name: true,
    type: true,
    baseUrl: true,
    icon: true,
    config: true,
});

export type CreateSourcePayload = z.infer<typeof CreateSourceSchema>;
