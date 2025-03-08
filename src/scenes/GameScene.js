import MapService from "../services/map";
import LightingManager from "../services/lighting";
import {db, doc, writeBatch} from "../firebaseconfig.js";
import LZString from "lz-string";
import ControlsManager from "../services/controls";
import CameraManager from "../services/cameraManager";
import PlayerManager from "../services/playerManager";

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.energyCount = 50000;
        this.totalEnergy = 200;
    }

    async create() {
        this.tileSize = window._tileSize;
        this.playerSize = window._playerSize;
        this.soilGroup = this.physics.add.staticGroup();
        this.waterGroup = this.physics.add.group();
        this.physics.add.collider(this.waterGroup, this.soilGroup);
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.controlsManager = new ControlsManager(this);

        this.entityChildren = [this.soilGroup, this.waterGroup, this.lightingManager.lights];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }

        this.playerManager = new PlayerManager(this);
        this.cameraManager = new CameraManager(this);

        this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255"];
        this.glowStickCol = 0;

        this.addSaveButton();
        this.addBackToMenuButton();

        if (this.newGame) {
            await this.saveGame(this.user, this.grid);
        }

    }

    addBackToMenuButton() {
        let self = this;
        this.backToMenuButton = document.createElement("button");
        this.backToMenuButton.id = 'menu_button';
        this.backToMenuButton.innerText = "Back to menu";
        this.backToMenuButton.style.position = "absolute";
        this.backToMenuButton.style.top = "10px";
        this.backToMenuButton.style.left = "10px";
        this.backToMenuButton.style.padding = "10px 15px";
        this.backToMenuButton.style.fontSize = "16px";
        this.backToMenuButton.style.backgroundColor = "#646464"; // Green button
        this.backToMenuButton.style.color = "#fff";
        this.backToMenuButton.style.border = "none";
        this.backToMenuButton.style.borderRadius = "5px";
        this.backToMenuButton.style.cursor = "pointer";
        this.backToMenuButton.style.zIndex = "1000"; // Ensure it stays on top

        document.body.appendChild(this.backToMenuButton);

        this.backToMenuButton.addEventListener("click", async () => {
            // 🚀 UI Update Before Processing
            this.backToMenuButton.disabled = true;
            this.backToMenuButton.style.pointerEvents = 'none';
            this.backToMenuButton.innerHTML = "Saving...";
            this.saveButton.style.visibility = 'hidden';
            window.setTimeout(async () => {
                await this.saveGame(self.user, self.grid);
                this.backToMenuButton.remove();
                this.saveButton.remove();
                this.lightCanvas.remove();
                this.scene.stop("GameScene"); // ✅ Stop the game scene
                this.scene.start("MenuScene");
            }, 100)

        });
    }

    addSaveButton() {
        let self = this;
        this.saveButton = document.createElement("button");
        this.saveButton.id = 'save_button';
        this.saveButton.innerText = "Save Game";
        this.saveButton.style.position = "absolute";
        this.saveButton.style.top = "10px";
        this.saveButton.style.right = "10px";
        this.saveButton.style.padding = "10px 15px";
        this.saveButton.style.fontSize = "16px";
        this.saveButton.style.backgroundColor = "#28a745"; // Green button
        this.saveButton.style.color = "#fff";
        this.saveButton.style.border = "none";
        this.saveButton.style.borderRadius = "5px";
        this.saveButton.style.cursor = "pointer";
        this.saveButton.style.zIndex = "1000"; // Ensure it stays on top

        document.body.appendChild(this.saveButton);

        this.saveButton.addEventListener("click", async () => {
            // 🚀 UI Update Before Processing
            this.saveButton.disabled = true;
            this.saveButton.innerHTML = "Saving...";
            window.setTimeout(async () => {
                await this.saveGame(self.user, self.grid);
            }, 100)

        });
    }

    async saveGame(user, gridData) {
        try {
            const compressedData = LZString.compressToUTF16(JSON.stringify(gridData));

            if (window.electronAPI?.isElectron) {
                await window.electronAPI.saveGame({grid: gridData, playerData: {x: this.player.x, y: this.player.y}});
                this.saveButton.disabled = true;
                this.saveButton.innerHTML = "Saved";
                window.setTimeout(async () => {
                    this.saveButton.disabled = false;
                    this.saveButton.innerHTML = "Save Game";
                }, 150)
            } else {
                await this.saveGameToCloud(user, compressedData);
            }
        } catch (error) {
            console.error("Error saving game:", error);
        }

        this.saveButton.innerHTML = "Save Game";
        this.saveButton.disabled = false;
    }

    async saveGameToCloud(user, gridData) {
        if (!user) {
            console.error("User not authenticated");
            return;
        }

        const batch = writeBatch(db);

        const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
        const playerSaveRef = doc(db, "game_saves", user.uid, "player_data", "position");

        batch.set(gameSaveRef, {data: gridData});
        batch.set(playerSaveRef, {x: this.player.x, y: this.player.y});

        try {
            await batch.commit(); // Execute the batch write
        } catch (error) {
            console.error("Error saving data: ", error);
        }
    }

    convertValuesToStrings(obj) {
        if (typeof obj !== "object" || obj === null) {
            return String(obj); // Convert primitive values
        }

        if (Array.isArray(obj)) {
            return obj.map(this.convertValuesToStrings); // Convert each element in an array
        }

        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, this.convertValuesToStrings(value)])
        );
    }

    init(data) {
        if (Object.keys(data).length) {
            if (!data.newGame) {
                this.grid = data.grid;
            }

            this.newGame = data.newGame;
            if (data.playerData?.length > 0 && !data.newGame) {
                this.playerX = data.playerData[0].x;
                this.playerY = data.playerData[0].y;
            }

            this.user = data.user;
        }
    }

    update() {
        if (this.player) {
            this.controlsManager.handlePlayerMovement();
            this.playerLight.setPosition(this.player.x, this.player.y);
            this.lightingManager.updateLighting();

            this.controlsManager.getInteractableBlock(15);

        }
    }

}