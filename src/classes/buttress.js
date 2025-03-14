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
        this.buttressSprite.setDepth(-1);
        baseSprite.setAlpha(0);
        this.fadeElements = [this.buttressSprite];
        return baseSprite;
    }

    destroy() {
        this.removeFromGroup();
        this.sprite.destroy();
        this.buttressSprite.destroy();
    }

    setAsEmpty() {
        let baseCell = {...window._tileTypes.empty};
        this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
    }

    onClick() {
        this.onClickHandler(this.setAsEmpty.bind(this));
    }

}