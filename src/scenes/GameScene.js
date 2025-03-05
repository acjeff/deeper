

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

        this.createPlayer();
        this.createControls();
        // this.createEnergy();
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 0);
        this.cameras.main.setZoom(2);
        this.cameras.main.removeBounds();
        this.energyText = this.add.text(20, 20, `Energy: ${this.energyCount} / ${this.totalEnergy}`, {
            fontSize: "24px",
            fill: "#913434"
        });

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

        window.addEventListener("keypress", (e) => {
            if (e.key === "l") {
                this.lightingManager.addLight(this.player.x, this.player.y, 200, 0.3, "255,150,0"); // Orange torch light
            }
            if (e.key === "t") {
                this.playerLight.off = !this.playerLight.off;
            }

        });
        window.addEventListener("keyup", (e) => {
            self.digging = false;
            self.drilling = false;
        });
        // Initialize Lighting System
        // this.initLighting();
        // ✅ Initialize Lighting System
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        // this.lightingManager.registerGroup(this.waterGroup);

        // ✅ Add multiple light sources
        this.playerLight = this.lightingManager.addLight(this.player.x, this.player.y, 200, 0.4, '255,255,255', true);
    }

    createPlayer() {
        // if (this.openSpaces.length === 0) {
        //     console.error("No open space found for player spawn!");
        //     return;
        // }

        let index = Math.floor(Math.random() * this.openSpaces.length);
        let safeSpawn = this.openSpaces.splice(index, 1)[0];

        let x = 500;
        let y = 500;

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

    // /** Initialize Raycasting-Based Lighting */
    // initLighting() {
    //     // 1. Create a new canvas for the lighting system
    //     this.lightCanvas = document.createElement("canvas");
    //     this.lightCanvas.width = this.cameras.main.width; // Match game world size
    //     this.lightCanvas.height = this.cameras.main.height;
    //     this.lightCanvas.style.position = "absolute";
    //     this.lightCanvas.style.top = "0";
    //     this.lightCanvas.style.left = "0";
    //     document.body.appendChild(this.lightCanvas);
    //
    //     // 2. Get the canvas context
    //     this.lightCtx = this.lightCanvas.getContext("2d");
    //
    //     // 3. Lighting Properties
    //     this.lightRadius = 500; // Adjust for desired light spread
    //     this.lightResolution = 30; // Number of rays
    //
    //     console.log("✅ Lighting system initialized with canvas size:", this.lightCanvas.width, this.lightCanvas.height);
    // }
    //
    // updateLighting() {
    //     // 1. Clear previous lighting frame
    //     this.lightCtx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
    //
    //     // 2. Draw full black shadow
    //     this.lightCtx.fillStyle = "rgba(0,0,0,1)";
    //     this.lightCtx.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
    //
    //     // 3. Apply light mask
    //     this.castLight();
    // }
    //
    // /** Raycasting Function */
    // castLight() {
    //     const camera = this.cameras.main;
    //     const scale = camera.zoom;
    //
    //     // 1. Convert player world position to screen position
    //     const centerX = ((this.player.x + this.playerSize / 2) - camera.worldView.x) * scale;
    //     const centerY = ((this.player.y + this.playerSize / 2) - camera.worldView.y) * scale;
    //
    //     // 2. Define base light radius that always shows
    //     const minLightRadius = this.lightRadius * 0.4; // 40% of full light
    //
    //     // 3. Create soft glow using a radial gradient
    //     const gradient = this.lightCtx.createRadialGradient(
    //         centerX, centerY, 10, // Inner soft light
    //         centerX, centerY, 200 // Outer fade
    //     );
    //     gradient.addColorStop(0, "rgba(255,255,255,0.4)"); // Strong at center
    //     gradient.addColorStop(1, "rgba(0,0,0,0)"); // Fades out
    //
    //     this.lightCtx.globalCompositeOperation = "destination-out";
    //
    //     // 4. Draw the minimum light radius (unaffected by collisions)
    //     this.lightCtx.fillStyle = gradient;
    //     this.lightCtx.beginPath();
    //     this.lightCtx.arc(centerX, centerY, 200, 0, Math.PI * 2);
    //     this.lightCtx.fill();
    //
    //     // 5. Now cast light rays with obstacles
    //     const rays = this.getRays(this.player.x + this.playerSize / 2, this.player.y  + this.playerSize / 2, this.lightRadius);
    //     // 4. Create a gradient from the center to the light edges
    //     this.lightCtx.filter = "blur(10px)";
    //     const _gradient = this.lightCtx.createRadialGradient(
    //         centerX, centerY, 0, // **Start bright (20% radius)**
    //         centerX, centerY, 200 // **Fade out at full radius**
    //     );
    //     _gradient.addColorStop(0, "rgba(255,255,255,0.9)"); // Brightest center
    //     _gradient.addColorStop(0.5, "rgba(255,255,255,0.4)"); // Mid-fade
    //     _gradient.addColorStop(1, "rgba(255,255,255,0)"); // Fully transparent at edges
    //     this.lightCtx.fillStyle = _gradient;
    //     // 5. Draw the gradient-based light shape
    //     this.lightCtx.beginPath();
    //     if (rays.length > 1) {
    //         this.lightCtx.moveTo(
    //             (rays[0].x - camera.worldView.x) * scale,
    //             (rays[0].y - camera.worldView.y) * scale
    //         );
    //     }
    //     rays.forEach((point) => {
    //         this.lightCtx.lineTo(
    //             (point.x - camera.worldView.x) * scale,
    //             (point.y - camera.worldView.y) * scale
    //         );
    //     });
    //     this.lightCtx.closePath();
    //
    //     // 6. Apply the gradient
    //     this.lightCtx.fill();
    //     this.lightCtx.filter = "blur(0)";
    //
    //     // 7. Reset composite mode
    //     this.lightCtx.globalCompositeOperation = "source-over";
    // }
    //
    // /** Generate Rays for Light */
    // getRays(worldX, worldY, radius) {
    //     const rays = [];
    //     const angleStep = (Math.PI * 2) / this.lightResolution;
    //     let previousRay = null;
    //
    //     for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
    //         let endX = worldX + Math.cos(angle) * radius;
    //         let endY = worldY + Math.sin(angle) * radius;
    //         const collision = this.castRay(worldX, worldY, endX, endY);
    //
    //         let finalPoint = collision ? collision : { x: endX, y: endY };
    //
    //         // **Apply small random offset for smooth blending**
    //         const jitter = this.tileSize * 0.05;
    //         finalPoint.x += (Math.random() - 0.5) * jitter;
    //         finalPoint.y += (Math.random() - 0.5) * jitter;
    //
    //         // **Blend transition between neighboring rays**
    //         if (previousRay) {
    //             finalPoint.x = (finalPoint.x + previousRay.x) * 0.5;
    //             finalPoint.y = (finalPoint.y + previousRay.y) * 0.5;
    //         }
    //         if (finalPoint) {
    //         rays.push(finalPoint);
    //         previousRay = finalPoint;
    //         }
    //     }
    //     return rays;
    // }
    //
    // /** Cast a Ray and Detect Collisions */
    // castRay(startX, startY, endX, endY) {
    //     const line = new Phaser.Geom.Line(startX, startY, endX, endY);
    //     let closest = null;
    //     let minDist = Number.MAX_VALUE;
    //     let intersectionSide = null;
    //
    //     this.soilGroup.children.iterate((soil) => {
    //         if (soil.active) {
    //             const rect = new Phaser.Geom.Rectangle(soil.x, soil.y, this.tileSize, this.tileSize);
    //             const intersection = Phaser.Geom.Intersects.GetLineToRectangle(line, rect);
    //
    //             if (intersection.length > 0) {
    //                 const dist = Phaser.Math.Distance.Between(startX, startY, intersection[0].x, intersection[0].y);
    //                 if (dist < minDist) {
    //                     minDist = dist;
    //                     closest = intersection[0];
    //
    //                     // Detect which side of the tile was hit
    //                     const hitX = intersection[0].x;
    //                     const hitY = intersection[0].y;
    //
    //                     if (Math.abs(hitX - soil.x) < 2) intersectionSide = "left";
    //                     else if (Math.abs(hitX - (soil.x + this.tileSize)) < 2) intersectionSide = "right";
    //                     else if (Math.abs(hitY - soil.y) < 2) intersectionSide = "top";
    //                     else if (Math.abs(hitY - (soil.y + this.tileSize)) < 2) intersectionSide = "bottom";
    //                 }
    //             }
    //         }
    //     });
    //
    //     // **Smooth tile edge by nudging intersection inward**
    //     const softeningFactor = this.tileSize * 0.2;
    //     if (closest) {
    //         switch (intersectionSide) {
    //             case "left":
    //                 closest.x += softeningFactor;
    //                 break;
    //             case "right":
    //                 closest.x -= softeningFactor;
    //                 break;
    //             case "top":
    //                 closest.y += softeningFactor;
    //                 break;
    //             case "bottom":
    //                 closest.y -= softeningFactor;
    //                 break;
    //         }
    //     }
    //
    //     return closest;
    // }


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