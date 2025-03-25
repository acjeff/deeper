import {MineCart} from "./minecart";
import {Tile} from "./tile";

function degrees_to_radians(degrees) {
    let pi = Math.PI;
    return degrees * (pi / 180);
}

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
            this.railSprite.setOrigin(0.5, 0.55);
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
        if (this.game.selectedTool.id === 'minecart') {
            let mineCart = new MineCart(this.game, this.worldX, this.worldY);
            this.tileDetails.mineCart = mineCart.id;
        } else {
            this.onClickHandler(this.setAsEmpty.bind(this));
        }
    }

    checkState() {
        this.checkStateWrapper(() => {
                if (this.tileDetails.mineCart) {
                    let _mineCart = this.game.mineCartGroup.getChildren().find(mc => mc.cartRef.id === this.tileDetails.mineCart);
                    const mineCart = _mineCart?.cartRef;
                    if (mineCart && mineCart.moving && mineCart.sprite.x === this.worldX && mineCart.sprite.y === this.worldY) {
                        let block;
                        const adjacentBlocks = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
                        const blockLeft = adjacentBlocks?.left;
                        const blockRight = adjacentBlocks?.right;
                        let blockTopRight, blockBottomRight;
                        if (blockRight) {
                            const RightAdjacentBlocks = this.game.mapService.getAdjacentBlocks(blockRight.tileRef?.worldX, blockRight.tileRef?.worldY);
                            blockTopRight = RightAdjacentBlocks?.above;
                            blockBottomRight = RightAdjacentBlocks?.below;
                        }
                        let blockTopLeft, blockBottomLeft;
                        if (blockLeft) {
                            const LeftAdjacentBlocks = this.game.mapService.getAdjacentBlocks(blockLeft.tileRef?.worldX, blockLeft.tileRef?.worldY);
                            blockTopLeft = LeftAdjacentBlocks?.above;
                            blockBottomLeft = LeftAdjacentBlocks?.below;
                        }
                        if (blockLeft && mineCart.directions.includes('left') && blockLeft.tileRef.tileDetails.id === 6 && !blockLeft.tileRef.tileDetails.mineCart) {
                            block = blockLeft;
                        } else if (blockTopLeft && mineCart.directions.includes('top_left') && blockTopLeft.tileRef.tileDetails.id === 6 && !blockTopLeft.tileRef.tileDetails.mineCart) {
                            block = blockTopLeft;
                        } else if (blockBottomLeft && mineCart.directions.includes('bottom_left') && blockBottomLeft.tileRef.tileDetails.id === 6 && !blockBottomLeft.tileRef.tileDetails.mineCart) {
                            block = blockBottomLeft;
                        } else if (blockRight && mineCart.directions.includes('right') && blockRight.tileRef.tileDetails.id === 6 && !blockRight.tileRef.tileDetails.mineCart) {
                            block = blockRight;
                        } else if (blockTopRight && mineCart.directions.includes('top_right') && blockTopRight.tileRef.tileDetails.id === 6 && !blockTopRight.tileRef.tileDetails.mineCart) {
                            block = blockTopRight;
                        } else if (blockBottomRight && mineCart.directions.includes('bottom_right') && blockBottomRight.tileRef.tileDetails.id === 6 && !blockBottomRight.tileRef.tileDetails.mineCart) {
                            block = blockBottomRight;
                        }
                        if (block) {
                            this.tileDetails.mineCart = null;
                            block.tileRef.tileDetails.mineCart = mineCart.id;
                            mineCart.setGoal({x: block.tileRef.worldX, y: block.tileRef.worldY});
                            if (block.tileRef.tileDetails?.type?.rotate) {
                                mineCart.setRotation(degrees_to_radians(block.tileRef.tileDetails?.type?.rotate));
                            } else {
                                mineCart.setRotation(degrees_to_radians(0));
                            }
                        }
                    }

                }
            }
        );
    }

}