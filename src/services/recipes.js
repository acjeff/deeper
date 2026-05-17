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
    // --- Drill bit progression ----------------------------------------
    // One-shot upgrades that gate which layer caps the platform drill can
    // chew through. Mounted on the rig, not carried, so they're tracked on
    // CraneManager.drillBitTier rather than as inventory items.
    {
        id: 'drillBitCopper',
        name: 'Copper Drill Bit',
        description: 'Mounts on the rig drill. Cracks layer-2 and layer-3 caps.',
        icon: 'images/coal.png',
        inputs: [
            {id: 'copper', amount: 5},
            {id: 'coal',   amount: 5},
        ],
        output: {kind: 'drillBit', tier: 1},
    },
    {
        id: 'drillBitIron',
        name: 'Iron Drill Bit',
        description: 'Mounts on the rig drill. Cracks layer-4 caps and below.',
        icon: 'images/coal.png',
        inputs: [
            {id: 'iron', amount: 5},
            {id: 'coal', amount: 5},
        ],
        output: {kind: 'drillBit', tier: 2},
    },
    // --- Rig / shelter progression -----------------------------------
    // Each tier upgrade swaps the visible shelter on the platform deck and
    // unlocks better sleep restoration in the home interior.
    {
        id: 'rigUpgradeTent',
        name: 'Pitch Tent',
        description: 'Upgrade Mk-I raft to the Mk-II tent. Better sleep.',
        icon: 'images/wood.png',
        inputs: [
            {id: 'wood', amount: 20},
            {id: 'coal', amount: 5},
        ],
        output: {kind: 'rigTier', tier: 1},
    },
    {
        id: 'rigUpgradeCabin',
        name: 'Build Cabin',
        description: 'Upgrade Mk-II tent to the Mk-III cabin. Full home interior.',
        icon: 'images/wood.png',
        inputs: [
            {id: 'wood',   amount: 30},
            {id: 'copper', amount: 10},
        ],
        output: {kind: 'rigTier', tier: 2},
    },
];

// Forge recipes live inside the cabin, not at the lift terminal — the
// player has to enter the home and walk to the forge to upgrade their
// tools. Each upgrade is one-shot and bumps the matching tool's tier on
// the toolbar item's metadata, where breakable / tree damage formulas
// read it back. Names ladder up worn → copper → iron in step with the
// ore tiers unlocked by drilling.
export const FORGE_RECIPES = [
    {
        id: 'pickaxeCopper',
        name: 'Copper Pickaxe',
        description: 'Mining hits land 60% harder.',
        icon: 'images/pickaxe.png',
        inputs: [
            {id: 'copper', amount: 5},
            {id: 'coal',   amount: 5},
        ],
        output: {kind: 'toolTier', toolId: 'pickaxe', tier: 1, newName: 'Copper Pickaxe'},
    },
    {
        id: 'pickaxeIron',
        name: 'Iron Pickaxe',
        description: 'Mining hits land 150% harder.',
        icon: 'images/pickaxe.png',
        inputs: [
            {id: 'iron', amount: 5},
            {id: 'coal', amount: 5},
        ],
        output: {kind: 'toolTier', toolId: 'pickaxe', tier: 2, newName: 'Iron Pickaxe'},
    },
    {
        id: 'axeCopper',
        name: 'Copper Axe',
        description: 'Fells trees twice as fast.',
        icon: 'images/pickaxe.png',
        inputs: [
            {id: 'copper', amount: 5},
            {id: 'coal',   amount: 5},
        ],
        output: {kind: 'toolTier', toolId: 'axe', tier: 1, newName: 'Copper Axe'},
    },
    {
        id: 'axeIron',
        name: 'Iron Axe',
        description: 'Fells trees three times as fast.',
        icon: 'images/pickaxe.png',
        inputs: [
            {id: 'iron', amount: 5},
            {id: 'coal', amount: 5},
        ],
        output: {kind: 'toolTier', toolId: 'axe', tier: 2, newName: 'Iron Axe'},
    },
];
