import { z } from "zod";

export const PaginationSchema = z.object({
    cursor: z.string().optional().nullable(),
    limit: z.coerce.number().min(1).max(100).default(50),
});

export const SignalQuerySchema = PaginationSchema.extend({
    sourceType: z.string().optional().nullable(),
    tag: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    days: z.coerce.number().min(1).max(365).default(7),
});

export type SignalQuery = z.infer<typeof SignalQuerySchema>;
