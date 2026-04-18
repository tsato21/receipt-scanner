---
name: gcp-architecture-drawio
description: >
  Generate professional GCP system architecture diagrams using the draw.io MCP server (`open_drawio_xml`).
  Use this skill whenever the user asks to create a system architecture diagram, infrastructure diagram,
  or GCP構成図 from a codebase that uses GCP services. Triggers include: "システム構成図を作って",
  "アーキテクチャ図", "GCP構成図", "draw.ioで図を作成", "インフラ構成図", "構成を可視化",
  or any request to visualize a GCP-based system. Also triggers when the user mentions terraform
  directory analysis combined with diagram creation, or when they want to document data flows
  including PII (個人情報) for security review. Always use this skill even if the user doesn't
  explicitly mention draw.io — if they want a GCP architecture diagram from code, this is the skill.
---

# GCP Architecture Diagram Generator (draw.io MCP)

Terraformコードやアプリケーションコードを解析し、draw.io MCPの `open_drawio_xml` ツールで
GCPシステム構成図を生成するスキル。PM・エンジニア・セキュリティチームが
システムの全体像とデータフローを把握・議論できる図を作成する。

## 前提条件

- draw.io MCPサーバーが登録済みであること（`open_drawio_xml` ツールが利用可能）
- 対象リポジトリがクローン済みで、Claude Codeのワーキングディレクトリにあること

## ワークフロー

### Step 1: リポジトリの解析

以下の順序でリポジトリを調査する。

**1a. Terraformディレクトリの解析**

```
terraform/ (または infra/, infrastructure/ など) 以下を調査:
- *.tf ファイルから google_* リソースを抽出
- 主要リソース: compute, networking, database, storage, serverless, security, CI/CD
- IAMバインディング、サービスアカウント、VPC設定も確認
- variables.tf / terraform.tfvars からプロジェクトID、リージョン情報を取得
```

**1b. アプリケーションコードの解析**

```
- エントリポイント (main.*, app.*, index.* 等) からフレームワークを特定
- 外部サービス接続 (DB接続文字列、APIクライアント初期化) を洗い出す
- 環境変数参照 (.env*, cloudbuild.yaml, Dockerfile) からサービス依存を把握
```

**1c. CI/CDパイプラインの解析**

```
- cloudbuild.yaml, .github/workflows/, Dockerfile を確認
- ビルド → プッシュ → デプロイのフローを把握
```

### Step 2: ユーザーへの確認（必須）

解析結果をもとに、以下をユーザーに質問する。**必ず図を生成する前に確認すること。**

1. **データストアの用途**: 「検出したデータストア（例: Cloud SQL, Firestore, GCS等）に
   格納されるデータの種類を教えてください。特に個人情報（氏名、メール、電話番号、
   住所、決済情報など）を含むものはどれですか？」

2. **外部連携**: 「外部サービス（LINE, Slack, 外部API等）への送受信データに
   個人情報は含まれますか？」

3. **追加コンテキスト**: 「図に含めたい補足情報（運用フロー、スケジューリング、
   セキュリティ要件など）はありますか？」

### Step 3: draw.io XML の生成

`.claude/commands/references/xml-template.md` を読み込み、テンプレートに従ってXMLを構築する。

**必ず `.claude/commands/references/xml-template.md` を読んでからXMLを書くこと。**
このファイルにはGCPアイコンの正しいスタイル定義、レイアウトルール、
テキスト配置の衝突回避パターンがすべて記載されている。

### Step 4: `open_drawio_xml` で出力

生成したXMLを `open_drawio_xml` ツールに渡す。
ユーザーにURLが表示されるので、ブラウザで開いて確認・編集できる旨を伝える。

---

## 図の構成要素（必須）

すべての図に以下を含めること：

### 1. レイヤー構成
- **GCP Projectの外枠**: 青い破線の矩形でプロジェクト境界を示す
- **セクション分け**: CI/CD Pipeline、Application Layer、Data Layer、External Services を
  破線矩形で論理グループ化する
- **外部アクター**: ユーザー、外部サービスはプロジェクト境界の外に配置

### 2. データフローラベル
矢印（コネクタ）には以下を必ず記載する：
- **プロトコル/方式**: HTTPS, gRPC, WebSocket, Pub/Sub 等
- **データ内容の要約**: 「レシート画像」「認証トークン」「ユーザー通知」等
- **個人情報マーカー**: 個人情報を含むフローには `🔒 PII` ラベルを付与

### 3. 凡例（Legend）
図の右下に凡例ボックスを配置：
- 🔒 PII: 個人情報を含むデータフロー
- 色分けの説明
- 作成日・バージョン

---

## レイアウトの鉄則（可読性の確保）

これらのルールは `.claude/commands/references/xml-template.md` のXMLスタイルに反映済みだが、
意図を理解して適用すること。

### テキストとアイコンの衝突回避
- GCPアイコン（shape）のサイズ: **幅60px × 高さ60px** を基本とする
- サービス名ラベルは **アイコンの下** に配置（`verticalLabelPosition=bottom`,
  `verticalAlign=top`）
- ラベルとアイコンの間に **10px以上の余白** を確保（`spacingTop=8`）
- 補足テキスト（用途説明）はラベルの下に `<br>` で改行して小さめフォントで追記

### 間隔とグリッド
- ノード間の水平間隔: **最低160px**
- ノード間の垂直間隔: **最低120px**
- セクション内のパディング: **上40px、左右30px、下30px**
- セクションタイトルは左上に配置し、ノードと重ならない位置にする

### コネクタ（矢印）
- 直線ではなく **orthogonal（直角折れ線）** ルーティングを使用
- ラベルは矢印の中央付近に配置し、他の要素と重ならないよう `offset` で調整
- 双方向フローは矢印2本ではなく、1本の双方向矢印 + ラベルで表現

### 色分け（セクション別）
- CI/CD Pipeline: 薄い黄色背景 `#FFF8E1`
- Application / Compute: 薄い青背景 `#E3F2FD`
- Data / Storage: 薄い緑背景 `#E8F5E9`
- Security / IAM: 薄い赤背景 `#FFEBEE`
- External Services: 薄い灰色背景 `#F5F5F5`

---

## GCPサービスとアイコンの対応

`.claude/commands/references/xml-template.md` にスタイル定義の全リストがある。
よく使うサービスのTerraformリソースマッピング:

| Terraform resource | GCPサービス | カテゴリ |
|---|---|---|
| google_cloud_run_service | Cloud Run | Compute |
| google_compute_instance | Compute Engine | Compute |
| google_container_cluster | GKE | Compute |
| google_cloudfunctions_function | Cloud Functions | Compute |
| google_app_engine_application | App Engine | Compute |
| google_sql_database_instance | Cloud SQL | Database |
| google_firestore_database | Firestore | Database |
| google_bigquery_dataset | BigQuery | Analytics |
| google_storage_bucket | Cloud Storage | Storage |
| google_pubsub_topic | Pub/Sub | Messaging |
| google_cloud_scheduler_job | Cloud Scheduler | Management |
| google_secret_manager_secret | Secret Manager | Security |
| google_cloudbuild_trigger | Cloud Build | CI/CD |
| google_artifact_registry_repository | Artifact Registry | CI/CD |
| google_compute_network | VPC Network | Networking |
| google_compute_firewall | Firewall Rules | Networking |
| google_apigateway_api | API Gateway | Networking |
| google_cloud_armor_policy | Cloud Armor | Security |
| google_project_iam_member | IAM | Security |
| google_service_account | Service Account | Security |
| google_dns_managed_zone | Cloud DNS | Networking |
| google_redis_instance | Memorystore (Redis) | Database |
| google_vertex_ai_endpoint | Vertex AI | AI/ML |

---

## 出力後のガイダンス

図をユーザーに渡す際、以下を伝える：
1. URLをCmd+クリック（macOS）/ Ctrl+クリック（Windows）でdraw.ioが開く
2. draw.ioエディタ上で配置の微調整、色変更、アイコン追加が可能
3. File > Save As で .drawio / .png / .pdf / .svg 形式で保存可能
4. 「修正したい箇所があればここで伝えてください。XMLを再生成します」と促す

## ユーザー確認後のファイル保存（必須）

ユーザーが図の内容をOKしたら、生成したXMLをプロジェクトの `doc/` フォルダに保存する。

- ファイル名: `gcp-architecture.drawio`
- パス: `<プロジェクトルート>/doc/gcp-architecture.drawio`
- 内容: `open_drawio_xml` に渡したXMLをそのまま書き込む
- `doc/` フォルダが存在しない場合は作成する
