import { NextResponse } from "next/server";
import {
    fetchFeedData,
    fetchLatestFeedValue,
    isAdafruitConfigured,
} from "@/lib/adafruit";

// Guard profiles — must match config.h on the ESP32
const GUARD_PROFILES = [
    {
        id: 1,
        name: "Putu Darma",
        role: "Security 1",
        shift: "Day (06:00–18:00)",
    },
    {
        id: 2,
        name: "Wayan Sudira",
        role: "Security 2",
        shift: "Night (18:00–06:00)",
    },
    {
        id: 3,
        name: "Kadek Arta",
        role: "Security 3",
        shift: "Day (06:00–18:00)",
    },
];

export async function GET() {
    const configured = isAdafruitConfigured();

    // Fetch from Adafruit IO feeds
    const [attendanceLogs, guardStatusData, heartbeatData] = await Promise.all([
        configured ? fetchFeedData("attendance-log", 100) : Promise.resolve([]),
        configured ? fetchLatestFeedValue("guard-status") : Promise.resolve(null),
        configured
            ? fetchLatestFeedValue("device-heartbeat")
            : Promise.resolve(null),
    ]);

    // ── Build today's log ───────────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Group attendance logs by guard and date
    type LogEntry = Record<string, unknown>;

    // Build attendance records from feed data
    const todayLogs: {
        id: number;
        name: string;
        role: string;
        checkIn: string | null;
        checkOut: string | null;
        status: "present" | "late" | "absent";
    }[] = [];

    const fullLogs: {
        id: number;
        name: string;
        role: string;
        date: string;
        checkIn: string | null;
        checkOut: string | null;
        status: "present" | "late" | "absent";
    }[] = [];

    if (attendanceLogs.length > 0) {
        // Group by guard+date for full log reconstruction
        const logsByGuardDate = new Map<
            string,
            { checkIn: string | null; checkOut: string | null; status: string }
        >();

        for (const log of attendanceLogs as LogEntry[]) {
            const key = `${log.id}-${log.date}`;
            const existing = logsByGuardDate.get(key);

            if (!existing) {
                logsByGuardDate.set(key, {
                    checkIn: log.type === "checkin" ? (log.time as string) : null,
                    checkOut: log.type === "checkout" ? (log.time as string) : null,
                    status: log.status as string,
                });
            } else {
                if (log.type === "checkin") existing.checkIn = log.time as string;
                if (log.type === "checkout") existing.checkOut = log.time as string;
                if (log.status) existing.status = log.status as string;
            }
        }

        // Convert to full log array
        for (const [key, record] of logsByGuardDate) {
            const [idStr, date] = key.split("-", 2);
            const guardId = parseInt(idStr);
            // Reconstruct the full date from key (after first dash)
            const fullDate = key.substring(idStr.length + 1);
            const guard = GUARD_PROFILES.find((g) => g.id === guardId);

            const entry = {
                id: guardId,
                name: guard?.name || `Guard ${guardId}`,
                role: guard?.role || "Unknown",
                date: fullDate,
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                status: (record.status as "present" | "late" | "absent") || "present",
            };

            fullLogs.push(entry);

            // Also add to today's log if it's today
            if (fullDate === today) {
                todayLogs.push(entry);
            }
        }

        // Add absent guards for today (those not in today's logs)
        for (const guard of GUARD_PROFILES) {
            if (!todayLogs.find((l) => l.id === guard.id)) {
                todayLogs.push({
                    id: guard.id,
                    name: guard.name,
                    role: guard.role,
                    checkIn: null,
                    checkOut: null,
                    status: "absent",
                });
            }
        }
    } else {
        // No data from AIO — show all guards as absent
        for (const guard of GUARD_PROFILES) {
            todayLogs.push({
                id: guard.id,
                name: guard.name,
                role: guard.role,
                checkIn: null,
                checkOut: null,
                status: "absent",
            });
        }
    }

    // Sort full logs by date descending
    fullLogs.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // ── Build security staff status ─────────────────────────────────────────
    const securityStaff = GUARD_PROFILES.map((guard) => {
        const todayRecord = todayLogs.find((l) => l.id === guard.id);
        const isWorking =
            todayRecord?.checkIn !== null && todayRecord?.checkOut === null;
        return {
            id: guard.id,
            name: guard.name,
            role: guard.role,
            shift: guard.shift,
            isWorking,
            checkIn: todayRecord?.checkIn || null,
            checkOut: todayRecord?.checkOut || null,
        };
    });

    // ── Build device status ─────────────────────────────────────────────────
    const deviceOnline =
        heartbeatData !== null &&
        heartbeatData._createdAt &&
        Date.now() - new Date(heartbeatData._createdAt as string).getTime() <
        10 * 60 * 1000; // Online if heartbeat within 10 min

    const device = {
        online: deviceOnline,
        lastPing: heartbeatData?._createdAt || null,
        firmware: (heartbeatData?.fw as string) || null,
        rssi: (heartbeatData?.rssi as number) || null,
        uptime: (heartbeatData?.uptime as number) || null,
    };

    // ── Summary stats ───────────────────────────────────────────────────────
    const presentCount = securityStaff.filter((s) => s.isWorking).length;
    const absentCount = securityStaff.filter((s) => !s.isWorking).length;

    return NextResponse.json({
        configured,
        securityStaff,
        todayLog: todayLogs,
        fullLog: fullLogs,
        guardProfiles: GUARD_PROFILES,
        device,
        summary: {
            present: presentCount,
            absent: absentCount,
            total: GUARD_PROFILES.length,
        },
    });
}
