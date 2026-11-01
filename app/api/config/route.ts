export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ liveAvailable: Boolean(process.env.OPENAI_API_KEY) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
