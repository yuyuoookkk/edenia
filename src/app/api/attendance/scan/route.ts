import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/attendance/scan
 * 
 * Called by ESP32 on each fingerprint scan.
 * Handles: check-in, check-out, and automatic shift replacement.
 * 
 * Body: { fingerprintId: number }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fingerprintId } = body;

        if (!fingerprintId || typeof fingerprintId !== "number") {
            return NextResponse.json(
                { error: "Missing or invalid fingerprintId" },
                { status: 400 }
            );
        }

        // Find the guard by fingerprint ID
        const guard = await prisma.securityGuard.findUnique({
            where: { fingerprintId },
        });

        if (!guard) {
            return NextResponse.json(
                { error: "Unknown fingerprint", fingerprintId },
                { status: 404 }
            );
        }

        const now = new Date();
        const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" }); // "YYYY-MM-DD" in WITA

        // Check if THIS guard has an open record (checked in, not checked out)
        const ownOpenRecord = await prisma.attendanceRecord.findFirst({
            where: {
                guardId: guard.id,
                checkOut: null,
            },
            orderBy: { checkIn: "desc" },
        });

        // ── Case 1: Same guard scans again → CHECK OUT ──
        if (ownOpenRecord) {
            const checkOutTime = now;
            const diffMs = checkOutTime.getTime() - ownOpenRecord.checkIn.getTime();
            const hoursWorked = Math.round((diffMs / 3600000) * 100) / 100; // 2 decimal places

            await prisma.attendanceRecord.update({
                where: { id: ownOpenRecord.id },
                data: {
                    checkOut: checkOutTime,
                    hoursWorked,
                },
            });

            return NextResponse.json({
                action: "checkout",
                guard: { name: guard.name, role: guard.role },
                checkOut: checkOutTime.toISOString(),
                hoursWorked,
                message: `${guard.name} checked out. Worked ${hoursWorked}h.`,
            });
        }

        // Check if ANY OTHER guard has an open record → AUTO-REPLACEMENT
        const otherOpenRecord = await prisma.attendanceRecord.findFirst({
            where: {
                checkOut: null,
                guardId: { not: guard.id },
            },
            include: { guard: true },
            orderBy: { checkIn: "desc" },
        });

        let previousGuard = null;

        if (otherOpenRecord) {
            // Auto-close the previous guard's record
            const checkOutTime = now;
            const diffMs = checkOutTime.getTime() - otherOpenRecord.checkIn.getTime();
            const hoursWorked = Math.round((diffMs / 3600000) * 100) / 100;

            await prisma.attendanceRecord.update({
                where: { id: otherOpenRecord.id },
                data: {
                    checkOut: checkOutTime,
                    hoursWorked,
                    autoClosedBy: guard.id,
                },
            });

            previousGuard = {
                name: otherOpenRecord.guard.name,
                role: otherOpenRecord.guard.role,
                hoursWorked,
            };
        }

        // ── Check in the new guard ──
        // Determine if late: compare current time with shift start
        const [shiftHour, shiftMin] = guard.shiftStart.split(":").map(Number);
        // Use WITA timezone (UTC+8) for late detection
        const witaTime = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
        const [currentHour, currentMin] = witaTime.split(":").map(Number);
        const isLate =
            currentHour > shiftHour ||
            (currentHour === shiftHour && currentMin > shiftMin);

        await prisma.attendanceRecord.create({
            data: {
                guardId: guard.id,
                date: today,
                checkIn: now,
                status: isLate ? "late" : "present",
            },
        });

        const action = previousGuard ? "replacement" : "checkin";

        return NextResponse.json({
            action,
            guard: { name: guard.name, role: guard.role },
            checkIn: now.toISOString(),
            status: isLate ? "late" : "present",
            previousGuard,
            message: previousGuard
                ? `${previousGuard.name} auto-checked out. ${guard.name} checked in.`
                : `${guard.name} checked in.`,
        });
    } catch (error: any) {
        console.error("[Attendance Scan] Error:", error);
        require("fs").writeFileSync("/tmp/api_error.log", error.stack || String(error));
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
