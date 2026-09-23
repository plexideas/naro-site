import type { Context, Config } from "@netlify/functions";
import { analyticsStore, ignoredAgent, record } from "./_shared/analytics.mts";

export default async (request: Request, context: Context) => {
  const headers = { "Cache-Control": "no-store" };
  if (request.method !== "POST") return new Response(null, { status: 405, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403, headers });
  }
  const agent = request.headers.get("user-agent") || "";
  if (ignoredAgent(agent) || !context.ip) return new Response(null, { status: 204, headers });
  if (Number(request.headers.get("content-length") || 0) > 100) {
    return new Response(null, { status: 413, headers });
  }
  const event = await request.text();
  if (event !== "visit" && event !== "download") return new Response(null, { status: 400, headers });
  try {
    await record(analyticsStore(context), event, context.ip, agent);
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
};

export const config: Config = {
  path: "/api/analytics/event",
  rateLimit: { windowSize: 60, windowLimit: 120, aggregateBy: ["ip", "domain"] },
};
