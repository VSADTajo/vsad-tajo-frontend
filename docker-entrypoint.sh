#!/bin/sh
# =============================================================================
# Runtime URL substitution for the vsad-tajo-frontend (Vue).
#
# The image is built with placeholders instead of real URLs (see the ARG
# defaults in the Dockerfile), so ONE GHCR image works on any host. nginx:alpine
# runs executable scripts in /docker-entrypoint.d/ before starting nginx; here we
# swap the placeholders for the per-host values from the environment. No frontend
# source changes needed.
# =============================================================================
set -eu

ASSETS=/usr/share/nginx/html

: "${API_URL:?API_URL is required (set it in the .env)}"
: "${GEOSERVER_URL:?GEOSERVER_URL is required (set it in the .env)}"

# `|` delimiter so URLs with `/` don't need escaping. Longer placeholder first.
sub() {
    find "$ASSETS" -type f \( -name '*.js' -o -name '*.html' \) -exec \
        sed -i "s|$1|$2|g" {} +
}

sub "__RUNTIME_GEOSERVER_URL__" "$GEOSERVER_URL"
sub "__RUNTIME_API_URL__"       "$API_URL"

echo "runtime-config: applied API_URL + GEOSERVER_URL to vsad-tajo-frontend assets"
