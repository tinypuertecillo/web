const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputImages = [
  'C:\\Users\\Mario\\.gemini\\antigravity\\brain\\4472a764-4dfd-46eb-b1dd-d7a619029326\\media__1779482059639.jpg',
  'C:\\Users\\Mario\\.gemini\\antigravity\\brain\\4472a764-4dfd-46eb-b1dd-d7a619029326\\media__1779482059711.jpg',
  'C:\\Users\\Mario\\.gemini\\antigravity\\brain\\4472a764-4dfd-46eb-b1dd-d7a619029326\\media__1779482059752.jpg'
];

const outputBase = 'c:\\Users\\Mario\\Desktop\\TinyPuertecillo\\public\\arq-puertecillo-';

async function processImages() {
  for (let i = 0; i < inputImages.length; i++) {
    const inputPath = inputImages[i];
    const outputPath = `${outputBase}${i + 1}.webp`;
    
    try {
      await sharp(inputPath)
        .resize({ width: 1600, withoutEnlargement: true }) // Improve resolution (by ensuring it's large enough, scaling if needed though withoutEnlargement prevents it from being blurry if small)
        .modulate({
          saturation: 1.4, // Resaltar colores
          brightness: 1.05
        })
        .webp({ quality: 90 }) // Formato webp con alta calidad
        .toFile(outputPath);
      
      console.log(`Processed ${inputPath} -> ${outputPath}`);
    } catch (error) {
      console.error(`Error processing ${inputPath}:`, error);
    }
  }
}

processImages();
