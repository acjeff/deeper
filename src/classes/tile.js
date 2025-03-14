export class Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        this.game = game;
        this.worldX = worldX;
        this.worldY = worldY;
        // getCellFromWorldPosition
        // getChunkKey
        // this.chunkKey = cellDetails?.chunkKey || this.game.mapService.getChunkKey(worldX, worldY);
        // this.cellX = cellDetails?.cellX || this.game.mapService.getCellFromWorldPosition(worldX, worldY).cellX;
        // this.cellY = cellDetails?.cellY || this.game.mapService.getCellFromWorldPosition(worldX, worldY).cellY;
        this.chunkKey = cellDetails?.chunkKey;
        this.cellX = cellDetails?.cellX;
        this.cellY = cellDetails?.cellY;
        this.tileDetails = tileDetails;
        this.cellDetails = cellDetails;
        this.active = true;
        // Create an event emitter for this tile.
        this.emitter = new Phaser.Events.EventEmitter();
    }

    init() {
        this.sprite = this.createSprite();
        this.sprite.tileRef = this;
        this.sprite.cellX = this.cellX;
        this.sprite.cellY = this.cellY;
        this.sprite.chunkKey = this.chunkKey;
        this.borderGraphics = this.game.add.graphics();
        this.borderGraphics.lineStyle(0.5, 0xFFA500, 1); // 2px white border
        this.borderGraphics.strokeRect(
            this.sprite.x - this.sprite.displayWidth / 2,
            this.sprite.y - this.sprite.displayHeight / 2,
            this.sprite.displayWidth,
            this.sprite.displayHeight);
        this.borderGraphics.setDepth(10);
        this.borderGraphics.setAlpha(0);
        this.setupInteractions();
        this.addToGroup();
        if (this.sprite && this.fadeElements && this.fadeElements.length > 0) {
            this.fadeElements.forEach(fe => {
                if (this.tileDetails.caved) {
                    fe.y -= this.game.tileSize;
                } else {
                    fe.setAlpha(0);
                }
            });
            let anims = {
                targets: this.fadeElements,
                alpha: 1,
                duration: window.fadeSpeed, // Duration in ms; adjust as needed
                ease: 'ease-out'
            };
            if (this.tileDetails.caved) {
                anims.y = '+=' + this.game.tileSize;
                this.game.dustEmitter.setPosition(this.sprite.x, this.sprite.y + this.game.tileSize);
                this.game.dustEmitter.explode(50);
            }
            this.game.tweens.add(anims);
        }
    }

    checkState() {
        const adjacentBlocks = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
        const blockAbove = adjacentBlocks?.above;
        const blockBelow = adjacentBlocks?.below;
        const blockLeft = adjacentBlocks?.left;
        const blockRight = adjacentBlocks?.right;
        let tileDetails;
        if (this.tileDetails.id !== 2) {
            if (blockAbove && blockAbove.tileRef?.tileDetails?.id === 1 && blockAbove.tileRef?.tileDetails?.strength === 100) {
                tileDetails = {
                    ...window._tileTypes.soil,
                    strength: 100,
                    caved: true
                };
            }
        }
        if (this.tileDetails.id === 2) {
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
        }

        if (tileDetails) {
            if (this.tileDetails.id !== 0) {
                tileDetails.trapped = this.tileDetails;
            }
            this.game.mapService.setTile(this.worldX, this.worldY, tileDetails, this.sprite);
        }
    }

    animatedDestroy(cb) {
        this.disabled = true;
        if (this.sprite && this.fadeElements && this.fadeElements.length > 0) {
            // Tween the sprite's alpha from 0 to 1 to create the fade-in effect.
            this.game.tweens.add({
                targets: this.fadeElements,
                alpha: 0,
                duration: window.fadeSpeed, // Duration in ms; adjust as needed
                ease: 'ease-out',
                onComplete: cb
            });
        }
    }

    addToGroup() {
    }

    removeFromGroup() {
    }

    onMouseLeave() {
        this.borderGraphics.setAlpha(0);
    }

    onMouseEnter(hoveredBlock) {
        const metadata = this.game.selectedTool?.metadata;
        if (metadata?.interactsWith?.find(tile => tile.id === this.tileDetails.id) || (metadata?.reclaimFrom?.id === this.tileDetails.id)) {
            this.borderGraphics.setAlpha(1);
        }
    }

    createSprite() {
    }

    setupInteractions() {
        if (this.sprite.setInteractive) {
            this.sprite.setInteractive();
        }
    }

    onClickHandler(cb) {
        if (this.disabled) return;
        const metadata = this.game.selectedTool?.metadata;
        if (metadata.interactsWith?.find(tile => tile.id === this.tileDetails.id) && (!metadata.limited || metadata.number)) {
            cb();
            if (metadata.number) {
                this.game.selectedTool.updateMetaData({...metadata, number: metadata.number - 1});
                this.game.toolBarManager.render();
            }
        } else if (metadata.reclaimFrom?.id === this.tileDetails?.id) {
            cb();
            this.game.selectedTool.updateMetaData({...metadata, number: metadata.number + 1});
            this.game.toolBarManager.render();
        }
    }

    onClick(cb) {
    }

    destroy() {
        this.sprite.destroy();
    }
}
