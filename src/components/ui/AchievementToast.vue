<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { AchievementUnlock } from "@/common/achievementSystem";

const visible = ref(false);
const achievement = ref<AchievementUnlock | null>(null);
const queue = ref<AchievementUnlock[]>([]);
let hideTimer: number | undefined;
let nextTimer: number | undefined;

function showNext() {
	if (visible.value || !queue.value.length) return;
	achievement.value = queue.value.shift() ?? null;
	if (achievement.value) visible.value = true;
}

function onUnlocked(event: Event) {
	const detail = (event as CustomEvent<AchievementUnlock>).detail;
	if (!detail) return;
	queue.value.push(detail);
	if (nextTimer !== undefined) window.clearTimeout(nextTimer);
	showNext();
	if (hideTimer !== undefined) window.clearTimeout(hideTimer);
	// Toast 只做反馈，不阻断对话、选择或场景推进。
	hideTimer = window.setTimeout(() => {
		visible.value = false;
		nextTimer = window.setTimeout(showNext, 220);
	}, 5200);
}

onMounted(() => window.addEventListener("honghu:achievement-unlocked", onUnlocked));
onUnmounted(() => {
	window.removeEventListener("honghu:achievement-unlocked", onUnlocked);
	if (hideTimer !== undefined) window.clearTimeout(hideTimer);
	if (nextTimer !== undefined) window.clearTimeout(nextTimer);
});
</script>

<template>
	<Transition name="achievement-toast">
		<aside v-if="visible && achievement" class="achievement-toast" role="status" aria-live="polite">
			<div class="achievement-kicker">成就解锁</div>
			<strong>{{ achievement.title }}</strong>
			<span>{{ achievement.description }}</span>
			<small>{{ achievement.reward }}</small>
		</aside>
	</Transition>
</template>

<style scoped>
.achievement-toast {
	position: fixed;
	top: max(18px, env(safe-area-inset-top));
	left: 50%;
	z-index: 90;
	display: grid;
	gap: 3px;
	width: min(330px, calc(100vw - 32px));
	padding: 12px 16px;
	transform: translateX(-50%);
	border: 1px solid #c79b52;
	border-radius: 8px;
	background: linear-gradient(135deg, #2b2115f2, #11100df5);
	box-shadow: 0 8px 28px #000b;
	color: #f6e9ca;
	pointer-events: none;
	text-align: center;
}

.achievement-kicker {
	color: #e5bb66;
	font-size: 10px;
	letter-spacing: 0.2em;
}

.achievement-toast strong {
	font-size: 17px;
	letter-spacing: 0.1em;
}

.achievement-toast span,
.achievement-toast small {
	font-size: 11px;
	line-height: 1.45;
	color: #d7c6a5;
}

.achievement-toast small {
	color: #ad9467;
}

.achievement-toast-enter-active,
.achievement-toast-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.achievement-toast-enter-from,
.achievement-toast-leave-to {
	opacity: 0;
	transform: translate(-50%, -12px);
}
</style>
