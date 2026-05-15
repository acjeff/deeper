import LiftTerminal from './liftTerminal';
import {ensureHutFacadeTexture, HUT_TILE_W, HUT_TILE_H} from '../classes/hut';

// Platform thickness (matches craneFlat.setDisplaySize height). Centered
// origin means the platform top is platformY - PLATFORM_HALF_H.
const PLATFORM_HALF_H = 2.5;

// Shared palette for the generated lift textures so the rig reads as one
// piece of equipment instead of a stack of unrelated brown rectangles.
const LIFT_PALETTE = {
    wood:          '#7a5230',
    woodWarm:      '#8a6240',
    woodLight:     '#a8804e',
    woodHighlight: '#c79c66',
    woodDark:      '#3c2412',
    woodGrain:     '#5a3a1c',
    woodTrim:      '#1f1208',
    metal:         '#3a4248',
    metalLight:    '#6a7480',
    metalHi:       '#9aa4b0',
    metalDark:     '#1a1e22',
    cable:         '#7a5234',
    cableHi:       '#a87a4c',
    cableShadow:   '#3a2410',
    stone:         '#5a544a',
    stoneLight:    '#7a7468',
    stoneDark:     '#2a2620',
};

function degrees_to_radians(degrees) {
    let pi = Math.PI;
    return degrees * (pi / 180);
}

// Pre-build all the pixel-art textures the rig uses. Cached on the
// scene's texture manager so we only pay the canvas cost once per scene
// lifetime (which matters when the player flips between HouseScene and
// GameScene many times in a session).
function ensureLiftTextures(game, platformPxWidth) {
    const P = LIFT_PALETTE;
    const tex = game.textures;

    const make = (key, w, h, draw) => {
        if (tex.exists(key)) return;
        const t = tex.createCanvas(key, w, h);
        const ctx = t.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        draw(ctx, w, h);
        t.refresh();
    };

    // Deck planking — 1:1 with the platform display size so plank seams
    // don't smear under stretching. Iron end-caps suggest the deck is
    // bolted onto its frame.
    make('lift_deck', platformPxWidth, 5, (ctx, w, h) => {
        ctx.fillStyle = P.wood;
        ctx.fillRect(0, 1, w, h - 2);
        ctx.fillStyle = P.woodLight;
        ctx.fillRect(0, 0, w, 1);
        ctx.fillStyle = P.woodDark;
        ctx.fillRect(0, h - 1, w, 1);
        // Plank seams — irregular spacing so the deck doesn't read as a
        // single repeating pattern.
        ctx.fillStyle = P.woodTrim;
        const seamGaps = [10, 9, 11, 10, 9, 11, 10, 9];
        let sx = 0;
        for (const g of seamGaps) {
            sx += g;
            if (sx >= w - 3) break;
            ctx.fillRect(sx, 0, 1, h);
        }
        // Metal end-caps that read as bolted brackets.
        ctx.fillStyle = P.metal;
        ctx.fillRect(0, 0, 3, h);
        ctx.fillRect(w - 3, 0, 3, h);
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(0, 1, 1, 1);
        ctx.fillRect(w - 1, 1, 1, 1);
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(0, h - 1, 3, 1);
        ctx.fillRect(w - 3, h - 1, 3, 1);
    });

    // Vertical strut — wood post with iron bands. 6×60 so the bands have
    // room to read without dominating the pixel.
    make('lift_strut_v', 6, 60, (ctx, w, h) => {
        ctx.fillStyle = P.wood;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = P.woodLight;
        ctx.fillRect(0, 0, 1, h);
        ctx.fillStyle = P.woodWarm;
        ctx.fillRect(1, 0, 1, h);
        ctx.fillStyle = P.woodGrain;
        ctx.fillRect(w - 2, 0, 1, h);
        ctx.fillStyle = P.woodDark;
        ctx.fillRect(w - 1, 0, 1, h);
        // Grain knots so the post doesn't read as a flat slab.
        ctx.fillStyle = P.woodTrim;
        for (const ky of [11, 27, 43]) {
            ctx.fillRect(2, ky, 2, 1);
            ctx.fillRect(2, ky + 1, 2, 1);
        }
        // Iron bands at three evenly-spaced heights.
        ctx.fillStyle = P.metalDark;
        for (const y of [5, 28, 51]) {
            ctx.fillRect(0, y, w, 3);
        }
        ctx.fillStyle = P.metalLight;
        for (const y of [5, 28, 51]) {
            ctx.fillRect(0, y, w, 1);
        }
        ctx.fillStyle = P.metalHi;
        for (const y of [6, 29, 52]) {
            ctx.fillRect(2, y, 1, 1);
            ctx.fillRect(w - 3, y, 1, 1);
        }
    });

    // Horizontal top beam — same wood palette, plank seams.
    make('lift_top_beam', 116, 8, (ctx, w, h) => {
        ctx.fillStyle = P.wood;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = P.woodLight;
        ctx.fillRect(0, 0, w, 1);
        ctx.fillStyle = P.woodWarm;
        ctx.fillRect(0, 1, w, 1);
        ctx.fillStyle = P.woodGrain;
        ctx.fillRect(0, h - 2, w, 1);
        ctx.fillStyle = P.woodDark;
        ctx.fillRect(0, h - 1, w, 1);
        ctx.fillStyle = P.woodTrim;
        for (let x = 15; x < w - 3; x += 15) {
            ctx.fillRect(x, 1, 1, h - 2);
        }
        // Iron end-caps wrap around the post tops.
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(0, 0, 4, h);
        ctx.fillRect(w - 4, 0, 4, h);
        ctx.fillStyle = P.metal;
        ctx.fillRect(1, 1, 2, h - 2);
        ctx.fillRect(w - 3, 1, 2, h - 2);
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(0, 1, 1, 1);
        ctx.fillRect(w - 1, 1, 1, 1);
        // Bolt heads on each end cap.
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(2, 3, 1, 1);
        ctx.fillRect(w - 3, 3, 1, 1);
    });

    // Winch drum mounted on top of the beam — iron flanges, wound cable,
    // and a central axle nub so it reads as something that spins.
    make('lift_winch', 22, 12, (ctx, w, h) => {
        // Mount feet
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(0, h - 2, w, 2);
        ctx.fillStyle = P.metal;
        ctx.fillRect(1, h - 3, w - 2, 1);
        // Side flanges
        ctx.fillStyle = P.metal;
        ctx.fillRect(0, 1, 3, h - 3);
        ctx.fillRect(w - 3, 1, 3, h - 3);
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(0, 1, 1, 1);
        ctx.fillRect(w - 1, 1, 1, 1);
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(2, 1, 1, h - 3);
        ctx.fillRect(w - 3, 1, 1, h - 3);
        // Wound cable barrel
        const x0 = 3, x1 = w - 3;
        ctx.fillStyle = P.cable;
        ctx.fillRect(x0, 2, x1 - x0, h - 5);
        ctx.fillStyle = P.cableHi;
        ctx.fillRect(x0, 2, x1 - x0, 1);
        ctx.fillStyle = P.cableShadow;
        ctx.fillRect(x0, h - 4, x1 - x0, 1);
        // Wrap lines suggesting wound rope.
        ctx.fillStyle = P.cableShadow;
        for (let x = x0 + 1; x < x1; x += 2) {
            ctx.fillRect(x, 3, 1, h - 7);
        }
        // Crown bracket at top (mounts to whatever rig sits above).
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(0, 0, w, 1);
        ctx.fillStyle = P.metal;
        ctx.fillRect(w / 2 - 2, 0, 4, 1);
        // Axle nubs.
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(1, Math.floor(h / 2) - 1, 1, 1);
        ctx.fillRect(w - 2, Math.floor(h / 2) - 1, 1, 1);
    });

    // Tiny pulley wheel at the cable corners.
    make('lift_pulley', 6, 6, (ctx, w, h) => {
        ctx.fillStyle = P.metal;
        ctx.fillRect(1, 0, w - 2, h);
        ctx.fillRect(0, 1, w, h - 2);
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(1, 1, 1, 1);
        ctx.fillRect(2, 0, 2, 1);
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(w - 2, h - 2, 1, 1);
        ctx.fillRect(1, h - 1, w - 2, 1);
        // Hub
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(2, 2, 2, 2);
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(2, 2, 1, 1);
    });

    // Doorstep that bridges the deck and the hut threshold so the home
    // reads as built onto the platform rather than dropped onto it.
    make('lift_stoop', 14, 3, (ctx, w, h) => {
        ctx.fillStyle = P.stone;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = P.stoneLight;
        ctx.fillRect(0, 0, w, 1);
        ctx.fillStyle = P.stoneDark;
        ctx.fillRect(0, h - 1, w, 1);
        // Stone block seams.
        ctx.fillStyle = P.stoneDark;
        ctx.fillRect(w / 2, 0, 1, h);
        ctx.fillStyle = P.stoneLight;
        ctx.fillRect(2, 1, 1, 1);
        ctx.fillRect(w - 3, 1, 1, 1);
    });

    // Rigging plate — small metal triangle where the three cables meet,
    // so the diagonals read as anchored hardware instead of floating
    // pencil lines below the beam.
    make('lift_rigging', 10, 6, (ctx, w, h) => {
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(0, 0, w, 1);
        ctx.fillStyle = P.metal;
        ctx.fillRect(1, 1, w - 2, 2);
        ctx.fillStyle = P.metalLight;
        ctx.fillRect(1, 1, w - 2, 1);
        // Triangular taper to the cable knot below.
        ctx.fillStyle = P.metal;
        ctx.fillRect(2, 3, w - 4, 1);
        ctx.fillRect(3, 4, w - 6, 1);
        ctx.fillStyle = P.metalDark;
        ctx.fillRect(4, 5, 2, 1);
        // Eye-bolts on either side
        ctx.fillStyle = P.metalHi;
        ctx.fillRect(1, 1, 1, 1);
        ctx.fillRect(w - 2, 1, 1, 1);
    });
}

export default class CraneManager {
    constructor(scene) {
        // Lift moves at a constant velocity: travel time scales with the
        // distance covered. Kept just below the player's terminal fall
        // velocity (~100 px/s) so the platform never out-paces a falling
        // player and the ride feels like a deliberate descent. Higher
        // value = slower lift.
        this.liftMsPerUnit = 12;
        // Floor so very short corrections still animate visibly instead of
        // snapping in a single frame.
        this.liftMinDurationMs = 150;
        this.game = scene;
        this.ropeColor = '0x6B3E22';
        const width = (this.game.chasmRange[1] - this.game.chasmRange[0]) * 10;
        const platformX = (this.game.chasmRange[0] * 10) + width / 2;
        const platformY = (this.game.aboveGround * 10) + 10;
        const platformDeckWidth = width - 15;
        this.platformWidth = width;
        this.platformDeckWidth = platformDeckWidth;

        ensureLiftTextures(this.game, platformDeckWidth);

        // Main deck: physics body lives on this sprite, so its display
        // dimensions are what control the lift's actual collider.
        this.craneFlat = this.game.add.image(platformX, platformY, 'lift_deck');
        this.craneFlat.setDisplaySize(platformDeckWidth, 5);
        this.craneFlat.setDepth(3);
        this.game.craneGroup.add(this.craneFlat);

        // Gantry: thicker wooden posts with iron banding, plus a wider top
        // beam that wraps around the post tops with metal caps. Depth -2
        // tucks the posts behind the soil walls but in front of the
        // parallax backdrop.
        this.leftStrut = this.game.add.image(this.game.chasmRange[0] * 10, 175, 'lift_strut_v');
        this.leftStrut.setDisplaySize(6, 60);
        this.leftStrut.setDepth(-2);

        this.rightStrut = this.game.add.image(this.game.chasmRange[1] * 10, 175, 'lift_strut_v');
        this.rightStrut.setDisplaySize(6, 60);
        this.rightStrut.setDepth(-2);

        const beamY = (this.game.aboveGround * 10) - 50;
        this.topStrut = this.game.add.image(platformX, beamY, 'lift_top_beam');
        this.topStrut.setDisplaySize(width + 16, 8);
        this.topStrut.setDepth(-1);

        // Winch drum perched on top of the beam, just left of dead-center
        // so the cable feed has a visible offset rather than running
        // straight through the centerline.
        this.winchDrum = this.game.add.image(platformX, beamY - 6, 'lift_winch');
        this.winchDrum.setDepth(-1);

        // Pulley wheels at the post-top joints — decorative corner hardware
        // where the beam meets each upright.
        this.leftPulley = this.game.add.image(this.game.chasmRange[0] * 10 + 6, beamY + 6, 'lift_pulley');
        this.leftPulley.setDepth(0);
        this.rightPulley = this.game.add.image(this.game.chasmRange[1] * 10 - 6, beamY + 6, 'lift_pulley');
        this.rightPulley.setDepth(0);

        // Rigging plate sits just below the beam at the cable convergence
        // point so all three cables visibly anchor to one piece of
        // hardware. The diagonal cables originate ~18px below the beam
        // (rotation math; see ropeTwo upper endpoint), and this plate
        // bridges that gap.
        this.riggingPlate = this.game.add.image(platformX, beamY + 18, 'lift_rigging');
        this.riggingPlate.setDepth(0.4);

        // Cables — wider than the original 1-px lines so they read as
        // load-bearing rope instead of pencil strokes. Depth 0.5 sits in
        // front of the gantry but behind the hut facade so the diagonal
        // cables disappear cleanly behind the house instead of crossing
        // its roof.
        const cableColor = 0x6b3e22;
        this.rope = this.game.add.rectangle(platformX, 161, 3, 24, cableColor);
        this.rope.setDepth(0.5);

        this.ropeTwo = this.game.add.rectangle(this.game.chasmRange[0] * 10 + 32, 190, 3, 50, cableColor);
        this.ropeTwo.setRotation(degrees_to_radians(45));
        this.ropeTwo.setDepth(0.5);

        this.ropeThree = this.game.add.rectangle(this.game.chasmRange[1] * 10 - 32, 190, 3, 50, cableColor);
        this.ropeThree.setRotation(degrees_to_radians(-45));
        this.ropeThree.setDepth(0.5);

        this.createControlPanel(platformX, platformY);
        this.createPlatformHut(platformX, platformY);

        // Snapshot initial visual state so "return to surface" via the
        // terminal lands the platform exactly back where it started.
        this.surfaceState = this._snapshotState();

        // Terminal owns rope length, resource count, and the level UI.
        this.liftTerminal = new LiftTerminal(this);
    }

    /**
     * The player's home rides on the platform instead of sitting on the
     * surface. Visual + interactable bits are placed relative to the
     * platform's top and re-synced every frame so they stay glued during
     * lift travel. Decor is persisted on the GameScene so it survives
     * scene transitions even though there's no world grid cell to anchor.
     */
    createPlatformHut(platformX, platformY) {
        const ts = this.game.tileSize;
        const platformTop = platformY - PLATFORM_HALF_H;
        const paletteKey = 'homestead';
        const textureKey = ensureHutFacadeTexture(this.game, paletteKey, false);

        if (!this.game.platformHutDecor) {
            this.game.platformHutDecor = {
                wallpaper: 'cream',
                floor: 'oak',
                bed: 'quilt',
                rug: 'rag',
            };
        }

        const facade = this.game.add.image(platformX, platformTop, textureKey);
        facade.setOrigin(0.5, 1);
        facade.setDisplaySize(HUT_TILE_W * ts, HUT_TILE_H * ts);
        // Same low depth as the world-placed hut so the player (depth 2)
        // walks in front of the building. The facade sits entirely above
        // the platform sprite vertically, so the platform's higher depth
        // doesn't end up rendering on top of it.
        facade.setDepth(0.6);

        // Stone doorstep ties the facade to the deck so the house reads
        // as built onto the rig instead of perched on top of it.
        const stoop = this.game.add.image(platformX, platformTop, 'lift_stoop');
        stoop.setOrigin(0.5, 1);
        stoop.setDepth(0.7);

        const windowGlow = this.game.add.rectangle(
            platformX, platformTop - ts * 2.1, ts * 0.6, ts * 0.6, 0xffd27a, 0.35
        );
        windowGlow.setDepth(0.59);
        windowGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Invisible interactable rectangle sat just above the platform so
        // the existing hutGroup overlap picks it up like a normal hut.
        const door = this.game.add.rectangle(
            platformX, platformTop - (ts * 1.4) / 2, ts, ts * 1.4, 0xffffff
        );
        door.setAlpha(0);
        this.game.hutGroup.add(door);
        door.tileRef = {
            tileDetails: {isPlayerHouse: true, paletteKey, hutId: 'platform_home'},
            interactionText: 'Enter Home',
            enterHut: () => this._enterPlatformHut(),
        };

        this.platformHut = {facade, stoop, windowGlow, door};
        this._syncPlatformHut();
    }

    _syncPlatformHut() {
        if (!this.platformHut) return;
        const ts = this.game.tileSize;
        const platformTop = this.craneFlat.y - PLATFORM_HALF_H;
        const {facade, stoop, windowGlow, door} = this.platformHut;
        facade.x = this.craneFlat.x;
        facade.y = platformTop;
        stoop.x = this.craneFlat.x;
        stoop.y = platformTop;
        windowGlow.x = this.craneFlat.x;
        windowGlow.y = platformTop - ts * 2.1;
        door.x = this.craneFlat.x;
        door.y = platformTop - (ts * 1.4) / 2;
        if (door.body) door.body.updateFromGameObject();
    }

    _enterPlatformHut() {
        if (this._enteringPlatformHut) return;
        this._enteringPlatformHut = true;
        this.game.scene.pause('GameScene');
        this.game.scene.launch('HouseScene', {
            hut: {
                hutId: 'platform_home',
                isPlayerHouse: true,
                paletteKey: 'homestead',
                decor: this.game.platformHutDecor,
            },
            persistDecor: (group, key) => {
                this.game.platformHutDecor[group] = key;
            },
        });
        this.game.scene.get('GameScene').events.once('resume', () => {
            this._enteringPlatformHut = false;
        });
    }

    createControlPanel(platformX, platformY) {
        // Mining-rig control panel: lives on the right edge of the platform
        // and opens the terminal when the player presses E next to it.
        // Reuses the lift-control spritesheet (frames 0/1/2 = idle/up/down).
        const panelX = platformX + (this.platformWidth / 2) - 12;
        this.controlPanel = this.game.add.sprite(panelX, platformY - 7, 'lift-control');
        this.controlPanel.setDisplaySize(this.game.tileSize, this.game.tileSize);
        this.controlPanel.setDepth(4);
        this.controlPanel.setFrame(0);
        // Marker so the terminal can filter this entry out of the levels
        // list — every other liftControlGroup member is a placed wall switch.
        this.controlPanel.isPlatformPanel = true;
        this.game.liftControlGroup.add(this.controlPanel);

        this.controlPanel.tileRef = {
            interactionText: 'Use Terminal',
            // getAdjacentBlocks scans every entityChildren group, so the
            // panel can show up as a neighbour of a real tile being
            // destroyed; that path reads tileDetails.attachedTo, so we
            // need an object here even though the panel never participates
            // in attachment chains.
            tileDetails: {},
            callCrane: () => this.liftTerminal.toggle(),
            moving: (direction) => {
                if (direction === 'up') this.controlPanel.setFrame(1);
                else if (direction === 'down') this.controlPanel.setFrame(2);
                else this.controlPanel.setFrame(0);
            },
            // The panel isn't a placed grid tile, so chunk-unload, hover, and
            // the periodic checkState pass should all no-op here. Stubs keep
            // the Tile-shaped interface so those callers don't have to
            // special-case the platform panel.
            destroy: () => {},
            checkState: () => {},
            onMouseEnter: () => {},
            onMouseLeave: () => {},
            onClick: () => {}
        };
    }

    surfaceWorldY() {
        return this.surfaceState.craneFlatBodyY - 5;
    }

    /**
     * While the platform is moving and the player is on it, pin their Y to
     * the lift's top each frame so the platform doesn't drag them through
     * its own collider. The player is captured as a "rider" the first
     * frame they're detected on the platform; capture flips the lighter
     * `playerOnLift` flag (NOT `freezePlayer`) so horizontal input and
     * chunk loading keep working during the trip — only vertical input,
     * gravity, and water-overlap checks are suspended. If the rider walks
     * off the side of the platform mid-trip we release them so they fall
     * naturally instead of skating in mid-air.
     */
    update() {
        // Keep the home glued to the platform every frame so it tracks
        // mid-tween motion without flickering against the lift's render.
        this._syncPlatformHut();

        const lift = this.craneFlat;
        if (!lift?.body) return;
        if (!this.moving) {
            if (this.playerRiding) this._releaseRider();
            return;
        }

        const player = this.game.player;
        if (!player?.body) return;

        const halfLiftW = lift.body.width / 2;
        const halfPlayerW = player.body.width / 2;
        const horizOverlap = Math.abs(player.x - lift.x) <= halfLiftW + halfPlayerW;

        if (!this.playerRiding) {
            const playerBottom = player.body.y + player.body.height;
            // Only attach when the player is actually standing on the
            // platform — within a few px of its top and not moving upward.
            const onTop = horizOverlap
                && Math.abs(playerBottom - lift.body.y) <= 8
                && player.body.velocity.y >= 0;
            if (!onTop) return;
            this._captureRider();
        } else if (!horizOverlap) {
            // Player walked off the edge — let gravity take over.
            this._releaseRider();
            return;
        }

        const liftTop = lift.body.y;
        player.y = liftTop - player.body.height / 2;
        player.body.y = liftTop - player.body.height;
        // Only zero vertical velocity — horizontal velocity stays under
        // the input handler so the rider can walk across the platform.
        player.body.velocity.y = 0;
    }

    _captureRider() {
        if (this.playerRiding) return;
        this.playerRiding = true;
        this.game.playerOnLift = true;
        // Cancel any pending vertical motion so the pin doesn't fight a
        // residual jump impulse on the first frame.
        if (this.game.player?.body) this.game.player.body.velocity.y = 0;
    }

    _releaseRider() {
        if (!this.playerRiding) return;
        this.playerRiding = false;
        this.game.playerOnLift = false;
    }

    _tryCaptureRiderAtStart() {
        const player = this.game.player;
        const lift = this.craneFlat;
        if (!player?.body || !lift?.body) return;
        const halfLiftW = lift.body.width / 2;
        const halfPlayerW = player.body.width / 2;
        const horizOverlap = Math.abs(player.x - lift.x) <= halfLiftW + halfPlayerW;
        const playerBottom = player.body.y + player.body.height;
        // 16px to forgive small jitter and the player just-grounded after
        // landing on the lift.
        const onTop = horizOverlap && Math.abs(playerBottom - lift.body.y) <= 16;
        if (onTop) this._captureRider();
    }

    /**
     * Travel to a level chosen from the on-platform terminal. Gated by the
     * rig's current rope length so the player can't drop past their reach.
     */
    travelToLevel(y) {
        if (this.moving) return;
        if (!this.liftTerminal.canReach(y)) return;
        const target = this._stateForDepth(y);
        this._moveCrane(target, this.controlPanel.tileRef);
    }

    /**
     * Wall-mounted lift switches summon the platform to themselves as a
     * "call lift here" beacon. Same rope-length gate as the terminal.
     */
    moveTo(y, liftControl) {
        if (this.moving) return;
        if (!this.liftTerminal.canReach(y)) {
            // Out of rope — drop the call. TODO: visual/audio feedback so
            // the player knows the rig can't reach here yet.
            liftControl.moving();
            return;
        }
        const target = this._stateForDepth(y);
        this._moveCrane(target, liftControl);
    }

    _snapshotState() {
        return {
            craneFlatY: this.craneFlat.y,
            craneFlatBodyY: this.craneFlat.body.y,
            ropeTwoY: this.ropeTwo.y,
            ropeThreeY: this.ropeThree.y,
            ropeHeight: this.rope.height,
            controlPanelY: this.controlPanel.y,
            controlPanelBodyY: this.controlPanel.body ? this.controlPanel.body.y : this.controlPanel.y
        };
    }

    _stateForDepth(y) {
        return {
            craneFlatY: y + 7.4,
            craneFlatBodyY: y + 5,
            ropeTwoY: y - 10,
            ropeThreeY: y - 10,
            ropeHeight: y - this.rope.y - 15,
            controlPanelY: y + 7.4 - 7,
            controlPanelBodyY: y + 5 - 7
        };
    }

    _moveCrane(target, liftControl) {
        if (this.moving) return;
        const currentBodyY = this.craneFlat.body.y;
        if (target.craneFlatBodyY > currentBodyY) {
            liftControl.moving('down');
        } else if (target.craneFlatBodyY < currentBodyY) {
            liftControl.moving('up');
        } else {
            liftControl.moving();
            return;
        }
        this.moving = true;
        // Capture the player as a rider up-front if they're standing on
        // the platform when the trip begins. Late joiners (walking onto a
        // moving lift) are caught by the per-frame check in update().
        this._tryCaptureRiderAtStart();

        const distance = Math.abs(target.craneFlatBodyY - currentBodyY);
        const duration = Math.max(this.liftMinDurationMs, distance * this.liftMsPerUnit);
        // Linear so velocity is constant within the trip — no easing means
        // the platform looks like it's running on a real cable rather than
        // a UI animation that smoothly slows to a stop.
        const ease = 'Linear';

        // Sync each static body to its sprite every tween tick. Tweening
        // the body and the sprite separately let them drift apart by one
        // frame, which read as stutter — especially because the player's
        // snap and the sprite's render don't share the same position.
        const syncCraneBody = () => {
            if (this.craneFlat.body) this.craneFlat.body.updateFromGameObject();
        };
        const syncPanelBody = () => {
            if (this.controlPanel.body) this.controlPanel.body.updateFromGameObject();
        };

        this.game.tweens.add({
            targets: [this.craneFlat],
            y: target.craneFlatY,
            duration,
            ease,
            onUpdate: syncCraneBody,
            onComplete: () => {
                syncCraneBody();
                liftControl.moving();
                this.moving = false;
                this._releaseRider();
            }
        });

        this.game.tweens.add({
            targets: [this.ropeTwo, this.ropeThree],
            y: target.ropeTwoY,
            duration,
            ease
        });

        this.game.tweens.add({
            targets: [this.rope],
            height: target.ropeHeight,
            duration,
            ease
        });

        this.game.tweens.add({
            targets: [this.controlPanel],
            y: target.controlPanelY,
            duration,
            ease,
            onUpdate: syncPanelBody,
            onComplete: syncPanelBody
        });
    }

}
