import { Tile } from "./tile";

/**
 * Represents a liquid tile with advanced physics, animations, and grid-based fluid dynamics.
 * Extends Tile to simulate realistic liquid behavior in a game world.
 */
export class Liquid extends Tile {
    /**
     * Constructor for Liquid tile.
     * @param {Object} config - Configuration object for the liquid tile.
     * @param {Game} config.game - Reference to the game instance (e.g., Phaser scene).
     * @param {number} config.worldX - World X-coordinate of the liquid tile.
     * @param {number} config.worldY - World Y-coordinate of the liquid tile.
     * @param {Object} config.tileDetails - Tile-specific details (e.g., viscosity, color).
     * @param {Object} config.cellDetails - Grid cell details (e.g., gridX, gridY).
     * @throws {Error} - If required config parameters are missing.
     */
    constructor({ game, worldX, worldY, tileDetails = {}, cellDetails = {} }) {
        super({ game, worldX, worldY, tileDetails, cellDetails });

        if (!game || !Number.isFinite(worldX) || !Number.isFinite(worldY)) {
            throw new Error("Invalid Liquid configuration: game, worldX, and worldY are required.");
        }

        this.type = "liquid";
        this.active = true;
        this.gridX = cellDetails.gridX ?? Math.floor(worldX / game.tileSize);
        this.gridY = cellDetails.gridY ?? Math.floor(worldY / game.tileSize);
        this.flowSpeed = tileDetails.flowSpeed || 0.1; // Units per frame
        this.viscosity = Math.max(0, Math.min(1, tileDetails.viscosity || 0.5)); // Clamped 0-1
        this.color = tileDetails.color || 0x2ea5c3; // Default teal
        this.volume = tileDetails.volume || 1.0; // 0-1, affects opacity and spread
        this.evaporationRate = tileDetails.evaporationRate || 0.001; // Volume loss per frame
        this.flowDirection = { x: 0, y: 1 }; // Default downward
        this.sprite = null;
        this.soundEmitter = null;

        this.init();
    }

    /**
     * Initializes the liquid tile with sprite, physics, and audio.
     */
    init() {
        this.sprite = this.createSprite();
        this.sprite.setAlpha(this.volume * 0.5); // Volume influences transparency
        this.addToGroup();
        this.setupPhysics();
        this.applyShader();
        this.startFlowAnimation();
        this.setupAudio();
    }

    /**
     * Creates an enhanced sprite with texture support.
     * @returns {Phaser.GameObjects.Sprite} - The liquid sprite.
     */
    createSprite() {
        const sprite = this.game.add.rectangle(
            this.worldX,
            this.worldY,
            this.game.tileSize,
            this.game.tileSize,
            this.color
        );
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(1); // Ensure liquids layer correctly
        return sprite;
    }

    /**
     * Applies a shader for a rippling liquid effect (requires shader support in game engine).
     */
    applyShader() {
        if (this.game.renderer && this.game.renderer.pipelines) {
            const pipeline = this.game.renderer.pipelines.get("LiquidShader");
            if (pipeline) {
                this.sprite.setPipeline(pipeline);
                this.sprite.pipelineData = { time: 0, viscosity: this.viscosity };
            }
        }
    }

    /**
     * Adds the sprite to the liquid group.
     * @returns {boolean} - Success status.
     */
    addToGroup() {
        return this.game.liquidGroup?.add(this.sprite) ?? false;
    }

    /**
     * Removes the sprite from the liquid group.
     * @returns {boolean} - Success status.
     */
    removeFromGroup() {
        return this.game.liquidGroup?.remove(this.sprite) ?? false;
    }

    /**
     * Configures physics for realistic liquid behavior.
     */
    setupPhysics() {
        this.game.physics.add.existing(this.sprite, false);
        this.sprite.body.setAllowGravity(true);
        this.sprite.body.setBounce(0.1); // Slight bounce for splash realism
        this.sprite.body.setFriction(1 - this.viscosity); // Less viscous = less friction
        this.updateFlowVelocity();
    }

    /**
     * Sets up audio for ambient liquid sounds.
     */
    setupAudio() {
        if (this.game.sound) {
            this.soundEmitter = this.game.sound.add("liquidFlow", {
                loop: true,
                volume: this.volume * 0.3,
                rate: 1 + (1 - this.viscosity) * 0.5, // Faster for less viscous
            });
            this.soundEmitter.play();
        }
    }

    /**
     * Starts a flow animation with dynamic amplitude based on volume.
     */
    startFlowAnimation() {
        this.game.tweens.add({
            targets: this.sprite,
            y: this.worldY + this.game.tileSize * 0.1 * this.volume,
            duration: 1000 / (this.viscosity + 0.1), // Avoid division by zero
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            onUpdate: () => this.sprite.setAlpha(this.volume * 0.5),
        });
    }

    /**
     * Updates flow velocity based on direction and speed.
     */
    updateFlowVelocity() {
        this.sprite.body.setVelocity(
            this.flowDirection.x * this.flowSpeed * 100,
            this.flowDirection.y * this.flowSpeed * 100
        );
    }

    /**
     * Updates flow direction dynamically.
     * @param {Object} direction - New direction { x, y }.
     */
    updateFlowDirection(direction) {
        this.flowDirection = { x: Math.sign(direction.x), y: Math.sign(direction.y) };
        this.updateFlowVelocity();
    }

    /**
     * Handles interactions with other objects.
     * @param {Object} other - The interacting object.
     */
    onInteract(other) {
        if (!this.active) return;
        if (other.type === "player") {
            this.splashEffect();
            this.applyPlayerEffect(other);
        } else if (other.type === "liquid") {
            this.handleLiquidInteraction(other);
        }
    }

    /**
     * Creates a splash effect with particles and sound.
     */
    splashEffect() {
        const particles = this.game.add.particles(this.worldX, this.worldY, this.color, {
            speed: { min: 30, max: 70 },
            lifespan: { min: 200, max: 400 },
            quantity: Math.floor(this.volume * 15),
            scale: { start: this.volume * 0.5, end: 0 },
            alpha: { start: this.volume, end: 0 },
        });
        this.game.sound?.play("splash", { volume: this.volume * 0.5 });
        setTimeout(() => particles.destroy(), 500);
    }

    /**
     * Applies an effect to the player (e.g., slow down).
     * @param {Object} player - The player object.
     */
    applyPlayerEffect(player) {
        player.body.setVelocity(
            player.body.velocity.x * (1 - this.viscosity * 0.5),
            player.body.velocity.y * (1 - this.viscosity * 0.5)
        );
    }

    /**
     * Handles interactions with other liquids (mixing or displacement).
     * @param {Liquid} other - The other liquid tile.
     */
    handleLiquidInteraction(other) {
        if (this.color !== other.color) {
            this.mixColors(other);
        } else {
            this.mergeVolume(other);
        }
    }

    /**
     * Mixes colors with another liquid.
     * @param {Liquid} other - The other liquid tile.
     */
    mixColors(other) {
        const newColor = this.blendColors(this.color, other.color, this.volume, other.volume);
        this.color = newColor;
        this.sprite.setFillStyle(newColor);
    }

    /**
     * Blends two colors with volume weighting.
     * @param {number} color1 - First color in hex.
     * @param {number} color2 - Second color in hex.
     * @param {number} vol1 - Volume of first liquid.
     * @param {number} vol2 - Volume of second liquid.
     * @returns {number} - Blended color in hex.
     */
    blendColors(color1, color2, vol1, vol2) {
        const totalVol = vol1 + vol2;
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        const r = Math.floor((r1 * vol1 + r2 * vol2) / totalVol);
        const g = Math.floor((g1 * vol1 + g2 * vol2) / totalVol);
        const b = Math.floor((b1 * vol1 + b2 * vol2) / totalVol);
        return (r << 16) + (g << 8) + b;
    }

    /**
     * Merges volume with another liquid of the same color.
     * @param {Liquid} other - The other liquid tile.
     */
    mergeVolume(other) {
        this.volume = Math.min(1, this.volume + other.volume);
        other.destroy(); // Absorb the other liquid
    }

    /**
     * Updates the liquid state each frame.
     */
    update() {
        if (!this.active) return;

        this.checkFlowConditions();
        this.evaporate();
        this.updateShader();

        if (this.volume <= 0) {
            this.destroy();
        }
    }

    /**
     * Simulates grid-based fluid flow.
     */
    checkFlowConditions() {
        const grid = this.game.gridSystem; // Assumes a grid system exists
        if (!grid) return;

        const neighbors = [
            { x: 0, y: 1 }, // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 }, // Right
        ];

        for (const { x, y } of neighbors) {
            const newX = this.gridX + x;
            const newY = this.gridY + y;
            if (grid.isValidCell(newX, newY) && grid.isEmpty(newX, newY)) {
                this.spreadTo(newX, newY);
                break;
            }
        }
    }

    /**
     * Spreads liquid to an adjacent grid cell.
     * @param {number} gridX - Target grid X.
     * @param {number} gridY - Target grid Y.
     */
    spreadTo(gridX, gridY) {
        if (this.volume < 0.2) return; // Minimum volume to spread

        const spreadVolume = this.volume * 0.5;
        this.volume -= spreadVolume;

        const newLiquid = new Liquid({
            game: this.game,
            worldX: gridX * this.game.tileSize,
            worldY: gridY * this.game.tileSize,
            tileDetails: { ...this.tileDetails, volume: spreadVolume },
            cellDetails: { gridX, gridY },
        });
        this.game.gridSystem.setTile(gridX, gridY, newLiquid);
    }

    /**
     * Simulates evaporation over time.
     */
    evaporate() {
        this.volume = Math.max(0, this.volume - this.evaporationRate);
        this.sprite.setAlpha(this.volume * 0.5);
        if (this.soundEmitter) {
            this.soundEmitter.volume = this.volume * 0.3;
        }
    }

    /**
     * Updates shader time for animation (if applicable).
     */
    updateShader() {
        if (this.sprite.pipelineData) {
            this.sprite.pipelineData.time += 0.01;
        }
    }

    /**
     * Cleans up all resources.
     */
    removeElements() {
        this.active = false;
        this.removeFromGroup();
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.soundEmitter) {
            this.soundEmitter.stop();
            this.soundEmitter.destroy();
            this.soundEmitter = null;
        }
    }

    /**
     * Destroys the liquid tile safely.
     */
    destroy() {
        if (!this.active) return;
        this.removeElements();
        this.game.tweens.killTweensOf(this.sprite);
        this.game.gridSystem?.clearTile(this.gridX, this.gridY);
    }
}

/**
 * Example usage:
 * const liquid = new Liquid({
 *     game: phaserGameInstance,
 *     worldX: 100,
 *     worldY: 200,
 *     tileDetails: {
 *         viscosity: 0.8,
 *         color: 0x1e90ff,
 *         volume: 1.0,
 *         evaporationRate: 0.002,
 *     },
 *     cellDetails: { gridX: 5, gridY: 10 },
 * });
 */
