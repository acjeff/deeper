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

function getColorForPercentage(percentage) {
    // Ensure percentage is between 0 and 1.
    percentage = Phaser.Math.Clamp(percentage, 0, 1);

    // Define green and red as Phaser Color objects.
    const green = new Phaser.Display.Color(0, 255, 0);
    const red = new Phaser.Display.Color(255, 0, 0);

    // Get the interpolated color.
    const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(green, red, 1, percentage);

    // Convert the color to a hexadecimal value.
    return Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b);
}

export {darkenColor, getColorForPercentage};