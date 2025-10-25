FROM node:20-alpine

WORKDIR /app

# Install only backend dependencies first for better layer caching
COPY backend/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy backend source
COPY backend/ ./

ENV NODE_ENV=production

# Railway provides PORT; default to 3000 for local
ENV PORT=3000
EXPOSE 3000

# Use npm start -> "node server.js"
CMD ["npm", "start"]

