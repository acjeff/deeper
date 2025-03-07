const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096"); // ✅ Increase memory
app.commandLine.appendSwitch("disable-site-isolation-trials"); // ✅ Reduce unnecessary isolation
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion"); // ✅ Improves speed on Windows
app.commandLine.appendSwitch("enable-gpu-rasterization"); // ✅ Uses GPU for rendering
app.commandLine.appendSwitch("enable-zero-copy"); // ✅ Faster image loading
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false, // Keep security best practices
            contextIsolation: true, // Enables secure communication,
            backgroundThrottling: false
        }
    });

    // ✅ Check if running in development (Vite) or production (built app)
    const isDev = process.env.NODE_ENV === "development";
    const devURL = "http://localhost:5173"; // Vite’s dev server
    const prodURL = `file://${path.join(__dirname, "../dist/index.html")}`;

    mainWindow.loadURL(isDev ? devURL : prodURL);

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) app.whenReady();
    });
});

// ✅ Handle local save game
ipcMain.handle("save-game", async (event, gameData) => {
    const filePath = path.join(app.getPath("userData"), "game_save.json");
    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), "utf-8");
    return "Game saved!";
});

// ✅ Handle local load game
ipcMain.handle("load-game", async () => {
    const filePath = path.join(app.getPath("userData"), "game_save.json");
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    return null;
});

ipcMain.handle("delete-game-save", async () => {
    const filePath = path.join(app.getPath("userData"), "game_save.json");
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Deletes the save file
        return "✅ Save data deleted!";
    } else {
        return "⚠ No save data found.";
    }
});

// Quit on all windows closed
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
