# Receipt Scanner App

Gemini Pro Vision (Vertex AI) を活用した、高機能レシートスキャン＆家計簿アプリケーションです。

---

## 認証基盤とセキュリティ (Cloudflare Zero Trust)

本アプリケーションは **Cloudflare Access** によって保護されています。Cloud Run を直接公開せず、認証されたユーザーのみがアクセスできる堅牢な構成を採用しています。

### セットアップの手順

1.  **Cloudflare でドメイン取得と DNS レコード設定**:
    - Cloud Run の接続先となる DNS レコード（CNAME 等）を作成します。
    - **この際、プロキシ状態を「DNS Only (グレーの雲)」に設定してください。**
    - **理由**: Google Cloud Run 側でのドメイン所有権の検証およびマネージド SSL 証明書の発行をスムーズに完了させるためです（プロキシが有効だと Google 側からの検証リクエストが正しく届かないことがあります）。

2.  **Cloudflare Zero Trust ポリシーの設定**:
    - Cloudflare ダッシュボードの Access -> Applications にて対象ドメインを保護対象に追加し、認証ポリシー（許可するメールアドレス等）を設定します。（[こちら](https://zenn.dev/catnose99/scraps/9958f03ede501c)を参考に）

3.  **Cloud Run でカスタムドメイン設定**:
    - Google Cloud コンソールの Cloud Run サービス画面から「カスタムドメインの管理」を行い、ドメインを追加します。
    - 証明書の状態が「有効 (Active)」になるまで待ちます。

4.  **DNS レコードを「Proxied」に変更**:
    - 設定完了後、Cloudflare の DNS レコードを **「Proxied (プロキシ済み/オレンジ色の雲)」** に変更します。
    - **理由**: Cloudflare Access による認証を機能させるためです。プロキシを有効にすることでトラフィックが Cloudflare を通過し、認証済みのリクエストに対して `Cf-Access-Jwt-Assertion` トークンやクッキーが付与されるようになります。

5.  **環境変数の設定**:
    - Secret Manager (または `.env`) の `CLOUDFLARE_TEAM_DOMAIN` に、自身のチーム認証 URL（例: `https://<team domain>.cloudflareaccess.com`）を設定してください。

---

## 認証基盤とセキュリティ (Cloudflare Zero Trust)

## インフラ構成と管理

**Terraform** と **Cloud Build** を組み合わせ、Infrastructure as Code (IaC) と CI/CD を実現しています。

### 管理範囲の切り分け
- **Terraform (IaC)**:
    - Google Cloud API の有効化、Artifact Registry、IAM (サービスアカウント/ロール)、Secret Manager の管理。
    - **理由**: 環境基盤をコード化し、再現性と安全性を確保するため。
- **Cloud Build (CI/CD)**:
    - GitHub と連携した Cloud Run サービスへのビルド・デプロイ。
    - **理由**: Cloud Build トリガーは GitHub 認証（第2世代）に依存するため手動作成を推奨。アプリのデプロイを CI/CD に寄せることで、開発サイクルを高速化するため。
    - **⚠️**: 現在、リポジトリ名やサービス名の変数は `cicd/release/cloudbuild.yaml` にハードコーディングされています。`.env` 内の `REPO_NAME` 等を変更した場合は、手動で `cloudbuild.yaml` の `substitutions` セクションも更新する必要があります。同期を怠ると CI/CD パイプラインが失敗します。

## インフラ運用コスト (概算)

個人利用の範囲内であれば、ほぼ **無料枠内** もしくは **月額数百円** 程度で運用可能です。

| サービス | 無料枠 / コスト目安 |
| :--- | :--- |
| **Cloud Run** | 18万 vCPU秒、36万 GB秒/月まで無料。 |
| **Artifact Registry** | 0.5GBまで無料。以降 $0.10/GB・月。 |
| **Secret Manager** | 6個のシークレットまで無料。 |
| **Firestore** | 保存 1GB、読み取り 5万件、書き込み 2万件/日まで無料。 |
| **Vertex AI (Gemini)** | 従量課金 (1リクエスト数円程度)。 |
| **合計目安** | **月額 $0 ~ $5 (約0円〜750円)** |

---

## デプロイ (Production)
- semantic versionでタグをリモートにプッシュすることで、本番環境にデプロイ可能

