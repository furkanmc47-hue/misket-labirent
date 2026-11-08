# Misket Labirenti

Hikâyeli 3D labirent oyunu: kasabalılarla konuş, küçük ayrıntılardan gizemi çöz, 5 kişiye kadar birlikte oyna. Three.js ile yazıldı, masaüstü sürümü Electron ile çalışır.

## Oynamak

`app/index.html` dosyasını tarayıcıda açman yeterli; oyun internetsiz de çalışır. Oda kurmak için masaüstü sürümü gerekir, tarayıcı sürümü yalnızca bir sunucudaki odalara katılabilir.

## Çok oyunculu

- **Aynı ağda:** Biri "Bu bilgisayarda oda kur" der (Windows güvenlik duvarı sorarsa izin verir), lobideki adresi paylaşır. Diğerleri adresi yazıp katılır. Oda kodu gerekmez.
- **İnternet üzerinden:** `npm run server` komutunu herkesin erişebildiği bir bilgisayarda çalıştır (varsayılan port 41707). Biri "Bu sunucuda yeni oda kur" der, diğerleri aynı adres ve oda koduyla katılır. Alternatif olarak ev sahibi 41707 portunu yönlendirebilir ya da herkes aynı Tailscale ağına girebilir.
- Bağlantı şifresizdir (`ws://`). Halka açık bir sunucuda `wss://` veren bir vekil sunucunun arkasına koy.

## Geliştirme

```
npm install
npm start
```

- `npm run bundle`: `src/` klasörünü `app/` içine paketler.
- `npm run build`: Windows kurulum ve taşınabilir sürümlerini üretir.
- `npm run server`: Çok oyunculu oda sunucusunu tek başına çalıştırır.
- `node scripts/check-levels.mjs`: Haritaların çözülebilir olduğunu doğrular.
