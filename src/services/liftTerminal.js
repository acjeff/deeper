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

import { RECIPES } from './recipes.js';

const TERMINAL_GREEN = '#33ff33';
const TERMINAL_DIM = '#1a8a1a';
const TERMINAL_RED = '#ff5050';
const TERMINAL_BG = 'rgba(0, 16, 0, 0.97)';
const STYLE_ID = 'lift-terminal-styles';

// Friendly labels for the raw materials referenced in recipes. Kept here
// (rather than in recipes.js) so the data file stays pure.
const RESOURCE_LABELS = {
    wood: 'WOOD',
    coal: 'COAL',
};

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
        .lift-terminal-tabs {
            display: flex;
            gap: 6px;
            margin: 6px 0 10px;
        }
        .lift-terminal-tab {
            flex: 1;
            background: transparent;
            border: 1px solid ${TERMINAL_DIM};
            color: ${TERMINAL_DIM};
            font-family: inherit;
            font-size: 14px;
            padding: 4px 8px;
            cursor: pointer;
            letter-spacing: 0.12em;
            text-align: center;
            text-shadow: inherit;
        }
        .lift-terminal-tab:hover {
            background: rgba(51, 255, 51, 0.08);
        }
        .lift-terminal-tab.active {
            border-color: ${TERMINAL_GREEN};
            color: ${TERMINAL_GREEN};
            background: rgba(51, 255, 51, 0.12);
        }
        .lift-terminal-recipe {
            border: 1px solid ${TERMINAL_DIM};
            padding: 6px 8px;
            margin: 6px 0;
        }
        .lift-terminal-recipe-head {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
        }
        .lift-terminal-recipe-head img {
            width: 18px;
            height: 18px;
            object-fit: contain;
            filter: drop-shadow(0 0 3px rgba(51, 255, 51, 0.45));
        }
        .lift-terminal-recipe-desc {
            font-size: 12px;
            color: ${TERMINAL_DIM};
            margin: 2px 0 4px;
            letter-spacing: 0.04em;
        }
        .lift-terminal-recipe-costs {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 12px;
            font-size: 13px;
            margin-bottom: 4px;
        }
        .lift-terminal-recipe-costs .short {
            color: ${TERMINAL_RED};
        }
        .lift-terminal-recipe .lift-terminal-btn {
            margin: 4px 0 0;
            font-size: 14px;
            padding: 4px 8px;
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
        this.metal = 50;
        this.extendCost = 50;
        this.extendIncrement = 100;
        this.activeTab = 'main';
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
            <div class="lift-terminal-tabs">
                <button class="lift-terminal-tab active" data-tab="main">[ RIG ]</button>
                <button class="lift-terminal-tab" data-tab="crafting">[ CRAFTING ]</button>
            </div>
            <div data-pane="main">
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
            </div>
            <div data-pane="crafting" style="display:none;">
                <div class="lift-terminal-section">
                    <h3>STOCKPILE</h3>
                    <div class="lift-terminal-row"><span>WOOD</span><span data-field="stockWood">--</span></div>
                    <div class="lift-terminal-row"><span>COAL</span><span data-field="stockCoal">--</span></div>
                    <div class="lift-terminal-row"><span>METAL ROPE</span><span data-field="stockMetal">--</span></div>
                </div>
                <div class="lift-terminal-section">
                    <h3>BLUEPRINTS</h3>
                    <div data-field="recipes"></div>
                </div>
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
            stockWood: root.querySelector('[data-field="stockWood"]'),
            stockCoal: root.querySelector('[data-field="stockCoal"]'),
            stockMetal: root.querySelector('[data-field="stockMetal"]'),
            recipes: root.querySelector('[data-field="recipes"]'),
        };
        this.panes = {
            main: root.querySelector('[data-pane="main"]'),
            crafting: root.querySelector('[data-pane="crafting"]'),
        };
        this.tabButtons = root.querySelectorAll('[data-tab]');

        root.querySelector('[data-action="extend"]').addEventListener('click', () => this.extendRope());
        root.querySelector('[data-action="close"]').addEventListener('click', () => this.close());
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setTab(btn.dataset.tab));
        });

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

    setTab(tab) {
        if (!this.panes[tab]) return;
        this.activeTab = tab;
        Object.entries(this.panes).forEach(([name, el]) => {
            el.style.display = name === tab ? 'block' : 'none';
        });
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.refresh();
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
        // Metal rope is crafted at the table (wood + coal → metal). When
        // the rope-segment-as-inventory-item rework lands this should drain
        // from inventoryManager.consumeResource('metalRope', ...) instead.
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

        const levels = this._scanLevelsFromGrid();

        const list = this.fields.levels;
        list.innerHTML = '';

        if (levels.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'lift-terminal-empty';
            empty.textContent = '> NO LIFT CONTROLS DETECTED IN SHAFT.';
            list.appendChild(empty);
            this.renderCrafting();
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

        this.renderCrafting();
    }

    // Resource lookup that bridges the inventory (wood, coal) and the rig's
    // own pools (metal). Recipe inputs reference these ids verbatim.
    _resourceCount(id) {
        if (id === 'metal') return this.metal;
        return this.game.inventoryManager?.getResourceCount?.(id) || 0;
    }

    _consumeResource(id, amount) {
        if (id === 'metal') {
            if (this.metal < amount) return false;
            this.metal -= amount;
            return true;
        }
        return !!this.game.inventoryManager?.consumeResource?.(id, amount);
    }

    renderCrafting() {
        if (!this.fields.recipes) return;
        this.fields.stockWood.textContent = String(this._resourceCount('wood'));
        this.fields.stockCoal.textContent = String(this._resourceCount('coal'));
        this.fields.stockMetal.textContent = String(this.metal);

        const list = this.fields.recipes;
        list.innerHTML = '';

        RECIPES.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'lift-terminal-recipe';

            const head = document.createElement('div');
            head.className = 'lift-terminal-recipe-head';
            const img = document.createElement('img');
            img.src = recipe.icon;
            img.alt = '';
            if (recipe.iconRotate) img.style.transform = `rotate(${recipe.iconRotate}deg)`;
            const name = document.createElement('span');
            name.textContent = recipe.name.toUpperCase();
            head.appendChild(img);
            head.appendChild(name);
            card.appendChild(head);

            if (recipe.description) {
                const desc = document.createElement('div');
                desc.className = 'lift-terminal-recipe-desc';
                desc.textContent = recipe.description;
                card.appendChild(desc);
            }

            const costs = document.createElement('div');
            costs.className = 'lift-terminal-recipe-costs';
            let canAfford = true;
            recipe.inputs.forEach(input => {
                const have = this._resourceCount(input.id);
                const short = have < input.amount;
                if (short) canAfford = false;
                const tag = document.createElement('span');
                tag.textContent = `${RESOURCE_LABELS[input.id] || input.id.toUpperCase()} ${have}/${input.amount}`;
                if (short) tag.classList.add('short');
                costs.appendChild(tag);
            });
            card.appendChild(costs);

            const btn = document.createElement('button');
            btn.className = 'lift-terminal-btn';
            btn.disabled = !canAfford;
            btn.innerHTML = canAfford
                ? `[ CRAFT ]<span class="right">+${recipe.output.amount}</span>`
                : `[ INSUFFICIENT ]<span class="right">+${recipe.output.amount}</span>`;
            btn.addEventListener('click', () => {
                if (!btn.disabled) this.craft(recipe);
            });
            card.appendChild(btn);

            list.appendChild(card);
        });
    }

    /**
     * Run a recipe: re-check costs (in case state changed between render
     * and click), then consume inputs and apply the output. Output kinds:
     *   - 'metal': top up the rig's rope stockpile.
     *   - 'tool':  bump an existing tool stack's metadata.number. If the
     *              player isn't carrying that tool, the craft is refused
     *              (resources stay untouched) so we don't silently eat
     *              materials for an item the player can't receive.
     */
    craft(recipe) {
        for (const input of recipe.inputs) {
            if (this._resourceCount(input.id) < input.amount) return;
        }
        if (recipe.output.kind === 'tool') {
            const im = this.game.inventoryManager;
            const tb = this.game.toolBarManager;
            const hasSlot = im?.slots?.some(s => s && s.id === recipe.output.toolId)
                || tb?.slots?.some(s => s && s.id === recipe.output.toolId);
            if (!hasSlot) return;
        }

        for (const input of recipe.inputs) {
            this._consumeResource(input.id, input.amount);
        }

        if (recipe.output.kind === 'metal') {
            this.metal += recipe.output.amount;
        } else if (recipe.output.kind === 'tool') {
            this.game.inventoryManager?.addToToolStack?.(recipe.output.toolId, recipe.output.amount);
        }

        this.refresh();
    }

    /**
     * Scan the saved grid for every lift-control tile and dedupe by row.
     *
     * Sourcing from liftControlGroup only sees sprites in currently-loaded
     * chunks, so faraway levels would disappear after the player descended.
     * The grid is the source of truth and persists regardless of render
     * distance. Lift controls are auto-placed on both chasm walls at the
     * same Y, so we merge entries that share a row into a single level.
     */
    _scanLevelsFromGrid() {
        const tileSize = this.game.tileSize;
        const liftId = this.game.tileTypes?.liftControl?.id;
        const grid = this.game.grid;
        if (liftId == null || !grid) return [];

        const seenRows = new Set();
        const levels = [];

        for (const chunkKey of Object.keys(grid)) {
            const chunkArray = grid[chunkKey];
            if (!chunkArray) continue;
            const [chunkStartCellX, chunkStartCellY] = chunkKey.split('_').map(Number);
            for (let cy = 0; cy < chunkArray.length; cy++) {
                const row = chunkArray[cy];
                if (!row) continue;
                for (let cx = 0; cx < row.length; cx++) {
                    const cell = row[cx];
                    if (!cell || cell.id !== liftId) continue;
                    const cellAbsY = chunkStartCellY + cy;
                    if (seenRows.has(cellAbsY)) continue;
                    seenRows.add(cellAbsY);
                    levels.push({
                        worldX: (chunkStartCellX + cx) * tileSize,
                        worldY: cellAbsY * tileSize
                    });
                }
            }
        }
        levels.sort((a, b) => a.worldY - b.worldY);
        return levels;
    }

    destroy() {
        this.close();
        this.root?.remove();
        this.root = null;
    }
}
