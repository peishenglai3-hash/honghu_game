<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

const assetBase = import.meta.env.BASE_URL || "/";
const smoothAvatarIds = new Set(["ch02-chen", "ch01-fisherman"]);

function onPointerDown(event: PointerEvent) {
	if (event.pointerType !== "touch") return;
	event.preventDefault();
	hud.advanceNarrative();
}
</script>

<template>
	<div
		v-if="hud.dialogue.visible"
		class="dialogue-panel"
		:class="hud.dialogue.style"
		@pointerdown="onPointerDown"
		role="dialog"
		aria-live="polite"
		aria-label="剧情对话"
	>
		<div class="dialogue-left">
			<div
				class="dialogue-avatar-wrap"
				:class="{ hidden: !hud.dialogue.avatarSrc }"
			>
				<img
					v-if="hud.dialogue.avatarSrc"
					:src="`${assetBase}assets/characters/${hud.dialogue.avatarSrc}/avatar.png`"
					:alt="hud.dialogue.speaker"
					:class="{
						'dialogue-avatar-pixel': !smoothAvatarIds.has(
							hud.dialogue.avatarSrc,
						),
					}"
					decoding="async"
					fetchpriority="high"
				/>
			</div>
		</div>
		<div class="dialogue-speaker">{{ hud.dialogue.speaker }}</div>
		<div class="dialogue-copy">
			<div class="dialogue-text">{{ hud.dialogue.displayedText }}</div>
			<div class="dialogue-hint">{{ hud.dialogue.hint }}</div>
		</div>
	</div>
</template>

<style scoped>
.dialogue-panel {
	position: absolute;
	left: 50%;
	bottom: 20px;
	transform: translateX(-50%);
	/*
	 * The dialogue frame keeps its source aspect ratio. Reducing the width
	 * from 680px to 480px therefore reduces both dimensions proportionally,
	 * bringing the occupied screen area down to roughly half while keeping
	 * the text and portrait layout readable.
	 */
	width: min(480px, calc(100% - 32px));
	aspect-ratio: 2629 / 1398;
	pointer-events: auto;
	touch-action: manipulation;
	/* 原始 2629×1398 版本保留；对话框最大显示宽度为 480px。 */
	background: url("/assets/ui/keyed/dialogue-runtime.png") center / 100% 100%
		no-repeat;
	z-index: 20;
}

.dialogue-panel.dialogue {
	color: #8f2b1e;
}
.dialogue-panel.narration {
	color: #111;
}
.dialogue-panel.thought {
	color: #2e8b57;
}

.dialogue-left {
	position: absolute;
	left: 5.5%;
	top: 22.5%;
	width: 26%;
	height: 55%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4%;
}

.dialogue-left .dialogue-avatar-wrap {
	position: static;
	width: 100%;
	height: auto;
	flex: 1;
	min-height: 0;
	display: grid;
	place-items: center;
}

.dialogue-left .dialogue-avatar-wrap.hidden {
	visibility: hidden;
}

.dialogue-left .dialogue-avatar-wrap img {
	display: block;
	max-width: 92%;
	max-height: 92%;
	object-fit: contain;
}

.dialogue-left .dialogue-avatar-wrap img.dialogue-avatar-pixel {
	image-rendering: pixelated;
}

.dialogue-speaker {
	position: absolute;
	left: 5%;
	bottom: 9%;
	/* writing-mode: vertical-rl; */
	/* text-orientation: upright; */
	height: 10%;
	width: 27%;
	text-align: center;
	font-size: clamp(15px, 1.25vw, 20px);
	font-weight: 700;
	letter-spacing: 0.28em;
}

/* 旁白按剧本的“旁白栏 + 正文段落”呈现；对白仍保留原有底部署名。 */
.dialogue-panel.narration .dialogue-speaker {
	top: 50%;
	bottom: auto;
	height: auto;
	transform: translateY(-50%);
	letter-spacing: 0.12em;
}

.narration .dialogue-speaker {
	color: #7a5c33;
}
.thought .dialogue-speaker {
	color: #2e8b57;
}
.dialogue .dialogue-speaker {
	color: #8f2b1e;
}

.dialogue-panel .dialogue-copy {
	position: absolute;
	left: 34.5%;
	top: 23%;
	width: 60.5%;
	height: 63%;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.dialogue-panel .dialogue-text {
	flex: 1;
	font-size: 15px;
	line-height: 1.8;
	letter-spacing: 0.04em;
	text-align: justify;
	white-space: pre-wrap;
	text-shadow: 0 1px 0 #fff7;
}

.dialogue-panel.narration .dialogue-text {
	color: #111;
	text-align: center;
	text-indent: 2em;
}

.dialogue-panel.dialogue .dialogue-text {
	text-shadow: 0 1px 0 #fff9;
}

.dialogue-panel .dialogue-hint {
	align-self: flex-end;
	margin-top: 0.35rem;
	margin-right: 26px;
	margin-bottom: 2px;
	font-size: 12px;
	opacity: 0.7;
}

.narration .dialogue-text {
	text-shadow: 0 1px 0 #fff9;
}
.thought .dialogue-text {
	text-shadow: 0 1px 0 #d9ffe6;
}

@media (max-width: 850px) {
	.dialogue-panel {
		width: min(92%, 480px);
		bottom: 8px;
	}

	.dialogue-text {
		font-size: clamp(12px, 2.4vw, 17px);
	}
	.dialogue-speaker {
		font-size: 11px;
	}
}
</style>
