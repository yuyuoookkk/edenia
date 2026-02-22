import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Login — Villa Edenia",
};

export default function AdminLoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
