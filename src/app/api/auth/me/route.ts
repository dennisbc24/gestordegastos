import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true } });
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
