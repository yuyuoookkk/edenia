import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { calculateOwnerDebt, generateInvoiceHTML } from "@/lib/invoice-template";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export async function GET(request: Request) {
    // Verify authorization — Vercel Cron sends this automatically
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-indexed
        const invoiceMonth = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

        // Optional: filter to a single email for testing
        const { searchParams } = new URL(request.url);
        const testEmail = searchParams.get("test_email");

        // Fetch owners with their INCOME transactions
        const owners = await prisma.villaOwner.findMany({
            where: testEmail ? { email: testEmail } : undefined,
            include: {
                transactions: {
                    where: { type: "INCOME" },
                },
            },
        });

        const results: {
            owner: string;
            villa: string;
            email: string | null;
            balance: number;
            status: "sent" | "skipped" | "failed";
            error?: string;
        }[] = [];

        for (const owner of owners) {
            // Skip owners without email
            if (!owner.email) {
                results.push({
                    owner: owner.name,
                    villa: owner.unitNumber || "N/A",
                    email: null,
                    balance: 0,
                    status: "skipped",
                    error: "No email address",
                });
                continue;
            }

            // Calculate debt
            const debt = calculateOwnerDebt(
                owner.transactions.map((t) => ({
                    amount: t.amount,
                    date: t.date.toISOString(),
                    type: t.type,
                })),
                currentYear,
                currentMonth
            );

            // Generate invoice HTML
            const html = generateInvoiceHTML({
                ownerName: owner.name,
                villaNumber: owner.unitNumber || "N/A",
                invoiceMonth,
                totalRequired: debt.totalRequired,
                totalPaid: debt.totalPaid,
                balance: debt.balance,
                monthsBilled: debt.monthsBilled,
            });

            // Send email
            const subject = debt.balance < 0
                ? `[Invoice] Edenia Private Villas - ${invoiceMonth} — Arrears`
                : `[Invoice] Edenia Private Villas - ${invoiceMonth} — No Arrears`;

            const result = await sendEmail(owner.email, subject, html);

            results.push({
                owner: owner.name,
                villa: owner.unitNumber || "N/A",
                email: owner.email,
                balance: debt.balance,
                status: result.success ? "sent" : "failed",
                error: result.error,
            });
        }

        const sent = results.filter((r) => r.status === "sent").length;
        const skipped = results.filter((r) => r.status === "skipped").length;
        const failed = results.filter((r) => r.status === "failed").length;

        return NextResponse.json({
            invoiceMonth,
            summary: { total: results.length, sent, skipped, failed },
            results,
        });
    } catch (error: any) {
        console.error("Cron send-invoices error:", error);
        return NextResponse.json(
            { error: "Failed to send invoices", details: error.message },
            { status: 500 }
        );
    }
}
