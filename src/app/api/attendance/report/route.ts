import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/attendance/report?month=2026-03
 * 
 * Returns per-guard daily breakdown + monthly totals for the calendar view.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        // Default to current month
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return handleReport(defaultMonth);
    }

    return handleReport(month);
}

async function handleReport(month: string) {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);

    // Get all days in the month
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const datePrefix = month; // "YYYY-MM"

    // Get all guards
    const guards = await prisma.securityGuard.findMany({
        where: { isActive: true },
        orderBy: { fingerprintId: "asc" },
    });

    // Get all attendance records for the month
    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: {
                startsWith: datePrefix,
            },
        },
        include: { guard: true },
        orderBy: { checkIn: "asc" },
    });

    // Build per-guard daily breakdown
    const guardReports = guards.map((guard) => {
        const guardRecords = records.filter((r) => r.guardId === guard.id);
        const days: Record<string, { hours: number; checkIn: string; checkOut: string | null; status: string }[]> = {};
        let totalHours = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${month}-${String(d).padStart(2, "0")}`;
            days[dateKey] = [];
        }

        for (const record of guardRecords) {
            const dateKey = record.date;
            if (!days[dateKey]) {
                days[dateKey] = [];
            }

            const entry = {
                hours: record.hoursWorked || 0,
                checkIn: record.checkIn.toISOString(),
                checkOut: record.checkOut?.toISOString() || null,
                status: record.status,
            };

            days[dateKey].push(entry);
            totalHours += record.hoursWorked || 0;
        }

        // Compute daily totals
        const dailyHours: Record<string, number> = {};
        for (const [dateKey, entries] of Object.entries(days)) {
            dailyHours[dateKey] = entries.reduce((sum, e) => sum + e.hours, 0);
        }

        return {
            id: guard.id,
            name: guard.name,
            role: guard.role,
            shift: guard.shift,
            fingerprintId: guard.fingerprintId,
            days: dailyHours,
            details: days,
            totalHours: Math.round(totalHours * 100) / 100,
        };
    });

    return NextResponse.json({
        month,
        daysInMonth,
        guards: guardReports,
    });
}
