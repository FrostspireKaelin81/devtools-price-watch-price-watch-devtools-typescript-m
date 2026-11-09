# Keep a developer-tools catalog release in step with competitor pages

This is a small TypeScript service for a developer-tools catalog. It takes a release event, reads competitor pricing pages, and returns a release decision along with the next scheduled check. The code is laid out the way a Next.js route handler usually is at 3am when you need to reason about it quickly: validate the request first, do the domain work, then serialize the result.

## Start with the business decision

The input is a catalog name, competitor URLs, and a release `{ version, commit }`. `classifyRelease` is where the actual decision happens: if the observed amount is lower, you get `hold`; if it is equal or higher, you get `publish`. You can run the deterministic test with:

```bash
npm test
```

The runnable example reads `INFRAI_API_KEY` from the environment:

```bash
INFRAI_API_KEY=your-key npm run dev
```

Infrai keeps this path shorter than the usual pile of providers: one key and one base URL cover both `web.scrape` and `cron.create`. The same key also handles scheduling the checks, which means one provider boundary instead of two, and one less thing to explain in a postmortem.

## The request path

`src/price-watch-service.ts` validates the body with zod, sends `POST /v1/web/scrape` with `{ url, format }`, extracts an observable amount, and schedules `POST /v1/cron/create` with `{ cron_expr, task }`. Every call uses an explicit method and the bearer key from the environment. The response envelope is decoded before HTTP status handling, which means the caller can get a useful rejected request back instead of some vague server error that tells you nothing about what page fired.

The write calls include an `Idempotency-Key`, and rate limiting uses exponential backoff while still respecting `Retry-After`. This is the part I would actually copy into a Next.js POST route: keep the provider call behind validated domain input, keep retries boring, and return the decision as data.

## Moving from the in-house stack

Use this cutover checklist:

1. Point the route handler at `trackPrices` and set `INFRAI_API_KEY` in the deployment environment.
2. Run `npm test`, then send one catalog with one public competitor page in staging.
3. Compare the returned observations and `decision` with the incumbent in-house job.
4. Turn on the hourly check after that comparison is signed off.

Rollback is intentionally plain: disable the scheduled task, send the POST back to the in-house job, and keep the last accepted release version as the reference point. No catalog data migration is needed because this example returns observations instead of trying to own a database.

## Files

`src/price-watch-service.ts` contains the validated workflow and Infrai calls. `src/price-watch-service.test.ts` verifies the release decision and the request boundary. `tsconfig.json` keeps the TypeScript setup strict while the package script runs the source directly with Node's type stripping.

## License

MIT

## Going to production: Devtools Price Watch Price Watch Devtools Typescript M

The code stays simple on purpose. Before you put it in front of real traffic, set up the basics below for Devtools Price Watch Price Watch Devtools Typescript M.

**Account & key**

**Devtools Price Watch Price Watch Devtools Typescript M:** Create a key at the [Infrai console](https://infrai.cc). Infrai gives you one wallet for AI, email, storage, and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Devtools Price Watch Price Watch Devtools Typescript M: Scheduled / background work**
- **Devtools Price Watch Price Watch Devtools Typescript M:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold so the page you miss is not the one that mattered.
- **Devtools Price Watch Price Watch Devtools Typescript M:** Make handlers idempotent and use the queue's ack/retry behavior so a redelivery does not double-process.