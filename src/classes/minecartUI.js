import {getColorForPercentage} from "../services/colourManager";

export default class MineCartUI {
    constructor(cart, x, y) {
        const game = cart.game;
        this.cart = cart;
        this.game = game;
        this.inventory = {};

        // 1) Create a container at position (x, y)
        this.container = game.add.container(x, y);

        // 2) Background rectangle (semi-transparent)
        //    We position it at (0,0) *inside* the container, so its coordinates are relative to the container.
        this.bg = game.add.rectangle(0, 0, 225, 115, 0x000000, 0.8);
        this.bg.setOrigin(0, 0); // top-left origin
        this.bg.setStrokeStyle(1, 0xffffff);
        this.container.add(this.bg);
        this.placeholders = {}

        for (let i = 0; i < 3; i++) {
            let xPos = 28 + i * (34 + 5); // First is 28, then 28 + 39, 28 + 78, etc.
            this.placeholders[i] = game.add.rectangle(xPos, 28, 34, 34, 0x212121, 0.8);
            this.container.add(this.placeholders[i]);
        }

        // // 3) Numeric label (e.g., "12")
        // this.amountText = game.add.text(10, 10, '12', {
        //     fontFamily: 'Arial',
        //     fontSize: '16px',
        //     color: '#ffffff'
        // });
        // this.container.add(this.amountText);
        //
        // // 4) Resource name (e.g., "Coal")
        // this.container.add(this.resourceName);
        //
        // // 5) Progress bar background
        this.progressBg = game.add.rectangle(10, 80, 110, 8, 0x212121);
        this.progressBg.setOrigin(0, 0);
        this.container.add(this.progressBg);
        //
        // // 6) Progress bar fill
        this.progressFill = game.add.rectangle(10, 80, 110 * this.cart.percentageFull, 8, getColorForPercentage(this.cart.percentageFull));
        this.progressFill.setOrigin(0, 0);
        this.container.add(this.progressFill);

        // 7) Progress text (e.g., "10 / 100")
        this.progressText = game.add.text(10, 95, `${this.cart.currentWeight}kg / ${this.cart.maxWeight}kg`, {
            fontSize: '11px',
            color: '#ffffff'
        });
        this.container.add(this.progressText);

        this.arrowRight = this.game.add.triangle(
            195, 45,
            0, 0, 7.5, 5, 0, 10,
            0xffffff,
            1
        );

        this.arrowRight.setInteractive(
            new Phaser.Geom.Triangle(0, 0, 7.5, 5, 0, 10),
            Phaser.Geom.Triangle.Contains
        );

        this.arrowRight.on('pointerdown', (e) => {
            console.log('Change direction');
            this.arrowLeft.setAlpha(0.3);
            this.arrowRight.setAlpha(1);
            cart.changeDirections({right: true})
        });

        this.container.add(this.arrowRight);

        this.arrowLeft = this.game.add.triangle(
            165, 45,
            0, 5, 7.5, 0, 7.5, 10,
            0xffffff,
            1
        );

        this.arrowLeft.setInteractive(
            new Phaser.Geom.Triangle(0, 5, 7.5, 0, 7.5, 10),
            Phaser.Geom.Triangle.Contains
        );

        this.arrowLeft.on('pointerdown', (e) => {
            console.log('Change direction');
            this.arrowRight.setAlpha(0.3);
            this.arrowLeft.setAlpha(1);
            cart.changeDirections({left: true})
        });

        this.container.add(this.arrowLeft);

        this.directionText = this.game.add.text(151, 70, 'Direction', {
            fontSize: '11px',
            color: '#ffffff'
        });
        this.container.add(this.directionText);

        this.line = this.game.add.line(0, 0, 140, 58, 140, 140, 0xe8e8e8, 1);
        this.line.strokeWidth = 2;
        this.container.add(this.line);

        if (cart.directions['left']) {
            this.arrowRight.setAlpha(0.3);
        } else {
            this.arrowLeft.setAlpha(0.3);
        }

        this.container.setScale(0.2);
        this.container.setDepth(99999999);
    }

    update() {
        this.setPosition(this.cart.sprite.x - this.cart.sprite.displayWidth / 2, this.cart.sprite.y + this.cart.sprite.displayHeight / 2 + 2);

        let index = 1;
        Object.entries(this.cart.inventory).forEach(([key, value], index) => {
            let xPos = 10 + index * (34 + 5);
            if (!this.inventory[key]) {
                this.inventory[`${key}_image`] = this.game.add.image(10, 10, key);
                this.inventory[`${key}_image`].setDisplaySize(35, 35);
                this.inventory[`${key}_image`].setOrigin(0, 0);
                this.inventory[`${key}_image`].setPosition(10, 10);
                this.inventory[`${key}_count`] = this.game.add.text(15, 15, value, {
                    fontSize: '11px',
                    color: '#ffffff'
                });
                this.inventory[key] = this.game.add.text(xPos, 50, key, {
                    fontSize: '11px',
                    color: '#ffffff'
                });
                this.container.add(this.inventory[key]);
                this.container.add(this.inventory[`${key}_image`]);
                this.container.add(this.inventory[`${key}_count`]);
            } else {
                this.inventory[`${key}_count`].setText(value);
            }
            index++;
        });
        this.progressFill.width = 110 * this.cart.percentageFull;
        this.progressFill.setFillStyle(getColorForPercentage(this.cart.percentageFull))
        this.progressText.setText(`${this.cart.currentWeight}kg / ${this.cart.maxWeight}kg`)

    }

    setPosition(x, y) {
        this.container.x = x;
        this.container.y = y;
    }

    // Show / hide the entire panel
    show() {
        this.container.setVisible(true);
    }

    hide() {
        this.container.setVisible(false);
    }

}