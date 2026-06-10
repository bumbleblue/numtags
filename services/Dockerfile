# numtags backend services — OMR (homr) + catalog bot + bbstags proxy.
# Scale-to-zero friendly: single uvicorn process, no local state.
FROM python:3.12-slim

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    # `uv` provides `uvx`, which HOMR_CMD ("uvx homr") uses to resolve homr on
    # first call. For production, bake homr in instead to avoid a cold-start
    # download (it pulls large model weights):
    #   RUN pip install --no-cache-dir homr
    # ...and set HOMR_CMD=homr.
    && pip install --no-cache-dir uv

COPY app ./app

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
