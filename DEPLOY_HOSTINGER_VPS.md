# Deploy en Hostinger VPS

Este proyecto debe desplegarse como servidor Node/Next.js, no como export estático, porque usa APIs internas para convertir Excel a PDF con LibreOffice.

## Suposiciones

- VPS con Ubuntu.
- Dominio apuntando a la IP de la VPS.
- Node.js 22 o superior.
- El proyecto corre en el puerto 3000 detrás de Nginx.

## 1. Instalar paquetes del sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git nginx libreoffice python3 python3-pip python3-venv fonts-liberation fonts-dejavu
```

## 2. Instalar Node.js

Usa Node 22+ en la VPS. Una forma comun:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 3. Instalar dependencias Python para PDF

```bash
python3 -m pip install --break-system-packages pypdf reportlab
```

Si tu Ubuntu bloquea esa instalacion, usa un venv:

```bash
python3 -m venv /opt/report-mhos-venv
/opt/report-mhos-venv/bin/pip install pypdf reportlab
```

Y luego configura:

```bash
PDF_PYTHON_BIN=/opt/report-mhos-venv/bin/python
```

## 4. Subir el proyecto

Ejemplo usando git:

```bash
cd /var/www
sudo git clone <URL_DEL_REPO> report-mhos
sudo chown -R $USER:$USER /var/www/report-mhos
cd /var/www/report-mhos
npm ci
```

Si subes ZIP/SFTP, descomprime en:

```bash
/var/www/report-mhos
```

## 5. Variables de entorno

Crea `.env.production`:

```bash
LIBREOFFICE_BIN=libreoffice
PDF_PYTHON_BIN=python3
NODE_ENV=production
```

Si usaste venv:

```bash
PDF_PYTHON_BIN=/opt/report-mhos-venv/bin/python
```

## 6. Build y arranque

```bash
npm run build
npm install -g pm2
pm2 start npm --name report-mhos -- start
pm2 save
pm2 startup
```

## 7. Nginx

Crea:

```bash
sudo nano /etc/nginx/sites-available/report-mhos
```

Contenido:

```nginx
server {
    listen 80;
    server_name TU_DOMINIO.com www.TU_DOMINIO.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/report-mhos /etc/nginx/sites-enabled/report-mhos
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d TU_DOMINIO.com -d www.TU_DOMINIO.com
```

## 9. Firebase

En Firebase Authentication agrega tu dominio en Authorized domains.

## 10. Prueba final

- Crear reporte preventivo.
- Generar PDF.
- Confirmar que son 4 páginas.
- Confirmar header/footer alineados.
- Crear diagnóstico y confirmar que sigue convirtiendo.

## Comandos útiles

```bash
pm2 logs report-mhos
pm2 restart report-mhos
which libreoffice
python3 -c "import pypdf, reportlab; print('pdf deps ok')"
```
