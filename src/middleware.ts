import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'zh', 'tw'],
    // Used when no locale matches
    defaultLocale: 'zh'
});

export default function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 排除不需要国际化处理的路径
    const excludedPaths = [
        '/api',
        '/_next',
        '/favicon.ico',
    ];

    // 检查是否是排除的路径
    if (excludedPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // 应用国际化中间件
    return intlMiddleware(request);
}

export const config = {
    // 匹配所有路径，但在中间件内部排除特定路径
    matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
