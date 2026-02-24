"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, Image as ImageIcon, Video, X, Pencil, Check } from "lucide-react";
import { useDropzone } from "react-dropzone";

type FileEntry = { id: string; title: string; type: string; url: string; sizeBytes: number; createdAt: string };

export default function AdminDocumentationPage() {
    const [media, setMedia] = useState<FileEntry[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formType, setFormType] = useState("PHOTO");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editType, setEditType] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        const res = await fetch("/api/files?type=PHOTO,VIDEO");
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : []);
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
        accept: {
            "image/*": [],
            "video/*": [],
        },
    });

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", formTitle);
        formData.append("type", formType);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
            alert(`Upload failed: ${data.error || "Unknown error"}`);
            setUploading(false);
            return;
        }

        setUploading(false);
        setShowForm(false);
        setFormTitle(""); setSelectedFile(null); setFormType("PHOTO");
        fetchMedia();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this media?")) return;
        await fetch(`/api/files?id=${id}`, { method: "DELETE" });
        fetchMedia();
    };

    const startEdit = (f: FileEntry) => {
        setEditingId(f.id);
        setEditTitle(f.title);
        setEditType(f.type);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditTitle("");
        setEditType("");
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        await fetch("/api/files", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, title: editTitle, type: editType }),
        });
        setSaving(false);
        cancelEdit();
        fetchMedia();
    };

    const photos = media.filter(m => m.type === "PHOTO");
    const videos = media.filter(m => m.type === "VIDEO");

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Documentation</h1>
                    <p className="text-slate-400 text-sm">Manage photos and video tours of Villa Edenia</p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                >
                    {showForm ? <X className="w-4 h-4 mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    {showForm ? "Cancel" : "Upload Media"}
                </Button>
            </div>

            {showForm && (
                <Card className="border-blue-500/30 bg-slate-900/80">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Upload Photo or Video</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
                                    ? "border-blue-500 bg-blue-500/10"
                                    : selectedFile
                                        ? "border-blue-500/50 bg-blue-500/5"
                                        : "border-slate-700 hover:border-slate-500"
                                    }`}
                            >
                                <input {...getInputProps()} />
                                {selectedFile ? (
                                    <p className="text-blue-400 font-medium">
                                        ✓ {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                    </p>
                                ) : isDragActive ? (
                                    <p className="text-blue-400">Drop the file here...</p>
                                ) : (
                                    <p className="text-slate-400">Drag & drop an image or video here, or click to select</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Title</Label>
                                    <Input
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="bg-slate-800 border-slate-700 text-white"
                                        placeholder="e.g. Villa Front View"
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
                                            <SelectItem value="PHOTO">Photo</SelectItem>
                                            <SelectItem value="VIDEO">Video</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={!selectedFile || uploading}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                            >
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Photos Section */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                    Photos ({photos.length})
                </h2>
                {photos.length === 0 ? (
                    <Card className="border-slate-700/50 bg-slate-900/50">
                        <CardContent className="py-12 text-center text-slate-500">
                            No photos uploaded yet.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map(p => (
                            <Card key={p.id} className="border-slate-700/50 bg-slate-900/50 overflow-hidden group">
                                <div className="aspect-video bg-slate-800 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-white hover:bg-white/20"
                                                onClick={() => startEdit(p)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-white hover:bg-red-500/40"
                                                onClick={() => handleDelete(p.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 border-t border-slate-700/50">
                                    {editingId === p.id ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="bg-slate-800 border-slate-600 text-white h-8 text-sm flex-1"
                                            />
                                            <Button size="sm" variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10 h-8 w-8 p-0" onClick={handleSaveEdit} disabled={saving}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-slate-400 hover:bg-slate-700 h-8 w-8 p-0" onClick={cancelEdit}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-white text-sm font-medium truncate">{p.title}</p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Videos Section */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-400" />
                    Videos ({videos.length})
                </h2>
                {videos.length === 0 ? (
                    <Card className="border-slate-700/50 bg-slate-900/50">
                        <CardContent className="py-12 text-center text-slate-500">
                            No videos uploaded yet.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {videos.map(v => (
                            <Card key={v.id} className="border-slate-700/50 bg-slate-900/50 overflow-hidden group">
                                <div className="aspect-video bg-slate-800 relative">
                                    <video src={v.url} controls className="w-full h-full object-cover" />
                                </div>
                                <div className="p-3 border-t border-slate-700/50 flex items-center justify-between">
                                    {editingId === v.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="bg-slate-800 border-slate-600 text-white h-8 text-sm flex-1"
                                            />
                                            <Button size="sm" variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10 h-8 w-8 p-0" onClick={handleSaveEdit} disabled={saving}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-slate-400 hover:bg-slate-700 h-8 w-8 p-0" onClick={cancelEdit}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-white text-sm font-medium truncate">{v.title}</p>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" className="text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => startEdit(v)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(v.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
