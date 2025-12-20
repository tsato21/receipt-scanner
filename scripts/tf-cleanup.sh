#!/bin/bash

# プロジェクトIDを引数または環境変数から取得
PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION="us-central1"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is not set. Please provide it as an argument or set it via 'gcloud config set project'."
    exit 1
fi

echo "Using Project ID: $PROJECT_ID"

# 1. Artifact Registry の削除
echo "Deleting Artifact Registry Repository..."
gcloud artifacts repositories delete receipt-scanner-repo --location=$REGION --project=$PROJECT_ID --quiet

# 2. Service Account の削除
echo "Deleting Service Account..."
SA_EMAIL="receipt-scanner-runner@$PROJECT_ID.iam.gserviceaccount.com"
gcloud iam service-accounts delete $SA_EMAIL --project=$PROJECT_ID --quiet

# 3. Secret Manager の削除
echo "Deleting Secrets..."
gcloud secrets delete APP_DOTENV --project=$PROJECT_ID --quiet
gcloud secrets delete SERVICE_ACCOUNT_KEYS --project=$PROJECT_ID --quiet

# 4. Terraform State のクリア (ローカルにある場合)
echo "Cleaning up local Terraform state..."
rm -rf terraform/.terraform terraform/.terraform.lock.hcl terraform/terraform.tfstate terraform/terraform.tfstate.backup

echo "Cleanup complete."
