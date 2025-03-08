import {Tile} from "./tile";
import {darkenColor} from "../services/colourManager";

export class Soil extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
    }

    addToGroup() {
        return this.game.soilGroup.add(this.sprite);
    }

    onMouseLeave() {
        this.sprite.setStrokeStyle(0, 0);
        this.sprite.setDepth(1);
        this.crackSprite.setDepth(2);
    }

    onMouseEnter(hoveredBlock) {
        this.sprite.setStrokeStyle(1, 0xFFA500);
        this.sprite.setDepth(999);
        this.crackSprite.setDepth(9910);
    }

    createSprite() {
        const baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, darkenColor(0x724c25, parseInt(this.tileDetails.strength) / 10));

        this.crackSprite = this.game.add.image(this.worldX, this.worldY, 'crack');
        this.crackSprite.setDisplaySize(this.game.tileSize - 1, this.game.tileSize - 1);
        this.crackSprite.setAlpha(1 - this.tileDetails.health + 0.1);
        this.crackSprite.setDepth(2);
        return baseSprite;
    }

    destroy() {
        this.crackSprite.destroy();
        this.sprite.destroy();
    }

    onClick() {
        if (this.clicking) return;
        this.clicking = true;
        const hitPower = this.game.player.hitPower;
        console.log(hitPower, ' : hitPower');
        let baseCell, damageAmount = this.tileDetails.damageAmount || 0;
        console.log(damageAmount.toString(), ' : damageAmount');
        damageAmount += hitPower;
        console.log(damageAmount.toString(), ' : damageAmount');
        console.log(this.tileDetails.strength, ' : this.tileDetails.strength');
        let health = -(damageAmount / this.tileDetails.strength - 1);
        console.log(health, ' : health')
        this.game.dustEmitter.setPosition(this.sprite.x, this.sprite.y);
        if (health <= 0) {
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
    }
}