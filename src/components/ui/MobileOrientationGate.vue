<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { isPortraitMobile, requestLandscape, watchDeviceChange } from "@/common/device";

const visible = ref(isPortraitMobile());
const portrait = ref(isPortraitMobile());
const requesting = ref(false);
const portraitOverride = ref(false);
const fallbackNoticeVisible = ref(false);
let stopWatchingDevice = () => {};
let clickSuppressTimer: number | undefined;
let fallbackNoticeTimer: number | undefined;

function refresh() {
	portrait.value = isPortraitMobile();
	visible.value = portrait.value && !portraitOverride.value;
	if (!portrait.value) fallbackNoticeVisible.value = false;
}

async function tryLandscape() {
	if (requesting.value) return;
	requesting.value = true;
	let switched = false;
	try {
		switched = await requestLandscape();
	} finally {
		if (!switched && isPortraitMobile()) enterPortraitFallback();
		suppressNextClick();
		requesting.value = false;
		deferRefresh();
	}
}

function continuePortrait(event: Event) {
	event.preventDefault();
	event.stopPropagation();
	suppressNextClick();
	enterPortraitFallback();
	deferRefresh();
}

function enterPortraitFallback() {
	portraitOverride.value = true;
	fallbackNoticeVisible.value = true;
	if (fallbackNoticeTimer !== undefined) window.clearTimeout(fallbackNoticeTimer);
	fallbackNoticeTimer = window.setTimeout(() => {
		fallbackNoticeVisible.value = false;
		fallbackNoticeTimer = undefined;
	}, 6000);
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
});

onUnmounted(() => {
	stopWatchingDevice();
	if (clickSuppressTimer !== undefined) window.clearTimeout(clickSuppressTimer);
	if (fallbackNoticeTimer !== undefined) window.clearTimeout(fallbackNoticeTimer);
});
</script>

<template>
	<Teleport to="body">
		<div
			v-if="visible"
			class="mobile-orientation-gate"
			role="dialog"
			aria-modal="true"
			@pointerdown.stop
		>
			<div class="mobile-orientation-card">
				<div class="mobile-orientation-icon" aria-hidden="true">↔</div>
				<h1>请横屏游玩</h1>
				<p>本游戏按电脑端 16:9 横屏画面设计。请旋转手机，或点击下方按钮尝试自动切换；若浏览器不支持，会直接进入可玩的竖屏适配。</p>
				<div class="mobile-orientation-actions">
					<button
						type="button"
						:disabled="requesting"
						@pointerdown.stop.prevent="tryLandscape"
						@click.stop="tryLandscape"
					>
						{{ requesting ? "正在切换…" : "切换为横屏" }}
					</button>
					<button
						type="button"
						class="secondary"
						@pointerdown.stop.prevent="continuePortrait"
						@click.stop="continuePortrait"
					>
						继续竖屏游玩
					</button>
				</div>
				<small>旋转手机后画面会自动重新适配；不支持锁定方向时不会卡在此处。</small>
			</div>
		</div>
		<div v-if="fallbackNoticeVisible && portrait" class="mobile-orientation-hint" role="status">
			当前浏览器未开放自动横屏，已进入竖屏适配；旋转手机后画面会自动放大。
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

.mobile-orientation-hint {
	position: fixed;
	left: 50%;
	bottom: max(18px, env(safe-area-inset-bottom));
	transform: translateX(-50%);
	width: min(92vw, 520px);
	padding: 10px 14px;
	border: 1px solid #8d754d;
	background: #16130fe8;
	color: #e8d5ad;
	font-size: 12px;
	line-height: 1.5;
	text-align: center;
	z-index: 999;
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

button:disabled {
	opacity: 0.7;
	cursor: wait;
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
