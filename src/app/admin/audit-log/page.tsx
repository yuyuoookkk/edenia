"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollText, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

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
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async (pageNum: number, searchQuery: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/audit-log?page=${pageNum}&limit=20&search=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page, search);
    }, [page]); // trigger fetch when page changes

    // Handle search input enter key
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // reset to first page
        fetchLogs(1, search);
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

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <ScrollText className="w-8 h-8 text-indigo-400" />
                    Audit Logs
                </h1>
                <p className="text-slate-400 mt-1">View website visitor activity and page tracking.</p>
            </div>

            <Card className="border-slate-800 bg-slate-900 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                        Activity History
                    </CardTitle>
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                type="search"
                                placeholder="Search owner name or unit..."
                                className="pl-9 bg-slate-950 border-slate-800 text-sm focus-visible:ring-indigo-500 w-[250px]"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm" className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30">
                            Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-400">
                                <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 border-b border-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 font-medium">Visitor</th>
                                        <th scope="col" className="px-6 py-3 font-medium">Page Visited</th>
                                        <th scope="col" className="px-6 py-3 font-medium">Time</th>
                                        <th scope="col" className="px-6 py-3 font-medium">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                Loading logs...
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                No visitor logs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    {log.owner ? (
                                                        <div>
                                                            <div className="font-medium text-slate-200">{log.owner.name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">Unit {log.owner.unitNumber || "N/A"}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 italic">Unknown / Unauthenticated</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                        {log.page}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                                    {formatDate(log.visitedAt)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                                    {log.ipAddress || "N/A"}
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
                                    disabled={loading || pagination.page === 1}
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
                                    disabled={loading || pagination.page === pagination.totalPages}
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
