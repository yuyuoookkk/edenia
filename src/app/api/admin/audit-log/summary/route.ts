import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
    try {
        const headerList = await headers();
        const cookieHeader = headerList.get("cookie");
        const adminId = getAdminUserIdFromCookie(cookieHeader);

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all owners with their visit counts
        const owners = await prisma.villaOwner.findMany({
            select: {
                id: true,
                name: true,
                unitNumber: true,
                _count: {
                    select: { visitorLogs: true }
                }
            },
            orderBy: { unitNumber: "asc" }
        });

        const summary = owners
            .map(o => ({
                ownerId: o.id,
                name: o.name,
                unitNumber: o.unitNumber,
                visitCount: o._count.visitorLogs,
            }))
            .sort((a, b) => (parseInt(a.unitNumber || "999") || 999) - (parseInt(b.unitNumber || "999") || 999));

        return NextResponse.json({ summary });
    } catch (error) {
        console.error("Error fetching audit summary:", error);
        return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
    }
}
