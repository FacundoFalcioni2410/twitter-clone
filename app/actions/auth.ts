"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";
import { registerSchema, loginSchema } from "@/app/lib/schemas/auth";
import { ROUTES, type ActionResult } from "@/app/lib/types";

const COOKIE_NAME = "session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

export async function register(formData: FormData): Promise<ActionResult> {
  const raw = {
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { data: null, error: result.error.issues[0].message };
  }

  const { name, username, email, password } = result.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    const field = existing.email === email ? "Email" : "Username";
    return { data: null, error: `${field} is already taken` };
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, username, email, passwordHash: hashed },
  });

  const token = await signToken({ userId: user.id, username: user.username });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);

  redirect(ROUTES.HOME);
}

export async function login(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { data: null, error: result.error.issues[0].message };
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { data: null, error: "Invalid email or password" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { data: null, error: "Invalid email or password" };
  }

  const token = await signToken({ userId: user.id, username: user.username });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);

  redirect(ROUTES.HOME);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect(ROUTES.LOGIN);
}
