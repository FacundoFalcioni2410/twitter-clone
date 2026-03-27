FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npm run db:generate && npm run db:migrate:deploy && npm run db:seed && npm run build && npm start"]
