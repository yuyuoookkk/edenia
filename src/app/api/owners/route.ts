import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get("year");

    let txWhere: any = { type: "INCOME" };
    if (yearStr) {
        const year = parseInt(yearStr);
        txWhere.date = {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        };
    }

    try {
        const owners = await prisma.villaOwner.findMany({
            orderBy: { unitNumber: "asc" },
            include: {
                transactions: {
                    where: txWhere
                }
            }
        });
        return NextResponse.json(owners);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch owners" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const owner = await prisma.villaOwner.create({
            data: {
                name: body.name,
                unitNumber: body.unitNumber,
                monthlyDues: parseFloat(body.monthlyDues) || 0,
            },
        });
        return NextResponse.json(owner);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create owner" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    try {
        await prisma.villaOwner.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete owner" }, { status: 500 });
    }
}
