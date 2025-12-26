# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY backend ./backend
COPY frontend ./frontend

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend ./frontend

# Expose port
EXPOSE 8000

# Set environment variable
ENV NODE_ENV=production
ENV PORT=8000

# Start the application
CMD ["node", "dist/backend/index.js"]

