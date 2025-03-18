const uuid = function () {
    return Math.random().toString(36).substr(2);
}

export class Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails, prefs}) {
        this.game = game;
        this.worldX = worldX;
        this.prefs = prefs;
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
        if (this.sprite && this.fadeElements && this.fadeElements.length > 0 && !this.prefs?.noAnimation) {
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
                duration: this.game.fadeSpeed, // Duration in ms; adjust as needed
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
        this.checkStateWrapper();
    }

    checkStateWrapper(cb) {
        const adjacentBlocks = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
        const blockAbove = adjacentBlocks?.above;
        let tileDetails;
        if (this.tileDetails.id !== 2 && this.tileDetails.id !== 5) {
            if (blockAbove && blockAbove.tileRef?.tileDetails?.id === 1 && blockAbove.tileRef?.tileDetails?.strength === 100) {
                tileDetails = {
                    ...this.game.tileTypes.soil,
                    strength: 100,
                    caved: true
                };
            }
        }

        if (tileDetails) {
            if (this.tileDetails.id !== 0) {
                tileDetails.trapped = this.tileDetails;
            }
            this.game.mapService.setTile(this.worldX, this.worldY, tileDetails, this.sprite);
        } else {
            if (cb) cb();
        }
    }

    setAsEmpty() {
        let baseCell = {...this.game.tileTypes.empty};
        this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
    }

    destroyHandler(cb, prefs) {
        this.disabled = true;
        if (!prefs?.preserveAttached) {
            const adjacentBlocks = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
            if (Object.values(adjacentBlocks).find(b => b && b.tileRef.tileDetails.attachedTo)) {
                console.log('This block: ', this.tileDetails);
                Object.entries(adjacentBlocks).forEach(([direction, block]) => {
                    console.log(direction, ' : ', block);
                    if (block && block.tileRef && block.tileRef.tileDetails.attachedTo && block.tileRef.tileDetails.attachedTo.block && block.tileRef.tileDetails.attachedTo.block === this.tileDetails.uuid) {
                        let baseCell = {...this.game.tileTypes.empty};
                        this.game.mapService.setTile(block.tileRef.worldX, block.tileRef.worldY, baseCell, block.tileRef.sprite);
                    }
                });
            }
        }

        if (this.sprite && this.fadeElements && this.fadeElements.length > 0 && !prefs?.noAnimation) {
            // Tween the sprite's alpha from 0 to 1 to create the fade-in effect.
            this.game.tweens.add({
                targets: this.fadeElements,
                alpha: 0,
                duration: this.game.fadeSpeed, // Duration in ms; adjust as needed
                ease: 'ease-out',
                onComplete: () => {
                    this.game.controlsManager.getInteractableBlock(15);
                    cb();
                }
            });
        } else {
            this.game.controlsManager.getInteractableBlock(15);
            cb();
        }
    }

    addToGroup() {
    }

    removeFromGroup() {
    }

    onMouseLeave() {
        this.borderGraphics.setAlpha(0);
    }

    checkAdjacentBlocks(metadata) {
        let result = false;
        if (metadata?.mustBeGroundedTo) {
            const adjacentBlocks = this.game.mapService.getAdjacentBlocks(this.worldX, this.worldY);
            if (Object.values(adjacentBlocks).find(b => b)) {
                Object.entries(adjacentBlocks).forEach(([key, block]) => {
                    const direction = metadata?.mustBeGroundedTo.sides.find(s => key === s);
                    if (metadata?.mustBeGroundedTo.tiles.find(t => t.id === block?.tileRef?.tileDetails?.id) && direction) {
                        result = {block: block, direction: direction};
                    }
                });
            }
        } else {
            result = true;
        }
        return result;
    }

    onMouseEnter(hoveredBlock) {
        const metadata = this.game.selectedTool?.metadata;
        if (metadata?.interactsWith?.find(tile => tile.id === this.tileDetails.id && ((
            !tile.additionalChecks ||
            Object.entries(tile.additionalChecks).filter(
                ([key, value]) => this.tileDetails[key] !== value
            ).length === 0
        ))) || (metadata?.reclaimFrom?.id === this.tileDetails.id)) {
            const adj = this.checkAdjacentBlocks(metadata);
            if (adj) {
                this.borderGraphics.setAlpha(1);
            }
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
        const adj = this.checkAdjacentBlocks(metadata);
        let _adj = {...adj};
        if (metadata?.interactsWith?.find(tile => tile.id === this.tileDetails.id && ((
            !tile.additionalChecks ||
            Object.entries(tile.additionalChecks).filter(
                ([key, value]) => this.tileDetails[key] !== value
            ).length === 0
        ))) && (!metadata.limited || metadata.number) && adj) {
            // SET ADJ to have a UUID and then use that UUID in the attached to logic
            if (adj.block) {
                const originalTileDetails = {...adj.block.tileRef.tileDetails};
                const _uuid = originalTileDetails.uuid || uuid();

                let newTileDetails = {
                    ...originalTileDetails
                };
                if (!originalTileDetails.uuid) {
                    newTileDetails.uuid = _uuid;
                }
                this.game.mapService.setTile(adj.block.tileRef.worldX, adj.block.tileRef.worldY, newTileDetails, adj.block, {preserveAttached: true});
                _adj.block = newTileDetails.uuid;
            }

            cb(_adj);
            if (metadata.number) {
                this.game.selectedTool.updateMetaData({...metadata, number: metadata.number - 1});
                this.game.toolBarManager.render();
            }
        } else if (metadata.reclaimFrom?.id === this.tileDetails?.id) {
            cb(_adj);
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