# Stage 1: Build the Angular application
FROM node:latest AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build:prod

# Stage 2: Serve the application with Nginx
FROM node:latest
COPY --from=build /app/dist/chat-markov ./
EXPOSE 4000
CMD ["node", "server/server.mjs"]