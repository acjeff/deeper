import MapService from "../services/map";
import LightingManager from "../services/lighting";
import {db, doc, setDoc} from "../firebaseconfig.js";
import LZString from "lz-string"; // Install via `npm install lz-string`


export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.energyCount = 50000;
        this.totalEnergy = 200;
    }

    async create() {
        let self = this;

        // TODO remove back in to save/load
        // this.newGame = true;

        this.tileSize = window._tileSize;
        this.playerSize = window._playerSize;
        this.digging = false;
        this.drilling = false;

        this.soilGroup = this.physics.add.staticGroup();
        this.waterGroup = this.physics.add.group();
        this.physics.add.collider(this.waterGroup, this.soilGroup);
        // this.physics.add.collider(this.waterGroup, this.waterGroup);
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);

        this.entityChildren = [this.soilGroup, this.waterGroup, this.lightingManager.lights];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }
        this.zoomAmount = 4;

        this.createPlayer();
        this.playerLight = this.lightingManager.addLight(this.player.x, this.player.y, this.playerSize * 10, 0.6, '253,196,124', true);
        this.createControls();
        this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255"];
        this.glowStickCol = 0;

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 0);
        this.cameras.main.setZoom(this.zoomAmount);
        this.cameras.main.removeBounds();
        this.fpsText = this.add.text(20, 50, "FPS: --", {
            fontSize: "24px",
            fill: "#ffffff"
        });

        this.energyText = this.add.text(20, 20, `Energy: ${this.energyCount} / ${this.totalEnergy}`, {
            fontSize: "24px",
            fill: "#a3ff5d"
        });

        this.cameras.main.ignore([this.energyText]);

        window.addEventListener("keydown", (e) => {
            if (e.key === "d") {
                self.digging = true;
            }
            if (e.key === "r") {
                self.drilling = true;
            }
        });

        window.addEventListener("wheel", (e) => {
            const zoomSpeed = 0.1; // Adjust zoom sensitivity
            this.zoomAmount = Phaser.Math.Clamp(this.cameras.main.zoom + (e.deltaY * -zoomSpeed * 0.01), 0.5, 5);

            this.cameras.main.setZoom(this.zoomAmount);
        });

        window.addEventListener("keypress", (e) => {
            if (e.key === "c") {
                this.glowStickCol = (this.glowStickCol + 1) % this.glowStickCols.length;
            }
            if (e.key === "l") {
                this.lightingManager.addLight(this.player.x, this.player.y, this.playerSize * 10, 0.8, this.glowStickCols[this.glowStickCol], false, true); // Orange torch light
            }
            if (e.key === "t") {
                this.playerLight.off = !this.playerLight.off;
            }
            if (e.key === "p") {

                this.player.x = this.startPoint.x;
                this.player.y = this.startPoint.y;
            }

        });
        window.addEventListener("keyup", (e) => {
            self.digging = false;
            self.drilling = false;
        });
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

        this.backToMenuButton.addEventListener("click",  async () => {
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

        this.saveButton.addEventListener("click",  async () => {
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
                // ✅ Electron: Save Locally
                await window.electronAPI.saveGame({ grid: gridData, playerData: { x: this.player.x, y: this.player.y }});
                this.saveButton.disabled = true;
                this.saveButton.innerHTML = "Saved";
                window.setTimeout(async () => {
                    this.saveButton.disabled = false;
                    this.saveButton.innerHTML = "Save Game";
                }, 150)
                console.log("✅ Game saved locally!");
            } else {
                // ✅ Browser: Save to Firebase
                await this.saveGameToCloud(user, compressedData);
                console.log("✅ Game saved to Firebase!");
            }
        } catch (error) {
            console.error("Error saving game:", error);
        }

        // Restore button UI
        this.saveButton.innerHTML = "Save Game";
        this.saveButton.disabled = false;
    }

    async saveGameToCloud(user, gridData) {
        if (!user) {
            console.error("User not authenticated");
            return;
        }

        // ✅ Store as a single document (reduces index entries)
        const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
        await setDoc(gameSaveRef, { data: gridData });

        console.log("✅ Game saved to Firestore (compressed).");
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
        // TODO add back in to save/load
        if (Object.keys(data).length) {
            if (!data.newGame) {
                this.grid = data.grid;
            }

            this.newGame = data.newGame;
            if (data.playerData?.length > 0) {
                this.playerX = data.playerData[0].x;
                this.playerY = data.playerData[0].y;
            }
            this.user = data.user;
        }
    }

    createPlayer() {
        let x = this.playerX || this.mapWidth / 2;
        let y = this.playerY || 0;

        this.startPoint = {
            x: x,
            y: 0
        }

        this.player = this.physics.add.body(x, y, this.playerSize, this.playerSize);
        this.player.setBounce(0.2);
        this.playerRect = this.add.rectangle(x, y, this.playerSize, this.playerSize, 0xffb2fd);
        this.playerRect.setOrigin(0, 0);
        // this.player.setCollideWorldBounds(true);

        if (this.soilGroup) {
            this.physics.add.collider(this.player, this.soilGroup, (player, soil) => this.digSoil(player, soil), null, this);
        }
    }

    digSoil(player, soil) {
        if (this.digging) {
            if (soil.strength === 1) {
                this.mapService.setTile(soil.x, soil.y, '0', soil);
            }
        }
        if (this.drilling) {
            if (this.energyCount >= soil.strength) {
                this.mapService.setTile(soil.x, soil.y, '0', soil);
                this.energyCount -= soil.strength;
                // this.energyText.setText(`Energy: ${this.energyCount} / ${this.totalEnergy}`);
            }
        }
    }

    createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        if (this.player) {
            this.handlePlayerMovement();
            // ✅ Update player light position
            this.playerLight.setPosition(this.player.x, this.player.y);

            // ✅ Update lighting
            this.lightingManager.updateLighting();

            this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

        }
    }

    handlePlayerMovement() {
        const speed = 100;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown && this.player.blocked.down) {
            this.player.setVelocityY(-150);
        }

        this.playerRect.x = this.player.x;
        this.playerRect.y = this.player.y;
        this.mapService.loadChunks(this.player.x, this.player.y);
    }

}