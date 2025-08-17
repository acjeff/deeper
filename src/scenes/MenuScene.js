import Phaser from "phaser";
import {auth, db, provider, signInWithPopup, signOut, getDocs, collection, doc, getDoc} from "../firebaseconfig";
import LZString from "lz-string";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
        this.particles = [];
        this.titleGlow = 0;
        this.glowDirection = 1;
    }

    create() {
        // Create dark background
        this.createBackground();
        
        // Create animated particles
        this.createParticles();
        
        // Create main title with cyberpunk styling
        this.createTitle();
        
        // Create styled buttons
        this.createButtons();
        
        // Create atmospheric elements
        this.createAtmosphericElements();
        
        // Check authentication status
        if (window.electronAPI?.isElectron) {
            this.updateUIForLoggedInUser();
        } else {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    this.updateUIForLoggedInUser(user);
                }
            });
        }
    }

    createBackground() {
        // Create a dark background with subtle grid
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        
        // Add subtle grid lines for cyberpunk atmosphere
        graphics.lineStyle(1, 0x00ffff, 0.1);
        for (let i = 0; i < this.cameras.main.width; i += 100) {
            graphics.moveTo(i, 0);
            graphics.lineTo(i, this.cameras.main.height);
        }
        for (let i = 0; i < this.cameras.main.height; i += 100) {
            graphics.moveTo(0, i);
            graphics.lineTo(this.cameras.main.width, i);
        }
        graphics.stroke();
    }

    createParticles() {
        // Create floating particles with cyan color
        for (let i = 0; i < 15; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height),
                1,
                0x00ffff,
                0.4
            );
            
            this.tweens.add({
                targets: particle,
                y: particle.y - 200,
                alpha: 0,
                duration: Phaser.Math.Between(4000, 8000),
                ease: 'Power1',
                repeat: -1,
                delay: Phaser.Math.Between(0, 3000)
            });
            
            this.particles.push(particle);
        }
    }

    createTitle() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 3;
        
        // Create title shadow
        this.titleShadow = this.add.text(centerX + 2, centerY + 2, "DEEPER", {
            fontSize: '72px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fill: '#000000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Create main title with white color
        this.title = this.add.text(centerX, centerY, "DEEPER", {
            fontSize: '72px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Create subtitle with cyberpunk styling
        this.subtitle = this.add.text(centerX, centerY + 80, "A MINING ADVENTURE", {
            fontSize: '18px',
            fontFamily: 'monospace',
            fill: '#ff00ff',
            fontStyle: 'bold',
            letterSpacing: '2px'
        }).setOrigin(0.5);
        
        // Animate title glow
        this.tweens.add({
            targets: this.title,
            alpha: 0.7,
            duration: 2000,
            ease: 'Power2',
            yoyo: true,
            repeat: -1
        });
        
        // Add pulsing effect to subtitle
        this.tweens.add({
            targets: this.subtitle,
            alpha: 0.5,
            duration: 1500,
            ease: 'Power2',
            yoyo: true,
            repeat: -1
        });
    }

    createButtons() {
        const centerX = this.cameras.main.width / 2;
        const buttonY = this.cameras.main.height / 2 + 50;
        const buttonSpacing = 70;
        
        // Google Sign-In Button (Initially Visible)
        this.googleSignInButton = this.createStyledButton(
            centerX, 
            buttonY, 
            "SIGN IN WITH GOOGLE", 
            '#ff00ff', 
            '#cc00cc',
            () => this.signInWithGoogle()
        );
        
        // Continue Button (Initially Hidden)
        this.loadGameButton = this.createStyledButton(
            centerX, 
            buttonY, 
            "CONTINUE ADVENTURE", 
            '#00ffff', 
            '#00cccc',
            () => this.loadGame()
        ).setVisible(false);
        
        // Start New Game Button (Initially Hidden)
        this.deleteSaveButton = this.createStyledButton(
            centerX, 
            buttonY + buttonSpacing, 
            "START NEW GAME", 
            '#ff6600', 
            '#cc5500',
            async () => {
                await this.deleteSaves();
                await this.createNewGame();
            }
        ).setVisible(false);
        
        // New Game Button (Initially Hidden)
        this.newGameButton = this.createStyledButton(
            centerX, 
            buttonY, 
            "BEGIN NEW ADVENTURE", 
            '#00ff00', 
            '#00cc00',
            () => this.createNewGame()
        ).setVisible(false);
        
        // Logout Button (Initially Hidden)
        this.logoutButton = this.createStyledButton(
            centerX, 
            buttonY + buttonSpacing * 2, 
            "LOGOUT", 
            '#ff0066', 
            '#cc0044',
            () => this.logout()
        ).setVisible(false);
    }

    createStyledButton(x, y, text, color, hoverColor, callback) {
        // Convert hex colors to integers
        const originalColor = parseInt(color.replace('#', ''), 16);
        const hoverColorInt = parseInt(hoverColor.replace('#', ''), 16);
        
        // Create button background
        const buttonBg = this.add.rectangle(x, y, 350, 50, 0x000000, 0.8);
        buttonBg.setStrokeStyle(2, originalColor);
        
        // Create button text with matching border color
        const buttonText = this.add.text(x, y, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Set the text color to match the border
        buttonText.setColor(color);
        
        // Make only the background interactive
        buttonBg.setInteractive({ useHandCursor: true });
        
        // Store references for visibility control
        buttonBg.buttonText = buttonText;
        buttonText.buttonBg = buttonBg;
        
        // Store original color for restoration
        buttonBg.originalColor = originalColor;
        buttonBg.hoverColor = hoverColorInt;
        
        // Hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x000000, 0.9);
            buttonBg.setStrokeStyle(3, buttonBg.hoverColor);
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x000000, 0.8);
            buttonBg.setStrokeStyle(2, buttonBg.originalColor);
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        // Click effects
        buttonBg.on('pointerdown', () => {
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scaleX: 0.98,
                scaleY: 0.98,
                duration: 100,
                ease: 'Power2',
                yoyo: true,
                onComplete: () => {
                    callback();
                }
            });
        });
        
        return buttonBg;
    }

    createAtmosphericElements() {
        // Add some mining-themed decorative elements with cyberpunk styling
        const centerX = this.cameras.main.width / 2;
        
        // Add pickaxe icon
        if (this.textures.exists('pickaxe')) {
            const pickaxe = this.add.image(centerX - 200, 100, 'pickaxe');
            pickaxe.setScale(2);
            pickaxe.setAlpha(0.2);
            pickaxe.setTint(0x00ffff);
            
            this.tweens.add({
                targets: pickaxe,
                angle: 5,
                duration: 4000,
                ease: 'Power2',
                yoyo: true,
                repeat: -1
            });
        }
        
        // Add coal icon
        if (this.textures.exists('coal')) {
            const coal = this.add.image(centerX + 200, 100, 'coal');
            coal.setScale(2);
            coal.setAlpha(0.2);
            coal.setTint(0xff00ff);
            
            this.tweens.add({
                targets: coal,
                angle: -5,
                duration: 4000,
                ease: 'Power2',
                yoyo: true,
                repeat: -1
            });
        }
        
        // Add floating dust particles
        for (let i = 0; i < 10; i++) {
            const dust = this.add.circle(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height),
                0.5,
                0x00ffff,
                0.3
            );
            
            this.tweens.add({
                targets: dust,
                x: dust.x + Phaser.Math.Between(-50, 50),
                y: dust.y - Phaser.Math.Between(50, 150),
                alpha: 0,
                duration: Phaser.Math.Between(5000, 10000),
                ease: 'Power1',
                repeat: -1,
                delay: Phaser.Math.Between(0, 4000)
            });
        }
        
        // Add corner decorative elements with cyberpunk styling
        const cornerSize = 60;
        const cornerAlpha = 0.3;
        
        // Top-left corner
        const topLeft = this.add.graphics();
        topLeft.lineStyle(2, 0x00ffff, cornerAlpha);
        topLeft.strokeRect(20, 20, cornerSize, cornerSize);
        
        // Top-right corner
        const topRight = this.add.graphics();
        topRight.lineStyle(2, 0x00ffff, cornerAlpha);
        topRight.strokeRect(this.cameras.main.width - 20 - cornerSize, 20, cornerSize, cornerSize);
        
        // Bottom-left corner
        const bottomLeft = this.add.graphics();
        bottomLeft.lineStyle(2, 0x00ffff, cornerAlpha);
        bottomLeft.strokeRect(20, this.cameras.main.height - 20 - cornerSize, cornerSize, cornerSize);
        
        // Bottom-right corner
        const bottomRight = this.add.graphics();
        bottomRight.lineStyle(2, 0x00ffff, cornerAlpha);
        bottomRight.strokeRect(this.cameras.main.width - 20 - cornerSize, this.cameras.main.height - 20 - cornerSize, cornerSize, cornerSize);
    }

    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const gameSave = await getDoc(doc(db, "game_saves", user.uid, "map_data", "grid"));

            if (gameSave.exists()) {
                this.loadGameButton.setVisible(true);
                this.loadGameButton.buttonText.setVisible(true);
                this.deleteSaveButton.setVisible(true);
                this.deleteSaveButton.buttonText.setVisible(true);
            } else {
                this.newGameButton.setVisible(true);
                this.newGameButton.buttonText.setVisible(true);
            }

            this.updateUIForLoggedInUser(user);
        } catch (error) {
            console.error("Error signing in:", error);
            alert(error.message);
        }
    }

    async deleteSaves() {
        if (window.electronAPI?.isElectron) {
            await window.electronAPI.deleteGameSave();
        } else {
            //     Delete cloud save
        }
        return Promise.resolve();
    }

    async loadGame() {
        if (window.electronAPI?.isElectron) {
            // ✅ Electron: Save Locally
            this.scene.start("GameScene", {
                grid: this.savedData.grid,
                playerData: this.savedData.playerData
            });
        } else {
            // ✅ Browser: Save to Firebase
            await this.loadGameFromCloud();
        }
    }

    async loadGameFromCloud() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to load a game.");
            return;
        }
        this.loadGameButton.buttonText.setText('LOADING...');
        this.loadGameButton.setInteractive(false);
        this.loadGameButton.setAlpha(0.5);
        this.loadGameButton.buttonText.setAlpha(0.5);
        try {
            const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
            const gameSaveDoc = await getDoc(gameSaveRef);
            const gameSave = JSON.parse(LZString.decompressFromUTF16(gameSaveDoc.data().data));

            const playerDataCollection = collection(db, "game_saves", user.uid, "player_data");

            const playerDataSnapshot = await getDocs(playerDataCollection);

            const playerData = playerDataSnapshot.docs.map(doc => ({
                id: doc.id,  // Document ID
                ...doc.data() // Document fields
            }));
            if (gameSave) {

                // ✅ Hide menu and start the game with loaded data
                this.scene.start("GameScene", {grid: gameSave, user: user, playerData: playerData});
            } else {
                alert("No game save found.");
            }
        } catch (error) {
            console.error("Error loading game:", error);
            alert(error.message);
        }
        this.loadGameButton.buttonText.setText('CONTINUE ADVENTURE');
        this.loadGameButton.setInteractive(true);
        this.loadGameButton.setAlpha(1);
        this.loadGameButton.buttonText.setAlpha(1);
    }

    async createNewGame() {
        let user;

        this.deleteSaveButton.buttonText.setText('GENERATING MAP...');
        this.deleteSaveButton.setInteractive(false);
        this.deleteSaveButton.setAlpha(0.5);
        this.deleteSaveButton.buttonText.setAlpha(0.5);
        window.setTimeout(() => {

            if (!window.electronAPI?.isElectron) {
                user = auth.currentUser;
            }

            try {
                this.scene.start("GameScene", {newGame: true, user: user});
            } catch (error) {
                console.error("Error creating new game:", error);
                alert(error.message);
            }
        }, 100)
    }

    async logout() {
        try {
            await signOut(auth);

            // ✅ Reset UI
            this.googleSignInButton.setVisible(true);
            this.googleSignInButton.buttonText.setVisible(true);
            this.logoutButton.setVisible(false);
            this.logoutButton.buttonText.setVisible(false);
            this.loadGameButton.setVisible(false);
            this.loadGameButton.buttonText.setVisible(false);
            this.deleteSaveButton.setVisible(false);
            this.deleteSaveButton.buttonText.setVisible(false);
            this.newGameButton.setVisible(false);
            this.newGameButton.buttonText.setVisible(false);
        } catch (error) {
            console.error("Error logging out:", error);
            alert(error.message);
        }
    }

    async updateUIForLoggedInUser(user) {
        this.googleSignInButton.setVisible(false);
        this.googleSignInButton.buttonText.setVisible(false);
        this.logoutButton.setVisible(true);
        this.logoutButton.buttonText.setVisible(true);
        this.loadGameButton.setVisible(false);
        this.loadGameButton.buttonText.setVisible(false);
        this.deleteSaveButton.setVisible(false);
        this.deleteSaveButton.buttonText.setVisible(false);
        this.newGameButton.setVisible(false);
        this.newGameButton.buttonText.setVisible(false);

        let hasSaveData = false;

        try {
            if (window.electronAPI?.isElectron) {
                this.logoutButton.setVisible(false);
                this.logoutButton.buttonText.setVisible(false);
                // ✅ Electron: Check local save
                const savedData = await window.electronAPI.loadGame();
                this.savedData = savedData;
                if (savedData) {
                    hasSaveData = true;
                }
            } else {
                // ✅ Browser: Check Firebase save
                const gameSaveRef = doc(db, "game_saves", user.uid, "map_data", "grid");
                const gameSave = await getDoc(gameSaveRef);
                if (gameSave.exists()) {
                    hasSaveData = true;
                }
            }
        } catch (error) {
            console.error("Error checking save data:", error);
        }

        // ✅ Show the correct button based on whether save data exists
        if (hasSaveData) {
            this.loadGameButton.setVisible(true);
            this.loadGameButton.buttonText.setVisible(true);
            this.deleteSaveButton.setVisible(true);
            this.deleteSaveButton.buttonText.setVisible(true);
        } else {
            this.newGameButton.setVisible(true);
            this.newGameButton.buttonText.setVisible(true);
        }
    }
}