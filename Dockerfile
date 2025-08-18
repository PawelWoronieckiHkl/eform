FROM node:18-bullseye-slim

RUN apt-get update && \
    apt-get install -y \
    wget gnupg2 fonts-liberation libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    debian-archive-keyring && \
    rm -rf /var/lib/apt/lists/* /usr/share/doc /usr/share/man /usr/share/locale

ENV TZ=Europe/Warsaw
RUN ln -snf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime && echo Europe/Warsaw > /etc/timezone

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force


RUN npx playwright install chromium --with-deps

COPY . .



CMD ["npm", "start"]
