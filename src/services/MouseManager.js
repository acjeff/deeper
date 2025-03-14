// MouseManager.js
import { GlowStick } from "../classes/glowstick"; // adjust the path as needed

export default class MouseManager {
    /**
     * @param {Phaser.Scene} scene - The current game scene.
     */
    constructor(scene) {
        this.scene = scene;
        this.init();
    }

    init() {
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
    }

    handleMouseMove(event) {
        // Update the scene's mouse position.
        this.scene.mousePos = { x: event.clientX, y: event.clientY };
    }

    handleMouseDown(event) {
        // Check if the selected tool is a throwable glowstick.
        const selectedTool = this.scene.selectedTool;
        console.log(selectedTool);
        if (
            selectedTool &&
            selectedTool.metadata &&
            selectedTool.metadata.throwable &&
            selectedTool.id === '2' &&
            selectedTool.metadata.number
        ) {
            // Create and throw a new glow stick from the player's position.
            const glowStick = GlowStick.throwFromPlayer(this.scene, this.scene.player);
            selectedTool.metadata.number = selectedTool.metadata.number - 1;
            this.scene.glowSticks.push(glowStick);
            this.scene.toolBarManager.render();
        }
    }
}
