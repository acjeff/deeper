import Phaser from "phaser";
import GameScene from "./scenes/GameScene.js";
import MenuScene from "./scenes/MenuScene";
import PreloadScene from "./scenes/PreloadScene";

// Think about making water move in the save way that cave-ins but it destroys where it came from, so can be finite
// Delete caved: true from the object once cave in has happened
// Gas logic: gas moves similar to liquid but in all directions and also each time it moves it decreases it's density value until it fully vanishes

window.lightColors = ["163,255,93", "228,163,32", "163,93,255", "253,196,124", '255,255,255'];
window._renderDistance = 3;
window.railRotate = 45;
window.fadeSpeed = 200;
window.renderviewDistance = 250;
window.aboveGround = 20;
window.chasmRange = [150, 160];
window._tileSize = 10;
window._playerSize = 8;
window._gridSize = 200;
window._width = window._tileSize * window._gridSize;
window._height = window._tileSize * window._gridSize;
window._soilTypes = {
    1: {
        image: 'coal'
    },
    2: {
        image: 'wood'
    }
}
window._railTypes = {
    1: {
        id: 1,
        image: 'rail',
        rotate: window.railRotate
    },
    2: {
        id: 2,
        image: 'rail',
        rotate: -window.railRotate
    }
}

window._tileTypes = {
    empty: {
        id: 0
    },
    soil: {
        id: 1,
        strength: 200
    },
    coal: {
        id: 1,
        strength: 5000,
        type: 1
    },
    liquid: {
        id: 2
    },
    stone: {
        id: 3
    },
    light: {
        id: 4
    },
    buttress: {
        id: 5
    },
    rail: {
        id: 6
    }
}

window._randomElements = [
    {
        tile: {
            ...window._tileTypes.coal
        },
        widthRange: [2, 3],
        heightRange: [2, 3],
        count: 1000,
        layerWeights: [1, 0, 0, 0, 0, 0, 0],
        columnWeights: [0, 1, 0, 0, 0, 1, 0]
    },
    {
        tile: {
            ...window._tileTypes.empty
        },
        widthRange: [5, 5],
        heightRange: [5, 5],
        count: 10000,
        layerWeights: [1, 1, 1, 1, 1, 1, 1]
    }, {
        tile: {
            ...window._tileTypes.liquid
        },
        widthRange: [2, 5],
        heightRange: [5, 10],
        count: 1000,
        layerWeights: [1, 0, 0, 0, 0, 0, 0],
        columnWeights: [0, 0, 0, 1, 0, 0, 0]
    }
];

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
    scene: [PreloadScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});