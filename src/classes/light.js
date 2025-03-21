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
        return this.game.lightGroup.remove(this.sprite);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        baseSprite.setAlpha(0);
        this.lampSprite = this.game.add.image(this.worldX, this.worldY, 'lamp');
        this.lampSprite.setDisplaySize(this.game.tileSize - 3, this.game.tileSize - 3);
        this.lampSprite.setDepth(-1);
        this.fadeElements = [this.lampSprite];

        if (this.tileDetails.attachedTo) {
            const degreesToRadians = (deg) => deg * (Math.PI / 180);

            if (this.tileDetails.attachedTo.direction === 'above') {
                this.lampSprite.rotation = degreesToRadians(180);
                this.lampSprite.y = this.lampSprite.y - 2;
            } else if (this.tileDetails.attachedTo.direction === 'right') {
                this.lampSprite.rotation = degreesToRadians(-90);
                this.lampSprite.x = this.lampSprite.x + 2;
            } else if (this.tileDetails.attachedTo.direction === 'left') {
                this.lampSprite.rotation = degreesToRadians(90);
                this.lampSprite.x = this.lampSprite.x - 2;
            } else {
                this.lampSprite.y = this.lampSprite.y + 2;
            }
        } else {
            this.lampSprite.y = this.lampSprite.y + 2;
        }

        this.light = this.game.lightingManager.addLight(this.worldX, this.worldY, this.radius, this.intensity, this.color, !this.neon, this.neon);
        return baseSprite;
    }

    destroy(prefs) {
        this.light.fadeOut();
        this.destroyHandler(() => {
            if (!this.active) return;  // Guard against double-destroy
            this.active = false;
            this.removeFromGroup();
            this.sprite.destroy();
            this.lampSprite.destroy();
            this.light.destroy();
        }, prefs)
    }

    onClick() {
        this.onClickHandler(this.setAsEmpty.bind(this));
    }

}