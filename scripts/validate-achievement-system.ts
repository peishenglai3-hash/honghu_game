import {
	getAchievementSnapshot,
	syncAchievements,
} from "../src/common/achievementSystem";

const data = new Map<string, string>();
const events: string[] = [];

(globalThis as any).window = {
	localStorage: {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => data.set(key, value),
	},
	dispatchEvent: (event: CustomEvent<{ id: string }>) => {
		events.push(event.detail.id);
		return true;
	},
};

const assert = (condition: unknown, message: string): asserts condition => {
	if (!condition) throw new Error(message);
};

assert(syncAchievements(["CH03_GATE_BREACH_COMPLETE"]).length === 0, "early combat flag unlocked an achievement");
const first = syncAchievements(["CH03_CHAPTER_END_COMPLETE", "SUPPLY_HANDLED"]);
assert(first.some((item) => item.id === "THREE_ROADS"), "chapter-end achievement did not unlock");
assert(first.some((item) => item.id === "SUPPLY_KEEPER"), "supply achievement did not unlock");
assert(syncAchievements(["CH03_CHAPTER_END_COMPLETE", "SUPPLY_HANDLED"]).length === 0, "duplicate achievement unlocked");

data.set("redcode.achievements.v1", "not-json");
const recovered = getAchievementSnapshot();
assert(recovered.unlocked.includes("THREE_ROADS"), "achievement backup did not recover a damaged primary store");
assert(events.length === 2, "achievement events were not emitted exactly once");

console.log(JSON.stringify({ status: "ACHIEVEMENT SYSTEM PASS", unlocked: recovered.unlocked, total: recovered.total }));
