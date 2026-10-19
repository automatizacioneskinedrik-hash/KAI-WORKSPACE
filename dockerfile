FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# tailwind.css no está en git (generado): hay que compilarlo antes del build de Vite, o la página sale sin estilos
RUN npm run css:build && npm run build

EXPOSE 8080

CMD ["npm", "start"]