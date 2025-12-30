<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1C7XHBB6-3tqtQZO0kqMAcqfmsD_v5I6L

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies for the frontend: `npm install`
2. Start the Vite dev server: `npm run dev`
3. (Optional) Start the API locally from `/server`: `npm install && npm start`

## Deploy with Docker Compose

The stack now incluye un backend Node/Express que persiste la logística y el logo en `/data`.

```
$env:API_KEY="<tu_gemini_api_key>"
docker compose build --no-cache
docker compose up -d
```

Servicios desplegados:
- **frontend**: imagen `calculadora-meli-juma:prod`, contenedor `calculadora-meli-juma`, expuesto en `http://localhost:8087`
- **api**: contenedor `calculadora-meli-juma-api`, expuesto en `http://localhost:4000` y proxyeado en `/api` vía Nginx
