// Arma DATABASE_URL desde variables separadas
// Prioridad: si DATABASE_URL ya existe, se usa tal cual.
// Si no, se construye desde DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SCHEMA

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST || "localhost";
  // En prod dentro del EC2, si existe DB_PORT_PROD y NODE_ENV=production, usa ese
  const isProd = process.env.NODE_ENV === "production";
  const port = isProd ? process.env.DB_PORT_PROD || process.env.DB_PORT || "5432" : process.env.DB_PORT || "5433";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const db = process.env.DB_NAME || "";
  const schema = process.env.DB_SCHEMA || "public";

  if (!user || !password || !db) {
    // Mensaje útil en dev si faltan datos
    console.warn("[db-url] Faltan DB_USER / DB_PASSWORD / DB_NAME en .env. Usando placeholder.");
  }

  const auth = user && password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
  const base = `postgresql://${auth}${host}:${port}/${db}?schema=${schema}`;
  return base;
}

export function ensureDatabaseUrl(): string {
  const url = getDatabaseUrl();
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }
  return url;
}
