# Deploy a `thesunsessionclub.com` en Hostinger

## Ruta recomendada

Para este proyecto, la ruta recomendada es **Hostinger VPS**.

Motivos:

- usa `Node.js + Express`
- usa `Prisma + SQLite`
- genera archivos en `uploads/`
- genera imÃ¡genes de tickets con `sharp`
- necesita un proceso backend persistente

El hosting compartido o un flujo solo de frontend no es la opciÃ³n ideal para este proyecto completo.

## Archivos listos

- `server/.env.production.example`
- `deploy/hostinger-vps/nginx-thesunsessionclub.conf`
- `deploy/hostinger-vps/sunsesh.service`

## Variables de producciÃ³n

Crea `server/.env` en el VPS con base en `server/.env.production.example`.

Valores importantes:

- `NODE_ENV=production`
- `SITE_URL=https://thesunsessionclub.com`
- `CORS_ORIGINS=https://thesunsessionclub.com,https://www.thesunsessionclub.com`
- `COOKIE_DOMAIN=.thesunsessionclub.com`
- `SECURE_COOKIES=true`
- `JWT_SECRET` y `JWT_REFRESH_SECRET` nuevos

## Pasos en el VPS

1. Instala Node 20 y Nginx.
2. Sube el proyecto a `/var/www/sunsesh`.
3. Entra a `server/`.
4. Ejecuta:

```bash
npm install
npx prisma generate
npx prisma db push
```

5. Copia el servicio:

```bash
sudo cp /var/www/sunsesh/deploy/hostinger-vps/sunsesh.service /etc/systemd/system/sunsesh.service
sudo systemctl daemon-reload
sudo systemctl enable sunsesh
sudo systemctl start sunsesh
```

6. Copia la config de Nginx:

```bash
sudo cp /var/www/sunsesh/deploy/hostinger-vps/nginx-thesunsessionclub.conf /etc/nginx/sites-available/thesunsessionclub.com
sudo ln -s /etc/nginx/sites-available/thesunsessionclub.com /etc/nginx/sites-enabled/thesunsessionclub.com
sudo nginx -t
sudo systemctl reload nginx
```

7. Activa SSL:

```bash
sudo certbot --nginx -d thesunsessionclub.com -d www.thesunsessionclub.com
```

## DNS en Hostinger

Si el VPS estÃ¡ en Hostinger:

- apunta `@` al IP del VPS con un `A record`
- apunta `www` al mismo IP con otro `A record` o `CNAME`

## VerificaciÃ³n

- `https://thesunsessionclub.com/api/health`
- `https://thesunsessionclub.com/home.html`
- login admin
- creaciÃ³n de tickets
- carga de `uploads/`
