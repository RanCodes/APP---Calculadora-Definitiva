# Multi-stage build to produce an optimized static bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose API key during build so Vite can inject it into the bundle if provided
ARG API_KEY
ENV API_KEY=${API_KEY}
RUN npm run build

# Final image: lightweight Nginx serving the built assets
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
