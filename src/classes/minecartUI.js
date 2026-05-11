import {getColorForPercentage} from "../services/colourManager";

// Pip-Boy phosphor palette — matches the lift terminal, inventory window,
// and tool wheel so the cart UI reads as the same in-world device.
const PIP_GREEN = 0x33ff33;
const PIP_DIM = 0x1a8a1a;
const PIP_BG = 0x001a00;
const PIP_GREEN_CSS = '#33ff33';
const PIP_DIM_CSS = '#1a8a1a';
const PIP_FONT = '"VT323", "Share Tech Mono", monospace';

const TITLE_STYLE = {
    fontSize: '12px',
    color: PIP_GREEN_CSS,
    fontFamily: PIP_FONT,
    shadow: { color: PIP_GREEN_CSS, fill: false, offsetX: 0, offsetY: 0, blur: 4 },
};

const LABEL_STYLE = {
    fontSize: '10px',
    color: PIP_DIM_CSS,
    fontFamily: PIP_FONT,
    shadow: { color: PIP_GREEN_CSS, fill: false, offsetX: 0, offsetY: 0, blur: 2 },
};

const VALUE_STYLE = {
    fontSize: '11px',
    color: PIP_GREEN_CSS,
    fontFamily: PIP_FONT,
    shadow: { color: PIP_GREEN_CSS, fill: false, offsetX: 0, offsetY: 0, blur: 3 },
};

const COUNT_STYLE = {
    fontSize: '11px',
    color: PIP_GREEN_CSS,
    fontFamily: PIP_FONT,
    stroke: '#000000',
    strokeThickness: 2,
    shadow: { color: PIP_GREEN_CSS, fill: false, offsetX: 0, offsetY: 0, blur: 3 },
};

export default class MineCartUI {
    constructor(cart, x, y) {
        const game = cart.game;
        this.cart = cart;
        this.game = game;
        this.inventory = {};

        this.container = game.add.container(x, y);

        // Outer phosphor frame — solid green border, dark green-tinted
        // background so the panel sits like a CRT readout above the cart.
        this.bg = game.add.rectangle(0, 0, 260, 135, PIP_BG, 0.92);
        this.bg.setOrigin(0, 0);
        this.bg.setStrokeStyle(2, PIP_GREEN);
        this.container.add(this.bg);

        // Subtle inset glow so the whole panel reads as lit phosphor.
        this.innerGlow = game.add.rectangle(2, 2, 256, 131, PIP_GREEN, 0.05);
        this.innerGlow.setOrigin(0, 0);
        this.container.add(this.innerGlow);

        // Top divider + title strip so the panel looks like a terminal
        // readout instead of a floating tooltip.
        this.titleBar = game.add.rectangle(0, 0, 260, 16, PIP_GREEN, 0.12);
        this.titleBar.setOrigin(0, 0);
        this.titleBar.setStrokeStyle(1, PIP_DIM);
        this.container.add(this.titleBar);
        this.title = game.add.text(8, 2, '> CART // STATUS', TITLE_STYLE);
        this.container.add(this.title);

        // Three placeholder slots for material icons. Bordered green so
        // even an empty cart looks like a populated readout.
        this.placeholders = {};
        for (let i = 0; i < 3; i++) {
            let xPos = 15 + i * (40 + 8);
            this.placeholders[i] = game.add.rectangle(xPos, 25, 40, 40, PIP_BG, 0.6);
            this.placeholders[i].setOrigin(0, 0);
            this.placeholders[i].setStrokeStyle(1, PIP_DIM);
            this.container.add(this.placeholders[i]);
        }

        // Progress bar — phosphor frame, neon fill keyed to cart load.
        this.progressLabel = game.add.text(15, 78, 'LOAD', LABEL_STYLE);
        this.container.add(this.progressLabel);
        this.progressBg = game.add.rectangle(15, 92, 130, 10, PIP_BG, 0.85);
        this.progressBg.setOrigin(0, 0);
        this.progressBg.setStrokeStyle(1, PIP_DIM);
        this.container.add(this.progressBg);
        this.progressFill = game.add.rectangle(15, 92, 130 * this.cart.percentageFull, 10, getColorForPercentage(this.cart.percentageFull));
        this.progressFill.setOrigin(0, 0);
        this.container.add(this.progressFill);
        this.progressText = game.add.text(15, 108, `${this.cart.currentWeight}KG / ${this.cart.maxWeight}KG`, VALUE_STYLE);
        this.container.add(this.progressText);

        // Direction selector — phosphor triangles on the right side.
        this.directionLabel = this.game.add.text(165, 78, 'DIRECTION', LABEL_STYLE);
        this.container.add(this.directionLabel);

        const arrowGeomR = new Phaser.Geom.Triangle(0, 0, 10, 7, 0, 14);
        const arrowGeomL = new Phaser.Geom.Triangle(0, 7, 10, 0, 10, 14);

        this.arrowLeft = this.game.add.triangle(
            180, 95,
            0, 7, 10, 0, 10, 14,
            PIP_GREEN,
            1
        );
        this.arrowLeft.setStrokeStyle(1, PIP_GREEN);
        this.arrowLeft.setInteractive(arrowGeomL, Phaser.Geom.Triangle.Contains);
        this.arrowLeft.on('pointerdown', () => {
            this.arrowRight.setAlpha(0.3);
            this.arrowLeft.setAlpha(1);
            cart.changeDirections({left: true});
        });
        this.container.add(this.arrowLeft);

        this.arrowRight = this.game.add.triangle(
            215, 95,
            0, 0, 10, 7, 0, 14,
            PIP_GREEN,
            1
        );
        this.arrowRight.setStrokeStyle(1, PIP_GREEN);
        this.arrowRight.setInteractive(arrowGeomR, Phaser.Geom.Triangle.Contains);
        this.arrowRight.on('pointerdown', () => {
            this.arrowLeft.setAlpha(0.3);
            this.arrowRight.setAlpha(1);
            cart.changeDirections({right: true});
        });
        this.container.add(this.arrowRight);

        // Vertical phosphor divider between cargo + direction columns.
        this.line = this.game.add.line(0, 0, 155, 70, 155, 128, PIP_DIM, 1);
        this.line.strokeWidth = 1;
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

        Object.entries(this.cart.inventory).forEach(([key, value], index) => {
            const xPos = 15 + index * (40 + 8);
            if (!this.inventory[`${key}_image`]) {
                this.inventory[`${key}_image`] = this.game.add.image(xPos, 25, key);
                this.inventory[`${key}_image`].setDisplaySize(40, 40);
                this.inventory[`${key}_image`].setOrigin(0, 0);
                // Hue-shift the material icon to phosphor green so it
                // matches the rest of the CRT — Phaser's tint multiplies
                // the texture by this colour, so we use PIP_GREEN.
                this.inventory[`${key}_image`].setTint(PIP_GREEN);

                this.inventory[`${key}_count`] = this.game.add.text(xPos + 4, 27, value, COUNT_STYLE);

                this.inventory[`${key}_name`] = this.game.add.text(xPos, 64, key.toUpperCase(), LABEL_STYLE);
                this.container.add(this.inventory[`${key}_image`]);
                this.container.add(this.inventory[`${key}_count`]);
                this.container.add(this.inventory[`${key}_name`]);
            } else {
                this.inventory[`${key}_count`].setText(value);
                this.inventory[`${key}_image`].setPosition(xPos, 25);
                this.inventory[`${key}_count`].setPosition(xPos + 4, 27);
                this.inventory[`${key}_name`].setPosition(xPos, 64);
            }
        });

        this.progressFill.width = 130 * this.cart.percentageFull;
        this.progressFill.setFillStyle(getColorForPercentage(this.cart.percentageFull));
        this.progressText.setText(`${this.cart.currentWeight}KG / ${this.cart.maxWeight}KG`);
    }

    // Drop every per-material image / count / name so the UI doesn't show
    // stale entries after dumpToStockpile() empties cart.inventory.
    clearInventoryDisplay() {
        Object.values(this.inventory).forEach(obj => obj?.destroy?.());
        this.inventory = {};
    }

    setPosition(x, y) {
        this.container.x = x;
        this.container.y = y;
    }

    show() {
        this.container.setVisible(true);
    }

    hide() {
        this.container.setVisible(false);
    }
}
