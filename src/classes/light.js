import {Tile} from "./tile";

export class Light extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.intensity = this.tileDetails.intensity || 0.8;
        this.color = this.tileDetails.color || '253,196,124';
        console.log(this.color, ' : this.color');
        this.radius = this.tileDetails.radius || 20;
        this.init();
    }

    createSprite() {
        // this.lamp = this.game.add.image(this.worldX, this.worldY, 'lamp');
        // x, y, radius = 20, intensity = 0.8, color = "255,255,255", raycast = false, neon = false
        console.log(this.color, ' : this.color');
        return this.game.lightingManager.addLight(this.worldX, this.worldY, this.radius, this.intensity, this.color, false, true);
    }

}