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
import CraneManager from "../services/craneManager";

const batchSize = 100;
let currentIndex = 0;

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }

    async create() {
        this.lightColors = ["163,255,93", "228,163,32", "163,93,255", "253,196,124", '255,255,255'];
        this.renderDistance = 3;
        this.railRotate = 45;
        this.fadeSpeed = 200;
        this.renderviewDistance = 250;
        this.aboveGround = 20;
        this.chasmRange = [150, 160];
        this.tileSize = 10;
        this.playerSize = 0;
        this.gridSize = 200;
        this.width = this.tileSize * this.gridSize;
        this.height = this.tileSize * this.gridSize;
        this.dayCycleDuration = 60000 * 5;
        this.soilTypes = {
            1: {
                image: 'coal'
            },
            2: {
                image: 'wood'
            }
        }
        this.railTypes = {
            1: {
                id: 1,
                image: 'rail',
                rotate: this.railRotate
            },
            2: {
                id: 2,
                image: 'rail',
                rotate: -this.railRotate
            }
        }

        this.tileTypes = {
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
            },
            liftControl: {
                id: 7
            }
        }

        this.randomElements = [
            {
                tile: {
                    ...this.tileTypes.coal
                },
                widthRange: [2, 3],
                heightRange: [2, 3],
                count: 1000,
                layerWeights: [1, 0, 0, 0, 0, 0, 0],
                columnWeights: [0, 1, 0, 0, 0, 1, 0]
            },
            {
                tile: {
                    ...this.tileTypes.empty
                },
                widthRange: [5, 5],
                heightRange: [5, 5],
                count: 10000,
                layerWeights: [1, 1, 1, 1, 1, 1, 1]
            },
            {
                tile: {
                    ...this.tileTypes.liquid
                },
                widthRange: [2, 5],
                heightRange: [5, 10],
                count: 1000,
                layerWeights: [1, 0, 0, 0, 0, 0, 0],
                columnWeights: [0, 0, 0, 1, 0, 0, 0]
            }
        ];
        
        this.soilGroup = this.physics.add.staticGroup();
        this.buttressGroup = this.physics.add.staticGroup();
        this.craneGroup = this.physics.add.staticGroup();
        this.railGroup = this.add.group();
        this.glowStickGroup = this.physics.add.group();
        this.glowSticks = [];
        this.emptyGroup = this.add.group();
        this.lightGroup = this.add.group();
        this.liftControlGroup = this.physics.add.staticGroup();
        this.liquidGroup = this.physics.add.staticGroup();
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.controlsManager = new ControlsManager(this);


        this.toolBarManager = new ToolbarManager(this);
        this.inventoryManager = new InventoryManager(this);

        const pickaxe = new InventoryItem('pickaxe', null, 'Iron Pickaxe', 'tool', 'images/pickaxe.png', {interactsWith: [this.tileTypes.soil]});
        const glowStick = new InventoryItem('glowstick', null, 'Glow-stick', 'tool', 'images/glow-stick.png', {
            throwable: true,
            number: 100,
            limited: true
        });
        const lamp = new InventoryItem('lamp', {
            ...this.tileTypes.light,
            radius: 100,
            color: this.lightColors[1],
            neon: false
        }, 'Lamp', 'tool', 'images/lamp.png', {
            interactsWith: [{
                ...this.tileTypes.empty
            }],
            mustBeGroundedTo: {
                tiles: [this.tileTypes.soil, this.tileTypes.buttress],
                sides: ['left', 'above', 'below', 'right']
            },
            number: 50,
            limited: true,
            reclaimFrom: this.tileTypes.light
        });
        const liftControl = new InventoryItem('switch', {
            ...this.tileTypes.liftControl
        }, 'Switch', 'tool', 'images/switch-single.png', {
            interactsWith: [{
                ...this.tileTypes.empty
            }],
            mustBeGroundedTo: {
                tiles: [this.tileTypes.soil, this.tileTypes.buttress],
                sides: ['left', 'above', 'below', 'right']
            },
            number: 50,
            limited: true,
            reclaimFrom: this.tileTypes.liftControl
        });
        const mineCart = new InventoryItem('minecart', {
            ...this.tileTypes.liftControl
        }, 'Mine Cart', 'tool', 'images/mine-cart.png', {
            interactsWith: [{
                ...this.tileTypes.rail
            }],
            number: 1,
            limited: true,
            reclaimFrom: this.tileTypes.rail
        });
        const buttress = new InventoryItem('buttress', {...this.tileTypes.buttress}, 'Buttress', 'tool', 'images/buttress.png', {
            interactsWith: [this.tileTypes.empty, {
                ...this.tileTypes.soil,
                additionalChecks: {strength: 100}
            }], mustBeGroundedTo: {
                tiles: [this.tileTypes.soil, this.tileTypes.buttress],
                sides: ['left', 'above', 'below', 'right']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.buttress
        });

        const rail = new InventoryItem('rail', {...this.tileTypes.rail}, 'Rail', 'tool', 'images/rail.png', {
            interactsWith: [this.tileTypes.empty], mustBeGroundedTo: {
                tiles: [this.tileTypes.buttress, this.tileTypes.soil],
                sides: ['below']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.rail
        });

        const railDiagonalLeft = new InventoryItem('rail-left', {...this.tileTypes.rail, type: this.railTypes[1]}, 'Rail Left', 'tool', 'images/rail.png', {
            interactsWith: [this.tileTypes.empty], mustBeGroundedTo: {
                tiles: [this.tileTypes.buttress, this.tileTypes.soil],
                sides: ['below']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.rail
        }, {rotate: this.railRotate});

        const railDiagonalRight = new InventoryItem('rail-right', {...this.tileTypes.rail, type: this.railTypes[2]}, 'Rail Right', 'tool', 'images/rail.png', {
            interactsWith: [this.tileTypes.empty], mustBeGroundedTo: {
                tiles: [this.tileTypes.buttress, this.tileTypes.soil],
                sides: ['below']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.rail
        }, {rotate: -this.railRotate});

        this.entityChildren = [this.soilGroup, this.lightGroup, this.emptyGroup, this.liquidGroup, this.buttressGroup, this.railGroup, this.liftControlGroup];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }

        window.setTimeout(async () => {
            this.playerManager = new PlayerManager(this);
            this.cameraManager = new CameraManager(this);
            this.physics.add.collider(this.glowStickGroup, this.soilGroup);
            this.physics.add.collider(this.buttressGroup, this.player);
            this.physics.add.collider(this.buttressGroup, this.glowStickGroup);
            this.physics.add.collider(this.craneGroup, this.player);
            this.craneManager = new CraneManager(this);
            // this.physics.add.collider(this.player, this.glowStickGroup);
            this.toolBarManager = new ToolbarManager(this);
            this.defaultGravityY = this.player.body.gravity.y;
            this.uiManager = new UiManager(this);
            this.toolBarManager.addItemToSlot(0, pickaxe);
            this.toolBarManager.addItemToSlot(1, glowStick);
            this.toolBarManager.addItemToSlot(2, lamp);
            this.toolBarManager.addItemToSlot(3, buttress);
            this.toolBarManager.addItemToSlot(4, rail);
            this.toolBarManager.addItemToSlot(5, railDiagonalLeft);
            // this.toolBarManager.addItemToSlot(6, railDiagonalRight);
            // this.toolBarManager.addItemToSlot(6, liftControl);
            this.toolBarManager.addItemToSlot(6, mineCart);

            this.toolBarManager.setSelected(0);

            this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255", "253,196,124"];
            this.glowStickCol = 0;

            if (this.newGame) {
                await this.saveGame(this.user, this.grid);
            }
            this.checkBlocksInterval = this.time.addEvent({
                delay: 50,
                callback: () => {
                    // Option 1: If groups change rarely, you could cache this combined array externally.
                    // For now, we're computing it on every call.
                    const emptyChildren = this.emptyGroup.getChildren();
                    const lightChildren = this.lightGroup.getChildren();
                    const liquidChildren = this.liquidGroup.getChildren();
                    const railChildren = this.railGroup.getChildren();
                    // Combine arrays using spread syntax (more readable and possibly more optimized)
                    const softSoil = [...emptyChildren, ...lightChildren, ...liquidChildren, ...railChildren];
                    const total = softSoil.length;

                    // Process a batch of blocks using a for loop.
                    const max = Math.min(currentIndex + batchSize, total);
                    for (let i = currentIndex; i < max; i++) {
                        const block = softSoil[i];
                        if (block.tileRef?.checkState) {
                            block.tileRef.checkState();
                        }
                    }
                    currentIndex = (currentIndex + batchSize) >= total ? 0 : currentIndex + batchSize;
                },
                callbackScope: this,
                loop: true
            });
        });


    }

    getItemById(itemId) {
        // You could also import and use the itemRegistry directly.
        return itemRegistry.getItem(itemId);
    }

    async saveGame(user, gridData) {
        try {
            const compressedData = LZString.compressToUTF16(JSON.stringify(gridData));

            if (this.electronAPI?.isElectron) {
                await this.electronAPI.saveGame({grid: gridData, playerData: {x: this.player.x, y: this.player.y}});
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
                this.playerX = Math.round(data.playerData[0].x);
                this.playerY = Math.round(data.playerData[0].y);
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
            this.lightingManager.updateLighting(delta);
            this.interactableGroup = [...this.liftControlGroup.getChildren()];
            this.uiManager.updateUI();
            const playerOffset = 0;
            const playerX = this.player.x + playerOffset;
            const playerY = this.player.y + playerOffset;
            this.playerLight.setPosition(Math.round(playerX), Math.round(playerY));
            // this.craneManager.update();
            if (this.glowSticks.length) {
                this.glowSticks.forEach(glowStick => glowStick.update());
            }

        }
    }

}