import { shortcutEnabled } from "@/lib/features";
import { addFromShortcut } from "@/modules/shortcut";

// The iPhone Shortcut posts one expense here with its key (docs/adr/018-shortcut-keys.md)
export async function POST(request: Request) {
  if (!shortcutEnabled()) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const reply = await addFromShortcut(
    request.headers.get("authorization"),
    await request.text(),
  );
  return Response.json(reply.body, {
    status: reply.status,
    headers: { "Cache-Control": "no-store" },
  });
}
