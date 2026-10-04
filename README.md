# Seans

Kişisel kullanım için seans, günlük ve rapor uygulaması (PWA). Kodda hiçbir kişisel veri yoktur. Tüm veriler kullanıcının telefonunda, PIN ile şifreli (AES-GCM) tutulur ve seans mesajları doğrudan Anthropic API'ye gider.

## Geliştirme

```bash
npm install
npm run dev
```

## Yayın

`main` dalına her push, GitHub Actions ile GitHub Pages'e yayınlanır (Settings > Pages > Source: GitHub Actions).
