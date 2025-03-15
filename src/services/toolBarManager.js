export default class ToolbarManager {
    /**
     * @param {Phaser.Scene} scene - Your game scene.
     * @param {string} containerId - The DOM element ID for the toolbar container.
     * @param {number} numSlots - Number of toolbar slots (default 9).
     */
    constructor(scene, containerId = 'toolbarContainer', numSlots = 7) {
        this.scene = scene;
        this.numSlots = numSlots;

        this.scene.selectedIndex = 0; // Default selected slot index.
        // Create an array for toolbar slots; each slot holds an item or null.
        this.slots = new Array(numSlots).fill(null);
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            Object.assign(this.container.style, {
                position: 'absolute',
                left: '50%',
                bottom: '20px',
                transform: 'translateX(-50%)',
                display: 'flex',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '10px',
                borderRadius: '10px',
                zIndex: '1000'
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
                width: '50px',
                height: '50px',
                backgroundColor: '#333',
                border: '2px solid #000',
                borderRadius: '5px',
                margin: '0 5px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
            });

            // Apply a highlight if this is the selected slot.
            if (i === this.scene.selectedIndex) {
                slotEl.style.borderColor = '#FFD700';
                slotEl.style.borderWidth = '3px';
            }

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
                    const inventoryManager = this.scene.inventoryManager;
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
                this.setSelected(this.scene.selectedIndex);
            });

            // Render an item if present.
            const item = this.slots[i];
            if (item) {
                console.log(item.rotate, ' : item');
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.title = item.name;
                Object.assign(img.style, {
                    width: '80%',
                    height: '80%',
                    objectFit: 'contain',
                    transform: `rotate(${item.rotate}deg)`
                });
                // When dragging an item from the toolbar, include the source slot index.
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('source', 'toolbar');
                    e.dataTransfer.setData('sourceIndex', i.toString());
                });
                if (item.metadata?.number) {
                    const number = document.createElement('p');
                    Object.assign(number.style, {
                        color: '#ffffff',
                        position: 'absolute',
                        top: '-17px',
                        left: '3px',
                        fontWeight: '500'
                    });
                    number.innerHTML = item.metadata.number;
                    slotEl.appendChild(number);
                }
                slotEl.appendChild(img);
            }
            this.container.appendChild(slotEl);
        }

    }

    swapItems(sourceIndex, targetIndex) {
        const temp = this.slots[sourceIndex];
        this.slots[sourceIndex] = this.slots[targetIndex];
        this.slots[targetIndex] = temp;
        this.render();
        this.setSelected(this.scene.selectedIndex);
    }

    removeItemBySlot(index) {
        if (index >= 0 && index < this.numSlots) {
            this.slots[index] = null;
            this.render();
            this.setSelected(this.scene.selectedIndex);
        }
    }

    addItemToSlot(index, item) {
        if (index >= 0 && index < this.numSlots) {
            this.slots[index] = item;
            this.render();
            // Optionally, if you want to auto-select the first added item:
            if (this.scene.selectedIndex === null || this.scene.selectedIndex === undefined) {
                this.setSelected(index);
            }
        }
    }

    setSelected(index) {
        if (index < 0 || index >= this.numSlots) return;
        this.scene.selectedIndex = index;
        // Update visuals for each slot.
        const slotEls = this.container.children;
        for (let i = 0; i < slotEls.length; i++) {
            if (i === index) {
                slotEls[i].style.borderColor = '#FFD700';
                slotEls[i].style.borderWidth = '3px';
            } else {
                slotEls[i].style.borderColor = '#000';
                slotEls[i].style.borderWidth = '2px';
            }
        }
        // Set the selected tool on the scene.
        if (this.scene) {
            this.scene.selectedTool = this.slots[index];
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
