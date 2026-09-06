const CACHE_VERSION = "honghu-pwa-v1-20260906";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

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
				const cache = await caches.open(RUNTIME_CACHE);
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
				await cache.addAll(urls);
			})(),
	);
	}
});
