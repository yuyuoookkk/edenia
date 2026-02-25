"use client";

import { Menu, Home, Settings, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navItems } from "@/components/layout/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header({ userName }: { userName?: string }) {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/owner-auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    };
    return (
        <header className="h-16 border-b border-border bg-background flex items-center px-4 md:px-6 sticky top-0 z-10">
            <div className="md:hidden flex items-center mr-4">
                <Sheet>
                    <SheetTrigger asChild>
                        <button className="p-2 -ml-2 hover:bg-muted rounded-md text-muted-foreground">
                            <Menu className="w-6 h-6" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64 border-r-0">
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                        <div className="flex flex-col h-full bg-card p-4">
                            <div className="flex items-center gap-2 mb-8 px-2">
                                <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                                    <Home className="w-5 h-5" />
                                </div>
                                <h1 className="font-bold text-xl tracking-tight">Villa Edenia</h1>
                            </div>
                            <nav className="flex-1 space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                        >
                                            <Icon className="w-4 h-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="mt-auto px-2 border-t pt-4">
                                <Link href="/settings" className="flex items-center gap-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="ml-auto flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-medium">Unit {userName || "N/A"}</span>
                    <span className="text-xs text-muted-foreground text-right w-full">Resident</span>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                    {userName || "U"}
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors ml-1"
                    title="Sign Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
