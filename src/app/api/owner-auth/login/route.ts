import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username/Unit Number and password required" }, { status: 400 });
        }

        // Try to find by unitNumber exclusively
        let owner = await prisma.villaOwner.findFirst({
            where: {
                unitNumber: username
            }
        });

        if (!owner || !owner.passwordHash || !verifyPassword(password, owner.passwordHash)) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const token = createSessionToken(owner.id);

        const response = NextResponse.json({
            success: true,
            user: {
                id: owner.id,
                name: owner.name,
                unitNumber: owner.unitNumber
            }
        });

        response.cookies.set("owner_session", token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60, // 30 days for owners
        });

        return response;
    } catch (error) {
        console.error("Owner Login error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
