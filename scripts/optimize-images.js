#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const OUTPUT_DIR = IMAGES_DIR;

const SIZES = {
  hero: { widths: [640, 1024, 1440, 1920], quality: 80 },
  content: { widths: [480, 768, 1024], quality: 80 },
};

const HERO_IMAGES = ['hero-luxury.jpg', 'gift-hero.jpg', 'story-hero.jpg'];

async function optimizeImage(inputPath, baseName) {
  const isHero = HERO_IMAGES.includes(path.basename(inputPath));
  const config = isHero ? SIZES.hero : SIZES.content;

  for (const width of config.widths) {
    const webpOutput = path.join(OUTPUT_DIR, `${baseName}-${width}w.webp`);
    if (!fs.existsSync(webpOutput)) {
      await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: config.quality })
        .toFile(webpOutput);
      console.log(`  Created: ${path.basename(webpOutput)}`);
    }
  }

  const webpFull = path.join(OUTPUT_DIR, `${baseName}.webp`);
  if (!fs.existsSync(webpFull)) {
    await sharp(inputPath)
      .webp({ quality: config.quality })
      .toFile(webpFull);
    console.log(`  Created: ${path.basename(webpFull)}`);
  }
}

async function main() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f =>
    f.endsWith('.jpg') && !f.includes('-w.') && !f.endsWith('.webp')
  );

  console.log(`Optimizing ${files.length} images...\n`);

  for (const file of files) {
    const inputPath = path.join(IMAGES_DIR, file);
    const baseName = path.basename(file, '.jpg');
    console.log(`Processing: ${file}`);
    await optimizeImage(inputPath, baseName);
  }

  console.log('\nDone!');
}

main().catch(console.error);
