import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, closeEmailPool } from "@/lib/email";
import { generateInvoiceHTML, generateReceiptHTML } from "@/lib/invoice-template";

const MONTHLY_DUES = 1_300_000;
const BILLING_START_YEAR = 2026;
const BILLING_START_MONTH = 2; // February (1-indexed)

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// Helper to delay between emails
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
    // Verify authorization — Vercel Cron sends this automatically
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Starting invoice/receipt email job...");

        // Optional: override month for testing (e.g. ?test_month=2026-02)
        const { searchParams } = new URL(request.url);
        const testEmail = searchParams.get("test_email");
        const testMonth = searchParams.get("test_month"); // e.g. "2026-04"

        let currentYear: number;
        let currentMonth: number;

        if (testMonth) {
            const [y, m] = testMonth.split("-").map(Number);
            currentYear = y;
            currentMonth = m;
        } else {
            const now = new Date();
            currentYear = now.getFullYear();
            currentMonth = now.getMonth() + 1;
        }

        const invoiceMonth = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
        console.log(`[CRON] Processing for: ${invoiceMonth}`);

        // Fetch owners with ALL their INCOME transactions (for accumulated debt calculation)
        const owners = await prisma.villaOwner.findMany({
            where: testEmail ? { email: testEmail } : undefined,
            include: {
                transactions: {
                    where: {
                        type: "INCOME",
                    },
                },
            },
        });

        console.log(`[CRON] Found ${owners.length} owners to process`);

        const results: {
            owner: string;
            villa: string;
            email: string | null;
            paidThisMonth: number;
            type: "invoice" | "receipt" | "skipped";
            status: "sent" | "skipped" | "failed";
            error?: string;
        }[] = [];

        for (let i = 0; i < owners.length; i++) {
            const owner = owners[i];

            // Skip owners without email
            if (!owner.email) {
                console.log(`[CRON] [${i + 1}/${owners.length}] Skipping ${owner.name} - no email`);
                results.push({
                    owner: owner.name,
                    villa: owner.unitNumber || "N/A",
                    email: null,
                    paidThisMonth: 0,
                    type: "skipped",
                    status: "skipped",
                    error: "No email address",
                });
                continue;
            }

            // Group payments by month
            const paymentsByMonth: Record<string, number> = {};
            for (const t of owner.transactions) {
                const d = new Date(t.date);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                paymentsByMonth[key] = (paymentsByMonth[key] || 0) + t.amount;
            }

            // Calculate debt for each month from billing start to current month
            const monthlyBreakdown: { month: string; dues: number; paid: number; debt: number }[] = [];
            let totalAccumulatedDebt = 0;
            let calcYear = BILLING_START_YEAR;
            let calcMonth = BILLING_START_MONTH;

            while (calcYear < currentYear || (calcYear === currentYear && calcMonth <= currentMonth)) {
                const key = `${calcYear}-${calcMonth}`;
                const paid = paymentsByMonth[key] || 0;
                const debt = Math.max(0, MONTHLY_DUES - paid);

                if (debt > 0) {
                    monthlyBreakdown.push({
                        month: `${MONTH_NAMES[calcMonth - 1]} ${calcYear}`,
                        dues: MONTHLY_DUES,
                        paid,
                        debt,
                    });
                    totalAccumulatedDebt += debt;
                }

                calcMonth++;
                if (calcMonth > 12) { calcMonth = 1; calcYear++; }
            }

            const paidThisMonth = paymentsByMonth[`${currentYear}-${currentMonth}`] || 0;

            const emailData = {
                villaNumber: owner.unitNumber || "N/A",
                invoiceMonth,
                monthlyDues: MONTHLY_DUES,
                paidThisMonth,
                monthlyBreakdown,
                totalAccumulatedDebt,
            };

            // Decide: Receipt (no debt) vs Invoice (has outstanding balance)
            let html: string;
            let subject: string;
            let emailType: "invoice" | "receipt";

            if (totalAccumulatedDebt === 0) {
                // No outstanding debt → send Receipt
                emailType = "receipt";
                html = generateReceiptHTML(emailData);
                subject = `[Receipt] Edenia Private Villas - ${invoiceMonth} — Payment Received`;
            } else {
                // Has outstanding debt → send Invoice with accumulated breakdown
                emailType = "invoice";
                html = generateInvoiceHTML(emailData);
                subject = `[Invoice] Edenia Private Villas - ${invoiceMonth} — Payment Due`;
            }

            console.log(`[CRON] [${i + 1}/${owners.length}] Sending ${emailType} to ${owner.name} (${owner.email})...`);

            const result = await sendEmail(owner.email, subject, html);

            if (result.success) {
                console.log(`[CRON] [${i + 1}/${owners.length}] ✓ Sent ${emailType} to ${owner.email}`);
            } else {
                console.error(`[CRON] [${i + 1}/${owners.length}] ✗ Failed ${emailType} to ${owner.email}: ${result.error}`);
            }

            results.push({
                owner: owner.name,
                villa: owner.unitNumber || "N/A",
                email: owner.email,
                paidThisMonth,
                type: emailType,
                status: result.success ? "sent" : "failed",
                error: result.error,
            });

            // Add a 3 second delay between emails to avoid Gmail rate limits
            if (i < owners.length - 1 && owner.email) {
                await delay(3000);
            }
        }

        // Close the email connection pool after all emails are sent
        await closeEmailPool();

        const sent = results.filter((r) => r.status === "sent").length;
        const invoices = results.filter((r) => r.type === "invoice" && r.status === "sent").length;
        const receipts = results.filter((r) => r.type === "receipt" && r.status === "sent").length;
        const skipped = results.filter((r) => r.status === "skipped").length;
        const failed = results.filter((r) => r.status === "failed").length;

        console.log(`[CRON] Complete! Sent: ${sent}, Invoices: ${invoices}, Receipts: ${receipts}, Skipped: ${skipped}, Failed: ${failed}`);

        return NextResponse.json({
            invoiceMonth,
            summary: { total: results.length, sent, invoices, receipts, skipped, failed },
            results,
        });
    } catch (error: any) {
        console.error("[CRON] send-invoices error:", error);
        return NextResponse.json(
            { error: "Failed to send invoices", details: error.message },
            { status: 500 }
        );
    }
}
