"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ScrollText,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Eye,
    Info,
    Globe,
    Clock,
    User,
} from "lucide-react";

interface OwnerSummary {
    ownerId: string;
    name: string;
    unitNumber: string | null;
    visitCount: number;
}

interface AuditLog {
    id: string;
    page: string;
    ipAddress: string | null;
    userAgent: string | null;
    visitedAt: string;
    owner: {
        name: string;
        unitNumber: string | null;
    } | null;
}

interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function AuditLogPage() {
    // Summary view state
    const [summaries, setSummaries] = useState<OwnerSummary[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(true);

    // Detail view state
    const [selectedOwner, setSelectedOwner] = useState<OwnerSummary | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [page, setPage] = useState(1);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Fetch summaries on mount
    useEffect(() => {
        const fetchSummary = async () => {
            setLoadingSummary(true);
            try {
                const res = await fetch("/api/admin/audit-log/summary");
                if (res.ok) {
                    const data = await res.json();
                    setSummaries(data.summary || []);
                }
            } catch (error) {
                console.error("Failed to fetch audit summary", error);
            } finally {
                setLoadingSummary(false);
            }
        };
        fetchSummary();
    }, []);

    // Fetch detail logs when an owner is selected
    useEffect(() => {
        if (!selectedOwner) return;
        const fetchLogs = async () => {
            setLoadingLogs(true);
            try {
                const res = await fetch(
                    `/api/admin/audit-log?ownerId=${selectedOwner.ownerId}&page=${page}&limit=15`
                );
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data.logs || []);
                    setPagination(data.pagination || null);
                }
            } catch (error) {
                console.error("Failed to fetch detail logs", error);
            } finally {
                setLoadingLogs(false);
            }
        };
        fetchLogs();
    }, [selectedOwner, page]);

    const handleSelectOwner = (owner: OwnerSummary) => {
        setSelectedOwner(owner);
        setPage(1);
        setLogs([]);
    };

    const handleBack = () => {
        setSelectedOwner(null);
        setLogs([]);
        setPagination(null);
        setPage(1);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(date);
    };

    const totalVisits = summaries.reduce((sum, s) => sum + s.visitCount, 0);

    // ─── Detail View ────────────────────────────────────────────────
    if (selectedOwner) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <User className="w-7 h-7 text-indigo-400" />
                            Unit {selectedOwner.unitNumber || "N/A"}
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {selectedOwner.name} &middot; {selectedOwner.visitCount} total visit{selectedOwner.visitCount !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                {/* Detail Table */}
                <Card className="border-slate-800 bg-slate-900 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            Activity History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-slate-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 border-b border-slate-800">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 font-medium">Page Visited</th>
                                            <th scope="col" className="px-6 py-3 font-medium">Time</th>
                                            <th scope="col" className="px-6 py-3 font-medium">IP Address</th>
                                            <th scope="col" className="px-6 py-3 font-medium">Browser</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingLogs ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                    Loading activity...
                                                </td>
                                            </tr>
                                        ) : logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    No activity logs found.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                            <Globe className="w-3 h-3" />
                                                            {log.page}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                                        {formatDate(log.visitedAt)}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                                        {log.ipAddress || "N/A"}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs max-w-[200px] truncate">
                                                        {log.userAgent
                                                            ? log.userAgent.length > 60
                                                                ? log.userAgent.substring(0, 60) + "..."
                                                                : log.userAgent
                                                            : "N/A"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
                                <div>
                                    Showing <span className="font-medium text-slate-300">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                                    <span className="font-medium text-slate-300">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                                    <span className="font-medium text-slate-300">{pagination.total}</span> entries
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={loadingLogs || pagination.page === 1}
                                        className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Prev
                                    </Button>
                                    <div className="px-2 text-slate-300 font-medium">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={loadingLogs || pagination.page === pagination.totalPages}
                                        className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Summary View (Cards Grid) ──────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <ScrollText className="w-8 h-8 text-indigo-400" />
                    Audit Logs
                </h1>
                <p className="text-slate-400 mt-1">Select a unit to view their website activity.</p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card className="border-slate-800 bg-slate-900/80">
                    <CardContent className="pt-5 pb-4 px-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Total Units</p>
                        <p className="text-2xl font-bold text-white mt-1">{summaries.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-800 bg-slate-900/80">
                    <CardContent className="pt-5 pb-4 px-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Total Visits</p>
                        <p className="text-2xl font-bold text-white mt-1">{totalVisits.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-800 bg-slate-900/80 col-span-2 sm:col-span-1">
                    <CardContent className="pt-5 pb-4 px-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Avg Visits/Unit</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {summaries.length > 0 ? Math.round(totalVisits / summaries.length) : 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Unit Cards Grid */}
            {loadingSummary ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p>Loading units...</p>
                </div>
            ) : summaries.length === 0 ? (
                <Card className="border-slate-800 bg-slate-900">
                    <CardContent className="py-16 text-center text-slate-500">
                        <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-lg">No visitor activity recorded yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {summaries.map((owner) => (
                        <Card
                            key={owner.ownerId}
                            className="border-slate-800 bg-slate-900 hover:bg-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 group cursor-pointer"
                            onClick={() => handleSelectOwner(owner)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        {/* Unit badge */}
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 mb-3">
                                            Unit {owner.unitNumber || "N/A"}
                                        </div>
                                        {/* Owner name */}
                                        <p className="text-sm text-slate-300 truncate" title={`Villa ${owner.unitNumber || "N/A"}`}>
                                            Villa {owner.unitNumber || "N/A"}
                                        </p>
                                        {/* Visit count */}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-lg font-bold text-white">{owner.visitCount}</span>
                                            <span className="text-xs text-slate-500">visit{owner.visitCount !== 1 ? "s" : ""}</span>
                                        </div>
                                    </div>
                                    {/* Info button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-60 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectOwner(owner);
                                        }}
                                    >
                                        <Info className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
