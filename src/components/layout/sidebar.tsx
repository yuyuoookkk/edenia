import Link from "next/link";
import { Home, LineChart, FileText, ImageIcon, Video, UserCircle, Settings } from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Expenses Tracker", href: "/transactions", icon: LineChart },
    { name: "Income Tracker", href: "/owners", icon: UserCircle },
    { name: "Edenia Files", href: "/files", icon: FileText },
    { name: "Documentation", href: "/documentation", icon: ImageIcon },
];

export function Sidebar() {
    return (
        <div className="flex flex-col w-64 border-r border-border bg-card h-screen p-4">
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
    );
}
