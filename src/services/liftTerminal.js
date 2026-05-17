// Mining-rig control terminal.
//
// Opens when the player interacts with the on-platform control panel.
// Renders a Fallout-style green-on-black HTML overlay so the small
// monospace text stays sharp regardless of the canvas zoom (same approach
// the rest of the HUD uses, see src/services/uiManager.js).
//
// Layout: a fixed-size 3-column panel — rig status / stockpile on the
// left, travel (levels + extend rope) in the middle, blueprints on the
// right. The whole thing fits inside the viewport at typical resolutions
// so there is no scrollbar; if a column overflows internally it scrolls
// on its own without dragging the rest of the screen with it.
//
// Persistence TODO: rope reach (maxExtension) and the metal-rope pool
// should be serialised with the save game when rig state is added to the
// save schema.

import { RECIPES } from './recipes.js';

const TERMINAL_GREEN = '#33ff33';
const TERMINAL_DIM = '#1a8a1a';
const TERMINAL_RED = '#ff5050';
const TERMINAL_BG = 'rgba(0, 16, 0, 0.97)';
const STYLE_ID = 'lift-terminal-styles';

const RESOURCE_LABELS = {
    wood: 'WOOD',
    coal: 'COAL',
    copper: 'COPPER',
    iron: 'IRON',
};

// Coal cost per drill, indexed by which cap layer is being drilled. Layer 1
// is dirt-cheap to introduce the mechanic; deeper caps demand more fuel
// and a stronger bit. The bit-tier requirement lives in DRILL_BIT_FOR_LAYER.
const DRILL_FUEL_COST = {1: 30, 2: 50, 3: 80, 4: 120, 5: 180, 6: 250};
const DRILL_BIT_FOR_LAYER = {1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2};
const DRILL_BIT_NAMES = ['BASIC', 'COPPER', 'IRON'];
const RIG_TIER_NAMES = ['MK-I RAFT', 'MK-II TENT', 'MK-III CABIN'];

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
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: min(900px, calc(100vw - 32px));
            max-height: calc(100vh - 32px);
            background: ${TERMINAL_BG};
            border: 2px solid ${TERMINAL_GREEN};
            box-shadow: 0 0 30px rgba(51, 255, 51, 0.4),
                        inset 0 0 60px rgba(51, 255, 51, 0.05);
            font-family: 'VT323', 'Share Tech Mono', monospace;
            color: ${TERMINAL_GREEN};
            padding: 16px 20px 14px;
            z-index: 2000;
            text-shadow: 0 0 4px rgba(51, 255, 51, 0.6);
            user-select: none;
            display: flex;
            flex-direction: column;
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
        .lift-terminal-header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: baseline;
            gap: 12px;
            border-bottom: 1px dashed ${TERMINAL_DIM};
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        .lift-terminal-title {
            grid-column: 2;
            font-size: 22px;
            letter-spacing: 0.14em;
            text-align: center;
            margin: 0;
        }
        .lift-terminal-link {
            font-size: 12px;
            color: ${TERMINAL_DIM};
            letter-spacing: 0.2em;
            justify-self: start;
        }
        .lift-terminal-link-right {
            justify-self: end;
        }
        .lift-terminal-link .dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${TERMINAL_GREEN};
            box-shadow: 0 0 6px ${TERMINAL_GREEN};
            margin-right: 6px;
            animation: lift-terminal-blink 1.2s ease-in-out infinite;
        }
        @keyframes lift-terminal-blink {
            0%, 60%, 100% { opacity: 1; }
            70%, 90% { opacity: 0.25; }
        }
        .lift-terminal-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1.1fr;
            gap: 14px;
            flex: 1;
            min-height: 0;
        }
        .lift-terminal-col {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 0;
        }
        .lift-terminal-section {
            display: flex;
            flex-direction: column;
            min-height: 0;
            font-size: 16px;
            line-height: 1.4;
        }
        .lift-terminal-section h3 {
            font-size: 13px;
            font-weight: normal;
            margin: 0 0 6px 0;
            border-bottom: 1px dashed ${TERMINAL_DIM};
            padding-bottom: 2px;
            letter-spacing: 0.18em;
            color: ${TERMINAL_GREEN};
        }
        .lift-terminal-section-body {
            min-height: 0;
            overflow: auto;
            scrollbar-width: thin;
            scrollbar-color: ${TERMINAL_DIM} transparent;
        }
        .lift-terminal-section-body::-webkit-scrollbar { width: 6px; }
        .lift-terminal-section-body::-webkit-scrollbar-thumb {
            background: ${TERMINAL_DIM};
        }
        .lift-terminal-section.grow { flex: 1; min-height: 0; }
        .lift-terminal-row {
            display: flex;
            justify-content: space-between;
            font-size: 15px;
            padding: 1px 0;
        }
        .lift-terminal-row .lbl { color: ${TERMINAL_DIM}; letter-spacing: 0.06em; }
        .lift-terminal-btn {
            display: block;
            width: 100%;
            box-sizing: border-box;
            background: transparent;
            border: 1px solid ${TERMINAL_GREEN};
            color: ${TERMINAL_GREEN};
            font-family: inherit;
            font-size: 14px;
            text-align: left;
            padding: 4px 8px;
            margin: 3px 0;
            cursor: pointer;
            letter-spacing: 0.06em;
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
        .lift-terminal-empty {
            color: ${TERMINAL_DIM};
            font-size: 13px;
            padding: 4px 0;
        }
        .lift-terminal-stockpile {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
        }
        .lift-terminal-stockpile .cell {
            border: 1px solid ${TERMINAL_DIM};
            padding: 4px 6px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .lift-terminal-stockpile .lbl {
            font-size: 11px;
            color: ${TERMINAL_DIM};
            letter-spacing: 0.14em;
        }
        .lift-terminal-stockpile .val {
            font-size: 20px;
            color: ${TERMINAL_GREEN};
            font-variant-numeric: tabular-nums;
            line-height: 1.1;
        }
        .lift-terminal-recipes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            padding-right: 4px;
        }
        .lift-terminal-recipe {
            border: 1px solid ${TERMINAL_DIM};
            padding: 5px 7px;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        .lift-terminal-recipe-head {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            letter-spacing: 0.04em;
        }
        .lift-terminal-recipe-head img {
            width: 16px;
            height: 16px;
            object-fit: contain;
            filter: drop-shadow(0 0 3px rgba(51, 255, 51, 0.45));
            flex-shrink: 0;
        }
        .lift-terminal-recipe-head .label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .lift-terminal-recipe-costs {
            display: flex;
            flex-wrap: wrap;
            gap: 2px 8px;
            font-size: 12px;
            margin: 3px 0;
            color: ${TERMINAL_DIM};
        }
        .lift-terminal-recipe-costs .short {
            color: ${TERMINAL_RED};
        }
        .lift-terminal-recipe .lift-terminal-btn {
            margin: 2px 0 0;
            font-size: 12px;
            padding: 3px 6px;
            letter-spacing: 0.06em;
            text-align: center;
        }
        .lift-terminal-footer {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed ${TERMINAL_DIM};
        }
        .lift-terminal-footer .lift-terminal-btn {
            text-align: center;
        }
        .lift-terminal-levels {
            display: flex;
            flex-direction: column;
            gap: 2px;
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

        // Player starts with a single rope-segment's worth of slack — enough
        // for one EXTEND ROPE before they have to head back up and craft
        // more from wood + coal at the blueprint table.
        this.metal = 50;
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
            <div class="lift-terminal-header">
                <div class="lift-terminal-link"><span class="dot"></span>SYS-LINK</div>
                <div class="lift-terminal-title">ROOBOO MINING RIG</div>
                <div class="lift-terminal-link lift-terminal-link-right">TERMINAL v1.0</div>
            </div>
            <div class="lift-terminal-grid">
                <div class="lift-terminal-col">
                    <div class="lift-terminal-section">
                        <h3>RIG STATUS</h3>
                        <div class="lift-terminal-row"><span class="lbl">DEPTH</span><span data-field="depth">--</span></div>
                        <div class="lift-terminal-row"><span class="lbl">ROPE</span><span data-field="rope">--</span></div>
                        <div class="lift-terminal-row"><span class="lbl">RIG</span><span data-field="rigTier">--</span></div>
                        <div class="lift-terminal-row"><span class="lbl">DRILL</span><span data-field="drillBit">--</span></div>
                        <div class="lift-terminal-row"><span class="lbl">STATUS</span><span data-field="status">--</span></div>
                    </div>
                    <div class="lift-terminal-section">
                        <h3>STOCKPILE</h3>
                        <div class="lift-terminal-stockpile">
                            <div class="cell"><span class="lbl">WOOD</span><span class="val" data-field="stockWood">0</span></div>
                            <div class="cell"><span class="lbl">COAL</span><span class="val" data-field="stockCoal">0</span></div>
                            <div class="cell"><span class="lbl">ROPE</span><span class="val" data-field="stockMetal">0</span></div>
                            <div class="cell"><span class="lbl">COPPER</span><span class="val" data-field="stockCopper">0</span></div>
                            <div class="cell"><span class="lbl">IRON</span><span class="val" data-field="stockIron">0</span></div>
                        </div>
                    </div>
                    <div class="lift-terminal-section">
                        <h3>EXTEND ROPE</h3>
                        <button class="lift-terminal-btn" data-action="extend">
                            +<span data-field="extendIncrement">--</span>m
                            <span class="right">COST <span data-field="extendCost">--</span></span>
                        </button>
                    </div>
                    <div class="lift-terminal-section">
                        <h3>DRILL</h3>
                        <div data-field="drillBody"></div>
                    </div>
                </div>
                <div class="lift-terminal-col">
                    <div class="lift-terminal-section grow">
                        <h3>LEVELS</h3>
                        <div class="lift-terminal-section-body lift-terminal-levels" data-field="levels"></div>
                    </div>
                </div>
                <div class="lift-terminal-col">
                    <div class="lift-terminal-section grow">
                        <h3>BLUEPRINTS</h3>
                        <div class="lift-terminal-section-body">
                            <div class="lift-terminal-recipes" data-field="recipes"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="lift-terminal-footer">
                <button class="lift-terminal-btn" data-action="close">[ DISCONNECT ]</button>
            </div>
        `;
        document.body.appendChild(root);
        this.root = root;
        this.fields = {
            depth: root.querySelector('[data-field="depth"]'),
            rope: root.querySelector('[data-field="rope"]'),
            status: root.querySelector('[data-field="status"]'),
            rigTier: root.querySelector('[data-field="rigTier"]'),
            drillBit: root.querySelector('[data-field="drillBit"]'),
            extendIncrement: root.querySelector('[data-field="extendIncrement"]'),
            extendCost: root.querySelector('[data-field="extendCost"]'),
            levels: root.querySelector('[data-field="levels"]'),
            stockWood: root.querySelector('[data-field="stockWood"]'),
            stockCoal: root.querySelector('[data-field="stockCoal"]'),
            stockMetal: root.querySelector('[data-field="stockMetal"]'),
            stockCopper: root.querySelector('[data-field="stockCopper"]'),
            stockIron: root.querySelector('[data-field="stockIron"]'),
            recipes: root.querySelector('[data-field="recipes"]'),
            drillBody: root.querySelector('[data-field="drillBody"]'),
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
        this.root.style.display = 'flex';
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

    /**
     * World Y of the topmost still-bedrock cap below the surface, or null
     * if every cap has been drilled. Used to clamp `canReach` so the rope
     * length isn't enough on its own — the shaft must also be open.
     */
    nextBlockingCapWorldY() {
        const ts = this.game.tileSize;
        const caps = this.game.layerCapRows || [];
        const ms = this.game.mapService;
        const bedrockId = this.game.tileTypes.bedrock?.id;
        const bedrockType = this.game.tileTypes.bedrock?.type;
        if (bedrockId == null || !ms) return null;
        const centreX = Math.floor((this.game.chasmRange[0] + this.game.chasmRange[1]) / 2);
        for (const cap of caps) {
            const cell = ms._cellAt(centreX, cap.capY);
            if (cell && cell.id === bedrockId && cell.type === bedrockType) {
                return cap.capY * ts;
            }
        }
        return null;
    }

    canReach(worldY) {
        if (worldY > this.maxReachableY() + 1) return false;
        // Caps block descent regardless of rope reach. The platform parks
        // one tile above the cap (so the deck still shows above it), so a
        // request for that or any deeper Y is denied until the drill clears.
        const capY = this.nextBlockingCapWorldY();
        if (capY != null && worldY >= capY - this.game.tileSize) return false;
        return true;
    }

    refresh() {
        const cm = this.craneManager;
        const surfaceY = cm.surfaceWorldY();
        const currentY = cm.craneFlat.body.y - 5;
        const currentDepth = Math.max(0, Math.round(currentY - surfaceY));

        this.fields.depth.textContent = `-${currentDepth} M`;
        this.fields.rope.textContent = `-${Math.round(this.maxExtension)} M`;
        this.fields.status.textContent = cm.moving ? 'IN MOTION' : 'IDLE';
        this.fields.rigTier.textContent = RIG_TIER_NAMES[cm.rigTier] || 'MK-?';
        this.fields.drillBit.textContent = DRILL_BIT_NAMES[cm.drillBitTier] || '?';
        this.fields.extendIncrement.textContent = String(this.extendIncrement);
        this.fields.extendCost.textContent = String(this.extendCost);

        this.renderLevels(currentY, surfaceY);
        this.renderDrill();
        this.renderCrafting();
    }

    /**
     * Show whether the platform is parked at a layer cap and, if so, expose
     * a single DRILL button that consumes coal (gated by drill-bit tier).
     * Otherwise show a hint at where the next drillable cap lives so the
     * player has a goal in mind when they leave the terminal.
     */
    renderDrill() {
        const body = this.fields.drillBody;
        if (!body) return;
        body.innerHTML = '';
        const cm = this.craneManager;
        const cap = cm.capDirectlyBelow ? cm.capDirectlyBelow() : null;
        const fmtBitReq = (req) =>
            req === 0 ? 'BASIC BIT' :
            req === 1 ? 'COPPER BIT REQ.' :
                        'IRON BIT REQ.';

        if (!cap) {
            const hint = document.createElement('div');
            hint.className = 'lift-terminal-empty';
            const next = (this.game.layerCapRows || []).find(c => {
                const ts = this.game.tileSize;
                const centreX = Math.floor((this.game.chasmRange[0] + this.game.chasmRange[1]) / 2);
                const cell = this.game.mapService._cellAt(centreX, c.capY);
                return cell && cell.id === this.game.tileTypes.bedrock.id && cell.type === this.game.tileTypes.bedrock.type;
            });
            if (next) {
                const surfaceY = cm.surfaceWorldY();
                const ts = this.game.tileSize;
                const depthM = Math.round((next.capY * ts) - surfaceY);
                hint.textContent = `> NEXT CAP @ -${depthM}M (${fmtBitReq(DRILL_BIT_FOR_LAYER[next.layer] ?? 0)}). PARK PLATFORM ABOVE TO DRILL.`;
            } else {
                hint.textContent = '> ALL KNOWN CAPS CLEARED.';
            }
            body.appendChild(hint);
            return;
        }

        const cost = DRILL_FUEL_COST[cap.layer] || 50;
        const bitReq = DRILL_BIT_FOR_LAYER[cap.layer] ?? 0;
        const haveCoal = this._resourceCount('coal');
        const hasBit = cm.drillBitTier >= bitReq;
        const canDrill = haveCoal >= cost && hasBit && !cm.moving;

        const status = document.createElement('div');
        status.className = 'lift-terminal-row';
        status.innerHTML = `<span class="lbl">CAP</span><span>L${cap.layer}  (${fmtBitReq(bitReq)})</span>`;
        body.appendChild(status);

        const fuel = document.createElement('div');
        fuel.className = 'lift-terminal-row';
        const shortFuel = haveCoal < cost ? ' style="color:#ff5050"' : '';
        fuel.innerHTML = `<span class="lbl">FUEL</span><span${shortFuel}>COAL ${haveCoal}/${cost}</span>`;
        body.appendChild(fuel);

        const btn = document.createElement('button');
        btn.className = 'lift-terminal-btn';
        btn.disabled = !canDrill;
        const label = !hasBit
            ? '[ BIT TOO WEAK ]'
            : haveCoal < cost
                ? '[ NEED MORE COAL ]'
                : '[ DRILL THROUGH ]';
        btn.innerHTML = label;
        btn.addEventListener('click', () => {
            if (!btn.disabled) this.drill(cap);
        });
        body.appendChild(btn);
    }

    /**
     * Spend the fuel, clear the cap, refresh. Re-checks both gates in case
     * inventory state shifted between render and click.
     */
    drill(cap) {
        const cm = this.craneManager;
        const cost = DRILL_FUEL_COST[cap.layer] || 50;
        const bitReq = DRILL_BIT_FOR_LAYER[cap.layer] ?? 0;
        if (cm.moving) return;
        if (cm.drillBitTier < bitReq) return;
        if (this._resourceCount('coal') < cost) return;
        this._consumeResource('coal', cost);
        cm.drillCap(cap);
        this.refresh();
    }

    renderLevels(currentY, surfaceY) {
        const cm = this.craneManager;
        const ts = this.game.tileSize;
        const switchLevels = this._scanLevelsFromGrid().map(l => ({...l, kind: 'switch'}));

        // Synthesise a "cap park" entry one tile above each undrilled
        // bedrock cap — the wall-switch grid alone has nothing close enough
        // to position the platform for a drill, so we manufacture stops at
        // the right Y. The shifted park position lines the deck bottom up
        // flush with the cap so capDirectlyBelow() resolves to the cap.
        const ms = this.game.mapService;
        const bedrockId = this.game.tileTypes.bedrock?.id;
        const bedrockType = this.game.tileTypes.bedrock?.type;
        const centreX = Math.floor((this.game.chasmRange[0] + this.game.chasmRange[1]) / 2);
        const capLevels = (this.game.layerCapRows || []).map(cap => {
            const cell = ms._cellAt(centreX, cap.capY);
            const drilled = !cell || cell.id !== bedrockId || cell.type !== bedrockType;
            return {
                kind: 'cap',
                worldY: cap.capY * ts - (ts + ts / 2),
                cap,
                drilled,
            };
        }).filter(l => !l.drilled);

        const levels = [...switchLevels, ...capLevels].sort((a, b) => a.worldY - b.worldY);
        const list = this.fields.levels;
        list.innerHTML = '';

        if (levels.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'lift-terminal-empty';
            empty.textContent = '> NO LIFT CONTROLS DETECTED IN SHAFT.';
            list.appendChild(empty);
            return;
        }

        let switchIdx = 0;
        levels.forEach(lvl => {
            const depth = Math.round(lvl.worldY - surfaceY);
            const reachable = this.canReach(lvl.worldY);
            const atHere = Math.abs(currentY - lvl.worldY) < 2;
            const btn = document.createElement('button');
            btn.className = 'lift-terminal-btn';
            btn.disabled = !reachable || atHere || cm.moving;
            const tag = !reachable ? 'LOCKED' : (atHere ? 'CURRENT' : 'TRAVEL');
            const depthLabel = depth >= 0 ? `-${depth}m` : `+${-depth}m`;
            let label;
            if (lvl.kind === 'cap') {
                label = `CAP L${lvl.cap.layer} &nbsp; ${depthLabel}`;
            } else {
                switchIdx++;
                const num = String(switchIdx).padStart(2, '0');
                label = `LVL ${num} &nbsp; ${depthLabel}`;
            }
            btn.innerHTML = `${label}<span class="right">[ ${tag} ]</span>`;
            btn.addEventListener('click', () => {
                if (!btn.disabled) this.travelTo(lvl.worldY);
            });
            list.appendChild(btn);
        });
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
        this.fields.stockCopper.textContent = String(this._resourceCount('copper'));
        this.fields.stockIron.textContent = String(this._resourceCount('iron'));

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
            name.className = 'label';
            name.textContent = recipe.name.toUpperCase();
            head.appendChild(img);
            head.appendChild(name);
            card.appendChild(head);

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

            // One-shot upgrades flip from CRAFT to OWNED once the player has
            // reached the recipe's target tier — keeps the recipe in the
            // catalogue (so the cost stays visible as a reference) but
            // disables it so accidental clicks don't no-op silently.
            const cm = this.craneManager;
            let owned = false;
            if (recipe.output.kind === 'drillBit' && cm.drillBitTier >= recipe.output.tier) owned = true;
            if (recipe.output.kind === 'rigTier'  && cm.rigTier      >= recipe.output.tier) owned = true;

            const btn = document.createElement('button');
            btn.className = 'lift-terminal-btn';
            btn.disabled = owned || !canAfford;
            btn.innerHTML = owned
                ? '[ INSTALLED ]'
                : canAfford
                    ? (recipe.output.amount ? `[ CRAFT ] +${recipe.output.amount}` : '[ INSTALL ]')
                    : '[ INSUFFICIENT ]';
            btn.title = recipe.description || '';
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
     *   - 'metal':    top up the rig's rope stockpile.
     *   - 'tool':     bump an existing tool stack's metadata.number. If
     *                 the player isn't carrying that tool, the craft is
     *                 refused (resources stay untouched) so we don't
     *                 silently eat materials for an item the player can't
     *                 receive.
     *   - 'drillBit': upgrade the rig's drill-bit tier (one-shot — once
     *                 owned, the bit applies to all future drills).
     *   - 'rigTier':  upgrade the platform/shelter tier (one-shot ladder
     *                 to the next tier; refuses if already past).
     * One-shot upgrades refuse before consuming inputs if the player is
     * already at or above the target tier.
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
        const cm = this.craneManager;
        if (recipe.output.kind === 'drillBit' && cm.drillBitTier >= recipe.output.tier) return;
        if (recipe.output.kind === 'rigTier'  && cm.rigTier      >= recipe.output.tier) return;

        for (const input of recipe.inputs) {
            this._consumeResource(input.id, input.amount);
        }

        if (recipe.output.kind === 'metal') {
            this.metal += recipe.output.amount;
        } else if (recipe.output.kind === 'tool') {
            this.game.inventoryManager?.addToToolStack?.(recipe.output.toolId, recipe.output.amount);
        } else if (recipe.output.kind === 'drillBit') {
            cm.setDrillBitTier(recipe.output.tier);
        } else if (recipe.output.kind === 'rigTier') {
            cm.setRigTier(recipe.output.tier);
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
