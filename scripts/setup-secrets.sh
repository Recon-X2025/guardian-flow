#!/bin/bash
set -e

PROVIDER="${SECRETS_PROVIDER:-aws}"
PROJECT="${PROJECT_NAME:-guardian-flow}"
ENV="${ENVIRONMENT:-production}"

echo "Setting up secrets for $PROJECT ($ENV) using $PROVIDER"

case "$PROVIDER" in
  aws)
    SECRET_NAME="$PROJECT/$ENV"

    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" 2>/dev/null; then
      echo "Updating existing secret: $SECRET_NAME"
      aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string file://secrets.json
    else
      echo "Creating new secret: $SECRET_NAME"
      aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --secret-string file://secrets.json
    fi
    ;;

  gcp)
    PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID required}"
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" == \#* ]] && continue
      echo -n "$value" | gcloud secrets create "$key" --data-file=- 2>/dev/null || \
        echo -n "$value" | gcloud secrets versions add "$key" --data-file=-
      echo "  Set: $key"
    done < .env.production
    ;;

  *)
    echo "Unsupported provider: $PROVIDER"
    echo "Supported: aws, gcp"
    exit 1
    ;;
esac

echo "Secrets configured successfully"
