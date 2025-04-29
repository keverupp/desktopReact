// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  addGame: (game) => ipcRenderer.invoke("add-game", game),
  selectFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  getSteamGridKey: () => process.env.STEAMGRIDDB_API_KEY,
  getSteamGridImages: (name) =>
    ipcRenderer.invoke("fetch-steamgrid-images", name),
  updateGameImages: (game) => ipcRenderer.invoke("update-game-images", game),
  getUUID: () => ipcRenderer.invoke("get-config"),
  selectShortcut: () => ipcRenderer.invoke("dialog:openShortcut"),
});
