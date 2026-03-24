import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g. "2026-01"
    const year = searchParams.get("year"); // e.g. "2026"

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
    } else if (year) {
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
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

        // Compute paidVillasCount by validating against each owner's monthlyDues
        const owners = await prisma.villaOwner.findMany({
            select: { id: true, monthlyDues: true },
        });
        const ownersWithDues = owners.filter(o => o.monthlyDues > 0);
        const totalVillas = ownersWithDues.length;
        let paidVillasCount = 0;

        if (month) {
            // Monthly: count owners whose INCOME in this month >= their monthlyDues
            const incomeByOwner = new Map<string, number>();
            for (const txn of transactions) {
                if (txn.type === 'INCOME' && txn.ownerId) {
                    incomeByOwner.set(txn.ownerId, (incomeByOwner.get(txn.ownerId) || 0) + txn.amount);
                }
            }
            for (const owner of ownersWithDues) {
                const paid = incomeByOwner.get(owner.id) || 0;
                if (paid >= owner.monthlyDues) {
                    paidVillasCount++;
                }
            }
        } else if (year) {
            // Yearly: count total paid villa-months across all 12 months
            // Group income transactions by ownerId and month
            const incomeByOwnerMonth = new Map<string, number>();
            for (const txn of transactions) {
                if (txn.type === 'INCOME' && txn.ownerId) {
                    const txnDate = new Date(txn.date);
                    const monthKey = `${txn.ownerId}-${txnDate.getMonth() + 1}`;
                    incomeByOwnerMonth.set(monthKey, (incomeByOwnerMonth.get(monthKey) || 0) + txn.amount);
                }
            }
            for (const owner of ownersWithDues) {
                for (let m = 1; m <= 12; m++) {
                    const key = `${owner.id}-${m}`;
                    const paid = incomeByOwnerMonth.get(key) || 0;
                    if (paid >= owner.monthlyDues) {
                        paidVillasCount++;
                    }
                }
            }
        }

        // For yearly view, totalVillas should reflect all possible villa-month payments
        const totalVillasResult = (year) ? totalVillas * 12 : totalVillas;

        return NextResponse.json({ transactions, carriedForward, paidVillasCount, totalVillas: totalVillasResult });
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
