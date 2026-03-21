2   import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow these paths without auth
    const publicPaths = ["/login", "/admin", "/api"];
    if (publicPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
        return NextResponse.next();
    }

    // Check for the owner session cookie
    const ownerSession = request.cookies.get("owner_session");
    if (!ownerSession) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Log the visit asynchronously (fire and forget)
    // We do this by triggering a fetch request to our own API
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";
    
    // Fire and forget
    fetch(new URL("/api/audit/log", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            page: pathname,
            ipAddress,
            userAgent,
            sessionToken: ownerSession.value
        })
    }).catch(err => {
        console.error("Failed to trigger audit log:", err);
    });

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
