"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fingerprint, Shield, ShieldCheck, ShieldX, Wifi, WifiOff, Clock, CalendarDays, Users, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────
interface SecurityStaff {
    id: number;
    name: string;
    role: string;
    shift: string;
    isWorking: boolean;
    checkIn: string | null;
    checkOut: string | null;
}

interface TodayLog {
    id: number;
    name: string;
    role: string;
    checkIn: string | null;
    checkOut: string | null;
    status: "present" | "late" | "absent";
}

interface AttendanceData {
    configured: boolean;
    securityStaff: SecurityStaff[];
    todayLog: TodayLog[];
    device: {
        online: boolean;
        lastPing: string | null;
    };
    summary: {
        present: number;
        absent: number;
        total: number;
    };
}

// ── Mock fallback data (used when AIO is not configured) ──
const FALLBACK_STAFF: SecurityStaff[] = [
    { id: 1, name: "Putu Darma", role: "Security 1", shift: "Day (06:00–18:00)", isWorking: false, checkIn: null, checkOut: null },
    { id: 2, name: "Wayan Sudira", role: "Security 2", shift: "Night (18:00–06:00)", isWorking: false, checkIn: null, checkOut: null },
    { id: 3, name: "Kadek Arta", role: "Security 3", shift: "Day (06:00–18:00)", isWorking: false, checkIn: null, checkOut: null },
];
// ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "present" | "late" | "absent" }) {
    const map = {
        present: { label: "Present", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800" },
        late: { label: "Late", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800" },
        absent: { label: "Absent", className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800" },
    };
    const s = map[status];
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function getRelativeTime(dateStr: string | null): string {
    if (!dateStr) return "No data";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
}

export default function AttendancePage() {
    const [data, setData] = useState<AttendanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/attendance");
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Failed to fetch attendance data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const staff = data?.securityStaff || FALLBACK_STAFF;
    const todayLog = data?.todayLog || [];
    const deviceOnline = data?.device?.online || false;
    const presentCount = data?.summary?.present || 0;
    const absentCount = data?.summary?.absent || staff.length;

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Fingerprint className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Attendance System</h1>
                        <p className="text-muted-foreground text-sm">Fingerprint-based security attendance tracking</p>
                    </div>
                </div>
            </div>

            {/* Not configured banner */}
            {data && !data.configured && (
                <div className="px-4 py-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-sm dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
                    <strong>⚠ Adafruit IO not configured.</strong> Set AIO_USERNAME and AIO_KEY in your .env file to enable live data from the ESP32 device.
                </div>
            )}

            {/* ── Security Duty Status ─────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
                {staff.map((guard) => (
                    <Card
                        key={guard.id}
                        className={`relative overflow-hidden border-l-4 shadow-sm transition-all ${guard.isWorking
                            ? "border-l-emerald-500 bg-emerald-500/5"
                            : "border-l-rose-500 bg-rose-500/5"
                            }`}
                    >
                        <CardContent className="pt-5 pb-4 px-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {guard.isWorking ? (
                                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                        ) : (
                                            <ShieldX className="w-5 h-5 text-rose-500" />
                                        )}
                                        <span className="font-semibold text-base">{guard.role}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{guard.name}</p>
                                    <p className="text-xs text-muted-foreground">{guard.shift}</p>
                                </div>
                                <div className="text-right">
                                    {guard.isWorking ? (
                                        <StatusBadge status="present" />
                                    ) : (
                                        <StatusBadge status="absent" />
                                    )}
                                </div>
                            </div>

                            {/* Status message */}
                            <div className={`mt-3 px-3 py-2 rounded-md text-sm font-medium ${guard.isWorking
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                                }`}>
                                {guard.isWorking ? (
                                    <span className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                                        </span>
                                        {guard.role} is working
                                        {guard.checkIn && <span className="text-xs opacity-70 ml-auto">since {guard.checkIn}</span>}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                        {guard.role} is absent
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Summary Cards ────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{presentCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">of {staff.length} security staff</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-rose-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
                        <ShieldX className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-rose-600">{absentCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">not checked in yet</p>
                    </CardContent>
                </Card>

                <Card className={`border-t-4 shadow-sm col-span-2 md:col-span-1 ${deviceOnline ? "border-t-emerald-500" : "border-t-amber-500"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ESP32 Device</CardTitle>
                        {deviceOnline ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-amber-500" />}
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {deviceOnline ? (
                                <>
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-lg font-bold text-emerald-600">Online</span>
                                </>
                            ) : (
                                <>
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                                    <span className="text-lg font-bold text-amber-600">Offline</span>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Last ping: {getRelativeTime(data?.device?.lastPing || null)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Today's Log ───────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Attendance Log — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</CardTitle>
                    <CardDescription>Fingerprint scan records for today</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Check-In</TableHead>
                                <TableHead>Check-Out</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {todayLog.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.name}</TableCell>
                                    <TableCell>{row.role}</TableCell>
                                    <TableCell>
                                        {row.checkIn ? (
                                            <span className="font-mono text-sm">{row.checkIn}</span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {row.checkOut ? (
                                            <span className="font-mono text-sm">{row.checkOut}</span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={row.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {todayLog.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No attendance records yet today
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
