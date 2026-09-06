import { chromium } from "playwright";

const baseUrl = process.env.PWA_BASE_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
	if (message.type() === "error") errors.push(message.text());
});

try {
	await page.goto(baseUrl, { waitUntil: "networkidle" });
	await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 15000 });
	const online = await page.evaluate(async () => {
		const registration = await navigator.serviceWorker.ready;
		const manifestResponse = await fetch(new URL("manifest.webmanifest", document.baseURI));
		return {
			controlled: Boolean(navigator.serviceWorker.controller),
			scope: registration.scope,
			manifestStatus: manifestResponse.status,
		cacheNames: await caches.keys(),
		};
	});
	if (online.manifestStatus !== 200) throw new Error(`PWA manifest status: ${online.manifestStatus}`);
	const onlineErrors = [...errors];
	errors.length = 0;
	await page.reload({ waitUntil: "networkidle" });
	await context.setOffline(true);
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForSelector("#game canvas", { timeout: 15000 });
	const offline = await page.evaluate(() => ({
		canvas: Boolean(document.querySelector("#game canvas")),
		shell: Boolean(document.querySelector("#game-shell")),
	}));
	if (!offline.canvas || !offline.shell) throw new Error(`PWA offline shell mismatch: ${JSON.stringify(offline)}`);
	const offlineErrors = errors.filter((error) => !error.includes("ERR_INTERNET_DISCONNECTED"));
	if (onlineErrors.length || offlineErrors.length)
		throw new Error([...onlineErrors, ...offlineErrors].join("\n"));
	console.log(JSON.stringify({ online, offline, status: "PWA INSTALL + OFFLINE SHELL PASS" }, null, 2));
} finally {
	await browser.close();
}
