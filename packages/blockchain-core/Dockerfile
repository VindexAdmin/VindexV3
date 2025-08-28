# Vindex Blockchain Core - Production Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S vindex && \
    adduser -S vindex -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional runtime files
COPY --chown=vindex:vindex . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/data && \
    chown -R vindex:vindex /app

# Switch to non-root user
USER vindex

# Expose the API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Start the application
CMD ["node", "dist/index.js"]

# Labels for better container management
LABEL \
    org.opencontainers.image.title="Vindex Blockchain Core" \
    org.opencontainers.image.description="Vindex Chain Proof of Stake Blockchain with Governance" \
    org.opencontainers.image.vendor="Vindex Chain" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.revision="${GIT_COMMIT}" \
    org.opencontainers.image.source="https://github.com/VindexAdmin/VindexV3"
