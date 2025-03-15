function degrees_to_radians(degrees)
{
    let pi = Math.PI;
    return degrees * (pi/180);
}

import {Tile} from "./tile";

export class Rail extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
    }

    addToGroup() {
        return this.game.railGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.railGroup.remove(this.sprite);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        this.railSprite = this.game.add.image(this.worldX, this.worldY, 'rail');
        if (this.tileDetails.type?.id) {
            this.railSprite.setOrigin(0.5, 0.);
            this.railSprite.setDisplaySize(this.game.tileSize + 4, this.game.tileSize - 0.5);
            this.railSprite.setRotation(degrees_to_radians(this.tileDetails.type.rotate));
        } else {
            this.railSprite.setOrigin(0.5, 0.08);
            this.railSprite.setDisplaySize(this.game.tileSize, this.game.tileSize);
        }
        baseSprite.setAlpha(0);
        this.fadeElements = [this.railSprite];
        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.railSprite.destroy();
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