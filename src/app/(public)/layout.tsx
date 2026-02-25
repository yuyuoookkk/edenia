"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<{ id: string; name: string; unitNumber: string | null } | null>(null);
    const [checking, setChecking] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/owner-auth/session")
            .then((res) => res.json())
            .then((data) => {
                if (data.authenticated) {
                    setUser(data.user);
                } else {
                    router.push("/login");
                }
                setChecking(false);
            })
            .catch(() => {
                router.push("/login");
                setChecking(false);
            });
    }, [router]);

    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">Checking authorization...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen bg-background overflow-hidden text-foreground">
            <Sidebar unitNumber={user.unitNumber} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header userName={user.unitNumber || ""} />
                <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    );
}
