import { NextResponse } from "next/server";
import { getRestartFlag, clearRestartFlag } from "../_restart-state";

/**
 * GET /api/attendance/heartbeat/command
 *
 * Lightweight endpoint polled by the ESP32 every 5 seconds.
 * Returns any pending commands (e.g. restart) and clears the flag.
 * This is intentionally minimal — no logging, no heavy processing.
 */
export async function GET() {
    if (getRestartFlag()) {
        clearRestartFlag();
        return NextResponse.json({ command: "restart" });
    }

    return NextResponse.json({ command: "none" });
}
