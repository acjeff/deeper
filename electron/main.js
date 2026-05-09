const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");

let mainWindow;
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=8192");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false
        }
    });

    const isDev = process.env.NODE_ENV === "development";
    const devURL = "http://localhost:5173";
    const prodURL = `file://${path.join(__dirname, "../dist/index.html")}`;
    mainWindow.loadURL(isDev ? devURL : prodURL);
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

const savePath = () => path.join(app.getPath("userData"), "game_save.json");

ipcMain.handle("save-game", async (event, gameData) => {
    await fs.writeFile(savePath(), JSON.stringify(gameData, null, 2), "utf-8");
    return "Game saved!";
});

ipcMain.handle("load-game", async () => {
    try {
        return JSON.parse(await fs.readFile(savePath(), "utf-8"));
    } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
    }
});

ipcMain.handle("delete-game-save", async () => {
    try {
        await fs.unlink(savePath());
        return "Save data deleted!";
    } catch (err) {
        if (err.code === "ENOENT") return "No save data found.";
        throw err;
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
