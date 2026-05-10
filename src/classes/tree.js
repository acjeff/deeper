import {Tile} from "./tile";

const TREE_MAX_HEALTH = 1;
const TREE_HIT_POWER = 0.34;

export class Tree extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        if (this.tileDetails.health == null) this.tileDetails.health = TREE_MAX_HEALTH;
        this.init();
    }

    addToGroup() {
        return this.game.treeGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.treeGroup.remove(this.sprite);
    }

    // Trees are surface decoration above the cave system. They must not be
    // pulled into the soil cave-in logic that Tile.checkStateWrapper runs.
    checkState() {
        // intentionally empty
    }

    posHash(salt = 0) {
        const s = Math.sin(this.worldX * 12.9898 + this.worldY * 78.233 + salt * 37.719) * 43758.5453;
        return s - Math.floor(s);
    }

    createSprite() {
        const ts = this.game.tileSize;

        // Invisible hit body — sized to cover the canopy too so the player
        // can click the visible tree, not just the cell footprint. Center
        // is kept inside the cell's chunk row so unloadChunk still picks
        // the tree up by its world position.
        const hitW = ts * 1.6;
        const hitH = ts * 2.4;
        const hitCenterY = this.worldY + ts / 2 - hitH / 2 + ts * 0.4;
        const baseSprite = this.game.add.rectangle(this.worldX, hitCenterY, hitW, hitH, 0xffffff);
        baseSprite.setAlpha(0);

        // Trees pick from a couple of pre-rendered variants so a row of
        // them doesn't look identical. Variant is deterministic per cell.
        const variantCount = this.game.treeVariantCount || 1;
        const variantIdx = Math.floor(this.posHash(7) * variantCount);
        const textureKey = `tree_${variantIdx}`;
        const useKey = this.game.textures.exists(textureKey) ? textureKey : 'tree';

        // Anchor the trunk base at the bottom of the cell so the canopy
        // rises into the sky above the surface line.
        this.treeSprite = this.game.add.image(this.worldX, this.worldY + ts / 2, useKey);
        this.treeSprite.setOrigin(0.5, 1);
        this.treeSprite.setDisplaySize(ts * 1.8, ts * 3.2);
        this.treeSprite.setDepth(1);

        // Slight per-tile horizontal flip so the canopy reads as varied.
        if (this.posHash(11) > 0.5) this.treeSprite.setFlipX(true);

        const lean = (1 - (this.tileDetails.health ?? TREE_MAX_HEALTH)) * 0.18;
        if (lean > 0) this.treeSprite.setRotation(lean);

        this.fadeElements = [this.treeSprite];
        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        if (this.treeSprite) this.treeSprite.destroy();
        this.sprite.destroy();
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
        this.onClickHandler(() => {
            if (this.game.selectedTool?.id !== 'axe') return;
            if (this.clicking) return;
            this.clicking = true;
            if (this.game.player) this.game.player.energy -= 1;

            const hitPower = TREE_HIT_POWER;
            const health = (this.tileDetails.health ?? TREE_MAX_HEALTH) - hitPower;

            // Wobble feedback — quick rotation lean toward the swing side.
            if (this.treeSprite) {
                const dir = (this.game.player && this.game.player.x < this.worldX) ? 1 : -1;
                const base = this.treeSprite.rotation;
                this.game.tweens.add({
                    targets: this.treeSprite,
                    rotation: base + 0.12 * dir,
                    yoyo: true,
                    duration: 90,
                    ease: 'Sine.easeInOut',
                });
            }

            // Small leafy puff using the dust particle texture for free.
            if (this.game.dustEmitter) {
                this.game.dustEmitter.setPosition(this.worldX, this.worldY - this.game.tileSize);
                this.game.dustEmitter.explode(6);
            }

            if (health <= 0) {
                // Award wood and convert the tile back to sky.
                this.game.inventoryManager?.addWood?.(1);
                this.clicking = false;
                const baseCell = {...this.game.tileTypes.empty};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            } else {
                const baseCell = {...this.tileDetails, health};
                this.clicking = false;
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
        });
    }
}
