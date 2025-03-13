export default class InventoryItem {
    constructor(id, name, type, imageUrl, metadata) {
        this.id = id;
        this.name = name;
        this.type = type; // e.g., 'tool' or 'material'
        this.imageUrl = imageUrl;
        this.metadata = metadata;
    }
    updateMetaData(data) {
        this.metadata = data;
    }
}