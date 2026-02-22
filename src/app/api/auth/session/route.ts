import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
    try {
        const headerList = await headers();
        const cookieHeader = headerList.get("cookie");
        const userId = getAdminUserIdFromCookie(cookieHeader);

        if (!userId) {
            return NextResponse.json({ authenticated: false });
        }

        const user = await prisma.adminUser.findUnique({
            where: { id: userId },
            select: { id: true, username: true },
        });

        if (!user) {
            return NextResponse.json({ authenticated: false });
        }

        return NextResponse.json({ authenticated: true, user });
    } catch {
        return NextResponse.json({ authenticated: false });
    }
}
