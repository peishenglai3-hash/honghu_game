<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { isPortraitMobile, isMobileDevice, requestLandscape, watchDeviceChange } from "@/common/device";

const visible = ref(isPortraitMobile());
const requesting = ref(false);
let stopWatchingDevice = () => {};

function refresh() {
	visible.value = isPortraitMobile();
}

async function tryLandscape() {
	if (requesting.value) return;
	requesting.value = true;
	await requestLandscape();
	refresh();
	requesting.value = false;
}

onMounted(() => {
	stopWatchingDevice = watchDeviceChange(refresh);
	// 这是“自动切换”的最佳努力路径；浏览器若要求用户手势，会由按钮再次尝试。
	if (isMobileDevice() && isPortraitMobile()) void requestLandscape().then(refresh);
});

onUnmounted(() => stopWatchingDevice());
</script>

<template>
	<Teleport to="body">
		<div v-if="visible" class="mobile-orientation-gate" role="dialog" aria-modal="true">
			<div class="mobile-orientation-card">
				<div class="mobile-orientation-icon" aria-hidden="true">↔</div>
				<h1>请横屏游玩</h1>
				<p>本游戏按电脑端 16:9 横屏画面设计。请旋转手机，或点击下方按钮尝试自动切换。</p>
				<button type="button" @click="tryLandscape">
					{{ requesting ? "正在切换…" : "切换为横屏" }}
				</button>
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
	margin-top: 22px;
	padding: 10px 22px;
	border: 1px solid #d2ab63;
	background: #5a3d18;
	color: #fff0c8;
	font: 700 14px/1.2 "Noto Serif SC", serif;
	touch-action: manipulation;
}
</style>
