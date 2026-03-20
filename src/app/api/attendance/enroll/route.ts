import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Fingerprint Enrollment API
 * 
 * Flow:
 * 1. Admin POST → creates pending enrollment request
 * 2. ESP32 GET  → picks up pending request
 * 3. ESP32 PATCH → reports enrollment result (success/fail)
 * 
 * Uses in-memory state for the pending enrollment queue.
 */

// In-memory enrollment state
let enrollmentRequest: {
    status: "idle" | "pending" | "in_progress" | "success" | "failed";
    fingerprintId: number | null;
    guardName: string | null;
    guardRole: string | null;
    message: string | null;
    requestedAt: string | null;
    completedAt: string | null;
} = {
    status: "idle",
    fingerprintId: null,
    guardName: null,
    guardRole: null,
    message: null,
    requestedAt: null,
    completedAt: null,
};

/**
 * POST /api/attendance/enroll
 * 
 * Called by admin panel to start a new fingerprint enrollment.
 * Body: { fingerprintId: number, name: string, role: string, shift: string, shiftStart: string }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fingerprintId, name, role, shift, shiftStart } = body;

        if (!fingerprintId || !name || !role) {
            return NextResponse.json(
                { error: "Missing required fields: fingerprintId, name, role" },
                { status: 400 }
            );
        }

        if (fingerprintId < 1 || fingerprintId > 127) {
            return NextResponse.json(
                { error: "fingerprintId must be between 1 and 127" },
                { status: 400 }
            );
        }

        // Check if this fingerprint ID is already registered
        const existing = await prisma.securityGuard.findUnique({
            where: { fingerprintId },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Fingerprint slot ${fingerprintId} is already assigned to ${existing.name}` },
                { status: 409 }
            );
        }

        // Check if there's already a pending enrollment
        if (enrollmentRequest.status === "pending" || enrollmentRequest.status === "in_progress") {
            return NextResponse.json(
                { error: "Another enrollment is already in progress", current: enrollmentRequest },
                { status: 409 }
            );
        }

        // Queue the enrollment request
        enrollmentRequest = {
            status: "pending",
            fingerprintId,
            guardName: name,
            guardRole: role,
            message: `Waiting for ${name} to scan finger on the device...`,
            requestedAt: new Date().toISOString(),
            completedAt: null,
        };

        // Pre-create the guard record (inactive until enrollment succeeds)
        await prisma.securityGuard.create({
            data: {
                fingerprintId,
                name,
                role,
                shift: shift || "Day",
                shiftStart: shiftStart || "06:00",
                isActive: false, // Will be activated after successful enrollment
            },
        });

        console.log(`[Enroll] Queued enrollment: ${name} → FP slot ${fingerprintId}`);

        return NextResponse.json({
            ok: true,
            message: `Enrollment queued for ${name}. Ask them to place their finger on the sensor.`,
            enrollment: enrollmentRequest,
        });
    } catch (error: any) {
        console.error("[Enroll] Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/attendance/enroll
 * 
 * Polled by ESP32 to check for pending enrollment requests.
 * Returns the current enrollment state.
 */
export async function GET() {
    // Auto-expire pending requests older than 5 minutes
    if (
        enrollmentRequest.status === "pending" &&
        enrollmentRequest.requestedAt
    ) {
        const elapsed = Date.now() - new Date(enrollmentRequest.requestedAt).getTime();
        if (elapsed > 5 * 60 * 1000) {
            // Clean up the inactive guard record
            if (enrollmentRequest.fingerprintId) {
                try {
                    await prisma.securityGuard.delete({
                        where: { fingerprintId: enrollmentRequest.fingerprintId },
                    });
                } catch { /* ignore if already deleted */ }
            }

            enrollmentRequest = {
                status: "idle",
                fingerprintId: null,
                guardName: null,
                guardRole: null,
                message: "Enrollment request expired",
                requestedAt: null,
                completedAt: null,
            };
        }
    }

    return NextResponse.json(enrollmentRequest);
}

/**
 * PATCH /api/attendance/enroll
 * 
 * Called by ESP32 to report enrollment result.
 * Body: { fingerprintId: number, success: boolean, message?: string }
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { fingerprintId, success, message } = body;

        if (enrollmentRequest.fingerprintId !== fingerprintId) {
            return NextResponse.json(
                { error: "No matching enrollment request" },
                { status: 404 }
            );
        }

        if (success) {
            // Activate the guard in the database
            await prisma.securityGuard.update({
                where: { fingerprintId },
                data: { isActive: true },
            });

            enrollmentRequest = {
                ...enrollmentRequest,
                status: "success",
                message: message || `${enrollmentRequest.guardName} enrolled successfully!`,
                completedAt: new Date().toISOString(),
            };

            console.log(`[Enroll] SUCCESS: ${enrollmentRequest.guardName} → FP slot ${fingerprintId}`);
        } else {
            // Delete the inactive guard record on failure
            try {
                await prisma.securityGuard.delete({
                    where: { fingerprintId },
                });
            } catch { /* ignore */ }

            enrollmentRequest = {
                ...enrollmentRequest,
                status: "failed",
                message: message || "Enrollment failed. Please try again.",
                completedAt: new Date().toISOString(),
            };

            console.log(`[Enroll] FAILED: ${enrollmentRequest.guardName} → ${message}`);
        }

        return NextResponse.json({ ok: true, enrollment: enrollmentRequest });
    } catch (error: any) {
        console.error("[Enroll] PATCH error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/attendance/enroll
 * 
 * Cancel a pending enrollment request.
 */
export async function DELETE() {
    if (enrollmentRequest.fingerprintId && enrollmentRequest.status === "pending") {
        try {
            await prisma.securityGuard.delete({
                where: { fingerprintId: enrollmentRequest.fingerprintId },
            });
        } catch { /* ignore */ }
    }

    enrollmentRequest = {
        status: "idle",
        fingerprintId: null,
        guardName: null,
        guardRole: null,
        message: null,
        requestedAt: null,
        completedAt: null,
    };

    return NextResponse.json({ ok: true, message: "Enrollment cancelled" });
}
