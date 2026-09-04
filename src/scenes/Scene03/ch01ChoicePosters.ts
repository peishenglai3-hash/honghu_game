import { assetPath } from "@/common/paths";

export type Chapter1ChoiceNode = "Q1" | "Q2" | "Q3" | "Q4";
export type Chapter1ChoiceLetter = "A" | "B" | "C" | "D";

/**
 * 第一章四个正式选择的结果海报。按节点分目录，避免覆盖序章沿用的
 * /assets/choices/a-d.png；选择 ID、文本和数值仍由各自 content 文件维护。
 */
export const CH01_CHOICE_POSTER_PATHS = {
	Q1: {
		A: assetPath("/assets/ch01/choices/response/response-A.png"),
		B: assetPath("/assets/ch01/choices/response/response-B.png"),
		C: assetPath("/assets/ch01/choices/response/response-C.png"),
		D: assetPath("/assets/ch01/choices/response/response-D.png"),
	},
	Q2: {
		A: assetPath("/assets/ch01/choices/flashback/flashback-A.png"),
		B: assetPath("/assets/ch01/choices/flashback/flashback-B.png"),
		C: assetPath("/assets/ch01/choices/flashback/flashback-C.png"),
		D: assetPath("/assets/ch01/choices/flashback/flashback-D.png"),
	},
	Q3: {
		A: assetPath("/assets/ch01/choices/door-code/door-code-A.png"),
		B: assetPath("/assets/ch01/choices/door-code/door-code-B.png"),
		C: assetPath("/assets/ch01/choices/door-code/door-code-C.png"),
		D: assetPath("/assets/ch01/choices/door-code/door-code-D.png"),
	},
	Q4: {
		A: assetPath("/assets/ch01/choices/farewell/farewell-A.png"),
		B: assetPath("/assets/ch01/choices/farewell/farewell-B.png"),
		C: assetPath("/assets/ch01/choices/farewell/farewell-C.png"),
		D: assetPath("/assets/ch01/choices/farewell/farewell-D.png"),
	},
} as const;

export function chapter1ChoicePosterPath(
	node: Chapter1ChoiceNode,
	letter: Chapter1ChoiceLetter,
): string {
	return CH01_CHOICE_POSTER_PATHS[node][letter];
}
