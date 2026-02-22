export function Header() {
    return (
        <header className="h-16 border-b border-border bg-background flex items-center px-6 sticky top-0 z-10">
            <div className="ml-auto flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                    User
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    U
                </div>
            </div>
        </header>
    );
}
