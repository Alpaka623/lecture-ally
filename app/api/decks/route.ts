import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import {
  addDeckToIndex,
  deckPdfPath,
  ensureDeckDirs,
  isLanguage,
  listDecks,
  saveDeckMeta,
  type Language,
} from "@/lib/data/deckStore";
import { getPdfPageCount } from "@/lib/pdf/renderSlide";

export const runtime = "nodejs";

export async function GET() {
  const decks = await listDecks();
  return NextResponse.json({ decks });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "");
  const requestedLanguage = formData.get("language");
  const language: Language = isLanguage(requestedLanguage) ? requestedLanguage : "en";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const deckId = crypto.randomUUID();
  await ensureDeckDirs(deckId);

  const pdfBytes = Buffer.from(await file.arrayBuffer());
  await writeFile(deckPdfPath(deckId), pdfBytes);

  const slideCount = await getPdfPageCount(deckPdfPath(deckId));

  const meta = {
    id: deckId,
    title: title.trim() || file.name.replace(/\.pdf$/i, ""),
    slideCount,
    language,
    createdAt: new Date().toISOString(),
  };

  await saveDeckMeta(meta);
  await addDeckToIndex(meta);

  return NextResponse.json({ deckId, slideCount });
}
