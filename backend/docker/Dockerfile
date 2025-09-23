FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./ 2>/dev/null || true
RUN npm ci || npm i

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
