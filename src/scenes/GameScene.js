// Down
// Create system for storing and retrieving the matrix of earth blocks.
// Create a system for storing all the element groups for easy ignoring and retrieving.

import MapService from "../services/map";
import LightingManager from "../services/lighting";
import {db, doc, setDoc, auth} from "../firebaseconfig";

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.openSpaces = [];
        this.energyCount = 50000;
        this.originalGravity = 300;
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
        this.playerLight = this.lightingManager.addLight(this.player.x, this.player.y, this.playerSize * 20, 0.6, '253,196,124', true);
        window.addEventListener("beforeunload", () => this.saveGame());
        if (this.newGame) {
            // const gridToSave = Object.fromEntries(Object.entries(this.grid).map(([key, value]) => [key, JSON.stringify(value)]));
            // console.log(gridToSave, ' : this.convertValuesToStrings(this.grid)');
            // await setDoc(doc(db, "game_saves", this.user.uid + '_grid'), gridToSave);
            await this.saveGridInChunks(this.user, this.grid);
        }
    }

    async saveGridInChunks(user, gridData, chunkCount = 6) {
        if (!user) {
            console.error("User not authenticated");
            return;
        }

        // Convert grid data to JSON strings
        const gridToSave = Object.fromEntries(
            Object.entries(gridData).map(([key, value]) => [key, JSON.stringify(value)])
        );


        // ✅ Split into N chunks dynamically
        const entries = Object.entries(gridToSave);
        const chunkSize = Math.ceil(entries.length / chunkCount); // Calculate chunk size

        for (let i = 0; i < chunkCount; i++) {
            const chunkData = Object.fromEntries(entries.slice(i * chunkSize, (i + 1) * chunkSize));

            await setDoc(doc(db, `game_saves/${user.uid}_grid_chunk_${i}`), chunkData);
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
        if (!data.newGame) {
            this.grid = data;
        }

        this.newGame = data.newGame;
        this.user = data.user;
    }

    async saveGame() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await setDoc(doc(db, "game_saves", user.uid), {
                playerX: this.player.x,
                playerY: this.player.y,
                energyCount: this.energyCount,
                grid: this.grid
            });
        } catch (error) {
            console.error("Error saving game:", error);
        }
    }

    createPlayer() {
        let x = 1000; //TODO Make half way through the whole map
        let y = 0;

        this.player = this.physics.add.body(x, y, this.playerSize, this.playerSize);
        this.player.setBounce(0.2);
        this.startPoint = this.add.rectangle(x, y, this.playerSize * 3, this.playerSize * 3, 0xffffff);
        this.playerRect = this.add.rectangle(x, y, this.playerSize, this.playerSize, 0xffb2fd);
        this.playerRect.setOrigin(0, 0);
        this.player.setCollideWorldBounds(true);

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