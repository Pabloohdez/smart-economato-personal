# Backend API NestJS - PostgreSQL en Supabase (sin DB local)
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev
RUN apk add --no-cache curl
COPY . .

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "run", "start:dev"]

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN apk add --no-cache curl
COPY --from=builder /app/dist ./dist

EXPOSE 3000
ENV PORT=3000

CMD ["node", "dist/src/main.js"]
