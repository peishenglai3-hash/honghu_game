/**
 * 外围成就记录：只观察既有剧情旗标和场景完成点，不写入或修改风险、画像、选择结果。
 * 成就存储独立于 RunSave，避免改变现有存档版本和章节回退语义。
 */

export type AchievementId =
	| "PROLOGUE_RECORD"
	| "CH01_COMPLETE"
	| "CH02_DISCIPLINE"
	| "SUPPLY_KEEPER"
	| "THREE_ROADS"
	| "MOONCAKE_MEMORY"
	| "WANGYE_WITNESS"
	| "ANSWER_WRITTEN"
	| "STORY_COMPLETE";

export interface AchievementDefinition {
	id: AchievementId;
	title: string;
	description: string;
	reward: string;
}

export interface AchievementUnlock extends AchievementDefinition {
	unlockedAt: number;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
	{
		id: "PROLOGUE_RECORD",
		title: "把名字留下",
		description: "完成序章，开始记录这段历史。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "CH01_COMPLETE",
		title: "问题没有写完",
		description: "完成第一章，带着问题继续前行。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "CH02_DISCIPLINE",
		title: "听清纪律",
		description: "完成陈家祠堂的部署与分组。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "SUPPLY_KEEPER",
		title: "手上的事",
		description: "在行动前完成一次物资整理或搬运。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "THREE_ROADS",
		title: "三路合拢",
		description: "见证杜家大院行动的三路结果汇合。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "MOONCAKE_MEMORY",
		title: "中秋余温",
		description: "在行动之后决定如何处理那块月饼。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "WANGYE_WITNESS",
		title: "太阳底下",
		description: "见证王爷庙前新的规矩被说给众人听。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "ANSWER_WRITTEN",
		title: "写下答案",
		description: "补完序章留下的那句话。",
		reward: "解锁一枚旅程徽章",
	},
	{
		id: "STORY_COMPLETE",
		title: "故事走到这里",
		description: "完成画像结算，走完《红色源代码：洪湖篇》。",
		reward: "解锁最终通关徽章",
	},
];

const STORAGE_KEY = "redcode.achievements.v1";
const BACKUP_STORAGE_KEY = "redcode.achievements.v1.backup";
const DEFINITIONS = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

function parseStoredIds(raw: string | null): Set<AchievementId> | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return null;
		return new Set(
			parsed.filter((id): id is AchievementId => typeof id === "string" && DEFINITIONS.has(id as AchievementId)),
		);
	} catch {
		return null;
	}
}

function readStoredIds(): Set<AchievementId> {
	try {
		if (typeof window === "undefined") return new Set();
		return parseStoredIds(window.localStorage.getItem(STORAGE_KEY))
			?? parseStoredIds(window.localStorage.getItem(BACKUP_STORAGE_KEY))
			?? new Set();
	} catch {
		return new Set();
	}
}

function writeStoredIds(ids: Set<AchievementId>): void {
	try {
		if (typeof window !== "undefined") {
			const serialized = JSON.stringify([...ids]);
			window.localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
			window.localStorage.setItem(STORAGE_KEY, serialized);
		}
	} catch {
		/* 存储不可用时，成就仍可在本次会话内显示。 */
	}
}

function hasAny(flags: Set<string>, candidates: readonly string[]): boolean {
	return candidates.some((flag) => flags.has(flag));
}

function matches(id: AchievementId, flags: Set<string>, sceneId?: string): boolean {
	switch (id) {
		case "PROLOGUE_RECORD":
			return flags.has("PROLOGUE_COMPLETED") || flags.has("TIME_TRAVEL_CHECKPOINT");
		case "CH01_COMPLETE":
			return flags.has("CH01_CHAPTER_COMPLETE");
		case "CH02_DISCIPLINE":
			return flags.has("CH02_DISCIPLINE_COMPLETE");
		case "SUPPLY_KEEPER":
			return flags.has("SUPPLY_HANDLED");
		case "THREE_ROADS":
			return flags.has("CH03_CHAPTER_END_COMPLETE");
		case "MOONCAKE_MEMORY":
			return hasAny(flags, ["MOONCAKE_SHARED", "MOONCAKE_GROUP", "MOONCAKE_SELF", "MOONCAKE_KEPT"]);
		case "WANGYE_WITNESS":
			return flags.has("CH04_SCENE1_COMPLETE");
		case "ANSWER_WRITTEN":
			return flags.has("CH04_SCENE5_COMPLETE");
		case "STORY_COMPLETE":
			return flags.has("CH04_SCENE5_VIDEO_COMPLETE") && sceneId === "CH04_PORTRAIT_RESULT";
	}
}

export function syncAchievements(flags: Iterable<string>, sceneId?: string): AchievementUnlock[] {
	const flagSet = new Set(flags);
	const unlocked = readStoredIds();
	const newlyUnlocked: AchievementUnlock[] = [];
	for (const achievement of ACHIEVEMENTS) {
		if (unlocked.has(achievement.id) || !matches(achievement.id, flagSet, sceneId)) continue;
		unlocked.add(achievement.id);
		const result: AchievementUnlock = { ...achievement, unlockedAt: Date.now() };
		newlyUnlocked.push(result);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("honghu:achievement-unlocked", { detail: result }));
		}
	}
	if (newlyUnlocked.length) writeStoredIds(unlocked);
	return newlyUnlocked;
}

export function getAchievementSnapshot(): { unlocked: AchievementId[]; total: number } {
	return { unlocked: [...readStoredIds()], total: ACHIEVEMENTS.length };
}
