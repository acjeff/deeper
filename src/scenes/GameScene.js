

// Down
// Create system for storing and retrieving the matrix of earth blocks.
// Create a system for storing all the element groups for easy ignoring and retrieving.

import MapService from "../services/map";

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.openSpaces = [];
        this.energyCount = 0;
        this.totalEnergy = 200;
    }

    create() {
        let self = this;
        this.tileSize = window._tileSize;
        this.digging = false;
        this.drilling = false;
        this.energyCount = 2;
        this.mapService = new MapService(32, 16, this);
        this.mapService.generateMap();
        console.log(this.soilGroup, ' : soil group');

        this.createPlayer();
        this.createControls();
        this.createEnergy();
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 0);
        this.cameras.main.setZoom(2);
        this.energyText = this.add.text(20, 20, `Energy: ${this.energyCount} / ${this.totalEnergy}`, {
            fontSize: "24px",
            fill: "#913434"
        });
        const worldWidth = window._gridSize * this.tileSize;
        const worldHeight = window._gridSize * this.tileSize;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.lightingCamera = this.cameras.add(0, 0, window.innerWidth, window.innerHeight);
        this.lightingCamera.ignore([this.energyGroup, this.player, this.playerRect, this.soilGroup]);

        this.uiCamera = this.cameras.add(0, 0, window.innerWidth, window.innerHeight);
        this.uiCamera.ignore([this.energyGroup, this.player, this.playerRect, this.soilGroup]);
        this.cameras.main.ignore([this.energyText]);

        this.uiCamera.setScroll(0, 0);
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
        let y = 0;

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
                this.energyText.setText(`Energy: ${this.energyCount} / ${this.totalEnergy}`);
            }
        }
    }

    createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        this.handlePlayerMovement();
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

    collectEnergy(player, energy) {
        energy.destroy();
        this.energyCount += 1;
        this.energyText.setText(`Energy: ${this.energyCount} / ${this.totalEnergy}`); // ✅ Update UI
    }

    createEnergy() {
        this.energyGroup = this.physics.add.group();

        for (let i = 0; i < this.totalEnergy; i++) {
            const validSpace = this.openSpaces.filter(space => space.y > 5);
            if (validSpace.length === 0) return;

            let index = Math.floor(Math.random() * validSpace.length);
            let spot = validSpace.splice(index, 1)[0];

            let x = spot.x * this.tileSize;
            let y = spot.y * this.tileSize;

            let energyRect = this.add.rectangle(x, y, this.tileSize, this.tileSize, 0xeecd14);
            this.physics.add.existing(energyRect);
            energyRect.body.setSize(this.tileSize, this.tileSize);
            energyRect.body.setOffset(0, 0);
            energyRect.body.setBounce(0.5);
            this.energyGroup.add(energyRect);
            this.physics.add.collider(energyRect, this.soilGroup);
            this.physics.add.overlap(this.player, energyRect, this.collectEnergy, null, this);
        }

        // this.physics.add.overlap(this.player, this.energyGroup, this.collectEnergy, null, this);
    }

}