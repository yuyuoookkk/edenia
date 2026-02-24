import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN &&
    !process.env.BLOB_READ_WRITE_TOKEN.includes("token_here");

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

        const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        let fileUrl: string;

        if (useVercelBlob) {
            // Production: upload to Vercel Blob
            const blob = await put(safeFilename, file, { access: "public" });
            fileUrl = blob.url;
        } else {
            // Local dev: save to public/uploads/
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
