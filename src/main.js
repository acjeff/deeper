import Phaser from "phaser";
import PreloadScene from "./scenes/PreloadScene.js";
import GameScene from "./scenes/GameScene.js";
window._tileSize = 10;
window._gridSize = 200;
window._width = window._tileSize * window._gridSize;
window._height = window._tileSize * window._gridSize;

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#422c16",
    physics: {
        default: "arcade",
        arcade: { gravity: { y: 300 }, debug: false }
    },
    scene: [PreloadScene, GameScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});