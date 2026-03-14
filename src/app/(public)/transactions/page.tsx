"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type Owner = { id: string; name: string; unitNumber: string | null; monthlyDues: number };
type Transaction = { id: string; type: string; amount: number; date: string; description: string; category: string | null; ownerId: string | null; owner?: Owner };

const MONTHLY_DUES = 1300000; // Rp 1,300,000 per owner per month

const KNOWN_CATEGORIES = [
    "Wages",
    "Village Expenses",
    "Bank Charges",
    "Edenia Expenses",
    "Repairs Maintain"
];

function formatIDR(amount: number) {
    if (!amount) return "";
    return amount.toLocaleString('en-US'); // Matches the comma format in the user's provided image
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [carriedForward, setCarriedForward] = useState<number | string>("");
    const [owners, setOwners] = useState<Owner[]>([]);
    const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

    useEffect(() => {
        if (!currentYear) return;
        Promise.all([
            fetch(`/api/transactions?year=${currentYear}`).then(r => r.json()),
            fetch('/api/owners').then(r => r.json())
        ]).then(([txnData, ownerData]) => {
            setTransactions(Array.isArray(txnData.transactions) ? txnData.transactions : []);
            setCarriedForward(txnData.carriedForward || 0);
            setOwners(Array.isArray(ownerData) ? ownerData : []);
        });
    }, [currentYear]);

    // Aggregate transactions by month (0-11)
    const monthlyData = Array.from({ length: 12 }).map((_, monthIndex) => {
        const monthTxns = transactions.filter(t => new Date(t.date).getMonth() === monthIndex);

        const expensesByCategory: Record<string, number> = {};
        KNOWN_CATEGORIES.forEach(cat => expensesByCategory[cat] = 0);
        let miscExpenses = 0;
        let income = 0;

        monthTxns.forEach(txn => {
            if (txn.type === 'INCOME') {
                income += txn.amount;
            } else if (txn.type === 'EXPENSE') {
                if (txn.category && KNOWN_CATEGORIES.includes(txn.category)) {
                    expensesByCategory[txn.category] += txn.amount;
                } else {
                    miscExpenses += txn.amount;
                }
            }
        });

        return {
            monthIndex,
            monthName: new Date(currentYear, monthIndex).toLocaleDateString('default', { month: 'long' }).toUpperCase(),
            expensesByCategory,
            miscExpenses,
            income,
            hasData: true // Always show rows for all 12 months
        };
    });

    let currentBalance = typeof carriedForward === 'string' ? parseFloat(carriedForward) || 0 : carriedForward;

    // Calculate unpaid dues: each owner owes 1,300,000/month
    // Months passed so far this year (up to current month)
    const isCurrentYear = currentYear === new Date().getFullYear();
    const monthsPassed = isCurrentYear ? new Date().getMonth() + 1 : (currentYear < new Date().getFullYear() ? 12 : 0);
    const expectedTotal = MONTHLY_DUES * monthsPassed;

    const unpaidDues = owners.map(owner => {
        const paidThisYear = transactions
            .filter(t => t.ownerId === owner.id && t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            owner,
            paid: paidThisYear,
            owed: Math.max(0, expectedTotal - paidThisYear)
        };
    }).filter(o => o.owed > 0);

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto overflow-x-hidden">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Finances Spreadsheet</h1>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Starting Balance:</span>
                        <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-sm text-gray-500">Rp</span>
                            <input
                                type="number"
                                value={carriedForward}
                                onChange={e => setCarriedForward(e.target.value)}
                                className="w-32 pl-8 pr-3 py-1 rounded border bg-background font-mono text-sm"
                            />
                        </div>
                    </div>
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
            </div>

            <Card className="overflow-x-auto">
                <div className="min-w-max border rounded-md bg-card">
                    <Table className="text-xs">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="border-r w-[90px]">Date</TableHead>
                                {KNOWN_CATEGORIES.map(cat => (
                                    <TableHead key={cat} className="border-r text-right w-[80px] whitespace-normal leading-tight mx-auto px-2">{cat.replace(' ', '\n')}</TableHead>
                                ))}
                                <TableHead className="border-r text-right w-[120px] font-bold tracking-tight leading-tight px-2">BALANCE<br />OF ACCOUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {monthlyData.filter(d => d.hasData).map((data) => {
                                // Update running balance
                                currentBalance += data.income;
                                currentBalance -= Object.values(data.expensesByCategory).reduce((a, b) => a + b, 0);
                                currentBalance -= data.miscExpenses;

                                return (
                                    <TableRow key={data.monthIndex} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="border-r font-medium text-center bg-slate-50/50">{data.monthName}</TableCell>

                                        {KNOWN_CATEGORIES.map(cat => (
                                            <TableCell key={cat} className="border-r text-right">
                                                {data.expensesByCategory[cat] > 0 ? formatIDR(data.expensesByCategory[cat]) : ""}
                                            </TableCell>
                                        ))}
                                        <TableCell className="border-r text-right bg-slate-50 font-bold tracking-tighter text-blue-800">
                                            {formatIDR(currentBalance)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {/* TOTALS ROW */}
                            <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/80 transition-colors border-t-2 border-emerald-200">
                                <TableCell className="border-r font-bold uppercase text-emerald-800 text-center pr-4">
                                    YEAR TOTAL
                                </TableCell>
                                {KNOWN_CATEGORIES.map(cat => {
                                    const total = transactions
                                        .filter(t => t.type === 'EXPENSE' && t.category === cat)
                                        .reduce((sum, t) => sum + t.amount, 0);
                                    return (
                                        <TableCell key={cat} className="border-r text-right font-bold text-rose-700">
                                            {total > 0 ? formatIDR(total) : ""}
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="border-r text-right bg-blue-100 align-bottom pt-3 pb-3">
                                    <div className="flex flex-col items-end justify-end font-bold text-blue-800 tracking-tighter">
                                        <span className="text-[10px] text-blue-600/80 leading-tight uppercase">TOTAL BANK BALANCE</span>
                                        <span className="text-sm">{formatIDR(currentBalance)}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Unpaid Dues Section */}
            {unpaidDues.length > 0 && (
                <Card className="border-rose-200 bg-rose-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-rose-700 text-lg">
                            <AlertCircle className="w-5 h-5" />
                            Unpaid Villa Dues (Year {currentYear})
                        </CardTitle>
                        <p className="text-sm text-rose-600/70">Each villa owes Rp {MONTHLY_DUES.toLocaleString('id-ID')}/month × {monthsPassed} month(s) = Rp {expectedTotal.toLocaleString('id-ID')}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {unpaidDues.map(u => (
                                <div key={u.owner.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-rose-100">
                                    <div className="font-semibold text-rose-900">
                                        Unit {u.owner.unitNumber || 'N/A'}
                                    </div>
                                    <div className="text-rose-600 font-bold">
                                        Owes: Rp {u.owed.toLocaleString('id-ID')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div >
    );
}
