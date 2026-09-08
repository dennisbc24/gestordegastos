import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (type && ["income", "expense"].includes(type)) (where as Record<string, string>).type = type;
    if (categoryId) (where as Record<string, string>).categoryId = categoryId;
    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      (where as Record<string, unknown>).date = { gte: start, lt: end };
    }
    if (search) {
      (where as Record<string, unknown>).OR = [
        { description: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
      ];
    }

    const txs = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const mapped = txs.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      categoryId: t.categoryId,
      description: t.description,
      note: t.note,
      date: t.date.toISOString().slice(0, 10),
      category: t.category,
      createdAt: t.createdAt,
    }));
    return NextResponse.json(mapped);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener transacciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, amount, categoryId, description, date, note } = body;
    if (!type || !["income", "expense"].includes(type)) return NextResponse.json({ error: "type inválido" }, { status: 400 });
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return NextResponse.json({ error: "amount inválido" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "categoryId requerido" }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: "description requerida" }, { status: 400 });
    const parsedDate = date ? new Date(date) : new Date();
    if (isNaN(parsedDate.getTime())) return NextResponse.json({ error: "date inválida" }, { status: 400 });

    // validar categoría existe y coincide tipo
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    if (cat.type !== type) return NextResponse.json({ error: `Categoría ${cat.name} es de tipo ${cat.type}` }, { status: 400 });

    const tx = await prisma.transaction.create({
      data: {
        type,
        amount: numAmount,
        categoryId,
        description: description.trim(),
        note: note?.trim() || null,
        date: parsedDate,
      },
      include: { category: true },
    });
    return NextResponse.json(
      {
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        categoryId: tx.categoryId,
        description: tx.description,
        note: tx.note,
        date: tx.date.toISOString().slice(0, 10),
        category: tx.category,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/transactions error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Error al crear transacción", detail: msg }, { status: 500 });
  }
}
