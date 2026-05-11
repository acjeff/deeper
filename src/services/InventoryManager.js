import { HUD } from './uiManager.js';
import InventoryItem from '../classes/InventoryItem.js';

const STYLE_ID = 'inventory-panel-styles';

// Equipment slots are passive for now — they accept any item via drag &
// drop so the rig of equipment can be assembled, but there's no armor /
// stat system reading from them yet. The set + order here determines the
// vertical layout in the character pane.
const EQUIPMENT_SLOTS = [
    { id: 'head', label: 'Helmet' },
    { id: 'chest', label: 'Chest' },
    { id: 'legs', label: 'Legs' },
    { id: 'feet', label: 'Boots' },
];

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .inventory-panel {
            font-family: ${HUD.font};
            color: ${HUD.text};
            display: flex;
            flex-direction: column;
            gap: 0;
            width: min(720px, calc(100vw - 32px));
            max-height: calc(100vh - 32px);
        }
        .inventory-panel .ip-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .inventory-panel .ip-title {
            display: flex; align-items: center; gap: 10px;
        }
        .inventory-panel .ip-title .dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: ${HUD.accent};
            box-shadow: 0 0 10px ${HUD.accent};
        }
        .inventory-panel .ip-title span {
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: ${HUD.text};
        }
        .inventory-panel .ip-hint {
            font-size: 11px;
            color: ${HUD.textMuted};
        }
        .inventory-panel .ip-hint kbd {
            font-family: ${HUD.fontMono};
            font-size: 10px;
            font-weight: 600;
            color: ${HUD.text};
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 4px;
            padding: 2px 6px;
            margin: 0 2px;
        }
        .inventory-panel .ip-body {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: 16px;
            padding: 16px;
        }
        .inventory-panel .ip-section-label {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: ${HUD.textMuted};
            margin: 0 0 8px;
        }
        .inventory-panel .ip-character {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .inventory-panel .ip-char-frame {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 60px;
            gap: 8px;
            padding: 10px;
            background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .inventory-panel .ip-char-portrait {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 180px;
            background:
                radial-gradient(120% 90% at 50% 30%, rgba(91, 157, 255, 0.18) 0%, rgba(91, 157, 255, 0) 60%),
                linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.25) 100%);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        }
        .inventory-panel .ip-char-portrait::after {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                to bottom,
                rgba(0,0,0,0) 0,
                rgba(0,0,0,0) 3px,
                rgba(0,0,0,0.18) 3px,
                rgba(0,0,0,0.18) 4px
            );
            pointer-events: none;
        }
        .inventory-panel .ip-char-portrait img {
            image-rendering: pixelated;
            height: 78%;
            max-height: 160px;
            filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.6));
        }
        .inventory-panel .ip-equipment {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .inventory-panel .ip-grid {
            display: grid;
            gap: 6px;
        }
        .inventory-panel .ip-grid.inv {
            grid-template-columns: repeat(6, 56px);
        }
        .inventory-panel .ip-grid.hotbar {
            grid-template-columns: repeat(7, 56px);
        }
        .inventory-panel .ip-slot {
            width: 56px;
            height: 56px;
            box-sizing: border-box;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 6px;
            position: relative;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .inventory-panel .ip-slot:hover {
            transform: translateY(-1px);
            border-color: rgba(91, 157, 255, 0.55);
            background: linear-gradient(135deg, rgba(91, 157, 255, 0.12) 0%, rgba(91, 157, 255, 0.04) 100%);
            box-shadow: 0 0 0 2px rgba(91, 157, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .inventory-panel .ip-slot.equipment {
            width: 100%;
            height: 48px;
            border-radius: 6px;
        }
        .inventory-panel .ip-slot.equipment .placeholder {
            font-size: 9px;
            font-weight: 600;
            color: ${HUD.textDim};
            letter-spacing: 0.16em;
            text-transform: uppercase;
            text-align: center;
            line-height: 1.1;
        }
        .inventory-panel .ip-slot.hotbar.selected {
            border-color: ${HUD.accent};
            background: linear-gradient(135deg, rgba(91, 157, 255, 0.20) 0%, rgba(91, 157, 255, 0.08) 100%);
            box-shadow: 0 0 0 2px rgba(91, 157, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .inventory-panel .ip-slot img {
            width: 78%;
            height: 78%;
            object-fit: contain;
            filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
            pointer-events: auto;
        }
        .inventory-panel .ip-slot .stack {
            color: #fff;
            position: absolute;
            bottom: 3px;
            right: 4px;
            font-weight: 700;
            font-size: 10px;
            font-family: ${HUD.fontMono};
            background: rgba(0, 0, 0, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 5px;
            padding: 1px 4px;
            min-width: 16px;
            text-align: center;
            backdrop-filter: blur(6px);
            pointer-events: none;
            font-variant-numeric: tabular-nums;
        }
        .inventory-panel .ip-slot .hotkey {
            position: absolute;
            top: 3px;
            left: 5px;
            font-family: ${HUD.fontMono};
            font-size: 9px;
            font-weight: 600;
            color: ${HUD.textDim};
            letter-spacing: 0.05em;
            pointer-events: none;
        }
        .inventory-panel .ip-slot.hotbar.selected .hotkey {
            color: ${HUD.accent};
        }
        .inventory-panel .ip-slot .empty {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 1px dashed rgba(255, 255, 255, 0.10);
            pointer-events: none;
        }
        .inventory-panel .ip-slot.equipment .empty { display: none; }
        .inventory-panel .ip-inv-side {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .inventory-panel .ip-divider {
            border: 0;
            border-top: 1px dashed rgba(255, 255, 255, 0.08);
            margin: 4px 0 2px;
        }
    `;
    document.head.appendChild(style);
}

export default class InventoryManager {
    /**
     * @param {Phaser.Scene} scene - Your game scene.
     * @param {string} containerId - The DOM element ID for the inventory container.
     * @param {number} numSlots - Number of fixed inventory slots.
     */
    constructor(scene, containerId = 'inventoryContainer', numSlots = 12) {
        this.game = scene;
        this.numSlots = numSlots;
        this.slots = new Array(numSlots).fill(null);
        // Equipment is keyed by slot id (head/chest/legs/feet). Drag &
        // drop sets these; nothing in the game reads from them yet, but
        // the slots persist across opens so the player can lay out gear
        // and have it stay there.
        this.equipment = Object.fromEntries(EQUIPMENT_SLOTS.map(s => [s.id, null]));

        injectStyles();
        this.container = document.createElement('div');
        this.container.id = containerId;
        this.container.className = 'hud-panel inventory-panel';
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0.96)',
            opacity: '0',
            zIndex: '2000',
            transition: 'opacity 180ms ease, transform 180ms ease',
            pointerEvents: 'none',
        });

        this.container.innerHTML = `
            <div class="ip-header">
                <div class="ip-title">
                    <span class="dot"></span>
                    <span>Inventory</span>
                </div>
                <div class="ip-hint">Press <kbd>I</kbd> to close</div>
            </div>
            <div class="ip-body">
                <div class="ip-character">
                    <div class="ip-section-label">Character</div>
                    <div class="ip-char-frame">
                        <div class="ip-char-portrait">
                            <img src="images/player.png" alt="Character" draggable="false">
                        </div>
                        <div class="ip-equipment" data-slot-group="equipment"></div>
                    </div>
                </div>
                <div class="ip-inv-side">
                    <div>
                        <div class="ip-section-label">Backpack</div>
                        <div class="ip-grid inv" data-slot-group="inventory"></div>
                    </div>
                    <div>
                        <div class="ip-section-label">Hotbar</div>
                        <div class="ip-grid hotbar" data-slot-group="hotbar"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);
        this.invGrid = this.container.querySelector('[data-slot-group="inventory"]');
        this.hotbarGrid = this.container.querySelector('[data-slot-group="hotbar"]');
        this.equipGrid = this.container.querySelector('[data-slot-group="equipment"]');
        // Stop input from leaking through to the canvas underneath.
        const swallow = (e) => e.stopPropagation();
        this.container.addEventListener('mousedown', swallow);
        this.container.addEventListener('mouseup', swallow);
        this.container.addEventListener('wheel', swallow);

        this._visible = false;

        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        this.render();
    }

    handleKeyDown(e) {
        if (e.key.toLowerCase() === 'i') this.toggleVisibility();
        if (e.key === 'Escape' && this._visible) this.toggleVisibility();
    }

    toggleVisibility() {
        this._visible = !this._visible;
        this.container.style.opacity = this._visible ? '1' : '0';
        this.container.style.transform = `translate(-50%, -50%) scale(${this._visible ? 1 : 0.96})`;
        this.container.style.pointerEvents = this._visible ? 'auto' : 'none';
        if (this._visible) this.render();
    }

    addItem(item) {
        const index = this.slots.findIndex(slot => slot === null);
        if (index !== -1) {
            this.slots[index] = item;
            this.render();
        } else {
            console.warn("No empty slot available in inventory");
        }
    }

    // Adds to the existing wood stack if present in either the inventory or
    // the toolbar, otherwise creates a new stack in the inventory.
    addWood(amount = 1) {
        this._addOrStack('wood', amount, () =>
            new InventoryItem('wood', null, 'Wood', 'material', 'images/wood.png', {number: amount})
        );
    }

    // Coal mined from coal-veined soil. Mirrors addWood so the same stack
    // semantics apply (single stack across inventory + toolbar). Used as a
    // crafting ingredient by the lift terminal.
    addCoal(amount = 1) {
        this._addOrStack('coal', amount, () =>
            new InventoryItem('coal', null, 'Coal', 'material', 'images/coal.png', {number: amount})
        );
    }

    _addOrStack(id, amount, factory) {
        const bump = (existing) => {
            const current = existing.metadata?.number || 0;
            existing.updateMetaData({...(existing.metadata || {}), number: current + amount});
        };
        const inSlot = this.slots.find(s => s && s.id === id);
        if (inSlot) {
            bump(inSlot);
            this.render();
            this.game.toolBarManager?.render?.();
            return;
        }
        const tb = this.game.toolBarManager;
        if (tb) {
            const inToolbar = tb.slots.find(s => s && s.id === id);
            if (inToolbar) {
                bump(inToolbar);
                tb.render();
                tb.setSelected(this.game.selectedIndex);
                return;
            }
        }
        this.addItem(factory());
    }

    // Walk inventory + toolbar and total up every stack whose id matches.
    // Items without a metadata.number count as a single unit so non-stacked
    // tools still register as "1 owned".
    getResourceCount(id) {
        let total = 0;
        const tally = (item) => {
            if (!item || item.id !== id) return;
            const n = item.metadata?.number;
            total += (n == null ? 1 : n);
        };
        this.slots.forEach(tally);
        this.game.toolBarManager?.slots?.forEach(tally);
        return total;
    }

    // Drain `amount` units from stacks of `id` across inventory + toolbar.
    // Stacks are emptied left-to-right (inventory first, then toolbar) and
    // a stack hitting 0 is cleared so the slot frees up. Returns true on
    // success — the caller should pre-check with getResourceCount so we
    // never partially consume on a failed craft.
    consumeResource(id, amount) {
        if (amount <= 0) return true;
        let remaining = amount;
        const drainStack = (item, onEmpty) => {
            if (!item || item.id !== id || remaining <= 0) return;
            const have = item.metadata?.number != null ? item.metadata.number : 1;
            const take = Math.min(have, remaining);
            const left = have - take;
            remaining -= take;
            if (left <= 0) onEmpty();
            else item.updateMetaData({...(item.metadata || {}), number: left});
        };

        for (let i = 0; i < this.slots.length && remaining > 0; i++) {
            drainStack(this.slots[i], () => { this.slots[i] = null; });
        }
        const tb = this.game.toolBarManager;
        if (tb) {
            for (let i = 0; i < tb.slots.length && remaining > 0; i++) {
                drainStack(tb.slots[i], () => tb.removeItemBySlot(i));
            }
        }

        this.render();
        tb?.render();
        if (tb && this.game.selectedIndex != null) tb.setSelected(this.game.selectedIndex);
        return remaining === 0;
    }

    // Bump an existing tool stack's metadata.number by `amount`. Returns
    // true if a matching item was found (and incremented), false otherwise.
    // Crafting recipes that target tools the player isn't carrying skip
    // production silently — see liftTerminal.craft().
    addToToolStack(id, amount) {
        const bump = (item) => {
            const current = item.metadata?.number || 0;
            item.updateMetaData({...(item.metadata || {}), number: current + amount});
        };
        const inSlot = this.slots.find(s => s && s.id === id);
        if (inSlot) {
            bump(inSlot);
            this.render();
            return true;
        }
        const tb = this.game.toolBarManager;
        const inToolbar = tb?.slots.find(s => s && s.id === id);
        if (inToolbar) {
            bump(inToolbar);
            tb.render();
            tb.setSelected(this.game.selectedIndex);
            return true;
        }
        return false;
    }

    addItemToSlot(index, item) {
        if (index < 0 || index >= this.numSlots) return;
        this.slots[index] = item;
        this.render();
    }

    removeItemFromSlot(index) {
        if (index < 0 || index >= this.numSlots) return;
        this.slots[index] = null;
        this.render();
    }

    swapItems(sourceIndex, targetIndex) {
        const temp = this.slots[sourceIndex];
        this.slots[sourceIndex] = this.slots[targetIndex];
        this.slots[targetIndex] = temp;
        this.render();
    }

    render() {
        this._renderInventoryGrid();
        this._renderHotbar();
        this._renderEquipment();
    }

    _renderInventoryGrid() {
        if (!this.invGrid) return;
        this.invGrid.innerHTML = '';
        for (let i = 0; i < this.numSlots; i++) {
            this.invGrid.appendChild(this._buildSlot({
                source: 'inventory',
                index: i,
                item: this.slots[i],
            }));
        }
    }

    _renderHotbar() {
        if (!this.hotbarGrid) return;
        this.hotbarGrid.innerHTML = '';
        const tb = this.game.toolBarManager;
        if (!tb) return;
        for (let i = 0; i < tb.numSlots; i++) {
            const slotEl = this._buildSlot({
                source: 'toolbar',
                index: i,
                item: tb.slots[i],
                hotkey: i + 1,
                selected: this.game.selectedIndex === i,
            });
            slotEl.classList.add('hotbar');
            if (this.game.selectedIndex === i) slotEl.classList.add('selected');
            slotEl.addEventListener('click', (e) => {
                if (e.target.tagName === 'IMG') return; // let drag start
                tb.setSelected(i);
                this._renderHotbar();
            });
            this.hotbarGrid.appendChild(slotEl);
        }
    }

    _renderEquipment() {
        if (!this.equipGrid) return;
        this.equipGrid.innerHTML = '';
        EQUIPMENT_SLOTS.forEach(spec => {
            const slotEl = this._buildSlot({
                source: 'equipment',
                index: spec.id,
                item: this.equipment[spec.id],
                placeholder: spec.label,
            });
            slotEl.classList.add('equipment');
            this.equipGrid.appendChild(slotEl);
        });
    }

    /**
     * Move/swap an item between any of the four containers (inventory,
     * toolbar, equipment, or another inventory slot). The drop handler on
     * each slot dispatches here so the matrix of source x target is in
     * one place. Returns silently if either side is out of range.
     */
    _move(source, sourceIndex, target, targetIndex) {
        if (source === target && sourceIndex === targetIndex) return;
        const src = this._readSlot(source, sourceIndex);
        if (!src) return;
        const dst = this._readSlot(target, targetIndex);
        this._writeSlot(target, targetIndex, src);
        this._writeSlot(source, sourceIndex, dst);
        this.render();
        const tb = this.game.toolBarManager;
        if (tb) {
            tb.render();
            if (this.game.selectedIndex != null) tb.setSelected(this.game.selectedIndex);
        }
    }

    _readSlot(group, index) {
        if (group === 'inventory') return this.slots[index] || null;
        if (group === 'toolbar') return this.game.toolBarManager?.slots?.[index] || null;
        if (group === 'equipment') return this.equipment[index] || null;
        return null;
    }

    _writeSlot(group, index, item) {
        if (group === 'inventory') {
            this.slots[index] = item;
        } else if (group === 'toolbar') {
            const tb = this.game.toolBarManager;
            if (!tb) return;
            tb.slots[index] = item;
        } else if (group === 'equipment') {
            this.equipment[index] = item;
        }
    }

    _buildSlot({ source, index, item, hotkey, placeholder }) {
        const slotEl = document.createElement('div');
        slotEl.classList.add('ip-slot');
        slotEl.dataset.source = source;
        slotEl.dataset.index = String(index);

        slotEl.addEventListener('dragover', e => e.preventDefault());
        slotEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const src = e.dataTransfer.getData('source');
            const rawIdx = e.dataTransfer.getData('sourceIndex');
            // Source index is a string slot id for equipment, a number for
            // inventory / toolbar. Coerce based on the source group so the
            // _move() lookups land in the right container.
            const coerce = (group, raw) => group === 'equipment' ? raw : parseInt(raw, 10);
            const tgtIndex = source === 'equipment' ? index : parseInt(slotEl.dataset.index, 10);
            this._move(src, coerce(src, rawIdx), source, tgtIndex);
        });

        if (item) {
            const img = document.createElement('img');
            img.src = item.imageUrl;
            img.alt = item.name;
            img.title = item.name;
            img.style.transform = `rotate(${item.rotate || 0}deg)`;
            img.draggable = true;
            img.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.setData('source', source);
                e.dataTransfer.setData('sourceIndex', String(index));
            });
            slotEl.appendChild(img);

            if (item.metadata?.number != null) {
                const stack = document.createElement('div');
                stack.className = 'stack';
                stack.textContent = item.metadata.number;
                slotEl.appendChild(stack);
            }
        } else {
            if (placeholder) {
                const ph = document.createElement('div');
                ph.className = 'placeholder';
                ph.textContent = placeholder;
                slotEl.appendChild(ph);
            } else {
                const empty = document.createElement('div');
                empty.className = 'empty';
                slotEl.appendChild(empty);
            }
        }

        if (hotkey != null) {
            const hk = document.createElement('div');
            hk.className = 'hotkey';
            hk.textContent = String(hotkey);
            slotEl.appendChild(hk);
        }

        return slotEl;
    }

}
