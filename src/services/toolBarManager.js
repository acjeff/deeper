export default class ToolbarManager {
    /**
     * @param {Phaser.Scene} scene - Your game scene.
     * @param {string} containerId - The DOM element ID for the toolbar container.
     * @param {number} numSlots - Number of toolbar slots (default 9).
     */
    constructor(scene, containerId = 'toolbarContainer', numSlots = 7) {
        this.game = scene;
        this.numSlots = numSlots;

        this.game.selectedIndex = 0; // Default selected slot index.
        // Create an array for toolbar slots; each slot holds an item or null.
        this.slots = new Array(numSlots).fill(null);
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            Object.assign(this.container.style, {
                position: 'absolute',
                left: '50%',
                bottom: '30px',
                transform: 'translateX(-50%)',
                display: 'flex',
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
                padding: '12px 16px',
                borderRadius: '8px',
                zIndex: '1000',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(15px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            });
            document.body.appendChild(this.container);
        }
        // Listen for number keys (1 to numSlots) to update selection.
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= String(this.numSlots)) {
                const index = parseInt(e.key, 10) - 1;
                this.setSelected(index);
            }
        });

        // Set initial selection.
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        for (let i = 0; i < this.numSlots; i++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('toolbar-slot');
            slotEl.dataset.index = i;
            Object.assign(slotEl.style, {
                width: '52px',
                height: '52px',
                background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(50, 50, 50, 0.9) 100%)',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                margin: '0 6px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
            });

            // Apply a highlight if this is the selected slot.
            if (i === this.game.selectedIndex) {
                slotEl.style.borderColor = '#4a9eff';
                slotEl.style.boxShadow = '0 0 0 2px rgba(74, 158, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                slotEl.style.transform = 'translateY(-2px)';
                slotEl.style.background = 'linear-gradient(135deg, rgba(40, 40, 40, 0.95) 0%, rgba(60, 60, 60, 0.95) 100%)';
            }

            // Add hover effects
            slotEl.addEventListener('mouseenter', () => {
                if (i !== this.game.selectedIndex) {
                    slotEl.style.transform = 'translateY(-1px)';
                    slotEl.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    slotEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                }
            });

            slotEl.addEventListener('mouseleave', () => {
                if (i !== this.game.selectedIndex) {
                    slotEl.style.transform = 'translateY(0)';
                    slotEl.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    slotEl.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                }
            });

            // Allow drops into the toolbar slot.
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
                    // Dragging from inventory to toolbar.
                    const inventoryManager = this.game.inventoryManager;
                    const draggedItem = inventoryManager.slots[sourceIndex];
                    if (!draggedItem) return;
                    const targetItem = this.slots[targetIndex];
                    // Place dragged item into the toolbar.
                    this.slots[targetIndex] = draggedItem;
                    // Remove item from inventory.
                    inventoryManager.removeItemFromSlot(sourceIndex);
                    // If target slot was occupied, move that item to the inventory.
                    if (targetItem) {
                        inventoryManager.addItemToSlot(sourceIndex, targetItem);
                    }
                    this.render();
                    inventoryManager.render();
                }
                // Refresh selection visuals.
                this.setSelected(this.game.selectedIndex);
            });

            // Render an item if present.
            const item = this.slots[i];
            if (item) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.title = item.name;
                Object.assign(img.style, {
                    width: '80%',
                    height: '80%',
                    objectFit: 'contain',
                    transform: `rotate(${item.rotate}deg)`,
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
                });
                // When dragging an item from the toolbar, include the source slot index.
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('source', 'toolbar');
                    e.dataTransfer.setData('sourceIndex', i.toString());
                });
                if (item.metadata?.number) {
                    const number = document.createElement('div');
                    Object.assign(number.style, {
                        color: '#ffffff',
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                        borderRadius: '10px',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                        fontFamily: 'Arial, sans-serif',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                    });
                    number.innerHTML = item.metadata.number;
                    slotEl.appendChild(number);
                }
                slotEl.appendChild(img);
            } else {
                // Add empty slot indicator
                const emptyIndicator = document.createElement('div');
                emptyIndicator.innerHTML = '•';
                Object.assign(emptyIndicator.style, {
                    color: 'rgba(255, 255, 255, 0.1)',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    fontFamily: 'Arial, sans-serif'
                });
                slotEl.appendChild(emptyIndicator);
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
            // Optionally, if you want to auto-select the first added item:
            if (this.game.selectedIndex === null || this.game.selectedIndex === undefined) {
                this.setSelected(index);
            }
        }
    }

    setSelected(index) {
        if (index < 0 || index >= this.numSlots) return;
        this.game.selectedIndex = index;
        // Update visuals for each slot.
        const slotEls = this.container.children;
        for (let i = 0; i < slotEls.length; i++) {
            if (i === index) {
                slotEls[i].style.borderColor = '#4a9eff';
                slotEls[i].style.boxShadow = '0 0 0 2px rgba(74, 158, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                slotEls[i].style.transform = 'translateY(-2px)';
                slotEls[i].style.background = 'linear-gradient(135deg, rgba(40, 40, 40, 0.95) 0%, rgba(60, 60, 60, 0.95) 100%)';
            } else {
                slotEls[i].style.borderColor = 'rgba(255, 255, 255, 0.15)';
                slotEls[i].style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                slotEls[i].style.transform = 'translateY(0)';
                slotEls[i].style.background = 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(50, 50, 50, 0.9) 100%)';
            }
        }
        // Set the selected tool on the scene.
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

                this.game.toolSprite.setRotation(Phaser.Math.DegToRad(-45))
                this.game.toolSprite.setDepth(3);
            }
        }
    }

    /**
     * Helper to retrieve an item from the toolbar by its id.
     * @param {string} itemId
     * @returns {Object|null}
     */
    getItemById(itemId) {
        return this.slots.find(item => item && item.id === itemId) || null;
    }
}
