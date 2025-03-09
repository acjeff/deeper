import MapService from "../services/map";
import LightingManager from "../services/lighting";
import {db, doc, writeBatch} from "../firebaseconfig.js";
import LZString from "lz-string";
import ControlsManager from "../services/controls";
import CameraManager from "../services/cameraManager";
import PlayerManager from "../services/playerManager";
import UiManager from "../services/uiManager";
const batchSize = 100;
let currentIndex = 0;

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }

    async create() {
        this.tileSize = window._tileSize;
        this.playerSize = window._playerSize;
        this.soilGroup = this.physics.add.staticGroup();
        this.emptyGroup = this.add.group();
        this.lightGroup = this.add.group();
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.controlsManager = new ControlsManager(this);
        this.entityChildren = [this.soilGroup, this.lightGroup, this.emptyGroup];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }

        window.setTimeout(async () => {
            this.playerManager = new PlayerManager(this);
            this.cameraManager = new CameraManager(this);
            this.uiManager = new UiManager(this);

            this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255", "253,196,124"];
            this.glowStickCol = 0;

            this.saveButton = this.uiManager.addSaveButton();
            this.backToMenuButton = this.uiManager.addBackToMenuButton();

            if (this.newGame) {
                await this.saveGame(this.user, this.grid);
            }

            window.setInterval(async () => {
                let processed = 0;
                let softSoil = this.emptyGroup.getChildren();
                console.log(softSoil.length);
                while (processed < batchSize && currentIndex < softSoil.length) {
                    const block = softSoil[currentIndex];
                    if (block.tileRef?.checkState) block.tileRef?.checkState();
                    currentIndex++;
                    processed++;
                }
                if (currentIndex >= softSoil.length) {
                    currentIndex = 0;
                }
            }, 100);
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

    update(time, delta) {
        if (this.player) {
            this.controlsManager.handlePlayerMovement();
            this.lightingManager.updateLighting();
            this.controlsManager.getInteractableBlock(15);
        }
    }

}