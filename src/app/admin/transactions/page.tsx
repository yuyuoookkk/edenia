"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X, Save } from "lucide-react";

type Owner = { id: string; name: string; unitNumber: string | null; monthlyDues: number };
type Transaction = { id: string; type: string; amount: number; date: string; description: string; category: string | null; ownerId: string | null; owner?: Owner };

const CATEGORIES = [
    "Wages", "Village Expenses", "Bank Charges", "Edenia Expenses", "Repairs Maintain"
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [currentMonth, setCurrentMonth] = useState("");
    const [showForm, setShowForm] = useState(false);

    // Form fields
    const [formType, setFormType] = useState("EXPENSE");
    const [formAmount, setFormAmount] = useState("");
    const [formDate, setFormDate] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formCategory, setFormCategory] = useState("");
    const [formOwnerId, setFormOwnerId] = useState("");

    // Monthly balance state
    const [balanceYear, setBalanceYear] = useState(() => new Date().getFullYear());
    const [balances, setBalances] = useState<Record<number, string>>({});
    const [savingMonth, setSavingMonth] = useState<number | null>(null);

    useEffect(() => {
        const today = new Date();
        setCurrentMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
    }, []);

    useEffect(() => {
        if (!currentMonth) return;
        fetchData();
    }, [currentMonth]);

    useEffect(() => {
        fetchBalances();
    }, [balanceYear]);

    const fetchData = async () => {
        const [txnRes, ownerRes] = await Promise.all([
            fetch(`/api/transactions?month=${currentMonth}`),
            fetch("/api/owners"),
        ]);
        const txnData = await txnRes.json();
        const ownerData = await ownerRes.json();
        setTransactions(Array.isArray(txnData.transactions) ? txnData.transactions : []);
        setOwners(Array.isArray(ownerData) ? ownerData : []);
    };

    const fetchBalances = async () => {
        const res = await fetch(`/api/monthly-balance?year=${balanceYear}`);
        const data = await res.json();
        const mapped: Record<number, string> = {};
        for (let m = 1; m <= 12; m++) {
            mapped[m] = data[m] ? data[m].toString() : "";
        }
        setBalances(mapped);
    };

    const saveBalance = async (month: number) => {
        const amount = parseFloat(balances[month] || "0");
        setSavingMonth(month);
        await fetch("/api/monthly-balance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: balanceYear, month, amount }),
        });
        setSavingMonth(null);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: formType,
                amount: formAmount,
                date: formDate,
                description: formDescription,
                category: formCategory || null,
                ownerId: formOwnerId || null,
            }),
        });
        setShowForm(false);
        setFormAmount(""); setFormDate(""); setFormDescription(""); setFormCategory(""); setFormOwnerId("");
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this transaction?")) return;
        await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Transactions</h1>
                    <p className="text-slate-400 text-sm">Add and remove income & expense records</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
                    />
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-gradient-to-r from-primary to-emerald-500 text-white"
                    >
                        {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                        {showForm ? "Cancel" : "Add Transaction"}
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="border-primary/30 bg-slate-900/80">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">New Transaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Type</Label>
                                <Select value={formType} onValueChange={setFormType}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INCOME">Income</SelectItem>
                                        <SelectItem value="EXPENSE">Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Amount (Rp)</Label>
                                <Input
                                    type="number"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white"
                                    required
                                    min="0"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Date</Label>
                                <Input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white"
                                    required
                                />
                            </div>

                            {formType === "EXPENSE" && (
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Category</Label>
                                    <Select value={formCategory} onValueChange={setFormCategory}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {formType === "INCOME" && (
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Owner (optional)</Label>
                                    <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                            <SelectValue placeholder="Select owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {owners.map((o) => (
                                                <SelectItem key={o.id} value={o.id}>
                                                    Unit {o.unitNumber || "N/A"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex items-end">
                                <Button
                                    type="submit"
                                    className="bg-gradient-to-r from-primary to-emerald-500 text-white w-full"
                                >
                                    Save Transaction
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="border-slate-700/50 bg-slate-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="text-sm">
                        <TableHeader className="bg-slate-800/50">
                            <TableRow className="border-slate-700">
                                <TableHead className="text-slate-300">Date</TableHead>
                                <TableHead className="text-slate-300">Type</TableHead>
                                <TableHead className="text-slate-300">Description</TableHead>
                                <TableHead className="text-slate-300">Category</TableHead>
                                <TableHead className="text-slate-300 text-right">Amount</TableHead>
                                <TableHead className="text-slate-300 text-center w-[60px]">Delete</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((txn) => (
                                <TableRow key={txn.id} className="border-slate-800 hover:bg-slate-800/50">
                                    <TableCell className="text-slate-300">{new Date(txn.date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${txn.type === "INCOME" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                                            }`}>
                                            {txn.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-300">{txn.description}</TableCell>
                                    <TableCell className="text-slate-400">{txn.category || "-"}</TableCell>
                                    <TableCell className={`text-right font-medium ${txn.type === "INCOME" ? "text-emerald-400" : "text-rose-400"}`}>
                                        Rp {txn.amount.toLocaleString("id-ID")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => handleDelete(txn.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                        No transactions for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Monthly Balance Section */}
            <Card className="border-blue-500/30 bg-slate-900/80">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            💰 Monthly Balance of Account
                        </CardTitle>
                        <input
                            type="number"
                            min="2020"
                            max="2050"
                            value={balanceYear}
                            onChange={e => setBalanceYear(parseInt(e.target.value))}
                            className="w-24 px-3 py-1 rounded border border-slate-700 bg-slate-800 text-white text-sm"
                        />
                    </div>
                    <p className="text-slate-400 text-sm">Set the balance of account for each month. Press Enter or click Save to confirm.</p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {MONTH_NAMES.map((name, i) => {
                            const month = i + 1;
                            return (
                                <div key={month} className="space-y-1.5">
                                    <Label className="text-slate-300 text-xs">{name}</Label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <span className="absolute left-2 top-2 text-xs text-slate-500">Rp</span>
                                            <Input
                                                type="number"
                                                value={balances[month] || ""}
                                                onChange={e => setBalances(prev => ({ ...prev, [month]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === "Enter") saveBalance(month); }}
                                                className="bg-slate-800 border-slate-700 text-white pl-7 text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => saveBalance(month)}
                                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2"
                                            disabled={savingMonth === month}
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
