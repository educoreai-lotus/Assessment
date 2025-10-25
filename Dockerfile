FROM node:18

WORKDIR /app

# ✅ Copy backend package files correctly
COPY ./backend/package*.json ./

# ✅ Install dependencies
RUN npm install --omit=dev

# ✅ Copy backend source code
COPY ./backend ./

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server.js"]

