const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

type FullscreenElement = HTMLElement & {
	webkitRequestFullscreen?: () => Promise<void> | void;
};

type OrientationApi = ScreenOrientation & {
	lock?: (orientation: OrientationLockType) => Promise<void>;
};

export function isMobileDevice(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") return false;
	const userAgent = navigator.userAgent || "";
	const narrowTouchViewport =
		navigator.maxTouchPoints > 0 &&
		window.matchMedia?.("(max-width: 850px)").matches === true;
	return MOBILE_USER_AGENT.test(userAgent) || narrowTouchViewport;
}

export function isPortraitMobile(): boolean {
	if (typeof window === "undefined") return false;
	return isMobileDevice() && window.innerHeight > window.innerWidth;
}

async function settleWithTimeout(
	action: () => Promise<unknown> | unknown,
	timeoutMs = 1200,
): Promise<boolean> {
	let timeoutId: number | undefined;
	let operation: Promise<boolean>;
	try {
		// 在用户手势所在的同步调用栈中发起全屏请求；部分移动 WebView
		// 会把延后到下一个微任务的调用视为失去用户激活。
		operation = Promise.resolve(action()).then(() => true, () => false);
	} catch {
		operation = Promise.resolve(false);
	}
	const timeout = new Promise<boolean>((resolve) => {
		timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
	});
	try {
		return await Promise.race([operation, timeout]);
	} finally {
		if (timeoutId !== undefined) window.clearTimeout(timeoutId);
	}
}

/**
 * 浏览器只有在用户手势、全屏或已安装 PWA 等条件满足时才允许锁定方向。
 * 先以有时限的最佳努力尝试全屏和横屏锁定；失败时由界面进入可玩的 FIT 退路。
 */
export async function requestLandscape(): Promise<boolean> {
	if (typeof window === "undefined" || !isMobileDevice()) return false;
	const orientation = window.screen?.orientation as OrientationApi | undefined;
	const fullscreenElement = document.documentElement as FullscreenElement;
	const requestFullscreen =
		fullscreenElement.requestFullscreen?.bind(fullscreenElement) ??
		fullscreenElement.webkitRequestFullscreen?.bind(fullscreenElement);

	if (!document.fullscreenElement && requestFullscreen)
		await settleWithTimeout(requestFullscreen);
	if (orientation?.lock) await settleWithTimeout(() => orientation.lock?.("landscape"));
	return !isPortraitMobile();
}

export function watchDeviceChange(listener: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	const notify = () => listener();
	const orientation = window.screen?.orientation;
	window.addEventListener("resize", notify, { passive: true });
	window.addEventListener("orientationchange", notify, { passive: true });
	window.visualViewport?.addEventListener("resize", notify, { passive: true });
	orientation?.addEventListener("change", notify);
	return () => {
		window.removeEventListener("resize", notify);
		window.removeEventListener("orientationchange", notify);
		window.visualViewport?.removeEventListener("resize", notify);
		orientation?.removeEventListener("change", notify);
	};
}
