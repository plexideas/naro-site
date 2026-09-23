import { createHmac, randomBytes } from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export function analyticsStore(context: Pick<Context, "deploy">) {
  const name = context.deploy.context === "production" ? "naro-analytics" : `naro-analytics-${context.deploy.id}`;
  return getStore({ name, consistency: "strong" });
}

type Store = ReturnType<typeof getStore>;

export function dayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number, now = new Date()) {
  return dayString(new Date(now.getTime() - days * 86400000));
}

export function ignoredAgent(agent: string) {
  return !agent || /bot|crawl|spider|preview|headless|NaroAnalyticsCheck/i.test(agent);
}

export async function record(store: Store, event: "visit" | "download", ip: string, agent: string, now = new Date()) {
  await store.set("started-at", now.toISOString(), { onlyIfNew: true });
  const day = dayString(now);
  const saltKey = `salts/${day}`;
  let salt = await store.get(saltKey);
  if (!salt) {
    await store.set(saltKey, randomBytes(32).toString("hex"), { onlyIfNew: true });
    salt = await store.get(saltKey);
  }
  if (!salt) throw new Error("Analytics unavailable");
  const visitor = createHmac("sha256", salt).update(JSON.stringify([ip, agent])).digest("hex");
  await store.set(`events/${day}/visit/${visitor}`, "1");
  if (event === "download") await store.set(`events/${day}/download/${visitor}`, "1");
}

export async function report(store: Store, now = new Date()) {
  const rows = new Map<string, { date: string; visitors: number; downloads: number }>();
  for (let index = 0; index < 30; index++) {
    const date = daysAgo(29 - index, now);
    rows.set(date, { date, visitors: 0, downloads: 0 });
  }
  for await (const page of store.list({ prefix: "events/", paginate: true })) {
    for (const { key } of page.blobs) {
      const [, date, event] = key.split("/");
      const row = rows.get(date);
      if (!row) continue;
      if (event === "visit") row.visitors++;
      if (event === "download") row.downloads++;
    }
  }
  return { updatedAt: now.toISOString(), startedAt: await store.get("started-at"), timezone: "UTC", days: [...rows.values()] };
}

export async function cleanup(store: Store, now = new Date()) {
  for (const [prefix, cutoff] of [["salts/", dayString(now)], ["events/", daysAgo(29, now)]]) {
    for await (const page of store.list({ prefix, paginate: true })) {
      const expired = page.blobs.filter(({ key }) => key.split("/")[1] < cutoff);
      for (let index = 0; index < expired.length; index += 20) {
        await Promise.all(expired.slice(index, index + 20).map(({ key }) => store.delete(key)));
      }
    }
  }
}
