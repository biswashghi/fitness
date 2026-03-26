FROM node:20-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

FROM deps AS builder
COPY . .
RUN npm run build

FROM deps AS development
WORKDIR /app
ENV PORT=8787
ENV DB_PATH=/data/fitness.db
COPY . .
EXPOSE 5173 8787
CMD ["npm", "run", "dev"]

FROM node:20-slim AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV DB_PATH=/data/fitness.db

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

VOLUME ["/data"]
EXPOSE 8787

CMD ["npm", "start"]
