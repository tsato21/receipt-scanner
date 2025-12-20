# Cloud Scheduler API の有効化
resource "google_project_service" "scheduler" {
  project            = local.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

# リマインダーチェック用の Cloud Scheduler ジョブ
resource "google_cloud_scheduler_job" "reminder_job" {
  name             = "check-line-reminders"
  description      = "Checks reminders and sends LINE notifications via Cloud Run API"
  schedule         = "0 9 * * *" # 毎日午前 9:00 (UTC)
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"
  region           = local.region

  http_target {
    http_method = "POST"
    uri         = "${local.cloud_run_url}/api/scheduler/check-reminders"

    oidc_token {
      service_account_email = google_service_account.runner_sa.email
      # この audience は、サーバー側の環境変数 GCP_OIDC_AUDIENCE と一致している必要があります
      audience = local.cloud_run_url
    }
  }

  depends_on = [google_project_service.scheduler]
}

# サービスアカウントへの権限付与 (念のため)
# Cloud Run を呼び出す権限が必要
resource "google_project_iam_member" "scheduler_invoker" {
  project = local.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.runner_sa.email}"
}