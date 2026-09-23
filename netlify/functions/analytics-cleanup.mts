import type { Context, Config } from "@netlify/functions";
import { analyticsStore, cleanup } from "./_shared/analytics.mts";

export default async (_request: Request, context: Context) => {
  await cleanup(analyticsStore(context));
};

export const config: Config = { schedule: "0 3 * * *" };
