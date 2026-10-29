import cron from "node-cron";
import { runCheckData } from "../../module/service/runCheckData.service.js";
import { syncCalculatedData } from "../../module/service/syncCalculatedData.service.js";
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

// Recalculates changed outlets and writes the values to the feature layer.
// Hourly = only rows edited since the last run; nightly = every row (safety net).
// Writes to the live layer, so it only starts when CALC_SYNC_ENABLED=true.
export const runCalcSync = async (full) => {
    const layer = process.env.CALC_SYNC_LAYER || process.env.WEEKLY_CHECK_LAYER || "october"
    const to = process.env.ADHOC_REPORT_TO || "mohanadahmed266@gmail.com, sfayez@adhoc-eg.com"
    try {
        const r = await syncCalculatedData({ layer, full })
        if (r.skipped) return console.log(`[calc-sync] ${layer}: previous run still going, skipped`)
        console.log(`[calc-sync] ${layer} (${r.mode}): checked ${r.checked}, updated ${r.updated}, failed ${r.failed.length}`)
        if (r.failed.length) {
            const lines = r.failed.slice(0, 50).map((f) => `OBJECTID ${f.objectId}: ${f.error}`).join("\n")
            await sendMail({
                to,
                subject: `Calculated data sync: ${r.failed.length} rows failed in layer ${layer}`,
                text: `${r.updated} rows updated, ${r.failed.length} still failing after ${r.retriedRounds} retries (first 50):\n${lines}`,
            })
        }
    } catch (err) {
        console.error("[calc-sync] failed:", err.message)
    }
}

export const startCalcSyncSchedule = () => {
    if (process.env.CALC_SYNC_ENABLED !== "true") return
    cron.schedule("0 * * * *", () => runCalcSync(false), { timezone: "Africa/Cairo" })
    cron.schedule("0 3 * * *", () => runCalcSync(true), { timezone: "Africa/Cairo" })
    console.log("[calc-sync] scheduled: every hour (changed rows) + every day 03:00 Africa/Cairo (all rows)")
}
