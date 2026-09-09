import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: { categoryId: "asc" } });
    const mapped = budgets.map((b) => ({ id: b.id, categoryId: b.categoryId, limit: Number(b.limit) }));
    return NextResponse.json(mapped);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.budgets && typeof body.budgets === "object" && !Array.isArray(body.budgets)) {
      const ops = await Promise.all(
        Object.entries(body.budgets).map(([categoryId, limit]) =>
          prisma.budget.upsert({
            where: { userId_categoryId: { userId, categoryId } },
            update: { limit: Number(limit) || 0 },
            create: { userId, categoryId, limit: Number(limit) || 0 },
          })
        )
      );
      return NextResponse.json(ops.map((b) => ({ categoryId: b.categoryId, limit: Number(b.limit) })));
    }
    if (Array.isArray(body.budgets)) {
      const ops = await Promise.all(
        body.budgets.map((b: { categoryId: string; limit: number }) =>
          prisma.budget.upsert({
            where: { userId_categoryId: { userId, categoryId: b.categoryId } },
            update: { limit: Number(b.limit) || 0 },
            create: { userId, categoryId: b.categoryId, limit: Number(b.limit) || 0 },
          })
        )
      );
      return NextResponse.json(ops.map((b) => ({ categoryId: b.categoryId, limit: Number(b.limit) })));
    }
    const { categoryId, limit } = body;
    if (!categoryId) return NextResponse.json({ error: "categoryId requerido" }, { status: 400 });
    const num = Number(limit);
    if (num < 0) return NextResponse.json({ error: "limit inválido" }, { status: 400 });
    const b = await prisma.budget.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      update: { limit: num },
      create: { userId, categoryId, limit: num },
    });
    return NextResponse.json({ categoryId: b.categoryId, limit: Number(b.limit) });
  } catch (e) {
    console.error("POST /api/budgets error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Error al guardar presupuesto", detail: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    if (categoryId) {
      await prisma.budget.delete({ where: { userId_categoryId: { userId, categoryId } } }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    await prisma.budget.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
