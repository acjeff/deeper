export class Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        this.game = game;
        this.worldX = worldX;
        this.worldY = worldY;
        this.chunkKey = cellDetails.chunkKey;
        this.cellX = cellDetails.cellX;
        this.cellY = cellDetails.cellY;
        this.tileDetails = tileDetails;
        this.cellDetails = cellDetails;
        this.sprite = this.createSprite();
        this.sprite.tileRef = this;
        this.sprite.cellX = this.cellX;
        this.sprite.cellY = this.cellY;
        this.sprite.chunkKey = this.chunkKey;
        this.setupInteractions();
        this.addToGroup();
    }

    onMouseEnter () {}

    onMouseLeave () {}

    addToGroup(group) {
        return group;
    }

    createSprite() {
        return this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, 0xffffff);
    }

    setupInteractions() {
        this.sprite.setInteractive();
        // this.sprite.on('pointerdown', () => {
        //     this.onClick();
        // });
    }

    onClick() {}

    destroy() {
        this.sprite.destroy();
    }
}
