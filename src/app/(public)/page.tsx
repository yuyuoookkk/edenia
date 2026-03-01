"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Folder, FileVideo, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [currentPeriod, setCurrentPeriod] = useState("");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [paidVillasCount, setPaidVillasCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Start with empty string so nothing is selected and values remain 0.
    setCurrentPeriod("");
  }, []);

  useEffect(() => {
    if (!currentPeriod) {
      setIncome(0);
      setExpenses(0);
      setPaidVillasCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const isYear = currentPeriod.length === 4;
    const url = isYear ? `/api/transactions?year=${currentPeriod}` : `/api/transactions?month=${currentPeriod}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const txns = Array.isArray(data.transactions) ? data.transactions : [];
        let totalIncome = 0;
        let totalExpenses = 0;
        const uniqueVillasPaid = new Set<string>();

        for (const txn of txns) {
          if (txn.type === 'INCOME') {
            totalIncome += txn.amount;
            if (txn.ownerId) {
              uniqueVillasPaid.add(txn.ownerId);
            }
          }
          else totalExpenses += txn.amount;
        }

        setIncome(totalIncome);
        setExpenses(totalExpenses);
        setPaidVillasCount(uniqueVillasPaid.size);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentPeriod]);

  const displayPeriod = currentPeriod
    ? (currentPeriod.length === 4 ? `Year ${currentPeriod}` : new Date(currentPeriod + '-01').toLocaleDateString('default', { month: 'short', year: 'numeric' }))
    : "";

  // Generate months from current year/month all the way back to Jan 2026
  const monthOptions = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = 2026;

  for (let year = currentYear; year >= startYear; year--) {
    // If it's the current year, start from the current month, else start from December (11)
    const monthStart = year === currentYear ? currentMonth : 11;
    for (let month = monthStart; month >= 0; month--) {
      const d = new Date(year, month, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
      monthOptions.push({ value, label });
    }
  }

  // Generate years from current year down to 2026
  const yearOptions = [];
  for (let year = currentYear; year >= startYear; year--) {
    yearOptions.push(year.toString());
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Villa Edenia</h1>
        <p className="text-muted-foreground">Edenia Overview for {displayPeriod || "..."}.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:bg-emerald-500/5 transition-colors cursor-pointer group">
          <Link href="/owners" className="block w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {currentPeriod.length === 4 ? "Yearly Income" : "Monthly Income"}
                <span className="text-xs text-muted-foreground ml-2">({displayPeriod})</span>
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-emerald-500 group-hover:scale-125 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {loading ? "..." : `Rp ${income.toLocaleString('id-ID')}`}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentPeriod.length === 4 ? "Based on yearly transactions" : "Based on monthly transactions"} &bull; {loading ? "..." : <span className="font-semibold text-emerald-700">{paidVillasCount}</span>} {paidVillasCount === 1 ? 'villa' : 'villas'} paid
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-t-4 border-t-rose-500 shadow-sm hover:bg-rose-500/5 transition-colors cursor-pointer group">
          <Link href="/transactions" className="block w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {currentPeriod.length === 4 ? "Yearly Expenses" : "Monthly Expenses"}
                <span className="text-xs text-muted-foreground ml-2">({displayPeriod})</span>
              </CardTitle>
              <ArrowDownRight className="h-4 w-4 text-rose-500 group-hover:scale-125 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-600">
                {loading ? "..." : `Rp ${expenses.toLocaleString('id-ID')}`}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentPeriod.length === 4 ? "Tracked yearly expenses" : "Tracked monthly expenses"}
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-t-4 border-t-primary shadow-sm flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Select Period</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={currentPeriod.includes('-') ? currentPeriod : ""} onValueChange={setCurrentPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currentPeriod.length === 4 ? currentPeriod : ""} onValueChange={setCurrentPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Summary by year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    Summary for {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer group">
          <Link href="/documentation" className="block w-full h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Edenia Documentation</CardTitle>
              <CardDescription>
                View photos, documents, and other important references.
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-indigo-500/50 transition-colors shadow-sm cursor-pointer group">
          <Link href="/documentation?tab=videos" className="block w-full h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <FileVideo className="h-5 w-5 text-indigo-500" />
              </div>
              <CardTitle>Edenia Video Tour</CardTitle>
              <CardDescription>
                Watch video walk-throughs and property tours.
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
