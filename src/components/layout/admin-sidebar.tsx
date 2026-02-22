"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home, LineChart, UserCircle, FileText, ImageIcon,
    LogOut, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const adminNavItems = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Transactions", href: "/admin/transactions", icon: LineChart },
    { name: "Villa Owners", href: "/admin/owners", icon: UserCircle },
    { name: "Files & Media", href: "/admin/files", icon: FileText },
];

export function AdminSidebar({ username }: { username: string }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/admin/login");
    };

    return (
        <div className="hidden md:flex flex-col w-64 border-r border-slate-700/50 bg-slate-900 h-screen p-4">
            <div className="flex items-center gap-2 mb-8 px-2">
                <div className="bg-gradient-to-br from-primary to-emerald-500 text-white p-2 rounded-lg shadow-lg shadow-primary/20">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-white">Villa Edenia</h1>
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Admin Panel</span>
                </div>
            </div>

            <nav className="flex-1 space-y-1">
                {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                ? "bg-primary/15 text-primary shadow-sm border border-primary/20"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto border-t border-slate-700/50 pt-4 space-y-3">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow">
                        {username[0]?.toUpperCase() || "A"}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{username}</p>
                        <p className="text-[10px] text-slate-500">Administrator</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
