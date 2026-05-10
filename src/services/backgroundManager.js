// Two-zone parallax backdrop sitting behind the gameplay tiles. The
// surface zone (default 100m below the soil line) renders as a hand-laid
// stone-brick wall — the kind of masonry you'd see behind an old mine
// entrance — and the deep zone renders as natural cave rock studded with
// stalactites, stalagmites, and glowing crystals. A slower-scrolling
// distant cave layer sits behind the near cave for parallax depth.
//
// Sky + clouds (handled in LightingManager) keep their existing pixel
// drift on top of the brick backing in the surface zone.

const SURFACE_DEPTH_TILES = 100; // ~100m of brick wall before going deep
const BRICK_TILE_W = 60;
const BRICK_TILE_H = 40;
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
        this.makeBrickTexture();
        this.makeCaveTexture();
    }

    makeBrickTexture() {
        const key = 'bg_brick';
        if (this.game.textures.exists(key)) return;
        const w = BRICK_TILE_W, h = BRICK_TILE_H;
        const tex = this.game.textures.createCanvas(key, w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        const rand = makeRng(0x42117);

        // Deep dirt-grout backdrop the stones sit on top of.
        ctx.fillStyle = '#1a120c';
        ctx.fillRect(0, 0, w, h);
        // Faint vertical streaks to break up the flatness.
        for (let i = 0; i < 18; i++) {
            const x = Math.floor(rand() * w);
            ctx.fillStyle = rgba('#000000', 0.18);
            ctx.fillRect(x, 0, 1, h);
        }

        // Tile bricks in alternating-offset rows like real masonry, with
        // per-brick warm/cool jitter so the wall doesn't read as a single
        // flat colour. Brick interiors get a 1-pixel top highlight and a
        // 1-pixel bottom shadow for chiselled depth.
        const brickW = 20;
        const brickH = 8;
        for (let row = -1; row <= Math.ceil(h / brickH); row++) {
            const offset = (row & 1) ? brickW / 2 : 0;
            for (let col = -1; col <= Math.ceil(w / brickW); col++) {
                const bx = Math.round(col * brickW + offset);
                const by = row * brickH;
                if (by + brickH < 0 || by > h) continue;

                // Warm grey-brown stone with per-brick variation.
                const warm = rand();
                const baseR = 64 + Math.floor(warm * 22);
                const baseG = 52 + Math.floor(warm * 18);
                const baseB = 42 + Math.floor(warm * 14);
                ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
                ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2);

                // Speckle: 3-6 darker pebble pixels inside each brick.
                const specks = 3 + Math.floor(rand() * 4);
                for (let s = 0; s < specks; s++) {
                    const sx = bx + 1 + Math.floor(rand() * (brickW - 2));
                    const sy = by + 1 + Math.floor(rand() * (brickH - 2));
                    ctx.fillStyle = rgba('#000000', 0.18);
                    ctx.fillRect(sx, sy, 1, 1);
                }

                // Top highlight + bottom shadow gives the cobble its shape.
                ctx.fillStyle = rgba('#f4d7b0', 0.08);
                ctx.fillRect(bx + 1, by + 1, brickW - 2, 1);
                ctx.fillStyle = rgba('#000000', 0.42);
                ctx.fillRect(bx + 1, by + brickH - 2, brickW - 2, 1);
            }
        }

        // Occasional moss along the bottom edge of bricks — gives the wall
        // some life and breaks up the regularity.
        const mossCount = 8;
        for (let i = 0; i < mossCount; i++) {
            const mx = Math.floor(rand() * w);
            const my = Math.floor(rand() * h);
            const len = 2 + Math.floor(rand() * 4);
            const colorPick = rand();
            const mossColor = colorPick > 0.5 ? '#4f7330' : '#6b8c3c';
            ctx.fillStyle = rgba(mossColor, 0.55);
            ctx.fillRect(mx, my, len, 1);
            if (rand() > 0.5) ctx.fillRect(mx + 1, my + 1, len - 1, 1);
        }

        tex.refresh();
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
        const brickTopY = this.surfaceY();
        const brickBottomY = this.deepY();
        const brickHeight = brickBottomY - brickTopY;

        // Stone brick wall — sits behind every tile in the top SURFACE_DEPTH
        // tiles, visible wherever a tile is empty and the lightmap reveals
        // it. ScrollFactor 1 keeps it pinned to world coordinates so dug
        // tunnels reveal coherent masonry rather than swimming texture.
        this.brickLayer = this.game.add.tileSprite(
            this.worldW / 2,
            brickTopY + brickHeight / 2,
            this.worldW + 400,
            brickHeight,
            'bg_brick'
        );
        this.brickLayer.setDepth(-996);

        // Soft 2-tile gradient seam where brick meets cave so the transition
        // from masonry to natural rock doesn't read as a hard horizontal
        // line across the world.
        const seamH = this.ts * 4;
        this.seam = this.game.add.graphics();
        this.seam.setDepth(-995.5);
        this.seam.fillGradientStyle(0x1a120c, 0x1a120c, 0x0f0a07, 0x0f0a07, 1, 1, 1, 1);
        this.seam.fillRect(0, brickBottomY - seamH / 2, this.worldW, seamH);

        // Deep cave parallax layer — camera-locked at screen origin, with
        // its tile position shifted at a fraction of the camera scroll
        // each frame so the cave appears to scroll past slower than the
        // foreground. Stalactites, stalagmites, and glow rocks are baked
        // into the texture. Hidden while the player is up at the surface
        // so the brick backing reads cleanly.
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

        // The cave parallax sprite is camera-locked (scrollFactor 0), so
        // its x/y are screen-space and stay at the screen origin. Resize
        // it to the viewport every frame so it fills the screen at any
        // window size, then shift its tile position at a fraction of the
        // camera scroll. The result: the cave drifts past slower than the
        // foreground tiles, reading as distance behind the player.
        const w = cam.width + 200;
        const h = cam.height + 200;
        if (this.caveParallax.width !== w) this.caveParallax.width = w;
        if (this.caveParallax.height !== h) this.caveParallax.height = h;
        this.caveParallax.tilePositionX = cam.scrollX * PARALLAX_CAVE_FACTOR;
        this.caveParallax.tilePositionY = cam.scrollY * PARALLAX_CAVE_FACTOR;

        // Only render the cave once the player's view reaches the deep
        // zone; in the brick zone we want the masonry to show, not stone.
        const viewBottom = cam.worldView.y + cam.height;
        const shouldShow = viewBottom > this.deepY() - this.ts * 8;
        if (this.caveParallax.visible !== shouldShow) {
            this.caveParallax.setVisible(shouldShow);
        }
    }
}
