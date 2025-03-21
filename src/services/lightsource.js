export default class LightSource {
    constructor(x, y, radius = 200, intensity = 0.8, color = "255,255,255", raycast = false, neon = false, lightManager) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.originalRadius = parseInt(radius.toString());
        this.intensity = intensity;
        this.color = color;
        this.raycast = raycast;
        this.neon = neon;
        this.lightManager = lightManager;
        this.off = false;
        this.active = true;
    }

    /** Updates the position of the light (for dynamic lights) */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    fadeIn() {
        console.log('fadeIn: ', this.originalRadius);
        this.radius = 0; // Clamp the radius to 0
        const fadeDuration = 200; // Total fade duration in ms
        const stepTime = 10;        // Time between steps in ms
        const steps = fadeDuration / stepTime;
        const decrement = this.originalRadius / steps; // Amount to reduce per step

        // Create a timed event that repeats every stepTime milliseconds
        this.fadeTimer = this.lightManager.game.time.addEvent({
            delay: stepTime,
            callback: () => {
                this.radius += decrement;
                if (this.radius >= this.originalRadius) {
                    this.radius = this.originalRadius; // Clamp the radius to 0
                    this.fadeTimer.remove(); // Stop the timer when finished
                }
            },
            loop: true
        });
    }

    fadeOut() {
        const fadeDuration = 200; // Total fade duration in ms
        const stepTime = 10;        // Time between steps in ms
        const steps = fadeDuration / stepTime;
        const decrement = this.radius / steps; // Amount to reduce per step

        // Create a timed event that repeats every stepTime milliseconds
        this.fadeTimer = this.lightManager.game.time.addEvent({
            delay: stepTime,
            callback: () => {
                this.radius -= decrement;
                if (this.radius <= 0) {
                    this.radius = 0; // Clamp the radius to 0
                    this.fadeTimer.remove(); // Stop the timer when finished
                }
            },
            loop: true
        });
    }

    turnOff() {

    }

    destroy() {
        if (!this.active) return;  // Guard against double-destroy
        this.active = false;
        this.lightManager.destroy(this);
    }
}