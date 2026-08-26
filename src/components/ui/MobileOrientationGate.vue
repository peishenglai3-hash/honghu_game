<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { isPortraitMobile, isMobileDevice, requestLandscape, watchDeviceChange } from "@/common/device";

const visible = ref(isPortraitMobile());
const requesting = ref(false);
const portraitOverride = ref(false);
let stopWatchingDevice = () => {};
let clickSuppressTimer: number | undefined;

function refresh() {
	visible.value = isPortraitMobile() && !portraitOverride.value;
}

async function tryLandscape() {
	if (requesting.value) return;
	requesting.value = true;
	await requestLandscape();
	suppressNextClick();
	deferRefresh();
	requesting.value = false;
}

function continuePortrait(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	suppressNextClick();
	portraitOverride.value = true;
	deferRefresh();
}

function blockUnderlyingPointer(event: PointerEvent) {
	// Phaser 在画布外也会监听指针坐标；遮罩层捕获阶段必须先截断，
	// 否则与画布重叠的按钮会误触标题菜单热区。
	event.stopPropagation();
}

function deferRefresh() {
	// 退让一个浏览器事件循环，避免按钮隐藏后把同一次触控的合成 click
	// 转交给重叠在下方的 Phaser 画布。
	window.setTimeout(refresh, 100);
}

function suppressNextClick() {
	if (typeof window === "undefined") return;
	if (clickSuppressTimer !== undefined) window.clearTimeout(clickSuppressTimer);
	const prevent = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		window.removeEventListener("click", prevent, true);
		clickSuppressTimer = undefined;
	};
	window.addEventListener("click", prevent, true);
	clickSuppressTimer = window.setTimeout(() => {
		window.removeEventListener("click", prevent, true);
		clickSuppressTimer = undefined;
	}, 700);
}

onMounted(() => {
	stopWatchingDevice = watchDeviceChange(refresh);
	// 这是“自动切换”的最佳努力路径；浏览器若要求用户手势，会由按钮再次尝试。
	if (isMobileDevice() && isPortraitMobile()) void requestLandscape().then(refresh);
});

onUnmounted(() => {
	stopWatchingDevice();
	if (clickSuppressTimer !== undefined) window.clearTimeout(clickSuppressTimer);
});
</script>

<template>
	<Teleport to="body">
		<div
			v-if="visible"
			class="mobile-orientation-gate"
			role="dialog"
			aria-modal="true"
			@pointerdown.capture="blockUnderlyingPointer"
		>
			<div class="mobile-orientation-card">
				<div class="mobile-orientation-icon" aria-hidden="true">↔</div>
				<h1>请横屏游玩</h1>
				<p>本游戏按电脑端 16:9 横屏画面设计。请旋转手机，或点击下方按钮尝试自动切换。</p>
				<div class="mobile-orientation-actions">
					<button type="button" @click="tryLandscape">
						{{ requesting ? "正在切换…" : "切换为横屏" }}
					</button>
					<button type="button" class="secondary" @click="continuePortrait">
						继续竖屏游玩
					</button>
				</div>
				<small>若浏览器不支持锁定方向，继续后会完整显示画面。</small>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.mobile-orientation-gate {
	position: fixed;
	inset: 0;
	display: grid;
	place-items: center;
	padding: max(22px, env(safe-area-inset-top)) max(22px, env(safe-area-inset-right))
		max(22px, env(safe-area-inset-bottom)) max(22px, env(safe-area-inset-left));
	background: #090908f5;
	color: #f1e6ce;
	z-index: 1000;
}

.mobile-orientation-card {
	width: min(86vw, 420px);
	padding: 28px 24px 24px;
	border: 1px solid #b99659;
	background: linear-gradient(145deg, #211a12f7, #0e0d0bf7);
	box-shadow: 0 18px 60px #000d;
	text-align: center;
}

.mobile-orientation-icon {
	color: #efcc80;
	font-size: 48px;
	line-height: 1;
}

h1 {
	margin: 18px 0 12px;
	font-size: 24px;
	font-weight: 600;
}

p {
	margin: 0;
	color: #cfc1a6;
	font-size: 14px;
	line-height: 1.8;
}

button {
	padding: 10px 22px;
	border: 1px solid #d2ab63;
	background: #5a3d18;
	color: #fff0c8;
	font: 700 14px/1.2 "Noto Serif SC", serif;
	touch-action: manipulation;
}

.mobile-orientation-actions {
	display: flex;
	justify-content: center;
	gap: 10px;
	margin-top: 22px;
}

.mobile-orientation-actions button {
	margin-top: 0;
}

.mobile-orientation-actions .secondary {
	border-color: #806d50;
	background: #2a241b;
	color: #dfd1b8;
}

small {
	display: block;
	margin-top: 12px;
	color: #9f927d;
	font-size: 11px;
	line-height: 1.5;
}

@media (max-width: 460px) {
	.mobile-orientation-actions {
		flex-direction: column;
	}

	.mobile-orientation-actions button {
		width: 100%;
	}
}
</style>
