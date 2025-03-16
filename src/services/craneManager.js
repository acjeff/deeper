function degrees_to_radians(degrees)
{
    let pi = Math.PI;
    return degrees * (pi/180);
}

export default class CraneManager {
    constructor(scene) {
        this.scene = scene;
        this.ropeColor = '0xffb2fd';
        const width = (window.chasmRange[1] - window.chasmRange[0]) * 10;
        // this.craneFlat = this.scene.add.image(1500, 210, 'wood');
        this.craneFlat = this.scene.add.image(((window.chasmRange[0] * 10) + width / 2), (window.aboveGround * 10) + 10, 'wood');
        this.craneFlat.setDisplaySize(width - 15, 5);
        this.scene.craneGroup.add(this.craneFlat);

        this.leftStrut = this.scene.add.image(window.chasmRange[0] * 10, 175, 'wood');
        this.leftStrut.setDisplaySize(3, 60);
        this.leftStrut.setDepth(-2);

        this.rightStrut = this.scene.add.image(window.chasmRange[1] * 10, 175, 'wood');
        this.rightStrut.setDisplaySize(3, 60);
        this.rightStrut.setDepth(-2);

        this.topStrut = this.scene.add.image(((window.chasmRange[0] * 10) + width / 2), (window.aboveGround * 10) - 50, 'wood');
        this.topStrut.setDisplaySize(width, 3);

        this.rope = this.scene.add.rectangle((window.chasmRange[0] * 10) + (width / 2), 161, 1, 24, this.ropeColor);
        this.rope.setDepth(-2);

        this.ropeTwo = this.scene.add.rectangle((window.chasmRange[0] * 10) + 32, 190, 1, 50, this.ropeColor);
        this.ropeTwo.setRotation(degrees_to_radians(45))
        this.ropeTwo.setDepth(-2);

        this.ropeThree = this.scene.add.rectangle((window.chasmRange[1] * 10) - 32, 190, 1, 50, this.ropeColor);
        this.ropeThree.setRotation(degrees_to_radians(-45))
        this.ropeThree.setDepth(-2);

        console.log(this.craneFlat, ' : crane flat');
    }

}