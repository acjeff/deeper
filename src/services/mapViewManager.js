import { HUD } from './uiManager.js';

const TILE_COLORS = {
    1: '#5a3d2b',
    2: '#2c5d8a',
    3: '#6f6f6f',
    4: '#ffd76a',
    5: '#a07a4f',
    6: '#9aa3aa',
    7: '#5b9dff',
};
const SKY_COLOR = 'rgba(58, 78, 110, 0.6)';
const VOID_COLOR = 'rgba(8, 10, 15, 1)';
const FOG_COLOR = 'rgba(8, 10, 15, 1)';

const MARKER_PALETTE = ['#ef4444', '#f59e0b', '#22c55e', '#5b9dff', '#a855f7', '#ec4899', '#eab308'];

export default class MapViewManager {
    constructor(scene) {
        this.game = scene;
        this.visible = false;
        this.scale = 2;
        this.minScale = 1;
        this.maxScale = 8;
        this.cameraTileX = 0;
        this.cameraTileY = 0;
        this.dragging = false;
        this.dragStart = null;
        this.dragMoved = false;
        this.markerColorIndex = 0;
        this.cacheCanvas = null;
        this.cacheFogVersion = -1;
        this.create();
        this.attachInputs();
    }

    get markers() {
        if (!this.game.mapMarkers) this.game.mapMarkers = [];
        return this.game.mapMarkers;
    }

    create() {
        const overlay = document.createElement('div');
        overlay.id = 'mapViewOverlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'none',
            zIndex: '2500',
            background: 'radial-gradient(ellipse at center, rgba(10,12,18,0.92) 0%, rgba(0,0,0,0.96) 100%)',
            backdropFilter: 'blur(6px) saturate(110%)',
            WebkitBackdropFilter: 'blur(6px) saturate(110%)',
            opacity: '0',
            transition: 'opacity 160ms ease',
            fontFamily: HUD.font,
        });
        this.overlay = overlay;

        const header = document.createElement('div');
        Object.assign(header.style, {
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 18px',
            background: HUD.panelBg,
            border: HUD.panelBorder,
            borderRadius: HUD.panelRadius,
            backdropFilter: HUD.panelBlur,
            WebkitBackdropFilter: HUD.panelBlur,
            boxShadow: HUD.panelShadow,
        });
        const title = document.createElement('div');
        title.textContent = 'World Map';
        Object.assign(title.style, {
            fontSize: '13px',
            fontWeight: '600',
            color: HUD.text,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
        });
        header.appendChild(title);
        const dot = document.createElement('span');
        Object.assign(dot.style, {
            width: '5px', height: '5px', borderRadius: '50%',
            background: HUD.accent, boxShadow: `0 0 8px ${HUD.accent}`,
        });
        header.insertBefore(dot, title);
        overlay.appendChild(header);

        const hint = document.createElement('div');
        hint.innerHTML = `
            <span><kbd style="${kbdStyle()}">M</kbd> close</span>
            <span><kbd style="${kbdStyle()}">drag</kbd> pan</span>
            <span><kbd style="${kbdStyle()}">scroll</kbd> zoom</span>
            <span><kbd style="${kbdStyle()}">click</kbd> add marker</span>
            <span><kbd style="${kbdStyle()}">right click</kbd> remove</span>
            <span><kbd style="${kbdStyle()}">C</kbd> cycle color</span>
        `;
        Object.assign(hint.style, {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '8px 16px',
            background: HUD.panelBg,
            border: HUD.panelBorder,
            borderRadius: HUD.panelRadius,
            backdropFilter: HUD.panelBlur,
            WebkitBackdropFilter: HUD.panelBlur,
            color: HUD.textMuted,
            fontSize: '11px',
            letterSpacing: '0.04em',
        });
        overlay.appendChild(hint);

        this.colorChip = document.createElement('div');
        Object.assign(this.colorChip.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: HUD.panelBg,
            border: HUD.panelBorder,
            borderRadius: HUD.panelRadius,
            backdropFilter: HUD.panelBlur,
            WebkitBackdropFilter: HUD.panelBlur,
            color: HUD.textMuted,
            fontSize: '11px',
            letterSpacing: '0.04em',
        });
        const swatch = document.createElement('span');
        swatch.id = 'mapMarkerSwatch';
        Object.assign(swatch.style, {
            width: '14px', height: '14px', borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.18)',
            background: MARKER_PALETTE[0],
        });
        const swLabel = document.createElement('span');
        swLabel.textContent = 'MARKER';
        this.colorChip.appendChild(swatch);
        this.colorChip.appendChild(swLabel);
        this.swatch = swatch;
        overlay.appendChild(this.colorChip);

        this.coordLabel = document.createElement('div');
        Object.assign(this.coordLabel.style, {
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '8px 12px',
            background: HUD.panelBg,
            border: HUD.panelBorder,
            borderRadius: HUD.panelRadius,
            backdropFilter: HUD.panelBlur,
            WebkitBackdropFilter: HUD.panelBlur,
            color: HUD.textMuted,
            fontFamily: HUD.fontMono,
            fontSize: '11px',
            letterSpacing: '0.04em',
        });
        this.coordLabel.textContent = 'X 0  Y 0';
        overlay.appendChild(this.coordLabel);

        this.canvas = document.createElement('canvas');
        Object.assign(this.canvas.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
            imageRendering: 'pixelated',
        });
        overlay.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        document.body.appendChild(overlay);
    }

    attachInputs() {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'm') {
                this.toggle();
                return;
            }
            if (!this.visible) return;
            if (e.key === 'Escape') this.toggle();
            if (e.key.toLowerCase() === 'c') {
                this.markerColorIndex = (this.markerColorIndex + 1) % MARKER_PALETTE.length;
                this.swatch.style.background = MARKER_PALETTE[this.markerColorIndex];
            }
        });

        window.addEventListener('resize', () => { if (this.visible) this.resizeCanvas(); });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.handleRightClick(e);
                return;
            }
            this.dragging = true;
            this.dragMoved = false;
            this.dragStart = { x: e.clientX, y: e.clientY, camX: this.cameraTileX, camY: this.cameraTileY };
        });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('mousemove', (e) => {
            if (!this.visible) return;
            this.updateCoordLabel(e.clientX, e.clientY);
            if (!this.dragging) return;
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true;
            this.cameraTileX = this.dragStart.camX - dx / this.scale;
            this.cameraTileY = this.dragStart.camY - dy / this.scale;
            this.clampCamera();
            this.draw();
        });
        window.addEventListener('mouseup', (e) => {
            if (!this.visible || !this.dragging) return;
            this.dragging = false;
            if (!this.dragMoved && e.button === 0) {
                this.handleLeftClick(e);
            }
        });
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.visible) return;
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
            this.zoomAt(e.clientX, e.clientY, factor);
        }, { passive: false });
    }

    toggle() {
        if (this.visible) this.close();
        else this.open();
    }

    open() {
        this.visible = true;
        this.overlay.style.display = 'block';
        this.resizeCanvas();
        const tileSize = this.game.tileSize || 10;
        if (this.game.player) {
            this.cameraTileX = this.game.player.x / tileSize;
            this.cameraTileY = this.game.player.y / tileSize;
        }
        this.clampCamera();
        requestAnimationFrame(() => { this.overlay.style.opacity = '1'; });
        // Always rebuild on open so tile edits made since the last open
        // (digging, placing) are reflected.
        this.invalidateCache();
        this.draw();
        if (this.game.freezePlayer !== undefined) {
            this._priorFreeze = this.game.freezePlayer;
            this.game.freezePlayer = true;
        }
    }

    close() {
        this.visible = false;
        this.overlay.style.opacity = '0';
        setTimeout(() => { if (!this.visible) this.overlay.style.display = 'none'; }, 160);
        if (this._priorFreeze !== undefined) {
            this.game.freezePlayer = this._priorFreeze;
            this._priorFreeze = undefined;
        }
    }

    resizeCanvas() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w;
        this.canvas.height = h;
    }

    clampCamera() {
        const w = this.game.mapWidth || 1;
        const h = this.game.mapHeight || 1;
        this.cameraTileX = Math.max(0, Math.min(w, this.cameraTileX));
        this.cameraTileY = Math.max(0, Math.min(h, this.cameraTileY));
    }

    zoomAt(screenX, screenY, factor) {
        const tile = this.screenToTile(screenX, screenY);
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        if (newScale === this.scale) return;
        this.scale = newScale;
        const newTile = this.screenToTile(screenX, screenY);
        this.cameraTileX += tile.x - newTile.x;
        this.cameraTileY += tile.y - newTile.y;
        this.clampCamera();
        this.draw();
    }

    screenToTile(screenX, screenY) {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const tx = (screenX - cw / 2) / this.scale + this.cameraTileX;
        const ty = (screenY - ch / 2) / this.scale + this.cameraTileY;
        return { x: tx, y: ty };
    }

    tileToScreen(tx, ty) {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        return {
            x: (tx - this.cameraTileX) * this.scale + cw / 2,
            y: (ty - this.cameraTileY) * this.scale + ch / 2,
        };
    }

    updateCoordLabel(screenX, screenY) {
        const tile = this.screenToTile(screenX, screenY);
        const x = Math.round(tile.x);
        const y = Math.round(tile.y);
        const aboveGround = this.game.aboveGround || 20;
        this.coordLabel.textContent = `X ${x}  Y ${y}  DEPTH ${Math.max(0, y - aboveGround)}m`;
    }

    handleLeftClick(e) {
        const tile = this.screenToTile(e.clientX, e.clientY);
        const tx = Math.round(tile.x);
        const ty = Math.round(tile.y);
        const fog = this.game.fogOfWar;
        if (fog && !fog.has(tx, ty)) return;
        for (let i = 0; i < this.markers.length; i++) {
            const m = this.markers[i];
            const sp = this.tileToScreen(m.x, m.y);
            if (Math.hypot(sp.x - e.clientX, sp.y - e.clientY) < 12) return;
        }
        this.markers.push({ x: tx, y: ty, color: MARKER_PALETTE[this.markerColorIndex] });
        this.draw();
    }

    handleRightClick(e) {
        for (let i = this.markers.length - 1; i >= 0; i--) {
            const m = this.markers[i];
            const sp = this.tileToScreen(m.x, m.y);
            if (Math.hypot(sp.x - e.clientX, sp.y - e.clientY) < 12) {
                this.markers.splice(i, 1);
                this.draw();
                return;
            }
        }
    }

    invalidateCache() {
        this.cacheFogVersion = -1;
    }

    rebuildCache() {
        const w = this.game.mapWidth;
        const h = this.game.mapHeight;
        const chunkSize = this.game.chunkSize || 6;
        const aboveGround = this.game.aboveGround || 20;
        const fog = this.game.fogOfWar;

        if (!this.cacheCanvas) {
            this.cacheCanvas = document.createElement('canvas');
            this.cacheCanvas.width = w;
            this.cacheCanvas.height = h;
        }
        const cctx = this.cacheCanvas.getContext('2d');
        cctx.fillStyle = FOG_COLOR;
        cctx.fillRect(0, 0, w, h);

        const imgData = cctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let ty = 0; ty < h; ty++) {
            for (let tx = 0; tx < w; tx++) {
                if (fog && !fog.has(tx, ty)) continue;
                const chunkX = Math.floor(tx / chunkSize) * chunkSize;
                const chunkY = Math.floor(ty / chunkSize) * chunkSize;
                const chunk = this.game.grid[`${chunkX}_${chunkY}`];
                if (!chunk) continue;
                const localX = tx % chunkSize;
                const localY = ty % chunkSize;
                const tile = chunk[localY] && chunk[localY][localX];
                if (!tile) continue;
                const id = tile.id;
                const idx = (ty * w + tx) * 4;
                if (id == null || id === 0) {
                    if (ty < aboveGround) {
                        data[idx] = 58; data[idx + 1] = 78; data[idx + 2] = 110; data[idx + 3] = 153;
                    }
                    continue;
                }
                const color = TILE_COLORS[id] || '#444';
                const rgb = hexToRgb(color);
                data[idx] = rgb.r; data[idx + 1] = rgb.g; data[idx + 2] = rgb.b; data[idx + 3] = 255;
            }
        }
        cctx.putImageData(imgData, 0, 0);
    }

    draw() {
        if (!this.visible) return;
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        ctx.fillStyle = VOID_COLOR;
        ctx.fillRect(0, 0, cw, ch);

        const fog = this.game.fogOfWar;
        const fogVersion = fog ? fog.version : 0;
        if (!this.cacheCanvas || fogVersion !== this.cacheFogVersion) {
            this.rebuildCache();
            this.cacheFogVersion = fogVersion;
        }

        const w = this.game.mapWidth;
        const h = this.game.mapHeight;
        const dx = (-this.cameraTileX) * this.scale + cw / 2;
        const dy = (-this.cameraTileY) * this.scale + ch / 2;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.cacheCanvas, 0, 0, w, h, dx, dy, w * this.scale, h * this.scale);

        // Player marker
        if (this.game.player) {
            const tileSize = this.game.tileSize || 10;
            const px = this.game.player.x / tileSize;
            const py = this.game.player.y / tileSize;
            const sp = this.tileToScreen(px, py);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = HUD.accent;
            ctx.fill();
        }

        // Custom markers
        for (const m of this.markers) {
            const sp = this.tileToScreen(m.x, m.y);
            if (sp.x < -20 || sp.y < -20 || sp.x > cw + 20 || sp.y > ch + 20) continue;
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y - 10);
            ctx.lineTo(sp.x - 6, sp.y - 2);
            ctx.lineTo(sp.x + 6, sp.y - 2);
            ctx.closePath();
            ctx.fillStyle = m.color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sp.x, sp.y - 1, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fill();
        }
    }

    destroy() {
        this.overlay?.remove();
        this.overlay = null;
        this.cacheCanvas = null;
    }
}

function kbdStyle() {
    return `font-family:${HUD.fontMono};font-size:9px;font-weight:600;color:${HUD.text};background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.16);border-radius:4px;padding:1px 5px;margin:0 4px 0 0;`;
}

function hexToRgb(hex) {
    const v = hex.replace('#', '');
    const num = parseInt(v.length === 3
        ? v.split('').map(c => c + c).join('')
        : v, 16);
    return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

