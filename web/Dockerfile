FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm i --legacy-peer-deps || true
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
