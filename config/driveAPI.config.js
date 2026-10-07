import { google } from "googleapis";

export const driveAPIConfig = () => {
  return {
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
    auth_uri: process.env.GOOGLE_DRIVE_AUTH_URI,
    token_uri: process.env.GOOGLE_DRIVE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_DRIVE_AUTH_PROVIDER_X509_CERT_URL,
    client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirect_uris: process.env.GOOGLE_DRIVE_REDIRECT_URIS,
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  };
};

// Error with an HTTP status, understood by globalErrorHandling
export class DriveConfigError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "DriveConfigError";
    this.statusCode = statusCode;
  }
}

/**
 * Builds an authenticated Google Drive client from config/.env.
 * Throws a clear error if any required value is missing.
 */
export const getDriveClient = () => {
  const cfg = driveAPIConfig();

  const missing = [
    ["GOOGLE_DRIVE_CLIENT_ID", cfg.client_id],
    ["GOOGLE_DRIVE_CLIENT_SECRET", cfg.client_secret],
    ["GOOGLE_DRIVE_REFRESH_TOKEN", cfg.refresh_token],
  ]
    .filter(([, value]) => !value || !String(value).trim())
    .map(([key]) => key);

  if (missing.length) {
    throw new DriveConfigError(
      `Google Drive is not configured. Missing in config/.env: ${missing.join(", ")}. ` +
        `Run "npm run drive:token" to get the refresh token.`
    );
  }

  const auth = new google.auth.OAuth2(cfg.client_id.trim(), cfg.client_secret.trim());
  auth.setCredentials({ refresh_token: cfg.refresh_token.trim() });

  return google.drive({ version: "v3", auth });
};

/** Root Drive folder for uploads (from .env, can be overridden per request). */
// Accepts a plain ID or a full link like
// https://drive.google.com/drive/folders/<ID>?usp=sharing
const extractFolderId = (value) => {
  const v = String(value || "").trim().replace(/^["']|["']$/g, "");
  const fromUrl = v.match(/\/folders\/([A-Za-z0-9_-]+)/) || v.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return fromUrl ? fromUrl[1] : v;
};

export const getDriveRootFolderId = (override) => {
  const id = extractFolderId(override || driveAPIConfig().root_folder_id);
  if (!id) {
    throw new DriveConfigError(
      "GOOGLE_DRIVE_ROOT_FOLDER_ID is missing in config/.env (the folder ID from the Drive URL).",
      400
    );
  }
  return id;
};
