// Wrapper para Prisma CLI: arma DATABASE_URL desde variables separadas antes de ejecutar prisma
// Uso: node scripts/with-db-url.mjs prisma migrate dev --name init
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const envPath = path.resolve(process.cwd(), ".env");
loadEnv(envPath);

if (!process.env.DATABASE_URL) {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5433";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const db = process.env.DB_NAME || "";
  const schema = process.env.DB_SCHEMA || "public";
  if (user && db) {
    const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`;
    process.env.DATABASE_URL = `postgresql://${auth}${host}:${port}/${db}?schema=${schema}`;
    console.log(`[with-db-url] DATABASE_URL armada -> postgresql://${user}:***@${host}:${port}/${db}?schema=${schema}`);
  } else {
    console.warn("[with-db-url] Faltan DB_USER/DB_NAME, DATABASE_URL no se pudo armar.");
  }
}

const [, , ...args] = process.argv;
if (args.length === 0) {
  console.error("Uso: node scripts/with-db-url.mjs <comando> [args...]");
  process.exit(1);
}

const result = spawnSync(args[0], args.slice(1), { stdio: "inherit", env: process.env, shell: true });
process.exit(result.status ?? 0);
