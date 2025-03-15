export default class InventoryItem {
    constructor(id, name, type, imageUrl, metadata, prefs) {
        this.id = id;
        this.name = name;
        this.type = type; // e.g., 'tool' or 'material'
        this.imageUrl = imageUrl;
        this.metadata = metadata;
        this.rotate = prefs?.rotate;
    }
    updateMetaData(data) {
        this.metadata = data;
    }
}