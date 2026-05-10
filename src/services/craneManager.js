import LiftTerminal from './liftTerminal';

function degrees_to_radians(degrees) {
    let pi = Math.PI;
    return degrees * (pi / 180);
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
        let color = '#6b3e22'
        const width = (this.game.chasmRange[1] - this.game.chasmRange[0]) * 10;
        const platformX = (this.game.chasmRange[0] * 10) + width / 2;
        const platformY = (this.game.aboveGround * 10) + 10;
        this.platformWidth = width;
        // this.craneFlat = this.game.add.image(1500, 210, 'wood');
        this.craneFlat = this.game.add.image(platformX, platformY, 'wood');
        this.craneFlat.setDisplaySize(width - 15, 5);
        this.craneFlat.setDepth(3);
        this.game.craneGroup.add(this.craneFlat);

        this.leftStrut = this.game.add.image(this.game.chasmRange[0] * 10, 175, 'wood');
        this.leftStrut.setDisplaySize(3, 60);
        this.leftStrut.setDepth(-2);

        this.rightStrut = this.game.add.image(this.game.chasmRange[1] * 10, 175, 'wood');
        this.rightStrut.setDisplaySize(3, 60);
        this.rightStrut.setDepth(-2);

        this.topStrut = this.game.add.image(((this.game.chasmRange[0] * 10) + width / 2), (this.game.aboveGround * 10) - 50, 'wood');
        this.topStrut.setDisplaySize(width, 3);

        this.rope = this.game.add.rectangle((this.game.chasmRange[0] * 10) + (width / 2), 161, 1, 24, this.ropeColor);
        this.rope.setDepth(2);

        this.ropeTwo = this.game.add.rectangle((this.game.chasmRange[0] * 10) + 32, 190, 1, 50, this.ropeColor);
        this.ropeTwo.setRotation(degrees_to_radians(45))
        this.ropeTwo.setDepth(2);

        this.ropeThree = this.game.add.rectangle((this.game.chasmRange[1] * 10) - 32, 190, 1, 50, this.ropeColor);
        this.ropeThree.setRotation(degrees_to_radians(-45))
        this.ropeThree.setDepth(2);

        this.createControlPanel(platformX, platformY);

        // Snapshot initial visual state so "return to surface" via the
        // terminal lands the platform exactly back where it started.
        this.surfaceState = this._snapshotState();

        // Terminal owns rope length, resource count, and the level UI.
        this.liftTerminal = new LiftTerminal(this);
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
     * Per-frame upkeep. The platform's static body is tweened, but Phaser
     * Arcade has no concept of "moving platforms" — and the platform body is
     * only 5px thick, so when it ascends faster than collision resolution
     * can push the player, they tunnel through and fall below. To make
     * trips feel solid, carry the player along with the platform manually
     * on both up and down trips: zero their vertical velocity and pin their
     * sprite to the lift top whenever they're horizontally over it and not
     * actively jumping. Arcade's preUpdate copies the sprite into the body
     * each frame, so writing to `player.y` (not `body.y`) is what sticks.
     */
    update() {
        const lift = this.craneFlat;
        if (!lift?.body) {
            this._lastLiftBodyY = null;
            return;
        }

        const liftBodyY = lift.body.y;
        const prevLiftBodyY = this._lastLiftBodyY;
        this._lastLiftBodyY = liftBodyY;

        if (!this.moving) return;
        const player = this.game.player;
        if (!player?.body) return;

        const halfLiftW = lift.body.width / 2;
        const halfPlayerW = player.body.width / 2;
        const horizOverlap = Math.abs(player.x - lift.x) <= halfLiftW + halfPlayerW;
        if (!horizOverlap) return;

        // Player is jumping off — let Arcade physics take over.
        if (player.body.velocity.y < -10) return;

        const playerBottom = player.body.y + player.body.height;
        // Generous tolerance so a frame hitch (which can move the platform
        // many pixels in one tick) doesn't drop the player off the rig.
        const tolerance = 16;

        // Treat the player as "riding" if they were sitting on the platform
        // either before or after the tween's last position update. Either
        // bound catches the player whether the lift is rising into them or
        // dropping away beneath them.
        const wasOnTop = prevLiftBodyY != null && Math.abs(playerBottom - prevLiftBodyY) <= tolerance;
        const isOnTop = Math.abs(playerBottom - liftBodyY) <= tolerance;

        if (wasOnTop || isOnTop) {
            player.y = liftBodyY - player.body.height / 2;
            player.body.velocity.y = 0;
            return;
        }

        // Lift descended out from under a stationary player — close gaps up
        // to ~16px so a brief lag still ends with them standing on the
        // platform instead of in mid-air.
        const dy = prevLiftBodyY != null ? liftBodyY - prevLiftBodyY : 0;
        if (dy > 0) {
            const gap = liftBodyY - playerBottom;
            if (gap > 0 && gap <= 16 && player.body.velocity.y >= 0) {
                player.y = liftBodyY - player.body.height / 2;
                player.body.velocity.y = 0;
            }
        }
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
