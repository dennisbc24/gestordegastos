import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, icon, color, type } = body;
    if (!name || !type) return NextResponse.json({ error: "name y type requeridos" }, { status: 400 });
    if (!["income", "expense"].includes(type)) return NextResponse.json({ error: "type inválido" }, { status: 400 });
    const cat = await prisma.category.create({ data: { name: name.trim(), icon: icon || "📦", color: color || "#94A3B8", type } });
    return NextResponse.json(cat, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Categoría ya existe" }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
