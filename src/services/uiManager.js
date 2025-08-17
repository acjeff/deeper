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
            left: '20px',
            top: '20px',
            padding: '15px 25px',
            fontSize: '14px',
            fontWeight: '600',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#00ffff',
            border: '2px solid #00ffff',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
        }, '← EXIT', async () => {
            // 🚀 UI Update Before Processing
            this['backToMenuButton'].disabled = true;
            this['backToMenuButton'].style.pointerEvents = 'none';
            this['backToMenuButton'].innerHTML = "SAVING...";
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
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            fontSize: '14px',
            fontWeight: '600',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ff00ff',
            border: '2px solid #ff00ff',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
        }, 'SAVE', async () => {
            // 🚀 UI Update Before Processing
            this.game['saveButton'].disabled = true;
            this.game['saveButton'].innerHTML = "SAVING...";
            window.setTimeout(async () => {
                await this.game.saveGame(this.game.user, this.game.grid);
            }, 100)
        });
    }

    addButton(buttonName, style, buttonText, callback) {
        this[buttonName] = document.createElement("button");
        this[buttonName].id = buttonName;
        this[buttonName].innerHTML = buttonText;
        Object.assign(this[buttonName].style, {
            ...style, 
            cursor: 'pointer',
            borderRadius: '0px',
            zIndex: '1000',
            fontFamily: 'monospace',
            outline: 'none',
            backdropFilter: 'blur(10px)'
        });
        
        // Add hover effects
        this[buttonName].addEventListener('mouseenter', () => {
            this[buttonName].style.transform = 'scale(1.05)';
            this[buttonName].style.background = 'rgba(0, 0, 0, 0.9)';
        });
        
        this[buttonName].addEventListener('mouseleave', () => {
            this[buttonName].style.transform = 'scale(1)';
            this[buttonName].style.background = 'rgba(0, 0, 0, 0.8)';
        });
        
        document.body.appendChild(this[buttonName]);
        this[buttonName].addEventListener("click", callback);
        return this[buttonName];
    }

    addEnergyBar() {
        // Create the container for the energy bar
        this.energyBarContainer = document.createElement("div");
        this.energyBarContainer.id = "energyBarContainer";
        Object.assign(this.energyBarContainer.style, {
            position: 'absolute',
            left: '20px',
            bottom: '60px',
            width: '250px',
            height: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #ffaa00',
            borderRadius: '0px',
            zIndex: '1000',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
        });
        document.body.appendChild(this.energyBarContainer);

        // Create the fill element
        this.energyBarFill = document.createElement("div");
        this.energyBarFill.id = "energyBarFill";
        Object.assign(this.energyBarFill.style, {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #ffaa00 0%, #ff6600 100%)',
            borderRadius: '0px',
            transition: 'width 0.3s ease-out'
        });
        this.energyBarContainer.appendChild(this.energyBarFill);
        
        // Add energy label
        const energyLabel = document.createElement("div");
        energyLabel.innerHTML = "ENERGY";
        Object.assign(energyLabel.style, {
            position: 'absolute',
            left: '0px',
            top: '-20px',
            fontSize: '10px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase'
        });
        this.energyBarContainer.appendChild(energyLabel);
    }

    addHealthBar() {
        // Create the container for the health bar
        this.healthBarContainer = document.createElement("div");
        this.healthBarContainer.id = "healthBarContainer";
        Object.assign(this.healthBarContainer.style, {
            position: 'absolute',
            left: '20px',
            bottom: '20px',
            width: '250px',
            height: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #ff0066',
            borderRadius: '0px',
            zIndex: '1000',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
        });
        document.body.appendChild(this.healthBarContainer);

        // Create the fill element
        this.healthBarFill = document.createElement("div");
        this.healthBarFill.id = "healthBarFill";
        Object.assign(this.healthBarFill.style, {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #ff0066 0%, #cc0044 100%)',
            borderRadius: '0px',
            transition: 'width 0.3s ease-out'
        });
        this.healthBarContainer.appendChild(this.healthBarFill);
        
        // Add health label
        const healthLabel = document.createElement("div");
        healthLabel.innerHTML = "HEALTH";
        Object.assign(healthLabel.style, {
            position: 'absolute',
            left: '0px',
            top: '-20px',
            fontSize: '10px',
            color: '#ff0066',
            fontFamily: 'monospace',
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase'
        });
        this.healthBarContainer.appendChild(healthLabel);
    }

    addBreathBar() {
        // Create the container for the breath bar
        this.breathBarContainer = document.createElement("div");
        this.breathBarContainer.id = "breathBarContainer";
        Object.assign(this.breathBarContainer.style, {
            position: 'absolute',
            left: '20px',
            bottom: '100px',
            width: '250px',
            height: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #00ccff',
            borderRadius: '0px',
            zIndex: '1000',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
        });
        document.body.appendChild(this.breathBarContainer);

        // Create the fill element
        this.breathBarFill = document.createElement("div");
        this.breathBarFill.id = "breathBarFill";
        Object.assign(this.breathBarFill.style, {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #00ccff 0%, #0099cc 100%)',
            borderRadius: '0px',
            transition: 'width 0.3s ease-out'
        });
        this.breathBarContainer.appendChild(this.breathBarFill);
        
        // Add breath label
        const breathLabel = document.createElement("div");
        breathLabel.innerHTML = "BREATH";
        Object.assign(breathLabel.style, {
            position: 'absolute',
            left: '0px',
            top: '-20px',
            fontSize: '10px',
            color: '#00ccff',
            fontFamily: 'monospace',
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase'
        });
        this.breathBarContainer.appendChild(breathLabel);
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
        
        // Update health bar color based on percentage
        if (healthPercentage < 30) {
            this.healthBarFill.style.background = 'linear-gradient(90deg, #ff0000 0%, #cc0000 100%)';
        } else if (healthPercentage < 60) {
            this.healthBarFill.style.background = 'linear-gradient(90deg, #ff6600 0%, #cc5500 100%)';
        } else {
            this.healthBarFill.style.background = 'linear-gradient(90deg, #ff0066 0%, #cc0044 100%)';
        }
        
        // Update energy bar color based on percentage
        if (energyPercentage < 30) {
            this.energyBarFill.style.background = 'linear-gradient(90deg, #ff0000 0%, #cc0000 100%)';
        } else if (energyPercentage < 60) {
            this.energyBarFill.style.background = 'linear-gradient(90deg, #ff6600 0%, #cc5500 100%)';
        } else {
            this.energyBarFill.style.background = 'linear-gradient(90deg, #ffaa00 0%, #ff6600 100%)';
        }
        
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
    }
}