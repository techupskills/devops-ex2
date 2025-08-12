#!/usr/bin/env bash
set -euo pipefail

docker rm -f jira-mock >/dev/null 2>&1 || true
mkdir -p mocks

# Write config via base64 to avoid paste corruption
cat > mocks/jira-mock.json.b64 << 'EOF'
eyJzb3VyY2UiOiAibW9ja29vbjoxLjI0LjAiLCAiZGF0YSI6IHsiaWQiOiAiamlyYS1tb2NrIiwgIm5hbWUiOiAiamlyYS1tb2NrIiwgImVuZHBvaW50UHJlZml4IjoiIiwgInBvcnQiOjMwMDAsICJyb3V0ZXMiOlt7InV1aWQiOiAiZ2V0LWlzc3VlcyIsICJkb2N1bWVudGF0aW9uIjogIkxpc3QgaXNzdWVzIiwgIm1ldGhvZCI6ICJnZXQiLCAiZW5kcG9pbnQiOiAiYXBpL2lzc3VlcyIsICJyZXNwb25zZXMiOlt7InV1aWQiOiAiZ2V0LWlzc3Vlcy0yMDAiLCAic3RhdHVzQ29kZSI6IDIwMCwgImxhYmVsIjogIk9LIiwgImhlYWRlcnMiOlt7ImtleSI6IkNvbnRlbnQtVHlwZSIsICJ2YWx1ZSI6ImFwcGxpY2F0aW9uL2pzb24ifV0sICJib2R5IjogW3siaWQiOjEsInN1bW1hcnkiOiAiRGVtbyBpc3N1ZSIsICJkZXNjcmlwdGlvbiI6ICJTZWVkIGRhdGEgZnJvbSBtb2NrIn1dfV19LCB7InV1aWQiOiAicG9zdC1pc3N1ZXMiLCAiZG9jdW1lbnRhdGlvbiI6ICJDcmVhdGUgaXNzdWUiLCAibWV0aG9kIjogInBvc3QiLCAiZW5kcG9pbnQiOiAiYXBpL2lzc3VlcyIsICJyZXNwb25zZXMiOlt7InV1aWQiOiAicG9zdC1pc3N1ZXMtMjAxIiwgInN0YXR1c0NvZGUiOiAyMDEsICJsYWJlbCI6ICJDcmVhdGVkIiwgImhlYWRlcnMiOlt7ImtleSI6IkNvbnRlbnQtVHlwZSIsICJ2YWx1ZSI6ImFwcGxpY2F0aW9uL2pzb24ifV0sICJib2R5IjogInt7Ym9keX19In1dfV19fQ==
EOF
base64 -d mocks/jira-mock.json.b64 > mocks/jira-mock.json
rm -f mocks/jira-mock.json.b64

docker run -d --name jira-mock \
  -p 3000:3000 \
  -v "$PWD/mocks:/data:ro" \
  mockoon/cli:latest \
  start -d /data/jira-mock.json -p 3000 --disable-logfile --daemon-off

for i in {1..30}; do
  curl -fsS http://localhost:3000/api/issues >/dev/null 2>&1 && { echo "[start-jira-mock] Ready on :3000"; exit 0; }
  sleep 1
done

echo "[start-jira-mock] Failed to become ready" >&2
docker logs --tail=100 jira-mock >&2 || true
exit 1