const PWA_UPDATE_EVENT = "honghu:pwa-update";
const PWA_CACHE_RESULT_EVENT = "honghu:pwa-cache-result";

function postToServiceWorker(message: unknown): void {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
	const controller = navigator.serviceWorker?.controller;
	if (controller) {
		controller.postMessage(message);
		return;
	}
	void navigator.serviceWorker?.ready.then((registration) => {
		registration.active?.postMessage(message);
	});
}

export function registerPwaServiceWorker(): void {
	if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

	const serviceWorkerUrl = new URL("sw.js", document.baseURI);
	const scope = new URL("./", document.baseURI).pathname;
	navigator.serviceWorker
		.register(serviceWorkerUrl, { scope })
		.then((registration) => {
			navigator.serviceWorker.addEventListener("message", (event) => {
				if (event.data?.type !== "CACHE_URLS_RESULT") return;
				window.dispatchEvent(new CustomEvent(PWA_CACHE_RESULT_EVENT, { detail: event.data }));
			});
			registration.addEventListener("updatefound", () => {
				const worker = registration.installing;
				worker?.addEventListener("statechange", () => {
					if (worker.state === "installed" && navigator.serviceWorker.controller)
						window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT));
				});
			});
		})
		.catch((error: unknown) => {
			if (import.meta.env.DEV) console.warn("PWA service worker registration failed", error);
		});
}

export function requestPwaUpdate(): void {
	postToServiceWorker({ type: "SKIP_WAITING" });
}

export function clearPwaRuntimeCache(): void {
	postToServiceWorker({ type: "CLEAR_RUNTIME_CACHE" });
}

export function cachePwaUrls(urls: readonly string[]): void {
	postToServiceWorker({ type: "CACHE_URLS", urls: [...urls] });
}
