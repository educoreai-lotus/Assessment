FROM node:18

WORKDIR /app

# Copy full backend first (so package.json definitely exists)
COPY ./backend ./backend

WORKDIR /app/backend

RUN npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server.js"]

