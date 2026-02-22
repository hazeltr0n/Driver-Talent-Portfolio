FROM node:20-slim

# Install Chrome dependencies and ffmpeg for Remotion
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path for Remotion
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package.json and install (use root package for all Remotion deps)
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN npm ci --omit=dev

# Copy Remotion source (needed for rendering)
COPY src/remotion ./src/remotion

# Copy render server
COPY render-service/server.js ./server.js

EXPOSE 3001

CMD ["node", "server.js"]
