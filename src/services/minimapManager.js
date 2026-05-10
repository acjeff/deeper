import { HUD } from './uiManager.js';

const TILE_COLORS = {
    1: '#5a3d2b',
    2: '#2c5d8a',
    3: '#6f6f6f',
    4: '#ffd76a',
    5: '#a07a4f',
    6: '#9aa3aa',
    7: '#5b9dff',
    8: '#3e7a3a',
};

const SKY_COLOR = 'rgba(58, 78, 110, 0.55)';
const VOID_COLOR = 'rgba(10, 13, 18, 0.95)';
const SVG_NS = 'http://www.w3.org/2000/svg';

const STAT_LAYOUT = [
    { key: 'health', max: 'maxHealth', color: HUD.health, icon: 'heart',   start: 100, end: 150 },
    { key: 'energy', max: 'maxEnergy', color: HUD.energy, icon: 'bolt',    start: 155, end: 205 },
    { key: 'breath', max: 'maxBreath', color: HUD.breath, icon: 'droplet', start: 210, end: 260 },
];

function polar(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngleDeg, endAngleDeg) {
    const start = polar(cx, cy, r, startAngleDeg);
    const end = polar(cx, cy, r, endAngleDeg);
    const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const STAT_ICONS = {
    heart:   '<path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4.5 4.5 8.5C19 16.65 12 21 12 21z"/>',
    bolt:    '<path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z"/>',
    droplet: '<path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z"/>',
};

export default class MinimapManager {
    constructor(scene) {
        this.game = scene;
        this.tilesPerSide = 64;
        this.pxPerTile = 2;
        this.size = this.tilesPerSide * this.pxPerTile;
        this.mapDisplaySize = 184;
        this.frameSize = 232;
        this.statRadius = (this.mapDisplaySize / 2) + 14;
        this.updateInterval = 80;
        this._lastUpdate = 0;
        this.create();
    }

    create() {
        const wrap = document.createElement('div');
        wrap.id = 'minimapContainer';
        Object.assign(wrap.style, {
            position: 'absolute',
            left: '14px',
            bottom: '14px',
            width: `${this.frameSize}px`,
            height: `${this.frameSize}px`,
            zIndex: '999',
            pointerEvents: 'none',
        });

        const inner = document.createElement('div');
        Object.assign(inner.style, {
            position: 'absolute',
            left: `${(this.frameSize - this.mapDisplaySize) / 2}px`,
            top: `${(this.frameSize - this.mapDisplaySize) / 2}px`,
            width: `${this.mapDisplaySize}px`,
            height: `${this.mapDisplaySize}px`,
        });
        wrap.appendChild(inner);
        this.inner = inner;

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
        inner.appendChild(ring);

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
        inner.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.statSvg = this.createStatRing();
        wrap.appendChild(this.statSvg);

        const compass = document.createElement('div');
        compass.textContent = 'N';
        Object.assign(compass.style, {
            position: 'absolute',
            top: '8px',
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
            zIndex: '2',
        });
        wrap.appendChild(compass);

        this.depthLabel = document.createElement('div');
        Object.assign(this.depthLabel.style, {
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: HUD.fontMono,
            fontSize: '10px',
            fontWeight: '600',
            color: HUD.textMuted,
            letterSpacing: '0.10em',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
            zIndex: '2',
        });
        this.depthLabel.textContent = 'DEPTH 0m';
        wrap.appendChild(this.depthLabel);

        const hint = document.createElement('div');
        hint.innerHTML = `<kbd style="font-family:${HUD.fontMono};font-size:9px;font-weight:600;color:${HUD.text};background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.16);border-radius:4px;padding:1px 5px;">M</kbd> map`;
        Object.assign(hint.style, {
            position: 'absolute',
            top: '50%',
            right: '-4px',
            transform: 'translate(100%, -50%)',
            fontFamily: HUD.font,
            fontSize: '10px',
            color: HUD.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            zIndex: '2',
        });
        wrap.appendChild(hint);

        document.body.appendChild(wrap);
        this.wrapper = wrap;
    }

    createStatRing() {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', this.frameSize);
        svg.setAttribute('height', this.frameSize);
        svg.setAttribute('viewBox', `0 0 ${this.frameSize} ${this.frameSize}`);
        Object.assign(svg.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            overflow: 'visible',
        });

        const cx = this.frameSize / 2;
        const cy = this.frameSize / 2;
        const r = this.statRadius;

        this.statElems = {};
        for (const stat of STAT_LAYOUT) {
            const bg = document.createElementNS(SVG_NS, 'path');
            bg.setAttribute('d', arcPath(cx, cy, r, stat.start, stat.end));
            bg.setAttribute('stroke', 'rgba(255,255,255,0.10)');
            bg.setAttribute('stroke-width', '5');
            bg.setAttribute('stroke-linecap', 'round');
            bg.setAttribute('fill', 'none');
            svg.appendChild(bg);

            const fg = document.createElementNS(SVG_NS, 'path');
            fg.setAttribute('d', arcPath(cx, cy, r, stat.start, stat.end));
            fg.setAttribute('stroke', stat.color);
            fg.setAttribute('stroke-width', '5');
            fg.setAttribute('stroke-linecap', 'round');
            fg.setAttribute('fill', 'none');
            fg.style.filter = `drop-shadow(0 0 4px ${stat.color})`;
            fg.style.transition = 'stroke-dasharray 240ms ease, stroke 240ms ease';
            svg.appendChild(fg);

            const iconAngle = (stat.start + stat.end) / 2;
            const iconPos = polar(cx, cy, r, iconAngle);
            const iconG = document.createElementNS(SVG_NS, 'g');
            iconG.setAttribute('transform', `translate(${iconPos.x.toFixed(2)} ${iconPos.y.toFixed(2)})`);
            const iconBg = document.createElementNS(SVG_NS, 'circle');
            iconBg.setAttribute('r', '8');
            iconBg.setAttribute('fill', 'rgba(8,10,15,0.95)');
            iconBg.setAttribute('stroke', 'rgba(255,255,255,0.18)');
            iconBg.setAttribute('stroke-width', '1');
            iconG.appendChild(iconBg);
            const iconShape = document.createElementNS(SVG_NS, 'g');
            iconShape.setAttribute('transform', 'translate(-5 -5) scale(0.42)');
            iconShape.innerHTML = STAT_ICONS[stat.icon];
            iconShape.setAttribute('fill', stat.color);
            iconG.appendChild(iconShape);
            svg.appendChild(iconG);

            this.statElems[stat.key] = { fg, stat };
        }

        return svg;
    }

    updateStats() {
        const player = this.game.player;
        if (!player) return;
        for (const stat of STAT_LAYOUT) {
            const elems = this.statElems[stat.key];
            if (!elems) continue;
            const max = player[stat.max] || 100;
            const current = Math.max(0, Math.min(player[stat.key] ?? max, max));
            const pct = current / max;
            const path = elems.fg;
            const length = path.getTotalLength ? path.getTotalLength() : 100;
            path.setAttribute('stroke-dasharray', `${(length * pct).toFixed(2)} ${length.toFixed(2)}`);
            const lowColor = pct < 0.3 ? HUD.healthLow : (pct < 0.6 ? HUD.healthMid : stat.color);
            path.setAttribute('stroke', stat.key === 'breath' ? stat.color : lowColor);
            path.style.filter = `drop-shadow(0 0 4px ${path.getAttribute('stroke')})`;
        }
    }

    update(time) {
        if (!this.game.player || !this.game.grid) return;
        this.updateStats();
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
        const fog = this.game.fogOfWar;

        ctx.fillStyle = VOID_COLOR;
        ctx.fillRect(0, 0, this.size, this.size);

        for (let row = 0; row < this.tilesPerSide; row++) {
            const tileY = startY + row;
            if (tileY < 0 || tileY >= this.game.mapHeight) continue;
            const drawY = row * this.pxPerTile;
            for (let col = 0; col < this.tilesPerSide; col++) {
                const tileX = startX + col;
                if (tileX < 0 || tileX >= this.game.mapWidth) continue;
                if (fog && !fog.has(tileX, tileY)) continue;
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
