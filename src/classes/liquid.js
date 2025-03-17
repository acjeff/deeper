import {Tile} from "./tile";

export class Liquid extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
        this.sprite.setAlpha(0.5);
    }

    addToGroup() {
        return this.game.liquidGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.liquidGroup.remove(this.sprite);
    }

    createSprite() {
        const liquid = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, 0x2EA5C3);
        ;
        // this.game.physics.add.existing(liquid, true);
        return liquid;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.sprite.destroy();
    }

    checkState() {
        this.checkStateWrapper(() => {
            const adjacentBlocks = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
            const blockAbove = adjacentBlocks?.above;
            const blockBelow = adjacentBlocks?.below;
            const blockLeft = adjacentBlocks?.left;
            const blockRight = adjacentBlocks?.right;
            let tileDetails;

            if (blockBelow && (blockBelow.tileRef?.tileDetails?.id === 0 || blockBelow.tileRef?.tileDetails?.id === 4)) {
                tileDetails = {...window._tileTypes.empty};

                this.game.mapService.setTile(blockBelow.tileRef?.worldX, blockBelow.tileRef?.worldY, {
                    ...window._tileTypes.liquid
                }, blockBelow);
                //     FOR MOVING LEFT AND RIGHT SAVE THE LAST DIRECTION AND PRIORITISE
            } else if (blockLeft && (blockLeft.tileRef?.tileDetails?.id === 0 || blockLeft.tileRef?.tileDetails?.id === 4) && this.tileDetails?.lm === 'left') {
                tileDetails = {...window._tileTypes.empty};

                this.game.mapService.setTile(blockLeft.tileRef?.worldX, blockLeft.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'left'
                }, blockLeft);
            } else if (blockRight && (blockRight.tileRef?.tileDetails?.id === 0 || blockRight.tileRef?.tileDetails?.id === 4) && this.tileDetails?.lm === 'right') {
                tileDetails = {...window._tileTypes.empty};

                this.game.mapService.setTile(blockRight.tileRef?.worldX, blockRight.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'right'
                }, blockRight);
            } else if (blockLeft && (blockLeft.tileRef?.tileDetails?.id === 0 || blockLeft.tileRef?.tileDetails?.id === 4)) {
                tileDetails = {...window._tileTypes.empty};
                this.game.mapService.setTile(blockLeft.tileRef?.worldX, blockLeft.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'left'
                }, blockLeft);
            } else if (blockRight && (blockRight.tileRef?.tileDetails?.id === 0 || blockRight.tileRef?.tileDetails?.id === 4)) {
                tileDetails = {...window._tileTypes.empty};
                this.game.mapService.setTile(blockRight.tileRef?.worldX, blockRight.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'right'
                }, blockRight);
            }
            if (tileDetails) {
                if (this.tileDetails.id !== 0) {
                    tileDetails.trapped = this.tileDetails;
                }
                this.game.mapService.setTile(this.worldX, this.worldY, tileDetails, this.sprite);
            }
        });
    }

    destroy() {
        if (!this.active) return;  // Guard against double-destroy
        this.removeElements()
    }
}