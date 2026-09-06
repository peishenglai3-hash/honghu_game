import Phaser from "phaser";

type SceneConstructor = typeof Phaser.Scene;
type SceneLoader = () => Promise<SceneConstructor>;

/**
 * Chapter scene loaders stay outside the boot bundle.  The initial title and
 * prologue scenes remain registered eagerly; later chapters are registered
 * only when the director is about to enter them.
 */
const SCENE_LOADERS: Record<string, SceneLoader> = {
	Ch01Sc01Scene: async () => (await import("@/scenes/Scene03/Ch01Sc01Scene")).Ch01Sc01Scene,
	Ch01Sc02Scene: async () => (await import("@/scenes/Scene03/Ch01Sc02Scene")).Ch01Sc02Scene,
	Ch01Sc03Scene: async () => (await import("@/scenes/Scene03/Ch01Sc03Scene")).Ch01Sc03Scene,
	Ch02TransitionScene: async () => (await import("@/scenes/Scene04/Ch02TransitionScene")).Ch02TransitionScene,
	Ch02AncestralHallScene: async () => (await import("@/scenes/Scene04/Ch02AncestralHallScene")).Ch02AncestralHallScene,
	Ch02FlashbackScene: async () => (await import("@/scenes/Scene04/Ch02FlashbackScene")).Ch02FlashbackScene,
	Ch02DepartureScene: async () => (await import("@/scenes/Scene04/Ch02DepartureScene")).Ch02DepartureScene,
	Ch03OpeningScene: async () => (await import("@/scenes/Scene05/Ch03OpeningScene")).Ch03OpeningScene,
	Ch03Flashback3Scene: async () => (await import("@/scenes/Scene05/Ch03Flashback3Scene")).Ch03Flashback3Scene,
	Ch03TuCompoundScene: async () => (await import("@/scenes/Scene05/Ch03TuCompoundScene")).Ch03TuCompoundScene,
	Ch03GateBreachCombatScene: async () =>
		(await import("@/scenes/Scene05/Ch03GateBreachCombatScene")).Ch03GateBreachCombatScene,
	Ch03HistoricalNodeScene: async () => (await import("@/scenes/Scene05/Ch03HistoricalNodeScene")).Ch03HistoricalNodeScene,
	Ch03ChapterEndScene: async () => (await import("@/scenes/Scene05/Ch03ChapterEndScene")).Ch03ChapterEndScene,
	Ch04OpeningScene: async () => (await import("@/scenes/Scene06/Ch04OpeningScene")).Ch04OpeningScene,
	Ch04WangyeTempleScene: async () => (await import("@/scenes/Scene06/Ch04WangyeTempleScene")).Ch04WangyeTempleScene,
	Ch04ConsciousnessScene: async () => (await import("@/scenes/Scene06/Ch04ConsciousnessScene")).Ch04ConsciousnessScene,
	Ch04ModernReturnScene: async () => (await import("@/scenes/Scene06/Ch04ModernReturnScene")).Ch04ModernReturnScene,
	Ch04FinalChoiceScene: async () => (await import("@/scenes/Scene06/Ch04FinalChoiceScene")).Ch04FinalChoiceScene,
	Ch04AnswerWrittenScene: async () => (await import("@/scenes/Scene06/Ch04AnswerWrittenScene")).Ch04AnswerWrittenScene,
	Ch04Scene5VideoScene: async () => (await import("@/scenes/Scene06/Ch04Scene5VideoScene")).Ch04Scene5VideoScene,
	Ch04PortraitScene: async () => (await import("@/scenes/Scene06/Ch04PortraitScene")).Ch04PortraitScene,
};

export async function ensureSceneRegistered(game: Phaser.Game, key: string): Promise<void> {
	if (game.scene.getScene(key)) return;

	const loadScene = SCENE_LOADERS[key];
	if (!loadScene) throw new Error(`No lazy scene loader registered for ${key}`);

	const SceneClass = await loadScene();
	if (!game.scene.getScene(key)) game.scene.add(key, SceneClass, false);
}
