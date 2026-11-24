# Quasy

Jump rope workout tracker (MVP).

```powershell
npm install
npm run dev     # https://localhost:5173 and https://<LAN-IP>:5173
npm test        # vitest
npm run build
```

## Deploy

Live: https://quasy.vercel.app. Vercel is connected to this GitHub repo: every `git push` to `master`
publishes the site automatically (other branches get preview URLs). Manual fallback: `npx vercel deploy --prod`.

## Local phone testing

Phone testing: phone and PC on the same network, open the `Network` URL Vite prints, always with `https://`. HTTPS is required for camera access.

iPhone: Safari denies the camera on a "Not secure" page, so trust the dev CA once.
Copy the mkcert root CA into `public/` (gitignored), it is served at `/dev-ca.crt`:

```powershell
Copy-Item $HOME\.vite-plugin-mkcert\rootCA.pem public\dev-ca.crt
```

1. Safari → `https://<LAN-IP>:5173/dev-ca.crt` → Allow (profile downloaded).
2. Settings → Profile Downloaded → Install.
3. Settings → General → About → Certificate Trust Settings → enable "mkcert …".
4. Reopen the site: no "Not secure", then Enable camera → Allow.
