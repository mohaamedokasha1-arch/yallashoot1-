import { connection } from "next/server";
import { footballConfig } from "@/lib/env";
import { getStore } from "@/lib/store";

/** Liveness/readiness probe. Never exposes secrets. */
export async function GET() {
  await connection();
  const cfg = footballConfig();
  const store = getStore();
  const storeOk = await store.ping();
  return Response.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      provider: { id: cfg.provider, configured: Boolean(cfg.apiKey), official: cfg.isOfficial },
      store: { kind: store.kind, reachable: storeOk },
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
