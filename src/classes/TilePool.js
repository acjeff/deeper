export default class TilePool {
    constructor(createFn) {
        this.createFn = createFn;
        this.pool = [];
    }

    acquire(...args) {
        return this.pool.length > 0 ? this.pool.pop() : this.createFn(...args);
    }

    release(obj) {
        // Optionally reset the object before pooling it
        this.pool.push(obj);
    }
}
