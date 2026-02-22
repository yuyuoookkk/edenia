"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, UserCircle, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

const quickActions = [
    {
        title: "Manage Transactions",
        description: "Add, edit, or delete income and expense entries",
        href: "/admin/transactions",
        icon: LineChart,
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
    },
    {
        title: "Manage Owners",
        description: "Add or update villa owner records and dues",
        href: "/admin/owners",
        icon: UserCircle,
        color: "from-violet-500 to-purple-500",
        bgColor: "bg-violet-500/10",
        borderColor: "border-violet-500/20",
    },
    {
        title: "Files & Media",
        description: "Upload documents, photos, and videos",
        href: "/admin/files",
        icon: FileText,
        color: "from-emerald-500 to-teal-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
    },
];

export default function AdminDashboard() {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
                <p className="text-slate-400 mt-1">Manage Villa Edenia data and settings.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link key={action.href} href={action.href} className="group">
                            <Card className={`h-full border ${action.borderColor} bg-slate-900/50 hover:bg-slate-800/80 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer`}>
                                <CardHeader>
                                    <div className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        {action.title}
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        {action.description}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            <Card className="border-slate-700/50 bg-slate-900/50">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-slate-400 text-sm space-y-2">
                    <p>• Use the <strong className="text-slate-300">Transactions</strong> page to add income and expense records.</p>
                    <p>• The <strong className="text-slate-300">Villa Owners</strong> page lets you manage owner records and monthly dues.</p>
                    <p>• Upload documents, photos, and videos from the <strong className="text-slate-300">Files & Media</strong> section.</p>
                    <p>• All changes made here will be immediately visible on the public site.</p>
                </CardContent>
            </Card>
        </div>
    );
}
