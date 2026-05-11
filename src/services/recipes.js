// Crafting recipes used by the lift terminal's crafting table.
//
// Each recipe consumes raw materials (wood / coal from the player's
// inventory and metal from the rig's stockpile) and produces either an
// item stack (bumping an existing tool's metadata.number) or refills the
// rig's metal-rope pool used by EXTEND ROPE.
//
// Recipes that target a tool the player doesn't have a stack of yet are
// no-ops on the consumer side: we look the tool up by id across the
// inventory and toolbar, and only bump if found. The default GameScene
// loadout seeds the toolbar with the tools listed below so the lookups
// resolve from the start.

export const RECIPES = [
    {
        id: 'metalRope',
        name: 'Metal Rope',
        description: 'Refills the rig\'s rope stockpile (+50 m of reach when extended).',
        icon: 'images/wood.png',
        inputs: [
            {id: 'wood', amount: 3},
            {id: 'coal', amount: 2},
        ],
        output: {kind: 'metal', amount: 50},
    },
    {
        id: 'buttress',
        name: 'Buttress',
        description: 'Wooden support beam.',
        icon: 'images/buttress.png',
        inputs: [
            {id: 'wood', amount: 2},
        ],
        output: {kind: 'tool', toolId: 'buttress', amount: 1},
    },
    {
        id: 'rail',
        name: 'Rail',
        description: 'Flat track segment for mine carts.',
        icon: 'images/rail.png',
        inputs: [
            {id: 'wood', amount: 1},
            {id: 'coal', amount: 1},
        ],
        output: {kind: 'tool', toolId: 'rail', amount: 1},
    },
    {
        id: 'rail-left',
        name: 'Rail (Left)',
        description: 'Diagonal track segment, sloping up-left.',
        icon: 'images/rail.png',
        iconRotate: 45,
        inputs: [
            {id: 'wood', amount: 1},
            {id: 'coal', amount: 1},
        ],
        output: {kind: 'tool', toolId: 'rail-left', amount: 1},
    },
    {
        id: 'rail-right',
        name: 'Rail (Right)',
        description: 'Diagonal track segment, sloping up-right.',
        icon: 'images/rail.png',
        iconRotate: -45,
        inputs: [
            {id: 'wood', amount: 1},
            {id: 'coal', amount: 1},
        ],
        output: {kind: 'tool', toolId: 'rail-right', amount: 1},
    },
    {
        id: 'lamp',
        name: 'Lamp',
        description: 'Casts a wide, warm light when placed.',
        icon: 'images/lamp.png',
        inputs: [
            {id: 'wood', amount: 2},
            {id: 'coal', amount: 1},
        ],
        output: {kind: 'tool', toolId: 'lamp', amount: 1},
    },
    {
        id: 'minecart',
        name: 'Mine Cart',
        description: 'Hauls debris along a rail line.',
        icon: 'images/mine-cart.png',
        inputs: [
            {id: 'wood', amount: 5},
            {id: 'coal', amount: 3},
        ],
        output: {kind: 'tool', toolId: 'minecart', amount: 1},
    },
];
