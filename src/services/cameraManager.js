export default class CameraManager {
    constructor(scene) {
        this.scene = scene;
        const { width, height } = this.scene.scale;
        const baseWidth = 1920;  // your default design width
        const baseHeight = 1080; // your default design height

        const zoomX = width / baseWidth;
        const zoomY = height / baseHeight;

        // const zoom = Math.min(zoomX, zoomY) + 5;
        const zoom = Math.min(zoomX, zoomY) + 3.5;

        this.scene.cameras.main.setZoom(zoom);

        this.scene.cameras.main.startFollow(this.scene.player, true, 0.1, 0.1, 0, 0);

        this.scene.cameras.main.removeBounds();
    }

}