# Artifact Registry の作成
resource "google_artifact_registry_repository" "repo" {
  location      = local.region
  repository_id = local.repo_name
  description   = "Docker repository for Receipt Scanner"
  format        = "DOCKER"

  depends_on = [time_sleep.wait_for_apis]
}