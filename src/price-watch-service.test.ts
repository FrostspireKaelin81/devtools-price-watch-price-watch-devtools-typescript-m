import test from "node:test";
import assert from "node:assert/strict";
import { classifyRelease, priceWatchRequest } from "./price-watch-service.ts";

test("holds a release when the observed competitor amount drops", () => {
  assert.equal(classifyRelease(19, 29), "hold");
  assert.equal(classifyRelease(29, 29), "publish");
});

test("accepts the domain request boundary", () => {
  const parsed = priceWatchRequest.parse({ catalog: "devtools", competitors: [{ name: "rival", url: "https://example.com" }], release: { version: "1.2.0", commit: "abc" } });
  assert.equal(parsed.release.version, "1.2.0");
});
