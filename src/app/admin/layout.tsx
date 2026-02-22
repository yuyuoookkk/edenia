"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

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

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            <AdminSidebar username={user.username} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 sticky top-0 z-10">
                    <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Admin Mode</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
