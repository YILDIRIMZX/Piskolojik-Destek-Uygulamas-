import sharp from 'sharp'
const src = 'public/icon.svg'
for (const [name, size] of [['apple-touch-icon.png', 180], ['pwa-192.png', 192], ['pwa-512.png', 512]]) {
  await sharp(src).resize(size, size).png().toFile(`public/${name}`)
}
console.log('icons ok')
