# Multi-stage Docker build for Garage Management System

# Stage 1: Build frontend assets
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY src/static/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY src/static/ ./

# Build frontend assets
RUN npm run build

# Stage 2: Python application
FROM python:3.10-slim AS backend

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libc6-dev \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Copy built frontend assets from previous stage
COPY --from=frontend-builder /app/frontend/dist/ ./src/static/dist/

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/backups \
    && chown -R appuser:appuser /app

# Copy entrypoint script
COPY docker/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/monitoring/health || exit 1

# Run entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
