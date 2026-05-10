// Bit-packed exploration tracking. Each tile in the world has one bit; set
// once the tile has been within the player's reveal radius. Persisted as a
// base64-encoded byte array on save.

export default class FogOfWar {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.totalBits = width * height;
        this.bytes = new Uint8Array(Math.ceil(this.totalBits / 8));
        this.version = 1;
    }

    has(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
        const idx = ty * this.width + tx;
        return (this.bytes[idx >> 3] & (1 << (idx & 7))) !== 0;
    }

    set(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
        const idx = ty * this.width + tx;
        const byteIdx = idx >> 3;
        const mask = 1 << (idx & 7);
        if ((this.bytes[byteIdx] & mask) === 0) {
            this.bytes[byteIdx] |= mask;
            this.version++;
            return true;
        }
        return false;
    }

    revealCircle(tx, ty, radius) {
        const r2 = radius * radius;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= r2) {
                    this.set(tx + dx, ty + dy);
                }
            }
        }
    }

    serialize() {
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < this.bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, this.bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    deserialize(b64) {
        if (!b64) return;
        try {
            const binary = atob(b64);
            const len = Math.min(binary.length, this.bytes.length);
            for (let i = 0; i < len; i++) {
                this.bytes[i] = binary.charCodeAt(i);
            }
            this.version++;
        } catch (err) {
            console.warn('Failed to load fog of war', err);
        }
    }
}
