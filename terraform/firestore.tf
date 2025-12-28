resource "google_project_service" "firestore" {
  project            = local.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "time_sleep" "wait_for_firestore_api" {
  depends_on      = [google_project_service.firestore]
  create_duration = "60s"
}

# Firestore データベースの作成 (Native モード)
resource "google_firestore_database" "database" {
  project     = local.project_id
  name        = "(default)"
  location_id = "nam5" # us-central1 multi-region equivalent
  type        = "FIRESTORE_NATIVE"

  depends_on = [time_sleep.wait_for_firestore_api]
}

resource "google_firestore_index" "reminders_scheduler_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "reminders"

  fields {
    field_path = "enabled"
    order      = "ASCENDING"
  }

  fields {
    field_path = "nextRunAt"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "reminders_list_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "reminders"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "staging_reminders_scheduler_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "staging_reminders"

  fields {
    field_path = "enabled"
    order      = "ASCENDING"
  }

  fields {
    field_path = "nextRunAt"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "staging_reminders_list_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "staging_reminders"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "receipts_date_search_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "receipts"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "date"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "staging_receipts_date_search_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "staging_receipts"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "date"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "statements_list_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "statements"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "staging_statements_list_index" {
  project    = local.project_id
  database   = google_firestore_database.database.name
  collection = "staging_statements"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}