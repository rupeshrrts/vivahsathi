# Vivah Saathi — zero npm dependencies, so the image is just Node + the app
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/database/data
COPY package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY database/schema.sql database/export.js database/rows.js ./database/
COPY scripts ./scripts
RUN mkdir -p /app/database/data /app/frontend/uploads && chown -R node:node /app
USER node
EXPOSE 3000
# keep orders and uploaded photos when the container is replaced
VOLUME ["/app/database/data", "/app/frontend/uploads"]
CMD ["node", "backend/server.js"]
