import {Tile} from "./tile";

export class Empty extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.game = game;
        this.init();
    }

    addToGroup() {
        return this.game.emptyGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.emptyGroup.remove(this.sprite);
    }

    isSolidAt(worldX, worldY) {
        const ts = this.game.tileSize;
        const cs = this.game.chunkSize;
        const gcx = Math.floor(worldX / ts);
        const gcy = Math.floor(worldY / ts);
        const chunkX = Math.floor(gcx / cs) * cs;
        const chunkY = Math.floor(gcy / cs) * cs;
        const chunk = this.game.grid[`${chunkX}_${chunkY}`];
        if (!chunk) return false;
        const lx = ((gcx % cs) + cs) % cs;
        const ly = ((gcy % cs) + cs) % cs;
        const tile = chunk[ly]?.[lx];
        if (!tile) return false;
        // "Solid" for inside-corner curve purposes — anything dirt-like that
        // forms part of a continuous wall mass.
        return tile.id === 1 || tile.id === 5;
    }

    getCurveMask() {
        const ts = this.game.tileSize;
        const top = this.isSolidAt(this.worldX, this.worldY - ts);
        const right = this.isSolidAt(this.worldX + ts, this.worldY);
        const bottom = this.isSolidAt(this.worldX, this.worldY + ts);
        const left = this.isSolidAt(this.worldX - ts, this.worldY);
        let mask = 0;
        if (top && left && this.isSolidAt(this.worldX - ts, this.worldY - ts)) mask |= 1;
        if (top && right && this.isSolidAt(this.worldX + ts, this.worldY - ts)) mask |= 2;
        if (bottom && left && this.isSolidAt(this.worldX - ts, this.worldY + ts)) mask |= 4;
        if (bottom && right && this.isSolidAt(this.worldX + ts, this.worldY + ts)) mask |= 8;
        return mask;
    }

    redrawCurve() {
        if (!this.curveImage) return;
        const mask = this.getCurveMask();
        if (mask === this.lastCurveMask) return;
        this.lastCurveMask = mask;
        if (mask === 0) {
            this.curveImage.setVisible(false);
            return;
        }
        const key = this.game.tileAtlas.ensureEmptyCurveTexture(mask);
        if (this.curveImage.texture.key !== key) this.curveImage.setTexture(key);
        this.curveImage.setVisible(true);
    }

    checkState() {
        super.checkState();
        this.redrawCurve();
    }

    createSprite() {
        let baseSprite = this.game.add.rectangle(this.worldX, this.worldY, this.game.tileSize, this.game.tileSize, '0xffffff');
        baseSprite.setAlpha(0);

        // Curve overlay — pre-rendered atlas texture per inside-corner mask.
        // Median jitter tint (~0.94 brightness) so the curve blends with the
        // average tinted dirt tile next to it.
        this.curveImage = this.game.add.image(this.worldX, this.worldY, this.game.tileAtlas.emptyCurveKey(0));
        this.curveImage.setOrigin(0.5, 0.5);
        this.curveImage.setDepth(0);
        this.curveImage.setVisible(false);
        const t = Math.round(0.94 * 255);
        this.curveImage.setTint((t << 16) | (t << 8) | t);
        this.lastCurveMask = -1;

        // First refresh — neighbours may not exist yet, so retry shortly.
        this.redrawCurve();
        this.curveRefreshDelay = this.game.time.delayedCall(80, () => {
            this.lastCurveMask = -1;
            this.redrawCurve();
        });

        return baseSprite;
    }

    onClick() {
        this.onClickHandler((adj) => {
            if (this.game.selectedTool) {
                let item = {...this.game.selectedTool.item};
                if (adj) {
                    item.attachedTo = {...adj};
                }
                this.game.mapService.setTile(this.worldX, this.worldY, item, this.sprite);
            }
        })
    }

    destroy() {
        this.removeFromGroup();
        if (this.curveImage) this.curveImage.destroy();
        if (this.curveRefreshDelay) this.curveRefreshDelay.remove();
        this.sprite.destroy();
    }
}
