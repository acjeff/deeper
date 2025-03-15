import {Tile} from "./tile";

export class Buttress extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
    }

    addToGroup() {
        return this.game.buttressGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.buttressGroup.add(this.sprite);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        this.buttressSprite = this.game.add.image(this.worldX, this.worldY, 'buttress');
        this.buttressSprite.setDisplaySize(this.game.tileSize, this.game.tileSize);
        baseSprite.setAlpha(0);
        this.fadeElements = [this.buttressSprite];
        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.buttressSprite.destroy();
        this.sprite.destroy();
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
        this.onClickHandler(this.setAsEmpty.bind(this));
    }

}