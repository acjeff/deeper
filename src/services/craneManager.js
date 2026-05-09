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

        this.createPlatformButton(platformX, platformY);

        // Snapshot the platform's surface position so the on-platform button
        // can return the player to a pixel-perfect "back at the top" state.
        this.surfaceState = this._snapshotState();
        // Last activated wall-mounted lift point. Pressing the on-platform
        // button toggles between this and the surface.
        this.savedDeepState = null;
    }

    createPlatformButton(platformX, platformY) {
        // Lift-control spritesheet: frame 0 idle, 1 going up, 2 going down.
        this.platformButton = this.game.add.sprite(platformX, platformY - 7, 'lift-control');
        this.platformButton.setDisplaySize(this.game.tileSize, this.game.tileSize);
        this.platformButton.setDepth(4);
        this.platformButton.setFrame(0);
        this.game.liftControlGroup.add(this.platformButton);

        this.platformButton.tileRef = {
            callCrane: () => this.activatePlatformButton(),
            moving: (direction) => {
                if (direction === 'up') {
                    this.platformButton.setFrame(1);
                } else if (direction === 'down') {
                    this.platformButton.setFrame(2);
                } else {
                    this.platformButton.setFrame(0);
                }
            },
            // The hovered-block hooks expect these to exist on every tileRef.
            onMouseEnter: () => {},
            onMouseLeave: () => {},
            onClick: () => {}
        };
    }

    activatePlatformButton() {
        if (this.moving) return;
        const currentBodyY = this.craneFlat.body.y;
        let target;
        if (this.savedDeepState && Math.abs(currentBodyY - this.savedDeepState.craneFlatBodyY) > 1) {
            target = this.savedDeepState;
        } else if (Math.abs(currentBodyY - this.surfaceState.craneFlatBodyY) > 1) {
            target = this.surfaceState;
        } else {
            return;
        }
        this._moveCrane(target, this.platformButton.tileRef);
    }

    moveTo(y, liftControl) {
        const target = this._stateForDepth(y);
        // Remember any non-surface destination so the on-platform button can
        // bring the player back to it after returning to the top.
        if (Math.abs(target.craneFlatBodyY - this.surfaceState.craneFlatBodyY) > 1) {
            this.savedDeepState = target;
        }
        this._moveCrane(target, liftControl);
    }

    _snapshotState() {
        return {
            craneFlatY: this.craneFlat.y,
            craneFlatBodyY: this.craneFlat.body.y,
            ropeTwoY: this.ropeTwo.y,
            ropeThreeY: this.ropeThree.y,
            ropeHeight: this.rope.height,
            platformButtonY: this.platformButton.y,
            platformButtonBodyY: this.platformButton.body ? this.platformButton.body.y : this.platformButton.y
        };
    }

    _stateForDepth(y) {
        return {
            craneFlatY: y + 7.4,
            craneFlatBodyY: y + 5,
            ropeTwoY: y - 10,
            ropeThreeY: y - 10,
            ropeHeight: y - this.rope.y - 15,
            platformButtonY: y + 7.4 - 7,
            platformButtonBodyY: y + 5 - 7
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
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out',
            onComplete: () => {
                liftControl.moving();
                this.moving = false;
            }
        });

        this.game.tweens.add({
            targets: [this.craneFlat.body],
            y: target.craneFlatBodyY,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.ropeTwo, this.ropeThree],
            y: target.ropeTwoY,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.rope],
            height: target.ropeHeight,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.platformButton],
            y: target.platformButtonY,
            duration: this.liftSpeed,
            ease: 'ease-out'
        });

        if (this.platformButton.body) {
            this.game.tweens.add({
                targets: [this.platformButton.body],
                y: target.platformButtonBodyY,
                duration: this.liftSpeed,
                ease: 'ease-out'
            });
        }
    }

}
