export default class InventoryManager {
    /**
     * @param {Phaser.Scene} scene - Your game scene.
     * @param {string} containerId - The DOM element ID for the inventory container.
     * @param {number} numSlots - Number of fixed inventory slots (default 27 for a 9×3 grid).
     */
    constructor(scene, containerId = 'inventoryContainer', numSlots = 12) {
        this.scene = scene;
        this.numSlots = numSlots;
        // Create a fixed array of slots; each slot holds either an item object or null.
        this.slots = new Array(numSlots).fill(null);

        // Create or select the inventory container.
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            Object.assign(this.container.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 60px)',
                gap: '5px',
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '3px solid #5c4033',
                borderRadius: '10px',
                zIndex: '2000'
            });
            document.body.appendChild(this.container);
        }
        // Hide the inventory by default.
        this.container.style.display = 'none';

        // Bind key event listener to toggle inventory on pressing "I".
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Render the fixed grid of slots.
        this.render();
    }

    handleKeyDown(e) {
        if (e.key.toLowerCase() === 'i') {
            this.toggleVisibility();
        }
    }

    toggleVisibility() {
        this.container.style.display =
            this.container.style.display === 'none' ? 'grid' : 'none';
    }

    /**
     * Add an item to the first empty slot.
     * @param {Object} item - The item to add.
     */
    addItem(item) {
        const index = this.slots.findIndex(slot => slot === null);
        if (index !== -1) {
            this.slots[index] = item;
            this.render();
        } else {
            console.warn("No empty slot available in inventory");
        }
    }

    /**
     * Directly add an item into a specific inventory slot.
     * @param {number} index - The target slot index.
     * @param {Object} item - The item to add.
     */
    addItemToSlot(index, item) {
        if (index < 0 || index >= this.numSlots) return;
        this.slots[index] = item;
        this.render();
    }

    /**
     * Remove an item from a specific slot.
     * @param {number} index - The slot index.
     */
    removeItemFromSlot(index) {
        if (index < 0 || index >= this.numSlots) return;
        this.slots[index] = null;
        this.render();
    }

    /**
     * Swap items between two inventory slots.
     * @param {number} sourceIndex - Index of the dragged item.
     * @param {number} targetIndex - Index of the drop target.
     */
    swapItems(sourceIndex, targetIndex) {
        const temp = this.slots[sourceIndex];
        this.slots[sourceIndex] = this.slots[targetIndex];
        this.slots[targetIndex] = temp;
        this.render();
    }

    render() {
        // Clear the inventory container.
        this.container.innerHTML = '';
        // Create fixed slots.
        for (let i = 0; i < this.numSlots; i++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('inventory-slot');
            slotEl.dataset.index = i;
            Object.assign(slotEl.style, {
                width: '60px',
                height: '60px',
                backgroundColor: '#c0a080',
                border: '2px solid #5c4033',
                borderRadius: '4px',
                boxSizing: 'border-box',
                position: 'relative',
                padding: '5px'
            });

            // Allow this slot to accept drops.
            slotEl.addEventListener('dragover', e => e.preventDefault());
            slotEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedItemId = e.dataTransfer.getData('text/plain');
                const source = e.dataTransfer.getData('source');
                const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
                const targetIndex = parseInt(slotEl.dataset.index, 10);

                // If the item is dragged from the inventory...
                if (source === 'inventory') {
                    // No action if dropped in the same slot.
                    if (sourceIndex === targetIndex) return;
                    // Swap items within the inventory.
                    this.swapItems(sourceIndex, targetIndex);
                } else if (source === 'toolbar') {
                    // Dragged from the toolbar.
                    // Get a reference to the toolbar manager (assumed to be on the scene).
                    const toolbarManager = this.scene.toolBarManager;
                    // Get the dragged item from the toolbar.
                    const draggedItem = toolbarManager.getItemById(draggedItemId);
                    if (!draggedItem) return;
                    const targetItem = this.slots[targetIndex];
                    // Place the dragged item into the target inventory slot.
                    this.slots[targetIndex] = draggedItem;
                    // Remove the item from the toolbar (using its source slot).
                    toolbarManager.removeItemBySlot(sourceIndex);
                    // If the target slot was already occupied, move that item to the toolbar slot.
                    if (targetItem) {
                        toolbarManager.addItemToSlot(sourceIndex, targetItem);
                    }
                    this.render();
                    toolbarManager.render();
                }
            });

            // Render the item image if this slot has an item.
            const item = this.slots[i];
            if (item) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.title = item.name;
                Object.assign(img.style, {
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                });
                // Set up the drag event for items in the inventory.
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('source', 'inventory');
                    e.dataTransfer.setData('sourceIndex', i.toString());
                });
                slotEl.appendChild(img);
            }
            this.container.appendChild(slotEl);
        }
    }
}
