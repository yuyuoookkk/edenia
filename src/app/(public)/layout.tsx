import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background overflow-hidden text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    );
}
