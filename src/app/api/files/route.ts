import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { del } from "@vercel/blob";
import { getAdminUserIdFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // optional filter

    try {
        let where = {};
        if (type) {
            where = { type };
        }

        // allow multiple types separated by comma
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
            // Only try to delete from Blob if it looks like a Vercel Blob URL
            if (file.url.includes("public.blob.vercel-storage.com")) {
                await del(file.url);
            }
        }
        await prisma.fileEntry.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
