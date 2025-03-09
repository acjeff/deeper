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
                fe.setAlpha(0);
            })
            // Tween the sprite's alpha from 0 to 1 to create the fade-in effect.
            this.game.tweens.add({
                targets: this.fadeElements,
                alpha: 1,
                duration: window.fadeSpeed, // Duration in ms; adjust as needed
                ease: 'ease-out'
            });
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
                onComplete: cb});
        }
    }

    addToGroup() {}

    removeFromGroup() {}

    onMouseLeave() {
        this.borderGraphics.setAlpha(0);
    }

    onMouseEnter(hoveredBlock) {
        this.borderGraphics.setAlpha(1);
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
        cb();
    }

    onClick(cb) {}

    destroy() {
        this.sprite.destroy();
    }
}
