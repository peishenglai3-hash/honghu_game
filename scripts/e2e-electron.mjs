import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
if (!existsSync(resolve(root, "dist", "index.html")))
	throw new Error("dist/index.html is missing; run npm run build first");

const electronCli = resolve(root, "node_modules", "electron", "cli.js");
const userDataDir = mkdtempSync(join(tmpdir(), "honghu-electron-smoke-"));
const smokeFile = join(userDataDir, "smoke-result.json");
const child = spawn(
	process.execPath,
	[
		electronCli,
		"--disable-gpu",
		"--no-sandbox",
		`--user-data-dir=${userDataDir}`,
		root,
	],
	{
		cwd: root,
		env: {
			...process.env,
			HONGHU_ELECTRON_SMOKE: "1",
			HONGHU_ELECTRON_SMOKE_FILE: smokeFile,
		},
		stdio: ["ignore", "pipe", "pipe"],
	},
);

let output = "";
child.stdout.on("data", (chunk) => (output += chunk.toString()));
child.stderr.on("data", (chunk) => (output += chunk.toString()));

const closePromise = new Promise((resolveClose) => {
	child.once("close", (code, signal) => resolveClose({ code, signal }));
});
const errorPromise = new Promise((resolveError) => {
	child.once("error", (error) => resolveError(error));
});

let marker = null;
const deadline = Date.now() + 30000;
while (Date.now() < deadline && !marker) {
	if (existsSync(smokeFile)) {
		try {
			marker = JSON.parse(readFileSync(smokeFile, "utf8"));
		} catch {
			// The main process may still be writing the marker; retry on the next tick.
		}
	}
	if (!marker)
		await new Promise((resolveWait) => setTimeout(resolveWait, 100));
}

let closeResult;
if (marker) {
	closeResult = await Promise.race([
		closePromise,
		new Promise((resolveWait) => setTimeout(() => resolveWait(null), 5000)),
	]);
} else {
	closeResult = await Promise.race([
		closePromise,
		errorPromise,
		new Promise((resolveWait) => setTimeout(() => resolveWait(null), 1000)),
	]);
}

if (!closeResult) {
	child.kill();
	if (process.platform === "win32" && child.pid) {
		spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
			stdio: "ignore",
		});
	}
	await Promise.race([
		closePromise,
		new Promise((resolveWait) => setTimeout(resolveWait, 1000)),
	]);
}

try {
	const status = marker?.status;
	if (status !== "ELECTRON SHELL LOAD PASS") {
		throw new Error(
			`Electron smoke test failed (marker ${status ?? "missing"}):\n${output.trim()}`,
		);
	}
	if (!closeResult || closeResult.code !== 0) {
		throw new Error(
			`Electron smoke test did not exit cleanly (${closeResult?.code ?? "no exit"}):\n${output.trim()}`,
		);
	}
	console.log(`ELECTRON SHELL LOAD PASS (${marker.url})`);
} finally {
	rmSync(userDataDir, { recursive: true, force: true });
}
