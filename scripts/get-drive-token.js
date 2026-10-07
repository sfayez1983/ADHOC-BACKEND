/**
 * One-time setup: gets a Google Drive refresh token and saves it to config/.env
 *
 *   npm run drive:token
 *
 * Uses GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET from config/.env
 * (OAuth client of type "Desktop app"). Desktop clients accept any
 * http://localhost:<port> redirect, so GOOGLE_DRIVE_REDIRECT_URIS is not used here.
 */
import dotenv from "dotenv";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, "../config/.env");

dotenv.config({ path: ENV_PATH, quiet: true });

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
const PORT = Number(process.env.GOOGLE_DRIVE_TOKEN_PORT) || 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET is missing in config/.env");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline", // needed to get a refresh token
  prompt: "consent", // always return a refresh token, even if approved before
  scope: ["https://www.googleapis.com/auth/drive"],
});

// Replace or add KEY=value in .env, keeping the file's line endings
const saveToEnv = (key, value) => {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    if (content && !content.endsWith(eol)) content += eol;
    content += line + eol;
  }
  fs.writeFileSync(ENV_PATH, content, "utf8");
};

const server = http.createServer(async (req, res) => {
  const params = new URL(req.url, REDIRECT_URI).searchParams;
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    res.end(`Google returned an error: ${error}. You can close this tab.`);
    console.error(`❌ Google returned: ${error}`);
    server.close();
    process.exitCode = 1;
    return;
  }
  if (!code) {
    res.statusCode = 404;
    return res.end();
  }

  try {
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      res.end("No refresh token returned. See the terminal.");
      console.error(
        "❌ Google did not return a refresh token.\n" +
          "   Go to https://myaccount.google.com/permissions, remove access for this app, then run this script again."
      );
      process.exitCode = 1;
    } else {
      saveToEnv("GOOGLE_DRIVE_REFRESH_TOKEN", tokens.refresh_token);
      res.end("Done. The refresh token was saved to config/.env. You can close this tab.");
      console.log("✅ Refresh token saved to config/.env as GOOGLE_DRIVE_REFRESH_TOKEN");
      console.log("   Restart the backend so it picks up the new value.");
    }
  } catch (err) {
    res.end("Failed to get the token. See the terminal.");
    console.error("❌ Token exchange failed:", err?.response?.data || err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is busy. Set GOOGLE_DRIVE_TOKEN_PORT to another port in config/.env and try again.`
    );
  } else {
    console.error("❌", err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log("\n1) Open this URL in your browser:\n");
  console.log(authUrl);
  console.log(
    "\n2) Sign in with the Google account that should own the photos (same organization), then click Allow.\n"
  );
  console.log(`Waiting for Google on ${REDIRECT_URI} ...`);
});
