import { HUD } from './uiManager.js';

const TILE_COLORS = {
    1: '#5a3d2b',   // soil
    2: '#2c5d8a',   // liquid
    3: '#6f6f6f',   // stone
    4: '#ffd76a',   // light
    5: '#a07a4f',   // buttress
    6: '#9aa3aa',   // rail
    7: '#5b9dff',   // lift control
};

const SKY_COLOR = 'rgba(58, 78, 110, 0.55)';
const VOID_COLOR = 'rgba(10, 13, 18, 0.95)';

export default class MinimapManager {
    constructor(scene) {
        this.game = scene;
        this.tilesPerSide = 64;
        this.pxPerTile = 2;
        this.size = this.tilesPerSide * this.pxPerTile;
        this.displaySize = 184;
        this.updateInterval = 80;
        this._lastUpdate = 0;
        this.create();
    }

    create() {
        const wrap = document.createElement('div');
        wrap.id = 'minimapContainer';
        Object.assign(wrap.style, {
            position: 'absolute',
            left: '18px',
            bottom: '18px',
            width: `${this.displaySize}px`,
            height: `${this.displaySize}px`,
            zIndex: '999',
            pointerEvents: 'none',
        });

        const ring = document.createElement('div');
        Object.assign(ring.style, {
            position: 'absolute',
            inset: '0',
            borderRadius: '50%',
            border: '2px solid rgba(236, 240, 248, 0.16)',
            background: 'radial-gradient(circle at center, rgba(16,19,26,0.55) 0%, rgba(8,10,15,0.85) 75%, rgba(0,0,0,0.95) 100%)',
            boxShadow: '0 14px 32px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
        });
        wrap.appendChild(ring);

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        Object.assign(this.canvas.style, {
            position: 'absolute',
            inset: '6px',
            width: 'calc(100% - 12px)',
            height: 'calc(100% - 12px)',
            borderRadius: '50%',
            imageRendering: 'pixelated',
            opacity: '0.95',
        });
        wrap.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        const compass = document.createElement('div');
        compass.textContent = 'N';
        Object.assign(compass.style, {
            position: 'absolute',
            top: '-7px',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: HUD.fontMono,
            fontSize: '10px',
            fontWeight: '600',
            color: HUD.text,
            background: 'rgba(16,19,26,0.92)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '999px',
            padding: '2px 8px',
            letterSpacing: '0.12em',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
        });
        wrap.appendChild(compass);

        this.depthLabel = document.createElement('div');
        Object.assign(this.depthLabel.style, {
            position: 'absolute',
            bottom: '-22px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: HUD.fontMono,
            fontSize: '10px',
            fontWeight: '600',
            color: HUD.textMuted,
            letterSpacing: '0.10em',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
        });
        this.depthLabel.textContent = 'DEPTH 0m';
        wrap.appendChild(this.depthLabel);

        document.body.appendChild(wrap);
        this.wrapper = wrap;
    }

    update(time) {
        if (!this.game.player || !this.game.grid) return;
        if (time - this._lastUpdate < this.updateInterval) return;
        this._lastUpdate = time;

        const ctx = this.ctx;
        const tileSize = this.game.tileSize || 10;
        const chunkSize = this.game.chunkSize || 6;
        const playerTileX = Math.floor(this.game.player.x / tileSize);
        const playerTileY = Math.floor(this.game.player.y / tileSize);
        const half = this.tilesPerSide / 2;
        const startX = playerTileX - half;
        const startY = playerTileY - half;
        const aboveGround = this.game.aboveGround || 20;

        ctx.fillStyle = VOID_COLOR;
        ctx.fillRect(0, 0, this.size, this.size);

        for (let row = 0; row < this.tilesPerSide; row++) {
            const tileY = startY + row;
            if (tileY < 0 || tileY >= this.game.mapHeight) continue;
            const drawY = row * this.pxPerTile;
            for (let col = 0; col < this.tilesPerSide; col++) {
                const tileX = startX + col;
                if (tileX < 0 || tileX >= this.game.mapWidth) continue;
                const chunkX = Math.floor(tileX / chunkSize) * chunkSize;
                const chunkY = Math.floor(tileY / chunkSize) * chunkSize;
                const chunk = this.game.grid[`${chunkX}_${chunkY}`];
                if (!chunk) continue;
                const localX = tileX % chunkSize;
                const localY = tileY % chunkSize;
                const tile = chunk[localY] && chunk[localY][localX];
                if (!tile) continue;

                const id = tile.id;
                const drawX = col * this.pxPerTile;
                if (id == null || id === 0) {
                    if (tileY < aboveGround) {
                        ctx.fillStyle = SKY_COLOR;
                        ctx.fillRect(drawX, drawY, this.pxPerTile, this.pxPerTile);
                    }
                    continue;
                }
                ctx.fillStyle = TILE_COLORS[id] || '#444';
                ctx.fillRect(drawX, drawY, this.pxPerTile, this.pxPerTile);
            }
        }

        const cx = (playerTileX - startX) * this.pxPerTile;
        const cy = (playerTileY - startY) * this.pxPerTile;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HUD.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        ctx.fill();

        const depth = Math.max(0, playerTileY - aboveGround);
        this.depthLabel.textContent = `DEPTH ${depth}m`;
    }

    destroy() {
        this.wrapper?.remove();
        this.wrapper = null;
    }
}
