# Image de developpement du frontend React/Vite.
FROM node:20-alpine

WORKDIR /app

# Installation des dependances npm avant la copie du code pour profiter du cache Docker.
COPY package*.json ./

RUN npm install

# Copie du code frontend puis exposition du serveur Vite.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
