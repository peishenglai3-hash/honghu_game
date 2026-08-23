<template>
	<aside class="desktop-key-guide" aria-label="电脑端操作提示">
		<strong>电脑端操作</strong>
		<div class="key-guide-row">
			<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
			<span>移动</span>
		</div>
		<div class="key-guide-row"><kbd>E</kbd><span>交互</span></div>
		<div class="key-guide-row"><kbd>空格</kbd><span>推进</span></div>
		<div class="key-guide-row"><kbd>Esc</kbd><span>暂停</span></div>
	</aside>
</template>

<style scoped>
.desktop-key-guide {
	position: absolute;
	top: clamp(8px, 1.6vh, 14px);
	left: clamp(8px, 1.6vw, 18px);
	width: min(180px, 14vw);
	min-width: 128px;
	padding: 7px 9px;
	border: 1px solid #aa8d59aa;
	border-radius: 6px;
	background: #17120dd9;
	color: #e8d7b5;
	box-shadow: 0 3px 12px #0008;
	font-size: clamp(8px, 0.72vw, 11px);
	line-height: 1.2;
	pointer-events: none;
	z-index: 19;
}

.desktop-key-guide strong {
	display: block;
	margin-bottom: 4px;
	color: #f1d48f;
	font-size: 1.05em;
	letter-spacing: 0.08em;
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
	font: 700 9px/1 Georgia, serif;
}
</style>
