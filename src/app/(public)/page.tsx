"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Folder, FileVideo, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [currentMonthStr, setCurrentMonthStr] = useState("");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Start with empty string so nothing is selected and values remain 0.
    setCurrentMonthStr("");
  }, []);

  useEffect(() => {
    if (!currentMonthStr) {
      setIncome(0);
      setExpenses(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/transactions?month=${currentMonthStr}`)
      .then(res => res.json())
      .then(data => {
        const txns = Array.isArray(data.transactions) ? data.transactions : [];
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const txn of txns) {
          if (txn.type === 'INCOME') totalIncome += txn.amount;
          else totalExpenses += txn.amount;
        }

        setIncome(totalIncome);
        setExpenses(totalExpenses);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentMonthStr]);

  const displayMonth = currentMonthStr
    ? new Date(currentMonthStr + '-01').toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : "";

  // Generate months only for the current year up to the current month
  const monthOptions = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  for (let i = currentMonth; i >= 0; i--) {
    const d = new Date(currentYear, i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Villa Edenia</h1>
        <p className="text-muted-foreground">Here is the overview for {displayMonth || "..."}.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Income
              <span className="text-xs text-muted-foreground ml-2">({displayMonth})</span>
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {loading ? "..." : `Rp ${income.toLocaleString('id-ID')}`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on monthly transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-rose-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Expenses
              <span className="text-xs text-muted-foreground ml-2">({displayMonth})</span>
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">
              {loading ? "..." : `Rp ${expenses.toLocaleString('id-ID')}`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tracked monthly expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-primary shadow-sm flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Select Period</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Select value={currentMonthStr} onValueChange={setCurrentMonthStr}>
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
