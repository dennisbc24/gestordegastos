// Helpers para API routes que leen el token desde cookies sin next/headers async edge issues
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-prod-gestordegastos-2026";

export type JWTPayload = { userId: string; email: string };

export function verifyTokenSync(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)gg_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getUserIdFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  const token = getTokenFromCookieHeader(cookieHeader);
  if (!token) return null;
  const payload = verifyTokenSync(token);
  return payload?.userId ?? null;
}
