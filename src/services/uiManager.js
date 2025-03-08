export default class UiManager {
    constructor(scene) {
        this.scene = scene;

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
                await this.scene.saveGame(this.scene.user, this.scene.grid);
                this['backToMenuButton'].remove();
                this['saveButton'].remove();
                this.scene.lightCanvas.remove();
                this.scene.scene.stop("GameScene"); // ✅ Stop the game scene
                this.scene.scene.start("MenuScene");
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
            this.scene['saveButton'].disabled = true;
            this.scene['saveButton'].innerHTML = "Saving...";
            window.setTimeout(async () => {
                await this.scene.saveGame(this.scene.user, this.scene.grid);
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

}