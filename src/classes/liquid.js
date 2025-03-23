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
        liquid.setDepth(999999)
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
            const blockBelow = adjacentBlocks?.below;
            const blockLeft = adjacentBlocks?.left;
            const blockRight = adjacentBlocks?.right;
            let tileDetails = this.tileDetails.trapped ? {...this.tileDetails.trapped} : {...this.game.tileTypes.empty};
            // let tileDetails = {...this.game.tileTypes.empty};
            let block;
            let lm;

            if (blockBelow && (blockBelow.tileRef?.tileDetails?.id !== 1 && blockBelow.tileRef?.tileDetails?.id !== 5 && blockBelow.tileRef?.tileDetails?.id !== 2)) {
                block = blockBelow;
            } else if (blockLeft && (blockLeft.tileRef?.tileDetails?.id !== 1 && blockLeft.tileRef?.tileDetails?.id !== 5 && blockLeft.tileRef?.tileDetails?.id !== 2) && this.tileDetails?.lm === 'left') {
                block = blockLeft;
                lm = 'left';
            } else if (blockRight && (blockRight.tileRef?.tileDetails?.id !== 1 && blockRight.tileRef?.tileDetails?.id !== 5 && blockRight.tileRef?.tileDetails?.id !== 2) && this.tileDetails?.lm === 'right') {
                block = blockRight;
                lm = 'right';
            } else if (blockLeft && (blockLeft.tileRef?.tileDetails?.id !== 1 && blockLeft.tileRef?.tileDetails?.id !== 5 && blockLeft.tileRef?.tileDetails?.id !== 2)) {
                block = blockLeft;
                lm = 'left';
            } else if (blockRight && (blockRight.tileRef?.tileDetails?.id !== 1 && blockRight.tileRef?.tileDetails?.id !== 5 && blockRight.tileRef?.tileDetails?.id !== 2)) {
                block = blockRight;
                lm = 'right';
            }
            if (block) {
                let liquidDetails = {
                    ...this.game.tileTypes.liquid
                };
                if (lm) {
                    liquidDetails.lm = lm;
                }
                liquidDetails.trapped = {...block.tileRef?.tileDetails};
                this.game.mapService.setTile(block.tileRef?.worldX, block.tileRef?.worldY, liquidDetails, block);
                this.game.mapService.setTile(this.worldX, this.worldY, tileDetails, this.sprite);
            }
        });
    }

    destroy() {
        if (!this.active) return;  // Guard against double-destroy
        this.removeElements()
    }
}