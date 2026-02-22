"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AdminSidebar, adminNavItems } from "@/components/layout/admin-sidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ShieldCheck, LogOut } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<{ id: string; username: string } | null>(null);
    const [checking, setChecking] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Don't apply this layout to the login page
    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        if (isLoginPage) {
            setChecking(false);
            return;
        }

        fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => {
                if (data.authenticated) {
                    setUser(data.user);
                } else {
                    router.push("/admin/login");
                }
                setChecking(false);
            })
            .catch(() => {
                router.push("/admin/login");
                setChecking(false);
            });
    }, [isLoginPage, router]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/admin/login");
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            <AdminSidebar username={user.username} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-4 md:px-6 sticky top-0 z-10">
                    <div className="md:hidden flex items-center mr-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="p-2 -ml-2 hover:bg-slate-800 rounded-md text-slate-400">
                                    <Menu className="w-5 h-5" />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-64 border-r border-slate-700/50 bg-slate-900 flex flex-col h-full">
                                <SheetTitle className="sr-only">Admin Menu</SheetTitle>

                                <div className="flex items-center gap-2 mt-6 mb-8 px-6">
                                    <div className="bg-gradient-to-br from-primary to-emerald-500 text-white p-2 rounded-lg shadow-lg shadow-primary/20">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h1 className="font-bold text-lg tracking-tight text-white">Villa Edenia</h1>
                                        <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Admin Panel</span>
                                    </div>
                                </div>

                                <nav className="flex-1 space-y-1 px-4">
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

                                <div className="mt-auto border-t border-slate-700/50 p-4 space-y-3">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow">
                                            {user.username[0]?.toUpperCase() || "A"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{user.username}</p>
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
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs text-slate-500 uppercase tracking-wider hidden sm:block">Admin Mode</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
