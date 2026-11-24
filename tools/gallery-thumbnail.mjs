import sharp from 'sharp';

export async function galleryThumbnailSize(source) {
  const { width, height } = await sharp(source).metadata();
  if (!width || !height) throw Error('画像のサイズを読み取れません。');
  return { width: Math.max(1, Math.floor(width / 3)), height: Math.max(1, Math.floor(height / 3)) };
}

export async function galleryThumbnail(source) {
  const size = await galleryThumbnailSize(source);
  return sharp(source).resize({ ...size, fit: 'fill' }).webp({ quality: 65, alphaQuality: 75, effort: 6 });
}
