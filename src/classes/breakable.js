import {Tile} from "./tile";
import {darkenColor} from "../services/colourManager";

export class Breakable extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        const randomDelay = Phaser.Math.Between(50, 100);
        if (this.tileDetails.caved) {
            this.game.time.delayedCall(randomDelay, () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    checkState() {
        console.log('Check block');
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
            const image = window._soilTypes[this.tileDetails.type].image;
            this.overlaySprite = this.game.add.image(this.worldX, this.worldY, image);
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

    destroy() {
        if (!this.active) return;  // Guard against double-destroy
        if (this.clicking) {
            this.removeElements()
        } else {
            this.animatedDestroy(this.removeElements.bind(this));
        }
    }

    onClick() {
        this.onClickHandler(() => {
            if (this.clicking) return;
            this.clicking = true;
            const hitPower = this.game.player.hitPower;
            let baseCell, damageAmount = this.tileDetails.damageAmount || 0;
            damageAmount += hitPower;
            let health = -(damageAmount / this.tileDetails.strength - 1);
            this.game.dustEmitter.setPosition(this.sprite.x, this.sprite.y);
            if (health <= 0) {
                console.log('destory block');
                this.game.physics.world.disable(this.sprite);
                this.crackSprite.setAlpha(0);
                this.sprite.setStrokeStyle(0, 0);
                this.game.dustEmitter.explode(50);
                baseCell = {...window._tileTypes.empty};
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
        });
    }
}