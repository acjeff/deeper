import Phaser from "phaser";
import {auth, db, provider, signInWithPopup, signOut, getDocs, collection, doc, getDoc} from "../firebaseconfig";
import LZString from "lz-string";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    create() {
        this.cameras.main.setBackgroundColor(0x05070b);

        this.layout = this.computeLayout();

        this.buildBackground();
        this.buildAtmosphere();
        this.buildTitle();
        this.buildButtonPanel();
        this.buildVignette();
        this.buildFooter();

        this.scale.on("resize", this.handleResize, this);

        this.showAuthState("loading");

        let unsubscribeAuth = null;
        if (window.electronAPI?.isElectron) {
            this.updateUIForLoggedInUser();
        } else {
            unsubscribeAuth = auth.onAuthStateChanged((user) => {
                if (user) {
                    this.updateUIForLoggedInUser(user);
                } else {
                    this.showAuthState("signedOut");
                }
            });
        }

        this.events.once("shutdown", () => {
            this.scale.off("resize", this.handleResize, this);
            if (unsubscribeAuth) unsubscribeAuth();
        });
    }

    computeLayout() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        return {
            w,
            h,
            cx: w / 2,
            titleY: Math.max(120, h * 0.22),
            panelY: h * 0.62,
            panelW: Math.min(460, w * 0.85),
        };
    }

    buildBackground() {
        const {w, h} = this.layout;

        // Deep gradient sky-to-stone
        const bg = this.add.graphics();
        const steps = 24;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const top = Phaser.Display.Color.ValueToColor(0x0a0d14);
            const mid = Phaser.Display.Color.ValueToColor(0x110a14);
            const bot = Phaser.Display.Color.ValueToColor(0x1a0a08);
            const c1 = Phaser.Display.Color.Interpolate.ColorWithColor(top, mid, 1, Math.min(1, t * 2));
            const c2 = Phaser.Display.Color.Interpolate.ColorWithColor(mid, bot, 1, Math.max(0, t * 2 - 1));
            const color = (t < 0.5 ? c1 : c2);
            const hex = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
            bg.fillStyle(hex, 1);
            bg.fillRect(0, (h * i) / steps, w, h / steps + 1);
        }

        // Faint geological strata lines
        const strata = this.add.graphics();
        strata.lineStyle(1, 0xff7a3a, 0.05);
        for (let y = 60; y < h; y += Phaser.Math.Between(40, 90)) {
            strata.beginPath();
            const segs = Math.ceil(w / 40);
            strata.moveTo(0, y);
            for (let i = 1; i <= segs; i++) {
                strata.lineTo(i * 40, y + Phaser.Math.Between(-3, 3));
            }
            strata.strokePath();
        }

        // Distant cave silhouette layer (back)
        this.drawCaveLayer(0x0a0810, 0.55, h * 0.55, 38);
        // Mid silhouette
        this.drawCaveLayer(0x080509, 0.85, h * 0.7, 60);
        // Foreground floor
        this.drawCaveLayer(0x000000, 1, h * 0.88, 90);

        // Hanging stalactites at top
        const stalGfx = this.add.graphics();
        stalGfx.fillStyle(0x000000, 1);
        for (let x = 0; x < w; x += Phaser.Math.Between(50, 110)) {
            const baseW = Phaser.Math.Between(18, 38);
            const len = Phaser.Math.Between(40, 110);
            stalGfx.beginPath();
            stalGfx.moveTo(x, 0);
            stalGfx.lineTo(x + baseW / 2, len);
            stalGfx.lineTo(x + baseW, 0);
            stalGfx.closePath();
            stalGfx.fillPath();
        }
        // subtle highlight on stalactites
        stalGfx.lineStyle(1, 0xff7a3a, 0.08);
        for (let x = 0; x < w; x += 30) {
            stalGfx.lineBetween(x, 0, x, Phaser.Math.Between(2, 12));
        }
    }

    drawCaveLayer(color, alpha, baseY, jag) {
        const {w, h} = this.layout;
        const g = this.add.graphics();
        g.fillStyle(color, alpha);
        g.beginPath();
        g.moveTo(0, h);
        g.lineTo(0, baseY);
        const segWidth = 50;
        let lastY = baseY;
        for (let x = 0; x <= w; x += segWidth) {
            const y = baseY + Phaser.Math.Between(-jag, jag);
            const cpX = x - segWidth / 2;
            const cpY = (lastY + y) / 2 + Phaser.Math.Between(-10, 10);
            g.lineTo(cpX, cpY);
            g.lineTo(x, y);
            lastY = y;
        }
        g.lineTo(w, h);
        g.closePath();
        g.fillPath();
    }

    buildAtmosphere() {
        const {w, h} = this.layout;

        // Glowing ore specks scattered in the dark
        for (let i = 0; i < 22; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(h * 0.4, h * 0.95);
            const size = Phaser.Math.Between(1, 2);
            const color = Phaser.Math.RND.pick([0xffaa55, 0xff6622, 0xffd27a, 0x88aaff]);
            const ore = this.add.circle(x, y, size, color, 0.8);
            const halo = this.add.circle(x, y, size * 4, color, 0.12);
            this.tweens.add({
                targets: [ore, halo],
                alpha: {from: 0.15, to: 0.9},
                duration: Phaser.Math.Between(1400, 3200),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                ease: "Sine.easeInOut",
            });
        }

        // Falling dust
        for (let i = 0; i < 28; i++) {
            const startX = Phaser.Math.Between(0, w);
            const dust = this.add.circle(startX, Phaser.Math.Between(-20, h * 0.3), 1, 0xfff1d6, 0.35);
            this.tweens.add({
                targets: dust,
                y: h + 20,
                x: startX + Phaser.Math.Between(-40, 40),
                alpha: {from: 0.0, to: 0.5},
                duration: Phaser.Math.Between(7000, 14000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 6000),
                ease: "Sine.easeIn",
                onRepeat: () => {
                    dust.x = Phaser.Math.Between(0, w);
                    dust.y = -10;
                },
            });
        }

        // Distant fireflies / light motes that drift
        for (let i = 0; i < 8; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(h * 0.3, h * 0.8);
            const mote = this.add.circle(x, y, 2, 0xffb066, 0.7);
            this.tweens.add({
                targets: mote,
                x: x + Phaser.Math.Between(-120, 120),
                y: y + Phaser.Math.Between(-80, 80),
                alpha: {from: 0.2, to: 0.9},
                duration: Phaser.Math.Between(4000, 7000),
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
        }

        // Bottom warm glow (suggesting depths/lava)
        const glow = this.add.graphics();
        const steps = 14;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const a = Phaser.Math.Linear(0, 0.18, t);
            glow.fillStyle(0xff5a1c, a);
            glow.fillRect(0, h - (1 - t) * 220, w, 16);
        }
    }

    buildTitle() {
        const {cx, titleY} = this.layout;

        // Title backing plate
        const plate = this.add.graphics();
        plate.fillStyle(0x000000, 0.45);
        plate.fillRoundedRect(cx - 280, titleY - 70, 560, 140, 8);
        plate.lineStyle(1, 0xff7a3a, 0.35);
        plate.strokeRoundedRect(cx - 280, titleY - 70, 560, 140, 8);

        // Outer glow (multiple stacked texts for cheap glow)
        const glowColors = [0x3a1605, 0x6e2606, 0xff7a3a];
        glowColors.forEach((c, i) => {
            const g = this.add.text(cx, titleY, "DEEPER", {
                fontSize: "92px",
                fontFamily: "Impact, 'Arial Black', sans-serif",
                fontStyle: "bold",
                color: Phaser.Display.Color.IntegerToColor(c).rgba,
            }).setOrigin(0.5);
            g.setAlpha(0.18 + i * 0.1);
            g.setScale(1 + (glowColors.length - i) * 0.015);
        });

        // Title shadow
        this.add.text(cx + 3, titleY + 4, "DEEPER", {
            fontSize: "92px",
            fontFamily: "Impact, 'Arial Black', sans-serif",
            fontStyle: "bold",
            color: "#000000",
        }).setOrigin(0.5).setAlpha(0.7);

        // Main title
        this.title = this.add.text(cx, titleY, "DEEPER", {
            fontSize: "92px",
            fontFamily: "Impact, 'Arial Black', sans-serif",
            fontStyle: "bold",
            color: "#ffe6c2",
            stroke: "#2a0d04",
            strokeThickness: 6,
        }).setOrigin(0.5);

        // Subtle breathing animation
        this.tweens.add({
            targets: this.title,
            scale: {from: 1, to: 1.025},
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        // Subtitle
        this.subtitle = this.add.text(cx, titleY + 60, "— A MINING DESCENT —", {
            fontSize: "16px",
            fontFamily: "monospace",
            color: "#ff9a4a",
            fontStyle: "bold",
        }).setOrigin(0.5);
        this.subtitle.setLetterSpacing(6);

        this.tweens.add({
            targets: this.subtitle,
            alpha: {from: 0.55, to: 1},
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        // Decorative pickaxes flanking the title
        if (this.textures.exists("pickaxe")) {
            const left = this.add.image(cx - 230, titleY + 4, "pickaxe").setScale(2.4).setTint(0xff9a4a).setAlpha(0.7);
            left.setFlipX(true);
            const right = this.add.image(cx + 230, titleY + 4, "pickaxe").setScale(2.4).setTint(0xff9a4a).setAlpha(0.7);
            this.tweens.add({targets: left, angle: -8, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut"});
            this.tweens.add({targets: right, angle: 8, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut"});
        }
    }

    buildButtonPanel() {
        const {cx, panelY, panelW} = this.layout;
        const panelH = 280;

        // Stone panel backing
        const panel = this.add.graphics();
        panel.fillStyle(0x0c0a0a, 0.85);
        panel.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 12);
        panel.lineStyle(2, 0xff7a3a, 0.5);
        panel.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 12);

        // Inner bevel highlight
        panel.lineStyle(1, 0xffb27a, 0.18);
        panel.strokeRoundedRect(cx - panelW / 2 + 4, panelY - panelH / 2 + 4, panelW - 8, panelH - 8, 10);

        // Rivets in corners
        const rivetPositions = [
            [cx - panelW / 2 + 14, panelY - panelH / 2 + 14],
            [cx + panelW / 2 - 14, panelY - panelH / 2 + 14],
            [cx - panelW / 2 + 14, panelY + panelH / 2 - 14],
            [cx + panelW / 2 - 14, panelY + panelH / 2 - 14],
        ];
        rivetPositions.forEach(([rx, ry]) => {
            this.add.circle(rx, ry, 3, 0x1a1310).setStrokeStyle(1, 0xff9a4a, 0.6);
            this.add.circle(rx - 1, ry - 1, 1, 0xffd6a8, 0.7);
        });

        // Slot 1: primary action (continue OR new game OR sign-in)
        // Slot 2: secondary (start new game when there is a save)
        // Slot 3: logout
        this.primaryButton = this.makeButton(cx, panelY - 70, panelW - 60, 56, "BEGIN NEW ADVENTURE", "primary");
        this.secondaryButton = this.makeButton(cx, panelY, panelW - 60, 44, "START NEW GAME", "secondary");
        this.tertiaryButton = this.makeButton(cx, panelY + 70, panelW - 60, 36, "LOGOUT", "tertiary");

        // Hide all by default; the auth flow re-shows the right ones
        this.primaryButton.setVisible(false);
        this.secondaryButton.setVisible(false);
        this.tertiaryButton.setVisible(false);
    }

    makeButton(x, y, w, h, label, variant) {
        const palette = {
            primary: {fill: 0x2a1208, stroke: 0xff7a3a, hover: 0xffb066, text: "#ffe6c2", accent: 0xff9a4a},
            secondary: {fill: 0x12161f, stroke: 0x4a6a8a, hover: 0x88b4dc, text: "#cfe1f2", accent: 0x88b4dc},
            tertiary: {fill: 0x150909, stroke: 0x6a2030, hover: 0xff5577, text: "#ff8aa0", accent: 0xff5577},
        };
        const p = palette[variant];

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        const drawBg = (fill, stroke, glow = 0) => {
            bg.clear();
            if (glow > 0) {
                bg.fillStyle(stroke, 0.18);
                bg.fillRoundedRect(-w / 2 - glow, -h / 2 - glow, w + glow * 2, h + glow * 2, 10);
            }
            bg.fillStyle(fill, 0.95);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(2, stroke, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
            // bevel
            bg.lineStyle(1, 0xffffff, 0.08);
            bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 6);
        };
        drawBg(p.fill, p.stroke);

        const accentLeft = this.add.rectangle(-w / 2 + 12, 0, 4, h - 16, p.accent, 0.9);
        const accentRight = this.add.rectangle(w / 2 - 12, 0, 4, h - 16, p.accent, 0.9);

        const text = this.add.text(0, 0, label, {
            fontSize: variant === "primary" ? "20px" : variant === "secondary" ? "16px" : "14px",
            fontFamily: "'Arial Black', Impact, sans-serif",
            color: p.text,
            stroke: "#000000",
            strokeThickness: 3,
        }).setOrigin(0.5);
        text.setLetterSpacing(variant === "primary" ? 3 : 2);

        // Hit area: full button rectangle
        const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({useHandCursor: true});

        container.add([bg, accentLeft, accentRight, text, hit]);
        container.bgGraphics = bg;
        container.label = text;
        container.palette = p;
        container.size = {w, h};
        container.busy = false;

        // Idle pulse on accent strips
        this.tweens.add({
            targets: [accentLeft, accentRight],
            alpha: {from: 0.5, to: 1},
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        hit.on("pointerover", () => {
            if (container.busy) return;
            drawBg(p.fill, p.hover, 6);
            this.tweens.add({targets: container, scale: 1.04, duration: 160, ease: "Quad.easeOut"});
            this.tweens.add({targets: text, x: 4, duration: 160, ease: "Quad.easeOut", yoyo: true});
        });
        hit.on("pointerout", () => {
            if (container.busy) return;
            drawBg(p.fill, p.stroke);
            this.tweens.add({targets: container, scale: 1, duration: 160, ease: "Quad.easeOut"});
        });
        hit.on("pointerdown", () => {
            if (container.busy) return;
            this.tweens.add({
                targets: container,
                scale: 0.97,
                duration: 80,
                yoyo: true,
                ease: "Quad.easeOut",
                onComplete: () => container.callback && container.callback(),
            });
        });

        container.setLabel = (newText) => text.setText(newText);
        container.setBusy = (isBusy, busyText) => {
            container.busy = isBusy;
            if (isBusy) {
                container.originalLabel = text.text;
                if (busyText) text.setText(busyText);
                container.setAlpha(0.6);
            } else {
                if (container.originalLabel) text.setText(container.originalLabel);
                container.setAlpha(1);
            }
        };
        container.onClick = (cb) => {
            container.callback = cb;
            return container;
        };

        return container;
    }

    buildVignette() {
        const {w, h} = this.layout;
        // Cheap radial vignette using stacked rounded rectangles
        const v = this.add.graphics();
        const steps = 18;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const inset = Phaser.Math.Linear(0, 220, t);
            v.lineStyle(2, 0x000000, (1 - t) * 0.06);
            v.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
        }

        // Hard edges
        const edge = this.add.graphics();
        edge.lineStyle(2, 0xff7a3a, 0.25);
        edge.strokeRect(8, 8, w - 16, h - 16);
        edge.lineStyle(1, 0x3a1605, 0.6);
        edge.strokeRect(11, 11, w - 22, h - 22);

        // Corner brackets
        const drawBracket = (x, y, sx, sy) => {
            const len = 24;
            const g = this.add.graphics();
            g.lineStyle(2, 0xff9a4a, 0.7);
            g.beginPath();
            g.moveTo(x, y + sy * len);
            g.lineTo(x, y);
            g.lineTo(x + sx * len, y);
            g.strokePath();
        };
        drawBracket(20, 20, 1, 1);
        drawBracket(w - 20, 20, -1, 1);
        drawBracket(20, h - 20, 1, -1);
        drawBracket(w - 20, h - 20, -1, -1);
    }

    buildFooter() {
        const {cx, h} = this.layout;
        this.add.text(cx, h - 28, "v1.0   ·   Roo Boo Games", {
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#7a5a44",
        }).setOrigin(0.5).setAlpha(0.7);
    }

    handleResize(gameSize) {
        // Redraw the scene on resize for a clean layout
        this.scene.restart();
    }

    // ========= AUTH STATE PRESENTATION =========

    showAuthState(state) {
        // Single source of truth for which buttons are visible.
        // states: "loading" | "signedOut" | "hasSave" | "noSave" | "electron-hasSave" | "electron-noSave"
        this.primaryButton.setVisible(false);
        this.secondaryButton.setVisible(false);
        this.tertiaryButton.setVisible(false);

        switch (state) {
            case "loading":
                this.primaryButton.setLabel("LOADING...");
                this.primaryButton.setVisible(true);
                this.primaryButton.setBusy(true, "LOADING...");
                break;
            case "signedOut":
                this.primaryButton.setBusy(false);
                this.primaryButton.setLabel("SIGN IN WITH GOOGLE");
                this.primaryButton.onClick(() => this.signInWithGoogle());
                this.primaryButton.setVisible(true);
                break;
            case "hasSave":
                this.primaryButton.setBusy(false);
                this.primaryButton.setLabel("CONTINUE ADVENTURE");
                this.primaryButton.onClick(() => this.loadGame());
                this.primaryButton.setVisible(true);

                this.secondaryButton.setBusy(false);
                this.secondaryButton.setLabel("START NEW GAME");
                this.secondaryButton.onClick(async () => {
                    await this.deleteSaves();
                    await this.createNewGame();
                });
                this.secondaryButton.setVisible(true);

                this.tertiaryButton.setBusy(false);
                this.tertiaryButton.setLabel("LOGOUT");
                this.tertiaryButton.onClick(() => this.logout());
                this.tertiaryButton.setVisible(!window.electronAPI?.isElectron);
                break;
            case "noSave":
                this.primaryButton.setBusy(false);
                this.primaryButton.setLabel("BEGIN NEW ADVENTURE");
                this.primaryButton.onClick(() => this.createNewGame());
                this.primaryButton.setVisible(true);

                this.tertiaryButton.setBusy(false);
                this.tertiaryButton.setLabel("LOGOUT");
                this.tertiaryButton.onClick(() => this.logout());
                this.tertiaryButton.setVisible(!window.electronAPI?.isElectron);
                break;
        }
    }

    // ========= AUTH ACTIONS =========

    async signInWithGoogle() {
        try {
            this.primaryButton.setBusy(true, "SIGNING IN...");
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            this.primaryButton.setBusy(false);
            await this.updateUIForLoggedInUser(user);
        } catch (error) {
            console.error("Error signing in:", error);
            this.primaryButton.setBusy(false);
            alert(error.message);
        }
    }

    async deleteSaves() {
        if (window.electronAPI?.isElectron) {
            await window.electronAPI.deleteGameSave();
        }
        return Promise.resolve();
    }

    async loadGame() {
        if (window.electronAPI?.isElectron) {
            this.scene.start("GameScene", {
                grid: this.savedData.grid,
                playerData: this.savedData.playerData,
            });
        } else {
            await this.loadGameFromCloud();
        }
    }

    async loadGameFromCloud() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to load a game.");
            return;
        }
        this.primaryButton.setBusy(true, "LOADING...");
        try {
            const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
            const gameSaveDoc = await getDoc(gameSaveRef);
            const gameSave = JSON.parse(LZString.decompressFromUTF16(gameSaveDoc.data().data));

            const playerDataCollection = collection(db, "game_saves", user.uid, "player_data");
            const playerDataSnapshot = await getDocs(playerDataCollection);
            const playerData = playerDataSnapshot.docs.map((d) => ({id: d.id, ...d.data()}));

            if (gameSave) {
                this.scene.start("GameScene", {grid: gameSave, user, playerData});
            } else {
                alert("No game save found.");
                this.primaryButton.setBusy(false);
            }
        } catch (error) {
            console.error("Error loading game:", error);
            this.primaryButton.setBusy(false);
            alert(error.message);
        }
    }

    async createNewGame() {
        let user;
        this.primaryButton.setBusy(true, "GENERATING MAP...");
        if (this.secondaryButton.visible) this.secondaryButton.setBusy(true, "GENERATING MAP...");
        window.setTimeout(() => {
            if (!window.electronAPI?.isElectron) {
                user = auth.currentUser;
            }
            try {
                this.scene.start("GameScene", {newGame: true, user});
            } catch (error) {
                console.error("Error creating new game:", error);
                this.primaryButton.setBusy(false);
                if (this.secondaryButton.visible) this.secondaryButton.setBusy(false);
                alert(error.message);
            }
        }, 100);
    }

    async logout() {
        try {
            await signOut(auth);
            this.showAuthState("signedOut");
        } catch (error) {
            console.error("Error logging out:", error);
            alert(error.message);
        }
    }

    async updateUIForLoggedInUser(user) {
        let hasSaveData = false;
        try {
            if (window.electronAPI?.isElectron) {
                const savedData = await window.electronAPI.loadGame();
                this.savedData = savedData;
                if (savedData) hasSaveData = true;
            } else {
                const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
                const gameSave = await getDoc(gameSaveRef);
                if (gameSave.exists()) hasSaveData = true;
            }
        } catch (error) {
            console.error("Error checking save data:", error);
        }

        this.showAuthState(hasSaveData ? "hasSave" : "noSave");
    }
}
