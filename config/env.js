import { config } from 'dotenv';
import fs from 'fs';

// 1. Load base .env first (works for local dev without suffix files)
config();

// 2. Then try to load environment-specific override file if it exists
const nodeEnv = process.env.NODE_ENV || 'development';
const specificEnvFile = `.env.${nodeEnv}.local`;
if (fs.existsSync(specificEnvFile)) {
  config({ path: specificEnvFile, override: true });
}

// Export selected variables
export const {
  PORT, NODE_ENV, SERVER_URL,
  DB_URI,
  JWT_SECRET, JWT_EXPIRES_IN,
  ARCJET_ENV, ARCJET_KEY,
  QSTASH_TOKEN, QSTASH_URL,
  EMAIL_PASSWORD,
} = process.env;

// Basic required variable sanity check (add more as needed)
const required = { DB_URI, QSTASH_TOKEN, JWT_SECRET };
for (const [key, value] of Object.entries(required)) {
  if (!value) {
    console.warn(`Environment variable ${key} is not set. Application may not function correctly.`);
  }
}