import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Folder for files the app writes while running (upload progress, folder names, webhook logs).
 * Set DATA_DIR to use another folder (a persistent disk keeps the files between deploys).
 * On Vercel the project folder is read-only, only the temp folder can be written
 * (and it is not kept between runs).
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR) // e.g. a Render persistent disk mounted at /var/data
  : process.env.VERCEL
    ? path.join(os.tmpdir(), "adhoc-data")
    : path.resolve(__dirname, "../../data");
