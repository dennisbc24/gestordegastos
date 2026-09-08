import { defineConfig, env } from "prisma/config";
import * as fs from "node:fs";
import * as path from "node:path";

// Carga .env manualmente si no está cargado (para Prisma CLI)
function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadDotEnv();

function getDatabaseUrl(): string {
  // Si DATABASE_URL directa existe, úsala
  try {
    const direct = env("DATABASE_URL");
    if (direct) return direct;
  } catch {}
  // Si no, armar desde variables separadas
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5433";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const db = process.env.DB_NAME || "";
  const schema = process.env.DB_SCHEMA || "public";
  if (!user || !db) return "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`;
  return `postgresql://${auth}${host}:${port}/${db}?schema=${schema}`;
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: getDatabaseUrl(),
  },
});
