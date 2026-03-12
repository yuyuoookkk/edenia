import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    try {
        // Authenticate as Admin
        const headerList = await headers();
        const cookieHeader = headerList.get("cookie");
        const adminId = getAdminUserIdFromCookie(cookieHeader);

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Where clause for search
        const where: any = {};
        if (search) {
            where.owner = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { unitNumber: { contains: search, mode: 'insensitive' } },
                ]
            };
        }

        // Parallel query for count and items
        const [total, logs] = await prisma.$transaction([
            prisma.visitorLog.count({ where }),
            prisma.visitorLog.findMany({
                where,
                include: {
                    owner: {
                        select: {
                            name: true,
                            unitNumber: true,
                        }
                    }
                },
                orderBy: {
                    visitedAt: "desc"
                },
                skip,
                take: limit,
            })
        ]);

        return NextResponse.json({
            success: true,
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
