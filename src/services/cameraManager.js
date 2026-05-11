export default class CameraManager {
    constructor(scene) {
        this.game = scene;
        const { width, height } = this.game.scale;
        const baseWidth = 1920;
        const baseHeight = 1080;

        const zoomX = width / baseWidth;
        const zoomY = height / baseHeight;

        // Snap to integer zoom — fractional zooms map integer-positioned
        // tiles onto fractional screen pixels, which produces 1-pixel
        // seams between adjacent tiles whenever the camera is mid-scroll
        // (most visibly during the lift's smooth Y tween).
        const zoom = Math.max(1, Math.round(Math.min(zoomX, zoomY) + 3.5));

        this.game.cameras.main.setZoom(zoom);

        this.game.cameras.main.startFollow(this.game.player, true, 0.05, 0.05, 0, 0);

        this.game.cameras.main.removeBounds();
    }

}