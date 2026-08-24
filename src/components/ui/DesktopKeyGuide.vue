<script setup lang="ts">
import { ref } from "vue";

const expanded = ref(false);

function toggle() {
	expanded.value = !expanded.value;
}
</script>

<template>
	<aside class="desktop-key-guide" aria-label="电脑端操作提示">
		<button
			class="key-guide-toggle"
			type="button"
			:aria-expanded="expanded"
			aria-controls="desktop-key-guide-details"
			@click.stop="toggle"
		>
			<strong>操作提示</strong>
			<span>{{ expanded ? "收起操作提示" : "点击查看操作提示" }}</span>
		</button>
		<div
			v-if="expanded"
			id="desktop-key-guide-details"
			class="key-guide-details"
		>
			<div class="key-guide-row">
				<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
				<span>移动</span>
			</div>
			<div class="key-guide-row"><kbd>E</kbd><span>交互</span></div>
			<div class="key-guide-row"><kbd>空格</kbd><span>推进</span></div>
			<div class="key-guide-row"><kbd>Esc</kbd><span>暂停</span></div>
		</div>
	</aside>
</template>

<style scoped>
.desktop-key-guide {
	position: absolute;
	top: clamp(8px, 1.6vh, 14px);
	left: clamp(8px, 1.6vw, 18px);
	width: min(170px, 14vw);
	min-width: 128px;
	padding: 5px 8px;
	border: 1px solid #aa8d59aa;
	border-radius: 6px;
	background: #17120dd9;
	color: #e8d7b5;
	box-shadow: 0 3px 12px #0008;
	font-size: clamp(8px, 0.68vw, 10px);
	line-height: 1.2;
	pointer-events: auto;
	z-index: 19;
}

.key-guide-toggle {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	width: 100%;
	gap: 8px;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.key-guide-toggle strong {
	color: #f1d48f;
	font-size: 1.05em;
	letter-spacing: 0.08em;
}

.key-guide-toggle span {
	color: #cbb994;
	font-size: 0.92em;
	white-space: nowrap;
}

.key-guide-details {
	margin-top: 5px;
	padding-top: 4px;
	border-top: 1px solid #aa8d5944;
}

.key-guide-row {
	display: flex;
	align-items: center;
	gap: 3px;
	margin-top: 3px;
}

.key-guide-row span {
	margin-left: 3px;
	white-space: nowrap;
}

kbd {
	display: inline-grid;
	place-items: center;
	min-width: 16px;
	height: 15px;
	padding: 0 2px;
	border: 1px solid #725a38;
	border-radius: 3px;
	background: #eee0be;
	color: #382919;
	font:
		700 9px/1 "Noto Sans SC",
		"Microsoft YaHei UI",
		sans-serif;
}
</style>
