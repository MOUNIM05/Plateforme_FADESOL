FROM python:3.11-slim

WORKDIR /app

COPY services/service_fadesol_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/service_fadesol_service/app ./app
COPY shared ./shared

ENV PYTHONPATH=/app

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
