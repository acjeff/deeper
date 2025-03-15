import MapService from "../services/map";
import LightingManager from "../services/lighting";
import {db, doc, writeBatch} from "../firebaseconfig.js";
import LZString from "lz-string";
import ControlsManager from "../services/controls";
import CameraManager from "../services/cameraManager";
import PlayerManager from "../services/playerManager";
import UiManager from "../services/uiManager";
import ToolbarManager from "../services/toolBarManager";
import InventoryManager from "../services/InventoryManager";
import InventoryItem from "../classes/InventoryItem";

const batchSize = 100;
let currentIndex = 0;

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }

    async create() {
        this.tileSize = window._tileSize;
        this.playerSize = window._playerSize;
        this.soilGroup = this.physics.add.staticGroup();
        this.buttressGroup = this.physics.add.staticGroup();
        this.glowStickGroup = this.physics.add.group();
        this.glowSticks = [];
        this.emptyGroup = this.add.group();
        this.lightGroup = this.add.group();
        this.liquidGroup = this.physics.add.staticGroup();
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.controlsManager = new ControlsManager(this);


        this.toolBarManager = new ToolbarManager(this);
        this.inventoryManager = new InventoryManager(this);

        const pickaxe = new InventoryItem('1', 'Iron Pickaxe', 'tool', 'images/pickaxe.png', {interactsWith: [window._tileTypes.soil]});
        const glowStick = new InventoryItem('2', 'Glow-stick', 'tool', 'images/glow-stick.png', {
            throwable: true,
            number: 100,
            limited: true
        });
        const lamp = new InventoryItem('3', 'Lamp', 'tool', 'images/lamp.png', {
            interactsWith: [{
                ...window._tileTypes.empty
            }],
            mustBeGroundedTo: {
                tiles: [window._tileTypes.soil, window._tileTypes.buttress],
                sides: ['left', 'above', 'below', 'right']
            },
            number: 50,
            limited: true,
            reclaimFrom: window._tileTypes.light
        });
        const coal = new InventoryItem('4', 'Coal', 'material', 'images/coal.png');
        const wood = new InventoryItem('5', 'Wood', 'material', 'images/wood.png');
        const buttress = new InventoryItem('6', 'Buttress', 'tool', 'images/buttress.png', {
            interactsWith: [window._tileTypes.empty, {
                ...window._tileTypes.soil,
                additionalChecks: {strength: 100}
            }], mustBeGroundedTo: {
                tiles: [window._tileTypes.soil, window._tileTypes.buttress],
                sides: ['left', 'above', 'below', 'right']
            }, number: 50, limited: true, reclaimFrom: window._tileTypes.buttress
        });

        this.inventoryManager.addItem(coal);
        this.inventoryManager.addItem(wood);

        this.entityChildren = [this.soilGroup, this.lightGroup, this.emptyGroup, this.liquidGroup, this.buttressGroup];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }

        window.setTimeout(async () => {
            this.playerManager = new PlayerManager(this);
            this.cameraManager = new CameraManager(this);
            this.physics.add.collider(this.glowStickGroup, this.soilGroup);
            this.physics.add.collider(this.buttressGroup, this.player);
            // this.physics.add.collider(this.player, this.glowStickGroup);
            this.toolBarManager = new ToolbarManager(this);
            this.defaultGravityY = this.player.body.gravity.y;
            this.uiManager = new UiManager(this);
            this.toolBarManager.addItemToSlot(0, pickaxe);
            this.toolBarManager.addItemToSlot(1, glowStick);
            this.toolBarManager.addItemToSlot(2, lamp);
            this.toolBarManager.addItemToSlot(3, buttress);
            this.toolBarManager.setSelected(0);

            this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255", "253,196,124"];
            this.glowStickCol = 0;

            if (this.newGame) {
                await this.saveGame(this.user, this.grid);
            }
            this.checkBlocksInterval = this.time.addEvent({
                delay: 5000,
                callback: () => {
                    requestAnimationFrame(() => {
                        // Iterate over every chunk in the grid.
                        Object.keys(this.grid).forEach(chunkKey => {
                            const chunk = this.grid[chunkKey];
                            // Loop over each cell in the chunk.
                            chunk.forEach((row, cellY) => {
                                row.forEach((cell, cellX) => {
                                    // If the cell has a tileRef with a checkState method, call it.
                                    const [chunkStartX, chunkStartY] = chunkKey.split("_").map(Number);
                                    const worldX = (chunkStartX + cellX) * this.game.tileSize;
                                    const worldY = (chunkStartY + cellY) * this.game.tileSize;
                                    this.checkState(worldX, worldY, cell);
                                });
                            });
                        });
                    });
                },
                callbackScope: this,
                loop: true
            });

            // this.checkBlocksInterval = this.time.addEvent({
            //     delay: 50,
            //     callback: () => {
            //         requestAnimationFrame(() => {
            //             let processed = 0;
            //             let softSoil = this.emptyGroup.getChildren().concat(this.lightGroup.getChildren()).concat(this.liquidGroup.getChildren());
            //             while (processed < batchSize && currentIndex < softSoil.length) {
            //                 const block = softSoil[currentIndex];
            //                 if (block.tileRef?.checkState) block.tileRef?.checkState();
            //                 currentIndex++;
            //                 processed++;
            //             }
            //             if (currentIndex >= softSoil.length) {
            //                 currentIndex = 0;
            //             }
            //         })
            //     },
            //     callbackScope: this,
            //     loop: true
            // });
        });


    }

    checkState(worldX, worldY, _tileDetails) {
        const adjacentBlocks = this.mapService.getAdjacentGridCells(worldX, worldY);
        const blockAbove = adjacentBlocks?.above;
        const blockBelow = adjacentBlocks?.below;
        const blockLeft = adjacentBlocks?.left;
        const blockRight = adjacentBlocks?.right;
        let tileDetails;
        if (_tileDetails.id !== 2 && _tileDetails.id !== 5) {
            if (blockAbove && blockAbove.tileRef?.tileDetails?.id === 1 && blockAbove.tileRef?.tileDetails?.strength === 100) {
                tileDetails = {
                    ...window._tileTypes.soil,
                    strength: 100,
                    caved: true
                };
            }
        }
        if (_tileDetails.id === 2) {
            if (blockBelow && (blockBelow.tileRef?.tileDetails?.id === 0 || blockBelow.tileRef?.tileDetails?.id === 4)) {
                tileDetails = {...window._tileTypes.empty};

                this.mapService.setTile(blockBelow.tileRef?.worldX, blockBelow.tileRef?.worldY, {
                    ...window._tileTypes.liquid
                }, blockBelow);
                //     FOR MOVING LEFT AND RIGHT SAVE THE LAST DIRECTION AND PRIORITISE
            } else if (blockLeft && (blockLeft.tileRef?.tileDetails?.id === 0 || blockLeft.tileRef?.tileDetails?.id === 4) && _tileDetails?.lm === 'left') {
                tileDetails = {...window._tileTypes.empty};

                this.mapService.setTile(blockLeft.tileRef?.worldX, blockLeft.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'left'
                }, blockLeft);
            } else if (blockRight && (blockRight.tileRef?.tileDetails?.id === 0 || blockRight.tileRef?.tileDetails?.id === 4) && _tileDetails?.lm === 'right') {
                tileDetails = {...window._tileTypes.empty};

                this.mapService.setTile(blockRight.tileRef?.worldX, blockRight.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'right'
                }, blockRight);
            } else if (blockLeft && (blockLeft.tileRef?.tileDetails?.id === 0 || blockLeft.tileRef?.tileDetails?.id === 4)) {
                tileDetails = {...window._tileTypes.empty};
                this.mapService.setTile(blockLeft.tileRef?.worldX, blockLeft.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'left'
                }, blockLeft);
            } else if (blockRight && (blockRight.tileRef?.tileDetails?.id === 0 || blockRight.tileRef?.tileDetails?.id === 4)) {
                tileDetails = {...window._tileTypes.empty};
                this.mapService.setTile(blockRight.tileRef?.worldX, blockRight.tileRef?.worldY, {
                    ...window._tileTypes.liquid,
                    lm: 'right'
                }, blockRight);
            }
        }

        if (tileDetails) {
            if (_tileDetails.id !== 0) {
                tileDetails.trapped = _tileDetails;
            }
            this.mapService.setTile(worldX, worldY, tileDetails, this.sprite);
        }
    }

    getItemById(itemId) {
        // You could also import and use the itemRegistry directly.
        return itemRegistry.getItem(itemId);
    }

    async saveGame(user, gridData) {
        try {
            const compressedData = LZString.compressToUTF16(JSON.stringify(gridData));

            if (window.electronAPI?.isElectron) {
                await window.electronAPI.saveGame({grid: gridData, playerData: {x: this.player.x, y: this.player.y}});
                this.saveButton.disabled = true;
                this.saveButton.innerHTML = "Saved";
                window.setTimeout(async () => {
                    this.saveButton.disabled = false;
                    this.saveButton.innerHTML = "Save Game";
                }, 150)
            } else {
                await this.saveGameToCloud(user, compressedData);
            }
        } catch (error) {
            console.error("Error saving game:", error);
        }

        this.saveButton.innerHTML = "Save Game";
        this.saveButton.disabled = false;
    }

    async saveGameToCloud(user, gridData) {
        if (!user) {
            console.error("User not authenticated");
            return;
        }

        const batch = writeBatch(db);

        const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
        const playerSaveRef = doc(db, "game_saves", user.uid, "player_data", "position");

        batch.set(gameSaveRef, {data: gridData});
        batch.set(playerSaveRef, {x: this.player.x, y: this.player.y});

        try {
            await batch.commit(); // Execute the batch write
        } catch (error) {
            console.error("Error saving data: ", error);
        }
    }

    convertValuesToStrings(obj) {
        if (typeof obj !== "object" || obj === null) {
            return String(obj); // Convert primitive values
        }

        if (Array.isArray(obj)) {
            return obj.map(this.convertValuesToStrings); // Convert each element in an array
        }

        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, this.convertValuesToStrings(value)])
        );
    }

    init(data) {
        if (Object.keys(data).length) {
            if (!data.newGame) {
                this.grid = data.grid;
            }

            this.newGame = data.newGame;
            if (data.playerData?.length > 0 && !data.newGame) {
                this.playerX = data.playerData[0].x;
                this.playerY = data.playerData[0].y;
            }

            this.user = data.user;
        }
    }

    onSceneShutdown() {
        this.checkBlocksInterval.remove();
    }

    update(time, delta) {
        if (this.player) {
            this.controlsManager.handlePlayerMovement();
            this.lightingManager.updateLighting();
            this.controlsManager.getInteractableBlock(15);
            this.uiManager.updateUI();
            if (this.glowSticks.length) {
                this.glowSticks.forEach(glowStick => glowStick.update());
            }

        }
    }

}