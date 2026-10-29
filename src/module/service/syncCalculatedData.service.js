import fs from "fs";
import path from "path";
import { USER_COMPANY } from "../../common/constant/user.constant.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";
import globalExpressions from "../../common/calc/Global_Expressions_1.js";
import { arcgisGet, arcgisPost } from "../../utils/arcgis/arcgisGet.js";
import { DATA_DIR } from "../../utils/dataDir.js";
import { isSameValue } from "./checkData.service.js";
import { queryFeaturesService } from "./map.service.js";

const EDIT_DATE_FIELD = "last_edited_date";
const BATCH = 500;
const RETRY_ROUNDS = 3;
const OVERLAP_MS = 5 * 60 * 1000; // re-read the last 5 minutes so edits made during a run are not missed
const STATE_DIR = path.join(DATA_DIR, "sync-state");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const running = new Set();

// ---- last successful run, kept per layer ----
const stateFile = (project, layer) => path.join(STATE_DIR, `${project}_${layer}.json`);
const readState = (project, layer) => {
    try { return JSON.parse(fs.readFileSync(stateFile(project, layer), "utf8")); } catch { return {}; }
};
const writeState = (project, layer, state) => {
    try {
        fs.mkdirSync(STATE_DIR, { recursive: true });
        fs.writeFileSync(stateFile(project, layer), JSON.stringify(state, null, 2));
    } catch (err) {
        console.warn(`[calc-sync] could not save state: ${err.message}`);
    }
};

const sqlTimestamp = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " "); // ArcGIS Online dates are UTC

const getLayerInfo = async (url, token) => {
    const { data } = await arcgisGet(url, { f: "json", token });
    if (data?.error) throw new Error(`ArcGIS layer info: ${data.error.message || data.error.code}`);
    return data;
};

// send one batch ({ oid, attributes }[]); returns the objectIds that failed with their error
const applyBatch = async (url, token, batch) => {
    const updates = batch.map((u) => ({ attributes: u.attributes }));
    const { data } = await arcgisPost(`${url}/applyEdits`, { f: "json", token, updates, rollbackOnFailure: false });
    if (data?.error) throw new Error(`ArcGIS applyEdits: ${data.error.message || data.error.code}`);
    const failed = [];
    (data.updateResults || []).forEach((r, i) => {
        if (!r.success) failed.push({ objectId: batch[i].oid, error: r.error?.description || "update failed" });
    });
    return failed;
};

/**
 * Recalculates the fields of every outlet changed since the last run (or all outlets when
 * full=true / no previous run) and writes the values that differ back to the feature layer.
 * A calculated value is written only to a layer field with the same name (case-insensitive)
 * that is editable. Failed rows are retried before being reported.
 * dryRun=true only reports what would change.
 */
export const syncCalculatedData = async ({ layer, project = USER_COMPANY.REDBULL, full = false, dryRun = false }) => {
    const key = `${project}/${layer}`;
    if (running.has(key)) return { layer, skipped: true, message: `A sync for ${key} is already running` };
    running.add(key);

    try {
        const { url, token } = await getLayersConfig(layer, project);
        if (!url) throw new Error(`ArcGIS URL is missing for ${key}`);

        const info = await getLayerInfo(url, token);
        const oidField = info.objectIdField || "OBJECTID";
        const layerFields = new Map(); // lower-case name -> real name, editable fields only
        for (const f of info.fields || []) {
            if (f.type === "esriFieldTypeOID" || f.type === "esriFieldTypeGlobalID" || f.editable === false) continue;
            layerFields.set(f.name.toLowerCase(), f.name);
        }
        const editDate = (info.fields || []).find((f) => f.name.toLowerCase() === EDIT_DATE_FIELD);

        const startedAt = Date.now();
        const state = readState(project, layer);
        const incremental = !full && Boolean(state.lastRunStartedAt) && Boolean(editDate);
        const since = incremental ? state.lastRunStartedAt - OVERLAP_MS : null;
        const where = incremental ? `${editDate.name} > TIMESTAMP '${sqlTimestamp(since)}'` : "1=1";

        const data = await queryFeaturesService([layer], project, { where, returnGeometry: "false" });
        const features = data[layer]?.features || [];

        // 1) calculate and keep only the values that differ from the layer
        const updates = [];
        let unchanged = 0;
        for (const feature of features) {
            const outlet = feature.attributes || {};
            const calculated = globalExpressions(outlet);
            const attributes = {};
            for (const [name, value] of Object.entries(calculated)) {
                const real = layerFields.get(name.toLowerCase());
                if (!real || value === undefined) continue;
                if (!isSameValue(outlet[real], value)) attributes[real] = value;
            }
            if (!Object.keys(attributes).length) { unchanged++; continue; }
            updates.push({ oid: outlet[oidField], attributes: { ...attributes, [oidField]: outlet[oidField] } });
        }

        const result = {
            layer, mode: incremental ? "incremental" : "full", since: since ? new Date(since).toISOString() : null,
            checked: features.length, toUpdate: updates.length, unchanged, updated: 0, failed: [], retriedRounds: 0,
        };
        if (dryRun) {
            result.dryRun = true;
            result.sample = updates.slice(0, 5).map((u) => u.attributes);
            return result;
        }

        // 2) write in batches; rows that fail are retried, then reported
        let pending = updates;
        for (let round = 0; pending.length; round++) {
            if (round > 0) {
                result.retriedRounds = round;
                await sleep(Math.min(5000 * 3 ** (round - 1), 60000));
            }
            const failedIds = new Map();
            for (let i = 0; i < pending.length; i += BATCH) {
                const batch = pending.slice(i, i + BATCH);
                let failed;
                try {
                    failed = await applyBatch(url, token, batch);
                } catch (err) {
                    failed = batch.map((u) => ({ objectId: u.oid, error: err.message }));
                }
                result.updated += batch.length - failed.length;
                failed.forEach((f) => failedIds.set(f.objectId, f.error));
            }
            pending = pending.filter((u) => failedIds.has(u.oid));
            result.failed = pending.map((u) => ({ objectId: u.oid, error: failedIds.get(u.oid) }));
            if (round >= RETRY_ROUNDS) break;
        }

        // move the "since" mark forward only when everything was written, so failed rows are tried again next run
        if (!result.failed.length) writeState(project, layer, { lastRunStartedAt: startedAt, lastResult: { ...result, ranAt: new Date().toISOString() } });
        result.success = result.failed.length === 0;
        return result;
    } finally {
        running.delete(key);
    }
};
