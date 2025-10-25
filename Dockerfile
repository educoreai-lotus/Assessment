FROM node:18

WORKDIR /app

# ✅ Copy backend folder entirely (so package.json is available)
COPY backend ./backend

WORKDIR /app/backend

# ✅ Install dependencies
RUN ls -la && cat package.json && npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server.js"]

