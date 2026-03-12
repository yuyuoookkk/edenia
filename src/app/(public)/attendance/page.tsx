"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Fingerprint, ShieldCheck, ShieldX, Wifi, WifiOff,
    Clock, CalendarDays, Users, Loader2, ChevronLeft, ChevronRight, X
} from "lucide-react";

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
    hoursWorked: number | null;
    status: "present" | "late" | "absent";
    autoClosedBy: string | null;
}

interface ActiveGuard {
    name: string;
    role: string;
    shift: string;
    checkIn: string;
    fingerprintId: number;
}

interface AttendanceData {
    configured: boolean;
    activeGuard: ActiveGuard | null;
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

interface GuardReport {
    id: string;
    name: string;
    role: string;
    shift: string;
    fingerprintId: number;
    days: Record<string, number>;
    totalHours: number;
}

interface ReportData {
    month: string;
    daysInMonth: number;
    guards: GuardReport[];
}

// ── Helpers ───────────────────────────────────────────────
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

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(month: string): string {
    const [y, m] = month.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function prevMonth(month: string): string {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Main Component ────────────────────────────────────────
export default function AttendancePage() {
    const [data, setData] = useState<AttendanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);
    const [reportMonth, setReportMonth] = useState(getCurrentMonth());
    const [report, setReport] = useState<ReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

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
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchReport = useCallback(async (month: string) => {
        setReportLoading(true);
        try {
            const res = await fetch(`/api/attendance/report?month=${month}`);
            const json = await res.json();
            setReport(json);
        } catch (err) {
            console.error("Failed to fetch report:", err);
        } finally {
            setReportLoading(false);
        }
    }, []);

    useEffect(() => {
        if (showCalendar) {
            fetchReport(reportMonth);
        }
    }, [showCalendar, reportMonth, fetchReport]);

    const activeGuard = data?.activeGuard || null;
    const staff = data?.securityStaff || [];
    const todayLog = data?.todayLog || [];
    const deviceOnline = data?.device?.online || false;
    const presentCount = data?.summary?.present || 0;

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Fingerprint className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Attendance System</h1>
                        <p className="text-muted-foreground text-sm">Fingerprint-based security attendance tracking</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowCalendar(!showCalendar)}
                >
                    <CalendarDays className="w-4 h-4" />
                    {showCalendar ? "Back to Overview" : "Monthly Report"}
                </Button>
            </div>

            {/* Calendar / Report View */}
            {showCalendar ? (
                <CalendarReport
                    report={report}
                    loading={reportLoading}
                    month={reportMonth}
                    onMonthChange={setReportMonth}
                    onClose={() => setShowCalendar(false)}
                />
            ) : (
                <>
                    {/* Active Guard Card */}
                    <Card className={`border-l-4 shadow-md ${activeGuard
                        ? "border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent"
                        : "border-l-rose-500 bg-gradient-to-r from-rose-500/5 to-transparent"
                        }`}>
                        <CardContent className="pt-6 pb-5 px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {activeGuard ? (
                                        <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                            <ShieldCheck className="w-7 h-7 text-emerald-600" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-rose-500/15 flex items-center justify-center">
                                            <ShieldX className="w-7 h-7 text-rose-500" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Currently On Duty</p>
                                        {activeGuard ? (
                                            <>
                                                <p className="text-2xl font-bold">{activeGuard.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {activeGuard.role} • {activeGuard.shift === "Day" ? "Day Shift" : "Night Shift"} • Since{" "}
                                                    {new Date(activeGuard.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-2xl font-bold text-rose-600">No guard on duty</p>
                                        )}
                                    </div>
                                </div>
                                {activeGuard && (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="relative flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Cards */}
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">On Duty</CardTitle>
                                <Users className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-600">{presentCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">of {staff.length} security staff</p>
                            </CardContent>
                        </Card>

                        <Card className="border-t-4 border-t-rose-500 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Off Duty</CardTitle>
                                <ShieldX className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-rose-600">{staff.length - presentCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">not currently on duty</p>
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

                    {/* Today's Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Attendance Log — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </CardTitle>
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
                                        <TableHead>Hours</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {todayLog.map((row, idx) => (
                                        <TableRow key={`${row.id}-${idx}`}>
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
                                                {row.hoursWorked !== null ? (
                                                    <span className="font-mono text-sm">{row.hoursWorked}h</span>
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
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                No attendance records yet today
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

// ── Calendar Report Component ─────────────────────────────
function CalendarReport({
    report,
    loading,
    month,
    onMonthChange,
    onClose,
}: {
    report: ReportData | null;
    loading: boolean;
    month: string;
    onMonthChange: (month: string) => void;
    onClose: () => void;
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!report) return null;

    const daysArray = Array.from({ length: report.daysInMonth }, (_, i) => i + 1);

    return (
        <div className="space-y-6">
            {/* Month Navigation */}
            <Card>
                <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => onMonthChange(prevMonth(month))}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <h2 className="text-lg font-bold">{getMonthLabel(month)}</h2>
                        <Button variant="ghost" size="sm" onClick={() => onMonthChange(nextMonth(month))}>
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Per-Guard Monthly Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {report.guards.map((guard) => (
                    <Card key={guard.id} className="border-t-4 border-t-primary shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{guard.name}</CardTitle>
                            <CardDescription>{guard.role} • {guard.shift} Shift</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary">{guard.totalHours}h</div>
                            <p className="text-xs text-muted-foreground mt-1">Total hours in {getMonthLabel(month)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Daily Breakdown Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Daily Hours Breakdown</CardTitle>
                    <CardDescription>Working hours per guard for each day of {getMonthLabel(month)}</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-background z-10">Day</TableHead>
                                {report.guards.map((guard) => (
                                    <TableHead key={guard.id} className="text-center min-w-[100px]">
                                        {guard.name}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {daysArray.map((day) => {
                                const dateKey = `${month}-${String(day).padStart(2, "0")}`;
                                const dayName = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]) - 1, day)
                                    .toLocaleDateString("en-US", { weekday: "short" });
                                const isToday = dateKey === new Date().toISOString().split("T")[0];

                                return (
                                    <TableRow key={day} className={isToday ? "bg-primary/5" : ""}>
                                        <TableCell className={`sticky left-0 bg-background z-10 font-mono text-sm ${isToday ? "font-bold text-primary" : ""}`}>
                                            {day} {dayName}
                                            {isToday && <span className="ml-1 text-[10px] text-primary">(today)</span>}
                                        </TableCell>
                                        {report.guards.map((guard) => {
                                            const hours = guard.days[dateKey] || 0;
                                            return (
                                                <TableCell key={guard.id} className="text-center">
                                                    {hours > 0 ? (
                                                        <span className="font-mono text-sm font-medium text-emerald-600">
                                                            {hours.toFixed(1)}h
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                            {/* Totals Row */}
                            <TableRow className="border-t-2 font-bold">
                                <TableCell className="sticky left-0 bg-background z-10">Total</TableCell>
                                {report.guards.map((guard) => (
                                    <TableCell key={guard.id} className="text-center text-primary font-mono">
                                        {guard.totalHours.toFixed(1)}h
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
