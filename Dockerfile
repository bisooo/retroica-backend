FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

EXPOSE 9000 7001

CMD ["npm", "run","dev"]