FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY lib /app/lib
COPY gateway /app/gateway
COPY services /app/services
COPY frontend /app/frontend

ARG SERVICE_DIR
WORKDIR /app/${SERVICE_DIR}

CMD ["node", "server.js"]
