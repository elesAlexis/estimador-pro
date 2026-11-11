FROM python:3.13.12-slim-bookworm

WORKDIR /service
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && install -d -o 10001 -g 10001 /data
COPY server.py ./

USER 10001:10001
EXPOSE 8081
CMD ["waitress-serve", "--listen=0.0.0.0:8081", "server:app"]
