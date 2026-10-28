import nodemailer from "nodemailer";

// Sends from the ADHOC mailbox (ADHOC_EMAIL / ADHOCK_PASSWORD).
// Gmail needs an "App password" here, not the normal account password.
// MAIL_HOST / MAIL_PORT are optional (default smtp.gmail.com:465).
export const sendMail = async ({ to, subject, text, html }) => {
    const user = process.env.ADHOC_EMAIL
    const pass = process.env.ADHOCK_PASSWORD
    if (!user || !pass) throw new Error("ADHOC_EMAIL and ADHOCK_PASSWORD must be set in the environment")

    const port = Number(process.env.MAIL_PORT) || 465
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp.gmail.com",
        port,
        secure: port === 465,
        auth: { user, pass },
    })
    return transporter.sendMail({ from: user, to: to || user, subject, text, html })
}
