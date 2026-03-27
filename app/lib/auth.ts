import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "@/app/lib/types";

const secret = new TextEncoder().encode(
  /* v8 ignore next */
  process.env.JWT_SECRET ?? "fallback-secret-not-for-production"
);

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
