import { z } from "zod";
import { SourceSchema } from "./source";

export const SignalSchema = z.object({
    id: z.string(),
    title: z.string(),
    url: z.string().url(),
    summary: z.string().nullable().optional(),
    score: z.number().default(0),
    sourceId: z.string(),
    category: z.string().nullable().optional(),

    // Arrays
    tags: z.array(z.string()).default([]),
    tagsZh: z.array(z.string()).default([]),

    // AI Fields
    aiSummary: z.string().nullable().optional(),
    aiSummaryZh: z.string().nullable().optional(),
    titleTranslated: z.string().nullable().optional(),

    // Metadata
    externalId: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.any()).nullable().optional(),

    // Dates (Frontend often receives strings from JSON APIs)
    createdAt: z.union([z.date(), z.string()]),
    updatedAt: z.union([z.date(), z.string()]).optional(),

    // Relations (Optional/Partial for list views)
    source: z.union([SourceSchema, z.string()]).optional(), // Supports expanded object or just name/ID in some legacy cases

    // Computed/User specific fields (Joined at runtime)
    isRead: z.boolean().optional(),
    isFavorited: z.boolean().optional(),
});

export type Signal = z.infer<typeof SignalSchema>;

// For API Responses where dates are definitely strings
export const SignalResponseSchema = SignalSchema.extend({
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});
