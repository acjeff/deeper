import {Tile} from "./tile";
import {darkenColor} from "../services/colourManager";

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

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, darkenColor(0x724c25, parseInt(this.tileDetails.strength) / 10));
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
        this.fadeElements = [baseSprite];

        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.crackSprite.destroy();
        this.sprite.destroy();
        if (this.overlaySprite) this.overlaySprite.destroy();
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