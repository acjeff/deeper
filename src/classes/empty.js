import {Tile} from "./tile";

export class Empty extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.game = game;
        this.init();
    }

    addToGroup() {
        return this.game.emptyGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.emptyGroup.remove(this.sprite);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        baseSprite.setAlpha(0);
        return baseSprite;
    }

    onClick() {
        this.onClickHandler(() => {
            let baseCell = {...window._tileTypes.light, radius: 100, color: window.lightColors[1], neon: false};
            this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
        })
    }

    destroy() {
        this.removeFromGroup();
        this.sprite.destroy();
    }
}
