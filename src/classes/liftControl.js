import {Tile} from "./tile";

export class LiftControl extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
    }

    callCrane() {
        this.game.craneManager.moveTo(this.worldY, this);
    }

    moving(direction) {
        if (direction === "up") {
            this.switchSprite.setFrame(1);
        } else if (direction === "down") {
            this.switchSprite.setFrame(2);
        } else {
            this.switchSprite.setFrame(0);
        }
    }

    addToGroup() {
        return this.game.liftControlGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.liftControlGroup.remove(this.sprite);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        baseSprite.setAlpha(0);
        this.game.anims.create({
            key: 'lift-control',
            frames: this.game.anims.generateFrameNumbers('lift-control', { start: 0, end: 2 }),
            frameRate: 3,
            repeat: -1  // Loop indefinitely
        });
        this.switchSprite = this.game.add.sprite(this.worldX, this.worldY, 'lift-control');
        this.switchSprite.setDisplaySize(this.game.tileSize, this.game.tileSize);
        this.switchSprite.setDepth(-1);
        this.fadeElements = [this.switchSprite];

        if (this.tileDetails.attachedTo) {
            const degreesToRadians = (deg) => deg * (Math.PI / 180);

            if (this.tileDetails.attachedTo.direction === 'above') {
                this.switchSprite.rotation = degreesToRadians(180);
            } else if (this.tileDetails.attachedTo.direction === 'right') {
                this.switchSprite.rotation = degreesToRadians(-90);
            } else if (this.tileDetails.attachedTo.direction === 'left') {
                this.switchSprite.rotation = degreesToRadians(90);
            } else {
            }
        }
        this.light = this.game.lightingManager.addLight(this.worldX, this.worldY, this.radius, this.intensity, this.color, !this.neon, this.neon);

        return baseSprite;
    }

    destroy(prefs) {
        this.destroyHandler(() => {
            if (!this.active) return;  // Guard against double-destroy
            this.active = false;
            this.removeFromGroup();
            this.sprite.destroy();
            this.light.destroy();
            this.switchSprite.destroy();
        }, prefs)
    }

    onClick() {
        this.onClickHandler(this.setAsEmpty.bind(this));
    }

}