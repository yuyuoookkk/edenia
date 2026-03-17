import nodemailer from "nodemailer";
import path from "path";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

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
