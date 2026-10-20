import sharp from "sharp";
/** @param {Buffer} input */
export async function prepareChargerPhoto(input) {
  const image = sharp(input, { limitInputPixels: 24000000 });
  const metadata = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages || 1) !== 1
  )
    throw Error("Unsupported still photo");
  return image
    .rotate()
    .resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 84 })
    .toBuffer();
}
