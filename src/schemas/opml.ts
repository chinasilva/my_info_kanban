import { z } from "zod";

export const opmlOutlineSchema = z.object({
    text: z.string(),
    title: z.string().optional(),
    type: z.string().optional(),
    xmlUrl: z.string().optional(),
    htmlUrl: z.string().optional(),
});

export const opmlBodySchema = z.object({
    outline: z.union([opmlOutlineSchema, z.array(opmlOutlineSchema)]),
});

export const opmlSchema = z.object({
    opml: z.object({
        head: z.object({
            title: z.string().optional(),
        }).optional(),
        body: opmlBodySchema,
    }),
});

// 用于前端 API 请求验证
export const importOpmlRequestSchema = z.object({
    xmlContent: z.string().min(1, "OPML content is required"),
});

export type OpmlOutline = z.infer<typeof opmlOutlineSchema>;
export type OpmlImportRequest = z.infer<typeof importOpmlRequestSchema>;
