import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g. "2026-01"

    let carriedForward = 0;
    let whereClause: any = {};
    if (month) {
        const startDate = new Date(`${month}-01T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        whereClause = {
            date: {
                gte: startDate,
                lt: endDate,
            }
        };

        const previousTransactions = await prisma.transaction.findMany({
            where: { date: { lt: startDate } }
        });
        carriedForward = previousTransactions.reduce((acc, txn) =>
            txn.type === 'INCOME' ? acc + txn.amount : acc - txn.amount
            , 0);
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: { owner: true },
            orderBy: { date: "asc" }, // Sorting ascending to calculate running balance
        });
        return NextResponse.json({ transactions, carriedForward });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const transaction = await prisma.transaction.create({
            data: {
                type: body.type,
                amount: parseFloat(body.amount),
                date: new Date(body.date),
                description: body.description,
                category: body.category || null,
                ownerId: body.ownerId || null,
            },
        });
        return NextResponse.json(transaction);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
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
        await prisma.transaction.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
    }
}
