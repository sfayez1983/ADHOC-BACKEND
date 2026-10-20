/**
 * Checks the Google Drive connection using config/.env
 *
 *   npm run drive:test
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../config/.env"), quiet: true });

const { getDriveClient, getDriveRootFolderId } = await import("../config/driveAPI.config.js");

try {
  const drive = getDriveClient();
  const folderId = getDriveRootFolderId();

  const { data: about } = await drive.about.get({ fields: "user(emailAddress)" });
  console.log(`✅ Signed in as: ${about.user.emailAddress}`);

  const { data: folder } = await drive.files.get({
    fileId: folderId,
    fields: "name, mimeType, capabilities(canAddChildren)",
    supportsAllDrives: true,
  });
  if (folder.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error(`"${folder.name}" is not a folder`);
  }
  console.log(`✅ Root folder: "${folder.name}" (${folderId})`);
  console.log(
    folder.capabilities?.canAddChildren === false
      ? "❌ This account cannot add files to that folder"
      : "✅ Can upload to this folder"
  );
  console.log("\nGoogle Drive is ready. Start the upload with:");
  console.log("  POST http://localhost:3001/api/checkData/attachment/drive?layer=september");
} catch (err) {
  const reason = err?.response?.data?.error;
  if (reason === "invalid_grant") {
    console.error("❌ Refresh token is expired or revoked. Run: npm run drive:token");
  } else if (reason === "invalid_client") {
    console.error("❌ Client ID or secret is wrong in config/.env");
  } else if (err?.response?.status === 404) {
    console.error("❌ Root folder not found. Check GOOGLE_DRIVE_ROOT_FOLDER_ID and that this Google account can open it.");
  } else {
    console.error("❌", err?.response?.data?.error?.message || err.message);
  }
  process.exit(1);
}
