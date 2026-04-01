import nodemailer from "nodemailer";
import path from "path";

// Create a fresh transporter for each batch — avoids the "closed pool" crash
function createTransporter() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
        pool: true,          // Enable connection pooling
        maxConnections: 1,   // Single connection to avoid rate limits
        maxMessages: 50,     // Max messages per connection
        rateDelta: 2000,     // Minimum time between messages (2 seconds)
        rateLimit: 1,        // Max 1 message per rateDelta
    });
}

let transporter = createTransporter();

export async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await transporter.sendMail({
            from: `"Edenia Private Villas" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments: [
                {
                    filename: "signature.png",
                    path: path.join(process.cwd(), "public", "uploads", "signature.png"),
                    cid: "signature", // Referenced in HTML as <img src="cid:signature">
                },
            ],
        });
        return { success: true };
    } catch (error: any) {
        console.error("Email send error:", error);
        return { success: false, error: error.message };
    }
}

// Close the transporter pool and recreate it for next batch
export async function closeEmailPool(): Promise<void> {
    transporter.close();
    transporter = createTransporter(); // Recreate so next request works
}
