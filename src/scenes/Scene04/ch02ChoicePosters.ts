import { assetPath } from "@/common/paths";

export type Chapter2ChoiceNode = "GROUP" | "MATERIALS" | "FLASHBACK";
export type Chapter2ChoiceLetter = "A" | "B" | "C" | "D";

/**
 * 第二章三个正式选择的结果海报。按剧情节点命名，避免把“闪回选择”
 * 与章节内的时间顺序混为一谈；A-D 选择本身仍由各 content 文件维护。
 */
export const CH02_CHOICE_POSTER_PATHS = {
	GROUP: {
		A: assetPath("/assets/ch02/choices/group/group-A.png"),
		B: assetPath("/assets/ch02/choices/group/group-B.png"),
		C: assetPath("/assets/ch02/choices/group/group-C.png"),
		D: assetPath("/assets/ch02/choices/group/group-D.png"),
	},
	MATERIALS: {
		A: assetPath("/assets/ch02/choices/materials/materials-A.png"),
		B: assetPath("/assets/ch02/choices/materials/materials-B.png"),
		C: assetPath("/assets/ch02/choices/materials/materials-C.png"),
		D: assetPath("/assets/ch02/choices/materials/materials-D.png"),
	},
	FLASHBACK: {
		A: assetPath("/assets/ch02/choices/flashback/flashback-A.png"),
		B: assetPath("/assets/ch02/choices/flashback/flashback-B.png"),
		C: assetPath("/assets/ch02/choices/flashback/flashback-C.png"),
		D: assetPath("/assets/ch02/choices/flashback/flashback-D.png"),
	},
} as const;

export function chapter2ChoicePosterPath(
	node: Chapter2ChoiceNode,
	letter: Chapter2ChoiceLetter,
): string {
	return CH02_CHOICE_POSTER_PATHS[node][letter];
}
