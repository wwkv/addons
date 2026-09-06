ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js, NPM, and the tools needed to compile native modules (like better-sqlite3)
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++ 

WORKDIR /app

# Backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# The add-on manifest, for the version number Settings displays. Must land
# BEFORE the frontend build: vite.config.js reads ../package.json while
# resolving its config, so without this the build fails in the image while
# still succeeding on a dev machine, where the file is simply there.
COPY package.json ./

# Frontend dependencies + build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY backend/ ./backend/

# Serve frontend build from backend
RUN cp -r frontend/dist backend/public

# Create data directory (HA maps /data for persistence)
RUN mkdir -p /data/backups

# Copy startup script
COPY run.sh /
RUN chmod a+x /run.sh

# Tell the container to execute it
CMD [ "/run.sh" ]