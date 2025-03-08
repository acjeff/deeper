import {Tile} from "./tile";
export class Empty extends Tile {
    constructor({game, worldX, worldY, chunkKey, cellX, cellY}) {
        super({game, worldX, worldY, chunkKey, cellX, cellY});
        this.strength = 100;
    }

    createSprite() {
        return this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, 0x724c25);
    }

    hit_block() {
        super.hit_block();
        this.sprite.fillColor = 0x5e3b1c; // Darken slightly on hit
    }
}