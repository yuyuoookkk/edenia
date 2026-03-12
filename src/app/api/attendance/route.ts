import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
    fetchLatestFeedValue,
    isAdafruitConfigured,
} from "@/lib/adafruit";

/**
 * GET /api/attendance
 * 
 * Returns:
 * - activeGuard: currently on-duty guard (has open check-in without check-out)
 * - todayLog: today's attendance records
 * - guardProfiles: all registered guards
 * - device: ESP32 heartbeat info from Adafruit IO
 * - summary: present/absent counts
 */
export async function GET() {
    const configured = isAdafruitConfigured();

    // Get all active guards
    const guards = await prisma.securityGuard.findMany({
        where: { isActive: true },
        orderBy: { fingerprintId: "asc" },
    });

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Get today's attendance records
    const todayRecords = await prisma.attendanceRecord.findMany({
        where: { date: today },
        include: { guard: true },
        orderBy: { checkIn: "desc" },
    });

    // Get the currently active guard (open check-in, no check-out)
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
        checkIn: record.checkIn
            ? record.checkIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
            : null,
        checkOut: record.checkOut
            ? record.checkOut.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
            : null,
        hoursWorked: record.hoursWorked,
        status: record.status as "present" | "late" | "absent",
        autoClosedBy: record.autoClosedBy,
    }));

    // Add absent guards (guards who haven't scanned today)
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
            checkIn: todayRecord?.checkIn
                ? todayRecord.checkIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                : null,
            checkOut: todayRecord?.checkOut
                ? todayRecord.checkOut.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                : null,
        };
    });

    // Active guard info
    const activeGuard = activeRecord
        ? {
            name: activeRecord.guard.name,
            role: activeRecord.guard.role,
            shift: activeRecord.guard.shift,
            checkIn: activeRecord.checkIn.toISOString(),
            fingerprintId: activeRecord.guard.fingerprintId,
        }
        : null;

    // Device status from Adafruit IO heartbeat
    const heartbeatData = configured
        ? await fetchLatestFeedValue("device-heartbeat")
        : null;

    const deviceOnline =
        heartbeatData !== null &&
        heartbeatData._createdAt &&
        Date.now() - new Date(heartbeatData._createdAt as string).getTime() <
        10 * 60 * 1000;

    const device = {
        online: deviceOnline,
        lastPing: heartbeatData?._createdAt || null,
        firmware: (heartbeatData?.fw as string) || null,
        rssi: (heartbeatData?.rssi as number) || null,
        uptime: (heartbeatData?.uptime as number) || null,
    };

    // Summary
    const presentCount = securityStaff.filter((s) => s.isWorking).length;
    const absentCount = securityStaff.filter((s) => !s.isWorking).length;

    return NextResponse.json({
        configured,
        activeGuard,
        securityStaff,
        todayLog,
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
