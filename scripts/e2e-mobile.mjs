// e2e-mobile.mjs — 移动端横屏提示、触屏推进、最终选择图片翻页专项验收
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5192";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_mobile\\";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
	userAgent:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
});
await page.addInitScript(() => {
	localStorage.clear();
	sessionStorage.clear();
});

async function waitFor(predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function tapAdvanceUntil(predicate, limit = 180) {
	for (let i = 0; i < limit; i += 1) {
		if (await page.evaluate(predicate)) return;
		const surface = page.locator(".mobile-tap-surface");
		try {
			if (await surface.count()) await surface.tap({ force: true, timeout: 500 });
			else if (await page.locator(".dialogue-panel").count())
				await page.locator(".dialogue-panel").tap({ force: true, timeout: 500 });
			else await page.waitForTimeout(60);
		} catch {
			// Vue can remove the tap layer in the same tick as the final advance.
			await page.waitForTimeout(60);
		}
		await page.waitForTimeout(90);
	}
	await waitFor(predicate, 1000);
}

await page.goto(`${base}/?chapter=4&ch4scene=modern-return`, { waitUntil: "networkidle" });
await waitFor(() => !!window.gameDirector && !!window.ch04ModernReturnGame);
await waitFor(() => !!document.querySelector(".mobile-orientation-gate"));
const portraitGate = await page.evaluate(() => ({
	gate: !!document.querySelector(".mobile-orientation-gate"),
	innerWidth: window.innerWidth,
	innerHeight: window.innerHeight,
	text: document.querySelector(".mobile-orientation-card")?.textContent ?? "",
}));
if (!portraitGate.gate || !portraitGate.text.includes("请横屏游玩"))
	throw new Error(`mobile portrait gate mismatch: ${JSON.stringify(portraitGate)}`);
await page.screenshot({ path: `${output}portrait-orientation-gate.png` });

await page.setViewportSize({ width: 844, height: 390 });
await waitFor(() => !document.querySelector(".mobile-orientation-gate"), 5000);
await waitFor(() => !!document.querySelector(".mobile-controls"), 5000);
const landscapeLayout = await page.evaluate(() => {
	const game = document.querySelector("#game");
	const canvas = document.querySelector("#game canvas");
	return {
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
		gameWidth: game?.getBoundingClientRect().width ?? 0,
		gameHeight: game?.getBoundingClientRect().height ?? 0,
		canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
		canvasHeight: canvas?.getBoundingClientRect().height ?? 0,
		tapSurface: !!document.querySelector(".mobile-tap-surface"),
	};
});
const aspect = landscapeLayout.gameWidth / landscapeLayout.gameHeight;
if (Math.abs(aspect - 16 / 9) > 0.02)
	throw new Error(`mobile landscape aspect mismatch: ${JSON.stringify(landscapeLayout)}`);
await page.screenshot({ path: `${output}landscape-modern-return.png` });

await tapAdvanceUntil(() => !!document.querySelector(".choice-panel"), 180);
const choiceCount = await page.locator(".choice-panel .choice").count();
if (choiceCount !== 4) throw new Error(`mobile choice panel mismatch: ${choiceCount}`);
await page.locator(".choice-panel .choice").first().tap();
await waitFor(() => !!document.querySelector(".result-panel img"));
const firstImage = await page.locator(".result-panel img").getAttribute("src");
await page.locator(".result-panel").tap({ force: true });
await page.waitForFunction(
	(first) => document.querySelector(".result-panel img")?.getAttribute("src") !== first,
	firstImage,
	{ timeout: 5000 },
);
const secondImage = await page.locator(".result-panel img").getAttribute("src");
if (!firstImage || !secondImage || firstImage === secondImage)
	throw new Error(`mobile result touch advance failed: ${JSON.stringify({ firstImage, secondImage })}`);
await page.screenshot({ path: `${output}result-touch-advanced.png` });

if (errors.length) throw new Error(errors.join("\n"));
console.log(JSON.stringify({
	status: "MOBILE ORIENTATION + TOUCH RESULT E2E PASS",
	portraitGate,
	landscapeLayout,
	resultImages: { firstImage, secondImage },
	screenshots: output,
}, null, 2));
await browser.close();
