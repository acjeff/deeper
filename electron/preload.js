const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    saveGame: (data) => ipcRenderer.invoke("save-game", data),
    loadGame: () => ipcRenderer.invoke("load-game"),
    deleteGameSave: () => ipcRenderer.invoke("delete-game-save"),
    isElectron: true
});