function degrees_to_radians(degrees)
{
    let pi = Math.PI;
    return degrees * (pi/180);
}

export default class CraneManager {
    constructor(scene) {
        this.liftSpeed = 3000;
        this.game = scene;
        this.ropeColor = '0x6B3E22';
        let color = '#6b3e22'
        const width = (this.game.chasmRange[1] - this.game.chasmRange[0]) * 10;
        // this.craneFlat = this.game.add.image(1500, 210, 'wood');
        this.craneFlat = this.game.add.image(((this.game.chasmRange[0] * 10) + width / 2), (this.game.aboveGround * 10) + 10, 'wood');
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

    }

    moveTo(y, liftControl) {
        if (y + 5 > this.craneFlat.body.y) {
            liftControl.moving('down');
        } else if (y + 5 < this.craneFlat.body.y) {
            liftControl.moving('up');
        } else {
            liftControl.moving();
        }

        this.game.tweens.add({
            targets: [this.craneFlat],
            y: y + 7.4,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out',
            onComplete: () => liftControl.moving()
        });

        this.game.tweens.add({
            targets: [this.craneFlat.body],
            y: y + 5,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.ropeTwo, this.ropeThree],
            y: y - 10,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out'
        });

        this.game.tweens.add({
            targets: [this.rope],
            height: y - this.rope.y -15,
            duration: this.liftSpeed, // Duration in ms; adjust as needed
            ease: 'ease-out'
        });

    }

}