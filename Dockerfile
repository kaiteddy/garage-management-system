FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the entire src directory and db_init.py to /app
COPY ./src /app
COPY ./src/db_init.py /app/db_init.py

# Set Python path to include the current directory
ENV PYTHONPATH=/app

# Create logs and data directories
RUN mkdir -p logs data
RUN chmod 777 logs data

# Expose port
EXPOSE 8002

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=development
ENV FLASK_DEBUG=1

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8002/health || exit 1

# Start the application with database initialization
CMD ["sh", "-c", "python db_init.py && flask run --host=0.0.0.0 --port=8002"]
