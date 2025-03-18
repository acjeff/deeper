// MouseManager.js
import {GlowStick} from "../classes/glowstick"; // adjust the path as needed

export default class MouseManager {
    /**
     * @param {Phaser.Scene} scene - The current game scene.
     */
    constructor(scene) {
        this.game = scene;
        this.init();
    }

    init() {
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
    }

    handleMouseMove(event) {
        // Update the scene's mouse position.
    }

    handleMouseDown(event) {
        // Check if the selected tool is a throwable glowstick.

    }
}
