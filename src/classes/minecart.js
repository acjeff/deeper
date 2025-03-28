import {getColorForPercentage} from "../services/colourManager";

const uuid = function () {
    return Math.random().toString(36).substr(2);
}

import MineCartUI from './minecartUI';

export class MineCart {
    constructor(scene, x, y) {
        this.game = scene;
        this.sprite = this.game.add.sprite(x, y, 'minecart');
        this.sprite.setDisplaySize(this.sprite.width * 0.1, this.sprite.height * 0.1);
        this.sprite.setDepth(-1);
        this.maxWeight = 1000;
        this.id = uuid();
        this.percentageFull = 0
        this.sprite.cartRef = this;
        this.game.mineCartGroup.add(this.sprite);

        this.directions = {
            left: false,
            top_left: false,
            bottom_left: false,
            right: true,
            top_right: true,
            bottom_right: true
        }

        this.moving = false;
        this.rotation = 0;
        this.goal = {
            x: x,
            y: y
        }
        this.inventory = {};
        this.percentageBarBacking = this.game.add.rectangle(this.sprite.x - this.sprite.width / 2, this.sprite.y, 1, 5, '0x232323');
        this.percentageBar = this.game.add.rectangle(this.sprite.x - this.sprite.width / 2, this.sprite.y, 1, 5 * this.percentageFull, '0xd78304');
        this.percentageBarBacking.setOrigin(1, 1);
        this.percentageBar.setOrigin(1, 1);
        this.percentageBarBacking.setDepth(9999999);
        this.percentageBar.setDepth(9999999);
        this.UI = new MineCartUI(this, this.sprite.x, this.sprite.y);
    }

    showCartMenu() {
    }

    toggleMoving() {
        this.moving = !this.moving;
        // if (!this.moving) {
        //     this.UI.show();
        // } else {
        //     this.UI.hide();
        // }
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

        let targetOriginY = 0.5;
        if (Phaser.Math.RadToDeg(this.rotation) === 45 || Phaser.Math.RadToDeg(this.rotation) === -45) {
            targetOriginY = 1;
        }

        let originTweenObj = {originY: this.sprite.originY || 0.5};

        this.game.tweens.add({
            targets: originTweenObj,
            originY: targetOriginY,
            duration: 500,
            ease: 'linear',
            onUpdate: () => {
                this.sprite.setOrigin(0.5, originTweenObj.originY);
            }
        });

        this.game.tweens.add({
            targets: this.sprite,
            rotation: this.rotation,
            duration: 500,
            ease: 'linear'
        });
    }

    setGoal(goal) {
        this.goal = goal;
    }

    update() {
        const step = 0.2;
        const dx = this.goal.x - this.sprite.x;
        this.UI.update();
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

        if (this.sprite.body) {
            this.sprite.body.updateFromGameObject();
        }

        let currentWeight = 0;
        Object.entries(this.inventory).forEach(([key, value]) => {
            currentWeight += this.game.tileTypes[key].weight * value;
        });
        this.currentWeight = currentWeight;
        this.percentageFull = currentWeight / this.maxWeight;
        this.percentageBar.x = this.sprite.x - (this.sprite.body.width / 2) - 1;
        this.percentageBar.y = this.sprite.y + 2;
        this.percentageBarBacking.x = this.sprite.x - (this.sprite.body.width / 2) - 1;
        this.percentageBarBacking.y = this.sprite.y + 2;
        this.percentageBarBacking.setOrigin(1, 1);
        this.percentageBar.setOrigin(1, 1);
        this.percentageBar.setFillStyle(getColorForPercentage(this.percentageFull));
        this.percentageBar.height = 5 * this.percentageFull;
        if (this.UI.container) {
            this.UI.container.setVisible(this.playerOver);
        }

    }

    destroy() {
        this.sprite.destroy();
    }
}
