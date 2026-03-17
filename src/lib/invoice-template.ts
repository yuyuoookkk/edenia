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
): { totalRequired: number; totalPaid: number; balance: number; monthsBilled: number } {
    const monthsBilled = getMonthsBilled(upToYear, upToMonth);
    const totalRequired = MONTHLY_DUES * monthsBilled;

    const totalPaid = transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalPaid - totalRequired;
    return { totalRequired, totalPaid, balance, monthsBilled };
}

type OwnerInvoiceData = {
    ownerName: string;
    villaNumber: string;
    invoiceMonth: string; // e.g. "March 2026"
    totalRequired: number;
    totalPaid: number;
    balance: number;
    monthsBilled: number;
};

export function generateInvoiceHTML(data: OwnerInvoiceData): string {
    const hasDebt = data.balance < 0;
    const debtAmount = Math.abs(data.balance);

    const statusColor = hasDebt ? "#DC2626" : "#059669";
    const statusBg = hasDebt ? "#FEF2F2" : "#ECFDF5";
    const statusText = hasDebt
        ? `Arrears: ${formatIDR(debtAmount)}`
        : "No Arrears ✓";
    const statusSubtext = hasDebt
        ? "Please settle this amount at your earliest convenience."
        : "Thank you for keeping your payments up to date!";

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Invoice - Edenia Private Villas</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 100%);padding:32px 40px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">EDENIA PRIVATE VILLAS</h1>
                            <p style="color:#94b8d4;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Monthly Invoice Statement</p>
                        </td>
                    </tr>

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
                                    <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;">Total Dues Required</td>
                                    <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;text-align:right;font-weight:500;">${formatIDR(data.totalRequired)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;font-size:14px;color:#059669;border-top:1px solid #e5e7eb;">Total Payments Received</td>
                                    <td style="padding:14px 16px;font-size:14px;color:#059669;border-top:1px solid #e5e7eb;text-align:right;font-weight:500;">${formatIDR(data.totalPaid)}</td>
                                </tr>
                                <tr style="background-color:${statusBg};">
                                    <td style="padding:16px;font-size:15px;color:${statusColor};border-top:2px solid ${statusColor};font-weight:700;">Balance</td>
                                    <td style="padding:16px;font-size:15px;color:${statusColor};border-top:2px solid ${statusColor};text-align:right;font-weight:700;">${data.balance >= 0 ? formatIDR(data.balance) : "- " + formatIDR(debtAmount)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Status Banner -->
                    <tr>
                        <td style="padding:24px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${statusBg};border-radius:8px;border:1px solid ${statusColor}20;">
                                <tr>
                                    <td style="padding:20px 24px;text-align:center;">
                                        <p style="margin:0;font-size:18px;font-weight:700;color:${statusColor};">${statusText}</p>
                                        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">${statusSubtext}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Bank Details -->
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
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding:0 40px 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <img src="data:image/png;base64,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" alt="Signature" style="height:60px;width:auto;" />
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top:4px;">
                                        <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Glenice Pickering – Ekonomi</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                                This is an automated invoice from Edenia Private Villas Management.<br>
                                If you have any questions, please contact us at edeniaprivatevillas@gmail.com
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
