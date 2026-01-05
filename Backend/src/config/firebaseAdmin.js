import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Optional: only needed for local development
// On Render, env vars are already injected
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT environment variable is not set"
  );
}

let serviceAccount;

try {
  // First, try to parse as JSON string
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  // If parsing fails, try to read as file path
  try {
    const filePath = resolve(__dirname, "..", "..", process.env.FIREBASE_SERVICE_ACCOUNT);
    const fileContent = readFileSync(filePath, "utf8");
    serviceAccount = JSON.parse(fileContent);
  } catch (fileError) {
    throw new Error(
      `Failed to load Firebase service account. Error: ${error.message}. ` +
      `Make sure FIREBASE_SERVICE_ACCOUNT is either a valid JSON string or a path to a JSON file.`
    );
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
