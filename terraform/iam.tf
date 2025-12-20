# Cloud Build Service Account への権限付与
data "google_project" "project" {}

locals {
  cloudbuild_sa = "${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
  compute_sa    = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  build_roles = [
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/secretmanager.secretAccessor",
    "roles/artifactregistry.writer"
  ]
}

resource "google_project_iam_member" "cloudbuild_roles" {
  for_each = toset(local.build_roles)

  project = local.project_id
  role    = each.key
  member  = "serviceAccount:${local.cloudbuild_sa}"

  depends_on = [time_sleep.wait_for_apis]
}

resource "google_project_iam_member" "compute_sa_build_roles" {
  for_each = toset(local.build_roles)

  project = local.project_id
  role    = each.key
  member  = "serviceAccount:${local.compute_sa}"

  depends_on = [time_sleep.wait_for_apis]
}

# --- Cloud Run Runtime & Build Service Account ---

# 1. カスタムサービスアカウントの作成
resource "google_service_account" "runner_sa" {
  account_id   = "receipt-scanner-runner"
  display_name = "Cloud Run & Build Service Account"
  depends_on   = [time_sleep.wait_for_apis]
}

# 2. 必要な権限の付与 (実行用 + ビルド用)
locals {
  runner_roles = [
    "roles/secretmanager.secretAccessor", # Secret Manager 読み取り
    "roles/aiplatform.user",              # Vertex AI 使用
    "roles/datastore.user",               # Firestore 読み書き
    "roles/logging.logWriter",            # ログ出力
    "roles/artifactregistry.writer",      # ビルド：イメージのプッシュ
    "roles/run.admin",                    # ビルド：Cloud Run へのデプロイ
    "roles/iam.serviceAccountUser"        # ビルド：自身を Cloud Run にアタッチする権限
  ]
}

resource "google_project_iam_member" "runner_roles" {
  for_each = toset(local.runner_roles)

  project = local.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.runner_sa.email}"
}
