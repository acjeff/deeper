import { HUD } from './uiManager.js';
import InventoryItem from '../classes/InventoryItem.js';

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

        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            this.container.className = 'hud-panel';
            Object.assign(this.container.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(0.96)',
                opacity: '0',
                padding: '0',
                zIndex: '2000',
                fontFamily: HUD.font,
                minWidth: '420px',
                transition: 'opacity 180ms ease, transform 180ms ease',
                pointerEvents: 'none',
            });

            // Header
            const header = document.createElement('div');
            Object.assign(header.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            });

            const titleWrap = document.createElement('div');
            Object.assign(titleWrap.style, { display: 'flex', alignItems: 'center', gap: '10px' });
            const dot = document.createElement('span');
            Object.assign(dot.style, {
                width: '6px', height: '6px', borderRadius: '50%',
                background: HUD.accent,
                boxShadow: `0 0 10px ${HUD.accent}`,
            });
            const title = document.createElement('span');
            title.textContent = 'Inventory';
            Object.assign(title.style, {
                fontFamily: HUD.font,
                fontSize: '13px',
                fontWeight: '600',
                color: HUD.text,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
            });
            titleWrap.appendChild(dot);
            titleWrap.appendChild(title);

            const hint = document.createElement('span');
            hint.innerHTML = `Press <kbd style="font-family:${HUD.fontMono};font-size:10px;font-weight:600;color:${HUD.text};background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:4px;padding:2px 6px;margin:0 2px;">I</kbd> to close`;
            Object.assign(hint.style, {
                fontFamily: HUD.font,
                fontSize: '11px',
                color: HUD.textMuted,
            });

            header.appendChild(titleWrap);
            header.appendChild(hint);
            this.container.appendChild(header);

            // Grid
            this.grid = document.createElement('div');
            Object.assign(this.grid.style, {
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 64px)',
                gap: '8px',
                padding: '18px',
            });
            this.container.appendChild(this.grid);

            document.body.appendChild(this.container);
        } else {
            this.grid = this.container;
        }
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
        const bump = (existing) => {
            const current = existing.metadata?.number || 0;
            existing.updateMetaData({...(existing.metadata || {}), number: current + amount});
        };
        const inSlot = this.slots.find(s => s && s.id === 'wood');
        if (inSlot) {
            bump(inSlot);
            this.render();
            this.game.toolBarManager?.render?.();
            return;
        }
        const tb = this.game.toolBarManager;
        if (tb) {
            const inToolbar = tb.slots.find(s => s && s.id === 'wood');
            if (inToolbar) {
                bump(inToolbar);
                tb.render();
                tb.setSelected(this.game.selectedIndex);
                return;
            }
        }
        const wood = new InventoryItem('wood', null, 'Wood', 'material', 'images/wood.png', {number: amount});
        this.addItem(wood);
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
        this.grid.innerHTML = '';
        for (let i = 0; i < this.numSlots; i++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('inventory-slot');
            slotEl.dataset.index = i;
            Object.assign(slotEl.style, {
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                boxSizing: 'border-box',
                position: 'relative',
                padding: '8px',
                cursor: 'pointer',
                transition: 'transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            });

            slotEl.addEventListener('mouseenter', () => {
                slotEl.style.transform = 'translateY(-1px)';
                slotEl.style.borderColor = `rgba(91, 157, 255, 0.55)`;
                slotEl.style.background = 'linear-gradient(135deg, rgba(91, 157, 255, 0.12) 0%, rgba(91, 157, 255, 0.04) 100%)';
                slotEl.style.boxShadow = `0 0 0 2px rgba(91, 157, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)`;
            });
            slotEl.addEventListener('mouseleave', () => {
                slotEl.style.transform = 'translateY(0)';
                slotEl.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                slotEl.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)';
                slotEl.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.04)';
            });

            slotEl.addEventListener('dragover', e => e.preventDefault());
            slotEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedItemId = e.dataTransfer.getData('text/plain');
                const source = e.dataTransfer.getData('source');
                const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
                const targetIndex = parseInt(slotEl.dataset.index, 10);

                if (source === 'inventory') {
                    if (sourceIndex === targetIndex) return;
                    this.swapItems(sourceIndex, targetIndex);
                } else if (source === 'toolbar') {
                    const toolbarManager = this.game.toolBarManager;
                    const draggedItem = toolbarManager.getItemById(draggedItemId);
                    if (!draggedItem) return;
                    const targetItem = this.slots[targetIndex];
                    this.slots[targetIndex] = draggedItem;
                    toolbarManager.removeItemBySlot(sourceIndex);
                    if (targetItem) {
                        toolbarManager.addItemToSlot(sourceIndex, targetItem);
                    }
                    this.render();
                    toolbarManager.render();
                }
            });

            const item = this.slots[i];
            if (item) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.title = item.name;
                Object.assign(img.style, {
                    width: '78%',
                    height: '78%',
                    objectFit: 'contain',
                    transform: `rotate(${item.rotate}deg)`,
                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
                    pointerEvents: 'auto',
                });
                img.draggable = true;
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('source', 'inventory');
                    e.dataTransfer.setData('sourceIndex', i.toString());
                });
                slotEl.appendChild(img);

                if (item.metadata?.number != null) {
                    const number = document.createElement('div');
                    Object.assign(number.style, {
                        color: '#fff',
                        position: 'absolute',
                        bottom: '4px',
                        right: '5px',
                        fontWeight: '700',
                        fontSize: '11px',
                        fontFamily: HUD.fontMono,
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '1px 5px',
                        minWidth: '18px',
                        textAlign: 'center',
                        backdropFilter: 'blur(6px)',
                        pointerEvents: 'none',
                        fontVariantNumeric: 'tabular-nums',
                    });
                    number.innerHTML = item.metadata.number;
                    slotEl.appendChild(number);
                }
            } else {
                const empty = document.createElement('div');
                Object.assign(empty.style, {
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: '1px dashed rgba(255, 255, 255, 0.10)',
                    pointerEvents: 'none',
                });
                slotEl.appendChild(empty);
            }
            this.grid.appendChild(slotEl);
        }
    }
}
