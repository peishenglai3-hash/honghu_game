import { access, readFile, stat } from "node:fs/promises";

import.meta.env = { BASE_URL: "/", MODE: "test", DEV: false, PROD: false };

const assert = (condition, message) => {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exit(1);
	}
};

const { CHOICES } = await import("../src/scenes/Scene03/ch01Sc01.content.ts");
const { CHOICES2, EXIT_NARRATIVE } =
	await import("../src/scenes/Scene03/ch01Sc02.content.ts");
const { Q3_CHOICES, Q4_CHOICES } =
	await import("../src/scenes/Scene03/ch01Return.content.ts");
const { ENDING_NARRATIVE } =
	await import("../src/scenes/Scene03/ch01Return.content.ts");
const { CH01_CHOICE_POSTER_PATHS, chapter1ChoicePosterPath } =
	await import("../src/scenes/Scene03/ch01ChoicePosters.ts");

const root = new URL("../", import.meta.url);
const fileIsNonEmpty = async (relativePath) => {
	const url = new URL(relativePath, root);
	await access(url);
	return (await stat(url)).size > 0;
};

const pngInfo = async (relativePath) => {
	const bytes = await readFile(new URL(relativePath, root));
	assert(
		bytes.readUInt32BE(0) === 0x89504e47,
		`${relativePath} PNG signature`,
	);
	assert(bytes.toString("ascii", 12, 16) === "IHDR", `${relativePath} IHDR`);
	return {
		width: bytes.readUInt32BE(16),
		height: bytes.readUInt32BE(20),
		colorType: bytes[25],
	};
};

const letters = ["A", "B", "C", "D"];
const expectedPrefixes = {
	1: "CH01_Q01",
	2: "CH01_Q02",
	3: "CH01_Q3",
	4: "CH01_Q4",
};
const expectedIds = (node) =>
	letters.map((letter) => `${expectedPrefixes[node]}_${letter}`);
const choicesByNode = { 1: CHOICES, 2: CHOICES2, 3: Q3_CHOICES, 4: Q4_CHOICES };

for (const [node, choices] of Object.entries(choicesByNode)) {
	assert(choices.length === 4, `Q${node} choice count`);
	assert(
		choices.map((choice) => choice.id).join(",") ===
			expectedIds(node).join(","),
		`Q${node} A-D order and IDs`,
	);
	for (const letter of letters) {
		const path = chapter1ChoicePosterPath(`Q${node}`, letter);
		assert(
			path === CH01_CHOICE_POSTER_PATHS[`Q${node}`][letter],
			`Q${node}${letter} path map`,
		);
		assert(
			await fileIsNonEmpty(`public${path}`),
			`Q${node}${letter} poster exists`,
		);
		const info = await pngInfo(`public${path}`);
		assert(
			info.width === 1672 && info.height === 941,
			`Q${node}${letter} poster dimensions`,
		);
	}
}

for (const [index, choice] of CHOICES.entries()) {
	assert(
		choice.image === chapter1ChoicePosterPath("Q1", letters[index]),
		`Q1${letters[index]} content wiring`,
	);
}

const q1ResultText = CHOICES.map((choice) => choice.result.join("\n"));
assert(
	q1ResultText[0].includes("无处安放的担心") &&
		q1ResultText[0].includes("不用我自己想理由"),
	"Q1 A authored feedback complete",
);
assert(
	q1ResultText[1].includes("她停了停，又补了一句：") &&
		q1ResultText[1].includes("她只知道有人来找陈继南"),
	"Q1 B authored feedback complete",
);
assert(
	q1ResultText[2].includes("她没有起疑心") &&
		q1ResultText[2].includes("今晚确实打算出门"),
	"Q1 C authored feedback complete",
);
assert(
	EXIT_NARRATIVE.some(
		(entry) =>
			entry.text === "可是那种那种迟疑过后仍决定写下去的感觉，我还记得。",
	),
	"Q2 authored reflection preserved",
);
assert(
	Q3_CHOICES.find((choice) => choice.id === "CH01_Q3_D")?.feedback.some(
		(entry) => entry.text.includes("却已经察觉"),
	),
	"Q3 D authored feedback preserved",
);
assert(
	ENDING_NARRATIVE[0]?.text ===
		"门外的联络人已经转过身去，没有催促，只在夜色里等着。" &&
		ENDING_NARRATIVE[1]?.text ===
			"屋内，女人将油灯的灯芯拨低。她没有再叫“继南”。",
	"Q4 chapter ending handoff preserved",
);

const avatarInfo = await pngInfo(
	"public/assets/characters/prologue-player/avatar.png",
);
assert(
	avatarInfo.width === 256 && avatarInfo.height === 256,
	"modern avatar dimensions",
);
assert(avatarInfo.colorType === 6, "modern avatar has RGBA alpha channel");

console.log("PASS chapter 1 choice posters and modern avatar contract");
