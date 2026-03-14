import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const balances = await prisma.monthlyBalance.findMany({
        where: { year },
        orderBy: { month: "asc" },
    });

    // Return as a map: { 1: amount, 2: amount, ... }
    const balanceMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
        const found = balances.find(b => b.month === m);
        balanceMap[m] = found ? found.amount : 0;
    }

    return NextResponse.json(balanceMap);
}

export async function POST(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { year, month, amount } = await request.json();

        if (!year || !month || amount === undefined) {
            return NextResponse.json({ error: "year, month, and amount are required" }, { status: 400 });
        }

        const balance = await prisma.monthlyBalance.upsert({
            where: { year_month: { year: parseInt(year), month: parseInt(month) } },
            update: { amount: parseFloat(amount) },
            create: { year: parseInt(year), month: parseInt(month), amount: parseFloat(amount) },
        });

        return NextResponse.json(balance);
    } catch (error) {
        console.error("Monthly balance error:", error);
        return NextResponse.json({ error: "Failed to save balance" }, { status: 500 });
    }
}
