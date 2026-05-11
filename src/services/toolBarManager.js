import { HUD } from './uiManager.js';

// Pip-Boy phosphor palette — matches the lift terminal and inventory
// panel so the radial selector reads as the same in-world device.
const PIP_GREEN = '#33ff33';
const PIP_DIM = '#1a8a1a';
const PIP_FONT = "'VT323', 'Share Tech Mono', monospace";
const WHEEL_STYLE_ID = 'pipboy-wheel-styles';

function injectWheelStyles() {
    if (document.getElementById(WHEEL_STYLE_ID)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = WHEEL_STYLE_ID;
    style.textContent = `
        .pipboy-wheel-inner::before,
        .pipboy-wheel-inner::after {
            content: '';
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
        }
        .pipboy-wheel-inner::before {
            inset: -8px;
            border: 1px solid ${PIP_DIM};
            box-shadow: 0 0 18px rgba(51, 255, 51, 0.25),
                        inset 0 0 18px rgba(51, 255, 51, 0.08);
        }
        .pipboy-wheel-inner::after {
            inset: 0;
            background: repeating-linear-gradient(
                to bottom,
                rgba(0,0,0,0) 0,
                rgba(0,0,0,0) 2px,
                rgba(0,0,0,0.22) 2px,
                rgba(0,0,0,0.22) 3px
            );
            -webkit-mask: radial-gradient(circle at center, #000 60%, transparent 100%);
            mask: radial-gradient(circle at center, #000 60%, transparent 100%);
        }
    `;
    document.head.appendChild(style);
}

function describeArc(cx, cy, outerR, innerR, startAngle, endAngle) {
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

export default class ToolbarManager {
    /**
     * @param {Phaser.Scene} scene - Your game scene.
     * @param {string} containerId - The DOM element ID for the toolbar container.
     * @param {number} numSlots - Number of toolbar slots (default 7).
     */
    constructor(scene, containerId = 'toolbarContainer', numSlots = 7) {
        this.game = scene;
        this.numSlots = numSlots;

        this.game.selectedIndex = 0;
        this.slots = new Array(numSlots).fill(null);
        // The visible bottom-center toolbar has been replaced by the radial
        // selector — keep an off-screen container so render() / drag-drop
        // targets still exist without taking screen real estate.
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            Object.assign(this.container.style, {
                position: 'absolute',
                left: '-9999px',
                top: '-9999px',
                display: 'none',
                pointerEvents: 'none',
            });
            document.body.appendChild(this.container);
        }
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= String(this.numSlots)) {
                const index = parseInt(e.key, 10) - 1;
                this.setSelected(index);
            }
            if (e.key === 'Shift' && !e.repeat && !this.wheelOpen) {
                this.openWheel();
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift' && this.wheelOpen) {
                this.closeWheel(true);
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (this.wheelOpen) {
                this.updateWheelHighlight(e.clientX, e.clientY);
            }
        });
        window.addEventListener('blur', () => {
            if (this.wheelOpen) this.closeWheel(false);
        });

        this.render();
    }

    openWheel() {
        this.wheelOpen = true;
        this.wheelHighlightIndex = -1;
        if (!this.wheelOverlay) this.createWheelOverlay();
        this.wheelOverlay.style.display = 'flex';
        // Animate in
        requestAnimationFrame(() => {
            this.wheelOverlay.style.opacity = '1';
            this.wheelInner.style.transform = 'scale(1)';
        });
        this.renderWheel();
    }

    closeWheel(applySelection) {
        if (!this.wheelOpen) return;
        this.wheelOpen = false;
        if (applySelection && this.wheelHighlightIndex >= 0) {
            this.setSelected(this.wheelHighlightIndex);
        }
        if (this.wheelOverlay) {
            this.wheelOverlay.style.opacity = '0';
            this.wheelInner.style.transform = 'scale(0.92)';
            const overlay = this.wheelOverlay;
            setTimeout(() => {
                if (!this.wheelOpen) overlay.style.display = 'none';
            }, 140);
        }
    }

    createWheelOverlay() {
        injectWheelStyles();
        this.wheelOverlay = document.createElement('div');
        Object.assign(this.wheelOverlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: '2000',
            background: 'radial-gradient(circle at center, rgba(0, 24, 0, 0.55) 0%, rgba(0, 0, 0, 0) 60%)',
            opacity: '0',
            transition: 'opacity 140ms ease',
        });
        this.wheelInner = document.createElement('div');
        this.wheelInner.className = 'pipboy-wheel-inner';
        Object.assign(this.wheelInner.style, {
            position: 'relative',
            width: '320px',
            height: '320px',
            transform: 'scale(0.92)',
            transition: 'transform 140ms ease',
        });
        this.wheelOverlay.appendChild(this.wheelInner);
        document.body.appendChild(this.wheelOverlay);
    }

    renderWheel() {
        if (!this.wheelInner) return;
        this.wheelInner.innerHTML = '';
        const size = 320;
        const cx = size / 2;
        const cy = size / 2;
        const outerR = size / 2 - 4;
        const innerR = 50;
        const slotsCount = this.numSlots;
        const sliceAngle = (2 * Math.PI) / slotsCount;
        // Slot 0 centered at the top: top angle is -PI/2; sector spans (-PI/2 - half, -PI/2 + half)
        const startOffset = -Math.PI / 2 - sliceAngle / 2;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.style.position = 'absolute';
        svg.style.inset = '0';
        svg.style.filter = 'drop-shadow(0 0 12px rgba(51, 255, 51, 0.35))';

        for (let i = 0; i < slotsCount; i++) {
            const a0 = startOffset + i * sliceAngle;
            const a1 = startOffset + (i + 1) * sliceAngle;
            const selected = i === this.wheelHighlightIndex;
            const path = describeArc(cx, cy, outerR, innerR, a0, a1);
            const pathEl = document.createElementNS(svgNS, 'path');
            pathEl.setAttribute('d', path);
            pathEl.setAttribute('fill', selected ? 'rgba(51, 255, 51, 0.22)' : 'rgba(0, 16, 0, 0.85)');
            pathEl.setAttribute('stroke', selected ? PIP_GREEN : PIP_DIM);
            pathEl.setAttribute('stroke-width', selected ? '2' : '1');
            svg.appendChild(pathEl);
        }
        this.wheelInner.appendChild(svg);

        const iconR = (innerR + outerR) / 2;
        for (let i = 0; i < slotsCount; i++) {
            const item = this.slots[i];
            const angle = startOffset + (i + 0.5) * sliceAngle;
            const x = cx + Math.cos(angle) * iconR;
            const y = cy + Math.sin(angle) * iconR;
            const wrap = document.createElement('div');
            const selected = i === this.wheelHighlightIndex;
            Object.assign(wrap.style, {
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                transform: `translate(-50%, -50%) ${selected ? 'scale(1.15)' : 'scale(1)'}`,
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selected ? PIP_GREEN : PIP_DIM,
                fontFamily: PIP_FONT,
                fontSize: '18px',
                letterSpacing: '0.08em',
                opacity: item ? '1' : (selected ? '0.95' : '0.5'),
                transition: 'transform 120ms ease, color 120ms ease, opacity 120ms ease',
                pointerEvents: 'none',
                textShadow: '0 0 4px rgba(51, 255, 51, 0.6)',
            });
            if (item) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                Object.assign(img.style, {
                    width: '38px',
                    height: '38px',
                    objectFit: 'contain',
                    transform: `rotate(${item.rotate || 0}deg)`,
                    filter: selected
                        ? 'drop-shadow(0 0 6px rgba(51, 255, 51, 0.75)) brightness(0.8) sepia(1) hue-rotate(60deg) saturate(6)'
                        : 'drop-shadow(0 0 3px rgba(51, 255, 51, 0.45)) brightness(0.6) sepia(1) hue-rotate(60deg) saturate(5)',
                });
                wrap.appendChild(img);
            } else {
                wrap.textContent = String(i + 1);
            }
            this.wheelInner.appendChild(wrap);

            // Hotkey label near the outer edge
            const labelR = outerR - 14;
            const lx = cx + Math.cos(angle) * labelR;
            const ly = cy + Math.sin(angle) * labelR;
            const hotkey = document.createElement('div');
            hotkey.textContent = String(i + 1);
            Object.assign(hotkey.style, {
                position: 'absolute',
                left: `${lx}px`,
                top: `${ly}px`,
                transform: 'translate(-50%, -50%)',
                fontFamily: PIP_FONT,
                fontSize: '14px',
                letterSpacing: '0.06em',
                color: selected ? PIP_GREEN : PIP_DIM,
                pointerEvents: 'none',
                textShadow: '0 0 3px rgba(51, 255, 51, 0.5)',
            });
            this.wheelInner.appendChild(hotkey);
        }

        // Center label
        const center = document.createElement('div');
        const highlighted = this.wheelHighlightIndex >= 0 ? this.slots[this.wheelHighlightIndex] : null;
        center.innerHTML = highlighted
            ? `<div style="font-size:11px;color:${PIP_DIM};letter-spacing:0.2em;margin-bottom:2px;">EQUIP</div><div>${highlighted.name.toUpperCase()}</div>`
            : `<div style="color:${PIP_DIM};letter-spacing:0.18em;">SELECT</div>`;
        Object.assign(center.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: PIP_FONT,
            fontSize: '18px',
            color: PIP_GREEN,
            textAlign: 'center',
            pointerEvents: 'none',
            textShadow: '0 0 5px rgba(51, 255, 51, 0.7)',
            letterSpacing: '0.08em',
            maxWidth: '92px',
            lineHeight: '1.15',
        });
        this.wheelInner.appendChild(center);
    }

    updateWheelHighlight(mouseX, mouseY) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = mouseX - cx;
        const dy = mouseY - cy;
        const dist = Math.hypot(dx, dy);
        const deadZone = 28;
        let newIndex = -1;
        if (dist >= deadZone) {
            const sliceAngle = (2 * Math.PI) / this.numSlots;
            // Slot 0 centered at the top (-PI/2). Shift atan2 result so 0 falls
            // at the start of slot 0's arc, then bucket by sliceAngle.
            let angle = Math.atan2(dy, dx) + Math.PI / 2 + sliceAngle / 2;
            angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            newIndex = Math.floor(angle / sliceAngle) % this.numSlots;
        }
        if (newIndex !== this.wheelHighlightIndex) {
            this.wheelHighlightIndex = newIndex;
            this.renderWheel();
        }
    }

    styleSlot(slotEl, selected) {
        Object.assign(slotEl.style, {
            width: '54px',
            height: '54px',
            background: selected
                ? 'linear-gradient(135deg, rgba(91, 157, 255, 0.18) 0%, rgba(91, 157, 255, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: selected
                ? `1px solid ${HUD.accent}`
                : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            cursor: 'pointer',
            transition: 'transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease',
            boxShadow: selected
                ? `0 0 0 3px rgba(91, 157, 255, 0.18), 0 8px 20px rgba(91, 157, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)`
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            transform: selected ? 'translateY(-2px)' : 'translateY(0)',
        });
    }

    render() {
        this.container.innerHTML = '';
        for (let i = 0; i < this.numSlots; i++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('toolbar-slot');
            slotEl.dataset.index = i;
            this.styleSlot(slotEl, i === this.game.selectedIndex);

            // Hotkey badge (1-7)
            const hotkey = document.createElement('div');
            hotkey.textContent = String(i + 1);
            Object.assign(hotkey.style, {
                position: 'absolute',
                top: '4px',
                left: '6px',
                fontFamily: HUD.fontMono,
                fontSize: '9px',
                fontWeight: '600',
                color: i === this.game.selectedIndex ? HUD.accent : HUD.textDim,
                letterSpacing: '0.05em',
                pointerEvents: 'none',
                transition: 'color 160ms ease',
            });
            slotEl.appendChild(hotkey);

            slotEl.addEventListener('mouseenter', () => {
                if (i !== this.game.selectedIndex) {
                    slotEl.style.transform = 'translateY(-1px)';
                    slotEl.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                    slotEl.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)';
                }
            });
            slotEl.addEventListener('mouseleave', () => {
                if (i !== this.game.selectedIndex) this.styleSlot(slotEl, false);
            });
            slotEl.addEventListener('click', () => this.setSelected(i));

            slotEl.addEventListener('dragover', (e) => e.preventDefault());
            slotEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedItemId = e.dataTransfer.getData('text/plain');
                const source = e.dataTransfer.getData('source');
                const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
                const targetIndex = parseInt(slotEl.dataset.index, 10);
                if (source === 'toolbar') {
                    if (sourceIndex === targetIndex) return;
                    this.swapItems(sourceIndex, targetIndex);
                } else if (source === 'inventory') {
                    const inventoryManager = this.game.inventoryManager;
                    const draggedItem = inventoryManager.slots[sourceIndex];
                    if (!draggedItem) return;
                    const targetItem = this.slots[targetIndex];
                    this.slots[targetIndex] = draggedItem;
                    inventoryManager.removeItemFromSlot(sourceIndex);
                    if (targetItem) {
                        inventoryManager.addItemToSlot(sourceIndex, targetItem);
                    }
                    this.render();
                    inventoryManager.render();
                }
                this.setSelected(this.game.selectedIndex);
            });

            const item = this.slots[i];
            if (item) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.title = item.name;
                Object.assign(img.style, {
                    width: '72%',
                    height: '72%',
                    objectFit: 'contain',
                    transform: `rotate(${item.rotate}deg)`,
                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
                    pointerEvents: 'none',
                });
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('source', 'toolbar');
                    e.dataTransfer.setData('sourceIndex', i.toString());
                });
                img.draggable = true;
                img.style.pointerEvents = 'auto';

                if (item.metadata?.number != null) {
                    const number = document.createElement('div');
                    Object.assign(number.style, {
                        color: '#fff',
                        position: 'absolute',
                        bottom: '4px',
                        right: '5px',
                        fontWeight: '700',
                        fontSize: '11px',
                        fontFamily: HUD.fontMono,
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '1px 5px',
                        minWidth: '18px',
                        textAlign: 'center',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(6px)',
                        pointerEvents: 'none',
                        fontVariantNumeric: 'tabular-nums',
                    });
                    number.innerHTML = item.metadata.number;
                    slotEl.appendChild(number);
                }
                slotEl.appendChild(img);
            } else {
                const empty = document.createElement('div');
                Object.assign(empty.style, {
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    pointerEvents: 'none',
                });
                slotEl.appendChild(empty);
            }
            this.container.appendChild(slotEl);
        }
    }

    swapItems(sourceIndex, targetIndex) {
        const temp = this.slots[sourceIndex];
        this.slots[sourceIndex] = this.slots[targetIndex];
        this.slots[targetIndex] = temp;
        this.render();
        this.setSelected(this.game.selectedIndex);
    }

    removeItemBySlot(index) {
        if (index >= 0 && index < this.numSlots) {
            this.slots[index] = null;
            this.render();
            this.setSelected(this.game.selectedIndex);
        }
    }

    addItemToSlot(index, item) {
        if (index >= 0 && index < this.numSlots) {
            this.slots[index] = item;
            this.render();
            if (this.game.selectedIndex === null || this.game.selectedIndex === undefined) {
                this.setSelected(index);
            }
        }
    }

    setSelected(index) {
        if (index < 0 || index >= this.numSlots) return;
        this.game.selectedIndex = index;
        const slotEls = this.container.children;
        for (let i = 0; i < slotEls.length; i++) {
            this.styleSlot(slotEls[i], i === index);
            const hotkey = slotEls[i].querySelector('div');
            if (hotkey) hotkey.style.color = i === index ? HUD.accent : HUD.textDim;
        }
        if (this.game) {
            this.game.selectedTool = this.slots[index];
            if (this.game.selectedTool) {
                if (this.game.toolSprite) this.game.toolSprite.destroy();
                this.game.toolSprite = this.game.add.image(this.game.player.body.x, this.game.player.body.y + 4.2, this.game.selectedTool.id);
                if (this.game.selectedTool.id === 'lamp') {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.1, this.game.toolSprite.height * 0.1);
                } else if (this.game.selectedTool.id.includes('rail')) {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.05, this.game.toolSprite.height * 0.05);
                } else if (this.game.selectedTool.id.includes('minecart')) {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.08, this.game.toolSprite.height * 0.08);
                } else {
                    this.game.toolSprite.setDisplaySize(this.game.toolSprite.width * 0.2, this.game.toolSprite.height * 0.2);
                }

                this.game.toolSprite.setRotation(Phaser.Math.DegToRad(-45));
                this.game.toolSprite.setDepth(3);
            }
        }
    }

    getItemById(itemId) {
        return this.slots.find(item => item && item.id === itemId) || null;
    }
}
