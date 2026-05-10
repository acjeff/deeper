import LightSource from "./lightsource";

// 24-hour sky palette indexed by timeFraction (0..1). timeFraction 0
// is noon in the existing day-cycle formula (cos peaks at 0), so the
// stops climb away from blue through warm orange into navy and back.
// Smoothstep between adjacent stops is applied at lookup time.
const SKY_PALETTE = [
    { t: 0.00, c: [104, 178, 226] }, // noon — sky blue
    { t: 0.18, c: [148, 184, 214] }, // late afternoon — softer blue
    { t: 0.22, c: [232, 152, 96]  }, // dusk — warm orange
    { t: 0.28, c: [120, 78, 70]   }, // post-dusk — dim warm dusk
    { t: 0.40, c: [18, 28, 56]    }, // night — dark navy blue
    { t: 0.60, c: [18, 28, 56]    }, // night — dark navy blue
    { t: 0.72, c: [120, 78, 70]   }, // pre-dawn — dim warm
    { t: 0.78, c: [236, 162, 116] }, // dawn — warm pink-orange
    { t: 0.82, c: [148, 184, 214] }, // morning — soft blue
    { t: 1.00, c: [104, 178, 226] }, // noon — sky blue
];

function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { return t * t * (3 - 2 * t); }

function paletteColor(t) {
    const stops = SKY_PALETTE;
    for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (t < a.t || t > b.t) continue;
        const localT = (t - a.t) / (b.t - a.t || 1);
        const s = smoothstep(localT);
        return [
            Math.round(lerp(a.c[0], b.c[0], s)),
            Math.round(lerp(a.c[1], b.c[1], s)),
            Math.round(lerp(a.c[2], b.c[2], s)),
        ];
    }
    return stops[stops.length - 1].c.slice();
}

// "Visibility" curve used for the dark-overlay cutout. Stays at 1 through
// most of the cycle and falls to 0 only inside the deep-night window, so
// the vivid dusk/dawn colours read clearly instead of being half-buried
// under the dark overlay.
function skyVisibility(timeFraction) {
    // Phase shift so the dip is centred on timeFraction = 0.5 (midnight).
    const nightCos = Math.cos(2 * Math.PI * (timeFraction - 0.5));
    return Math.max(0, Math.min(1, 1 - 1.55 * Math.max(0, nightCos)));
}

export default class LightingManager {
    constructor(scene) {
        this.game = scene;
        this.lights = [];
        this.trackedGroups = [];
        this.initLighting();
        this.initSky();
    }

    updateLightPosition(light, x, y) {
        if (light) {
            light.x = x;
            light.y = y;
        }
    }

    initSky() {
        // Sky extends from above the world down to the second wall lift
        // control (~40 tiles below the soil line). The visible daylight
        // cutout fades into dark over most of that band so the descent
        // feels like a gradual twilight rather than a hard transition.
        // Origin is top-centre so the rectangle hangs from a known anchor
        // and changes to height don't shift the band.
        this.skyDepthTiles = 40;
        this.skyFadeTiles = 28;  // length of the bright→dark gradient
        const skyTop = -200;
        const skyBottom = (this.game.aboveGround + this.skyDepthTiles) * this.game.tileSize;
        this.game.skyBox = this.game.add.rectangle(0, skyTop, 9999, skyBottom - skyTop, 0xf9e4c8);
        this.game.skyBox.setOrigin(0.5, 0);
        this.game.skyBox.setDepth(-999);
        this.spawnClouds();
    }

    spawnClouds() {
        if (!this.game.textures.exists('clouds')) return;
        this.clouds = [];
        // Always-on cloud drift across the sky band. Plenty of clouds at
        // a healthy alpha so the player always sees a few drifting through
        // the visible viewport regardless of where they walked to. The
        // dark overlay naturally hides them at night where the sky cutout
        // is collapsed, so no per-cloud alpha curve is needed.
        const cloudCount = 14;
        const skyTop = -120;
        const skyBottom = (this.game.aboveGround * this.game.tileSize) - 30;
        // Clouds get a horizontal scroll factor in BackgroundManager for
        // parallax, but the spawn x range is still in world coords. Cover
        // a wide band so the player never wanders into a cloudless gap.
        const range = 6000;
        for (let i = 0; i < cloudCount; i++) {
            const x = Phaser.Math.Between(-range / 2, range / 2);
            const y = Phaser.Math.Between(skyTop, skyBottom);
            const cloud = this.game.add.image(x, y, 'clouds');
            const scale = Phaser.Math.FloatBetween(0.22, 0.42);
            cloud.setScale(scale);
            cloud.setAlpha(Phaser.Math.FloatBetween(0.7, 0.95));
            cloud.setDepth(-998);
            this.clouds.push(cloud);
            const speed = Phaser.Math.FloatBetween(80000, 160000);
            this.game.tweens.add({
                targets: cloud,
                x: x + range,
                duration: speed,
                ease: 'Linear',
                repeat: -1,
                onRepeat: () => { cloud.x = x; }
            });
        }
    }

    initLighting() {
        this.cachedCanvases = {};
        this.colorCaches = {};
        this.game.lightCanvas = document.createElement("canvas");
        this.game.lightCanvas.id = 'light_canvas';
        this.initViewMask();
        this.game.lightCanvas.width = this.game.cameras.main.width;
        this.game.lightCanvas.height = this.game.cameras.main.height;
        this.game.lightCanvas.style.position = "absolute";
        // this.game.lightCanvas.style.opacity = 0;
        this.game.lightCanvas.style.top = "0";
        this.game.lightCanvas.style.left = "0";
        this.game.lightCanvas.style.pointerEvents = "none";
        document.body.appendChild(this.game.lightCanvas);

        this.game.lightCtx = this.game.lightCanvas.getContext("2d");
        window.addEventListener("resize", () => {
            this.game.lightCanvas.width = this.game.cameras.main.width;
            this.game.lightCanvas.height = this.game.cameras.main.height;
        });

        this.initColorCaches(this.game.lightColors, 256, 10);
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

    updateLighting(deltaTime) {
        const ctx = this.game.lightCtx;
        ctx.clearRect(0, 0, this.game.lightCanvas.width, this.game.lightCanvas.height);

        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, this.game.lightCanvas.width, this.game.lightCanvas.height);

        this.lights.forEach(light => !light.off && this.castLight(light));

        this.updateSky();

        // this.updateViewMask();

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
        const camera = this.game.cameras.main;
        const zoom = camera.zoom;
        const baseViewRadius = this.game.renderviewDistance; // Base view distance in world units
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

        // NEW: Subtract a rectangle at the top of the canvas to reveal the sky beneath it.
        // Adjust skyMaskHeight as needed.

        // Reset composite mode
        ctx.globalCompositeOperation = "source-over";
    }


    initViewMask() {
        // Create a new canvas for the view mask
        this.viewMaskCanvas = document.createElement("canvas");
        this.viewMaskCanvas.id = "view_mask_canvas";
        this.viewMaskCanvas.width = this.game.cameras.main.width;
        this.viewMaskCanvas.height = this.game.cameras.main.height;
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
            this.viewMaskCanvas.width = this.game.cameras.main.width;
            this.viewMaskCanvas.height = this.game.cameras.main.height;
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

    updateSky() {
        const camera = this.game.cameras.main;
        const scale = camera.zoom;
        const skyX = (0 - camera.worldView.x) * scale;
        const skyY = (0 - camera.worldView.y) * scale;
        // Cutout spans from world Y=0 down to (aboveGround + skyDepthTiles)
        // tiles, then fades into the dark overlay across the bottom 10% so
        // the sky-to-cave transition isn't a hard line.
        const skyDepth = this.skyDepthTiles ?? 40;
        const fadeTiles = this.skyFadeTiles ?? Math.floor(skyDepth * 0.7);
        const skyHeight = (this.game.aboveGround + skyDepth) * this.game.tileSize;
        const scaledSkyHeight = skyHeight * scale;
        // Fraction of the cutout that stays fully transparent before the
        // gradient begins easing in the dark overlay. Anything below this
        // fraction is in the twilight band.
        const fadeStartFrac = Math.max(0, Math.min(0.95,
            (skyHeight - fadeTiles * this.game.tileSize) / skyHeight));

        const ctx = this.game.lightCtx;
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1;

        // Calculate the time fraction for the cycle.
        const now = Date.now();
        const dayCycleDuration = this.game.dayCycleDuration || 60000; // default 60 seconds per cycle
        const timeFraction = (now % dayCycleDuration) / dayCycleDuration;

        // Sky visibility — stays high through dawn/dusk and only collapses
        // in the deep-night window, so the warm dusk colours read clearly.
        const alphaVal = skyVisibility(timeFraction);

        const _gradient = ctx.createLinearGradient(skyX, skyY, skyX, skyY + scaledSkyHeight);
        _gradient.addColorStop(0, `rgba(0, 0, 0, ${alphaVal})`);
        _gradient.addColorStop(fadeStartFrac, `rgba(0, 0, 0, ${alphaVal})`);
        _gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        // Paint the sky background by interpolating through the diurnal
        // palette: bright blue at noon, navy at midnight, with warm
        // orange swept through at dusk and dawn.
        if (this.game.skyBox) {
            const [r, g, b] = paletteColor(timeFraction);
            const tintColor = (r << 16) | (g << 8) | b;
            this.game.skyBox.setFillStyle(tintColor, 1);
        }

        ctx.fillStyle = _gradient;
        ctx.fillRect(skyX, skyY, 99999, scaledSkyHeight);
        ctx.globalCompositeOperation = "normal";
    }

    castLight(light) {
        const camera = this.game.cameras.main;
        const scale = camera.zoom;
        const radius = light.radius * scale;

        const screenX = (light.x - camera.worldView.x) * scale;
        const screenY = (light.y - camera.worldView.y) * scale;

        const skyX = (0 - camera.worldView.x) * scale;
        const skyY = (0 - camera.worldView.y) * scale;
        const skyHeight = 950;

        const ctx = this.game.lightCtx;

        let cachedCanvas = this.cachedCanvases[light.color];
        if (!cachedCanvas) {
            cachedCanvas = this.createCachedLightTexture(light.color, 256, 10);
        }

        // Soft outer bloom: gently lifts the dark in a wider area than the core light.
        // This makes lamps feel like they breathe warmth into the cave instead of
        // appearing as hard-edged cutouts.
        const bloomRadius = radius * 1.9;
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = light.intensity * 0.28;
        ctx.drawImage(
            cachedCanvas,
            0, 0, cachedCanvas.width, cachedCanvas.height,
            screenX - bloomRadius, screenY - bloomRadius, bloomRadius * 2, bloomRadius * 2
        );

        // Core light cutout.
        ctx.globalAlpha = light.intensity;
        ctx.drawImage(
            cachedCanvas,
            0, 0, cachedCanvas.width, cachedCanvas.height,
            screenX - radius, screenY - radius, radius * 2, radius * 2
        );

        // Warm color tint over the whole lit area.
        ctx.globalCompositeOperation = "normal";
        ctx.globalAlpha = light.neon ? 0.6 : 0.1;

        ctx.drawImage(
            cachedCanvas,
            0, 0, cachedCanvas.width, cachedCanvas.height,
            screenX - radius, screenY - radius, radius * 2, radius * 2
        );

        // Wider, very soft warm halo for additional cosiness.
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = light.neon ? 0.18 : 0.05;
        ctx.drawImage(
            cachedCanvas,
            0, 0, cachedCanvas.width, cachedCanvas.height,
            screenX - bloomRadius, screenY - bloomRadius, bloomRadius * 2, bloomRadius * 2
        );

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "normal";
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
                    const rect = new Phaser.Geom.Rectangle(element.x, element.y, this.game.tileSize, this.game.tileSize);
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
