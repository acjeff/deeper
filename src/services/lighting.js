import LightSource from "./lightsource";

export default class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
        this.trackedGroups = [];
        this.initLighting();
    }

    initLighting() {
        this.cachedCanvases = {};
        this.colorCaches = {};
        this.scene.lightCanvas = document.createElement("canvas");
        this.scene.lightCanvas.id = 'light_canvas';
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

        ctx.globalCompositeOperation = "source-over";
    }

    createCachedLightTexture(color = '255,255,255', maxRadius = 500, blurAmount = 10) {
        const cachedCanvas = document.createElement('canvas');
        cachedCanvas.width = maxRadius * 2;
        cachedCanvas.height = maxRadius * 2;

        const ctx = cachedCanvas.getContext('2d');

        const gradient = ctx.createRadialGradient(maxRadius, maxRadius, 0, maxRadius, maxRadius, maxRadius);
        gradient.addColorStop(0, `rgba(${color},1)`);
        gradient.addColorStop(0.7, `rgba(${color},1)`);
        gradient.addColorStop(1, `rgba(${color},0)`);

        ctx.clearRect(0, 0, maxRadius * 2, maxRadius * 2);
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.fillStyle = gradient;
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

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = light.neon ? 0.3 : 0.1;

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
