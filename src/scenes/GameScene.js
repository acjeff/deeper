import * as ROT from "rot-js";

// Down
// Create system for storing and retrieving the matrix of earth blocks.
// Create a system for storing all the element groups for easy ignoring and retrieving.

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
        this.generateMap();
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

    generateMap() {
        const mapWidth = window._gridSize;
        const mapHeight = window._gridSize;

        // Options for cellular automata to create more organic caves
        const options = {
            // born: [5, 6],   // Number of neighboring tiles for the cell to be "born"
            // survive: [1, 5], // Number of neighboring tiles for the cell to "survive"
            // iterations: 4,   // Number of iterations for the cellular automata
            // floorChance: 0.1, // Chance for a tile to start as floor
            // wallChance: 0.9,  // Chance for a tile to start as wall
        };

        // Create a map using Cellular Automata
        const map = new ROT.Map.Cellular(mapWidth, mapHeight);
        map.randomize(0.5); // Ensures the map is seeded properly before generating

        // Initialize the grid with random values (representing walls and floors)
        this.grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(2)); // Soil by default

        map.create((x, y, wall) => {
            if (wall) {
                this.grid[y][x] = 2; // Wall
            } else {
                this.grid[y][x] = 1; // Open space
            }
            if (y < 10) {
                this.grid[y][x] = 1; // Open space
            }
            if (y < 5) {
                this.grid[y][x] = 0; // Open space
            }
        });

        // Function to randomly set a certain number of coordinates to 0
        function setRandomZeros(grid, count) {
            let width = grid[0].length;
            let height = grid.length;
            let positions = [];

            // Collect all open space positions
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (grid[y][x] === 1) {
                        positions.push({ x, y });
                    }
                }
            }

            // Shuffle positions and pick `count` number of them
            for (let i = positions.length - 1; i > 0; i--) {
                let j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }

            // Set the selected positions to 0
            for (let i = 0; i < Math.min(count, positions.length); i++) {
                let { x, y } = positions[i];
                grid[y][x] = 0;
            }
        }

        setRandomZeros(this.grid, this.totalEnergy);

        this.soilStrength = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(1 + Math.floor(Math.random() * 3))); // Soil strength 1-3

        this.soilGroup = this.physics.add.staticGroup();
        this.openSpaces = [];

        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                let worldX = x * this.tileSize;
                let worldY = y * this.tileSize;

                // Create the soil tiles
                if (this.grid[y][x] === 2) {
                    let soilStrength = 3;
                    let color = 0x654321; // Darker for stronger soil
                    let soilRect = this.add.rectangle(worldX, worldY, this.tileSize, this.tileSize, color);
                    soilRect.strength = soilStrength;
                    this.soilGroup.add(soilRect);
                } else if (this.grid[y][x] === 1) {
                    let soilStrength = 1;
                    let color = 0x724c25; // Darker for stronger soil
                    let soilRect = this.add.rectangle(worldX, worldY, this.tileSize, this.tileSize, color);
                    soilRect.strength = soilStrength;
                    this.soilGroup.add(soilRect);
                } else {
                    this.openSpaces.push({x, y});
                }
            }
        }
    }

    createPlayer() {
        if (this.openSpaces.length === 0) {
            console.error("No open space found for player spawn!");
            return;
        }

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