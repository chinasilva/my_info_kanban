import { getServerSession } from "next-auth";
import { authOptions } from "./options";

interface TestSession {
    user: {
        id: string;
        email?: string;
        name?: string;
    };
}

/**
 * 获取当前会话，支持测试模式
 * 
 * 在测试环境下，可通过 x-api-key header 绕过 NextAuth 认证
 * 
 * @param request - HTTP 请求对象
 * @returns 用户会话或 null
 */
export async function getSessionOrTestAuth(
    request: Request
): Promise<TestSession | null> {
    // 测试模式：检查 API Key
    const testApiKey = process.env.TEST_API_KEY;
    const testUserId = process.env.TEST_USER_ID;

    if (testApiKey && testUserId) {
        // Try both standard and test-specific headers
        const apiKey = request.headers.get("x-test-api-key") || request.headers.get("x-api-key");
        if (apiKey === testApiKey) {
            return {
                user: {
                    id: testUserId,
                    email: "test@test.com",
                    name: "Test User",
                },
            };
        }
    }

    // 正常模式：使用 NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user) {
        const user = session.user as { id?: string; email?: string | null; name?: string | null };
        return {
            user: {
                id: user.id || "",
                email: user.email || undefined,
                name: user.name || undefined,
            },
        };
    }

    return null;
}
