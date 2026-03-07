"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Fingerprint, ShieldCheck, ShieldX, Wifi, WifiOff,
    Users, UserPlus, Search, Download, Signal,
    Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw
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

interface LogEntry {
    id: number;
    name: string;
    role: string;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    status: "present" | "late" | "absent";
}

interface GuardProfile {
    id: number;
    name: string;
    role: string;
    shift: string;
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
    securityStaff: SecurityStaff[];
    todayLog: LogEntry[];
    fullLog: LogEntry[];
    guardProfiles: GuardProfile[];
    device: DeviceInfo;
    summary: {
        present: number;
        absent: number;
        total: number;
    };
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

export default function AdminAttendancePage() {
    const [data, setData] = useState<AttendanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");

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

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const fullLog = data?.fullLog || [];
    const guardProfiles = data?.guardProfiles || [];
    const device = data?.device || { online: false, lastPing: null, firmware: null, rssi: null, uptime: null };
    const totalStaff = guardProfiles.length;
    const configured = data?.configured || false;

    const lateCount = fullLog.filter(l => l.status === "late").length;
    const totalLogs = fullLog.length;
    const presentLogs = fullLog.filter(l => l.status === "present" || l.status === "late").length;
    const avgAttendance = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 0;

    const filteredLog = fullLog.filter(row =>
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

            {/* Not configured banner */}
            {!configured && (
                <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                    <strong>⚠ Adafruit IO not configured.</strong> Set <code className="text-xs bg-slate-700 px-1 py-0.5 rounded">AIO_USERNAME</code> and <code className="text-xs bg-slate-700 px-1 py-0.5 rounded">AIO_KEY</code> in your .env file. Data below will update once the ESP32 device starts publishing.
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-slate-800/50 border border-slate-700/50">
                    <TabsTrigger value="overview" className="gap-1.5 text-slate-400 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
                        <Activity className="w-3.5 h-3.5" /> Overview
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
                                    <p className="text-sm text-slate-400">Avg Attendance</p>
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                </div>
                                <p className="text-3xl font-bold mt-1 text-emerald-400">{avgAttendance}%</p>
                                <p className="text-xs text-slate-500 mt-1">From {totalLogs} records</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-400">Late Check-Ins</p>
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                </div>
                                <p className="text-3xl font-bold mt-1 text-amber-400">{lateCount}</p>
                                <p className="text-xs text-slate-500 mt-1">Check-ins after shift start</p>
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

                    {/* Full attendance log */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">Attendance Log</CardTitle>
                                    <CardDescription className="text-slate-500">Full history of fingerprint scans</CardDescription>
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
                                    <Button variant="outline" size="sm" className="border-slate-600/50 text-slate-300 hover:bg-slate-700">
                                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                                        <TableHead className="text-slate-400">Date</TableHead>
                                        <TableHead className="text-slate-400">Name</TableHead>
                                        <TableHead className="text-slate-400">Role</TableHead>
                                        <TableHead className="text-slate-400">Check-In</TableHead>
                                        <TableHead className="text-slate-400">Check-Out</TableHead>
                                        <TableHead className="text-slate-400">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLog.map((row, idx) => (
                                        <TableRow key={`${row.id}-${row.date}-${idx}`} className="border-slate-700/30 hover:bg-slate-700/20">
                                            <TableCell className="text-slate-300 font-mono text-xs">{row.date}</TableCell>
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

                {/* ─── Staff Tab ──────────────────────────────────── */}
                <TabsContent value="staff" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Staff Management</h2>
                            <p className="text-sm text-slate-400">Manage staff members and fingerprint enrollment</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="border-slate-600/50 text-slate-300 hover:bg-slate-700">
                                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Staff
                            </Button>
                            <Button size="sm" className="bg-primary hover:bg-primary/90">
                                <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Enroll Fingerprint
                            </Button>
                        </div>
                    </div>

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
                                            <span className="text-slate-500">Enrollment Status</span>
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
                        {/* Device Info */}
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Signal className={`w-4 h-4 ${device.online ? "text-emerald-400" : "text-rose-400"}`} /> ESP32 Device Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Status banner */}
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

                        {/* Connection Info */}
                        <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" /> Adafruit IO Connection
                                </CardTitle>
                                <CardDescription className="text-slate-500">MQTT feed status and configuration</CardDescription>
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
                                                <span className="text-sm font-medium text-emerald-400">API Connected</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm font-medium text-amber-400">Not Configured</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-2 border-b border-slate-700/30">
                                            <span className="text-slate-500">Feed: attendance-log</span>
                                            <Badge variant="outline" className={`text-[10px] ${configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                                                {configured ? "Active" : "Pending"}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-700/30">
                                            <span className="text-slate-500">Feed: guard-status</span>
                                            <Badge variant="outline" className={`text-[10px] ${configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                                                {configured ? "Active" : "Pending"}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-700/30">
                                            <span className="text-slate-500">Feed: device-heartbeat</span>
                                            <Badge variant="outline" className={`text-[10px] ${configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                                                {configured ? "Active" : "Pending"}
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
