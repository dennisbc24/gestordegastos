import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Contraseña mínimo 6 caracteres" }, { status: 400 });
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashed, name: name?.trim() || null },
    });

    const token = signToken({ userId: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    res.cookies.set("gg_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
