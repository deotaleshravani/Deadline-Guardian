# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the client-side bundles and compile the backend server
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files to install only production-ready dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./

# Expose port (Cloud Run defaults to routing to the container port)
EXPOSE 3000

# Start the Node Express production server
CMD ["npm", "run", "start"]
