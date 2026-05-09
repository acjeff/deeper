import LiftTerminal from './liftTerminal';

function degrees_to_radians(degrees) {
    let pi = Math.PI;
    return degrees * (pi / 180);
}

export default class CraneManager {
    constructor(scene) {
        this.liftSpeed = 3000;
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
            callCrane: () => this.liftTerminal.toggle(),
            moving: (direction) => {
                if (direction === 'up') this.controlPanel.setFrame(1);
                else if (direction === 'down') this.controlPanel.setFrame(2);
                else this.controlPanel.setFrame(0);
            },
            // The hovered-block hooks expect these on every tileRef.
            onMouseEnter: () => {},
            onMouseLeave: () => {},
            onClick: () => {}
        };
    }

    surfaceWorldY() {
        return this.surfaceState.craneFlatBodyY - 5;
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

        this.game.tweens.add({
            targets: [this.craneFlat],
            y: target.craneFlatY,
            duration: this.liftSpeed,
            ease: 'ease-out',
            onComplete: () => {
                liftControl.moving();
                this.moving = false;
            }
        });

        this.game.tweens.add({
            targets: [this.craneFlat.body],
            y: target.craneFlatBodyY,
            duration: this.liftSpeed,
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.ropeTwo, this.ropeThree],
            y: target.ropeTwoY,
            duration: this.liftSpeed,
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.rope],
            height: target.ropeHeight,
            duration: this.liftSpeed,
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.controlPanel],
            y: target.controlPanelY,
            duration: this.liftSpeed,
            ease: 'ease-out'
        });

        if (this.controlPanel.body) {
            this.game.tweens.add({
                targets: [this.controlPanel.body],
                y: target.controlPanelBodyY,
                duration: this.liftSpeed,
                ease: 'ease-out'
            });
        }
    }

}
