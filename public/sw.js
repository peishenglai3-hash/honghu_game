const CACHE_VERSION = "honghu-pwa-v1-20260906";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CACHE_BATCH_SIZE = 8;
const CACHE_ATTEMPTS = 3;
const CACHE_RETRY_DELAY_MS = 200;

function isSameOrigin(url) {
	return url.origin === self.location.origin;
}

function isNavigation(request) {
	return request.mode === "navigate" || request.destination === "document";
}

function isRangeRequest(request) {
	return request.headers.has("range");
}

function isCacheableAsset(request, url) {
	if (request.method !== "GET" || !isSameOrigin(url) || isRangeRequest(request)) return false;
	return url.pathname.includes("/assets/") || url.pathname.includes("/data/");
}

async function cacheResponse(cacheName, request, response) {
	if (response.ok && response.type === "basic") {
		const cache = await caches.open(cacheName);
		await cache.put(request, response.clone());
	}
	return response;
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cacheOne(cache, url) {
	if (await cache.match(url)) return true;
	for (let attempt = 0; attempt < CACHE_ATTEMPTS; attempt += 1) {
		try {
			const response = await fetch(url, { cache: "reload" });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			await cache.put(url, response.clone());
			return true;
		} catch {
			if (attempt + 1 < CACHE_ATTEMPTS) await wait(CACHE_RETRY_DELAY_MS * (attempt + 1));
		}
	}
	return false;
}

async function cacheUrls(urls) {
	const cache = await caches.open(RUNTIME_CACHE);
	let cached = 0;
	for (let index = 0; index < urls.length; index += CACHE_BATCH_SIZE) {
		const batch = urls.slice(index, index + CACHE_BATCH_SIZE);
		const results = await Promise.all(batch.map((url) => cacheOne(cache, url)));
		cached += results.filter(Boolean).length;
	}
	return { requested: urls.length, cached, failed: urls.length - cached };
}

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const shell = await caches.open(SHELL_CACHE);
			const root = new URL("./", self.registration.scope);
			await shell.addAll([
				new URL("./", root).toString(),
				new URL("./manifest.webmanifest", root).toString(),
			]);
			await self.skipWaiting();
		})(),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name.startsWith("honghu-pwa-") && !keep.has(name))
					.map((name) => caches.delete(name)),
			);
			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	const url = new URL(request.url);
	if (!isSameOrigin(url) || request.method !== "GET") return;

	if (isNavigation(request)) {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(request);
					return await cacheResponse(SHELL_CACHE, request, response);
				} catch {
					return (
						(await caches.match(request)) ||
						(await caches.match(new URL("./", self.registration.scope).toString())) ||
						new Response("离线启动页不可用", { status: 503 })
					);
				}
			})(),
		);
		return;
	}

	if (isCacheableAsset(request, url)) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(request);
				if (cached) return cached;
				try {
					return await cacheResponse(RUNTIME_CACHE, request, await fetch(request));
				} catch {
					return new Response("资源暂不可用", { status: 503 });
				}
			})(),
		);
	}
});

self.addEventListener("message", (event) => {
	const data = event.data;
	if (!data || typeof data !== "object") return;
	if (data.type === "SKIP_WAITING") self.skipWaiting();
	if (data.type === "CLEAR_RUNTIME_CACHE") {
		event.waitUntil(caches.delete(RUNTIME_CACHE));
	}
	if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
		event.waitUntil(
			(async () => {
				const scope = new URL("./", self.registration.scope);
				const urls = data.urls
					.filter((url) => typeof url === "string")
					.map((url) => {
						try {
							const parsed = new URL(url, scope);
							return parsed.origin === self.location.origin && parsed.pathname.startsWith(scope.pathname)
								? parsed.toString()
								: null;
						} catch {
							return null;
						}
					})
					.filter((url) => url !== null);
				const result = await cacheUrls(urls);
				event.source?.postMessage({ type: "CACHE_URLS_RESULT", ...result });
			})(),
		);
	}
});
