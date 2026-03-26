import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/attendance
 *
 * Returns attendance data for the dashboard:
 * - securityStaff: current duty status per guard
 * - todayLog: today's attendance records
 * - fullLog: recent attendance history
 * - guardProfiles: all registered guards
 * - device: ESP32 status (fetched from heartbeat endpoint)
 * - summary: present/absent counts
 */
export async function GET() {
    // Get all active guards
    const guards = await prisma.securityGuard.findMany({
        where: { isActive: true },
        orderBy: { fingerprintId: "asc" },
    });

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" }); // YYYY-MM-DD in WITA

    // Time formatting helper — always use Bali/WITA timezone (UTC+8)
    const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Makassar" });

    // Get today's attendance records
    const todayRecords = await prisma.attendanceRecord.findMany({
        where: { date: today },
        include: { guard: true },
        orderBy: { checkIn: "desc" },
    });

    // Get recent full log (last 100 records)
    const recentRecords = await prisma.attendanceRecord.findMany({
        include: { guard: true },
        orderBy: { checkIn: "desc" },
        take: 100,
    });

    // Find the currently active guard (checked in, not checked out)
    const activeRecord = await prisma.attendanceRecord.findFirst({
        where: { checkOut: null },
        include: { guard: true },
        orderBy: { checkIn: "desc" },
    });

    // Build today's log
    const todayLog = todayRecords.map((record) => ({
        id: record.guard.fingerprintId,
        name: record.guard.name,
        role: record.guard.role,
        checkIn: record.checkIn ? formatTime(record.checkIn) : null,
        checkOut: record.checkOut ? formatTime(record.checkOut) : null,
        hoursWorked: record.hoursWorked,
        status: record.status as "present" | "late" | "absent",
        autoClosedBy: record.autoClosedBy,
    }));

    // Add absent guards
    const scannedGuardIds = new Set(todayRecords.map((r) => r.guardId));
    for (const guard of guards) {
        if (!scannedGuardIds.has(guard.id)) {
            todayLog.push({
                id: guard.fingerprintId,
                name: guard.name,
                role: guard.role,
                checkIn: null,
                checkOut: null,
                hoursWorked: null,
                status: "absent",
                autoClosedBy: null,
            });
        }
    }

    // Build full log
    const fullLog = recentRecords.map((record) => ({
        id: record.guard.fingerprintId,
        name: record.guard.name,
        role: record.guard.role,
        date: record.date,
        checkIn: record.checkIn ? formatTime(record.checkIn) : null,
        checkOut: record.checkOut ? formatTime(record.checkOut) : null,
        hoursWorked: record.hoursWorked,
        status: record.status as "present" | "late" | "absent",
    }));

    // Build security staff status
    const securityStaff = guards.map((guard) => {
        const isOnDuty = activeRecord?.guardId === guard.id;
        const todayRecord = todayRecords.find((r) => r.guardId === guard.id);
        return {
            id: guard.fingerprintId,
            name: guard.name,
            role: guard.role,
            shift: guard.shift === "Day" ? "Day (06:00–18:00)" : "Night (18:00–06:00)",
            isWorking: isOnDuty,
            checkIn: todayRecord?.checkIn ? formatTime(todayRecord.checkIn) : null,
            checkOut: todayRecord?.checkOut ? formatTime(todayRecord.checkOut) : null,
        };
    });

    // Fetch device status from heartbeat endpoint (internal fetch)
    let device = { online: false, lastPing: null, firmware: null, rssi: null, uptime: null };
    try {
        // Use internal import instead of HTTP fetch to avoid issues
        const heartbeatModule = await import("./heartbeat/route");
        const heartbeatResponse = await heartbeatModule.GET();
        device = await heartbeatResponse.json();
    } catch {
        // Heartbeat endpoint not available — device status unknown
    }

    const presentCount = securityStaff.filter((s) => s.isWorking).length;
    const absentCount = securityStaff.filter((s) => !s.isWorking).length;

    return NextResponse.json({
        configured: true,
        activeGuard: activeRecord
            ? {
                name: activeRecord.guard.name,
                role: activeRecord.guard.role,
                shift: activeRecord.guard.shift,
                checkIn: activeRecord.checkIn.toISOString(),
                fingerprintId: activeRecord.guard.fingerprintId,
            }
            : null,
        securityStaff,
        todayLog,
        fullLog,
        guardProfiles: guards.map((g) => ({
            id: g.fingerprintId,
            name: g.name,
            role: g.role,
            shift: g.shift === "Day" ? "Day (06:00–18:00)" : "Night (18:00–06:00)",
        })),
        device,
        summary: {
            present: presentCount,
            absent: absentCount,
            total: guards.length,
        },
    });
}

/**
 * DELETE /api/attendance?fingerprintId=X
 *
 * Deletes a guard enrollment and all their attendance records.
 */
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const fpIdStr = searchParams.get("fingerprintId");
    if (!fpIdStr) {
        return NextResponse.json({ error: "Missing fingerprintId" }, { status: 400 });
    }

    const fingerprintId = parseInt(fpIdStr);

    try {
        const guard = await prisma.securityGuard.findUnique({
            where: { fingerprintId },
        });

        if (!guard) {
            return NextResponse.json({ error: "Guard not found" }, { status: 404 });
        }

        // Delete all attendance records for this guard first
        await prisma.attendanceRecord.deleteMany({
            where: { guardId: guard.id },
        });

        // Delete the guard
        await prisma.securityGuard.delete({
            where: { fingerprintId },
        });

        return NextResponse.json({ ok: true, message: `${guard.name} has been removed.` });
    } catch (error: any) {
        console.error("[Attendance] DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete guard" }, { status: 500 });
    }
}
