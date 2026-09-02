<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useGameSaveStore } from "@/stores";
import { SCENE_RECAPS } from "@/common/sceneRecap";
import type { SceneId } from "@/types/common";

const props = defineProps<{ enabled?: boolean }>();
const hud = useHudStore();
const gameSave = useGameSaveStore();
const currentSceneId = ref<SceneId>(gameSave.getCurrentSceneId());
const sceneReady = ref(false);
const displayedSummary = ref("");
const streaming = ref(false);
let streamTimer: number | undefined;

// 这些节点是视频、转场或结果展示，不提供“场景回顾”入口，避免和既有流程抢输入。
const videoOnlyScenes = new Set<SceneId>([
	"CH02_TRANSITION",
	"CH02_FLASHBACK",
	"CH02_DEPARTURE",
	"CH03_OPENING",
	"CH03_FLASHBACK3",
	"CH03_END",
	"CH04_OPENING",
	"CH04_SCENE5_VIDEO",
	"CH04_PORTRAIT_RESULT",
]);

function isSceneId(value: unknown): value is SceneId {
	return typeof value === "string" && Object.prototype.hasOwnProperty.call(SCENE_RECAPS, value);
}

const activeRecap = computed(() => SCENE_RECAPS[hud.sceneRecap.sceneId]);

const showTrigger = computed(() =>
	Boolean(
		props.enabled &&
		(sceneReady.value || currentSceneId.value !== "PROLOGUE_SC01") &&
		!hud.sceneRecap.visible &&
		!hud.paused &&
		!hud.playerLocked &&
		!hud.sceneFade &&
		!hud.transition.active &&
		!hud.combatHud.visible &&
		!hud.overlay &&
		!hud.title.loadOpen &&
		!hud.title.settingsOpen &&
		!hud.endPanel &&
		!hud.portraitPanel &&
		!hud.creditsVisible &&
		!hud.resultPanelVisible &&
		!hud.choicePanel &&
		!hud.infoPanel &&
		!hud.itemPanel &&
		!hud.dialogue.visible &&
		!videoOnlyScenes.has(currentSceneId.value),
	),
);

function clearStream(): void {
	if (streamTimer !== undefined) window.clearInterval(streamTimer);
	streamTimer = undefined;
	streaming.value = false;
}

function startStream(): void {
	clearStream();
	displayedSummary.value = "";
	const chars = [...(activeRecap.value?.summary ?? "")];
	let cursor = 0;
	streaming.value = true;
	streamTimer = window.setInterval(() => {
		displayedSummary.value = chars.slice(0, ++cursor).join("");
		if (cursor >= chars.length) clearStream();
	}, 22);
}

function open(): void {
	hud.openSceneRecap(currentSceneId.value);
	startStream();
}

function close(): void {
	hud.closeSceneRecap();
	clearStream();
}

function onKeyDown(event: KeyboardEvent): void {
	if (!hud.sceneRecap.visible || !["Escape", "e", "E"].includes(event.key)) return;
	event.preventDefault();
	event.stopImmediatePropagation();
	close();
}

function onSceneCheckpoint(event: Event): void {
	const sceneId = (event as CustomEvent<{ sceneId?: unknown }>).detail?.sceneId;
	if (!isSceneId(sceneId)) return;
	currentSceneId.value = sceneId;
	if (sceneId !== "PROLOGUE_SC01") sceneReady.value = true;
	if (hud.sceneRecap.visible) hud.hideSceneRecap();
}

function onSceneEnter(event: Event): void {
	const sceneId = (event as CustomEvent<{ sceneId?: unknown }>).detail?.sceneId;
	if (!isSceneId(sceneId)) return;
	currentSceneId.value = sceneId;
	sceneReady.value = true;
	if (hud.sceneRecap.visible) hud.hideSceneRecap();
}

watch(
	() => hud.sceneRecap.visible,
	(visible) => {
		if (visible) startStream();
		else clearStream();
	},
);

onMounted(() => {
	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("honghu:scene-checkpoint", onSceneCheckpoint);
	window.addEventListener("honghu:scene-enter", onSceneEnter);
});

onUnmounted(() => {
	window.removeEventListener("keydown", onKeyDown, true);
	window.removeEventListener("honghu:scene-checkpoint", onSceneCheckpoint);
	window.removeEventListener("honghu:scene-enter", onSceneEnter);
	clearStream();
});
</script>

<template>
	<button
		v-if="showTrigger"
		class="scene-recap-trigger"
		type="button"
		title="查看本场景回顾"
		aria-label="查看本场景回顾"
		@click="open"
	>
		<span aria-hidden="true">▤</span>
		<span>回顾</span>
	</button>

	<div
		v-if="hud.sceneRecap.visible && activeRecap"
		class="scene-recap-panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby="scene-recap-title"
	>
		<section class="scene-recap-card">
			<div class="scene-recap-kicker">SCENE RECAP · 场景回顾</div>
			<h2 id="scene-recap-title">{{ activeRecap.title }}</h2>
			<p class="scene-recap-summary" aria-live="polite">
				{{ displayedSummary }}<span v-if="streaming" class="scene-recap-caret" aria-hidden="true">▍</span>
			</p>
			<div class="scene-recap-footer">
				<small>当前游戏已暂停 · 内容来自本场剧情</small>
				<button type="button" @click="close">返回游戏</button>
			</div>
		</section>
	</div>
</template>

<style scoped>
.scene-recap-trigger {
	position: absolute;
	right: max(18px, env(safe-area-inset-right));
	bottom: max(18px, env(safe-area-inset-bottom));
	z-index: 32;
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	min-height: 32px;
	padding: 4px 9px;
	border: 1px solid #b9975e;
	border-radius: 7px;
	background: #1e170fe6;
	color: #f6e6bd;
	font: 600 12px/1 "Noto Serif SC", serif;
	box-shadow: 0 3px 12px #0008;
	cursor: pointer;
	pointer-events: auto;
	touch-action: manipulation;
}

.scene-recap-trigger:hover,
.scene-recap-trigger:focus-visible {
	border-color: #e2bd6b;
	background: #5a3d18;
	outline: 2px solid #f2cd7c;
	outline-offset: 2px;
}

.scene-recap-trigger > span:first-child {
	font-size: 17px;
	line-height: 1;
}

.scene-recap-panel {
	position: absolute;
	inset: 0;
	z-index: 34;
	display: grid;
	place-items: center;
	padding: 16px;
	background: #050505b8;
	pointer-events: auto;
}

.scene-recap-card {
	width: min(620px, calc(100% - 32px));
	max-height: min(72vh, 500px);
	overflow: auto;
	padding: 24px 28px 20px;
	border: 1px solid #b18b50;
	border-radius: 10px;
	background: linear-gradient(145deg, #211a13f7, #0c0a08f5);
	box-shadow: 0 14px 44px #000d;
	color: #f5e8c3;
}

.scene-recap-kicker {
	color: #d3ad64;
	font-size: 10px;
	letter-spacing: 0.18em;
}

.scene-recap-card h2 {
	margin: 0.65rem 0 1rem;
	color: #f0d18d;
	font-size: clamp(1.2rem, 2.6vw, 1.8rem);
	letter-spacing: 0.1em;
}

.scene-recap-summary {
	min-height: 6em;
	margin: 0;
	color: #eadfc9;
	font-size: clamp(1rem, 1.7vw, 1.25rem);
	line-height: 1.9;
	letter-spacing: 0.04em;
	white-space: pre-wrap;
	text-indent: 2em;
}

.scene-recap-caret {
	color: #e2bd6b;
	animation: recap-blink 0.8s steps(1, end) infinite;
}

.scene-recap-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 20px;
	padding-top: 12px;
	border-top: 1px solid #6d5739;
	color: #bfae8d;
	font-size: 0.75rem;
}

.scene-recap-footer button {
	padding: 7px 13px;
	border: 1px solid #80623c;
	background: #251b12;
	color: #f8edcc;
	font: inherit;
	cursor: pointer;
}

.scene-recap-footer button:hover,
.scene-recap-footer button:focus-visible {
	border-color: #d3ad64;
	background: #3a2a18;
	outline: 2px solid #f2cd7c;
	outline-offset: 2px;
}

@keyframes recap-blink {
	50% {
		opacity: 0;
	}
}

@media (max-width: 850px) {
	.scene-recap-trigger {
		right: 118px;
		bottom: 156px;
	}

	.scene-recap-card {
		padding: 20px 18px 16px;
	}

	.scene-recap-footer {
		align-items: flex-end;
	}

	.scene-recap-footer small {
		max-width: 58%;
		line-height: 1.5;
	}
}

@media (prefers-reduced-motion: reduce) {
	.scene-recap-caret {
		animation: none;
	}
}
</style>
