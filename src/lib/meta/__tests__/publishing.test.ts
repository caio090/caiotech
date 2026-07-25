/**
 * Ad-hoc test for src/lib/meta/publishing.ts — no jest/vitest in this
 * project, so this mocks global.fetch by hand and asserts against the real
 * production module.
 *
 * Run via `npm run test:meta` (see publish-eligibility.test.ts for why:
 * tsc-compiles this file + publishing.ts to CommonJS using the isolated
 * tsconfig.meta-tests.json, then plain `node` runs the compiled output —
 * no new dependency, no change to the app's tsconfig.json or build).
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const publishing = require("../publishing") as typeof import("../publishing");
const { getPublicationMediaUrl, buildInstagramFeedPlan, publishInstagramFeed } = publishing;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log("[test] getPublicationMediaUrl — accepts only safe public HTTPS URLs");
{
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://cdn.example.com/art.jpg" } }) === "https://cdn.example.com/art.jpg", "valid public https URL is accepted");
  assert(getPublicationMediaUrl({ metadata: {} }) === null, "no metadata keys present returns null");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "http://cdn.example.com/art.jpg" } }) === null, "plain http is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://localhost/art.jpg" } }) === null, "localhost is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://127.0.0.1/art.jpg" } }) === null, "127.0.0.1 loopback literal is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://10.0.0.5/art.jpg" } }) === null, "10.x private range is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://192.168.1.5/art.jpg" } }) === null, "192.168.x private range is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://172.20.0.5/art.jpg" } }) === null, "172.16-31.x private range is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://169.254.1.1/art.jpg" } }) === null, "169.254.x link-local is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://user:pass@cdn.example.com/art.jpg" } }) === null, "embedded credentials are rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "https://cdn.example.com:8443/art.jpg" } }) === null, "unusual port is rejected");
  assert(getPublicationMediaUrl({ metadata: { publication_media_url: "not a url" } }) === null, "unparseable string is rejected without throwing");
  assert(
    getPublicationMediaUrl({ metadata: { media_url: "https://cdn.example.com/fallback.jpg" } }) === "https://cdn.example.com/fallback.jpg",
    "falls back to media_url when publication_media_url is absent",
  );
  assert(
    getPublicationMediaUrl({ metadata: { publication_media_url: "http://bad.example.com/x.jpg", media_url: "https://cdn.example.com/good.jpg" } }) === "https://cdn.example.com/good.jpg",
    "an invalid first key does not short-circuit — the next valid key is still picked up",
  );
}

console.log("\n[test] buildInstagramFeedPlan");
{
  let threw = false;
  try { buildInstagramFeedPlan({ caption: "hi", metadata: {} }, "ig-123"); }
  catch { threw = true; }
  assert(threw, "throws when there is no valid media URL, before any network call");

  const plan = buildInstagramFeedPlan({ caption: "  hello  ", metadata: { publication_media_url: "https://cdn.example.com/a.jpg" } }, "ig-123");
  assert(plan.channel === "instagram_feed", "plan.channel is instagram_feed");
  assert(plan.instagramAccountId === "ig-123", "plan carries the given Instagram account id");
  assert(plan.mediaUrl === "https://cdn.example.com/a.jpg", "plan carries the resolved media URL");
  assert(plan.caption === "hello", "caption is trimmed");
}

console.log("\n[test] dry-run planning never touches the network");
{
  let fetchCalls = 0;
  const originalFetch = global.fetch;
  global.fetch = (() => { fetchCalls++; throw new Error("fetch must not be called during planning"); }) as typeof fetch;
  try {
    buildInstagramFeedPlan({ caption: "x", metadata: { publication_media_url: "https://cdn.example.com/a.jpg" } }, "ig-123");
    getPublicationMediaUrl({ metadata: { publication_media_url: "https://cdn.example.com/a.jpg" } });
  } finally {
    global.fetch = originalFetch;
  }
  assert(fetchCalls === 0, "building a plan / resolving the media URL makes zero fetch calls (dry_run in the route stops here)");
}

async function testPublishInstagramFeedSuccess() {
  console.log("\n[test] publishInstagramFeed — success path calls /media then /media_publish");
  const calls: string[] = [];
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    calls.push(url);
    if (url.includes("/media_publish")) {
      return { ok: true, json: async () => ({ id: "media-published-1" }) } as Response;
    }
    return { ok: true, json: async () => ({ id: "container-1" }) } as Response;
  }) as typeof fetch;

  try {
    const result = await publishInstagramFeed(
      { channel: "instagram_feed", instagramAccountId: "ig-123", mediaUrl: "https://cdn.example.com/a.jpg", caption: "hi" },
      "fake-token",
      "v21.0",
    );
    assert(calls.length === 2, "exactly two Graph API calls are made (container, then publish)");
    assert(calls[0].includes("/ig-123/media") && !calls[0].includes("media_publish"), "first call targets /media");
    assert(calls[1].includes("/ig-123/media_publish"), "second call targets /media_publish");
    assert(result.containerId === "container-1", "returns the container id from the first call");
    assert(result.mediaId === "media-published-1", "returns the published media id from the second call");
  } finally {
    global.fetch = originalFetch;
  }
}

async function testPublishInstagramFeedContainerFailure() {
  console.log("\n[test] publishInstagramFeed — container creation failure surfaces Meta's error and never calls media_publish");
  let publishCalled = false;
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes("media_publish")) { publishCalled = true; return { ok: true, json: async () => ({ id: "x" }) } as Response; }
    return { ok: false, json: async () => ({ error: { message: "Invalid image_url" } }) } as Response;
  }) as typeof fetch;

  let caughtMessage: string | null = null;
  try {
    await publishInstagramFeed(
      { channel: "instagram_feed", instagramAccountId: "ig-123", mediaUrl: "https://cdn.example.com/a.jpg", caption: "hi" },
      "fake-token",
      "v21.0",
    );
  } catch (error) {
    caughtMessage = error instanceof Error ? error.message : String(error);
  } finally {
    global.fetch = originalFetch;
  }
  assert(caughtMessage === "Invalid image_url", "the Graph API's error message is surfaced");
  assert(!publishCalled, "media_publish is never called when container creation fails");
}

async function testPublishInstagramFeedPublishFailure() {
  console.log("\n[test] publishInstagramFeed — media_publish failure surfaces Meta's error");
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes("media_publish")) return { ok: false, json: async () => ({ error: { message: "Publish window expired" } }) } as Response;
    return { ok: true, json: async () => ({ id: "container-1" }) } as Response;
  }) as typeof fetch;

  let caughtMessage: string | null = null;
  try {
    await publishInstagramFeed(
      { channel: "instagram_feed", instagramAccountId: "ig-123", mediaUrl: "https://cdn.example.com/a.jpg", caption: "hi" },
      "fake-token",
      "v21.0",
    );
  } catch (error) {
    caughtMessage = error instanceof Error ? error.message : String(error);
  } finally {
    global.fetch = originalFetch;
  }
  assert(caughtMessage === "Publish window expired", "the Graph API's media_publish error message is surfaced");
}

(async () => {
  await testPublishInstagramFeedSuccess();
  await testPublishInstagramFeedContainerFailure();
  await testPublishInstagramFeedPublishFailure();
  console.log(`\n[test] publishing.ts — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
})();
