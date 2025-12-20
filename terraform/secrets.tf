# Secret Manager の枠作成
resource "google_secret_manager_secret" "app_dotenv" {
  secret_id = "APP_DOTENV"
  replication {
    auto {}
  }
  depends_on = [time_sleep.wait_for_apis]
}

resource "google_secret_manager_secret_version" "app_dotenv_version" {
  secret      = google_secret_manager_secret.app_dotenv.id
  secret_data = replace(file("../.env"), "APP_ENV=staging", "APP_ENV=production")
}


