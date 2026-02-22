import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password required" }, { status: 400 });
        }

        const user = await prisma.adminUser.findUnique({ where: { username } });

        if (!user || !verifyPassword(password, user.passwordHash)) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const token = createSessionToken(user.id);

        const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
        response.cookies.set("admin_session", token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
