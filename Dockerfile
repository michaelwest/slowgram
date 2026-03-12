FROM node:22-bookworm-slim AS base

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app

COPY package.json ./
RUN npm install
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
