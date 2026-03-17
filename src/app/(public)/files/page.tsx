"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ChevronDown, ChevronUp } from "lucide-react";

type FileEntry = { id: string; title: string; url: string; sizeBytes: number; createdAt: string };

function getServeUrl(fileUrl: string, download: boolean) {
    const filename = fileUrl.split('/').pop() || '';
    return `/api/serve-file?file=${encodeURIComponent(filename)}${download ? '&download=1' : ''}`;
}

function isPdf(url: string) {
    return url.toLowerCase().endsWith('.pdf');
}

export default function FilesPage() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        const res = await fetch("/api/files?type=DOCUMENT");
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
    };

    const toggleCollapse = (id: string) => {
        setCollapsedFiles(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edenia Files</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">View and download all important documents of Villa Edenia.</p>
            </div>

            {files.length === 0 && (
                <Card>
                    <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                        No documents uploaded yet.
                    </CardContent>
                </Card>
            )}

            {files.map(f => {
                const pdf = isPdf(f.url);
                const isCollapsed = collapsedFiles.has(f.id);

                return (
                    <Card key={f.id} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between gap-4 py-3 px-4 bg-muted/30">
                            <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <CardTitle className="text-sm sm:text-base font-semibold truncate">{f.title}</CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {Math.round(f.sizeBytes / 1024)} KB • {new Date(f.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={getServeUrl(f.url, true)}>
                                        <Download className="w-4 h-4 mr-1" /> Download
                                    </a>
                                </Button>
                                {pdf && (
                                    <Button variant="ghost" size="sm" onClick={() => toggleCollapse(f.id)}>
                                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        {pdf && !isCollapsed && (
                            <CardContent className="p-0">
                                <iframe
                                    src={getServeUrl(f.url, false)}
                                    className="w-full border-0"
                                    style={{ height: "80vh", minHeight: "500px" }}
                                    title={f.title}
                                />
                            </CardContent>
                        )}

                        {!pdf && (
                            <CardContent className="py-4 px-4 text-sm text-muted-foreground">
                                This file type cannot be previewed. Please download to view.
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
