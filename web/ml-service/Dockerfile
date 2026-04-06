FROM python:3.11-slim

# Install system dependencies for OpenCV and ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY web/ml-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the ML service
COPY web/ml-service/ ./ml-service/

# Copy analysis engine and utils from project root
COPY analysis_engine.py ./
COPY utils/ ./utils/

ENV PORT=8000
EXPOSE 8000

CMD ["python", "ml-service/server.py"]
