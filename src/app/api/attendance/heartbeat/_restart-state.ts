/**
 * Shared in-memory restart state.
 * 
 * This module holds the restart command flag that is shared between:
 * - PATCH /api/attendance/heartbeat (admin sets restart)
 * - GET /api/attendance/heartbeat/command (ESP32 polls and consumes)
 * - GET /api/attendance/heartbeat (admin UI checks status)
 * 
 * Using a module-level variable ensures all routes in the same
 * serverless instance share the same state.
 */

let restartPending = false;
let restartRequestedAt: string | null = null;

export function getRestartFlag(): boolean {
    return restartPending;
}

export function getRestartRequestedAt(): string | null {
    return restartRequestedAt;
}

export function setRestartFlag(): void {
    restartPending = true;
    restartRequestedAt = new Date().toISOString();
}

export function clearRestartFlag(): void {
    restartPending = false;
    restartRequestedAt = null;
}
