<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

function onClose() {
	hud.closeItem();
}
</script>

<template>
	<div v-if="hud.itemPanel" class="item-panel">
		<img
			:src="hud.itemPanel.icon"
			:alt="hud.itemPanel.title"
			decoding="async"
			fetchpriority="high"
		/>
		<div>
			<strong>{{ hud.itemPanel.title }}</strong>
			<span>{{ hud.itemPanel.text }}</span>
		</div>
		<button type="button" @click="onClose">
			<kbd>E</kbd> 关闭
		</button>
	</div>
</template>

<style scoped>
.item-panel {
	position: absolute;
	left: 18px;
	top: clamp(98px, 18vh, 150px);
	width: min(164px, 13vw);
	min-width: 142px;
	aspect-ratio: 1263 / 2028;
	pointer-events: auto;
	/* 原始 1263×2028 版本保留；运行时使用同构半尺寸副本，适配当前 164px 卡片。 */
	background: url("/assets/ui/keyed/item-runtime.png") center / 100% 100% no-repeat;
	color: #211b15;
	z-index: 20;
}

.item-panel img {
	position: absolute;
	/* item.png 左上深色框约占面板左侧 44%；槽位按该框留出安全边界。 */
	left: 0;
	top: 14%;
	width: 56%;
	height: 32%;
	object-fit: contain;
	object-position: center;
	transform: scale(0.85);
	transform-origin: center;
}

.item-panel div {
	position: absolute;
	left: 12%;
	top: 52%;
	width: 76%;
}

.item-panel strong,
.item-panel span {
	display: block;
}

.item-panel strong {
	font-size: 10px;
}

.item-panel span {
	margin-top: 0.3rem;
	color: #3a3026;
	line-height: 1.3;
	font-size: 7px;
}

.item-panel button {
	position: absolute;
	right: 10%;
	bottom: 6%;
	padding: 0.15rem 0.25rem;
	background: transparent;
	border: 0;
	color: #4a3322;
	font-size: 8px;
	font: inherit;
	cursor: pointer;
}

kbd {
	display: inline-grid;
	place-items: center;
	min-width: 16px;
	height: 15px;
	padding: 0 3px;
	border: 1px solid #5a422a;
	border-radius: 4px;
	background: #f4e6c7;
	color: #332316;
	font:
		700 9px/1 "Noto Sans SC",
		"Microsoft YaHei UI",
		sans-serif;
	box-shadow: inset 0 -1px #b79764;
}

@media (max-width: 850px) {
	.item-panel {
		left: 10px;
		top: 58px;
		width: 140px;
	}
}
</style>
