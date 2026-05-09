import { HUD } from './uiManager.js';

export default class ToolbarManager {
    /**
     * @param {Phaser.Scene} scene - Your game scene.
     * @param {string} containerId - The DOM element ID for the toolbar container.
     * @param {number} numSlots - Number of toolbar slots (default 7).
     */
    constructor(scene, containerId = 'toolbarContainer', numSlots = 7) {
        this.game = scene;
        this.numSlots = numSlots;

        this.game.selectedIndex = 0;
        this.slots = new Array(numSlots).fill(null);
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            this.container.className = 'hud-panel';
            Object.assign(this.container.style, {
                position: 'absolute',
                left: '50%',
                bottom: '24px',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                padding: '10px',
                zIndex: '1000',
                fontFamily: HUD.font,
            });
            document.body.appendChild(this.container);
        }
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= String(this.numSlots)) {
                const index = parseInt(e.key, 10) - 1;
                this.setSelected(index);
            }
        });

        this.render();
    }

    styleSlot(slotEl, selected) {
        Object.assign(slotEl.style, {
            width: '54px',
            height: '54px',
            background: selected
                ? 'linear-gradient(135deg, rgba(91, 157, 255, 0.18) 0%, rgba(91, 157, 255, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: selected
                ? `1px solid ${HUD.accent}`
                : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            cursor: 'pointer',
            transition: 'transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease',
            boxShadow: selected
                ? `0 0 0 3px rgba(91, 157, 255, 0.18), 0 8px 20px rgba(91, 157, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)`
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            transform: selected ? 'translateY(-2px)' : 'translateY(0)',
        });
    }

    render() {
        this.container.innerHTML = '';
        for (let i = 0; i < this.numSlots; i++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('toolbar-slot');
            slotEl.dataset.index = i;
            this.styleSlot(slotEl, i === this.game.selectedIndex);

            // Hotkey badge (1-7)
            const hotkey = document.createElement('div');
            hotkey.textContent = String(i + 1);
            Object.assign(hotkey.style, {
                position: 'absolute',
                top: '4px',
                left: '6px',
                fontFamily: HUD.fontMono,
                fontSize: '9px',
                fontWeight: '600',
                color: i === this.game.selectedIndex ? HUD.accent : HUD.textDim,
                letterSpacing: '0.05em',
                pointerEvents: 'none',
                transition: 'color 160ms ease',
            });
            slotEl.appendChild(hotkey);

            slotEl.addEventListener('mouseenter', () => {
                if (i !== this.game.selectedIndex) {
                    slotEl.style.transform = 'translateY(-1px)';
                    slotEl.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                    slotEl.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)';
                }
            });
            slotEl.addEventListener('mouseleave', () => {
                if (i !== this.game.selectedIndex) this.styleSlot(slotEl, false);
            });
            slotEl.addEventListener('click', () => this.setSelected(i));

            slotEl.addEventListener('dragover', (e) => e.preventDefault());
            slotEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedItemId = e.dataTransfer.getData('text/plain');
                const source = e.dataTransfer.getData('source');
                const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
                const targetIndex = parseInt(slotEl.dataset.index, 10);
                if (source === 'toolbar') {
                    if (sourceIndex === targetIndex) return;
                    this.swapItems(sourceIndex, targetIndex);
                } else if (source === 'inventory') {
                    const inventoryManager = this.game.inventoryManager;
                    const draggedItem = inventoryManager.slots[sourceIndex];
                    if (!draggedItem) return;
                    const targetItem = this.slots[targetIndex];
                    this.slots[targetIndex] = draggedItem;
                    inventoryManager.removeItemFromSlot(sourceIndex);
                    if (targetItem) {
                        inventoryManager.addItemToSlot(sourceIndex, targetItem);
                    }
                    this.render();
                    inventoryManager.render();
                }
                this.setSelected(this.game.selectedIndex);
            });

            const item = this.slots[i];
            if (item) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.title = item.name;
                Object.assign(img.style, {
                    width: '72%',
                    height: '72%',
                    objectFit: 'contain',
                    transform: `rotate(${item.rotate}deg)`,
                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
                    pointerEvents: 'none',
                });
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('source', 'toolbar');
                    e.dataTransfer.setData('sourceIndex', i.toString());
                });
                img.draggable = true;
                img.style.pointerEvents = 'auto';

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
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(6px)',
                        pointerEvents: 'none',
                        fontVariantNumeric: 'tabular-nums',
                    });
                    number.innerHTML = item.metadata.number;
                    slotEl.appendChild(number);
                }
                slotEl.appendChild(img);
            } else {
                const empty = document.createElement('div');
                Object.assign(empty.style, {
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    pointerEvents: 'none',
                });
                slotEl.appendChild(empty);
            }
            this.container.appendChild(slotEl);
        }
    }

    swapItems(sourceIndex, targetIndex) {
        const temp = this.slots[sourceIndex];
        this.slots[sourceIndex] = this.slots[targetIndex];
        this.slots[targetIndex] = temp;
        this.render();
        this.setSelected(this.game.selectedIndex);
    }

    removeItemBySlot(index) {
        if (index >= 0 && index < this.numSlots) {
            this.slots[index] = null;
            this.render();
            this.setSelected(this.game.selectedIndex);
        }
    }

    addItemToSlot(index, item) {
        if (index >= 0 && index < this.numSlots) {
            this.slots[index] = item;
            this.render();
            if (this.game.selectedIndex === null || this.game.selectedIndex === undefined) {
                this.setSelected(index);
            }
        }
    }

    setSelected(index) {
        if (index < 0 || index >= this.numSlots) return;
        this.game.selectedIndex = index;
        const slotEls = this.container.children;
        for (let i = 0; i < slotEls.length; i++) {
            this.styleSlot(slotEls[i], i === index);
            const hotkey = slotEls[i].querySelector('div');
            if (hotkey) hotkey.style.color = i === index ? HUD.accent : HUD.textDim;
        }
        if (this.game) {
            this.game.selectedTool = this.slots[index];
            if (this.game.selectedTool) {
                if (this.game.toolSprite) this.game.toolSprite.destroy();
                this.game.toolSprite = this.game.add.image(this.game.player.body.x, this.game.player.body.y + 4.2, this.game.selectedTool.id);
                if (this.game.selectedTool.id === 'lamp') {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.1, this.game.toolSprite.height * 0.1);
                } else if (this.game.selectedTool.id.includes('rail')) {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.05, this.game.toolSprite.height * 0.05);
                } else if (this.game.selectedTool.id.includes('minecart')) {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.08, this.game.toolSprite.height * 0.08);
                } else {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.2, this.game.toolSprite.height * 0.2);
                }

                this.game.toolSprite.setRotation(Phaser.Math.DegToRad(-45));
                this.game.toolSprite.setDepth(3);
            }
        }
    }

    getItemById(itemId) {
        return this.slots.find(item => item && item.id === itemId) || null;
    }
}
