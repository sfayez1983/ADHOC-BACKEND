import cron from "node-cron";
import { runCheckData } from "../../module/service/runCheckData.service.js";
import { sendMail } from "../mail/sendMail.js";

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))

export const runWeeklyCheck = async () => {
    const layer = process.env.WEEKLY_CHECK_LAYER || "october"
    // sent from ADHOC_EMAIL; ADHOC_REPORT_TO (comma separated) overrides the default list
    const to = process.env.ADHOC_REPORT_TO || "mohanadahmed266@gmail.com, sfayez@adhoc-eg.com"
    try {
        const result = await runCheckData(layer)
        const subject = result.correct
            ? `Weekly data check: all data in layer ${layer} are correct`
            : `Weekly data check: ${result.count} wrong rows in layer ${layer}`
        const text = result.correct
            ? result.message
            : `${result.count} wrong rows were found in layer ${layer}.\nExcel report: ${result.excelFile.link}`
        const html = result.correct
            ? `<p>${escapeHtml(result.message)}</p>`
            : `<p>${result.count} wrong rows were found in layer <b>${escapeHtml(layer)}</b>.</p><p><a href="${escapeHtml(result.excelFile.link)}">Open the Excel report</a></p>`
        await sendMail({ to, subject, text, html })
        console.log(`[weekly-check] ${layer}: email sent to ${to} (${result.correct ? "all correct" : result.count + " wrong"})`)
    } catch (err) {
        console.error("[weekly-check] failed:", err.message)
        try {
            await sendMail({
                to,
                subject: `Weekly data check FAILED for layer ${layer}`,
                text: `The weekly check could not finish: ${err.message}`,
            })
        } catch (mailErr) {
            console.error("[weekly-check] could not send the failure email:", mailErr.message)
        }
    }
}

// Every Sunday at 08:00 Cairo time (cron: minute hour day-of-month month day-of-week)
export const startWeeklyCheckSchedule = () => {
    if (process.env.WEEKLY_CHECK_ENABLED === "false") return
    cron.schedule("0 8 * * 0", runWeeklyCheck, { timezone: "Africa/Cairo" })
    console.log("[weekly-check] scheduled: every Sunday 08:00 Africa/Cairo")
}
