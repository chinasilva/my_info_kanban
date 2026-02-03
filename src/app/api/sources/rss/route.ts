import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

// 创建自定义 RSS 数据源
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, feedUrl, icon } = await request.json();

        if (!name || !feedUrl) {
            return NextResponse.json(
                { error: "名称和 RSS 地址不能为空" },
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

            // 验证 RSS URL 有效性
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(feedUrl, {
                    signal: controller.signal,
                    headers: {
                        "User-Agent": "High-Signal-Aggregator/1.0",
                    },
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const text = await response.text();
                const isRss = text.includes("<rss") || text.includes("<feed") || text.includes("<channel");

                if (!isRss) {
                    return NextResponse.json(
                        { error: "该地址不是有效的 RSS/Atom Feed" },
                        { status: 400 }
                    );
                }
            } catch (fetchError: any) {
                if (fetchError.name === "AbortError") {
                    return NextResponse.json(
                        { error: "请求超时，请检查 RSS 地址" },
                        { status: 400 }
                    );
                }
                return NextResponse.json(
                    { error: `无法访问该 RSS 地址: ${fetchError.message}` },
                    { status: 400 }
                );
            }

            // 创建新数据源
            source = await prisma.source.create({
                data: {
                    name,
                    type: "rss",
                    baseUrl: new URL(feedUrl).origin,
                    icon: icon || "📡",
                    config: { feedUrl },
                    isBuiltIn: false,
                    createdById: session.user.id,
                },
            });
        }

        // 3. 建立订阅关系 (使用 upsert 兼容复用情况)
        await prisma.userSource.upsert({
            where: {
                userId_sourceId: {
                    userId: session.user.id,
                    sourceId: source.id
                }
            },
            update: { isEnabled: true },
            create: {
                userId: session.user.id,
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
    } catch (error: any) {
        console.error("Create RSS source error:", error);
        return NextResponse.json(
            { error: "创建数据源失败" },
            { status: 500 }
        );
    }
}
