const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function isMobileDevice(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") return false;
	const userAgent = navigator.userAgent || "";
	const narrowTouchViewport =
		navigator.maxTouchPoints > 0 &&
		window.matchMedia("(max-width: 850px)").matches;
	return MOBILE_USER_AGENT.test(userAgent) || narrowTouchViewport;
}

export function watchDeviceChange(listener: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	window.addEventListener("resize", listener, { passive: true });
	window.addEventListener("orientationchange", listener, { passive: true });
	return () => {
		window.removeEventListener("resize", listener);
		window.removeEventListener("orientationchange", listener);
	};
}
