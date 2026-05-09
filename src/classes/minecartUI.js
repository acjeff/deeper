import {getColorForPercentage} from "../services/colourManager";

export default class MineCartUI {
    constructor(cart, x, y) {
        const game = cart.game;
        this.cart = cart;
        this.game = game;
        this.inventory = {};

        // 1) Create a container at position (x, y)
        this.container = game.add.container(x, y);

        // 2) Background rectangle with cyberpunk styling
        this.bg = game.add.rectangle(0, 0, 260, 135, 0x000000, 0.9);
        this.bg.setOrigin(0, 0); // top-left origin
        this.bg.setStrokeStyle(2, 0x00ffff);
        this.container.add(this.bg);
        
        // Add inner glow effect
        this.innerGlow = game.add.rectangle(2, 2, 256, 131, 0x00ffff, 0.1);
        this.innerGlow.setOrigin(0, 0);
        this.container.add(this.innerGlow);
        
        this.placeholders = {}

        for (let i = 0; i < 3; i++) {
            let xPos = 35 + i * (40 + 8); // Better spacing
            this.placeholders[i] = game.add.rectangle(xPos, 35, 40, 40, 0x000000, 0.8);
            this.placeholders[i].setStrokeStyle(1, 0x00ffff);
            this.container.add(this.placeholders[i]);
        }

        // Progress bar background with cyberpunk styling
        this.progressBg = game.add.rectangle(15, 95, 130, 12, 0x000000);
        this.progressBg.setOrigin(0, 0);
        this.progressBg.setStrokeStyle(1, 0x00ffff);
        this.container.add(this.progressBg);
        
        // Progress bar fill with neon effect
        this.progressFill = game.add.rectangle(15, 95, 130 * this.cart.percentageFull, 12, getColorForPercentage(this.cart.percentageFull));
        this.progressFill.setOrigin(0, 0);
        this.container.add(this.progressFill);

        // Progress text with cyberpunk styling
        this.progressText = game.add.text(15, 112, `${this.cart.currentWeight}kg / ${this.cart.maxWeight}kg`, {
            fontSize: '11px',
            color: '#00ffff',
            fontFamily: 'monospace',
            fontStyle: 'bold'
        });
        this.container.add(this.progressText);

        // Direction arrows with cyberpunk styling
        this.arrowRight = this.game.add.triangle(
            210, 55,
            0, 0, 10, 7, 0, 14,
            0x00ffff,
            1
        );
        this.arrowRight.setStrokeStyle(1, 0x000000);

        this.arrowRight.setInteractive(
            new Phaser.Geom.Triangle(0, 0, 10, 7, 0, 14),
            Phaser.Geom.Triangle.Contains
        );

        this.arrowRight.on('pointerdown', (e) => {
            this.arrowLeft.setAlpha(0.3);
            this.arrowRight.setAlpha(1);
            cart.changeDirections({right: true})
        });

        this.container.add(this.arrowRight);

        this.arrowLeft = this.game.add.triangle(
            180, 55,
            0, 7, 10, 0, 10, 14,
            0x00ffff,
            1
        );
        this.arrowLeft.setStrokeStyle(1, 0x000000);

        this.arrowLeft.setInteractive(
            new Phaser.Geom.Triangle(0, 7, 10, 0, 10, 14),
            Phaser.Geom.Triangle.Contains
        );

        this.arrowLeft.on('pointerdown', (e) => {
            this.arrowRight.setAlpha(0.3);
            this.arrowLeft.setAlpha(1);
            cart.changeDirections({left: true})
        });

        this.container.add(this.arrowLeft);

        // Direction text with cyberpunk styling
        this.directionText = this.game.add.text(165, 80, 'DIRECTION', {
            fontSize: '10px',
            color: '#00ffff',
            fontFamily: 'monospace',
            fontStyle: 'bold'
        });
        this.container.add(this.directionText);

        // Separator line with cyberpunk styling
        this.line = this.game.add.line(0, 0, 150, 65, 150, 150, 0x00ffff, 1);
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
            let xPos = 15 + index * (40 + 8);
            if (!this.inventory[key]) {
                this.inventory[`${key}_image`] = this.game.add.image(15, 15, key);
                this.inventory[`${key}_image`].setDisplaySize(40, 40);
                this.inventory[`${key}_image`].setOrigin(0, 0);
                this.inventory[`${key}_image`].setPosition(15, 15);
                
                // Item count with cyberpunk styling
                this.inventory[`${key}_count`] = this.game.add.text(22, 22, value, {
                    fontSize: '11px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 2
                });
                
                // Item name with cyberpunk styling
                this.inventory[key] = this.game.add.text(xPos, 60, key.toUpperCase(), {
                    fontSize: '10px',
                    color: '#00ffff',
                    fontFamily: 'monospace',
                    fontStyle: 'bold'
                });
                this.container.add(this.inventory[key]);
                this.container.add(this.inventory[`${key}_image`]);
                this.container.add(this.inventory[`${key}_count`]);
            } else {
                this.inventory[`${key}_count`].setText(value);
            }
            index++;
        });
        
        // Update progress bar with neon glow
        this.progressFill.width = 130 * this.cart.percentageFull;
        this.progressFill.setFillStyle(getColorForPercentage(this.cart.percentageFull));
        this.progressText.setText(`${this.cart.currentWeight}kg / ${this.cart.maxWeight}kg`);
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