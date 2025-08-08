# Build frontend
FROM node:20 AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client .
RUN npm run build

# Build server
FROM node:20
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm install
COPY server ./server
COPY --from=build-client /app/client/dist ./server/public
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data
WORKDIR /app/server
EXPOSE 3000
CMD ["npm","start"]
