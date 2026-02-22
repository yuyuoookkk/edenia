"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type Owner = { id: string; name: string; unitNumber: string | null; monthlyDues: number };
type Transaction = { id: string; type: string; amount: number; date: string; description: string; category: string | null; ownerId: string | null; owner?: Owner };

const KNOWN_CATEGORIES = [
    "Wages",
    "Village Expenses",
    "Bank Charges",
    "Computer Office",
    "Electric Water",
    "Repairs Maintain",
    "Garden Expenses"
];

function formatIDR(amount: number) {
    if (!amount) return "";
    return amount.toLocaleString('en-US'); // Matches the comma format in the user's provided image
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [carriedForward, setCarriedForward] = useState(0);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [currentMonth, setCurrentMonth] = useState("");

    useEffect(() => {
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        setCurrentMonth(monthStr);
    }, []);

    useEffect(() => {
        if (!currentMonth) return;
        Promise.all([
            fetch(`/api/transactions?month=${currentMonth}`).then(r => r.json()),
            fetch('/api/owners').then(r => r.json())
        ]).then(([txnData, ownerData]) => {
            setTransactions(Array.isArray(txnData.transactions) ? txnData.transactions : []);
            setCarriedForward(txnData.carriedForward || 0);
            setOwners(Array.isArray(ownerData) ? ownerData : []);
        });
    }, [currentMonth]);

    let currentBalance = carriedForward;
    const rows = transactions.map(txn => {
        if (txn.type === 'INCOME') currentBalance += txn.amount;
        else currentBalance -= txn.amount;
        return { ...txn, runningBalance: currentBalance };
    });

    const renderExpense = (txn: Transaction, expectedCategory: string) => {
        if (txn.type === 'EXPENSE') {
            if (txn.category === expectedCategory) return formatIDR(txn.amount);
            if (expectedCategory === "Misc Expenses" && (!txn.category || !KNOWN_CATEGORIES.includes(txn.category))) {
                return formatIDR(txn.amount);
            }
        }
        return null;
    };

    // Calculate unpaid dues (using income transactions linked to owners)
    const unpaidDues = owners.map(owner => {
        const paidThisMonth = transactions
            .filter(t => t.ownerId === owner.id && t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            owner,
            paid: paidThisMonth,
            owed: owner.monthlyDues - paidThisMonth
        };
    }).filter(o => o.owed > 0);

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto overflow-x-hidden">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Finances Spreadsheet</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Month:</span>
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={e => setCurrentMonth(e.target.value)}
                        className="w-48 px-3 py-1 rounded border bg-background"
                    />
                </div>
            </div>

            <Card className="overflow-x-auto">
                <div className="min-w-max border rounded-md bg-card">
                    <Table className="text-xs">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="border-r w-[90px]">Date</TableHead>
                                <TableHead className="border-r w-[200px]">Description</TableHead>
                                {KNOWN_CATEGORIES.map(cat => (
                                    <TableHead key={cat} className="border-r text-right w-[80px] whitespace-normal leading-tight mx-auto px-2">{cat.replace(' ', '\n')}</TableHead>
                                ))}
                                <TableHead className="border-r text-right w-[80px] whitespace-normal leading-tight px-2">Misc<br />Expenses</TableHead>
                                <TableHead className="border-r text-right w-[100px] font-bold">Income</TableHead>
                                <TableHead className="border-r text-right w-[120px] font-bold tracking-tight leading-tight px-2">BALANCE<br />OF ACCOUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="bg-muted/10">
                                <TableCell className="border-r font-bold">{currentMonth ? new Date(currentMonth + '-01').toLocaleDateString('default', { month: 'long' }).toUpperCase() : ''}</TableCell>
                                <TableCell className="border-r font-medium">carried forward</TableCell>
                                {KNOWN_CATEGORIES.map(cat => <TableCell key={cat} className="border-r"></TableCell>)}
                                <TableCell className="border-r"></TableCell>
                                <TableCell className="border-r bg-emerald-50/50"></TableCell>
                                <TableCell className="border-r text-right font-bold tracking-tighter bg-slate-50">{formatIDR(carriedForward)}</TableCell>
                            </TableRow>

                            {rows.map(txn => (
                                <TableRow key={txn.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="border-r">{new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' }).replace(/\//g, ' - ')}</TableCell>
                                    <TableCell className="border-r truncate max-w-[200px]" title={txn.description}>{txn.description}</TableCell>

                                    {KNOWN_CATEGORIES.map(cat => (
                                        <TableCell key={cat} className="border-r text-right">{renderExpense(txn, cat)}</TableCell>
                                    ))}
                                    <TableCell className="border-r text-right">{renderExpense(txn, "Misc Expenses")}</TableCell>

                                    <TableCell className="border-r text-right bg-emerald-50/50 text-emerald-700 font-medium">
                                        {txn.type === 'INCOME' ? formatIDR(txn.amount) : null}
                                    </TableCell>
                                    <TableCell className="border-r text-right bg-slate-50 font-medium tracking-tighter">
                                        {formatIDR(txn.runningBalance)}
                                    </TableCell>
                                </TableRow>
                            ))}
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
                            Unpaid Villa Dues ({currentMonth})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {unpaidDues.map(u => (
                                <div key={u.owner.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-rose-100">
                                    <div>
                                        <span className="font-semibold text-rose-900">{u.owner.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">(Unit: {u.owner.unitNumber || 'N/A'})</span>
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
        </div>
    );
}
