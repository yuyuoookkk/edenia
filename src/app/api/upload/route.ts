import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const type = formData.get("type") as string; // "DOCUMENT", "PHOTO", "VIDEO"
        const title = formData.get("title") as string;

        if (!file || !type || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

        // Upload to Vercel Blob
        const blob = await put(safeFilename, file, {
            access: 'public',
        });

        // Create DB entry
        const entry = await prisma.fileEntry.create({
            data: {
                title,
                type,
                url: blob.url,
                sizeBytes: file.size,
            },
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
