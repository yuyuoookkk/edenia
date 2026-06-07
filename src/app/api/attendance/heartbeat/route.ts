import { NextResponse } from "next/server";

/**
 * POST /api/attendance/heartbeat
 *
 * Receives periodic heartbeat pings from the ESP32 device.
 * Stores the latest device status in memory (no DB needed).
 *
 * Body: { status: "online", uptime: 3600, rssi: -42, fw: "2.0.0" }
 */

// In-memory device status (resets on server restart)
// In production, you could use Redis or a DB table for persistence
let deviceStatus: {
    online: boolean;
    lastPing: string;
    uptime: number | null;
    rssi: number | null;
    firmware: string | null;
} = {
    online: false,
    lastPing: "",
    uptime: null,
    rssi: null,
    firmware: null,
};

// In-memory restart command flag
let restartPending = false;
let restartRequestedAt: string | null = null;

export async function POST(request: Request) {
    try {
        const body = await request.json();

        deviceStatus = {
            online: true,
            lastPing: new Date().toISOString(),
            uptime: body.uptime ?? null,
            rssi: body.rssi ?? null,
            firmware: body.fw ?? null,
        };

        console.log(
            `[Heartbeat] ESP32 ping — uptime: ${body.uptime}s, rssi: ${body.rssi}dBm, fw: ${body.fw}`
        );

        // If a restart has been requested by admin, tell the ESP32 to restart
        if (restartPending) {
            restartPending = false;
            console.log(`[Heartbeat] Sending restart command to ESP32`);
            return NextResponse.json({ ok: true, command: "restart" });
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Invalid heartbeat data" },
            { status: 400 }
        );
    }
}

/**
 * GET /api/attendance/heartbeat
 *
 * Returns the current device status.
 * Called by the dashboard to show ESP32 online/offline.
 */
export async function GET() {
    // Consider device offline if no heartbeat in last 10 minutes
    if (deviceStatus.lastPing) {
        const lastPingTime = new Date(deviceStatus.lastPing).getTime();
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        if (lastPingTime < tenMinutesAgo) {
            deviceStatus.online = false;
        }
    }

    return NextResponse.json({
        ...deviceStatus,
        restartPending,
        restartRequestedAt,
    });
}

/**
 * PATCH /api/attendance/heartbeat
 *
 * Request a remote restart of the ESP32 device.
 * The next heartbeat response will include the restart command.
 */
export async function PATCH() {
    restartPending = true;
    restartRequestedAt = new Date().toISOString();
    console.log(`[Heartbeat] Restart requested by admin at ${restartRequestedAt}`);
    return NextResponse.json({
        ok: true,
        message: "Restart command queued. Device will restart on next heartbeat.",
    });
}
