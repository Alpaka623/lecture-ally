import { DeckPlayerShell } from "@/components/DeckPlayerShell";

// Thin server wrapper: resolves the route param and hands it to the client
// shell, which loads the deck from the browser cache (IndexedDB) — there is no
// server-side deck store anymore.
export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  return <DeckPlayerShell deckId={deckId} />;
}
