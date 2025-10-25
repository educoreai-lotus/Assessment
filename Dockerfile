FROM node:20-alpine

WORKDIR /app

# Install only backend dependencies first for better layer caching
COPY backend/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy backend source
COPY backend/ ./

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Use npm start -> "node server.js"
CMD ["npm", "start"]

