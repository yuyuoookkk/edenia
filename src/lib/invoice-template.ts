const MONTHLY_DUES = 1_300_000;
const BILLING_START_YEAR = 2026;
const BILLING_START_MONTH = 2; // February (1-indexed)

function formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.abs(amount));
}

export function getMonthsBilled(upToYear: number, upToMonth: number): number {
    if (upToYear < BILLING_START_YEAR) return 0;

    let firstMonth: number;
    if (upToYear === BILLING_START_YEAR) {
        firstMonth = BILLING_START_MONTH;
    } else {
        firstMonth = 1;
    }

    if (upToMonth < firstMonth) return 0;
    return upToMonth - firstMonth + 1;
}

export function calculateOwnerDebt(
    transactions: { amount: number; date: string | Date; type: string }[],
    upToYear: number,
    upToMonth: number
): { totalRequired: number; totalPaid: number; balance: number; monthsBilled: number; paidThisMonth: number } {
    const monthsBilled = getMonthsBilled(upToYear, upToMonth);
    const totalRequired = MONTHLY_DUES * monthsBilled;

    const totalPaid = transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

    // Check payments made in the current month
    const paidThisMonth = transactions
        .filter((t) => {
            if (t.type !== "INCOME") return false;
            const d = new Date(t.date);
            return d.getFullYear() === upToYear && d.getMonth() + 1 === upToMonth;
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalPaid - totalRequired;
    return { totalRequired, totalPaid, balance, monthsBilled, paidThisMonth };
}

type EmailData = {
    villaNumber: string;
    invoiceMonth: string;
    totalRequired: number;
    totalPaid: number;
    balance: number;
    monthsBilled: number;
    paidThisMonth: number;
};

// Shared sections used by both templates
function headerSection(title: string, subtitle: string, gradientStart: string, gradientEnd: string, subtitleColor: string): string {
    return `
                    <tr>
                        <td style="background:linear-gradient(135deg,${gradientStart} 0%,${gradientEnd} 100%);padding:32px 40px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">EDENIA PRIVATE VILLAS</h1>
                            <p style="color:${subtitleColor};margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">${subtitle}</p>
                        </td>
                    </tr>`;
}

function signatureSection(): string {
    return `
                    <tr>
                        <td style="padding:0 40px 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:16px 20px;border-radius:8px;border:1px solid #e5e7eb;">
                                <tr>
                                    <td>
                                        <img src="cid:signature" alt="Signature" style="height:60px;width:auto;" />
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top:4px;">
                                        <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Glenice Pickering – Ekonomi</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>`;
}

function footerSection(type: string): string {
    return `
                    <tr>
                        <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                                This is an automated ${type} from Edenia Private Villas Management.<br>
                                If you have any questions, please contact us at edeniaprivatevillas@gmail.com
                            </p>
                        </td>
                    </tr>`;
}

function bankDetailsSection(): string {
    return `
                    <tr>
                        <td style="padding:0 40px 24px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <p style="margin:0;font-size:14px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
                                        <p style="margin:12px 0 0;font-size:13px;color:#374151;line-height:1.8;">
                                            <strong>Bank:</strong> Permata Bank<br>
                                            <strong>Account Name:</strong> GLENICE SUSANNE PICKERING OR KADEK PISMAYANTI<br>
                                            <strong>Account Number:</strong> 9984780777<br>
                                            <strong>SWIFT Code:</strong> BBBAIDJA<br>
                                            <strong>Bank Code:</strong> 013<br>
                                            <strong>Branch Code:</strong> 0611
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>`;
}

function emailWrapper(content: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
${content}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ─── INVOICE (unpaid / has debt) ────────────────────────────────────────
export function generateInvoiceHTML(data: EmailData): string {
    const debtAmount = Math.abs(data.balance);

    const content = `
${headerSection("EDENIA PRIVATE VILLAS", "Monthly Invoice", "#7f1d1d", "#991b1b", "#fca5a5")}

                    <!-- Invoice Details -->
                    <tr>
                        <td style="padding:32px 40px 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Invoice For</p>
                                        <p style="margin:4px 0 0;color:#111827;font-size:18px;font-weight:600;">Villa ${data.villaNumber}</p>
                                    </td>
                                    <td style="text-align:right;">
                                        <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Period</p>
                                        <p style="margin:4px 0 0;color:#111827;font-size:18px;font-weight:600;">${data.invoiceMonth}</p>
                                        <p style="margin:2px 0 0;color:#6b7280;font-size:14px;">${data.monthsBilled} month(s) billed</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding:24px 40px;">
                            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
                        </td>
                    </tr>

                    <!-- Breakdown Table -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                                <tr style="background-color:#f9fafb;">
                                    <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Description</td>
                                    <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Amount</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;">Monthly Dues (${data.monthsBilled} months × ${formatIDR(1_300_000)})</td>
                                    <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;text-align:right;font-weight:500;">${formatIDR(data.totalRequired)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;font-size:14px;color:#059669;border-top:1px solid #e5e7eb;">Total Payments Received</td>
                                    <td style="padding:14px 16px;font-size:14px;color:#059669;border-top:1px solid #e5e7eb;text-align:right;font-weight:500;">${formatIDR(data.totalPaid)}</td>
                                </tr>
                                <tr style="background-color:#FEF2F2;">
                                    <td style="padding:16px;font-size:15px;color:#DC2626;border-top:2px solid #DC2626;font-weight:700;">Outstanding Balance</td>
                                    <td style="padding:16px;font-size:15px;color:#DC2626;border-top:2px solid #DC2626;text-align:right;font-weight:700;">- ${formatIDR(debtAmount)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Warning Banner -->
                    <tr>
                        <td style="padding:24px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FEF2F2;border-radius:8px;border:1px solid #FECACA;">
                                <tr>
                                    <td style="padding:20px 24px;text-align:center;">
                                        <p style="margin:0;font-size:18px;font-weight:700;color:#DC2626;">⚠ Payment Required: ${formatIDR(debtAmount)}</p>
                                        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Please settle this amount at your earliest convenience.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

${bankDetailsSection()}
${signatureSection()}
${footerSection("invoice")}`;

    return emailWrapper(content);
}

// ─── RECEIPT (paid this month) ──────────────────────────────────────────
export function generateReceiptHTML(data: EmailData): string {
    const content = `
${headerSection("EDENIA PRIVATE VILLAS", "Payment Receipt", "#064e3b", "#047857", "#6ee7b7")}

                    <!-- Receipt Details -->
                    <tr>
                        <td style="padding:32px 40px 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Receipt For</p>
                                        <p style="margin:4px 0 0;color:#111827;font-size:18px;font-weight:600;">Villa ${data.villaNumber}</p>
                                    </td>
                                    <td style="text-align:right;">
                                        <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Period</p>
                                        <p style="margin:4px 0 0;color:#111827;font-size:18px;font-weight:600;">${data.invoiceMonth}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding:24px 40px;">
                            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
                        </td>
                    </tr>

                    <!-- Payment Summary -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                                <tr style="background-color:#f9fafb;">
                                    <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Description</td>
                                    <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Amount</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;">Monthly Dues</td>
                                    <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;text-align:right;font-weight:500;">${formatIDR(1_300_000)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;font-size:14px;color:#059669;border-top:1px solid #e5e7eb;">Payment Received</td>
                                    <td style="padding:14px 16px;font-size:14px;color:#059669;border-top:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatIDR(data.paidThisMonth)}</td>
                                </tr>
                                <tr style="background-color:#ECFDF5;">
                                    <td style="padding:16px;font-size:15px;color:#059669;border-top:2px solid #059669;font-weight:700;">Balance</td>
                                    <td style="padding:16px;font-size:15px;color:#059669;border-top:2px solid #059669;text-align:right;font-weight:700;">${formatIDR(data.paidThisMonth - 1_300_000)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Success Banner -->
                    <tr>
                        <td style="padding:24px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECFDF5;border-radius:8px;border:1px solid #A7F3D0;">
                                <tr>
                                    <td style="padding:20px 24px;text-align:center;">
                                        <p style="margin:0;font-size:18px;font-weight:700;color:#059669;">✓ Payment Received — Thank You!</p>
                                        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Your payment of ${formatIDR(data.paidThisMonth)} has been recorded.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

${signatureSection()}
${footerSection("receipt")}`;

    return emailWrapper(content);
}
