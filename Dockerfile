FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
