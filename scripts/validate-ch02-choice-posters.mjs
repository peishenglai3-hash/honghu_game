import { access, readFile, stat } from "node:fs/promises";

import.meta.env = { BASE_URL: "/", MODE: "test", DEV: false, PROD: false };

const assert = (condition, message) => {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exit(1);
	}
};

const { CH02_GROUP_CHOICES } =
	await import("../src/scenes/Scene04/ch02Discipline.content.ts");
const { CH02_MATERIALS_CHOICES } =
	await import("../src/scenes/Scene04/ch02Materials.content.ts");
const { CH02_FLASHBACK_CHOICES } =
	await import("../src/scenes/Scene04/ch02Flashback.content.ts");
const { CH02_CHOICE_POSTER_PATHS, chapter2ChoicePosterPath } =
	await import("../src/scenes/Scene04/ch02ChoicePosters.ts");

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
	};
};

const letters = ["A", "B", "C", "D"];
const choicesByNode = {
	GROUP: CH02_GROUP_CHOICES,
	MATERIALS: CH02_MATERIALS_CHOICES,
	FLASHBACK: CH02_FLASHBACK_CHOICES,
};

for (const [node, choices] of Object.entries(choicesByNode)) {
	assert(choices.length === letters.length, `${node} choice count`);
	assert(
		choices.map((choice) => choice.id).join(",") === letters.join(","),
		`${node} A-D order`,
	);
	for (const letter of letters) {
		const path = chapter2ChoicePosterPath(node, letter);
		assert(
			path === CH02_CHOICE_POSTER_PATHS[node][letter],
			`${node}${letter} path map`,
		);
		assert(
			await fileIsNonEmpty(`public${path}`),
			`${node}${letter} poster exists`,
		);
		const info = await pngInfo(`public${path}`);
		assert(
			info.width >= 1280 && info.height >= 720,
			`${node}${letter} poster dimensions`,
		);
		assert(
			Math.abs(info.width / info.height - 16 / 9) < 0.002,
			`${node}${letter} poster aspect ratio`,
		);
	}
}

console.log("PASS chapter 2 choice poster contract");
