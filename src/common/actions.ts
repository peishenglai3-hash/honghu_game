export const ACTIONS: Record<string, string[]> = {
	MOVE_UP: ["W", "UP"],
	MOVE_DOWN: ["S", "DOWN"],
	MOVE_LEFT: ["A", "LEFT"],
	MOVE_RIGHT: ["D", "RIGHT"],
	INTERACT: ["E"],
	ADVANCE: ["SPACE"],
	FIRE: ["SPACE"],
	SWAP_WEAPON: ["Q"],
	PAUSE: ["ESC"],
};

// 触屏输入只作为现有键盘动作的外围桥接，不改变场景规则。
// 移动动作读取 virtualActionState；交互/推进等边沿动作通过监听器触发。
const virtualActionState: Record<string, boolean> = {};
const virtualActionListeners = new Map<string, Set<() => void>>();

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
	for (const name of ACTIONS[action] ?? []) keyboard?.on(`keydown-${name}`, handler);
	const listeners = virtualActionListeners.get(action) ?? new Set<() => void>();
	listeners.add(handler);
	virtualActionListeners.set(action, listeners);

	const cleanup = () => {
		for (const name of ACTIONS[action] ?? []) keyboard?.off(`keydown-${name}`, handler);
		listeners.delete(handler);
		if (!listeners.size) virtualActionListeners.delete(action);
	};
	scene.events.once("shutdown", cleanup);
	scene.events.once("destroy", cleanup);
}
