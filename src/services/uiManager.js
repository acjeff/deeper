// Cohesive HUD design tokens shared across status panel, buttons, toolbar,
// and inventory. Kept in one place so the look stays consistent.
export const HUD = {
    font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    panelBg: 'linear-gradient(135deg, rgba(16, 19, 26, 0.78) 0%, rgba(26, 30, 42, 0.78) 100%)',
    panelBorder: '1px solid rgba(255, 255, 255, 0.08)',
    panelRadius: '12px',
    panelBlur: 'blur(18px) saturate(140%)',
    panelShadow: '0 10px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    text: 'rgba(236, 240, 248, 0.95)',
    textMuted: 'rgba(236, 240, 248, 0.55)',
    textDim: 'rgba(236, 240, 248, 0.35)',
    accent: '#5b9dff',
    accentSoft: 'rgba(91, 157, 255, 0.18)',
    health: '#ef4444',
    healthMid: '#f97316',
    healthLow: '#dc2626',
    energy: '#f59e0b',
    breath: '#38bdf8',
    danger: '#ef4444',
};

const STYLE_ID = 'hud-shared-styles';

function injectSharedStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .hud-panel {
            font-family: ${HUD.font};
            color: ${HUD.text};
            background: ${HUD.panelBg};
            border: ${HUD.panelBorder};
            border-radius: ${HUD.panelRadius};
            backdrop-filter: ${HUD.panelBlur};
            -webkit-backdrop-filter: ${HUD.panelBlur};
            box-shadow: ${HUD.panelShadow};
        }
        .hud-btn {
            font-family: ${HUD.font};
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: ${HUD.text};
            background: ${HUD.panelBg};
            border: ${HUD.panelBorder};
            border-radius: 10px;
            backdrop-filter: ${HUD.panelBlur};
            -webkit-backdrop-filter: ${HUD.panelBlur};
            box-shadow: ${HUD.panelShadow};
            padding: 9px 14px;
            cursor: pointer;
            outline: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: transform 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }
        .hud-btn:hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.18);
            transform: translateY(-1px);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .hud-btn:active { transform: translateY(0); }
        .hud-btn[data-variant="danger"]:hover { color: #ffb4b4; border-color: rgba(239, 68, 68, 0.45); }
        .hud-btn[data-variant="accent"]:hover { color: #cfe1ff; border-color: rgba(91, 157, 255, 0.55); }
        .hud-btn .hud-btn-icon {
            width: 14px; height: 14px;
            display: inline-flex; align-items: center; justify-content: center;
            opacity: 0.85;
        }
        .hud-stat-row {
            display: grid;
            grid-template-columns: 16px 1fr auto;
            align-items: center;
            gap: 10px;
            height: 18px;
        }
        .hud-stat-icon {
            width: 16px; height: 16px;
            display: inline-flex; align-items: center; justify-content: center;
            opacity: 0.9;
        }
        .hud-stat-track {
            position: relative;
            height: 6px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.06);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        }
        .hud-stat-fill {
            position: absolute; inset: 0;
            border-radius: 999px;
            transform-origin: left center;
            transition: width 280ms ease-out, background 280ms ease;
            box-shadow: 0 0 8px currentColor;
        }
        .hud-stat-value {
            font-family: ${HUD.fontMono};
            font-size: 10px;
            font-weight: 600;
            color: ${HUD.textMuted};
            font-variant-numeric: tabular-nums;
            min-width: 44px;
            text-align: right;
        }
        .hud-stat-row[data-low="true"] .hud-stat-value { color: ${HUD.health}; }
        @keyframes hud-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
        }
        .hud-stat-row[data-critical="true"] .hud-stat-fill { animation: hud-pulse 1s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
}

export default class UiManager {
    constructor(scene) {
        this.game = scene;
        injectSharedStyles();
        this.game.saveButton = this.addSaveButton();
        this.game.backToMenuButton = this.addBackToMenuButton();
        this.addStatusPanel();
    }

    // -------------------- Buttons (top corners) --------------------

    addBackToMenuButton() {
        const btn = this.createButton('backToMenuButton', {
            top: '18px',
            left: '18px',
        }, this.iconSvg('chevron-left') + '<span>Exit</span>', 'accent', async () => {
            this.backToMenuButton.disabled = true;
            this.backToMenuButton.style.pointerEvents = 'none';
            this.backToMenuButton.innerHTML = this.iconSvg('spinner') + '<span>Saving…</span>';
            this.saveButton.style.visibility = 'hidden';
            window.setTimeout(async () => {
                await this.game.saveGame(this.game.user, this.game.grid);
                this.backToMenuButton.remove();
                this.saveButton.remove();
                this.game.lightCanvas.remove();
                this.statusPanel?.remove();
                this.game.minimapManager?.destroy();
                this.game.mapViewManager?.destroy();
                this.game.scene.stop("GameScene");
                this.game.scene.start("MenuScene");
            }, 100);
        });
        return btn;
    }

    addSaveButton() {
        return this.createButton('saveButton', {
            top: '62px',
            left: '18px',
        }, this.iconSvg('save') + '<span>Save</span>', 'accent', async () => {
            this.game.saveButton.disabled = true;
            this.game.saveButton.innerHTML = this.iconSvg('spinner') + '<span>Saving…</span>';
            window.setTimeout(async () => {
                await this.game.saveGame(this.game.user, this.game.grid);
                // Restore label after save
                this.game.saveButton.disabled = false;
                this.game.saveButton.innerHTML = this.iconSvg('save') + '<span>Save</span>';
            }, 100);
        });
    }

    createButton(name, position, innerHTML, variant, onClick) {
        const btn = document.createElement('button');
        btn.id = name;
        btn.className = 'hud-btn';
        btn.dataset.variant = variant;
        btn.innerHTML = innerHTML;
        Object.assign(btn.style, {
            position: 'absolute',
            zIndex: '1000',
            ...position,
        });
        document.body.appendChild(btn);
        btn.addEventListener('click', onClick);
        this[name] = btn;
        return btn;
    }

    // -------------------- Status Panel --------------------

    addStatusPanel() {
        // Stats are visualized as arcs around the minimap; this method is
        // intentionally a no-op so the rest of the HUD wiring stays intact.
    }

    addStatRow(parent, key, color, iconSvg) {
        const row = document.createElement('div');
        row.className = 'hud-stat-row';
        row.dataset.stat = key;

        const icon = document.createElement('div');
        icon.className = 'hud-stat-icon';
        icon.style.color = color;
        icon.innerHTML = iconSvg;

        const track = document.createElement('div');
        track.className = 'hud-stat-track';
        const fill = document.createElement('div');
        fill.className = 'hud-stat-fill';
        fill.style.width = '100%';
        fill.style.background = color;
        fill.style.color = color;
        track.appendChild(fill);

        const value = document.createElement('div');
        value.className = 'hud-stat-value';
        value.textContent = '100 / 100';

        row.appendChild(icon);
        row.appendChild(track);
        row.appendChild(value);
        parent.appendChild(row);

        return { row, fill, value, color, key };
    }

    setRow(rowObj, current, max) {
        const pct = Math.max(0, Math.min((current / max) * 100, 100));
        rowObj.fill.style.width = pct + '%';
        rowObj.value.textContent = `${Math.round(current)} / ${max}`;
        let color = rowObj.color;
        if (rowObj.key === 'health' || rowObj.key === 'energy') {
            if (pct < 30) color = HUD.healthLow;
            else if (pct < 60) color = HUD.healthMid;
        }
        rowObj.fill.style.background = color;
        rowObj.fill.style.color = color;
        rowObj.row.dataset.low = pct < 30 ? 'true' : 'false';
        rowObj.row.dataset.critical = pct < 15 ? 'true' : 'false';
    }

    updateUI() {
        const p = this.game.player;
        if (p.energy <= 0) this.game.playerManager.die('sleep');
        if (p.health <= 0) this.game.playerManager.die();
    }

    // -------------------- Inline icons --------------------

    iconSvg(name) {
        const icons = {
            heart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4.5 4.5 8.5C19 16.65 12 21 12 21z"/></svg>`,
            bolt: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z"/></svg>`,
            droplet: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z"/></svg>`,
            save: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
            'chevron-left': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="15 18 9 12 15 6"/></svg>`,
            spinner: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="animation: hud-spin 0.8s linear infinite;"><path d="M21 12a9 9 0 1 1-6.2-8.55"/></svg><style>@keyframes hud-spin { to { transform: rotate(360deg); } }</style>`,
        };
        return icons[name] || '';
    }
}
