"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setLoading(true);

        try {
            const res = await fetch("/api/owner-auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed.");
                if (data.error === "Invalid credentials") {
                    setError("Invalid credentials. If you haven't set a password yet, please use the 'First Time Setup' tab.");
                }
                setLoading(false);
                return;
            }

            router.push("/");
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
            setLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setLoading(true);

        try {
            const res = await fetch("/api/owner-auth/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Setup failed.");
                setLoading(false);
                return;
            }

            setSuccessMsg("Password successfully created! Logging you in...");
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 1000);
        } catch {
            setError("Network error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-0 ring-1 ring-slate-200">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Home className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Welcome to Villa Edenia</CardTitle>
                    <CardDescription className="text-slate-500 mt-2">
                        Resident login portal
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {(error || successMsg) && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 border ${error ? "bg-red-50 border-red-200 text-red-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                            }`}>
                            {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                            {error || successMsg}
                        </div>
                    )}

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Sign In</TabsTrigger>
                            <TabsTrigger value="setup">First Time Setup</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-username" className="text-slate-700">Villa Number</Label>
                                    <Input
                                        id="login-username"
                                        type="text"
                                        placeholder="e.g. 2-5 or 10"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password" className="text-slate-700">Password</Label>
                                    <Input
                                        id="login-password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full mt-2" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {loading ? "Signing in..." : "Sign In"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="setup">
                            <form onSubmit={handleSetup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="setup-username" className="text-slate-700">Villa Number</Label>
                                    <Input
                                        id="setup-username"
                                        type="text"
                                        placeholder="e.g. 2-5 or 10"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="setup-password" className="text-slate-700">Create New Password</Label>
                                    <Input
                                        id="setup-password"
                                        type="password"
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <Button type="submit" className="w-full mt-2" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {loading ? "Creating..." : "Set Password & Login"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
