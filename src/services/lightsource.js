export default class LightSource {
    constructor(x, y, radius = 200, intensity = 0.8, color = "255,255,255", raycast = false) {
        this.x = x; // World X position
        this.y = y; // World Y position
        this.radius = radius; // Light spread
        this.intensity = intensity; // Brightness (0-1)
        this.color = color; // RGB color
        this.raycast = raycast;
        this.off = false;
    }

    /** Updates the position of the light (for dynamic lights) */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}
