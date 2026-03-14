"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

type Transaction = { id: string; amount: number; date: string; type: string };
type Owner = { id: string; name: string; unitNumber: string | null; monthlyDues: number; transactions: Transaction[] };

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const MONTHLY_DUES = 1300000; // Rp 1,300,000 per owner per month
const BILLING_START_YEAR = 2026;
const BILLING_START_MONTH = 2; // February (1-indexed)

function formatIDR(amount: number) {
    if (amount === 0) return "0";
    return amount.toLocaleString('id-ID');
}

// Calculate how many months of dues are owed from Feb 2026 up to the end of the viewed year
function getMonthsBilled(viewingYear: number): number {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // If viewing a year before billing started, no dues
    if (viewingYear < BILLING_START_YEAR) return 0;

    // Determine the last billable month in the viewing year
    let lastMonth: number;
    if (viewingYear < currentYear) {
        lastMonth = 12; // Full year
    } else if (viewingYear === currentYear) {
        lastMonth = currentMonth; // Up to current month
    } else {
        return 0; // Future year
    }

    // Determine the first billable month in the viewing year
    let firstMonth: number;
    if (viewingYear === BILLING_START_YEAR) {
        firstMonth = BILLING_START_MONTH;
    } else if (viewingYear > BILLING_START_YEAR) {
        firstMonth = 1;
    } else {
        return 0;
    }

    if (lastMonth < firstMonth) return 0;
    return lastMonth - firstMonth + 1;
}

export default function OwnersPage() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

    useEffect(() => {
        fetch(`/api/owners?year=${currentYear}`)
            .then(r => r.json())
            .then(data => {
                const fetchedOwners = Array.isArray(data) ? data : [];
                const sortedOwners = [...fetchedOwners].sort((a, b) => {
                    const matchA = a.unitNumber?.match(/\d+/);
                    const matchB = b.unitNumber?.match(/\d+/);
                    const numA = matchA ? parseInt(matchA[0], 10) : 0;
                    const numB = matchB ? parseInt(matchB[0], 10) : 0;
                    return numA - numB;
                });
                setOwners(sortedOwners);
            });
    }, [currentYear]);

    const monthlyTotals = MONTHS.map((_, index) => {
        return owners.reduce((sum, owner) => {
            const paidInMonth = owner.transactions
                .filter(t => new Date(t.date).getMonth() === index)
                .reduce((s, t) => s + t.amount, 0);
            return sum + paidInMonth;
        }, 0);
    });

    const monthsBilled = getMonthsBilled(currentYear);
    const totalRequired = MONTHLY_DUES * monthsBilled;

    const renderOwnerRow = (owner: Owner, villaLabel: string, extraClassName?: string) => {
        let totalPaid = 0;
        const paymentsByMonth = MONTHS.map((_, index) => {
            const txnsThisMonth = owner.transactions.filter(t => new Date(t.date).getMonth() === index);
            if (txnsThisMonth.length === 0) return null;
            const paid = txnsThisMonth.reduce((s, t) => s + t.amount, 0);
            totalPaid += paid;
            return paid;
        });

        const balance = totalPaid - totalRequired;

        return (
            <TableRow key={owner.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className={`border-r text-center bg-muted/20 align-middle ${extraClassName || ""}`}>
                    <div className="font-bold text-base whitespace-nowrap">{villaLabel}</div>
                </TableCell>

                {paymentsByMonth.map((paid, i) => (
                    <TableCell key={`paid-${i}`} className={`border-r text-right text-gray-700 ${extraClassName || ""}`}>
                        {paid !== null ? formatIDR(paid) : ""}
                    </TableCell>
                ))}

                <TableCell className={`border-r text-right font-bold ${extraClassName || ""} ${
                    balance > 0 ? "text-emerald-700 bg-emerald-50" :
                    balance < 0 ? "text-rose-700 bg-rose-50" :
                    "text-muted-foreground bg-muted/20"
                }`}>
                    {monthsBilled === 0 ? (
                        <span className="text-muted-foreground font-normal">-</span>
                    ) : balance === 0 ? (
                        <span className="text-emerald-600">Rp 0</span>
                    ) : (
                        `Rp ${formatIDR(balance)}`
                    )}
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto overflow-x-hidden">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight uppercase">Monthly Income From Villa Owners / {currentYear}</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Year:</span>
                    <input
                        type="number"
                        min="2020"
                        max="2050"
                        value={currentYear}
                        onChange={e => setCurrentYear(parseInt(e.target.value))}
                        className="w-24 px-3 py-1 rounded border bg-background"
                    />
                </div>
            </div>

            <Card className="overflow-x-auto">
                <div className="min-w-max border rounded-md bg-card">
                    <Table className="text-xs">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="border-r w-[100px] font-bold text-center">VILLA</TableHead>
                                {MONTHS.map(month => (
                                    <TableHead key={month} className="border-r text-right w-[90px] font-bold px-2">{month}</TableHead>
                                ))}
                                <TableHead className="border-r w-[120px] font-bold text-center leading-tight">BALANCE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(() => {
                                const mappedOwnerIds = new Set<string>();
                                const rows = Array.from({ length: 41 }, (_, i) => i + 2).map(villaNumber => {
                                    const owner = owners.find(o => {
                                        if (!o.unitNumber) return false;
                                        const match = o.unitNumber.match(/^\d+/);
                                        return match && parseInt(match[0], 10) === villaNumber;
                                    });

                                    if (!owner) {
                                        return (
                                            <TableRow key={`villa-${villaNumber}`} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="border-r text-center bg-muted/20 align-middle">
                                                    <div className="font-bold text-base whitespace-nowrap">{villaNumber}</div>
                                                </TableCell>
                                                {MONTHS.map((_, i) => (
                                                    <TableCell key={`empty-month-${i}`} className="border-r text-right text-gray-700"></TableCell>
                                                ))}
                                                <TableCell className="border-r text-right font-bold text-muted-foreground bg-muted/20">
                                                    <span className="font-normal">-</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }

                                    mappedOwnerIds.add(owner.id);
                                    return renderOwnerRow(owner, owner.unitNumber || String(villaNumber));
                                });

                                const unmappedRows = owners.filter(o => !mappedOwnerIds.has(o.id)).map(owner => {
                                    return renderOwnerRow(owner, owner.unitNumber || "N/A", "border-t-2 border-t-amber-200");
                                });

                                return [...rows, ...unmappedRows];
                            })()}

                            <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/80 transition-colors border-t-2 border-emerald-200">
                                <TableCell className="border-r font-bold uppercase text-emerald-800 align-middle text-center" colSpan={1}>
                                    <div>TOTAL</div>
                                </TableCell>
                                {monthlyTotals.map((total, i) => (
                                    <TableCell key={i} className="border-r text-right font-bold text-emerald-800 align-middle">
                                        {formatIDR(total)}
                                    </TableCell>
                                ))}
                                <TableCell className="border-r text-right font-bold bg-blue-100 align-middle">
                                    {(() => {
                                        const grandTotalPaid = owners.reduce((sum, o) => sum + o.transactions.reduce((s, t) => s + t.amount, 0), 0);
                                        const grandTotalRequired = totalRequired * owners.length;
                                        const grandBalance = grandTotalPaid - grandTotalRequired;
                                        return (
                                            <span className={grandBalance >= 0 ? "text-emerald-800" : "text-rose-700"}>
                                                Rp {formatIDR(grandBalance)}
                                            </span>
                                        );
                                    })()}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
