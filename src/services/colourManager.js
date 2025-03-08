const darkenColor = function(hexColor, factor) {
    // Ensure the hex color is a valid 6-digit hex string
    hexColor = hexColor & 0xFFFFFF;

    // Extract RGB components
    let r = (hexColor >> 16) & 0xFF;
    let g = (hexColor >> 8) & 0xFF;
    let b = hexColor & 0xFF;

    // Normalize factor to be between 0 and 1 (assuming factor is between 0-100)
    let darkenFactor = Math.min(Math.max(factor / 100, 0), 1);

    // Apply darkening
    r = Math.round(r * (1 - darkenFactor));
    g = Math.round(g * (1 - darkenFactor));
    b = Math.round(b * (1 - darkenFactor));

    // Convert back to hex
    let darkenedHex = (r << 16) | (g << 8) | b;

    // Return as a hex string
    return `0x${darkenedHex.toString(16).padStart(6, '0')}`;
}

export {darkenColor};