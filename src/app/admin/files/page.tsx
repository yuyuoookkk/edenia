"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2, FileText, Image as ImageIcon, Video, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

type FileEntry = { id: string; title: string; type: string; url: string; sizeBytes: number; createdAt: string };

export default function AdminFilesPage() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formType, setFormType] = useState("DOCUMENT");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        const res = await fetch("/api/files");
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setSelectedFile(acceptedFiles[0]);
            if (!formTitle) {
                setFormTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
            }
        }
    }, [formTitle]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
    });

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", formTitle);
        formData.append("type", formType);

        await fetch("/api/upload", { method: "POST", body: formData });

        setUploading(false);
        setShowForm(false);
        setFormTitle(""); setSelectedFile(null); setFormType("DOCUMENT");
        fetchFiles();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this file?")) return;
        await fetch(`/api/files?id=${id}`, { method: "DELETE" });
        fetchFiles();
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "PHOTO": return <ImageIcon className="w-4 h-4 text-blue-400" />;
            case "VIDEO": return <Video className="w-4 h-4 text-purple-400" />;
            default: return <FileText className="w-4 h-4 text-emerald-400" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Files & Media</h1>
                    <p className="text-slate-400 text-sm">Upload and manage documents, photos, and videos</p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                >
                    {showForm ? <X className="w-4 h-4 mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    {showForm ? "Cancel" : "Upload File"}
                </Button>
            </div>

            {showForm && (
                <Card className="border-emerald-500/30 bg-slate-900/80">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Upload New File</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : selectedFile
                                            ? "border-emerald-500/50 bg-emerald-500/5"
                                            : "border-slate-700 hover:border-slate-500"
                                    }`}
                            >
                                <input {...getInputProps()} />
                                {selectedFile ? (
                                    <p className="text-emerald-400 font-medium">
                                        ✓ {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                    </p>
                                ) : isDragActive ? (
                                    <p className="text-emerald-400">Drop the file here...</p>
                                ) : (
                                    <p className="text-slate-400">Drag & drop a file here, or click to select</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Title</Label>
                                    <Input
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="bg-slate-800 border-slate-700 text-white"
                                        placeholder="e.g. Villa Blueprint"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Type</Label>
                                    <Select value={formType} onValueChange={setFormType}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DOCUMENT">Document</SelectItem>
                                            <SelectItem value="PHOTO">Photo</SelectItem>
                                            <SelectItem value="VIDEO">Video</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={!selectedFile || uploading}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                            >
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="border-slate-700/50 bg-slate-900/50 overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-slate-800/50">
                        <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300 w-[40px]"></TableHead>
                            <TableHead className="text-slate-300">Title</TableHead>
                            <TableHead className="text-slate-300">Type</TableHead>
                            <TableHead className="text-slate-300">Size</TableHead>
                            <TableHead className="text-slate-300">Uploaded</TableHead>
                            <TableHead className="text-slate-300 text-center w-[60px]">Delete</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.map((f) => (
                            <TableRow key={f.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell>{getTypeIcon(f.type)}</TableCell>
                                <TableCell className="text-white font-medium">
                                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                        {f.title}
                                    </a>
                                </TableCell>
                                <TableCell>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.type === "PHOTO" ? "bg-blue-500/15 text-blue-400" :
                                            f.type === "VIDEO" ? "bg-purple-500/15 text-purple-400" :
                                                "bg-emerald-500/15 text-emerald-400"
                                        }`}>
                                        {f.type}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-400">{f.sizeBytes ? `${Math.round(f.sizeBytes / 1024)} KB` : "-"}</TableCell>
                                <TableCell className="text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                        onClick={() => handleDelete(f.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {files.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    No files uploaded yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
