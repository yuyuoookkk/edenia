import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOwnerUserIdFromCookie } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const cookieHeader = request.headers.get("cookie");
        const userId = getOwnerUserIdFromCookie(cookieHeader);

        if (!userId) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const owner = await prisma.villaOwner.findUnique({
            where: { id: userId },
            select: { id: true, name: true, unitNumber: true }
        });

        if (!owner) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({
            authenticated: true,
            user: owner
        });
    } catch (error) {
        console.error("Session check error:", error);
        return NextResponse.json({ authenticated: false, error: "Server error" }, { status: 500 });
    }
}
