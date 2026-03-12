import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { page, ipAddress, userAgent, sessionToken } = body;

        if (!page) {
            return NextResponse.json({ error: "Page is required" }, { status: 400 });
        }

        let ownerId: string | null = null;
        if (sessionToken) {
            ownerId = verifySessionToken(sessionToken);
        }

        await prisma.visitorLog.create({
            data: {
                page,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                ownerId: ownerId || null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to log visitor:", error);
        // Return 200 even on error so we don't block the client navigation
        return NextResponse.json({ success: false, error: "Logging failed" }, { status: 200 });
    }
}
