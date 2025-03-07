"use strict";
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
let mainWindow;
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      // Keep security best practices
      contextIsolation: true
      // Enables secure communication
    }
  });
  mainWindow.loadURL("http://localhost:5173");
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) app.whenReady();
  });
});
ipcMain.handle("save-game", async (event, gameData) => {
  const filePath = path.join(app.getPath("userData"), "game_save.json");
  fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), "utf-8");
  return "Game saved!";
});
ipcMain.handle("load-game", async () => {
  const filePath = path.join(app.getPath("userData"), "game_save.json");
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
