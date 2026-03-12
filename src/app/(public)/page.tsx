"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Folder, FileVideo, CalendarDays, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Helper to get the current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Home() {
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentMonth());
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [paidVillasCount, setPaidVillasCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeGuard, setActiveGuard] = useState<{ name: string; role: string; checkIn: string } | null>(null);

  // Fetch active guard on duty
  useEffect(() => {
    async function fetchActiveGuard() {
      try {
        const res = await fetch("/api/attendance");
        const data = await res.json();
        setActiveGuard(data.activeGuard || null);
      } catch {
        // ignore
      }
    }
    fetchActiveGuard();
    const interval = setInterval(fetchActiveGuard, 30000);
    return () => clearInterval(interval);
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
      {/* Security On Duty Banner */}
      <Link href="/attendance" className="block focus:outline-none">
        <Card className={`relative overflow-hidden border-0 shadow-sm transition-all cursor-pointer group hover:shadow-md ${
          activeGuard
            ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/15 ring-1 ring-inset ring-emerald-500/20"
            : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent hover:from-rose-500/15 ring-1 ring-inset ring-rose-500/20"
        }`}>
          {/* Subtle left accent bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeGuard ? "bg-emerald-500" : "bg-rose-500"}`} />
          
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                {activeGuard ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-emerald-500/20">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-rose-500/20">
                    <ShieldX className="w-8 h-8 text-rose-600 dark:text-rose-500" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Security Status</p>
                    {activeGuard && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  {activeGuard ? (
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                      <p className="text-2xl font-bold tracking-tight text-foreground">{activeGuard.name}</p>
                      <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80">
                        {activeGuard.role} • On duty since {new Date(activeGuard.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-500">No guard on duty</p>
                  )}
                </div>
              </div>
              
              <div className="hidden sm:flex items-center text-sm font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                View Log <ArrowUpRight className="ml-1 w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Income Card */}
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
