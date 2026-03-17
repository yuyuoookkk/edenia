import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Increase body size limit for file uploads
export const maxDuration = 60; // seconds

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function shouldUseVercelBlob() {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    return !!token && token.length > 20 && !token.includes("token_here");
}

export async function POST(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const type = formData.get("type") as string;
        const title = formData.get("title") as string;

        if (!file || !type || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is 10 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
                { status: 413 }
            );
        }

        const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        let fileUrl: string;

        if (shouldUseVercelBlob()) {
            const blob = await put(safeFilename, file, { access: "public" });
            fileUrl = blob.url;
        } else {
            const uploadsDir = path.join(process.cwd(), "public", "uploads");
            await mkdir(uploadsDir, { recursive: true });
            const filePath = path.join(uploadsDir, safeFilename);
            const bytes = await file.arrayBuffer();
            await writeFile(filePath, Buffer.from(bytes));
            fileUrl = `/uploads/${safeFilename}`;
        }

        const entry = await prisma.fileEntry.create({
            data: {
                title,
                type,
                url: fileUrl,
                sizeBytes: file.size,
            },
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error("Upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to upload file";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
