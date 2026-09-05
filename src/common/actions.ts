export const ACTIONS: Record<string, string[]> = {
	MOVE_UP: ["W", "UP"],
	MOVE_DOWN: ["S", "DOWN"],
	MOVE_LEFT: ["A", "LEFT"],
	MOVE_RIGHT: ["D", "RIGHT"],
	INTERACT: ["E"],
	ADVANCE: ["SPACE"],
	FIRE: ["SPACE"],
	// Q 只负责任务面板的显示/收起；保留 SWAP_WEAPON 的同键绑定，
	// 战斗场景仍可按原规则换武器，任务面板由全局 HUD 处理。
	TASK_TOGGLE: ["Q"],
	SWAP_WEAPON: ["Q"],
	PAUSE: ["ESC"],
};

// 触屏输入只作为现有键盘动作的外围桥接，不改变场景规则。
// 移动动作读取 virtualActionState；交互/推进等边沿动作通过监听器触发。
const virtualActionState: Record<string, boolean> = {};
const virtualActionListeners = new Map<string, Set<() => void>>();

function addVirtualActionListener(action: string, handler: () => void): () => void {
	const listeners = virtualActionListeners.get(action) ?? new Set<() => void>();
	listeners.add(handler);
	virtualActionListeners.set(action, listeners);
	return () => {
		listeners.delete(handler);
		if (!listeners.size) virtualActionListeners.delete(action);
	};
}

function actionCode(name: string): string {
	const codes: Record<string, string> = {
		SPACE: "Space",
		ESC: "Escape",
		UP: "ArrowUp",
		DOWN: "ArrowDown",
		LEFT: "ArrowLeft",
		RIGHT: "ArrowRight",
	};
	return codes[name] ?? (/^[A-Z]$/.test(name) ? `Key${name}` : name);
}

function isEditableTarget(target: EventTarget | null): boolean {
	const element = target as HTMLElement | null;
	return Boolean(
		element &&
		(["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) ||
			element.isContentEditable),
	);
}

/**
 * Registers an app-level edge action for controls that must survive scene
 * changes. The virtual listener keeps the same action available to touch UI.
 */
export function onGlobalAction(action: string, handler: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	const onKeyDown = (event: KeyboardEvent) => {
		if (
			event.repeat ||
			event.defaultPrevented ||
			isEditableTarget(event.target) ||
			!(ACTIONS[action] ?? []).some((name) => event.code === actionCode(name))
		)
			return;
		// Q 没有浏览器默认行为；保留事件传播，避免截断战斗场景已有的
		// SWAP_WEAPON 同键动作。
		handler();
	};
	window.addEventListener("keydown", onKeyDown);
	const removeVirtualListener = addVirtualActionListener(action, handler);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
		removeVirtualListener();
	};
}

export function setVirtualAction(action: string, isDown: boolean): void {
	virtualActionState[action] = isDown;
}

export function triggerVirtualAction(action: string): void {
	virtualActionState[action] = true;
	for (const handler of virtualActionListeners.get(action) ?? []) handler();
	virtualActionState[action] = false;
}

export function clearVirtualActions(): void {
	for (const action of Object.keys(virtualActionState)) virtualActionState[action] = false;
}

export function createKeyMap(
	scene: Phaser.Scene,
): Record<string, Phaser.Input.Keyboard.Key> {
	const names = [...new Set(Object.values(ACTIONS).flat())];
	return scene.input.keyboard?.addKeys(names.join(","), false) as Record<
		string,
		Phaser.Input.Keyboard.Key
	> ?? {};
}

export function isActionDown(
	keyMap: Record<string, Phaser.Input.Keyboard.Key>,
	action: string,
): boolean {
	return virtualActionState[action] === true ||
		(ACTIONS[action] ?? []).some((name) => keyMap[name]?.isDown);
}

export function onAction(
	scene: Phaser.Scene,
	action: string,
	handler: () => void,
): void {
	const keyboard = scene.input.keyboard;
	const keyboardHandlers = new Map<string, (event: KeyboardEvent) => void>();
	for (const name of ACTIONS[action] ?? []) {
		const keyboardHandler = (event: KeyboardEvent) => {
			// Phaser's keyboard repeat should never advance/close two UI stages.
			if (event.repeat) return;
			handler();
		};
		keyboardHandlers.set(name, keyboardHandler);
		keyboard?.on(`keydown-${name}`, keyboardHandler);
	}
	const removeVirtualListener = addVirtualActionListener(action, handler);

	const cleanup = () => {
		for (const [name, keyboardHandler] of keyboardHandlers)
			keyboard?.off(`keydown-${name}`, keyboardHandler);
		removeVirtualListener();
	};
	scene.events.once("shutdown", cleanup);
	scene.events.once("destroy", cleanup);
}
