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
        // {block: block, direction: direction}
        this.onClickHandler((adj) => {
            if (this.game.selectedTool.id === '3') {
                let baseCell = {
                    ...window._tileTypes.light,
                    radius: 100,
                    color: window.lightColors[1],
                    neon: false,
                    attachedTo: adj
                };
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
            if (this.game.selectedTool.id === '6') {
                let baseCell = {...window._tileTypes.buttress};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
            if (this.game.selectedTool.id === '7') {
                let baseCell = {...window._tileTypes.rail};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
            if (this.game.selectedTool.id === '8') {
                let baseCell = {...window._tileTypes.rail, type: window._railTypes[1]};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
            if (this.game.selectedTool.id === '9') {
                let baseCell = {...window._tileTypes.rail, type: window._railTypes[2]};
                this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
            }
        })
    }

    destroy() {
        this.removeFromGroup();
        this.sprite.destroy();
    }
}