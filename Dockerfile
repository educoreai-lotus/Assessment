FROM node:20-alpine

WORKDIR /app

# Copy backend package files first for better caching
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/ ./

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Use npm start -> "node server.js"
CMD ["npm", "start"]

