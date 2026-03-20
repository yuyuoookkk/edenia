"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Fingerprint, ShieldCheck, Users, UserPlus, Search, Download, Signal,
    Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw,
    CalendarDays, Wifi, WifiOff, ChevronLeft, ChevronRight
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────
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

interface GuardProfile {
    id: number;
    name: string;
    role: string;
    shift: string;
}

interface ActiveGuard {
    name: string;
    role: string;
    shift: string;
    checkIn: string;
    fingerprintId: number;
}

interface DeviceInfo {
    online: boolean;
    lastPing: string | null;
    firmware: string | null;
    rssi: number | null;
    uptime: number | null;
}

interface AttendanceData {
    configured: boolean;
    activeGuard: ActiveGuard | null;
    securityStaff: { id: number; name: string; role: string; shift: string; isWorking: boolean; checkIn: string | null; checkOut: string | null }[];
    todayLog: TodayLog[];
    guardProfiles: GuardProfile[];
    device: DeviceInfo;
    summary: { present: number; absent: number; total: number };
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
// ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "present" | "late" | "absent" }) {
    const map = {
        present: { label: "Present", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        late: { label: "Late", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
        absent: { label: "Absent", className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
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

function formatUptime(seconds: number | null): string {
    if (!seconds) return "N/A";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
}

function getRssiLabel(rssi: number | null): { label: string; color: string } {
    if (rssi === null) return { label: "N/A", color: "text-slate-500" };
    if (rssi >= -50) return { label: `Strong (${rssi} dBm)`, color: "text-emerald-400" };
    if (rssi >= -70) return { label: `Good (${rssi} dBm)`, color: "text-amber-400" };
    return { label: `Weak (${rssi} dBm)`, color: "text-rose-400" };
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

export default function AdminAttendancePage() {
    const [data, setData] = useState<AttendanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [reportMonth, setReportMonth] = useState(getCurrentMonth());
    const [report, setReport] = useState<ReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Enrollment state
    const [showEnrollForm, setShowEnrollForm] = useState(false);
    const [enrollName, setEnrollName] = useState("");
    const [enrollRole, setEnrollRole] = useState("");
    const [enrollShift, setEnrollShift] = useState("Day");
    const [enrollShiftStart, setEnrollShiftStart] = useState("06:00");
    const [enrollFpId, setEnrollFpId] = useState("");
    const [enrolling, setEnrolling] = useState(false);
    const [enrollStatus, setEnrollStatus] = useState<{
        status: string; message: string | null; guardName: string | null;
    } | null>(null);

    async function fetchData(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        try {
            const res = await fetch("/api/attendance");
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Failed to fetch attendance data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

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
        fetchData();
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    // Poll enrollment status when enrolling
    useEffect(() => {
        if (!enrolling) return;
        const poll = setInterval(async () => {
            try {
                const res = await fetch("/api/attendance/enroll");
                const json = await res.json();
                setEnrollStatus(json);
                if (json.status === "success" || json.status === "failed") {
                    setEnrolling(false);
                    if (json.status === "success") {
                        fetchData(true); // Refresh guard list
                    }
                }
            } catch { /* ignore */ }
        }, 2000);
        return () => clearInterval(poll);
    }, [enrolling]);

    async function startEnrollment() {
        const fpId = parseInt(enrollFpId);
        if (!enrollName || !enrollRole || !fpId || fpId < 1 || fpId > 127) return;

        setEnrolling(true);
        setEnrollStatus({ status: "pending", message: "Sending request...", guardName: enrollName });

        try {
            const res = await fetch("/api/attendance/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fingerprintId: fpId,
                    name: enrollName,
                    role: enrollRole,
                    shift: enrollShift,
                    shiftStart: enrollShiftStart,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setEnrolling(false);
                setEnrollStatus({ status: "failed", message: json.error, guardName: enrollName });
                return;
            }
            setEnrollStatus({ status: "pending", message: json.message, guardName: enrollName });
        } catch {
            setEnrolling(false);
            setEnrollStatus({ status: "failed", message: "Network error", guardName: enrollName });
        }
    }

    async function cancelEnrollment() {
        try {
            await fetch("/api/attendance/enroll", { method: "DELETE" });
        } catch { /* ignore */ }
        setEnrolling(false);
        setEnrollStatus(null);
    }

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const todayLog = data?.todayLog || [];
    const guardProfiles = data?.guardProfiles || [];
    const device = data?.device || { online: false, lastPing: null, firmware: null, rssi: null, uptime: null };
    const activeGuard = data?.activeGuard || null;
    const totalStaff = guardProfiles.length;
    const configured = data?.configured || false;

    const lateCount = todayLog.filter(l => l.status === "late").length;
    const presentCount = data?.summary?.present || 0;

    const filteredLog = todayLog.filter(row =>
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.role.toLowerCase().includes(search.toLowerCase())
    );

    const rssiInfo = getRssiLabel(device.rssi);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/20">
                        <Fingerprint className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
                        <p className="text-sm text-slate-400">Manage staff, devices, and attendance records</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600/50 text-slate-300 hover:bg-slate-700"
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            {/* Active Guard Banner */}
            {activeGuard && (
                <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <strong>{activeGuard.name}</strong> is currently on duty ({activeGuard.role}) — checked in at{" "}
                    {new Date(activeGuard.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </div>
            )}

            {/* Not connected banner */}
            {!configured && (
                <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                    <strong>⚠ No attendance data yet.</strong> Data will appear once the ESP32 device is connected and guards begin scanning their fingerprints.
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-slate-800/50 border border-slate-700/50">
                    <TabsTrigger value="overview" className="gap-1.5 text-slate-400 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
                        <Activity className="w-3.5 h-3.5" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="gap-1.5 text-slate-400 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400" onClick={() => fetchReport(reportMonth)}>
                        <CalendarDays className="w-3.5 h-3.5" /> Calendar Report
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="gap-1.5 text-slate-400 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
                        <Users className="w-3.5 h-3.5" /> Staff
                    </TabsTrigger>
                    <TabsTrigger value="device" className="gap-1.5 text-slate-400 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
                        <Signal className="w-3.5 h-3.5" /> Device
                    </TabsTrigger>
                </TabsList>

                {/* ─── Overview Tab ───────────────────────────────── */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-400">Total Staff</p>
                                    <Users className="w-4 h-4 text-slate-500" />
                                </div>
                                <p className="text-3xl font-bold mt-1">{totalStaff}</p>
                                <p className="text-xs text-slate-500 mt-1">{totalStaff} enrolled</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-400">On Duty</p>
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                </div>
                                <p className="text-3xl font-bold mt-1 text-emerald-400">{presentCount}</p>
                                <p className="text-xs text-slate-500 mt-1">Currently active</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-400">Late Check-Ins</p>
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                </div>
                                <p className="text-3xl font-bold mt-1 text-amber-400">{lateCount}</p>
                                <p className="text-xs text-slate-500 mt-1">Today</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-400">Device Status</p>
                                    <Signal className={`w-4 h-4 ${device.online ? "text-emerald-400" : "text-rose-400"}`} />
                                </div>
                                <p className={`text-3xl font-bold mt-1 ${device.online ? "text-emerald-400" : "text-rose-400"}`}>
                                    {device.online ? "Online" : "Offline"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {device.lastPing ? `Last: ${getRelativeTime(device.lastPing)}` : "No heartbeat yet"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Today's attendance log */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
                                    <CardDescription className="text-slate-500">Fingerprint scan records for today</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            placeholder="Search staff..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-9 w-48 bg-slate-900/50 border-slate-600/50 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                                        <TableHead className="text-slate-400">Name</TableHead>
                                        <TableHead className="text-slate-400">Role</TableHead>
                                        <TableHead className="text-slate-400">Check-In</TableHead>
                                        <TableHead className="text-slate-400">Check-Out</TableHead>
                                        <TableHead className="text-slate-400">Hours</TableHead>
                                        <TableHead className="text-slate-400">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLog.map((row, idx) => (
                                        <TableRow key={`${row.id}-${idx}`} className="border-slate-700/30 hover:bg-slate-700/20">
                                            <TableCell className="font-medium">{row.name}</TableCell>
                                            <TableCell className="text-slate-400">{row.role}</TableCell>
                                            <TableCell>
                                                {row.checkIn ? (
                                                    <span className="font-mono text-sm text-slate-300">{row.checkIn}</span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.checkOut ? (
                                                    <span className="font-mono text-sm text-slate-300">{row.checkOut}</span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.hoursWorked !== null ? (
                                                    <span className="font-mono text-sm text-slate-300">{row.hoursWorked}h</span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={row.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredLog.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                                {search ? "No matching records found" : "No attendance records yet — data will appear once the ESP32 starts scanning"}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Calendar Report Tab ─────────────────────────── */}
                <TabsContent value="calendar" className="space-y-6">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm" className="border-slate-600/50 text-slate-300 hover:bg-slate-700" onClick={() => { const m = prevMonth(reportMonth); setReportMonth(m); fetchReport(m); }}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <h2 className="text-lg font-bold">{getMonthLabel(reportMonth)}</h2>
                        <Button variant="outline" size="sm" className="border-slate-600/50 text-slate-300 hover:bg-slate-700" onClick={() => { const m = nextMonth(reportMonth); setReportMonth(m); fetchReport(m); }}>
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    {reportLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : report ? (
                        <>
                            {/* Per-Guard Monthly Summary */}
                            <div className="grid gap-4 md:grid-cols-3">
                                {report.guards.map((guard) => (
                                    <Card key={guard.id} className="bg-slate-800/50 border-slate-700/50 border-t-4 border-t-primary">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">{guard.name}</CardTitle>
                                            <CardDescription className="text-slate-500">{guard.role} • {guard.shift} Shift</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-primary">{guard.totalHours}h</div>
                                            <p className="text-xs text-slate-500 mt-1">Total in {getMonthLabel(reportMonth)}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Daily Breakdown */}
                            <Card className="bg-slate-800/50 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-base">Daily Hours Breakdown</CardTitle>
                                    <CardDescription className="text-slate-500">Hours worked per guard for each day</CardDescription>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-slate-700/50 hover:bg-transparent">
                                                <TableHead className="text-slate-400 sticky left-0 bg-slate-800/50 z-10">Day</TableHead>
                                                {report.guards.map((guard) => (
                                                    <TableHead key={guard.id} className="text-slate-400 text-center min-w-[100px]">{guard.name}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.from({ length: report.daysInMonth }, (_, i) => i + 1).map((day) => {
                                                const dateKey = `${reportMonth}-${String(day).padStart(2, "0")}`;
                                                const dayName = new Date(parseInt(reportMonth.split("-")[0]), parseInt(reportMonth.split("-")[1]) - 1, day)
                                                    .toLocaleDateString("en-US", { weekday: "short" });
                                                const isToday = dateKey === new Date().toISOString().split("T")[0];

                                                return (
                                                    <TableRow key={day} className={`border-slate-700/30 ${isToday ? "bg-primary/10" : "hover:bg-slate-700/20"}`}>
                                                        <TableCell className={`sticky left-0 bg-slate-800/50 z-10 font-mono text-xs ${isToday ? "font-bold text-primary" : "text-slate-300"}`}>
                                                            {day} {dayName} {isToday && <span className="text-[10px] text-primary ml-1">(today)</span>}
                                                        </TableCell>
                                                        {report.guards.map((guard) => {
                                                            const hours = guard.days[dateKey] || 0;
                                                            return (
                                                                <TableCell key={guard.id} className="text-center">
                                                                    {hours > 0 ? (
                                                                        <span className="font-mono text-sm text-emerald-400">{hours.toFixed(1)}h</span>
                                                                    ) : (
                                                                        <span className="text-slate-600 text-xs">—</span>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                            <TableRow className="border-t-2 border-slate-600 font-bold">
                                                <TableCell className="sticky left-0 bg-slate-800/50 z-10 text-slate-300">Total</TableCell>
                                                {report.guards.map((guard) => (
                                                    <TableCell key={guard.id} className="text-center text-primary font-mono">{guard.totalHours.toFixed(1)}h</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <div className="text-center text-slate-500 py-12">No report data available</div>
                    )}
                </TabsContent>

                {/* ─── Staff Tab ──────────────────────────────────── */}
                <TabsContent value="staff" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Staff Management</h2>
                            <p className="text-sm text-slate-400">Manage staff members and fingerprint enrollment</p>
                        </div>
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => setShowEnrollForm(!showEnrollForm)}
                            disabled={enrolling}
                        >
                            <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
                            {showEnrollForm ? "Cancel" : "Enroll New Guard"}
                        </Button>
                    </div>

                    {/* Enrollment Form */}
                    {showEnrollForm && (
                        <Card className="bg-slate-800/50 border-primary/30 border-2">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4 text-primary" />
                                    Enroll New Guard
                                </CardTitle>
                                <CardDescription className="text-slate-500">
                                    Fill in the guard details, then click Start. The device will guide the guard through fingerprint capture.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-slate-400">Guard Name</label>
                                        <Input
                                            placeholder="e.g. Made Surya"
                                            value={enrollName}
                                            onChange={(e) => setEnrollName(e.target.value)}
                                            className="bg-slate-900/50 border-slate-600/50"
                                            disabled={enrolling}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-slate-400">Role</label>
                                        <Input
                                            placeholder="e.g. Security 4"
                                            value={enrollRole}
                                            onChange={(e) => setEnrollRole(e.target.value)}
                                            className="bg-slate-900/50 border-slate-600/50"
                                            disabled={enrolling}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-slate-400">Fingerprint Slot (1-127)</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={127}
                                            placeholder="e.g. 4"
                                            value={enrollFpId}
                                            onChange={(e) => setEnrollFpId(e.target.value)}
                                            className="bg-slate-900/50 border-slate-600/50"
                                            disabled={enrolling}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-slate-400">Shift</label>
                                        <select
                                            value={enrollShift}
                                            onChange={(e) => {
                                                setEnrollShift(e.target.value);
                                                setEnrollShiftStart(e.target.value === "Day" ? "06:00" : "18:00");
                                            }}
                                            className="w-full h-9 px-3 rounded-md bg-slate-900/50 border border-slate-600/50 text-sm text-slate-200"
                                            disabled={enrolling}
                                        >
                                            <option value="Day">Day (06:00–18:00)</option>
                                            <option value="Night">Night (18:00–06:00)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Enrollment Status */}
                                {enrollStatus && (
                                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        enrollStatus.status === "success" ? "bg-emerald-500/10 border-emerald-500/20" :
                                        enrollStatus.status === "failed" ? "bg-rose-500/10 border-rose-500/20" :
                                        "bg-amber-500/10 border-amber-500/20"
                                    }`}>
                                        {enrollStatus.status === "pending" && (
                                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                        )}
                                        {enrollStatus.status === "in_progress" && (
                                            <Fingerprint className="w-4 h-4 text-amber-400 animate-pulse" />
                                        )}
                                        {enrollStatus.status === "success" && (
                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                        )}
                                        {enrollStatus.status === "failed" && (
                                            <XCircle className="w-4 h-4 text-rose-400" />
                                        )}
                                        <span className={`text-sm font-medium ${
                                            enrollStatus.status === "success" ? "text-emerald-400" :
                                            enrollStatus.status === "failed" ? "text-rose-400" :
                                            "text-amber-400"
                                        }`}>
                                            {enrollStatus.message || "Processing..."}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={enrolling || !enrollName || !enrollRole || !enrollFpId}
                                        onClick={startEnrollment}
                                    >
                                        {enrolling ? (
                                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enrolling...</>
                                        ) : (
                                            <><Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Start Enrollment</>
                                        )}
                                    </Button>
                                    {enrolling && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                            onClick={cancelEnrollment}
                                        >
                                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {guardProfiles.map((staff) => (
                            <Card key={staff.id} className="bg-slate-800/50 border-slate-700/50 relative overflow-hidden">
                                <CardContent className="pt-5 pb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-primary/30 to-emerald-500/30 text-emerald-400 border border-emerald-500/30">
                                                {staff.name.split(" ").map(n => n[0]).join("")}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{staff.name}</p>
                                                <p className="text-xs text-slate-400">{staff.role}</p>
                                            </div>
                                        </div>
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Fingerprint ID</span>
                                            <span className="font-mono text-slate-300">FP-{String(staff.id).padStart(3, "0")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Shift</span>
                                            <span className="text-slate-300">{staff.shift}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Status</span>
                                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                Enrolled
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── Device Tab ─────────────────────────────────── */}
                <TabsContent value="device" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Signal className={`w-4 h-4 ${device.online ? "text-emerald-400" : "text-rose-400"}`} /> ESP32 Device Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className={`flex items-center gap-3 p-3 rounded-lg border ${device.online
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : "bg-rose-500/10 border-rose-500/20"
                                    }`}>
                                    {device.online ? (
                                        <>
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-sm font-medium text-emerald-400">Device Online</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                                            <span className="text-sm font-medium text-rose-400">Device Offline</span>
                                        </>
                                    )}
                                    <span className="text-xs text-slate-500 ml-auto">
                                        Last ping: {getRelativeTime(device.lastPing)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-xs">Device Name</p>
                                        <p className="font-medium">ESP32-ATTENDANCE-01</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-xs">Firmware</p>
                                        <p className="text-slate-300">{device.firmware || "Unknown"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-xs">Wi-Fi Signal</p>
                                        <div className="flex items-center gap-1.5">
                                            <Wifi className={`w-3.5 h-3.5 ${rssiInfo.color}`} />
                                            <span className={rssiInfo.color}>{rssiInfo.label}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-xs">Uptime</p>
                                        <p className="text-slate-300">{formatUptime(device.uptime)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-xs">Sensor</p>
                                        <p className="text-slate-300">R307 Optical</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-xs">Enrolled Prints</p>
                                        <p className="text-slate-300">{guardProfiles.length} / 127</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" /> Connection Info
                                </CardTitle>
                                <CardDescription className="text-slate-500">API and device connection status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${configured
                                        ? "bg-emerald-500/10 border-emerald-500/20"
                                        : "bg-amber-500/10 border-amber-500/20"
                                        }`}>
                                        {configured ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                <span className="text-sm font-medium text-emerald-400">Heartbeat API Connected</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm font-medium text-amber-400">Heartbeat Not Configured</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-2 border-b border-slate-700/30">
                                            <span className="text-slate-500">Scan API</span>
                                            <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                                                Active (HTTP)
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-700/30">
                                            <span className="text-slate-500">Database</span>
                                            <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                                                PostgreSQL
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-700/30">
                                            <span className="text-slate-500">Device Heartbeat</span>
                                            <Badge variant="outline" className={`text-[10px] ${configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                                                {configured ? "Active (AIO)" : "Pending"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
