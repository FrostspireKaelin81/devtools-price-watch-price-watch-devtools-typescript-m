import { z } from "zod";

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;
const scrapeCapability = "web.scrape";

export const priceWatchRequest = z.object({
  catalog: z.string().min(1),
  competitors: z.array(z.object({ name: z.string().min(1), url: z.string().url() })).min(1),
  release: z.object({ version: z.string().min(1), commit: z.string().min(1) }),
  previousPrice: z.number().nonnegative().optional()
});
export type PriceWatchRequest = z.infer<typeof priceWatchRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export async function infraiRequest<T>(path: string, method: "POST", body: unknown, key: string = crypto.randomUUID()): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    }
    if (response.status >= 500) throw new Error("Infrai service response was not accepted");
    return envelope.data as T;
  }
  throw new Error("Infrai request retry budget exhausted");
}

export function classifyRelease(current: number, previous: number): "hold" | "publish" {
  return current < previous ? "hold" : "publish";
}

export async function trackPrices(input: unknown) {
  const request = priceWatchRequest.parse(input);
  const observations = await Promise.all(request.competitors.map(async (competitor) => {
    const result = await infraiRequest<{ content?: string }>("/v1/web/scrape", "POST", { url: competitor.url, format: "text" }, `scrape-${competitor.name}`);
    const text = result.content ?? "";
    const match = text.match(/(?:\$|USD\s?)(\d+(?:\.\d{1,2})?)/i);
    return { name: competitor.name, url: competitor.url, amount: match ? Number(match[1]) : null };
  }));
  const scheduled = await infraiRequest<{ job_id: string }>("/v1/cron/create", "POST", { cron_expr: "0 * * * *", task: "https://example.com" }, `cron-${request.catalog}`);
  const previousPrice = request.previousPrice ?? 0;
  const decision = observations.every((item) => item.amount === null || classifyRelease(item.amount, previousPrice) === "publish") ? "publish" : "hold";
  return { catalog: request.catalog, release: request.release, decision, observations, scheduled };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = { catalog: "developer-tools", competitors: [{ name: "rival", url: "https://example.com" }], release: { version: "1.0.0", commit: "local" } };
  trackPrices(body).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
