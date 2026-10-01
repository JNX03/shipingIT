// Relative luminance from WCAG's sRGB definition. Brand tints are fixed six-digit hex values.
export function luminance(hex: string) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    ?.map((part) => {
      const value = Number.parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  if (!channels || channels.length !== 3 || channels.some((value) => !Number.isFinite(value)))
    return 1;
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function textOnTint(hex: string) {
  return 1.05 / (luminance(hex) + 0.05) >= 4.5 ? '#FFFFFF' : '#030711';
}
