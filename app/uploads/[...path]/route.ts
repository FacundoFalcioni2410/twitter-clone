import { NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import { Readable } from "stream";
import path from "path";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filename = segments.join("/");

  // Prevent path traversal
  if (filename.includes("..")) {
    return new NextResponse(null, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "uploads", filename);

  if (!existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase().slice(1);
  const contentType = MIME[ext] ?? "application/octet-stream";

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: { "Content-Type": contentType },
  });
}
