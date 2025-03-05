export default class LightingSystem {
    constructor(game, player, mapService) {
        this.game = game;
        this.player = player;
        this.mapService = mapService;

        // Enable the lighting system
        this.game.lights.enable();
        this.game.lights.setAmbientColor(0x222222); // Soft ambient light

        // Create the player's light
        this.playerLight = this.game.lights.addLight(player.x, player.y, 250, 0xffffff, 3);

        // Light source list (dynamic lights in the world)
        this.dynamicLights = [];

        // Attach lights to objects
        this.addDynamicLights();

        // Update the light mask dynamically
        this.updateLighting();
    }

    addDynamicLights() {
        // Add lights at random open spaces
        this.game.openSpaces.forEach((pos, index) => {
            if (index % 50 === 0) { // Add a light every 50 open spaces
                let newLight = this.game.lights.addLight(pos.x, pos.y, 200, 0x22ffff, 2);
                this.dynamicLights.push(newLight);
            }
        });
    }

    updateLighting() {
        // Keep player's light centered on them
        this.playerLight.x = this.player.x;
        this.playerLight.y = this.player.y;

        // Update the lights inside loaded chunks
        this.updateChunkLighting();
    }

    updateChunkLighting() {
        // Get loaded chunk bounds
        let { minX, minY, width, height } = this.getLoadedChunkBounds();

        // Remove lights outside the loaded chunks
        this.dynamicLights = this.dynamicLights.filter(light => {
            return light.x >= minX && light.x <= minX + width &&
                light.y >= minY && light.y <= minY + height;
        });

        // Add new lights for chunks that were just loaded
        this.game.openSpaces.forEach(pos => {
            if (!this.dynamicLights.some(light => light.x === pos.x && light.y === pos.y)) {
                let newLight = this.game.lights.addLight(pos.x, pos.y, 180, 0xffaa00, 2);
                this.dynamicLights.push(newLight);
            }
        });
    }

    getLoadedChunkBounds() {
        if (this.game.loadedChunks.size === 0) return { minX: 0, minY: 0, width: this.game.scale.width, height: this.game.scale.height };

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (let key of this.game.loadedChunks.keys()) {
            let [cx, cy] = key.split('_').map(Number);

            let chunkStartX = cx * this.game.tileSize;
            let chunkStartY = cy * this.game.tileSize;
            let chunkEndX = chunkStartX + this.game.chunkSize * this.game.tileSize;
            let chunkEndY = chunkStartY + this.game.chunkSize * this.game.tileSize;

            minX = Math.min(minX, chunkStartX);
            minY = Math.min(minY, chunkStartY);
            maxX = Math.max(maxX, chunkEndX);
            maxY = Math.max(maxY, chunkEndY);
        }

        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}
