class ItemRegistry {
    constructor() {
        this.items = {};
    }

    register(item) {
        this.items[item.id] = item;
    }

    getItem(itemId) {
        return this.items[itemId];
    }
}

export const itemRegistry = new ItemRegistry();
