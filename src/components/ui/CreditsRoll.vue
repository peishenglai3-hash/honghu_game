<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { assetPath } from "@/common/paths";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";

const hud = useHudStore();
const director = useDirectorStore();
const finished = ref(false);
let finishTimer: number | undefined;

const backgroundImage = assetPath("/assets/credits/honghu-thanks.png");

const CREDIT_BLOCKS = [
	{ heading: "项目名称", body: "《红色源代码：洪湖篇》" },
	{ heading: "策划 / 导演", body: "红色源代码实践队" },
	{ heading: "剧本", body: "彭亚平、陈远洋、余一帆、周楚澜" },
	{ heading: "美术", body: "林洁文、刁泉荃、刘傲然、余一帆、赖培胜" },
	{ heading: "程序", body: "赖培胜、韦明熙、闵志凡、吴世扬、刘一霖" },
	{ heading: "UI / 场景 / 音频", body: "赖培胜" },
	{ heading: "调研支持", body: "“红色源代码”实践队全体队员" },
	{ heading: "指导老师", body: "彭亚平" },
	{ heading: "鸣谢单位", body: "华中科技大学马克思主义学院\n华中科技大学社会学院\n中国共产主义青年团洪湖市委员会" },
	{ heading: "特别感谢", body: "刘胜、陈载智、黎新娥" },
	{ heading: "致敬", body: "献给在洪湖这片红色土地上奋斗过的每一位革命者\n愿他们的故事被更多人听见，被更多人记住" },
];

function armCompletionTimer() {
	if (finishTimer !== undefined) window.clearTimeout(finishTimer);
	finished.value = false;
	if (hud.creditsVisible) {
		// 与 CSS 滚动时长保持一致；动画结束事件会先把按钮状态更新为完成。
		finishTimer = window.setTimeout(() => {
			finished.value = true;
		}, 48000);
	}
}

function finishCredits() {
	hud.hideCredits();
	director.goToTitle();
}

function onKeyDown(event: KeyboardEvent) {
	if (!hud.creditsVisible || event.key !== "Escape") return;
	event.preventDefault();
	event.stopImmediatePropagation();
	finishCredits();
}

function onAnimationEnd() {
	finished.value = true;
}

watch(() => hud.creditsVisible, armCompletionTimer);

onMounted(() => {
	window.addEventListener("keydown", onKeyDown, true);
	armCompletionTimer();
});

onUnmounted(() => {
	window.removeEventListener("keydown", onKeyDown, true);
	if (finishTimer !== undefined) window.clearTimeout(finishTimer);
});
</script>

<template>
	<div
		v-if="hud.creditsVisible"
		class="credits-roll"
		role="dialog"
		aria-modal="true"
		aria-label="游戏致谢"
	>
		<div
			class="credits-backdrop"
			aria-hidden="true"
			:style="{ backgroundImage: `url(${backgroundImage})` }"
		></div>
		<div class="credits-shade" aria-hidden="true"></div>
		<div class="credits-viewport">
			<div class="credits-content" @animationend="onAnimationEnd">
				<div class="credits-spacer" aria-hidden="true"></div>
				<section v-for="block in CREDIT_BLOCKS" :key="block.heading" class="credit-block">
					<h2>{{ block.heading }}</h2>
					<p>{{ block.body }}</p>
				</section>
				<div class="credits-finale">感谢你的游玩</div>
				<div class="credits-spacer credits-spacer-end" aria-hidden="true"></div>
			</div>
		</div>
		<div class="credits-footer">
			<span>{{ finished ? "致谢播放完毕" : "致谢滚动播放中" }} · Esc 返回初始界面</span>
			<button type="button" @click="finishCredits">返回初始界面</button>
		</div>
	</div>
</template>

<style scoped>
.credits-roll {
	position: fixed;
	inset: 0;
	overflow: hidden;
	background: #0b0d0d;
	color: #f4e5c2;
	pointer-events: auto;
	z-index: 80;
	touch-action: manipulation;
}

.credits-backdrop,
.credits-shade {
	position: absolute;
	inset: 0;
}

.credits-backdrop {
	background-position: center;
	background-size: cover;
	filter: saturate(0.78) sepia(0.14);
	opacity: 0.34;
}

.credits-shade {
	background:
		linear-gradient(180deg, #090a0bd9 0%, #090a0b4d 30%, #090a0b66 70%, #090a0be8 100%),
		radial-gradient(circle at 50% 46%, transparent 0%, #050606b8 88%);
}

.credits-viewport {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

.credits-content {
	position: absolute;
	left: 50%;
	width: min(780px, 88vw);
	transform: translate(-50%, 100%);
	text-align: center;
	animation: credits-scroll 48s linear forwards;
}

.credits-spacer {
	height: 100vh;
}

.credits-spacer-end {
	height: 75vh;
}

.credit-block {
	margin: 0 auto 34px;
}

.credit-block h2 {
	margin: 0 0 9px;
	color: #efca79;
	font-size: clamp(15px, 1.8vw, 23px);
	font-weight: 600;
	letter-spacing: 0.12em;
}

.credit-block p {
	margin: 0;
	white-space: pre-line;
	font-size: clamp(16px, 2vw, 25px);
	line-height: 1.85;
	text-shadow: 0 2px 10px #000;
}

.credits-finale {
	margin-top: 22px;
	color: #f1d38c;
	font-size: clamp(20px, 2.6vw, 32px);
	letter-spacing: 0.16em;
	text-shadow: 0 2px 12px #000;
}

.credits-footer {
	position: absolute;
	right: max(16px, env(safe-area-inset-right));
	bottom: max(14px, env(safe-area-inset-bottom));
	left: max(16px, env(safe-area-inset-left));
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	color: #e4d4b3;
	font-size: clamp(10px, 1.2vw, 13px);
	text-shadow: 0 1px 5px #000;
}

.credits-footer button {
	padding: 8px 13px;
	border: 1px solid #bd9859;
	background: #21190fe8;
	color: #f7e7bf;
	cursor: pointer;
	touch-action: manipulation;
}

.credits-footer button:hover,
.credits-footer button:focus-visible {
	background: #5b3f1d;
	outline: 2px solid #f1cf84;
	outline-offset: 2px;
}

@keyframes credits-scroll {
	from { transform: translate(-50%, 100%); }
	to { transform: translate(-50%, -100%); }
}

@media (max-width: 620px) {
	.credits-content {
		width: min(88vw, 560px);
	}

	.credit-block {
		margin-bottom: 26px;
	}

	.credits-footer {
		align-items: flex-end;
		font-size: 10px;
	}

	.credits-footer span {
		max-width: 55%;
	}
}

@media (prefers-reduced-motion: reduce) {
	.credits-content {
		animation-duration: 12s;
	}
}
</style>
