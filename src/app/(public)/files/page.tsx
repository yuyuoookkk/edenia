"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

type FileEntry = { id: string; title: string; url: string; sizeBytes: number; createdAt: string };

export default function FilesPage() {
    const [files, setFiles] = useState<FileEntry[]>([]);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        const res = await fetch("/api/files?type=DOCUMENT");
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edenia Files</h1>
                <p className="text-muted-foreground">Manage and view all important documents of Villa Edenia.</p>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Size (KB)</TableHead>
                            <TableHead>Upload Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.map(f => (
                            <TableRow key={f.id}>
                                <TableCell><FileText className="w-5 h-5 text-muted-foreground" /></TableCell>
                                <TableCell className="font-medium">{f.title}</TableCell>
                                <TableCell>{Math.round(f.sizeBytes / 1024)}</TableCell>
                                <TableCell>{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={f.url} target="_blank" rel="noopener noreferrer" download>
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {files.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No documents uploaded yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
