FROM node:20-alpine AS base
WORKDIR /app

FROM base AS development
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

FROM base AS production
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
