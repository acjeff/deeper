export default class CraneManager {
    constructor(scene) {
        this.scene = scene;
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

        this.rope = this.scene.add.image((window.chasmRange[0] * 10) + (width / 2), 180, 'wood');
        this.rope.setDisplaySize(1, 65);
        this.rope.setDepth(-2);

        console.log(this.craneFlat, ' : crane flat');
    }

}