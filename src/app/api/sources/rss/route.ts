import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { validateUrl } from "@/lib/security/ssrf";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 创建自定义 RSS 数据源
export async function POST(request: Request) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["write:sources"],
    });
    if (!authResult.success || !authResult.userId) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    const userId = authResult.userId;

    try {
        const body = (await request.json()) as {
            name?: string;
            feedUrl?: string;
            icon?: string;
        };
        const { name, feedUrl, icon } = body;

        if (!name || !feedUrl) {
            return NextResponse.json(
                { error: "名称和 RSS 地址不能为空" },
                { status: 400 }
            );
        }

        // SSRF protection: validate URL before fetching
        const validation = validateUrl(feedUrl);
        if (!validation.valid) {
            return NextResponse.json(
                { error: `不允许访问该地址: ${validation.error}` },
                { status: 400 }
            );
        }

        // 1. 检查是否存在相同的 RSS URL (避免重复创建)
        const existingSourceByUrl = await prisma.source.findFirst({
            where: {
                config: {
                    path: ['feedUrl'],
                    equals: feedUrl
                }
            }
        });

        let source;
        const parsedFeedUrl = new URL(feedUrl);

        if (existingSourceByUrl) {
            // 复用已有数据源
            source = existingSourceByUrl;
        } else {
            // 2. 检查名称是否重复 (仅在创建新源时检查)
            const existingSourceByName = await prisma.source.findUnique({
                where: { name },
            });

            if (existingSourceByName) {
                return NextResponse.json(
                    { error: "该数据源名称已存在" },
                    { status: 400 }
                );
            }

            // 不在创建接口中直接请求用户提供的 URL，避免 SSRF 风险。
            // Feed 可达性/内容有效性将在后续抓取任务中验证。

            // 创建新数据源
            source = await prisma.source.create({
                data: {
                    name,
                    type: "rss",
                    baseUrl: parsedFeedUrl.origin,
                    icon: icon || "📡",
                    config: { feedUrl },
                    isBuiltIn: false,
                    createdById: userId,
                },
            });
        }

        // 3. 建立订阅关系 (使用 upsert 兼容复用情况)
        await prisma.userSource.upsert({
            where: {
                userId_sourceId: {
                    userId,
                    sourceId: source.id
                }
            },
            update: { isEnabled: true },
            create: {
                userId,
                sourceId: source.id,
                isEnabled: true,
            }
        });

        return NextResponse.json({
            success: true,
            source: {
                id: source.id,
                name: source.name,
                type: source.type,
                icon: source.icon,
                isReusable: !!existingSourceByUrl // 标记是否复用
            },
        });
    } catch (error: unknown) {
        console.error("Create RSS source error:", error);
        return NextResponse.json(
            { error: "创建数据源失败" },
            { status: 500 }
        );
    }
}
