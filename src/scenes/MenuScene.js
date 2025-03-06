import Phaser from "phaser";
import {auth, db, provider, signInWithPopup, signOut, setDoc, doc, getDoc} from "../firebaseconfig";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    create() {
        this.add.text(300, 50, "Deeper", {fontSize: "32px", fill: "#ffffff"});


        // ✅ Google Sign-In Button
        this.googleSignInButton = this.add.text(300, 200, "Sign in with Google", {fontSize: "24px", fill: "#ff0"})
            .setInteractive()
            .on("pointerdown", () => this.signInWithGoogle());

        // ✅ Logout Button (Initially Hidden)
        this.logoutButton = this.add.text(300, 250, "Logout", {fontSize: "24px", fill: "#f00"})
            .setInteractive()
            .setVisible(false)
            .on("pointerdown", () => this.logout());

        // ✅ Load Game Button (Initially Hidden)
        this.loadGameButton = this.add.text(300, 300, "Load Game", {fontSize: "24px", fill: "#0f0"})
            .setInteractive()
            .setVisible(false)
            .on("pointerdown", () => this.loadGame());

        // ✅ New Game Button (Initially Hidden)
        this.newGameButton = this.add.text(300, 350, "New Game", {fontSize: "24px", fill: "#00f"})
            .setInteractive()
            .setVisible(false)
            .on("pointerdown", () => this.createNewGame());

        // ✅ Check if the user is already logged in
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.updateUIForLoggedInUser(user);
            }
        });
    }

    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log("User signed in:", user);

            const gameSave = await getDoc(doc(db, "game_saves", user.uid, "map_data", "grid_chunk_0"));

            if (gameSave.exists()) {
                console.log("Save exists:", gameSave.data());
                this.loadGameButton.setVisible(true);
            } else {
                console.log("No save found. Show New Game button.");
                this.newGameButton.setVisible(true);
            }

            this.updateUIForLoggedInUser(user);
        } catch (error) {
            console.error("Error signing in:", error);
            alert(error.message);
        }
    }

    async loadGridChunks(user, chunkCount = 6) {
        if (!user) return console.error("User not authenticated");

        let fullGrid = {};

        for (let i = 0; i < chunkCount; i++) {
            const chunkDoc = await getDoc(doc(db, "game_saves", user.uid, "map_data", `grid_chunk_${i}`));
            if (chunkDoc.exists()) {
                Object.assign(fullGrid, chunkDoc.data()); // Merge chunks into full grid
            }
        }

        // ✅ Convert back from stringified JSON
        return Object.fromEntries(
            Object.entries(fullGrid).map(([key, value]) => [key, JSON.parse(value)])
        );
    }

    async loadGame() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to load a game.");
            return;
        }

        try {
            const gameSave = await this.loadGridChunks(user);
            if (gameSave) {
                console.log("Game data loaded:", gameSave);

                // ✅ Hide menu and start the game with loaded data
                this.scene.start("GameScene", {grid: gameSave, user: user});
            } else {
                alert("No game save found.");
            }
        } catch (error) {
            console.error("Error loading game:", error);
            alert(error.message);
        }
    }

    async createNewGame() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to start a new game.");
            return;
        }

        try {
            this.scene.start("GameScene", {newGame: true, user: user});
        } catch (error) {
            console.error("Error creating new game:", error);
            alert(error.message);
        }
    }

    async logout() {
        try {
            await signOut(auth);
            console.log("User logged out");

            // ✅ Reset UI
            this.googleSignInButton.setVisible(true);
            this.logoutButton.setVisible(false);
            this.loadGameButton.setVisible(false);
            this.newGameButton.setVisible(false);
        } catch (error) {
            console.error("Error logging out:", error);
            alert(error.message);
        }
    }

    updateUIForLoggedInUser(user) {
        console.log(`User logged in: ${user.displayName} (${user.email})`);

        this.googleSignInButton.setVisible(false);
        this.logoutButton.setVisible(true);

        // ✅ Check if the user already has a game save
        this.loadGameButton.setVisible(false);
        this.newGameButton.setVisible(false);

        getDoc(doc(db, "game_saves", user.uid, "map_data", "grid_chunk_0")).then((gameSave) => {
            if (gameSave.exists()) {
                this.loadGameButton.setVisible(true);
            } else {
                this.newGameButton.setVisible(true);
            }
        });
    }
}