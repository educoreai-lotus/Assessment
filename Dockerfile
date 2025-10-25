FROM node:20-alpine

WORKDIR /app

# Copy backend source and install production deps
COPY backend/ ./
RUN npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Use npm start -> "node server.js"
CMD ["npm", "start"]

