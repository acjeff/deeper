

// Down
// Create system for storing and retrieving the matrix of earth blocks.
// Create a system for storing all the element groups for easy ignoring and retrieving.

import MapService from "../services/map";
import LightingManager from "../services/lighting";

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.openSpaces = [];
        this.energyCount = 50000;
        this.originalGravity = 300;
        this.totalEnergy = 200;
    }

    create() {
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
        this.mapService.generateMap();
        this.zoomAmount = 3;

        this.createPlayer();
        this.createControls();
        this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255"];
        this.glowStickCol = 0;

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 0);
        this.cameras.main.setZoom(this.zoomAmount);
        this.cameras.main.removeBounds();
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
                this.player.x = 1000;
                this.player.y = 0;
            }

        });
        window.addEventListener("keyup", (e) => {
            self.digging = false;
            self.drilling = false;
        });
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.playerLight = this.lightingManager.addLight(this.player.x, this.player.y, this.playerSize * 20, 0.6, '253,196,124', true);
    }

    createPlayer() {
        let x = 1000; //TODO Make half way through the whole map
        let y = 0;

        this.player = this.physics.add.body(x, y, this.playerSize, this.playerSize);
        this.player.setBounce(0.2);
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