import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "edenia-default-secret-change-me";

// --- Password hashing using HMAC (no external deps) ---

export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
    const [salt, storedHash] = stored.split(":");
    if (!salt || !storedHash) return false;
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    try {
        return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
    } catch {
        return false;
    }
}

// --- Session token (signed HMAC token stored in cookie) ---

export function createSessionToken(userId: string): string {
    const payload = `${userId}:${Date.now()}`;
    const signature = createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    return `${payload}:${signature}`;
}

export function verifySessionToken(token: string): string | null {
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    const [userId, timestamp, signature] = parts;
    const payload = `${userId}:${timestamp}`;
    const expectedSig = createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    try {
        if (timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
            // Token expires after 7 days
            const age = Date.now() - parseInt(timestamp);
            if (age > 7 * 24 * 60 * 60 * 1000) return null;
            return userId;
        }
    } catch {
        return null;
    }
    return null;
}

// --- Helper to check auth from request cookies ---

export function getAdminUserIdFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (!match) return null;
    return verifySessionToken(decodeURIComponent(match[1]));
}
