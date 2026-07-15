# Build frontend
FROM node:24-bookworm-slim AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client .
RUN npm run build

# Build server
FROM node:24-bookworm-slim
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm ci --omit=dev
COPY server ./server
COPY --from=build-client /app/client/dist ./server/public
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data
WORKDIR /app/server
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm","start"]
