import {Tile} from "./tile";
import {TREE_BREEDS, TREE_MATURITY} from "../services/treeTextureFactory";

const FALLBACK_BREED = 'oak';
const FALLBACK_MATURITY = 'mature';

function pickFromHash(hash, options) {
    return options[Math.floor(hash * options.length) % options.length];
}

export class Tree extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});

        // Hydrate breed / maturity / seed for legacy saves that pre-date the
        // variety pass. Derive the missing fields deterministically from the
        // cell position so the same tree always re-rolls the same identity.
        if (!this.tileDetails.breed || !TREE_BREEDS[this.tileDetails.breed]) {
            this.tileDetails.breed = pickFromHash(this.posHash(13), Object.keys(TREE_BREEDS));
        }
        if (!this.tileDetails.maturity || !TREE_MATURITY[this.tileDetails.maturity]) {
            this.tileDetails.maturity = FALLBACK_MATURITY;
        }
        if (this.tileDetails.seed == null) {
            this.tileDetails.seed = Math.floor(this.posHash(0) * 1e9) >>> 0;
        }

        const mat = this.maturityDef();
        if (this.tileDetails.health == null) {
            this.tileDetails.health = mat.hitsToFell;
        }

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

    breedDef() {
        return TREE_BREEDS[this.tileDetails.breed] || TREE_BREEDS[FALLBACK_BREED];
    }

    maturityDef() {
        return TREE_MATURITY[this.tileDetails.maturity] || TREE_MATURITY[FALLBACK_MATURITY];
    }

    createSprite() {
        const ts = this.game.tileSize;
        const factory = this.game.treeTextures;
        const breed = this.tileDetails.breed;
        const maturity = this.tileDetails.maturity;
        const seed = this.tileDetails.seed >>> 0;
        const variantCount = factory?.variantsPerCombination || 1;
        const variantIdx = seed % variantCount;
        const textureKey = factory
            ? factory.ensure(breed, maturity, variantIdx)
            : 'tree';

        const breedDef = this.breedDef();
        const matDef = this.maturityDef();

        // Texture native dimensions are baked at "1 px = 1 game unit" so a
        // sapling oak (~6x12 px) reads as a quarter-tile-wide seedling and a
        // mature oak (~18x32 px) reads as ~1.8 x 3.2 tiles. We just match
        // displaySize to the texture and let pixelArt rendering take over.
        const targetW = breedDef.baseW * matDef.scale;
        const targetH = breedDef.baseH * matDef.scale;

        // Hit body — sized to cover the visible foliage so clicks on the
        // canopy register. Center stays inside the tile's chunk row so
        // chunk loading/unloading still picks the tree up by world Y.
        const hitW = Math.max(ts * 0.8, targetW * 0.9);
        const hitH = Math.max(ts, targetH * 0.85);
        const hitCenterY = this.worldY + ts / 2 - hitH / 2 + ts * 0.35;
        const baseSprite = this.game.add.rectangle(this.worldX, hitCenterY, hitW, hitH, 0xffffff);
        baseSprite.setAlpha(0);

        // Trunk anchored at the bottom of the cell so the canopy rises into
        // the sky and the trunk sits on the soil-grass line.
        this.treeSprite = this.game.add.image(this.worldX, this.worldY + ts / 2, textureKey);
        this.treeSprite.setOrigin(0.5, 1);
        this.treeSprite.setDisplaySize(targetW, targetH);
        this.treeSprite.setDepth(1);

        // Per-tree aesthetic touches driven by the persistent seed so they
        // survive a save / reload: horizontal flip, slight lean, slight
        // sway-from-vertical that gets exaggerated as the tree loses health.
        if ((seed >> 3) & 1) this.treeSprite.setFlipX(true);
        const swayDir = ((seed >> 7) & 1) ? -1 : 1;
        const swayMag = ((seed >> 11) & 0xff) / 255 * (matDef.maxLean || 0.04);
        const baseLean = swayDir * swayMag;
        const damageProgress = 1 - (this.tileDetails.health ?? matDef.hitsToFell) / matDef.hitsToFell;
        const damageLean = damageProgress * (swayDir * 0.22);
        this.treeSprite.setRotation(baseLean + damageLean);

        this.fadeElements = [this.treeSprite];
        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        if (this.treeSprite) this.treeSprite.destroy();
        this.sprite.destroy();
        this._destroyBorderGraphics();
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

            const matDef = this.maturityDef();
            const maxHealth = matDef.hitsToFell;
            const newHealth = (this.tileDetails.health ?? maxHealth) - 1;

            // Wobble feedback toward the swing side.
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

            if (this.game.dustEmitter) {
                this.game.dustEmitter.setPosition(this.worldX, this.worldY - this.game.tileSize);
                this.game.dustEmitter.explode(4 + Math.floor(matDef.scale * 4));
            }

            if (newHealth <= 0) {
                // Award wood scaled by maturity — saplings drop nothing,
                // ancients drop a handful.
                if (matDef.woodYield > 0) {
                    this.game.inventoryManager?.addWood?.(matDef.woodYield);
                }
                this.clicking = false;
                const baseCell = {...this.game.tileTypes.empty};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            } else {
                const baseCell = {...this.tileDetails, health: newHealth};
                this.clicking = false;
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
        });
    }
}
