import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    const ok = await verifyPassword(password, user.password);
    if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    const token = signToken({ userId: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
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
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
