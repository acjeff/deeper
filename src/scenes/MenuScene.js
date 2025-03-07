import Phaser from "phaser";
import {auth, db, provider, signInWithPopup, signOut, getDocs, collection, doc, getDoc} from "../firebaseconfig";
import LZString from "lz-string";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    create() {
        this.add.text(300, 50, "Deeper", {fontSize: "32px", fill: "#ffffff"});


        // ✅ Google Sign-In Button
        this.googleSignInButton = this.add.text(300, 200, "Sign in with Google", {
            fontSize: "24px",
            fill: "#ff0",
            cursor: 'pointer'
        })
            .setInteractive()
            .on("pointerover", () => {
                this.googleSignInButton.setAlpha(0.7);
                this.input.setDefaultCursor("pointer"); // ✅ Change cursor to pointer
            })
            .on("pointerout", () => {
                this.input.setDefaultCursor("default");
                this.googleSignInButton.setAlpha(1);
            })
            .on("pointerdown", () => {
                this.input.setDefaultCursor("default");
                this.signInWithGoogle()
            });

        // ✅ Logout Button (Initially Hidden)
        this.logoutButton = this.add.text(300, 250, "Logout", {fontSize: "24px", fill: "#f00", cursor: 'pointer'})
            .setInteractive()
            .setVisible(false)
            .on("pointerover", () => {
                this.logoutButton.setAlpha(0.7);
                this.input.setDefaultCursor("pointer"); // ✅ Change cursor to pointer
            })
            .on("pointerout", () => {
                this.input.setDefaultCursor("default");
                this.logoutButton.setAlpha(1);
            })
            .on("pointerdown", () => {
                this.input.setDefaultCursor("default");
                this.logout()
            });

        // ✅ Load Game Button (Initially Hidden)
        this.loadGameButton = this.add.text(300, 300, "Continue", {fontSize: "24px", fill: "#0f0", cursor: 'pointer'})
            .setInteractive()
            .setVisible(false)
            .on("pointerover", () => {
                this.loadGameButton.setAlpha(0.7);
                this.input.setDefaultCursor("pointer"); // ✅ Change cursor to pointer
            })
            .on("pointerout", () => {
                this.input.setDefaultCursor("default");
                this.loadGameButton.setAlpha(1);
            })
            .on("pointerdown", () => {
                this.input.setDefaultCursor("default");
                this.loadGame()
            });

        // ✅ Load Game Button (Initially Hidden)
        this.deleteSaveButton = this.add.text(300, 350, "Start New Game", {
            fontSize: "24px",
            fill: "#0f0",
            cursor: 'pointer'
        })
            .setInteractive()
            .setVisible(false)
            .on("pointerover", () => {
                this.deleteSaveButton.setAlpha(0.7);
                this.input.setDefaultCursor("pointer"); // ✅ Change cursor to pointer
            })
            .on("pointerout", () => {
                this.input.setDefaultCursor("default");
                this.deleteSaveButton.setAlpha(1);
            })
            .on("pointerdown", async () => {
                this.input.setDefaultCursor("default");
                await this.deleteSaves();
                await this.createNewGame();
            });

        // ✅ New Game Button (Initially Hidden)
        this.newGameButton = this.add.text(300, 350, "New Game", {fontSize: "24px", fill: "#00f", cursor: 'pointer'})
            .setInteractive()
            .setVisible(false)
            .on("pointerover", () => {
                this.newGameButton.setAlpha(0.7);
                this.input.setDefaultCursor("pointer"); // ✅ Change cursor to pointer
            })
            .on("pointerout", () => {
                this.input.setDefaultCursor("default");
                this.newGameButton.setAlpha(1);
            })
            .on("pointerdown", () => {
                this.input.setDefaultCursor("default");
                this.createNewGame()
            });

        // ✅ Check if the user is already logged in
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

    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const gameSave = await getDoc(doc(db, "game_saves", user.uid, "map_data", "grid"));

            if (gameSave.exists()) {
                this.loadGameButton.setVisible(true);
                this.deleteSaveButton.setVisible(true);
            } else {
                this.newGameButton.setVisible(true);
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
        this.loadGameButton.setText('Loading').setInteractive(false).setAlpha(0.5);
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
        this.loadGameButton.setText('Continue').setInteractive(true).setAlpha(1);
    }

    async createNewGame() {
        let user;

        this.deleteSaveButton.setText('Generating map...').setInteractive(false).setAlpha(0.5);
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
            this.logoutButton.setVisible(false);
            this.loadGameButton.setVisible(false);
            this.deleteSaveButton.setVisible(false);
            this.newGameButton.setVisible(false);
        } catch (error) {
            console.error("Error logging out:", error);
            alert(error.message);
        }
    }

    async updateUIForLoggedInUser(user) {

        this.googleSignInButton.setVisible(false);
        this.logoutButton.setVisible(true);
        this.loadGameButton.setVisible(false);
        this.deleteSaveButton.setVisible(false);
        this.newGameButton.setVisible(false);

        let hasSaveData = false;

        try {
            if (window.electronAPI?.isElectron) {
                this.logoutButton.setVisible(false);
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
            this.deleteSaveButton.setVisible(true);
        } else {
            this.newGameButton.setVisible(true);
        }
    }

}