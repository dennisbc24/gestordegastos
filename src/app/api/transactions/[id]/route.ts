import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const tx = await prisma.transaction.findFirst({ where: { id, userId }, include: { category: true } });
  if (!tx) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
    categoryId: tx.categoryId,
    description: tx.description,
    note: tx.note,
    date: tx.date.toISOString().slice(0, 10),
    category: tx.category,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const body = await req.json();
    const { type, amount, categoryId, description, date, note } = body;
    const data: Record<string, unknown> = {};
    if (type) {
      if (!["income", "expense"].includes(type)) return NextResponse.json({ error: "type inválido" }, { status: 400 });
      data.type = type;
    }
    if (amount !== undefined) {
      const n = Number(amount);
      if (!n || n <= 0) return NextResponse.json({ error: "amount inválido" }, { status: 400 });
      data.amount = n;
    }
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
      data.categoryId = categoryId;
      if (type && cat.type !== type) return NextResponse.json({ error: "Tipo no coincide con categoría" }, { status: 400 });
    }
    if (description !== undefined) {
      if (!description?.trim()) return NextResponse.json({ error: "description vacía" }, { status: 400 });
      data.description = description.trim();
    }
    if (note !== undefined) data.note = note?.trim() || null;
    if (date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) return NextResponse.json({ error: "date inválida" }, { status: 400 });
      data.date = d;
    }

    const tx = await prisma.transaction.update({ where: { id }, data, include: { category: true } });
    return NextResponse.json({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      description: tx.description,
      note: tx.note,
      date: tx.date.toISOString().slice(0, 10),
      category: tx.category,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
}
