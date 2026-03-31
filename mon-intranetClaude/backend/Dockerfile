FROM node:20-alpine AS base
WORKDIR /app

# Dépendances de production uniquement
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Générer le client Prisma
RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "start"]
