const uuid = function () {
    return Math.random().toString(36).substr(2);
}

export class MineCart {
    constructor(scene, x, y) {
        this.game = scene;
        this.sprite = this.game.add.sprite(x, y, 'minecart');
        this.sprite.setDisplaySize(this.sprite.width * 0.1, this.sprite.height * 0.1);
        this.maxWeight = 1000;
        // this.sprite.setOrigin(0.5, 0.7);

        this.id = uuid();
        this.percentageFull = 0
        this.sprite.cartRef = this;
        this.game.mineCartGroup.add(this.sprite);
        this.directions = ['right', 'bottom_right', 'top_right'];
        this.moving = true;
        this.rotation = 0;
        this.goal = {
            x: x,
            y: y
        }
        this.inventory = {};
        let col = '#232323'
        this.percentageBarBacking = this.game.add.rectangle(this.sprite.x - this.sprite.width / 2, this.sprite.y, 1, 5, '0x232323');
        this.percentageBar = this.game.add.rectangle(this.sprite.x - this.sprite.width / 2, this.sprite.y, 1, 5 * this.percentageFull, '0xd78304');
        this.percentageBarBacking.setOrigin(1, 1)
        this.percentageBar.setOrigin(1, 1)
        this.percentageBarBacking.setDepth(9999999)
        this.percentageBar.setDepth(9999999)
    }

    showCartMenu() {

    }

    changeDirections(directions) {
        this.directions = directions;
    }

    addMaterial(material) {
        let itemId, td = material.materialRef.tileDetails;
        Object.entries(this.game.tileTypes).forEach(([key, value]) => {
            if (value.id === td.id && value.type === td.type) {
                itemId = key;
            }
        });
        if (this.percentageFull < 1) {
            if (!this.inventory[itemId]) {
                this.inventory[itemId] = 1;
            } else {
                this.inventory[itemId]++;
            }
            material.destroy();
        }
    }

    setRotation(rotation) {
        this.rotation = rotation;
    }

    setGoal(goal) {
        this.goal = goal;
    }

    update() {
        const step = 0.2;
        const dx = this.goal.x - this.sprite.x;
        if (Math.abs(dx) < step) {
            this.sprite.x = this.goal.x;
        } else {
            this.sprite.x += step * Math.sign(dx);
        }

        const dy = this.goal.y - this.sprite.y;
        if (Math.abs(dy) < step) {
            this.sprite.y = this.goal.y;
        } else {
            this.sprite.y += step * Math.sign(dy);
        }

        this.sprite.setRotation(this.rotation);

        if (this.sprite.body) {
            this.sprite.body.updateFromGameObject();
        }

        let currentWeight = 0;
        Object.entries(this.inventory).forEach(([key, value]) => {
            currentWeight += this.game.tileTypes[key].weight * value;
        });
        this.percentageFull = currentWeight / this.maxWeight;
        this.percentageBar.height = 5 * this.percentageFull;
        this.percentageBar.x = this.sprite.x - (this.sprite.body.width / 2) - 1;
        this.percentageBar.y = this.sprite.y + 2;
        this.percentageBarBacking.x = this.sprite.x - (this.sprite.body.width / 2) - 1;
        this.percentageBarBacking.y = this.sprite.y + 2;
        this.percentageBarBacking.setOrigin(1, 1)
        this.percentageBar.setOrigin(1, 1)
    }

    destroy() {
        this.sprite.destroy();
    }
}
