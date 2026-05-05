# Build: React + TypeScript con Vite
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 8081

# En dev, el código se monta como volumen desde docker-compose
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8081"]

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# En Docker, la API se sirve en el mismo origen vía proxy nginx → /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve: nginx
FROM nginx:alpine

RUN apk add --no-cache curl
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
