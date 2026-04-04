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


// Month end dates (non-leap year default; leap year handled dynamically)
function getLastDayOfMonth(year: number, monthIndex: number): number {
    // monthIndex is 0-based (0 = January)
    return new Date(year, monthIndex + 1, 0).getDate();
}

const MONTH_FULL_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function formatIDR(amount: number) {
    if (!amount) return "";
    return amount.toLocaleString('en-US');
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
    const [monthlyBalances, setMonthlyBalances] = useState<Record<number, number>>({});

    useEffect(() => {
        if (!currentYear) return;
        Promise.all([
            fetch(`/api/transactions?year=${currentYear}`).then(r => r.json()),
            fetch('/api/owners').then(r => r.json()),
            fetch(`/api/monthly-balance?year=${currentYear}`).then(r => r.json()),
        ]).then(([txnData, ownerData, balanceData]) => {
            setTransactions(Array.isArray(txnData.transactions) ? txnData.transactions : []);
            setOwners(Array.isArray(ownerData) ? ownerData : []);
            setMonthlyBalances(balanceData || {});
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
            hasData: true
        };
    });

    // Calculate billing months from Feb 2026
    const BILLING_START_YEAR = 2026;
    const BILLING_START_MONTH = 2; // February

    function getBillingMonths(year: number): number {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        if (year < BILLING_START_YEAR) return 0;
        let lastMonth = year < curYear ? 12 : (year === curYear ? curMonth : 0);
        let firstMonth = year === BILLING_START_YEAR ? BILLING_START_MONTH : (year > BILLING_START_YEAR ? 1 : 0);
        if (lastMonth < firstMonth) return 0;
        return lastMonth - firstMonth + 1;
    }

    const monthsBilled = getBillingMonths(currentYear);
    const totalRequired = MONTHLY_DUES * monthsBilled;

    const ownerBalances = owners.filter(owner => owner.unitNumber?.toLowerCase() !== 'wayan').map(owner => {
        const paidThisYear = transactions
            .filter(t => t.ownerId === owner.id && t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);
        const balance = paidThisYear - totalRequired;
        return { owner, paid: paidThisYear, balance };
    });

    const unpaidDues = ownerBalances.filter(o => o.balance < 0);

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edenia Expenses</h1>
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
                                <TableHead className="border-r w-[90px]">Date</TableHead>
                                {KNOWN_CATEGORIES.map(cat => (
                                    <TableHead key={cat} className="border-r text-right w-[80px] whitespace-normal leading-tight mx-auto px-2">{cat.replace(' ', '\n')}</TableHead>
                                ))}
                                <TableHead className="border-r text-center w-[110px] font-bold tracking-tight leading-tight px-2">DATE</TableHead>
                                <TableHead className="border-r text-right w-[120px] font-bold tracking-tight leading-tight px-2">BALANCE<br />OF ACCOUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {monthlyData.filter(d => d.hasData).map((data) => {
                                // Use manual balance for this month (month is 1-indexed in the API)
                                const manualBalance = monthlyBalances[data.monthIndex + 1] || 0;

                                return (
                                    <TableRow key={data.monthIndex} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="border-r font-medium text-center bg-slate-50/50">{data.monthName}</TableCell>

                                        {KNOWN_CATEGORIES.map(cat => (
                                            <TableCell key={cat} className="border-r text-right">
                                                {data.expensesByCategory[cat] > 0 ? formatIDR(data.expensesByCategory[cat]) : ""}
                                            </TableCell>
                                        ))}
                                        <TableCell className="border-r text-center font-medium text-slate-700">
                                            {MONTH_FULL_NAMES[data.monthIndex]} / {getLastDayOfMonth(currentYear, data.monthIndex)}
                                        </TableCell>
                                        <TableCell className="border-r text-right bg-slate-50 font-bold tracking-tighter text-blue-800">
                                            {manualBalance ? formatIDR(manualBalance) : ""}
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
                                <TableCell className="border-r"></TableCell>
                                <TableCell className="border-r text-right bg-blue-100 align-bottom pt-3 pb-3">
                                    <div className="flex flex-col items-end justify-end font-bold text-blue-800 tracking-tighter">
                                        <span className="text-[10px] text-blue-600/80 leading-tight uppercase">TOTAL BANK BALANCE</span>
                                        <span className="text-sm">{formatIDR(monthlyBalances[12] || 0)}</span>
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
                            Total Arrears owed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {unpaidDues.map(u => (
                                <div key={u.owner.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-rose-100">
                                    <div className="font-semibold text-rose-900">
                                        Unit {u.owner.unitNumber || 'N/A'}
                                    </div>
                                    <div className="text-rose-600 font-bold">
                                        Owes: Rp {Math.abs(u.balance).toLocaleString('id-ID')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
