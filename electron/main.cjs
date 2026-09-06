const { app, BrowserWindow } = require("electron");
const { writeFileSync } = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const DEV_URL = process.env.HONGHU_ELECTRON_URL;
const SMOKE_FILE = process.env.HONGHU_ELECTRON_SMOKE_FILE;
const DIST_ROOT = path.resolve(__dirname, "..", "dist");

function isAllowedNavigation(url) {
	try {
		const target = new URL(url);
		if (DEV_URL) return target.origin === new URL(DEV_URL).origin;
		if (target.protocol !== "file:") return false;
		const targetPath = path.resolve(fileURLToPath(target));
		return (
			targetPath.toLowerCase() === path.join(DIST_ROOT, "index.html").toLowerCase() ||
			targetPath.toLowerCase().startsWith(`${DIST_ROOT.toLowerCase()}${path.sep}`)
		);
	} catch {
		return false;
	}
}

function finishSmoke(status, details = {}) {
	const result = { status, ...details };
	if (SMOKE_FILE) writeFileSync(SMOKE_FILE, JSON.stringify(result), "utf8");
	console.log(JSON.stringify(result));
}

async function createWindow() {
	const window = new BrowserWindow({
		width: 1280,
		height: 720,
		minWidth: 960,
		minHeight: 540,
		backgroundColor: "#161612",
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	window.once("ready-to-show", () => window.show());
	window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
	window.webContents.on("will-navigate", (event, url) => {
		if (!isAllowedNavigation(url)) event.preventDefault();
	});
	try {
		if (DEV_URL) await window.loadURL(DEV_URL);
		else
			await window.loadFile(
				path.join(__dirname, "..", "dist", "index.html"),
			);
	} catch (error) {
		console.error("Honghu desktop shell failed to load", error);
		if (process.env.HONGHU_ELECTRON_SMOKE === "1") {
			try {
				finishSmoke("ELECTRON SHELL LOAD FAIL", {
					error:
						error instanceof Error ? error.message : String(error),
				});
			} finally {
				app.exit(1);
			}
		}
		return;
	}
	if (process.env.HONGHU_ELECTRON_SMOKE !== "1") return;
	finishSmoke("ELECTRON SHELL LOAD PASS", {
		url: window.webContents.getURL(),
	});
	window.close();
	app.exit(0);
}

app.whenReady().then(() => {
	app.setAppUserModelId("com.honghu.redcode");
	void createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) void createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
