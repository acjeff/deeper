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

    isNearSurface() {
        const ts = this.game.tileSize;
        const aboveGroundY = this.game.aboveGround * ts;
        return this.worldY >= aboveGroundY && this.worldY <= aboveGroundY + ts * 3;
    }

    redrawTile() {
        if (!this.tileImage || !this.active) return;
        const mask = this.getEdgeMask();
        if (mask === this.lastEdgeMask) return;
        this.lastEdgeMask = mask;

        // Coal tiles use the existing dark base + overlay sprite — skip
        // texture swap so the overlay still shows.
        if (this.tileDetails.type) return;

        const atlas = this.game.tileAtlas;
        const top = !!(mask & 1);
        const variant = Math.floor(this.posHash(0) * atlas.variantCount);
        const useGrass = top && this.isNearSurface();
        const key = atlas.keyFor(useGrass ? 'grass' : 'dirt', mask, variant);
        if (this.tileImage.texture.key !== key) {
            this.tileImage.setTexture(key);
        }
    }

    drawDetailOverlay() {
        if (this.tileDetails.type) return; // skip on coal
        const detailRoll = this.posHash(200);
        if (detailRoll >= 0.07) return;

        this.detailGraphics = this.game.add.graphics();
        this.detailGraphics.setDepth(2);
        const g = this.detailGraphics;
        if (detailRoll < 0.04) {
            const detailType = this.posHash(201);
            if (detailType < 0.5) this.drawWorm(g);
            else this.drawFossil(g);
        } else {
            this.drawPebbleCluster(g);
        }
        if (this.fadeElements) this.fadeElements.push(this.detailGraphics);
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
        g.fillStyle(boneColor, 0.95);
        for (let i = 0; i < 3; i++) {
            const t = (i - 1) * 1.1;
            const px = cx + cos * t;
            const py = cy + sin * t;
            g.fillRect(Math.round(px - 0.5), Math.round(py - 0.5), 1, 1);
        }
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
        const pebbleHex = hexStringToInt(darkenColor(0x6e4525, 40));
        const count = 2 + Math.floor(this.posHash(130) * 2);
        g.fillStyle(pebbleHex, 0.95);
        for (let i = 0; i < count; i++) {
            const px = cx + (this.posHash(131 + i) - 0.5) * 4;
            const py = cy + (this.posHash(141 + i) - 0.5) * 4;
            g.fillRect(Math.round(px - 0.5), Math.round(py - 0.5), 1, 1);
        }
    }

    createSprite() {
        const atlas = this.game.tileAtlas;
        const ts = this.game.tileSize;
        const overhang = atlas.grassOverhang;

        // Invisible rectangle is the hit/collision body. Visual is the
        // Image sprite below, which references a pre-rendered atlas texture.
        const baseColor = hexStringToInt(darkenColor(0x6e4525, parseInt(this.tileDetails.strength) / 10));
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, ts, ts, baseColor);
        baseSprite.setAlpha(0);

        // Place the image so its body region (bottom tileSize rows of the
        // textureHeight-tall texture) aligns with the world tile bounds.
        // Center origin + Y offset = -overhang/2 means the texture's vertical
        // center sits overhang/2 above worldY.
        const initialKey = atlas.keyFor('dirt', 0, 0);
        this.tileImage = this.game.add.image(this.worldX, this.worldY - overhang / 2, initialKey);
        this.tileImage.setOrigin(0.5, 0.5);
        this.tileImage.setDepth(0);

        if (this.tileDetails.type) {
            this.image = this.game.soilTypes[this.tileDetails.type].image;
            this.overlaySprite = this.game.add.image(this.worldX, this.worldY, this.image);
            this.overlaySprite.setDisplaySize(ts, ts);
            this.overlaySprite.setDepth(3);
            // Hide the dirt texture under coal — overlay covers it.
            this.tileImage.setVisible(false);
        }

        this.crackSprite = this.game.add.image(this.worldX, this.worldY, 'crack');
        this.crackSprite.setDisplaySize(ts - 1, ts - 1);
        this.crackSprite.setAlpha(1 - this.tileDetails.health + 0.1);
        this.crackSprite.setDepth(4);

        this.fadeElements = [this.tileImage];
        this.lastEdgeMask = -1;

        // Initial draw — neighbours may not exist yet, so do an initial
        // pass and a delayed follow-up.
        this.redrawTile();
        this.edgeRefreshDelay = this.game.time.delayedCall(80, () => {
            this.lastEdgeMask = -1;
            this.redrawTile();
        });

        // Rare embedded detail: drawn once as a tiny Graphics overlay since
        // it's truly per-tile (not cacheable) and only fires on ~7% of tiles.
        this.drawDetailOverlay();

        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.crackSprite.destroy();
        this.sprite.destroy();
        if (this.overlaySprite) this.overlaySprite.destroy();
        if (this.tileImage) this.tileImage.destroy();
        if (this.detailGraphics) this.detailGraphics.destroy();
        if (this.edgeRefreshDelay) this.edgeRefreshDelay.remove();
    }

    destroy(prefs) {
        if (!this.active) return;
        if (this.clicking) {
            this.removeElements();
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
                    let debris = this.game.physics.add.image(this.worldX, this.worldY, this.image);
                    debris.setDisplaySize(3, 3);
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
