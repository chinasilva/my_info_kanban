import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/db";

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "邮箱和密码不能为空" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "密码长度至少为6位" },
                { status: 400 }
            );
        }

        // 检查邮箱是否已存在
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "该邮箱已被注册" },
                { status: 400 }
            );
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 12);

        // 创建用户
        const user = await prisma.user.create({
            data: {
                name: name || email.split("@")[0],
                email,
                password: hashedPassword,
            },
        });

        // 为新用户订阅所有内置数据源
        const builtInSources = await prisma.source.findMany({
            where: { isBuiltIn: true, isActive: true },
        });

        if (builtInSources.length > 0) {
            await prisma.userSource.createMany({
                data: builtInSources.map((source, index) => ({
                    userId: user.id,
                    sourceId: source.id,
                    displayOrder: index,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error: unknown) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "注册失败，请重试" },
            { status: 500 }
        );
    }
}
