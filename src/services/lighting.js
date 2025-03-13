import LightSource from "./lightsource";

export default class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
        this.trackedGroups = [];
        this.initLighting();
    }

    updateLightPosition(light, x, y) {
        if (light) {
            light.x = x;
            light.y = y;
        }
    }

    initLighting() {
        this.cachedCanvases = {};
        this.colorCaches = {};
        this.scene.lightCanvas = document.createElement("canvas");
        this.scene.lightCanvas.id = 'light_canvas';
        this.initViewMask();
        this.scene.lightCanvas.width = this.scene.cameras.main.width;
        this.scene.lightCanvas.height = this.scene.cameras.main.height;
        this.scene.lightCanvas.style.position = "absolute";
        // this.scene.lightCanvas.style.opacity = 0;
        this.scene.lightCanvas.style.top = "0";
        this.scene.lightCanvas.style.left = "0";
        this.scene.lightCanvas.style.pointerEvents = "none";
        document.body.appendChild(this.scene.lightCanvas);

        this.scene.lightCtx = this.scene.lightCanvas.getContext("2d");
        window.addEventListener("resize", () => {
            this.scene.lightCanvas.width = this.scene.cameras.main.width;
            this.scene.lightCanvas.height = this.scene.cameras.main.height;
        });

        this.initColorCaches(window.lightColors, 256, 10);
    }

    initColorCaches(colorsArray, maxRadius = 256, blurAmount = 10) {
        this.colorCaches = {};
        colorsArray.forEach(color => {
            this.colorCaches[color] = this.createCachedLightTexture(color, maxRadius, blurAmount);
        });
    }

    /** Registers a Phaser Group for tracking */
    registerGroup(group) {
        this.trackedGroups.push(group);
    }

    /** Adds a new light source to the system */
    addLight(x, y, radius = 20, intensity = 0.8, color = "255,255,255", raycast = false, neon = false) {
        const light = new LightSource(x, y, radius, intensity, color, raycast, neon, this);
        this.lights.push(light);
        return light;
    }

    /** Removes a specific light */
    destroy(light) {
        const index = this.lights.indexOf(light);
        if (index > -1) {
            this.lights.splice(index, 1);
        }

        if (light.graphics) {
            light.graphics.destroy();
        }
    }

    updateLighting() {
        const ctx = this.scene.lightCtx;
        ctx.clearRect(0, 0, this.scene.lightCanvas.width, this.scene.lightCanvas.height);

        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, this.scene.lightCanvas.width, this.scene.lightCanvas.height);

        this.lights.forEach(light => !light.off && this.castLight(light));

        this.updateViewMask();

        ctx.globalCompositeOperation = "source-over";
    }

    updateViewMask() {
        const ctx = this.viewMaskCtx;
        const canvas = this.viewMaskCanvas;

        // Clear the mask canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill the entire canvas with black
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set composite mode to subtract from the black overlay
        ctx.globalCompositeOperation = "destination-out";

        // Get camera properties and compute the scaled view radius
        const camera = this.scene.cameras.main;
        const zoom = camera.zoom;
        const baseViewRadius = window.renderviewDistance; // Base view distance in world units
        const viewRadius = baseViewRadius * zoom; // Scale radius by the current zoom

        // Define the center of the view mask (e.g., centered on the screen, or player's screen position)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Create a radial gradient with a blurred edge:
        // Inner circle (80% of the view radius) fully subtracts the black, fading to transparent at the outer edge.
        const innerRadius = viewRadius * 0.8;
        const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, viewRadius);
        gradient.addColorStop(0, "rgba(0,0,0,1)"); // Fully subtract at the inner circle
        gradient.addColorStop(1, "rgba(0,0,0,0)"); // No subtraction at the outer circle

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, viewRadius, 0, Math.PI * 2);
        ctx.fill();

        // Reset composite mode
        ctx.globalCompositeOperation = "source-over";
    }

    initViewMask() {
        // Create a new canvas for the view mask
        this.viewMaskCanvas = document.createElement("canvas");
        this.viewMaskCanvas.id = "view_mask_canvas";
        this.viewMaskCanvas.width = this.scene.cameras.main.width;
        this.viewMaskCanvas.height = this.scene.cameras.main.height;
        this.viewMaskCanvas.style.position = "absolute";
        this.viewMaskCanvas.style.top = "0";
        this.viewMaskCanvas.style.left = "0";
        // Ensure the mask canvas is on top
        this.viewMaskCanvas.style.zIndex = "1000";
        this.viewMaskCanvas.style.pointerEvents = "none";
        document.body.appendChild(this.viewMaskCanvas);

        this.viewMaskCtx = this.viewMaskCanvas.getContext("2d");

        // Update size on resize
        window.addEventListener("resize", () => {
            this.viewMaskCanvas.width = this.scene.cameras.main.width;
            this.viewMaskCanvas.height = this.scene.cameras.main.height;
        });
    }

    createCachedLightTexture(color = '255,255,255', maxRadius = 500, blurAmount = 10) {
        const cachedCanvas = document.createElement('canvas');
        cachedCanvas.width = maxRadius * 2;
        cachedCanvas.height = maxRadius * 2;

        const ctx = cachedCanvas.getContext('2d');

        const gradient = ctx.createRadialGradient(maxRadius, maxRadius, 30, maxRadius, maxRadius, maxRadius);
        gradient.addColorStop(0, `rgba(${color},1)`);
        gradient.addColorStop(0.1, `rgba(${color},0)`);

        const _gradient = ctx.createRadialGradient(maxRadius, maxRadius, 30, maxRadius, maxRadius, maxRadius);
        _gradient.addColorStop(0.2, `rgba(${color},0.3)`);
        _gradient.addColorStop(1, `rgba(${color},0)`);

        ctx.clearRect(0, 0, maxRadius * 2, maxRadius * 2);
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(maxRadius, maxRadius, maxRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = _gradient;
        ctx.beginPath();
        ctx.arc(maxRadius, maxRadius, maxRadius, 0, Math.PI * 2);
        ctx.fill();

        // Store the cached canvas by color
        if (!this.colorCanvases) this.colorCanvasCache = {};
        this.colorCanvases = this.colorCanvases || {};
        this.cachedCanvases[color] = cachedCanvas;
        return this.cachedCanvases[color];
    }

    castLight(light) {
        const camera = this.scene.cameras.main;
        const scale = camera.zoom;
        const radius = light.radius * scale;

        const screenX = (light.x - camera.worldView.x) * scale;
        const screenY = (light.y - camera.worldView.y) * scale;

        const ctx = this.scene.lightCtx;

        const cachedCanvas = this.cachedCanvases[light.color] || this.cachedCanvases['255,255,255'];

        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = light.intensity;

        ctx.drawImage(
            cachedCanvas,
            0, 0, cachedCanvas.width, cachedCanvas.height,
            screenX - radius, screenY - radius, radius * 2, radius * 2
        );

        ctx.globalCompositeOperation = "normal";
        ctx.globalAlpha = light.neon ? 0.6 : 0.1;

        ctx.drawImage(
            cachedCanvas,
            0, 0, cachedCanvas.width, cachedCanvas.height,
            screenX - radius, screenY - radius, radius * 2, radius * 2
        );

        ctx.globalAlpha = 1;
    }


    getRays(worldX, worldY, radius) {
        const rays = [];
        const angleStep = (Math.PI * 2) / 30; // Resolution of light rays

        for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
            let endX = worldX + Math.cos(angle) * radius;
            let endY = worldY + Math.sin(angle) * radius;
            const collision = this.castRay(worldX, worldY, endX, endY);
            let finalPoint = collision || {x: endX, y: endY};
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
