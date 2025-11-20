FROM node:18-bullseye-slim

# Fix GPG issues by updating keyring and using different mirrors
RUN apt-get update --allow-releaseinfo-change || apt-get update && \
    apt-get install -y \
    git \
    wget gnupg2 fonts-liberation libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    python3 python3-venv python3-pip sudo virtualenv \
    debian-archive-keyring libasound2 && \
    rm -rf /var/lib/apt/lists/* /usr/share/doc /usr/share/man /usr/share/locale

ENV TZ=Europe/Warsaw
RUN ln -snf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime && echo Europe/Warsaw > /etc/timezone

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Instalacja Playwright z wymaganymi dependency i Chromium
# Dodatkowe flagi dla pewności instalacji
RUN npx playwright install chromium --with-deps && \
    npx playwright install-deps chromium && \
    # Sprawdź czy chromium został zainstalowany
    npx playwright install chromium --force && \
    # Ustaw zmienne środowiskowe dla Playwright
    echo "PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright" >> /etc/environment

# Dodaj zmienną środowiskową dla Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false

# Kopiowanie plików aplikacji
COPY . .

# Klonowanie repozytorium tiknil/json-excel-translations i instalacja
RUN git clone https://github.com/tiknil/json-excel-translations.git /tmp/json-excel-translations && \
    cd /tmp/json-excel-translations && \
    chmod +x setup.sh link.sh && \
    # Instalacja dependencies systemowo zamiast w virtualenv (openpyxl zamiast xlrd dla .xlsx)
    pip3 install pandas==1.2.1 XlsxWriter==1.2.0 openpyxl==3.0.9 numpy==1.22.0 && \
    chmod +x ./excelToJson.py ./jsonToExcel.py && \
    # Kopiowanie skryptów do /usr/local/bin (nie linki symboliczne)
    cp ./excelToJson.py /usr/local/bin/excelToJson && \
    cp ./jsonToExcel.py /usr/local/bin/jsonToExcel && \
    # Cleanup
    rm -rf /tmp/json-excel-translations

# Sprawdź czy Playwright został poprawnie zainstalowany
RUN npx playwright --version && \
    ls -la /root/.cache/ms-playwright/ || echo "Playwright cache not found" && \
    find /root/.cache -name "*chromium*" -type d || echo "Chromium not found"

WORKDIR /app

CMD ["npm", "start"]
