import {Tile} from "./tile";

export class Liquid extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
        this.sprite.setAlpha(0.5);
    }

    checkState() {}

    addToGroup() {
        return this.game.liquidGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.liquidGroup.remove(this.sprite);
    }

    createSprite() {
        const liquid = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, 0x2EA5C3);;
        // this.game.physics.add.existing(liquid, true);
        return liquid;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.sprite.destroy();
    }

    destroy() {
        if (!this.active) return;  // Guard against double-destroy
        this.removeElements()
    }
}