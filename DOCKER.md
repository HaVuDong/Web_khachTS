# Docker

`package-lock.json` should stay committed. Docker uses it with `npm ci` so production builds install the exact dependency tree.

## Build frontend image

```bash
docker build ^
  --build-arg VITE_API_BASE_URL=http://localhost:3000 ^
  --build-arg VITE_CUSTOMER_APP_BASE_URL=http://localhost:8080 ^
  -t trasua-frontend .
```

## Run frontend

```bash
docker run -p 8080:80 trasua-frontend
```

The container serves the Vite static build with nginx and supports SPA route refresh fallback.
