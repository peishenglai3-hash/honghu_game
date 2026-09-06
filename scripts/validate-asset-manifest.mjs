import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifestPath = join(root, "dist", "data", "asset-manifest.json");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

assert(existsSync(manifestPath), `asset manifest missing: ${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert(manifest.schemaVersion === 1, "asset manifest schema version mismatch");
assert(Array.isArray(manifest.assets) && manifest.assets.length > 0, "asset manifest is empty");

const paths = new Set();
const bundles = new Set();
for (const asset of manifest.assets) {
	assert(typeof asset.path === "string" && asset.path.startsWith("/assets/"), `invalid asset path: ${asset.path}`);
	assert(!paths.has(asset.path), `duplicate asset path: ${asset.path}`);
	assert(typeof asset.bundle === "string" && asset.bundle.length > 0, `missing bundle: ${asset.path}`);
	assert(Number.isInteger(asset.bytes) && asset.bytes > 0, `invalid asset size: ${asset.path}`);
	assert(/^[a-f0-9]{64}$/.test(asset.sha256), `invalid asset hash: ${asset.path}`);
	const distPath = join(root, "dist", asset.path.slice(1).replaceAll("/", "\\"));
	assert(existsSync(distPath), `asset missing from dist: ${asset.path}`);
	assert(statSync(distPath).size === asset.bytes, `asset size mismatch: ${asset.path}`);
	paths.add(asset.path);
	bundles.add(asset.bundle);
}

for (const required of ["prologue", "chapter-01", "chapter-02", "chapter-03", "chapter-04", "common-ui"])
	assert(bundles.has(required), `required bundle missing: ${required}`);

console.log(`ASSET MANIFEST PASS (${manifest.assets.length} assets, ${bundles.size} bundles)`);
