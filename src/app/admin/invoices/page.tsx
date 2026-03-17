"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Send, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

type InvoiceResult = {
    owner: string;
    villa: string;
    email: string | null;
    balance: number;
    status: "sent" | "skipped" | "failed";
    error?: string;
};

type InvoiceResponse = {
    invoiceMonth: string;
    summary: { total: number; sent: number; skipped: number; failed: number };
    results: InvoiceResult[];
};

function formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.abs(amount));
}

export default function InvoicesPage() {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<InvoiceResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sendInvoices = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const res = await fetch("/api/cron/send-invoices", {
                headers: {
                    Authorization: `Bearer ${window.prompt("Enter CRON_SECRET to authorize:") || ""}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to send invoices");
                return;
            }

            setResponse(data);
        } catch (err: any) {
            setError(err.message || "Network error");
        } finally {
            setLoading(false);
        }
    };

    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20">
                        <Mail className="w-5 h-5 text-white" />
                    </div>
                    Monthly Invoices
                </h1>
                <p className="text-sm text-slate-400 mt-2">
                    Send monthly debt invoices to all villa owners. Invoices are automatically sent on the 1st of every month.
                </p>
            </div>

            {/* Info Card */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-5">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-200">How it works</p>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            <li>Invoices are sent <strong className="text-slate-300">from</strong> edeniaprivatevillas@gmail.com <strong className="text-slate-300">to</strong> each owner&apos;s email</li>
                            <li>Debt is calculated as: Total Required Dues (since Feb 2026) − Total Payments</li>
                            <li>Owners with no debt receive a confirmation email showing Rp 0</li>
                            <li>Owners without an email address on file are skipped</li>
                            <li>Automatic schedule: <strong className="text-slate-300">1st of every month, 5:00 PM WITA</strong></li>
                        </ul>
                    </div>
                </div>
            </Card>

            {/* Manual Send */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-200">Manual Send</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Send invoices for <strong className="text-slate-300">{currentMonth}</strong> to all owners now
                        </p>
                    </div>
                    <Button
                        onClick={sendInvoices}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Invoices Now
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Error */}
            {error && (
                <Card className="bg-red-500/10 border-red-500/30 p-4">
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                </Card>
            )}

            {/* Results */}
            {response && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="bg-emerald-500/10 border-emerald-500/30 p-4 text-center">
                            <p className="text-2xl font-bold text-emerald-400">{response.summary.sent}</p>
                            <p className="text-xs text-emerald-300/70 mt-1">Sent</p>
                        </Card>
                        <Card className="bg-amber-500/10 border-amber-500/30 p-4 text-center">
                            <p className="text-2xl font-bold text-amber-400">{response.summary.skipped}</p>
                            <p className="text-xs text-amber-300/70 mt-1">Skipped</p>
                        </Card>
                        <Card className="bg-red-500/10 border-red-500/30 p-4 text-center">
                            <p className="text-2xl font-bold text-red-400">{response.summary.failed}</p>
                            <p className="text-xs text-red-300/70 mt-1">Failed</p>
                        </Card>
                    </div>

                    {/* Detail Table */}
                    <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-700/50">
                            <p className="text-sm font-medium text-slate-200">
                                Invoice Results — {response.invoiceMonth}
                            </p>
                        </div>
                        <div className="divide-y divide-slate-700/30">
                            {response.results.map((r, i) => (
                                <div key={i} className="px-5 py-3 flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        {r.status === "sent" ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        ) : r.status === "skipped" ? (
                                            <AlertCircle className="w-4 h-4 text-amber-400" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-200 truncate">
                                            <span className="font-medium">Villa {r.villa}</span>
                                            <span className="text-slate-500 mx-2">·</span>
                                            {r.owner}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {r.email || "No email"}
                                            {r.error && ` — ${r.error}`}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className={`text-sm font-medium ${r.balance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                                            {r.balance < 0 ? `- ${formatIDR(r.balance)}` : formatIDR(r.balance)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
