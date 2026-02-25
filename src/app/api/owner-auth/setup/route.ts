import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Name/Unit Number and new password are required" }, { status: 400 });
        }

        // Try to find the user by Unit Number exclusively
        let owner = await prisma.villaOwner.findFirst({
            where: {
                unitNumber: username
            }
        });

        if (!owner) {
            return NextResponse.json({ error: "Villa Owner not found. Please check your spelling." }, { status: 404 });
        }

        // Check if they already have a password set
        if (owner.passwordHash) {
            return NextResponse.json({ error: "An account with a password already exists for this unit. Please Sign In." }, { status: 409 });
        }

        // Hash the new password and save it
        const hashedPassword = hashPassword(password);

        owner = await prisma.villaOwner.update({
            where: { id: owner.id },
            data: { passwordHash: hashedPassword }
        });

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
            // Typical session for a resident portal (e.g. 30 days)
            maxAge: 30 * 24 * 60 * 60,
        });

        return response;
    } catch (error) {
        console.error("Owner Setup error:", error);
        return NextResponse.json({ error: "Account setup failed." }, { status: 500 });
    }
}
