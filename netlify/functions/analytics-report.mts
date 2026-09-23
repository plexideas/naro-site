import type { Context, Config } from "@netlify/functions";
import { analyticsStore, report } from "./_shared/analytics.mts";

export default async (request: Request, context: Context) => {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  try {
    return Response.json(await report(analyticsStore(context)), {
      headers: { "Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return Response.json({ error: "Statistics unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
};

export const config: Config = {
  path: "/api/analytics",
  rateLimit: { windowSize: 60, windowLimit: 30, aggregateBy: "ip" },
};
