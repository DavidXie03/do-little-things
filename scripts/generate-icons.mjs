import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resDir = resolve(__dirname, '../android/app/src/main/res')

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

const fgSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
}

const launcherSvg = readFileSync(resolve(__dirname, 'generate-icons.svg'))
const roundSvg = readFileSync(resolve(__dirname, 'generate-icons-round.svg'))
const fgSvg = readFileSync(resolve(__dirname, 'generate-icons-foreground.svg'))

async function generate() {
  for (const [folder, size] of Object.entries(sizes)) {
    await sharp(launcherSvg).resize(size, size).png().toFile(resolve(resDir, folder, 'ic_launcher.png'))
    console.log(`✅ ${folder}/ic_launcher.png (${size}x${size})`)
    await sharp(roundSvg).resize(size, size).png().toFile(resolve(resDir, folder, 'ic_launcher_round.png'))
    console.log(`✅ ${folder}/ic_launcher_round.png (${size}x${size})`)
  }
  for (const [folder, size] of Object.entries(fgSizes)) {
    await sharp(fgSvg).resize(size, size).png().toFile(resolve(resDir, folder, 'ic_launcher_foreground.png'))
    console.log(`✅ ${folder}/ic_launcher_foreground.png (${size}x${size})`)
  }
  console.log('\n🎉 All icons generated!')
}

generate().catch(console.error)
