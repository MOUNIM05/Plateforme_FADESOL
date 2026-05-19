FROM python:3.11-slim

WORKDIR /app

COPY services/project_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/project_service/app ./app
COPY shared ./shared

ENV PYTHONPATH=/app

EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
