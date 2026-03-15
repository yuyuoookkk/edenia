import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// Serve files from the uploads directory with proper Content-Type headers
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("file");
    const download = searchParams.get("download") === "1";

    if (!filename) {
        return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    // Prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), "public", "uploads", safeName);

    if (!existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        const fileBuffer = await readFile(filePath);

        // Determine content type from extension
        const ext = path.extname(safeName).toLowerCase();
        const contentTypes: Record<string, string> = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp4": "video/mp4",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt": "text/plain",
        };

        const contentType = contentTypes[ext] || "application/octet-stream";

        const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Content-Length": fileBuffer.length.toString(),
        };

        if (download) {
            headers["Content-Disposition"] = `attachment; filename="${safeName}"`;
        } else {
            headers["Content-Disposition"] = `inline; filename="${safeName}"`;
        }

        return new Response(fileBuffer, { status: 200, headers });
    } catch (error) {
        console.error("File serve error:", error);
        return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
    }
}
