import { NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import { getCurrentUser } from "@/app/lib/session";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string | null) ?? "file";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Only JPEG, PNG, GIF and WebP images are allowed" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const filename = `${session.userId}-${type}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "data", "uploads");

  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await pipeline(
    Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(filePath)
  );

  return NextResponse.json({ url: `/uploads/${filename}` });
}
