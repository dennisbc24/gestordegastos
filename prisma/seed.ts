import { PrismaClient, TransactionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "node:fs";
import * as path from "node:path";

function loadEnv() {
  const p = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  const c = fs.readFileSync(p, "utf8");
  for (const line of c.split("\n")) {
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
loadEnv();

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5433";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const db = process.env.DB_NAME || "";
  const schema = process.env.DB_SCHEMA || "public";
  const auth = user && password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
  return `postgresql://${auth}${host}:${port}/${db}?schema=${schema}`;
}

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Alimentos", icon: "🛒", color: "#FF6B6B", type: TransactionType.expense, isDefault: true },
  { name: "Transporte", icon: "🚕", color: "#06BEB6", type: TransactionType.expense, isDefault: true },
  { name: "Vivienda", icon: "🏠", color: "#3B82F6", type: TransactionType.expense, isDefault: true },
  { name: "Ocio", icon: "🎮", color: "#8B5CF6", type: TransactionType.expense, isDefault: true },
  { name: "Salud", icon: "❤️", color: "#EC4899", type: TransactionType.expense, isDefault: true },
  { name: "Compras", icon: "🛍️", color: "#F59E0B", type: TransactionType.expense, isDefault: true },
  { name: "Facturas", icon: "🧾", color: "#FF8E53", type: TransactionType.expense, isDefault: true },
  { name: "Educación", icon: "📚", color: "#10B981", type: TransactionType.expense, isDefault: true },
  { name: "Restaurante", icon: "🍔", color: "#EF4444", type: TransactionType.expense, isDefault: true },
  { name: "Otros", icon: "📦", color: "#94A3B8", type: TransactionType.expense, isDefault: true },
  { name: "Salario", icon: "💼", color: "#22C55E", type: TransactionType.income, isDefault: true },
  { name: "Freelance", icon: "💻", color: "#0EA5E9", type: TransactionType.income, isDefault: true },
  { name: "Inversiones", icon: "📈", color: "#EAB308", type: TransactionType.income, isDefault: true },
  { name: "Regalo", icon: "🎁", color: "#F43F5E", type: TransactionType.income, isDefault: true },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { name_type: { name: c.name, type: c.type } } as never,
      update: {},
      create: c,
    });
  }
  console.log("✓ Categorías seed OK");
  const count = await prisma.category.count();
  console.log(`Total categorías: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
