const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function isMobileDevice(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") return false;
	const userAgent = navigator.userAgent || "";
	const narrowTouchViewport =
		navigator.maxTouchPoints > 0 &&
		window.matchMedia("(max-width: 850px)").matches;
	return MOBILE_USER_AGENT.test(userAgent) || narrowTouchViewport;
}

export function isPortraitMobile(): boolean {
	if (typeof window === "undefined") return false;
	return isMobileDevice() && window.innerHeight > window.innerWidth;
}

/**
 * 浏览器只有在用户手势、全屏或已安装 PWA 等条件满足时才允许锁定方向。
 * 先尝试全屏再锁横屏；失败时由界面提示用户手动旋转，不阻塞游戏启动。
 */
export async function requestLandscape(): Promise<boolean> {
	if (typeof window === "undefined" || !isMobileDevice()) return false;
	const orientation = window.screen?.orientation as (ScreenOrientation & {
		lock?: (orientation: OrientationLockType) => Promise<void>;
	}) | undefined;
	try {
		if (!document.fullscreenElement && document.documentElement.requestFullscreen)
			await document.documentElement.requestFullscreen();
	} catch {
		// 普通网页或 iOS Safari 可能拒绝全屏，继续尝试方向锁定。
	}
	try {
		await orientation?.lock?.("landscape");
	} catch {
		// 方向锁定不是所有移动浏览器都开放；人工旋转仍可正常适配。
	}
	return !isPortraitMobile();
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
