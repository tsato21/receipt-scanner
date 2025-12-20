terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }
}

locals {
  # .env ファイルを読み込み、環境変数を抽出
  env_content = file("../.env")

  # 正規表現で値を抽出 (行末の改行までを取得)
  # [^\n\r]* を使うことで改行までの文字列を取得する
  project_id    = regex("PROJECT_ID=([^\\n\\r]*)", local.env_content)[0]
  region        = regex("GCP_LOCATION=([^\\n\\r]*)", local.env_content)[0]
  cloud_run_url = regex("GCP_OIDC_AUDIENCE=([^\\n\\r]*)", local.env_content)[0]
  repo_name     = regex("REPO_NAME=([^\\n\\r]*)", local.env_content)[0]
}

provider "google" {
  project = local.project_id
  region  = local.region
}

# 1. API の有効化
  resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "iam.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

# 2. API有効化後の待機 (IAM権限伝播待ちなど)
resource "time_sleep" "wait_for_apis" {
  depends_on      = [google_project_service.apis]
  create_duration = "60s"
}
