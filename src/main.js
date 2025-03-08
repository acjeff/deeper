import Phaser from "phaser";
import GameScene from "./scenes/GameScene.js";
import MenuScene from "./scenes/MenuScene";
import PreloadScene from "./scenes/PreloadScene";

window._renderDistance = 1;
window._tileSize = 10;
window._playerSize = 8;
window._gridSize = 200;
window._width = window._tileSize * window._gridSize;
window._height = window._tileSize * window._gridSize;
window._tileTypes = {
    empty: {
        id: 0
    },
    soil: {
        id: 1,
        strength: 200
    },
    water: {
        id: 2
    },
    stone: {
        id: 3
    },
    light: {
        id: 4
    }
}

window._randomElements = [
    {
        tile: {
            ...window._tileTypes.light,
            radius: 30
        },
        count: 1000,
        layerWeights: [10, 0, 0, 0, 0, 0, 0]
    },
    {
        tile: {
            ...window._tileTypes.empty
        },
        count: 1000,
        widthRange: [20, 30],
        heightRange: [20, 30],
        edgeNoiseChance: 0.5,
        layerWeights: [10, 0, 0, 0, 0, 0, 0]
    },
    {
        tile: {
            ...window._tileTypes.stone
        },
        count: 1000,
        widthRange: [10, 50],
        heightRange: [5, 5],
        layerWeights: [0, 10, 0, 0, 0, 0, 0]
    }];

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#000000",
    fps: {
        target: 60,  // ✅ Force 60 FPS
        forceSetTimeOut: false, // ✅ Ensure requestAnimationFrame is used
    },
    autoFocus: true, // ✅ Helps with background focus issues
    physics: {
        default: "arcade",
        arcade: {gravity: {y: 300}, debug: false, fps: 60}
    },
    // scene: [PreloadScene, GameScene],
    scene: [PreloadScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});