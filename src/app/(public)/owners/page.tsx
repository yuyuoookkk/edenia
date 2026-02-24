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
                const fetchedOwners = Array.isArray(data) ? data : [];
                // Sort numerically by unit number, handling ranges like '2-5' by taking the first number
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
                                <TableHead className="border-r w-[100px] font-bold text-center">VILLA</TableHead>
                                {MONTHS.map(month => (
                                    <TableHead key={month} className="border-r text-right w-[90px] font-bold px-2">{month}</TableHead>
                                ))}
                                <TableHead className="border-r w-[100px] font-bold text-center text-rose-600 bg-rose-50/50 leading-tight">AMOUNT<br />OWED</TableHead>
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
                                                <TableCell className="border-r text-right font-bold text-rose-700 bg-rose-50">
                                                    <span className="text-muted-foreground font-normal">-</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }

                                    mappedOwnerIds.add(owner.id);

                                    let totalPaid = 0;
                                    const paymentsByMonth = MONTHS.map((_, index) => {
                                        const paid = owner.transactions
                                            .filter(t => new Date(t.date).getMonth() === index)
                                            .reduce((s, t) => s + t.amount, 0);
                                        totalPaid += paid;
                                        return paid;
                                    });

                                    // Calculate expected payment for the given year based on monthly dues
                                    let monthsPassed = 12;
                                    if (isCurrentYear) {
                                        monthsPassed = currentMonthIndex + 1;
                                    } else if (currentYear > new Date().getFullYear()) {
                                        monthsPassed = 0;
                                    }

                                    const expectedTotal = owner.monthlyDues * monthsPassed;
                                    const amountOwed = Math.max(0, expectedTotal - totalPaid);

                                    return (
                                        <TableRow key={owner.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="border-r text-center bg-muted/20 align-middle">
                                                <div className="font-bold text-base whitespace-nowrap">{owner.unitNumber || villaNumber}</div>
                                            </TableCell>

                                            {paymentsByMonth.map((paid, i) => (
                                                <TableCell key={`paid-${i}`} className="border-r text-right text-gray-700">
                                                    {paid > 0 ? formatIDR(paid) : ""}
                                                </TableCell>
                                            ))}

                                            <TableCell className="border-r text-right font-bold text-rose-700 bg-rose-50">
                                                {amountOwed > 0 ? formatIDR(amountOwed) : <span className="text-muted-foreground font-normal">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                });

                                const unmappedRows = owners.filter(o => !mappedOwnerIds.has(o.id)).map(owner => {
                                    let totalPaid = 0;
                                    const paymentsByMonth = MONTHS.map((_, index) => {
                                        const paid = owner.transactions
                                            .filter(t => new Date(t.date).getMonth() === index)
                                            .reduce((s, t) => s + t.amount, 0);
                                        totalPaid += paid;
                                        return paid;
                                    });

                                    let monthsPassed = 12;
                                    if (isCurrentYear) {
                                        monthsPassed = currentMonthIndex + 1;
                                    } else if (currentYear > new Date().getFullYear()) {
                                        monthsPassed = 0;
                                    }

                                    const expectedTotal = owner.monthlyDues * monthsPassed;
                                    const amountOwed = Math.max(0, expectedTotal - totalPaid);

                                    return (
                                        <TableRow key={owner.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="border-r text-center bg-muted/20 align-middle border-t-2 border-t-amber-200">
                                                <div className="font-bold text-base whitespace-nowrap">{owner.unitNumber || "N/A"}</div>
                                            </TableCell>

                                            {paymentsByMonth.map((paid, i) => (
                                                <TableCell key={`unmapped-paid-${i}`} className="border-r text-right text-gray-700 border-t-2 border-t-amber-200">
                                                    {paid > 0 ? formatIDR(paid) : ""}
                                                </TableCell>
                                            ))}

                                            <TableCell className="border-r text-right font-bold text-rose-700 bg-rose-50 border-t-2 border-t-amber-200">
                                                {amountOwed > 0 ? formatIDR(amountOwed) : <span className="text-muted-foreground font-normal">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    );
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
                                <TableCell className="border-r text-right font-bold text-rose-700 bg-rose-100 align-middle">
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


                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
