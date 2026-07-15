export interface ImageSize {
  width: number;
  height: number;
}

export function fitImageIntoBounds(source: ImageSize, bounds: ImageSize): ImageSize {
  if (source.width <= 0 || source.height <= 0) return { width: bounds.width, height: bounds.height };
  const scale = Math.min(bounds.width / source.width, bounds.height / source.height, 1);
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}
