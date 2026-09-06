const PWA_UPDATE_EVENT = "honghu:pwa-update";

export function registerPwaServiceWorker(): void {
	if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

	const serviceWorkerUrl = new URL("sw.js", document.baseURI);
	const scope = new URL("./", document.baseURI).pathname;
	navigator.serviceWorker
		.register(serviceWorkerUrl, { scope })
		.then((registration) => {
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
	navigator.serviceWorker?.controller?.postMessage({ type: "SKIP_WAITING" });
}

export function clearPwaRuntimeCache(): void {
	navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_RUNTIME_CACHE" });
}

export function cachePwaUrls(urls: readonly string[]): void {
	navigator.serviceWorker?.controller?.postMessage({ type: "CACHE_URLS", urls: [...urls] });
}
