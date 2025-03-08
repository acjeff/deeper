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
    }

    addToGroup() {}

    onMouseLeave() {
        this.borderGraphics.setAlpha(0);
    }

    onMouseEnter(hoveredBlock) {
        this.borderGraphics.setAlpha(1);
    }

    createSprite() {
        return this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, 0xffffff);
    }

    setupInteractions() {
        if (this.sprite.setInteractive) {
            this.sprite.setInteractive();
        }
    }

    onClick() {}

    destroy() {
        this.sprite.destroy();
    }
}
