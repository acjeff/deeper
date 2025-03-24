const uuid = function () {
    return Math.random().toString(36).substr(2);
}

export class MineCart {
    constructor(scene, x, y) {
        this.game = scene;
        this.sprite = this.game.add.sprite(x, y, 'minecart');
        this.sprite.setDisplaySize(this.sprite.width * 0.1, this.sprite.height * 0.1);
        this.sprite.setOrigin(0.5, 0.7);
        this.id = uuid();
        this.game.mineCartGroup.push(this);
        this.directions = ['right', 'bottom_right', 'top_right'];
        this.moving = true;
        this.rotation = 0;
        this.goal = {
            x: x,
            y: y
        }
    }

    changeDirections(directions) {
        this.directions = directions;
    }

    setRotation(rotation) {
       this.rotation = rotation;
    }

    setGoal(goal) {
        this.goal = goal;
    }

    update() {
        if (this.goal && typeof this.goal.x === 'number' && typeof this.goal.y === 'number') {
            const step = 0.2;

            // Update x coordinate
            const dx = this.goal.x - this.sprite.x;
            if (Math.abs(dx) < step) {
                this.sprite.x = this.goal.x;
            } else {
                this.sprite.x += step * Math.sign(dx);
            }

            // Update y coordinate
            const dy = this.goal.y - this.sprite.y;
            if (Math.abs(dy) < step) {
                this.sprite.y = this.goal.y;
            } else {
                this.sprite.y += step * Math.sign(dy);
            }

            this.sprite.setRotation(this.rotation);
        }
    }

    destroy() {
        this.sprite.destroy();
    }
}
