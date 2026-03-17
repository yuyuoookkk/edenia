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
