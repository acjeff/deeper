export default class UiManager {
    constructor(scene) {
        this.game = scene;
        this.game.saveButton = this.addSaveButton();
        this.game.backToMenuButton = this.addBackToMenuButton();
        this.addHealthBar();
        this.addEnergyBar();
        this.addBreathBar();
    }

    addBackToMenuButton() {
        return this.addButton('backToMenuButton', {
            position: 'absolute',
            left: '10px',
            top: '10px',
            padding: '10px 15px',
            fontSize: '16px',
            backgroundColor: '#595959',
            color: '#fff',
            border: 'none'
        }, 'Back to menu', async () => {
            // 🚀 UI Update Before Processing
            this['backToMenuButton'].disabled = true;
            this['backToMenuButton'].style.pointerEvents = 'none';
            this['backToMenuButton'].innerHTML = "Saving...";
            this['saveButton'].style.visibility = 'hidden';
            window.setTimeout(async () => {
                await this.game.saveGame(this.game.user, this.game.grid);
                this['backToMenuButton'].remove();
                this['saveButton'].remove();
                this.game.lightCanvas.remove();
                this.healthBarFill.remove();
                this.energyBarFill.remove();
                this.breathBarFill.remove();
                this.healthBarContainer.remove();
                this.energyBarContainer.remove();
                this.breathBarContainer.remove();
                this.game.scene.stop("GameScene"); // ✅ Stop the game scene
                this.game.scene.start("MenuScene");
            }, 100)

        });
    }

    addSaveButton() {
        return this.addButton('saveButton', {
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '10px 15px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none'
        }, 'Save Game', async () => {
            // 🚀 UI Update Before Processing
            this.game['saveButton'].disabled = true;
            this.game['saveButton'].innerHTML = "Saving...";
            window.setTimeout(async () => {
                await this.game.saveGame(this.game.user, this.game.grid);
            }, 100)
        });

    }

    addButton(buttonName, style, buttonText, callback) {
        this[buttonName] = document.createElement("button");
        this[buttonName].id = buttonName;
        this[buttonName].innerText = buttonText;
        Object.assign(this[buttonName].style, {
            ...style, cursor: 'pointer',
            borderRadius: '10px',
            zIndex: '1000',
            border: 'none'
        });
        document.body.appendChild(this[buttonName]);
        this[buttonName].addEventListener("click", callback);
        return this[buttonName];
    }

    addEnergyBar() {
        // Create the container for the health bar (the background)
        this.energyBarContainer = document.createElement("div");
        this.energyBarContainer.id = "energyBarContainer";
        Object.assign(this.energyBarContainer.style, {
            position: 'absolute',
            left: '10px',
            bottom: '35px',
            width: '200px',
            height: '20px',
            backgroundColor: '#333',
            border: '2px solid #000',
            borderRadius: '5px',
            zIndex: '1000',
            overflow: 'hidden'
        });
        document.body.appendChild(this.energyBarContainer);

        // Create the fill element representing the current health
        this.energyBarFill = document.createElement("div");
        this.energyBarFill.id = "energyBarFill";
        Object.assign(this.energyBarFill.style, {
            width: '100%', // Initially full health
            height: '100%',
            backgroundColor: '#a75928',
            transition: 'width 0.2s ease-out'
        });
        this.energyBarContainer.appendChild(this.energyBarFill);
    }

    addHealthBar() {
        // Create the container for the health bar (the background)
        this.healthBarContainer = document.createElement("div");
        this.healthBarContainer.id = "healthBarContainer";
        Object.assign(this.healthBarContainer.style, {
            position: 'absolute',
            left: '10px',
            bottom: '10px',
            width: '200px',
            height: '20px',
            backgroundColor: '#333',
            border: '2px solid #000',
            borderRadius: '5px',
            zIndex: '1000',
            overflow: 'hidden'
        });
        document.body.appendChild(this.healthBarContainer);

        // Create the fill element representing the current health
        this.healthBarFill = document.createElement("div");
        this.healthBarFill.id = "healthBarFill";
        Object.assign(this.healthBarFill.style, {
            width: '100%', // Initially full health
            height: '100%',
            backgroundColor: '#28a745',
            transition: 'width 0.2s ease-out'
        });
        this.healthBarContainer.appendChild(this.healthBarFill);
    }

    addBreathBar() {
        // Create the container for the breath bar (the background)
        this.breathBarContainer = document.createElement("div");
        this.breathBarContainer.id = "breathBarContainer";
        Object.assign(this.breathBarContainer.style, {
            position: 'absolute',
            left: '10px',
            bottom: '60px',
            width: '200px',
            height: '20px',
            backgroundColor: '#333',
            border: '2px solid #000',
            borderRadius: '5px',
            zIndex: '1000',
            overflow: 'hidden'
        });
        document.body.appendChild(this.breathBarContainer);

        // Create the fill element representing the current breath
        this.breathBarFill = document.createElement("div");
        this.breathBarFill.id = "breathBarFill";
        Object.assign(this.breathBarFill.style, {
            width: '100%', // Initially full breath
            height: '100%',
            backgroundColor: '#286ea7',
            transition: 'width 0.2s ease-out'
        });
        this.breathBarContainer.appendChild(this.breathBarFill);
    }

    updateUI() {
        const healthPercentage = Math.max(0, Math.min((this.game.player.health / 100) * 100, 100));
        const energyPercentage = Math.max(0, Math.min((this.game.player.energy / 100) * 100, 100));
        const breathPercentage = Math.max(0, Math.min((this.game.player.breath / 100) * 100, 100));
        this.breathBarFill.style.display = 'none';
        this.breathBarContainer.style.display = 'none';
        this.healthBarFill.style.width = healthPercentage + "%";
        this.energyBarFill.style.width = energyPercentage + "%";
        this.breathBarFill.style.width = breathPercentage + "%";
        if (breathPercentage < 95) {
            this.breathBarFill.style.display = 'block';
            this.breathBarContainer.style.display = 'block';
        }

        if (energyPercentage <= 0) {
            this.game.playerManager.die('sleep');
        }
        if (healthPercentage <= 0) {
            this.game.playerManager.die();
        }
        if (breathPercentage <= 0) {
            this.game.playerManager.die('suffocate');
        }
    }

}