import LightSource from "./lightsource";

export default class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = []; // Stores all light sources
        this.trackedGroups = []; // Groups that block light
        this.initLighting();
    }

    initLighting() {
        // Create a new canvas for the lighting system
        this.scene.lightCanvas = document.createElement("canvas");
        this.scene.lightCanvas.width = this.scene.cameras.main.width; // Match game world size
        this.scene.lightCanvas.height = this.scene.cameras.main.height;
        this.scene.lightCanvas.style.position = "absolute";
        this.scene.lightCanvas.style.top = "0";
        this.scene.lightCanvas.style.left = "0";
        this.scene.lightCanvas.style.pointerEvents = "none"; // Ensure it doesn't block input
        document.body.appendChild(this.scene.lightCanvas);

        // Get the canvas context
        this.scene.lightCtx = this.scene.lightCanvas.getContext("2d");
    }

    /** Registers a Phaser Group for tracking */
    registerGroup(group) {
        this.trackedGroups.push(group);
    }

    /** Adds a new light source to the system */
    addLight(x, y, radius = 200, intensity = 0.8, color = "255,255,255", raycast = false) {
        const light = new LightSource(x, y, radius, intensity, color, raycast);
        this.lights.push(light);
        return light; // Return reference for updates
    }

    /** Removes a specific light */
    removeLight(light) {
        this.lights = this.lights.filter(l => l !== light);
    }

    /** Updates and applies lighting */
    updateLighting() {
        const ctx = this.scene.lightCtx;
        ctx.clearRect(0, 0, this.scene.lightCanvas.width, this.scene.lightCanvas.height);

        // Draw global darkness
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, this.scene.lightCanvas.width, this.scene.lightCanvas.height);

        // Apply each light source
        this.lights.forEach(light => !light.off && this.castLight(light));

        ctx.globalCompositeOperation = "source-over"; // Reset blending
    }

    /** Casts rays and applies light from a given light source */
    castLight(light) {
        const camera = this.scene.cameras.main;
        const scale = camera.zoom;

        const screenX = (light.x - camera.worldView.x) * scale;
        const screenY = (light.y - camera.worldView.y) * scale;

        // Soft glow gradient
        const gradient = this.scene.lightCtx.createRadialGradient(
            screenX, screenY, 10,
            screenX, screenY, light.radius
        );
        gradient.addColorStop(0, `rgba(${light.color}, ${light.intensity})`);
        gradient.addColorStop(1, `rgba(${light.color},0)`);

        this.scene.lightCtx.globalCompositeOperation = "destination-out";
        this.scene.lightCtx.fillStyle = gradient;
        this.scene.lightCtx.beginPath();
        this.scene.lightCtx.arc(screenX, screenY, light.radius, 0, Math.PI * 2);
        this.scene.lightCtx.fill();


        // Raycast lighting for obstacles
        if (light.raycast) {
            const rays = this.getRays(light.x, light.y, light.radius);
            this.scene.lightCtx.filter = "blur(10px)";
            this.scene.lightCtx.globalCompositeOperation = "destination-out";
            this.scene.lightCtx.beginPath();
            if (rays.length > 1) {
                this.scene.lightCtx.moveTo(
                    (rays[0].x - camera.worldView.x) * scale,
                    (rays[0].y - camera.worldView.y) * scale
                );
            }
            rays.forEach((point) => {
                this.scene.lightCtx.lineTo(
                    (point.x - camera.worldView.x) * scale,
                    (point.y - camera.worldView.y) * scale
                );
            });
            this.scene.lightCtx.closePath();
            this.scene.lightCtx.fill();
            this.scene.lightCtx.filter = "blur(0)";
        }

        const _gradient = this.scene.lightCtx.createRadialGradient(
            screenX, screenY, 10,
            screenX, screenY, light.radius
        );
        _gradient.addColorStop(0, `rgba(${light.color}, 0.1)`);
        _gradient.addColorStop(1, `rgba(${light.color},0)`);
        this.scene.lightCtx.globalCompositeOperation = "source-over";
        this.scene.lightCtx.fillStyle = _gradient;
        this.scene.lightCtx.beginPath();
        this.scene.lightCtx.arc(screenX, screenY, light.radius, 0, Math.PI * 2);
        this.scene.lightCtx.fill();
    }

    /** Generates rays for a light */
    getRays(worldX, worldY, radius) {
        const rays = [];
        const angleStep = (Math.PI * 2) / 30; // Resolution of light rays

        for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
            let endX = worldX + Math.cos(angle) * radius;
            let endY = worldY + Math.sin(angle) * radius;
            const collision = this.castRay(worldX, worldY, endX, endY);
            let finalPoint = collision || { x: endX, y: endY };
            rays.push(finalPoint);
        }
        return rays;
    }

    /** Casts a ray and checks for obstacles */
    castRay(startX, startY, endX, endY) {
        const line = new Phaser.Geom.Line(startX, startY, endX, endY);
        let closest = null;
        let minDist = Number.MAX_VALUE;

        this.trackedGroups.forEach((group) => {
            group.children.iterate((element) => {
                if (element.active) {
                    const rect = new Phaser.Geom.Rectangle(element.x, element.y, this.scene.tileSize, this.scene.tileSize);
                    const intersection = Phaser.Geom.Intersects.GetLineToRectangle(line, rect);
                    if (intersection.length > 0) {
                        const dist = Phaser.Math.Distance.Between(startX, startY, intersection[0].x, intersection[0].y);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = intersection[0];
                        }
                    }
                }
            });
        });

        return closest;
    }
}
