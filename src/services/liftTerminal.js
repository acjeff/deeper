// Mining-rig control terminal.
//
// Opens when the player interacts with the on-platform control panel.
// Renders a Fallout-style green-on-black HTML overlay so the small
// monospace text stays sharp regardless of the canvas zoom (same approach
// the rest of the HUD uses, see src/services/uiManager.js).
//
// Crafting / upgrade hookups (TODO):
// - "Metal rope" is the resource that extends the rig's reach. The flow we
//   want long-term is: ore (existing mining system) -> smelt to ingots ->
//   craft into metal rope segments -> consumed here when the player presses
//   EXTEND ROPE.
// - For now we hold a placeholder `metal` count on the terminal itself and
//   deduct from it on extend. When the crafting/upgrade system lands, swap
//   the placeholder reads/writes for real inventory ops at the marked
//   spots below.
// - `maxExtension` should also be persisted with the save game when the
//   save system is updated to include rig state.

const TERMINAL_GREEN = '#33ff33';
const TERMINAL_DIM = '#1a8a1a';
const TERMINAL_BG = 'rgba(0, 16, 0, 0.97)';
const STYLE_ID = 'lift-terminal-styles';

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .lift-terminal {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 480px;
            max-height: 80vh;
            overflow-y: auto;
            background: ${TERMINAL_BG};
            border: 2px solid ${TERMINAL_GREEN};
            box-shadow: 0 0 30px rgba(51, 255, 51, 0.4),
                        inset 0 0 60px rgba(51, 255, 51, 0.05);
            font-family: 'VT323', 'Share Tech Mono', monospace;
            color: ${TERMINAL_GREEN};
            padding: 18px 22px 16px;
            z-index: 2000;
            text-shadow: 0 0 4px rgba(51, 255, 51, 0.6);
            user-select: none;
        }
        .lift-terminal::after {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                to bottom,
                rgba(0,0,0,0) 0,
                rgba(0,0,0,0) 2px,
                rgba(0,0,0,0.18) 2px,
                rgba(0,0,0,0.18) 3px
            );
            pointer-events: none;
        }
        .lift-terminal-title {
            font-size: 22px;
            letter-spacing: 0.14em;
            text-align: center;
            margin: 0 0 2px;
        }
        .lift-terminal-sub {
            font-size: 13px;
            color: ${TERMINAL_DIM};
            text-align: center;
            margin-bottom: 12px;
            letter-spacing: 0.2em;
        }
        .lift-terminal-section {
            margin: 10px 0;
            font-size: 16px;
            line-height: 1.5;
        }
        .lift-terminal-section h3 {
            font-size: 15px;
            font-weight: normal;
            margin: 0 0 4px 0;
            border-bottom: 1px dashed ${TERMINAL_DIM};
            padding-bottom: 2px;
            letter-spacing: 0.12em;
        }
        .lift-terminal-row {
            display: flex;
            justify-content: space-between;
        }
        .lift-terminal-btn {
            display: block;
            width: 100%;
            box-sizing: border-box;
            background: transparent;
            border: 1px solid ${TERMINAL_GREEN};
            color: ${TERMINAL_GREEN};
            font-family: inherit;
            font-size: 16px;
            text-align: left;
            padding: 5px 10px;
            margin: 4px 0;
            cursor: pointer;
            letter-spacing: 0.08em;
            transition: background 80ms;
            text-shadow: inherit;
        }
        .lift-terminal-btn:hover:not(:disabled) {
            background: rgba(51, 255, 51, 0.15);
        }
        .lift-terminal-btn:disabled {
            color: ${TERMINAL_DIM};
            border-color: ${TERMINAL_DIM};
            cursor: not-allowed;
        }
        .lift-terminal-btn .right { float: right; }
        .lift-terminal-actions {
            display: flex;
            gap: 10px;
            margin-top: 12px;
        }
        .lift-terminal-actions .lift-terminal-btn { margin: 0; flex: 1; }
        .lift-terminal-empty {
            color: ${TERMINAL_DIM};
            font-size: 14px;
            padding: 4px 0;
        }
    `;
    document.head.appendChild(style);
}

export default class LiftTerminal {
    constructor(craneManager) {
        injectStyles();
        this.craneManager = craneManager;
        this.game = craneManager.game;
        this.isOpen = false;

        // TODO(crafting): replace placeholder with real metal-rope inventory.
        // The player will craft rope segments from smelted ore and consume
        // them here. For now, treat as fully stocked.
        this.metal = 9999;
        this.extendCost = 50;
        this.extendIncrement = 100;
        // How far below the surface the rig's rope can reach (world units).
        // TODO(persistence): persist with save game once rig state is saved.
        this.maxExtension = 0;

        this.buildDom();

        // Tear the DOM overlay down when the scene stops so we don't leak
        // a stale terminal into the menu / next game.
        this.game.events.once('shutdown', () => this.destroy());
        this.game.events.once('destroy', () => this.destroy());
    }

    buildDom() {
        const root = document.createElement('div');
        root.className = 'lift-terminal';
        root.style.display = 'none';
        root.innerHTML = `
            <div class="lift-terminal-title">ROOBOO MINING RIG / TERMINAL</div>
            <div class="lift-terminal-sub">SYS-LINK ESTABLISHED</div>
            <div class="lift-terminal-section">
                <h3>RIG STATUS</h3>
                <div class="lift-terminal-row"><span>CURRENT DEPTH</span><span data-field="depth">--</span></div>
                <div class="lift-terminal-row"><span>ROPE LENGTH</span><span data-field="rope">--</span></div>
                <div class="lift-terminal-row"><span>STATUS</span><span data-field="status">--</span></div>
            </div>
            <div class="lift-terminal-section">
                <h3>RESOURCES</h3>
                <div class="lift-terminal-row"><span>METAL ROPE STOCK</span><span data-field="metal">--</span></div>
                <button class="lift-terminal-btn" data-action="extend">
                    EXTEND ROPE +<span data-field="extendIncrement">--</span>m
                    <span class="right">COST <span data-field="extendCost">--</span></span>
                </button>
            </div>
            <div class="lift-terminal-section">
                <h3>LEVELS</h3>
                <div data-field="levels"></div>
            </div>
            <div class="lift-terminal-actions">
                <button class="lift-terminal-btn" data-action="close">[ DISCONNECT ]</button>
            </div>
        `;
        document.body.appendChild(root);
        this.root = root;
        this.fields = {
            depth: root.querySelector('[data-field="depth"]'),
            rope: root.querySelector('[data-field="rope"]'),
            status: root.querySelector('[data-field="status"]'),
            metal: root.querySelector('[data-field="metal"]'),
            extendIncrement: root.querySelector('[data-field="extendIncrement"]'),
            extendCost: root.querySelector('[data-field="extendCost"]'),
            levels: root.querySelector('[data-field="levels"]'),
        };

        root.querySelector('[data-action="extend"]').addEventListener('click', () => this.extendRope());
        root.querySelector('[data-action="close"]').addEventListener('click', () => this.close());

        // Stop terminal-internal input from leaking to the canvas so the
        // player doesn't swing tools / change toolbar slot while clicking
        // through the menu.
        const swallow = (e) => e.stopPropagation();
        root.addEventListener('mousedown', swallow);
        root.addEventListener('mouseup', swallow);
        root.addEventListener('wheel', swallow);
    }

    toggle() {
        if (this.isOpen) this.close(); else this.open();
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.game.freezePlayer = true;
        this.root.style.display = 'block';
        this.refresh();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.game.freezePlayer = false;
        this.root.style.display = 'none';
    }

    extendRope() {
        if (this.craneManager.moving) return;
        if (this.metal < this.extendCost) return;
        // TODO(crafting): deduct from real metal-rope inventory once available.
        this.metal -= this.extendCost;
        this.maxExtension += this.extendIncrement;
        this.refresh();
    }

    travelTo(worldY) {
        this.close();
        this.craneManager.travelToLevel(worldY);
    }

    maxReachableY() {
        return this.craneManager.surfaceWorldY() + this.maxExtension;
    }

    canReach(worldY) {
        return worldY <= this.maxReachableY() + 1;
    }

    refresh() {
        const cm = this.craneManager;
        const surfaceY = cm.surfaceWorldY();
        const currentY = cm.craneFlat.body.y - 5;
        const currentDepth = Math.max(0, Math.round(currentY - surfaceY));

        this.fields.depth.textContent = `-${currentDepth} M`;
        this.fields.rope.textContent = `-${Math.round(this.maxExtension)} M`;
        this.fields.status.textContent = cm.moving ? 'IN MOTION' : 'IDLE';
        this.fields.metal.textContent = String(this.metal);
        this.fields.extendIncrement.textContent = String(this.extendIncrement);
        this.fields.extendCost.textContent = String(this.extendCost);

        // Levels are wall-mounted lift controls placed by the player along
        // the shaft. The on-platform panel itself is filtered out via the
        // isPlatformPanel marker that CraneManager sets on its sprite.
        const levels = this.game.liftControlGroup.getChildren()
            .filter(c => !c.isPlatformPanel)
            .map(c => ({ entity: c, worldY: c.tileRef?.worldY ?? c.y }))
            .sort((a, b) => a.worldY - b.worldY);

        const list = this.fields.levels;
        list.innerHTML = '';

        if (levels.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'lift-terminal-empty';
            empty.textContent = '> NO LIFT CONTROLS DETECTED IN SHAFT.';
            list.appendChild(empty);
            return;
        }

        levels.forEach((lvl, i) => {
            const depth = Math.round(lvl.worldY - surfaceY);
            const reachable = this.canReach(lvl.worldY);
            const atHere = Math.abs(currentY - lvl.worldY) < 1;
            const btn = document.createElement('button');
            btn.className = 'lift-terminal-btn';
            btn.disabled = !reachable || atHere || cm.moving;
            const tag = !reachable ? 'LOCKED' : (atHere ? 'CURRENT' : 'TRAVEL');
            const num = String(i + 1).padStart(2, '0');
            const depthLabel = depth >= 0 ? `-${depth}m` : `+${-depth}m`;
            btn.innerHTML =
                `LVL ${num} &nbsp; ${depthLabel}<span class="right">[ ${tag} ]</span>`;
            btn.addEventListener('click', () => {
                if (!btn.disabled) this.travelTo(lvl.worldY);
            });
            list.appendChild(btn);
        });
    }

    destroy() {
        this.close();
        this.root?.remove();
        this.root = null;
    }
}
