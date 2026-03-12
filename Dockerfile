FROM node:22-bookworm-slim AS base

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app

COPY package.json ./
RUN npm install
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build
RUN mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static
RUN if [ -d public ]; then cp -R public .next/standalone/public; fi

EXPOSE 3000
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=${PORT:-3000} node .next/standalone/server.js"]
