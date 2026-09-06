const { contextBridge } = require("electron");

// Expose a read-only marker only; game data and filesystem access stay inside
// the renderer's existing browser-compatible storage boundary.
contextBridge.exposeInMainWorld("honghuDesktop", Object.freeze({ platform: "electron" }));
