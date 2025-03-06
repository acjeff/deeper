import MapService from "../services/map";
import LightingManager from "../services/lighting";
import {db, doc, setDoc, auth} from "../firebaseconfig.js";

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.energyCount = 50000;
        this.totalEnergy = 200;
    }

    async create() {
        let self = this;
        this.tileSize = window._tileSize;
        this.playerSize = window._playerSize;
        this.digging = false;
        this.drilling = false;

        this.soilGroup = this.physics.add.staticGroup();
        this.waterGroup = this.physics.add.group();
        this.physics.add.collider(this.waterGroup, this.soilGroup);
        this.physics.add.collider(this.waterGroup, this.waterGroup);
        this.entityChildren = [this.soilGroup, this.waterGroup];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }
        this.zoomAmount = 3;

        this.createPlayer();
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
                console.log(this.startPoint.x, this.startPoint.y, ' : this.startPoint.x, this.startPoint.y');

                this.player.x = this.startPoint.x;
                this.player.y = this.startPoint.y;
            }

        });
        window.addEventListener("keyup", (e) => {
            self.digging = false;
            self.drilling = false;
        });
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.playerLight = this.lightingManager.addLight(this.player.x, this.player.y, this.playerSize * 50, 0.6, '253,196,124', true);
        if (this.newGame) {
            await this.saveGame(this.user, this.grid);
        }
        await this.addSaveButton();
    }

    async addSaveButton() {
        let self = this;
        let saveButton = document.createElement("button");
        saveButton.innerText = "Save Game";
        saveButton.style.position = "absolute";
        saveButton.style.top = "10px";
        saveButton.style.right = "10px";
        saveButton.style.padding = "10px 15px";
        saveButton.style.fontSize = "16px";
        saveButton.style.backgroundColor = "#28a745"; // Green button
        saveButton.style.color = "#fff";
        saveButton.style.border = "none";
        saveButton.style.borderRadius = "5px";
        saveButton.style.cursor = "pointer";
        saveButton.style.zIndex = "1000"; // Ensure it stays on top

        document.body.appendChild(saveButton);

        saveButton.addEventListener("click", async () => {
            console.log(self.user, ' : user');
            console.log(self.grid, ' : grid');
            await this.saveGame(self.user, self.grid);
        });
    }


    async saveGame(user, gridData, chunkCount = 6) {
        if (!user) {
            console.error("User not authenticated");
            return;
        }

        // Convert grid data to JSON strings
        const gridToSave = Object.fromEntries(
            Object.entries(gridData).map(([key, value]) => [key, JSON.stringify(value)])
        );

        const entries = Object.entries(gridToSave);
        const chunkSize = Math.ceil(entries.length / chunkCount); // Calculate chunk size

        for (let i = 0; i < chunkCount; i++) {
            const chunkData = Object.fromEntries(entries.slice(i * chunkSize, (i + 1) * chunkSize));
            await setDoc(doc(db, "game_saves", user.uid, "map_data", `grid_chunk_${i}`), chunkData);
        }
        await setDoc(
            doc(db, "game_saves", user.uid, "player_data", "player_position"),
            {
                x: this.player.x,
                y: this.player.y
            },
            { merge: true } // Merges with existing data
        );

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
        if (!data.newGame) {
            this.grid = data.grid;
        }

        this.newGame = data.newGame;
        console.log(data.playerData, ' : player data');
        if (data.playerData.length > 0) {
            this.playerX = data.playerData[0].x;
            this.playerY = data.playerData[0].y;
        }
        this.user = data.user;
    }

    createPlayer() {
        let x = this.playerX || 640;
        let y = this.playerY || 0;

        this.startPoint = {
            x: 640,
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
                this.mapService.setTile(soil.x, soil.y, 0, soil);
            }
        }
        if (this.drilling) {
            if (this.energyCount >= soil.strength) {
                this.mapService.setTile(soil.x, soil.y, 0, soil);
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