import {Tile} from "./tile";

export class Buttress extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
    }

    addToGroup() {
        return this.game.buttressGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.buttressGroup.remove(this.sprite);
    }

    checkState() {
        super.checkState();
        this.refreshCurveOverlay();
    }

    refreshCurveOverlay() {
        const mask = this.game.tileAtlas.cornerCurveMaskFor(this.worldX, this.worldY);
        if (mask === this.lastCurveMask) return;
        this.lastCurveMask = mask;
        if (mask === 0) {
            if (this.curveOverlay) this.curveOverlay.setVisible(false);
            return;
        }
        const atlas = this.game.tileAtlas;
        const key = atlas.ensureCornerCurveTexture(mask);
        if (!this.curveOverlay) {
            this.curveOverlay = this.game.add.image(this.worldX, this.worldY, key);
            this.curveOverlay.setOrigin(0.5, 0.5);
            this.curveOverlay.setDepth(0.5);
        } else if (this.curveOverlay.texture.key !== key) {
            this.curveOverlay.setTexture(key);
        }
        this.curveOverlay.setVisible(true);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        this.buttressSprite = this.game.add.image(this.worldX, this.worldY, 'buttress');
        this.buttressSprite.setDisplaySize(this.game.tileSize, this.game.tileSize);
        baseSprite.setAlpha(0);

        // curveOverlay is lazy — most cells aren't at an inside cave corner
        // so they never need one. See refreshCurveOverlay.
        this.lastCurveMask = -1;

        this.fadeElements = [this.buttressSprite];

        this.refreshCurveOverlay();
        this.curveRefreshDelay = this.game.time.delayedCall(80, () => {
            this.lastCurveMask = -1;
            this.refreshCurveOverlay();
        });

        return baseSprite;
    }

    removeElements() {
        this.active = false;
        this.removeFromGroup();
        this.buttressSprite.destroy();
        if (this.curveOverlay) this.curveOverlay.destroy();
        if (this.curveRefreshDelay) this.curveRefreshDelay.remove();
        this.sprite.destroy();
        this._destroyBorderGraphics();
    }

    destroy(prefs) {
        if (!this.active) return;  // Guard against double-destroy
        if (this.clicking) {
            this.removeElements()
        } else {
            this.destroyHandler(this.removeElements.bind(this), prefs);
        }
    }

    onClick() {
        this.onClickHandler(this.setAsEmpty.bind(this));
    }

}
