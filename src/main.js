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
    empty: '0',
    soil: '1',
    water: '3',
    stone: '4'
}

window._randomElements = [
    {
        id: window._tileTypes.empty,
        count: 10000
    },
    {
        id: window._tileTypes.empty,
        count: 100000,
        widthRange: [20, 30],
        heightRange: [20, 30],
        edgeNoiseChance: 0.5,
        layerWeights: [10,0,0,0,0,0,0]
    },
    {
        id: window._tileTypes.stone,
        count: 100000,
        widthRange: [10, 150],
        heightRange: [5, 5],
        layerWeights: [0,10,0,0,0,0,0]
    }];

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#422c16",
    physics: {
        default: "arcade",
        arcade: {gravity: {y: 300}, debug: false}
    },
    scene: [PreloadScene, GameScene],
    // scene: [PreloadScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});