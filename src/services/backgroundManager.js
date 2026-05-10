// Two-zone backdrop sitting behind the gameplay tiles. Down to ~100m
// below the surface the empty cells reveal the sky band (LightingManager
// stretches the daylight cutout to match), so a player digging shallow
// tunnels still sees daylight + drifting clouds behind them. Past 100m
// the camera-locked cave layer kicks in: natural rock studded with
// stalactites, stalagmites, and glowing crystals, scrolling at a
// fraction of camera speed for parallax depth.

const SURFACE_DEPTH_TILES = 100;
const CAVE_TILE_W = 96;
const CAVE_TILE_H = 96;
const PARALLAX_CAVE_FACTOR = 0.45;
const PARALLAX_CLOUD_FACTOR = 0.55;

function makeRng(seed) {
    let s = (seed | 0) || 1;
    return () => {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) % 100000) / 100000;
    };
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function rgba(hex, a) {
    const {r, g, b} = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
}

export default class BackgroundManager {
    constructor(scene) {
        this.game = scene;
        this.ts = scene.tileSize;
        this.surfaceRow = scene.aboveGround;
        this.deepThresholdRow = scene.aboveGround + SURFACE_DEPTH_TILES;
        this.worldW = scene.mapWidth * this.ts;
        this.worldH = scene.mapHeight * this.ts;

        this.generateTextures();
        this.createLayers();
        this.applyCloudParallax();
    }

    surfaceY() { return this.surfaceRow * this.ts; }
    deepY()    { return this.deepThresholdRow * this.ts; }

    // ----- Texture generation ---------------------------------------------

    generateTextures() {
        this.makeCaveTexture();
    }

    makeCaveTexture() {
        const key = 'bg_cave';
        if (this.game.textures.exists(key)) return;
        const w = CAVE_TILE_W, h = CAVE_TILE_H;
        const tex = this.game.textures.createCanvas(key, w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        const rand = makeRng(0xC4F31);

        // Base wall tone — deep cave brown leaning slightly grey.
        ctx.fillStyle = '#231a14';
        ctx.fillRect(0, 0, w, h);

        // Rocky speckle pattern across the whole tile. Three intensity
        // bands give the wall a coarse stone feel without being noisy.
        const speckleCount = Math.floor(w * h * 0.18);
        for (let i = 0; i < speckleCount; i++) {
            const px = Math.floor(rand() * w);
            const py = Math.floor(rand() * h);
            const r = rand();
            let color;
            if (r > 0.82) color = rgba('#54402f', 0.85);
            else if (r > 0.5) color = rgba('#0c0805', 0.6);
            else color = rgba('#352618', 0.55);
            ctx.fillStyle = color;
            ctx.fillRect(px, py, 1, 1);
        }

        // Cracks: wandering 1-pixel lines.
        const crackCount = 4 + Math.floor(rand() * 3);
        for (let i = 0; i < crackCount; i++) {
            ctx.strokeStyle = rgba('#000000', 0.65);
            ctx.lineWidth = 1;
            ctx.beginPath();
            let x = rand() * w;
            let y = rand() * h;
            ctx.moveTo(x, y);
            const segs = 6 + Math.floor(rand() * 6);
            for (let j = 0; j < segs; j++) {
                x += (rand() - 0.5) * 16;
                y += (rand() - 0.5) * 14;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Stalactites hanging from the top edge of the tile and stalagmites
        // rising from the bottom — placed close to the edges so when the
        // texture tiles vertically the formations meet across the seam.
        const drawSpike = (cx, fromTop) => {
            const len = 6 + Math.floor(rand() * 12);
            for (let j = 0; j < len; j++) {
                const t = j / len;
                const halfW = Math.max(0, Math.round((1 - t) * 3));
                const yy = fromTop ? j : h - 1 - j;
                for (let dx = -halfW; dx <= halfW; dx++) {
                    const px = ((cx + dx) % w + w) % w;
                    // Outline darker on the side facing away from the
                    // light (right side, since highlights are upper-left).
                    if (dx === halfW) {
                        ctx.fillStyle = rgba('#000000', 0.85);
                    } else if (dx === -halfW && halfW > 0) {
                        ctx.fillStyle = rgba('#6a4e36', 0.65);
                    } else {
                        ctx.fillStyle = rgba('#3a2a1c', 0.95);
                    }
                    ctx.fillRect(px, yy, 1, 1);
                }
            }
        };
        const stalactiteCount = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < stalactiteCount; i++) {
            drawSpike(Math.floor(rand() * w), true);
        }
        const stalagmiteCount = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < stalagmiteCount; i++) {
            drawSpike(Math.floor(rand() * w), false);
        }

        // Glow rocks — bright pinprick + soft warm/cool halo. Drawn last so
        // the halo paints over nearby speckle. Limited to 1-2 per tile so
        // the pattern isn't obviously repeating.
        const glowColors = ['#5b9dff', '#ffd76a', '#7fc474', '#f47edc', '#ff9472'];
        const glowCount = 1 + Math.floor(rand() * 2);
        for (let i = 0; i < glowCount; i++) {
            const gx = Math.floor(rand() * w);
            const gy = Math.floor(rand() * h);
            const color = glowColors[Math.floor(rand() * glowColors.length)];
            // Two-stop radial halo
            const haloR = 6 + Math.floor(rand() * 4);
            const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, haloR);
            gradient.addColorStop(0, rgba(color, 0.85));
            gradient.addColorStop(0.4, rgba(color, 0.35));
            gradient.addColorStop(1, rgba(color, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(gx - haloR, gy - haloR, haloR * 2, haloR * 2);
            // Bright core
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(gx, gy, 1, 1);
            ctx.fillStyle = rgba(color, 1);
            ctx.fillRect(gx - 1, gy, 1, 1);
            ctx.fillRect(gx + 1, gy, 1, 1);
            ctx.fillRect(gx, gy - 1, 1, 1);
            ctx.fillRect(gx, gy + 1, 1, 1);
        }

        tex.refresh();
    }

    // ----- Layer placement ------------------------------------------------

    createLayers() {
        // Deep cave parallax layer — camera-locked at screen origin, with
        // its tile position shifted at a fraction of the camera scroll
        // each frame so the cave appears to scroll past slower than the
        // foreground. Stalactites, stalagmites, and glow rocks are baked
        // into the texture. Hidden while the player's view is still up in
        // the sky band so daylight + clouds read cleanly.
        this.caveParallax = this.game.add.tileSprite(
            -100, -100,
            this.game.cameras.main.width + 200,
            this.game.cameras.main.height + 200,
            'bg_cave'
        );
        this.caveParallax.setOrigin(0, 0);
        this.caveParallax.setScrollFactor(0);
        this.caveParallax.setDepth(-997);
        this.caveParallax.setVisible(false);
    }

    applyCloudParallax() {
        // Existing clouds were drifting at world-rate, which felt close. A
        // horizontal scroll factor under 1 makes them drift slower than the
        // foreground as the camera pans, reading as actual sky distance.
        const sky = this.game.children?.list || [];
        for (const obj of sky) {
            if (obj?.texture?.key === 'clouds') {
                obj.setScrollFactor(PARALLAX_CLOUD_FACTOR, 1);
            }
        }
    }

    update() {
        const cam = this.game.cameras.main;
        if (!cam || !this.caveParallax) return;

        // The cave parallax sprite is camera-locked (scrollFactor 0); we
        // reposition it each frame so its top edge sits exactly at the
        // screen Y corresponding to the deep boundary. Above that line the
        // sky band keeps showing through; below, the cave wall + features
        // take over. Texture tile position shifts at a fraction of the
        // camera scroll so the wall reads as distance behind the player.
        const deepScreenY = this.deepY() - cam.scrollY;

        if (deepScreenY >= cam.height) {
            // Camera entirely inside the sky band — no cave needed.
            if (this.caveParallax.visible) this.caveParallax.setVisible(false);
            return;
        }

        if (!this.caveParallax.visible) this.caveParallax.setVisible(true);

        const top = Math.max(-100, deepScreenY);
        const w = cam.width + 200;
        const h = cam.height - top + 200;
        this.caveParallax.x = -100;
        this.caveParallax.y = top;
        if (this.caveParallax.width !== w) this.caveParallax.width = w;
        if (this.caveParallax.height !== h) this.caveParallax.height = h;
        this.caveParallax.tilePositionX = cam.scrollX * PARALLAX_CAVE_FACTOR;
        this.caveParallax.tilePositionY = cam.scrollY * PARALLAX_CAVE_FACTOR;
    }
}
