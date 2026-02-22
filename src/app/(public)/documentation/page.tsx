"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Video } from "lucide-react";

type FileEntry = { id: string; title: string; url: string; type: string };

export default function DocumentationPage() {
    const [media, setMedia] = useState<FileEntry[]>([]);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        const res = await fetch("/api/files?type=PHOTO,VIDEO");
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : []);
    };

    const photos = media.filter(m => m.type === "PHOTO");
    const videos = media.filter(m => m.type === "VIDEO");

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edenia Documentation</h1>
                <p className="text-muted-foreground">Gallery of photos and video tours.</p>
            </div>

            <Tabs defaultValue="photos" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="photos" className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Photos ({photos.length})
                    </TabsTrigger>
                    <TabsTrigger value="videos" className="flex items-center gap-2">
                        <Video className="w-4 h-4" /> Videos ({videos.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {photos.map(p => (
                        <Card key={p.id} className="overflow-hidden group relative">
                            <div className="aspect-video bg-muted relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt={p.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            </div>
                            <div className="p-3 bg-card border-t">
                                <p className="font-medium truncate">{p.title}</p>
                            </div>
                        </Card>
                    ))}
                    {photos.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card">
                            No photos uploaded yet.
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="videos" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {videos.map(v => (
                        <Card key={v.id} className="overflow-hidden group relative">
                            <div className="aspect-video bg-muted relative">
                                <video src={v.url} controls className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 bg-card border-t flex justify-between items-center">
                                <p className="font-medium truncate">{v.title}</p>
                            </div>
                        </Card>
                    ))}
                    {videos.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card">
                            No videos uploaded yet.
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
