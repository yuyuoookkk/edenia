import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";
import { del } from "@vercel/blob";
import { unlink } from "fs/promises";
import path from "path";

function shouldUseVercelBlob() {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    return !!token && token.length > 20 && !token.includes("token_here");
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    try {
        let where = {};
        if (type) {
            where = { type };
        }
        if (type && type.includes(',')) {
            where = { type: { in: type.split(',') } };
        }

        const files = await prisma.fileEntry.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(files);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, title, type } = body;
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const data: Record<string, string> = {};
        if (title !== undefined) data.title = title;
        if (type !== undefined) data.type = type;

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const updated = await prisma.fileEntry.update({ where: { id }, data });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const headerList = await headers();
    const userId = getAdminUserIdFromCookie(headerList.get("cookie"));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    try {
        const file = await prisma.fileEntry.findUnique({ where: { id } });
        if (file) {
            if (shouldUseVercelBlob() && file.url.includes("public.blob.vercel-storage.com")) {
                await del(file.url);
            } else if (file.url.startsWith("/uploads/")) {
                const filePath = path.join(process.cwd(), "public", file.url);
                try {
                    await unlink(filePath);
                } catch {
                    // File may already be deleted
                }
            }
        }
        await prisma.fileEntry.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
