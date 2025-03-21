import Phaser from "phaser";
import GameScene from "./scenes/GameScene.js";
import MenuScene from "./scenes/MenuScene";
import PreloadScene from "./scenes/PreloadScene";

// Think about making water move in the save way that cave-ins but it destroys where it came from, so can be finite
// Delete caved: true from the object once cave in has happened
// Gas logic: gas moves similar to liquid but in all directions and also each time it moves it decreases it's density value until it fully vanishes



const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#000000",
    pixelArt: true, // Ensures pixel art rendering
    antialias: false, // Disables default smoothing
    fps: {
        target: 30,  // ✅ Force 60 FPS
        forceSetTimeOut: false, // ✅ Ensure requestAnimationFrame is used
    },
    autoFocus: true, // ✅ Helps with background focus issues
    physics: {
        default: "arcade",
        arcade: {gravity: {y: 300}, debug: false, fps: 30}
    },
    scene: [PreloadScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});