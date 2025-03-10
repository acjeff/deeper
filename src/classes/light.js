import {Tile} from "./tile";

export class Light extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.intensity = this.tileDetails.intensity || 0.8;
        this.color = this.tileDetails.color || '253,196,124';
        this.radius = this.tileDetails.radius || 20;
        this.neon = this.tileDetails.neon || false;
        this.init();
    }

    addToGroup() {
        return this.game.lightGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.lightGroup.add(this.sprite);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        this.lampSprite = this.game.add.image(this.worldX, this.worldY, 'lamp');
        this.lampSprite.setDisplaySize(this.game.tileSize - 3, this.game.tileSize - 3);
        this.lampSprite.setDepth(-1);
        baseSprite.setAlpha(0);
        this.fadeElements = [this.lampSprite];

        this.light = this.game.lightingManager.addLight(this.worldX + this.game.tileSize / 2, this.worldY + this.game.tileSize / 2, this.radius, this.intensity, this.color, false, this.neon);
        return baseSprite;
    }

    destroy() {
        this.light.off = true;

        this.animatedDestroy(() => {
            if (!this.active) return;  // Guard against double-destroy
            this.active = false;
            this.removeFromGroup();
            this.sprite.destroy();
            this.lampSprite.destroy();
            this.light.destroy();
        })
    }

    setAsEmpty() {
        let baseCell = {...window._tileTypes.empty};
        this.game.mapService.setTile(this.worldX, this.worldY, baseCell, this.sprite);
    }

    onClick() {
        this.onClickHandler(this.setAsEmpty.bind(this));
    }

}