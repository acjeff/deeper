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
        if (!this.curveOverlay) return;
        const mask = this.game.tileAtlas.cornerCurveMaskFor(this.worldX, this.worldY);
        if (mask === this.lastCurveMask) return;
        this.lastCurveMask = mask;
        if (mask === 0) {
            this.curveOverlay.setVisible(false);
            return;
        }
        const key = this.game.tileAtlas.ensureCornerCurveTexture(mask);
        if (this.curveOverlay.texture.key !== key) this.curveOverlay.setTexture(key);
        this.curveOverlay.setVisible(true);
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        this.buttressSprite = this.game.add.image(this.worldX, this.worldY, 'buttress');
        this.buttressSprite.setDisplaySize(this.game.tileSize, this.game.tileSize);
        baseSprite.setAlpha(0);

        // Inside-corner curve overlay (same machinery as Breakable).
        this.curveOverlay = this.game.add.image(this.worldX, this.worldY, this.game.tileAtlas.cornerCurveKey(0));
        this.curveOverlay.setOrigin(0.5, 0.5);
        this.curveOverlay.setDepth(0.5);
        this.curveOverlay.setVisible(false);
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
