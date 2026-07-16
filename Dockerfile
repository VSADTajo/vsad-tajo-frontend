#
# Build
#
FROM node:22-alpine AS build

WORKDIR /app

# Default to runtime placeholders so ONE image works on any host — the
# docker-entrypoint.sh swaps them for the real URLs at container start.
ARG VITE_GEOSERVER_URL=__RUNTIME_GEOSERVER_URL__
ARG VITE_API_URL=__RUNTIME_API_URL__

ENV VITE_GEOSERVER_URL=$VITE_GEOSERVER_URL
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies (cached unless package*.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build-only

#
# Production (nginx)
#
FROM nginx:alpine AS prod

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing: fallback to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Runtime URL substitution — nginx runs scripts in /docker-entrypoint.d/.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
