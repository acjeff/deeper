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
import MinimapManager from "../services/minimapManager";
import MapViewManager from "../services/mapViewManager";
import FogOfWar from "../services/fogOfWar";
import TreeTextureFactory from "../services/treeTextureFactory";
import BackgroundManager from "../services/backgroundManager";

const batchSize = 100;
let currentIndex = 0;

export default class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }

    async create() {
        this.lightColors = ["163,255,93", "255,210,140", "163,93,255", "253,196,124", '255,247,230'];
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
                strength: 1000,
                weight: 100,
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
            },
            tree: {
                id: 8
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
        this.mineCartGroup = this.physics.add.staticGroup();
        this.debrisGroup = this.physics.add.staticGroup();
        this.railGroup = this.add.group();
        this.glowStickGroup = this.physics.add.group();
        this.glowSticks = [];
        this.emptyGroup = this.add.group();
        this.lightGroup = this.add.group();
        this.treeGroup = this.add.group();
        this.treeTextures = new TreeTextureFactory(this);
        this.liftControlGroup = this.physics.add.staticGroup();
        // interactableGroup is just a stable alias for liftControlGroup —
        // physics.overlap accepts the Group directly, so no per-frame
        // array snapshot is needed.
        this.interactableGroup = this.liftControlGroup;
        this.liquidGroup = this.physics.add.staticGroup();
        this.lightingManager = new LightingManager(this);
        this.lightingManager.registerGroup(this.soilGroup);
        this.controlsManager = new ControlsManager(this);
        this.toolBarManager = new ToolbarManager(this);
        this.inventoryManager = new InventoryManager(this);

        const pickaxe = new InventoryItem('pickaxe', null, 'Iron Pickaxe', 'tool', 'images/pickaxe.png', {interactsWith: [this.tileTypes.soil]});
        const axe = new InventoryItem('axe', null, 'Iron Axe', 'tool', this.textures.exists('axe') ? this.textures.get('axe').getSourceImage().toDataURL() : 'images/pickaxe.png', {interactsWith: [this.tileTypes.tree]});
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
                tiles: [this.tileTypes.buttress, this.tileTypes.soil, this.tileTypes.rail],
                sides: ['below', 'left', 'right']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.rail
        });

        const railDiagonalLeft = new InventoryItem('rail-left', {...this.tileTypes.rail, type: this.railTypes[1]}, 'Rail Left', 'tool', 'images/rail.png', {
            interactsWith: [this.tileTypes.empty], mustBeGroundedTo: {
                tiles: [this.tileTypes.buttress, this.tileTypes.soil, this.tileTypes.rail],
                sides: ['below', 'left', 'right']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.rail
        }, {rotate: this.railRotate});

        const railDiagonalRight = new InventoryItem('rail-right', {...this.tileTypes.rail, type: this.railTypes[2]}, 'Rail Right', 'tool', 'images/rail.png', {
            interactsWith: [this.tileTypes.empty], mustBeGroundedTo: {
                tiles: [this.tileTypes.buttress, this.tileTypes.soil, this.tileTypes.rail],
                sides: ['below', 'left', 'right']
            }, number: 50, limited: true, reclaimFrom: this.tileTypes.rail
        }, {rotate: -this.railRotate});

        this.entityChildren = [this.soilGroup, this.lightGroup, this.emptyGroup, this.liquidGroup, this.buttressGroup, this.railGroup, this.liftControlGroup, this.treeGroup];
        this.mapService = new MapService(32, 16, this);
        if (this.newGame) {
            this.mapService.generateMap();
        }
        // Patch top-of-shaft wall switches into the grid for both new and
        // pre-existing saves so the player always has a "call lift to
        // surface" point at the very top.
        this.mapService.ensureSurfaceLiftControls();

        window.setTimeout(async () => {
            // Parallax backdrop sits underneath the world, behind every
            // gameplay tile and decoration. Created before the player so
            // its layers exist at scene scope when chunks first render.
            this.backgroundManager = new BackgroundManager(this);
            this.playerManager = new PlayerManager(this);
            this.cameraManager = new CameraManager(this);
            this.physics.add.collider(this.glowStickGroup, this.soilGroup);
            this.physics.add.collider(this.buttressGroup, this.player);
            this.physics.add.collider(this.buttressGroup, this.glowStickGroup);
            this.physics.add.collider(this.craneGroup, this.player);
            this.physics.add.collider(this.debrisGroup, this.soilGroup);
            this.physics.add.collider(this.debrisGroup, this.buttressGroup);
            this.physics.add.collider(this.debrisGroup, this.mineCartGroup, (debris, minecart) => {
                const _mineCart = minecart.cartRef;
                _mineCart.addMaterial(debris);
            });
            this.craneManager = new CraneManager(this);
            // this.physics.add.collider(this.player, this.glowStickGroup);
            this.toolBarManager = new ToolbarManager(this);
            this.defaultGravityY = this.player.body.gravity.y;
            this.fogOfWar = new FogOfWar(this.mapWidth, this.mapHeight);
            if (this.savedFog) {
                this.fogOfWar.deserialize(this.savedFog);
                this.savedFog = null;
            }
            this.fogRevealRadius = 12;
            this._lastFogRevealMs = 0;
            this.mapMarkers = this.savedMarkers || [];
            this.savedMarkers = null;
            this.uiManager = new UiManager(this);
            this.minimapManager = new MinimapManager(this);
            this.mapViewManager = new MapViewManager(this);
            this.toolBarManager.addItemToSlot(0, pickaxe);
            this.toolBarManager.addItemToSlot(1, axe);
            this.toolBarManager.addItemToSlot(2, lamp);
            this.toolBarManager.addItemToSlot(3, buttress);
            this.toolBarManager.addItemToSlot(4, rail);
            this.toolBarManager.addItemToSlot(5, railDiagonalLeft);
            // this.toolBarManager.addItemToSlot(6, liftControl);
            this.toolBarManager.addItemToSlot(6, mineCart);
            this.inventoryManager.addItem(railDiagonalRight);

            this.toolBarManager.setSelected(0);

            this.glowStickCols = ["163,255,93", "255,163,93", "163,93,255", "253,196,124"];
            this.glowStickCol = 0;

            if (this.newGame) {
                await this.saveGame(this.user, this.grid);
            }
            const checkGroups = [
                this.emptyGroup,
                this.lightGroup,
                this.liquidGroup,
                this.railGroup,
                this.soilGroup,
                this.buttressGroup,
            ];
            this.checkBlocksInterval = this.time.addEvent({
                delay: 50,
                callback: () => {
                    // Walk batchSize tiles across the groups in order without
                    // flattening into a new array each tick — the previous
                    // spread allocated and GC'd ~3000 array slots per 50ms.
                    let remaining = batchSize;
                    let cursor = currentIndex;
                    let total = 0;
                    for (let gi = 0; gi < checkGroups.length; gi++) {
                        const arr = checkGroups[gi].getChildren();
                        const len = arr.length;
                        total += len;
                        if (remaining <= 0) continue;
                        if (cursor >= len) {
                            cursor -= len;
                            continue;
                        }
                        const end = Math.min(cursor + remaining, len);
                        for (let i = cursor; i < end; i++) {
                            const block = arr[i];
                            if (block.tileRef?.checkState) {
                                block.tileRef.checkState();
                            }
                        }
                        remaining -= (end - cursor);
                        cursor = 0;
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
            const fog = this.fogOfWar?.serialize() || null;
            const markers = this.mapMarkers || [];

            if (this.electronAPI?.isElectron) {
                await this.electronAPI.saveGame({
                    grid: gridData,
                    playerData: {x: this.player.x, y: this.player.y},
                    fog,
                    markers,
                });
            } else {
                await this.saveGameToCloud(user, compressedData, fog, markers);
            }
        } catch (error) {
            console.error("Error saving game:", error);
        }
    }

    async saveGameToCloud(user, gridData, fog, markers) {
        if (!user) {
            console.error("User not authenticated");
            return;
        }

        const batch = writeBatch(db);

        const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
        const playerSaveRef = doc(db, "game_saves", user.uid, "player_data", "position");

        batch.set(gameSaveRef, {data: gridData});
        batch.set(playerSaveRef, {
            x: this.player.x,
            y: this.player.y,
            fog: fog || null,
            markers: markers || [],
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error saving data: ", error);
        }
    }

    revealFogAroundPlayer(time) {
        if (!this.fogOfWar || !this.player) return;
        if (time - this._lastFogRevealMs < 90) return;
        this._lastFogRevealMs = time;
        const tileSize = this.tileSize || 10;
        const tx = Math.floor(this.player.x / tileSize);
        const ty = Math.floor(this.player.y / tileSize);
        this.fogOfWar.revealCircle(tx, ty, this.fogRevealRadius);
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
            if (data.playerData && !data.newGame) {
                let positionDoc = null;
                if (Array.isArray(data.playerData) && data.playerData.length > 0) {
                    positionDoc = data.playerData.find(d => d.id === 'position') || data.playerData[0];
                } else if (typeof data.playerData === 'object') {
                    positionDoc = data.playerData;
                }
                if (positionDoc) {
                    if (positionDoc.x != null) this.playerX = Math.round(positionDoc.x);
                    if (positionDoc.y != null) this.playerY = Math.round(positionDoc.y);
                    if (positionDoc.fog) this.savedFog = positionDoc.fog;
                    if (Array.isArray(positionDoc.markers)) this.savedMarkers = positionDoc.markers;
                }
            }
            if (!data.newGame && data.fog) this.savedFog = data.fog;
            if (!data.newGame && Array.isArray(data.markers)) this.savedMarkers = data.markers;

            this.user = data.user;
        }
    }

    onSceneShutdown() {
        this.checkBlocksInterval.remove();
    }

    update(time, delta) {
        this.accumulatedTime += delta;
        if (this.player) {
            if (this.mineCartGroup.getChildren().length) {
                this.mineCartGroup.getChildren().forEach(mineCart => mineCart.cartRef.update());
            }
            // Crane runs first so the player's sprite + body Y are pinned
            // to the lift before handlePlayerMovement reads body.y to
            // place the head and tool sprites — otherwise the head lags
            // the player by one frame and produces visible stutter.
            this.craneManager?.update();
            this.controlsManager.handlePlayerMovement();
            this.playerManager.updateVisuals(time, delta);
            if (this.ambientMoteEmitter) {
                this.ambientMoteEmitter.setPosition(this.player.x, this.player.y - 8);
            }
            this.lightingManager.updateLighting(delta);
            this.backgroundManager?.update();
            this.uiManager.updateUI();
            this.revealFogAroundPlayer(time);
            this.minimapManager?.update(time);
            this.mapViewManager?.draw();
            if (this.glowSticks.length) {
                this.glowSticks.forEach(glowStick => glowStick.update());
            }

        }
    }

}