FROM python:3.11-slim

WORKDIR /app

COPY services/task_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/task_service/app ./app
COPY shared ./shared

ENV PYTHONPATH=/app

EXPOSE 8005

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
