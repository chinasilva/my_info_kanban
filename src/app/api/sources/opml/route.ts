import { NextResponse } from "next/server";
import { getSessionOrTestAuth } from "@/lib/auth/test-auth"; // 使用统一认证
import { prisma } from "@/lib/prisma/db";
import { XMLParser } from "fast-xml-parser";
import { opmlSchema, OpmlOutline } from "@/schemas/opml";
import { z } from "zod";

// 获取所有嵌套的 outline
function flattenOutlines(outline: any): OpmlOutline[] {
    const results: OpmlOutline[] = [];

    // 如果是数组，递归处理
    if (Array.isArray(outline)) {
        outline.forEach(item => {
            results.push(...flattenOutlines(item));
        });
        return results;
    }

    // 单个对象
    if (outline && typeof outline === 'object') {
        const item = outline as any;

        // 只有包含 xmlUrl 的才是有效的 RSS 源
        if (item.xmlUrl) {
            results.push({
                text: item.text || item.title || "Untitled",
                title: item.title,
                type: item.type,
                xmlUrl: item.xmlUrl,
                htmlUrl: item.htmlUrl,
            });
        }

        // 检查是否有子 outline (嵌套结构)
        if (item.outline) {
            results.push(...flattenOutlines(item.outline));
        }
    }

    return results;
}

export async function POST(request: Request) {
    const session = await getSessionOrTestAuth(request);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const text = await file.text();

        // 解析 XML
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
        });
        const result = parser.parse(text);

        // 验证结构 (Schema-driven validation)
        // 注意：fast-xml-parser 可能会将单个元素转为对象而不是数组，
        // 这里的 validation 可以作为一种检查，但主要逻辑依赖 flattenOutlines 的鲁棒性
        try {
            // 简单的结构检查，只要有 opml 根节点即可
            if (!result.opml || !result.opml.body) {
                throw new Error("Invalid OPML format");
            }
        } catch (e) {
            return NextResponse.json({ error: "Invalid OPML file format" }, { status: 400 });
        }

        const outlines = flattenOutlines(result.opml.body.outline);

        if (outlines.length === 0) {
            return NextResponse.json({
                success: true,
                count: 0,
                message: "No valid RSS feeds found in OPML"
            });
        }

        let successCount = 0;
        const errors: string[] = [];

        // 批量处理入库
        for (const feed of outlines) {
            try {
                // 1. 创建或获取 Source
                // 使用 xmlUrl 作为唯一标识的一部分（但这很难，只能用 feedUrl）
                // Source 模型现在只有 baseUrl，config 存 feedUrl

                // 简单处理：name 使用 title，如果重复则跳过或加后缀
                // 这里我们假设 Source Name 是唯一的

                const feedUrl = feed.xmlUrl!;
                const name = feed.title || feed.text || "Untitled RSS";

                // 检查是否已存在同名 Source
                let source = await prisma.source.findFirst({
                    where: {
                        config: {
                            path: ['feedUrl'],
                            equals: feedUrl
                        }
                    }
                });

                if (!source) {
                    // 尝试创建新 Source
                    // 注意：name 必须唯一。如果已存在同名但不同 URL 的，加随机后缀
                    let finalName = name;
                    let retry = 0;
                    while (true) {
                        const existingName = await prisma.source.findUnique({
                            where: { name: finalName }
                        });
                        if (!existingName) break;
                        finalName = `${name} (${++retry})`;
                    }

                    source = await prisma.source.create({
                        data: {
                            name: finalName,
                            type: 'rss',
                            baseUrl: feed.htmlUrl || new URL(feedUrl).origin,
                            isBuiltIn: false,
                            createdById: session.user.id,
                            config: {
                                feedUrl: feedUrl
                            }
                        }
                    });
                }

                // 2. 创建 UserSource 订阅关联
                await prisma.userSource.upsert({
                    where: {
                        userId_sourceId: {
                            userId: session.user.id,
                            sourceId: source.id
                        }
                    },
                    update: { isEnabled: true }, // 如果已存在但禁用，则重新启用
                    create: {
                        userId: session.user.id,
                        sourceId: source.id,
                        isEnabled: true,
                        displayOrder: 999 // Put at end
                    }
                });

                successCount++;
            } catch (err: any) {
                console.error(`Failed to import feed ${feed.xmlUrl}:`, err);
                errors.push(`${feed.title || feed.xmlUrl}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            count: successCount,
            totalFound: outlines.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error("OPML Import Error:", error);
        return NextResponse.json({ error: "Failed to process OPML file" }, { status: 500 });
    }
}
