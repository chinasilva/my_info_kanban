import { NextResponse } from "next/server";
import { ScraperRunner } from "@/lib/scraper/runner";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

export async function GET(request: Request) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["execute:jobs"],
    });
    if (!authResult.success) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    try {
        const runner = new ScraperRunner();
        const results = await runner.runAll();

        return NextResponse.json({
            success: true,
            results,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
