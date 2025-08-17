export default class CameraManager {
    constructor(scene) {
        this.game = scene;
        const { width, height } = this.game.scale;
        const baseWidth = 1920;
        const baseHeight = 1080;

        const zoomX = width / baseWidth;
        const zoomY = height / baseHeight;

        const zoom = Math.min(zoomX, zoomY) + 3.5;

        this.game.cameras.main.setZoom(zoom);

        this.game.cameras.main.startFollow(this.game.player, true, 0.05, 0.05, 0, 0);

        this.game.cameras.main.removeBounds();
    }

}