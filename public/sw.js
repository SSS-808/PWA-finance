// The offline helper: keeps a copy of each page that only shows data, so the app opens without internet (docs/adr/013)

// Bump the version to drop every cache from older helpers
const VERSION = "v1";
// Personal data: the login screens delete every cache that starts with "pages-"
const PAGES = `pages-${VERSION}`;
const FILES = `files-${VERSION}`;
const SHELL = `shell-${VERSION}`;
const OFFLINE_URL = "/offline";

// With the VPN off the server doesn't refuse, it never answers, so stop waiting after this long
const WAIT_MS = 4000;
// After a miss the server is probably still unreachable, so wait less for a while
const SHORT_WAIT_MS = 1000;
const MISS_MEMORY_MS = 30000;
const MAX_PAGES = 50;
const MAX_FILES = 300;

// Saved in the background whenever the app is online, so they work offline without being opened first
const MAIN_PAGES = ["/", "/accounts", "/transactions", "/budgets", "/goals"];
// A copy younger than this isn't fetched again, so the server sees at most 5 extra loads per half hour
const FRESH_MS = 30 * 60 * 1000;
const BACKGROUND_WAIT_MS = 15000;

const ID = "[0-9a-f-]{36}";
// Only pages that show data; forms, Settings, downloads and login pages are never kept
const VIEW_PAGES = [
  /^\/$/,
  /^\/accounts$/,
  new RegExp(`^/accounts/${ID}$`),
  /^\/transactions$/,
  /^\/budgets$/,
  /^\/goals$/,
  new RegExp(`^/goals/${ID}$`),
];

let missedAt = 0;
// Open pages that were given a saved copy, so their banner can say so
const servedCopies = new Set();
let savingMainPages = null;

function waitTime() {
  return Date.now() - missedAt < MISS_MEMORY_MS ? SHORT_WAIT_MS : WAIT_MS;
}

function withinWait(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("No answer in time")), waitTime());
    }),
  ]);
}

// Re-saving moves a copy to the end, so the oldest copies are the first to go
async function save(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.delete(request, { ignoreVary: true });
  await cache.put(request, response);
  const keys = await cache.keys();
  for (const old of keys.slice(0, Math.max(0, keys.length - max))) {
    await cache.delete(old);
  }
}

// A redirect means the login screen answered instead of the page, so it is never kept
function isSavablePage(response) {
  return (
    response.ok &&
    response.type === "basic" &&
    !response.redirected &&
    (response.headers.get("content-type") ?? "").includes("text/html")
  );
}

// One page at a time, so the page on screen isn't slowed down; stops at the first failure
async function saveMainPages() {
  for (const path of MAIN_PAGES) {
    const url = new URL(path, self.location.origin).href;
    const copy = await caches.match(url, {
      cacheName: PAGES,
      ignoreVary: true,
    });
    const savedAt = Date.parse(copy?.headers.get("date") ?? "");
    if (Date.now() - savedAt < FRESH_MS) continue;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(BACKGROUND_WAIT_MS),
      });
      if (!isSavablePage(response)) return;
      await save(PAGES, url, response, MAX_PAGES);
    } catch {
      return;
    }
  }
}

// Keeps the offline page and the files it needs, so it shows even if it was never opened
async function saveShell() {
  const response = await fetch(OFFLINE_URL);
  if (!response.ok) return;
  const html = await response.clone().text();
  await (await caches.open(SHELL)).put(OFFLINE_URL, response);
  const files = html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [];
  const cache = await caches.open(FILES);
  await Promise.all(
    [...new Set(files)].map((file) => cache.add(file).catch(() => {})),
  );
}

// Internet first; if it fails or is too slow, the last saved copy, else the offline page
async function page(event) {
  const { request } = event;
  const keep = VIEW_PAGES.some((pattern) =>
    pattern.test(new URL(request.url).pathname),
  );
  const network = fetch(request).then(async (response) => {
    if (keep && isSavablePage(response)) {
      await save(PAGES, request, response.clone(), MAX_PAGES);
    }
    return response;
  });
  // A late answer still refreshes the saved copy for next time
  event.waitUntil(network.catch(() => {}));
  const copy = keep
    ? await caches.match(request, { cacheName: PAGES, ignoreVary: true })
    : undefined;
  const recentMiss = Date.now() - missedAt < MISS_MEMORY_MS;
  try {
    // With nothing saved to show and a server that seemed fine, give it all the time it needs
    return await (copy || recentMiss ? withinWait(network) : network);
  } catch {
    missedAt = Date.now();
    if (copy) {
      servedCopies.add(event.resultingClientId);
      return copy;
    }
    return (
      (await caches.match(OFFLINE_URL, { cacheName: SHELL })) ??
      Response.error()
    );
  }
}

// Build files never change (their names hold a fingerprint), so a saved one is always right
async function buildFile(event) {
  const { request } = event;
  const saved = await caches.match(request, { cacheName: FILES });
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(save(FILES, request, response.clone(), MAX_FILES));
  }
  return response;
}

// In-app links fetch page data; failing fast makes Next.js load the page normally, which gets the saved copy
async function pageData(request) {
  try {
    return await withinWait(fetch(request));
  } catch {
    missedAt = Date.now();
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    saveShell()
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const current = [PAGES, FILES, SHELL];
      for (const name of await caches.keys()) {
        if (!current.includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(page(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(buildFile(event));
  } else if (
    request.headers.has("RSC") &&
    !request.headers.has("Next-Router-Prefetch")
  ) {
    // Prefetches run in the background, so a slow one is left alone
    event.respondWith(pageData(request));
  }
});

// Every page load says hello: a saved copy gets its banner, a fresh page starts the background saving
self.addEventListener("message", (event) => {
  if (event.data !== "page-loaded" || !event.source) return;
  const wasCopy = servedCopies.has(event.source.id);
  event.source.postMessage({ type: "was-copy", value: wasCopy });
  if (wasCopy) return;
  savingMainPages ??= saveMainPages().finally(() => {
    savingMainPages = null;
  });
  event.waitUntil(savingMainPages);
});
