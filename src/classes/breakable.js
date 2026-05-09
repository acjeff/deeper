import {Tile} from "./tile";
import {darkenColor} from "../services/colourManager";

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
        const half = ts / 2;
        const x = this.worldX - half;
        const y = this.worldY - half;

        // Sharp pixel-art body. Edges get small deterministic 1px bumps
        // and erosions on sides that face air — adjacent tiles' bumps
        // don't have to align, which breaks the grid alignment naturally.
        g.fillStyle(this.tileBaseColor, 1);
        g.fillRect(x, y, ts, ts);

        if (this.tileDetails.type) return; // coal — overlay covers the rest

        const erodeColor = hexStringToInt(darkenColor(this.tileBaseColor, 35));

        // Helper: place a 1px nub just outside the tile in tile-base colour,
        // and a 1px darker erosion just inside, at hash-positioned spots.
        const decorateEdge = (axis, edgeOpen, salt) => {
            if (!edgeOpen) return;
            // 0-2 nubs sticking out
            const nubCount = Math.floor(this.posHash(salt) * 2.6);
            for (let i = 0; i < nubCount; i++) {
                const t = Math.floor(this.posHash(salt + 10 + i) * (ts - 2)) + 1;
                let px, py;
                if (axis === 'top')    { px = x + t;       py = y - 1; }
                if (axis === 'bottom') { px = x + t;       py = y + ts; }
                if (axis === 'left')   { px = x - 1;       py = y + t; }
                if (axis === 'right')  { px = x + ts;      py = y + t; }
                g.fillStyle(this.tileBaseColor, 1);
                g.fillRect(px, py, 1, 1);
            }
            // 1-3 erosions just inside the body
            const eroCount = 1 + Math.floor(this.posHash(salt + 20) * 2);
            for (let i = 0; i < eroCount; i++) {
                const t = Math.floor(this.posHash(salt + 30 + i) * (ts - 2)) + 1;
                let px, py;
                if (axis === 'top')    { px = x + t;       py = y; }
                if (axis === 'bottom') { px = x + t;       py = y + ts - 1; }
                if (axis === 'left')   { px = x;           py = y + t; }
                if (axis === 'right')  { px = x + ts - 1;  py = y + t; }
                g.fillStyle(erodeColor, 0.9);
                g.fillRect(px, py, 1, 1);
            }
        };
        decorateEdge('top', top, 200);
        decorateEdge('right', right, 220);
        decorateEdge('bottom', bottom, 240);
        decorateEdge('left', left, 260);

        // Speckles for organic texture inside the body.
        const speckleHex = hexStringToInt(darkenColor(this.tileBaseColor, 22));
        const speckleCount = 1 + Math.floor(this.posHash(2) * 3);
        for (let i = 0; i < speckleCount; i++) {
            const sx = (this.posHash(10 + i) - 0.5) * (ts - 3);
            const sy = (this.posHash(20 + i) - 0.5) * (ts - 3);
            g.fillStyle(speckleHex, 0.75);
            g.fillRect(Math.round(this.worldX + sx), Math.round(this.worldY + sy), 1, 1);
        }

        // Grass tufts on the topmost soil rows where the sky meets the surface.
        const aboveGroundY = this.game.aboveGround * ts;
        const isNearSurface = this.worldY >= aboveGroundY && this.worldY <= aboveGroundY + ts * 4;
        if (top && isNearSurface) {
            const tuftCount = 2 + Math.floor(this.posHash(50) * 3);
            for (let i = 0; i < tuftCount; i++) {
                const tx = x + 1 + this.posHash(60 + i) * (ts - 2);
                const tHeight = 1 + this.posHash(70 + i) * 1.5;
                const grassShade = this.posHash(80 + i) < 0.5 ? 0x6e9c47 : 0x7faa53;
                g.fillStyle(grassShade, 1);
                g.fillTriangle(
                    tx - 0.5, y + 0.5,
                    tx + 0.5, y + 0.5,
                    tx, y - tHeight
                );
            }
        }

        // Embedded curiosities — rare and small.
        const detailRoll = this.posHash(100);
        if (detailRoll < 0.04) {
            const detailType = this.posHash(101);
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
