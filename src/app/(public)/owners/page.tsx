"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

type Transaction = { id: string; amount: number; date: string; type: string };
type Owner = { id: string; name: string; unitNumber: string | null; monthlyDues: number; transactions: Transaction[] };

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function formatIDR(amount: number) {
    if (!amount) return "";
    return amount.toLocaleString('id-ID'); // Consistent with Rp format requested.
}

export default function OwnersPage() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

    useEffect(() => {
        fetch(`/api/owners?year=${currentYear}`)
            .then(r => r.json())
            .then(data => {
                setOwners(Array.isArray(data) ? data : []);
            });
    }, [currentYear]);

    // Calculate totals per month across all owners
    const monthlyTotals = MONTHS.map((_, index) => {
        return owners.reduce((sum, owner) => {
            const paidInMonth = owner.transactions
                .filter(t => new Date(t.date).getMonth() === index)
                .reduce((s, t) => s + t.amount, 0);
            return sum + paidInMonth;
        }, 0);
    });

    const isCurrentYear = currentYear === new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();

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
                                <TableHead className="border-r w-[60px] font-bold text-center">VILLA</TableHead>
                                <TableHead className="border-r w-[200px] font-bold">NAME</TableHead>
                                {MONTHS.map(month => (
                                    <TableHead key={month} className="border-r text-right w-[90px] font-bold px-2">{month}</TableHead>
                                ))}
                                <TableHead className="border-r text-right w-[100px] font-bold text-rose-600 bg-rose-50/50 leading-tight">TOTAL<br />OWED</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {owners.map(owner => {
                                let totalPaid = 0;
                                const paymentsByMonth = MONTHS.map((_, index) => {
                                    const paid = owner.transactions
                                        .filter(t => new Date(t.date).getMonth() === index)
                                        .reduce((s, t) => s + t.amount, 0);
                                    totalPaid += paid;
                                    return paid;
                                });

                                // Calculate how many months they should have paid for
                                // If current year, up to current month (e.g., if it's March, they owe for Jan, Feb, Mar = 3 months)
                                // If past year, 12 months.
                                // If future year, 0 months.
                                let monthsPassed = 12;
                                if (isCurrentYear) {
                                    monthsPassed = currentMonthIndex + 1;
                                } else if (currentYear > new Date().getFullYear()) {
                                    monthsPassed = 0;
                                }

                                const expectedTotal = owner.monthlyDues * monthsPassed;
                                const totalOwed = Math.max(0, expectedTotal - totalPaid);

                                return (
                                    <TableRow key={owner.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="border-r text-center font-medium bg-muted/20">{owner.unitNumber || "-"}</TableCell>
                                        <TableCell className="border-r whitespace-nowrap overflow-hidden text-ellipsis uppercase font-medium max-w-[200px]" title={owner.name}>
                                            {owner.name}
                                        </TableCell>

                                        {paymentsByMonth.map((paid, i) => (
                                            <TableCell key={i} className="border-r text-right text-gray-700">
                                                {paid > 0 ? formatIDR(paid) : ""}
                                            </TableCell>
                                        ))}

                                        <TableCell className="border-r text-right font-bold text-rose-700 bg-rose-50 tracking-tighter">
                                            {totalOwed > 0 ? formatIDR(totalOwed) : <span className="text-muted-foreground font-normal">-</span>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/80 transition-colors border-t-2 border-emerald-200">
                                <TableCell className="border-r font-bold uppercase text-emerald-800" colSpan={2}>
                                    TOTAL
                                </TableCell>
                                {monthlyTotals.map((total, i) => (
                                    <TableCell key={i} className="border-r text-right font-bold text-emerald-800">
                                        {formatIDR(total)}
                                    </TableCell>
                                ))}
                                <TableCell className="border-r text-right font-bold text-rose-700 bg-rose-100">
                                    {/* Overall owed could be placed here if requested, but typically blank or sum */}
                                    {formatIDR(owners.reduce((sum, o) => {
                                        let monthsPassed = 12;
                                        if (isCurrentYear) monthsPassed = currentMonthIndex + 1;
                                        else if (currentYear > new Date().getFullYear()) monthsPassed = 0;
                                        const totalPaid = o.transactions.reduce((s, t) => s + t.amount, 0);
                                        const expectedTotal = o.monthlyDues * monthsPassed;
                                        return sum + Math.max(0, expectedTotal - totalPaid);
                                    }, 0))}
                                </TableCell>
                            </TableRow>

                            {owners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                                        No owners found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
