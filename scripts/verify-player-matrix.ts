import {
	applyFormalChoice,
	calculatePortrait,
	createProfile,
	createRisk,
	getChapter3Access,
	type ChoiceRuntimeState,
	type FormalChoiceDefinition,
} from "../src/common/actionProfileSystem";
import { buildChapter3ActionFormalChoice } from "../src/scenes/Scene05/ch03ActionStart.content";
import { buildChapter3AfterBattleFormalChoice } from "../src/scenes/Scene05/ch03AfterBattle.content";
import { buildChapter3ClearingFormalChoice, buildChapter3MooncakeFormalChoice } from "../src/scenes/Scene05/ch03Aftermath.content";
import { buildChapter3Flashback3FormalChoice } from "../src/scenes/Scene05/ch03Flashback3.content";
import { buildChapter3GateEntryFormalChoice } from "../src/scenes/Scene05/ch03GateAttack.content";
import { buildChapter3ObservationFormalChoice } from "../src/scenes/Scene05/ch03Observation.content";
import { getCh04FinalChoice } from "../src/scenes/Scene06/ch04FinalChoice.content";

type Letter = "A" | "B" | "C" | "D";
type MatrixPath = {
	name: string;
	choices: {
		flashback: Letter;
		observation: Letter;
		action: Letter;
		gate: Letter;
		afterBattle: Letter;
		clearing: Letter;
		mooncake: Letter;
		final: Letter;
	};
};

const paths: MatrixPath[] = [
	{
		name: "A-审慎协同",
		choices: { flashback: "B", observation: "A", action: "B", gate: "B", afterBattle: "A", clearing: "B", mooncake: "B", final: "C" },
	},
	{
		name: "B-行动冒险",
		choices: { flashback: "D", observation: "D", action: "D", gate: "D", afterBattle: "D", clearing: "D", mooncake: "D", final: "A" },
	},
	{
		name: "C-组织协同",
		choices: { flashback: "B", observation: "B", action: "B", gate: "A", afterBattle: "A", clearing: "B", mooncake: "B", final: "B" },
	},
	{
		name: "D-原则担当",
		choices: { flashback: "A", observation: "C", action: "C", gate: "C", afterBattle: "B", clearing: "C", mooncake: "A", final: "D" },
	},
];

function makeState(): ChoiceRuntimeState {
	return { profile: createProfile(), risk: createRisk(), flags: new Set(), choice: null };
}

function requireChoice(choice: FormalChoiceDefinition | null, label: string): FormalChoiceDefinition {
	if (!choice) throw new Error(`${label} choice is unavailable for this permission`);
	return choice;
}

function apply(state: ChoiceRuntimeState, choice: FormalChoiceDefinition, label: string): string | null {
	const result = applyFormalChoice(state, choice);
	if (result.failure) return `${label}:${result.failure}`;
	return null;
}

function finalChoice(state: ChoiceRuntimeState, letter: Letter): void {
	const definition = getCh04FinalChoice(`FIN_Q01_${letter}`);
	if (!definition) throw new Error(`Final choice ${letter} is unavailable`);
	applyFormalChoice(state, {
		choiceId: definition.id,
		chapter: 4,
		isFormalChoice: true,
		portraitChange: definition.profileDelta,
		riskChange: {},
		flag: definition.flag,
		echoSummary: definition.echoSummary,
		failureCheck: false,
	});
}

const baseline = makeState();
const results = paths.map((path) => {
	const state = makeState();
	const { choices } = path;
	const failures: string[] = [];
	const steps: Array<[string, FormalChoiceDefinition | null]> = [
		["flashback", buildChapter3Flashback3FormalChoice(choices.flashback)],
		["observation", buildChapter3ObservationFormalChoice(`CH03_OBSERVATION_${choices.observation}`, { permission: "FORWARD_SUPPORT", coordinationRiskHigh: false })],
		["action", buildChapter3ActionFormalChoice(`CH03_ACTION_OBSERVE_${choices.action}`, { permission: "FORWARD_SUPPORT", coordinationRiskHigh: false })],
		["gate", buildChapter3GateEntryFormalChoice(`CH03_GATE_ENTRY_${choices.gate}`, { permission: "FORWARD_SUPPORT", coordinationRiskHigh: false })],
		["afterBattle", buildChapter3AfterBattleFormalChoice(`CH03_AFTER_BATTLE_${choices.afterBattle}`)],
		["clearing", buildChapter3ClearingFormalChoice(`CH03_CLEARING_${choices.clearing}`)],
		["mooncake", buildChapter3MooncakeFormalChoice(`CH03_MOONCAKE_${choices.mooncake}`)],
	];
	for (const [label, definition] of steps) {
		const failure = apply(state, requireChoice(definition, label), label);
		if (failure) {
			failures.push(failure);
			break;
		}
	}
	if (!failures.length) finalChoice(state, choices.final);
	const access = getChapter3Access(state.risk);
	return {
		name: path.name,
		profile: { ...state.profile },
		risk: { ...state.risk },
		portrait: calculatePortrait(state.profile).code,
		flags: [...state.flags].sort(),
		permission: access.permissions,
		failure: failures[0] ?? null,
	};
});

const baselineSnapshot = JSON.stringify({ profile: baseline.profile, risk: baseline.risk, flags: [...baseline.flags] });
if (JSON.stringify({ profile: baseline.profile, risk: baseline.risk, flags: [...baseline.flags] }) !== baselineSnapshot)
	throw new Error("player matrix baseline changed unexpectedly");
if (new Set(results.map((result) => `${result.portrait}|${JSON.stringify(result.risk)}|${result.failure}`)).size < 3)
	throw new Error("player matrix did not produce enough differentiated outcomes");

console.log(JSON.stringify({ results, baselineUnchanged: true, status: "PLAYER MATRIX PASS" }, null, 2));
