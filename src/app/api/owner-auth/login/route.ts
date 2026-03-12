import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Villa number and password required" }, { status: 400 });
        }

        // Find owner by villa/unit number
        let owner = await prisma.villaOwner.findFirst({
            where: {
                unitNumber: username
            }
        });

        if (!owner) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // If owner doesn't have a password set, the first login attempt sets it.
        if (!owner.passwordHash) {
            const { hashPassword } = await import("@/lib/auth");
            const newHash = hashPassword(password);
            
            owner = await prisma.villaOwner.update({
                where: { id: owner.id },
                data: { passwordHash: newHash },
            });
        } else if (!verifyPassword(password, owner.passwordHash)) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const token = createSessionToken(owner.id);

        const response = NextResponse.json({
            success: true,
            user: {
                id: owner.id,
                name: owner.name,
                email: owner.email,
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

