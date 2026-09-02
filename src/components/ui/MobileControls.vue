<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import {
	clearVirtualActions,
	setVirtualAction,
	triggerVirtualAction,
} from "@/common/actions";
import { isMobileDevice, watchDeviceChange } from "@/common/device";

const props = defineProps<{ enabled?: boolean }>();
const hud = useHudStore();
const mobile = ref(isMobileDevice());
const pressed = new Set<string>();
let stopWatchingDevice = () => {};
let clickSuppressTimer: number | undefined;

const shouldShow = computed(() =>
	Boolean(
		props.enabled &&
		mobile.value &&
		!hud.overlay &&
		!hud.title.loadOpen &&
		!hud.title.settingsOpen &&
		!hud.choicePanel &&
		!hud.resultPanelVisible &&
		!hud.infoPanel &&
		!hud.endPanel &&
		!hud.portraitPanel &&
		!hud.creditsVisible &&
		!hud.sceneRecap.visible,
	),
);

// 对话和视频过渡没有稳定的 DOM 按钮，移动端允许点击画面任意位置推进。
// 选择、照片结果、信息卡和任务卡打开时关闭该层，避免误触或挡住原有控件。
const showTapAdvance = computed(() =>
	Boolean(
		shouldShow.value &&
		hud.taskCards.length === 0 &&
		!hud.itemPanel,
	),
);

function hold(action: string, event: PointerEvent): void {
	event.preventDefault();
	(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
	pressed.add(action);
	setVirtualAction(action, true);
}

function release(action: string, event?: PointerEvent): void {
	event?.preventDefault();
	pressed.delete(action);
	setVirtualAction(action, false);
}

function tap(action: string, event: PointerEvent, suppressClick = false): void {
	event.preventDefault();
	event.stopPropagation();
	triggerVirtualAction(action);
	if (suppressClick) suppressNextClick();
}

function suppressNextClick(): void {
	if (typeof window === "undefined") return;
	if (clickSuppressTimer !== undefined) window.clearTimeout(clickSuppressTimer);
	const prevent = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		window.removeEventListener("click", prevent, true);
		if (clickSuppressTimer !== undefined) window.clearTimeout(clickSuppressTimer);
		clickSuppressTimer = undefined;
	};
	window.addEventListener("click", prevent, true);
	clickSuppressTimer = window.setTimeout(() => {
		window.removeEventListener("click", prevent, true);
		clickSuppressTimer = undefined;
	}, 700);
}

function releaseAll(): void {
	for (const action of pressed) setVirtualAction(action, false);
	pressed.clear();
	clearVirtualActions();
}

function refreshDevice(): void {
	mobile.value = isMobileDevice();
	if (!mobile.value) releaseAll();
}

onMounted(() => {
	stopWatchingDevice = watchDeviceChange(refreshDevice);
	window.addEventListener("pointerup", releaseAll, { passive: false });
	window.addEventListener("pointercancel", releaseAll, { passive: false });
});

onUnmounted(() => {
	stopWatchingDevice();
	window.removeEventListener("pointerup", releaseAll);
	window.removeEventListener("pointercancel", releaseAll);
	if (clickSuppressTimer !== undefined) window.clearTimeout(clickSuppressTimer);
	releaseAll();
});
</script>

<template>
	<div v-if="shouldShow" class="mobile-controls" aria-label="触屏操作">
		<div
			v-if="showTapAdvance"
			class="mobile-tap-surface"
			aria-label="点击画面推进"
			@pointerdown="tap('ADVANCE', $event, true)"
		></div>
		<div class="mobile-dpad" aria-label="方向键">
			<button
				class="dpad-button dpad-up"
				aria-label="向上移动"
				@pointerdown="hold('MOVE_UP', $event)"
				@pointerup="release('MOVE_UP', $event)"
				@pointercancel="release('MOVE_UP', $event)"
				@pointerleave="release('MOVE_UP', $event)"
			>上</button>
			<button
				class="dpad-button dpad-left"
				aria-label="向左移动"
				@pointerdown="hold('MOVE_LEFT', $event)"
				@pointerup="release('MOVE_LEFT', $event)"
				@pointercancel="release('MOVE_LEFT', $event)"
				@pointerleave="release('MOVE_LEFT', $event)"
			>左</button>
			<button
				class="dpad-button dpad-right"
				aria-label="向右移动"
				@pointerdown="hold('MOVE_RIGHT', $event)"
				@pointerup="release('MOVE_RIGHT', $event)"
				@pointercancel="release('MOVE_RIGHT', $event)"
				@pointerleave="release('MOVE_RIGHT', $event)"
			>右</button>
			<button
				class="dpad-button dpad-down"
				aria-label="向下移动"
				@pointerdown="hold('MOVE_DOWN', $event)"
				@pointerup="release('MOVE_DOWN', $event)"
				@pointercancel="release('MOVE_DOWN', $event)"
				@pointerleave="release('MOVE_DOWN', $event)"
			>下</button>
		</div>

		<div class="mobile-action-pad">
			<button class="mobile-action" @pointerdown="tap('INTERACT', $event)">交互 E</button>
			<button class="mobile-action mobile-action-primary" @pointerdown="tap('ADVANCE', $event)">空格</button>
			<button
				v-if="hud.combatHud.visible"
				class="mobile-action mobile-action-combat"
				@pointerdown="tap('FIRE', $event)"
			>射击</button>
			<button class="mobile-action mobile-action-small" @pointerdown="tap('PAUSE', $event)">暂停 Esc</button>
		</div>
	</div>
</template>

<style scoped>
.mobile-controls {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	padding-top: max(0px, env(safe-area-inset-top));
	padding-right: max(14px, env(safe-area-inset-right));
	padding-bottom: max(14px, env(safe-area-inset-bottom));
	padding-left: max(14px, env(safe-area-inset-left));
	pointer-events: none;
	z-index: 31;
	user-select: none;
}

.mobile-dpad,
.mobile-action-pad {
	display: grid;
	gap: 6px;
	pointer-events: auto;
	position: relative;
	z-index: 2;
}

.mobile-tap-surface {
	position: absolute;
	inset: 0;
	pointer-events: auto;
	z-index: 1;
	touch-action: manipulation;
}

.mobile-dpad {
	position: relative;
	width: 132px;
	height: 132px;
	grid-template: repeat(3, 1fr) / repeat(3, 1fr);
}

.mobile-action-pad {
	width: 100px;
	grid-template-columns: repeat(2, 1fr);
}

.dpad-up { grid-area: 1 / 2; }
.dpad-left { grid-area: 2 / 1; }
.dpad-right { grid-area: 2 / 3; }
.dpad-down { grid-area: 3 / 2; }

button {
	min-height: 38px;
	border: 1px solid #b9975e;
	border-radius: 8px;
	background: #1e170fe6;
	color: #f8e7c0;
	box-shadow: 0 3px 10px #0008;
	font: 700 13px/1 "Noto Serif SC", serif;
	touch-action: none;
	-webkit-tap-highlight-color: transparent;
}

button:active {
	background: #74552a;
	transform: translateY(1px);
}

.mobile-action {
	min-height: 44px;
	padding: 4px;
	font-size: 11px;
}

.mobile-action-primary {
	border-color: #e2bd6b;
	background: #5a3d18e8;
}

.mobile-action-combat {
	border-color: #bd6b5a;
	background: #6a241ce8;
}

.mobile-action-small {
	grid-column: 1 / -1;
	min-height: 32px;
	font-size: 10px;
}

@media (orientation: landscape) and (max-height: 520px) {
	.mobile-controls { padding-bottom: 8px; }
	.mobile-dpad { width: 102px; height: 102px; }
	.mobile-action-pad { width: 86px; }
	.mobile-action { min-height: 34px; }
}
</style>
