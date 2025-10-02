import nodemailer from "nodemailer"
import dotenv from "dotenv";
dotenv.config()

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  },
});

// Wrap in an async IIFE so we can use await.
// (async () => {
//   const info = await transporter.sendMail({
//     from: '"Maddison Foo Koch" <maddison53@ethereal.email>',
//     to: "bar@example.com, baz@example.com",
//     subject: "Hello ✔",
//     text: "Hello world?", // plain‑text body
//     html: "<b>Hello world?</b>", // HTML body
//   });

//   console.log("Message sent:", info.messageId);
// })();


export const sendOtpMail = async (to, otp) => {
    try {
        // Allow disabling real email sending in development
        if (process.env.EMAIL_ENABLED === "false") {
            console.log("[DEV] EMAIL_ENABLED=false, skipping real email send.");
            return { messageId: "dev-skip" };
        }
        console.log("Attempting to send email to:", to);
        console.log("Email configuration:", {
            host: "smtp.gmail.com",
            port: 465,
            user: process.env.EMAIL ? "configured" : "not configured"
        });

        if (!process.env.EMAIL || !process.env.PASS) {
            throw new Error("Email credentials not configured. Please check your .env file.");
        }

        const info = await transporter.sendMail({
            from: process.env.EMAIL,
            to,
            subject: "Reset Your Password - Vingo",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f97316;">Password Reset Request</h2>
                    <p>You requested to reset your password for your Vingo account.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #f97316; font-size: 32px; margin: 0;">${otp}</h1>
                        <p style="margin: 10px 0 0 0; color: #6b7280;">Your OTP code</p>
                    </div>
                    <p><strong>This code will expire in 5 minutes.</strong></p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px;">This is an automated message from Vingo.</p>
                </div>
            `
        });
        
        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}