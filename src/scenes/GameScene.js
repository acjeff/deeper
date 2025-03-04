

// Down
// Create system for storing and retrieving the matrix of earth blocks.
// Create a system for storing all the element groups for easy ignoring and retrieving.

import MapService from "../services/map";

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
        this.digging = false;
        this.drilling = false;
        this.soilGroup = this.physics.add.staticGroup();
        this.waterGroup = this.physics.add.group();
        this.physics.add.collider(this.waterGroup, this.soilGroup);
        this.physics.add.collider(this.waterGroup, this.waterGroup);
        this.entityChildren = [this.soilGroup, this.waterGroup];
        this.mapService = new MapService(32, 16, this);
        this.mapService.generateMap();

        this.createPlayer();
        this.createControls();
        // this.createEnergy();
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 0);
        this.cameras.main.setZoom(2);
        this.energyText = this.add.text(20, 20, `Energy: ${this.energyCount} / ${this.totalEnergy}`, {
            fontSize: "24px",
            fill: "#913434"
        });
        const worldWidth = window._gridSize * this.tileSize;
        const worldHeight = window._gridSize * this.tileSize;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        // this.lightingCamera = this.cameras.add(0, 0, window.innerWidth, window.innerHeight);
        // this.lightingCamera.ignore([this.waterGroup, this.player, this.playerRect, this.soilGroup]);

        // this.uiCamera = this.cameras.add(0, 0, window.innerWidth, window.innerHeight);
        // this.uiCamera.ignore([this.waterGroup, this.player, this.playerRect, this.soilGroup]);
        this.cameras.main.ignore([this.energyText]);

        // this.uiCamera.setScroll(0, 0);
        window.addEventListener("keydown", (e) => {
            if (e.key === "d") {
                self.digging = true;
            }
            if (e.key === "r") {
                self.drilling = true;
            }
        });
        window.addEventListener("keyup", (e) => {
            self.digging = false;
            self.drilling = false;
        });

    }

    createPlayer() {
        // if (this.openSpaces.length === 0) {
        //     console.error("No open space found for player spawn!");
        //     return;
        // }

        let index = Math.floor(Math.random() * this.openSpaces.length);
        let safeSpawn = this.openSpaces.splice(index, 1)[0];

        let x = window._width / 2;
        let y = window._height / 2;

        this.player = this.physics.add.body(x, y, this.tileSize * 0.8, this.tileSize * 0.8);
        this.player.setBounce(0.2);
        this.playerRect = this.add.rectangle(x, y, this.tileSize * 0.8, this.tileSize * 0.8, 0xffb2fd);
        this.playerRect.setOrigin(0, 0);
        this.player.setCollideWorldBounds(true);

        if (this.soilGroup) {
            this.physics.add.collider(this.player, this.soilGroup, (player, soil) => this.digSoil(player, soil), null, this);
        }
    }

    digSoil(player, soil) {
        if (this.digging) {
            if (soil.strength === 1) {
                soil.destroy();
            }
        }
        if (this.drilling) {
            if (this.energyCount >= soil.strength) {
                soil.destroy();
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

// Define swimming function
    swimming(player, water) {
        // Reduce gravity when in water
        // player.setGravityY(this.originalGravity * 0.3); // 30% of normal gravity
        // player.setDragY(300); // Increase drag to make sinking slower
        // player.setVelocityY(player.body.velocity.y * 0.8); // Reduce downward momentum slightly
        // this.inWater = true; // Track that the player is swimming
    }

// Function to reset gravity when exiting water
    exitWater(player, water) {
        if (this.inWater) {
            player.setGravityY(this.originalGravity); // Restore normal gravity
            player.setDragY(0); // Reset drag
            this.inWater = false;
        }
    }


}