import {Tile} from "./tile";
import {darkenColor, lightenColor} from "../services/colourManager";

const hexStringToInt = (str) => parseInt(str.replace(/^0x/, ''), 16);

export class Breakable extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        const randomDelay = Phaser.Math.Between(50, 100);
        if (this.tileDetails.caved) {
            this.game.time.delayedCall(randomDelay, () => {
                this.init();
                delete this.tileDetails.caved;
                let insideSquare = this.game.mapService.areSquaresIntersecting(this.game.player.x + 3, this.game.player.y + 3, 4, this.worldX, this.worldY, this.game.tileSize);
                if (insideSquare) {
                    // this.game.playerManager.die('crushed');
                    this.game.player.health = 0;
                }
            });
        } else {
            this.init();
        }
    }

    checkState() {
        this.checkStateWrapper();
    }

    addToGroup() {
        return this.game.soilGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.soilGroup.remove(this.sprite);
    }

    // Deterministic position-based pseudo-random in [0, 1).
    posHash(salt = 0) {
        const s = Math.sin(this.worldX * 12.9898 + this.worldY * 78.233 + salt * 37.719) * 43758.5453;
        return s - Math.floor(s);
    }

    isOpenNeighbor(block) {
        if (!block) return true;
        if (block.tileRef?.disabled) return true;
        if (block.tileRef && !block.tileRef.active) return true;
        const id = block.tileRef?.tileDetails?.id;
        return id === 0 || id === 2;
    }

    getEdgeMask() {
        const adj = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
        const aboveGroundY = this.game.aboveGround * this.game.tileSize;
        const isSurfaceTop = this.worldY <= aboveGroundY + this.game.tileSize;
        const top = this.isOpenNeighbor(adj.above) || isSurfaceTop;
        const right = this.isOpenNeighbor(adj.right);
        const bottom = this.isOpenNeighbor(adj.below);
        const left = this.isOpenNeighbor(adj.left);
        return (top ? 1 : 0) | (right ? 2 : 0) | (bottom ? 4 : 0) | (left ? 8 : 0);
    }

    redrawTile() {
        if (!this.tileGraphics || !this.active) return;
        const mask = this.getEdgeMask();
        if (mask === this.lastEdgeMask) return;
        this.lastEdgeMask = mask;

        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);

        const g = this.tileGraphics;
        g.clear();

        const ts = this.game.tileSize;
        const x = this.worldX - ts / 2;
        const y = this.worldY - ts / 2;

        // Sharp Terraria-style body. The "uneven" feel comes from internal
        // texture, not silhouette.
        g.fillStyle(this.tileBaseColor, 1);
        g.fillRect(x, y, ts, ts);

        if (this.tileDetails.type) return; // coal — overlay covers the rest

        const lightHex = hexStringToInt(lightenColor(this.tileBaseColor, 22));
        const dark1 = hexStringToInt(darkenColor(this.tileBaseColor, 22));
        const dark2 = hexStringToInt(darkenColor(this.tileBaseColor, 40));

        // Top edge: a brighter row when light hits from above.
        if (top) {
            g.fillStyle(lightHex, 0.95);
            g.fillRect(x, y, ts, 1);
            // Weather it with a few scattered dark pixels
            const wear = 2 + Math.floor(this.posHash(70) * 3);
            for (let i = 0; i < wear; i++) {
                const px = x + Math.floor(this.posHash(71 + i) * ts);
                g.fillStyle(dark1, 1);
                g.fillRect(px, y, 1, 1);
            }
        }
        // Bottom edge: a darker row to suggest shadow falloff.
        if (bottom) {
            g.fillStyle(dark2, 0.85);
            g.fillRect(x, y + ts - 1, ts, 1);
        }
        // Side edges: subtle vertical shading.
        if (left) {
            g.fillStyle(dark1, 0.55);
            g.fillRect(x, y, 1, ts);
        }
        if (right) {
            g.fillStyle(dark1, 0.55);
            g.fillRect(x + ts - 1, y, 1, ts);
        }

        // Chipped corners — where two adjacent sides face air, the corner
        // pixel reads as crumbled. Stops corners feeling perfectly square
        // without rounding the silhouette.
        const chip = (cx, cy) => { g.fillStyle(dark2, 1); g.fillRect(cx, cy, 1, 1); };
        if (top && left)     chip(x, y);
        if (top && right)    chip(x + ts - 1, y);
        if (bottom && left)  chip(x, y + ts - 1);
        if (bottom && right) chip(x + ts - 1, y + ts - 1);

        // Body texture: scatter darker and lighter pixels for soil grain.
        const speckleCount = 4 + Math.floor(this.posHash(2) * 3);
        for (let i = 0; i < speckleCount; i++) {
            const sx = x + 1 + Math.floor(this.posHash(10 + i) * (ts - 2));
            const sy = y + 1 + Math.floor(this.posHash(20 + i) * (ts - 2));
            const useLight = this.posHash(30 + i) > 0.78;
            g.fillStyle(useLight ? lightHex : dark1, useLight ? 0.7 : 0.85);
            g.fillRect(sx, sy, 1, 1);
        }

        // Grass on the topmost soil rows where the sky meets the surface.
        const aboveGroundY = this.game.aboveGround * ts;
        const isNearSurface = this.worldY >= aboveGroundY && this.worldY <= aboveGroundY + ts * 3;
        if (top && isNearSurface) {
            const grassA = 0x6e9c47;
            const grassB = 0x88b85c;
            const grassDark = 0x4f7330;
            // Solid green band along the top
            g.fillStyle(grassA, 1);
            g.fillRect(x, y, ts, 1);
            // Mottle with darker greens
            const mottle = 2 + Math.floor(this.posHash(60) * 3);
            for (let i = 0; i < mottle; i++) {
                const px = x + Math.floor(this.posHash(61 + i) * ts);
                g.fillStyle(grassDark, 1);
                g.fillRect(px, y, 1, 1);
            }
            // A second softer row of green underneath (Terraria-ish)
            g.fillStyle(grassA, 0.45);
            g.fillRect(x, y + 1, ts, 1);
            // Hanging/standing grass blades on top
            const blades = 2 + Math.floor(this.posHash(80) * 3);
            for (let i = 0; i < blades; i++) {
                const px = x + 1 + Math.floor(this.posHash(81 + i) * (ts - 2));
                const blen = 1 + Math.floor(this.posHash(91 + i) * 3);
                const useLight = this.posHash(101 + i) > 0.5;
                g.fillStyle(useLight ? grassB : grassA, 1);
                g.fillRect(px, y - blen, 1, blen);
            }
        }

        // Embedded curiosities — rare and small.
        const detailRoll = this.posHash(200);
        if (detailRoll < 0.04) {
            const detailType = this.posHash(201);
            if (detailType < 0.5) this.drawWorm(g);
            else this.drawFossil(g);
        } else if (detailRoll < 0.07) {
            this.drawPebbleCluster(g);
        }
    }

    drawWorm(g) {
        const cx = this.worldX;
        const cy = this.worldY + (this.posHash(112) - 0.5) * 1.4;
        const wormColor = 0xc9846f;
        const startX = cx - 1.8 + this.posHash(110) * 0.4;
        const endX = cx + 1.6 + this.posHash(113) * 0.4;
        const phase = this.posHash(114) * Math.PI * 2;
        const amp = 0.6 + this.posHash(115) * 0.4;
        const segments = 8;
        g.lineStyle(0.6, wormColor, 0.95);
        g.beginPath();
        g.moveTo(startX, cy);
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const wx = startX + (endX - startX) * t;
            const wave = Math.sin(t * Math.PI * 2.2 + phase) * amp;
            g.lineTo(wx, cy + wave);
        }
        g.strokePath();
        // Tiny head pixel
        const headWave = Math.sin(Math.PI * 2.2 + phase) * amp;
        g.fillStyle(wormColor, 1);
        g.fillRect(Math.round(endX - 0.5), Math.round(cy + headWave - 0.5), 1, 1);
    }

    drawFossil(g) {
        const cx = this.worldX;
        const cy = this.worldY;
        const baseAngle = (this.posHash(120) - 0.5) * 0.9;
        const cos = Math.cos(baseAngle);
        const sin = Math.sin(baseAngle);
        const boneColor = 0xd9c4a0;
        // Three vertebrae as 1px squares along a slightly curved spine.
        g.fillStyle(boneColor, 0.95);
        for (let i = 0; i < 3; i++) {
            const t = (i - 1) * 1.1;
            const px = cx + cos * t;
            const py = cy + sin * t;
            g.fillRect(Math.round(px - 0.5), Math.round(py - 0.5), 1, 1);
        }
        // Two short rib hints
        g.lineStyle(0.4, boneColor, 0.7);
        for (let side = -1; side <= 1; side += 2) {
            g.beginPath();
            const startX = cx - sin * 0.7 * side;
            const startY = cy + cos * 0.7 * side;
            const endX = cx + cos * 1.0 - sin * 1.4 * side;
            const endY = cy + sin * 1.0 + cos * 1.4 * side;
            g.moveTo(startX, startY);
            g.lineTo(endX, endY);
            g.strokePath();
        }
    }

    drawPebbleCluster(g) {
        const cx = this.worldX;
        const cy = this.worldY;
        const pebbleHex = hexStringToInt(darkenColor(this.tileBaseColor, 40));
        const count = 2 + Math.floor(this.posHash(130) * 2);
        g.fillStyle(pebbleHex, 0.95);
        for (let i = 0; i < count; i++) {
            const px = cx + (this.posHash(131 + i) - 0.5) * 4;
            const py = cy + (this.posHash(141 + i) - 0.5) * 4;
            g.fillRect(Math.round(px - 0.5), Math.round(py - 0.5), 1, 1);
        }
    }

    createSprite() {
        // Per-tile lightness jitter breaks the uniform colour-field so the
        // cave wall reads as organic dirt rather than a flat plane. Coal
        // tiles get less jitter since their overlay dominates.
        const jitterRange = this.tileDetails.type ? 4 : 9;
        const jitter = Phaser.Math.Between(-jitterRange, jitterRange);
        const baseFactor = parseInt(this.tileDetails.strength) / 10 + jitter;
        this.tileBaseColor = hexStringToInt(darkenColor(0x6e4525, baseFactor));

        // Invisible rectangle is the hit/collision body — visual is drawn
        // on the Graphics layer below.
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, this.tileBaseColor);
        baseSprite.setAlpha(0);

        this.tileGraphics = this.game.add.graphics();
        this.tileGraphics.setDepth(0);

        if (this.tileDetails.type) {
            this.image = this.game.soilTypes[this.tileDetails.type].image;
            this.overlaySprite = this.game.add.image(this.worldX, this.worldY, this.image);
            this.overlaySprite.setDisplaySize(this.game.tileSize, this.game.tileSize);
            this.overlaySprite.setDepth(3);
        }

        this.crackSprite = this.game.add.image(this.worldX, this.worldY, 'crack');
        this.crackSprite.setDisplaySize(this.game.tileSize - 1, this.game.tileSize - 1);
        this.crackSprite.setAlpha(1 - this.tileDetails.health + 0.1);
        this.crackSprite.setDepth(4);

        this.fadeElements = [this.tileGraphics];
        this.lastEdgeMask = -1;

        // Initial draw — neighbours may not all exist yet, so schedule a
        // follow-up once they've been created.
        this.redrawTile();
        this.edgeRefreshDelay = this.game.time.delayedCall(80, () => {
            this.lastEdgeMask = -1;
            this.redrawTile();
        });

        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.crackSprite.destroy();
        this.sprite.destroy();
        if (this.overlaySprite) this.overlaySprite.destroy();
        if (this.tileGraphics) this.tileGraphics.destroy();
        if (this.edgeRefreshDelay) this.edgeRefreshDelay.remove();
    }

    destroy(prefs) {
        if (!this.active) return;  // Guard against double-destroy
        if (this.clicking) {
            this.removeElements()
        } else {
            this.destroyHandler(this.removeElements.bind(this), prefs);
        }
    }

    onClick() {
        this.onClickHandler((adj) => {
            if (this.game.selectedTool.id === 'buttress' && this.tileDetails.id === 1 && this.tileDetails.strength === 100) {
                let baseCell = {...this.game.tileTypes.buttress};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            } else if (this.game.selectedTool.id === 'pickaxe') {
                if (this.clicking) return;
                this.clicking = true;
                this.game.player.energy -= 1;
                const hitPower = this.game.player.hitPower;
                let baseCell, damageAmount = this.tileDetails.damageAmount || 0;
                damageAmount += hitPower;
                let health = -(damageAmount / this.tileDetails.strength - 1);
                this.game.dustEmitter.setPosition(this.sprite.x, this.sprite.y);
                if (this.image) {
                    // TODO Throw out collision object
                    let debris = this.game.physics.add.image(this.worldX, this.worldY, this.image);
                    debris.setDisplaySize(3, 3)
                    debris.materialRef = this;
                    debris.setVelocity(Phaser.Math.Between(-10, 10), Phaser.Math.Between(-10, -10));
                    debris.setBounce(0.6);
                    this.game.debrisGroup.add(debris);
                }

                if (health <= 0) {
                    this.game.physics.world.disable(this.sprite);
                    this.crackSprite.setAlpha(0);
                    this.sprite.setStrokeStyle(0, 0);
                    this.game.dustEmitter.explode(50);
                    baseCell = this.tileDetails.trapped || {...this.game.tileTypes.empty};
                    this.clicking = false;
                    this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
                } else {
                    this.game.dustEmitter.explode(5);
                    this.game.tweens.add({
                        targets: this.crackSprite,
                        alpha: 1 - health,
                        duration: 50,
                        ease: 'Cubic.easeOut',
                        onComplete: () => {
                            baseCell = {...this.tileDetails, health: health, damageAmount: damageAmount};
                            this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
                            this.clicking = false;
                        }
                    });
                }
            }
        });
    }
}
