export default class PlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.scene.startPoint = {x: 300, y: 197};
        let x = this.scene.playerX || this.scene.startPoint.x;
        let y = this.scene.playerY || this.scene.startPoint.y;
        this.scene.player = this.scene.physics.add.sprite(x, y, 'player');
        this.scene.player.setBounce(0.2);
        this.scene.player.setOrigin(0, 0);
        this.scene.player.health = 100;
        this.scene.player.energy = 100;
        this.scene.player.breath = 100;
        this.scene.player.setDisplaySize(this.scene.playerSize, this.scene.playerSize);
        // this.scene.playerRect = this.scene.add.rectangle(x, y, this.scene.playerSize, this.scene.playerSize, 0xffb2fd);
        this.scene.player.hitPower = 100;
        this.scene.playerLight = this.scene.lightingManager.addLight(this.scene.player.x, this.scene.player.y, this.scene.playerSize * 4, 0.6, window.lightColors[1], false);
        this.scene.physics.add.collider(this.scene.player, this.scene.soilGroup, () => {
            const fallSpeed = this.scene.lastFallSpeed || 0; // use stored value
            const safeSpeed = 180; // speeds below this cause no damage

            if (fallSpeed > safeSpeed) {
                const damageFactor = 0.8;
                const damage = (fallSpeed - safeSpeed) * damageFactor;
                this.scene.player.health -= damage;
            }
        });
        this.dialogueLayer = document.createElement("canvas");
        this.dialogueLayer.id = "dialogue_canvas";
        this.dialogueLayer.width = this.scene.cameras.main.width;
        this.dialogueLayer.height = this.scene.cameras.main.height;
        this.dialogueLayer.style.position = "absolute";
        this.dialogueLayer.style.top = "0";
        this.dialogueLayer.style.left = "0";
        this.dialogueLayer.style.zIndex = "9999";
        this.dialogueLayer.style.pointerEvents = "none";
        document.body.appendChild(this.dialogueLayer);
        this.viewMaskCtx = this.dialogueLayer.getContext("2d");
        this.viewMaskCtx.font = "30px Arial";
        this.viewMaskCtx.fillStyle = "white";
        this.viewMaskCtx.textAlign = "center";
    }

    // Called when the player "dies". Depending on the reason, it shows the appropriate message.
    die(reason) {
        // Create and set up the dialogue layer (canvas)
        this.createDialogueLayer();
        this.scene.player.energy = 100;
        this.scene.player.health = 100;
        this.scene.player.breath = 100;

        // Determine the message based on the reason.
        let message;
        switch (reason) {
            case 'crushed':
                message = "Great job, you crushed it!"
                break;
            case 'fall':
                message = "Aim for the bushes!"
                break;
            case 'sleep':
                message = "You sleepy bear!"
                break;
            case 'suffocate':
                message = "That's no way to go!"
                break;
            default:
                message = 'You died!'
        }

        // Draw the dialogue (a black translucent rectangle with text)
        this.drawDialogue(message);

        // Fade the dialogue layer in
        this.fadeInDialogue();

        // Example additional game logic

        this.scene.freezePlayer = true;

        // After 2 seconds, fade out and remove the dialogue layer then return to base camp
        this.scene.time.delayedCall(2000, () => {
            this.scene.player.energy = 100;
            this.scene.player.health = 100;
            this.scene.player.breath = 100;
            this.fadeOutAndRemoveDialogue();
            this.returnToBaseCamp();
        })
    }

// Creates a canvas element for the dialogue and sets its initial styles.
    createDialogueLayer() {
        this.dialogueLayer = document.createElement("canvas");
        this.dialogueLayer.id = "dialogue_canvas";
        this.dialogueLayer.width = this.scene.cameras.main.width;
        this.dialogueLayer.height = this.scene.cameras.main.height;
        this.dialogueLayer.style.position = "absolute";
        this.dialogueLayer.style.top = "0";
        this.dialogueLayer.style.left = "0";
        this.dialogueLayer.style.zIndex = "9999";
        this.dialogueLayer.style.pointerEvents = "none";
        // Start with 0 opacity so we can fade in.
        this.dialogueLayer.style.opacity = "0";
        // CSS transition for opacity changes (fade in/out).
        this.dialogueLayer.style.transition = "opacity 0.5s ease";
        document.body.appendChild(this.dialogueLayer);
        this.viewMaskCtx = this.dialogueLayer.getContext("2d");
    }

// Draws a black rectangle with 70% opacity and centers the given message over it.
    drawDialogue(message) {
        const _x = this.dialogueLayer.width / 2;
        const _y = this.dialogueLayer.height / 2;

        // Clear any previous drawing.
        this.viewMaskCtx.clearRect(0, 0, this.dialogueLayer.width, this.dialogueLayer.height);

        // Draw the black rectangle strip.
        this.viewMaskCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
        // Adjust the y position so the strip is centered (here _y - 55 positions it properly)
        this.viewMaskCtx.fillRect(0, _y - 60, this.dialogueLayer.width, 100);

        // Set text properties and draw the message.
        this.viewMaskCtx.font = "30px Arial";
        this.viewMaskCtx.fillStyle = "white";
        this.viewMaskCtx.textAlign = "center";
        this.viewMaskCtx.fillText(message, _x, _y);
    }

// Fades in the dialogue layer by transitioning the opacity from 0 to 1.
    fadeInDialogue() {
        // Use a slight delay to ensure the element is rendered.
        setTimeout(() => {
            this.dialogueLayer.style.opacity = "1";
        }, 100);
    }

// Fades out the dialogue layer and removes it from the DOM once the transition is complete.
    fadeOutAndRemoveDialogue() {
        this.dialogueLayer.style.opacity = "0";
        // Remove the element once the fade-out transition ends.
        this.dialogueLayer.addEventListener("transitionend", () => {
            if (this.dialogueLayer && this.dialogueLayer.parentNode) {
                this.dialogueLayer.parentNode.removeChild(this.dialogueLayer);
            }
        }, {once: true}); // Use { once: true } so the listener is removed automatically.
    }


    returnToBaseCamp() {
        this.scene.player.setAlpha(0);
        const relativePos = {x: this.scene.startPoint.x, y: this.scene.startPoint.y};
        this.scene.player.x = relativePos.x;
        this.scene.player.y = relativePos.y;
        this.scene.playerLight.setPosition(this.scene.player.x + this.scene.playerSize / 2, this.scene.player.y + this.scene.playerSize / 2);
        this.scene.freezePlayer = true;
        this.scene.cameras.main.stopFollow();
        this.scene.cameras.main.setScroll(relativePos.x, relativePos.y);
        this.scene.cameras.main.startFollow(this.scene.player);
        this.scene.freezePlayer = false;
        window.setTimeout(() => {
            this.scene.tweens.add({
                targets: [this.scene.player],
                alpha: 1,
                duration: 1000,
                ease: 'ease-out'
            });
        }, 100);
    }
}