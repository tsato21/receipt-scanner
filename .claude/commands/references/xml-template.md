# draw.io XML テンプレート（GCPアーキテクチャ図専用）

このファイルは `gcp-architecture-drawio` スキルが参照するスタイル定義集。
XMLを生成する前に必ずここを読み、スタイルをコピーして使うこと。

---

## 基本 mxGraphModel ヘッダー

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1"
  tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1"
  pageWidth="1654" pageHeight="1169" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <!-- ノードはすべて parent="1" -->
  </root>
</mxGraphModel>
```

---

## GCPアイコン共通スタイル

すべてのGCPアイコンに以下の共通属性を付ける。
`shape=` の部分だけサービスごとに変える。

```
outlineConnect=0;
fontColor=#232F3E;
gradientColor=none;
strokeColor=none;
fillColor=#4285F4;
labelBackgroundColor=#ffffff;
align=center;
html=1;
fontSize=11;
fontStyle=0;
aspect=fixed;
labelPosition=center;
verticalLabelPosition=bottom;
verticalAlign=top;
spacingTop=4;
shape=mxgraph.gcp2.<SERVICE_NAME>;
```

**アイコンサイズ**: 幅60px × 高さ60px（メインサービスのみ80×80可）

---

## サービス別 shape 名一覧

| GCPサービス | shape 値 |
|---|---|
| Cloud Run | `mxgraph.gcp2.cloud_run` |
| Cloud Build | `mxgraph.gcp2.cloud_build` |
| Artifact Registry | `mxgraph.gcp2.artifact_registry` |
| Cloud Scheduler | `mxgraph.gcp2.cloud_scheduler` |
| Firestore | `mxgraph.gcp2.cloud_firestore` |
| Cloud SQL | `mxgraph.gcp2.cloud_sql` |
| Cloud Storage | `mxgraph.gcp2.cloud_storage` |
| BigQuery | `mxgraph.gcp2.bigquery` |
| Pub/Sub | `mxgraph.gcp2.cloud_pubsub` |
| Secret Manager | `mxgraph.gcp2.secret_manager` |
| Vertex AI | `mxgraph.gcp2.vertex_ai` |
| Cloud Functions | `mxgraph.gcp2.cloud_functions` |
| GKE | `mxgraph.gcp2.container_engine` |
| Compute Engine | `mxgraph.gcp2.compute_engine` |
| VPC Network | `mxgraph.gcp2.virtual_private_cloud` |
| Cloud Armor | `mxgraph.gcp2.cloud_armor` |
| API Gateway | `mxgraph.gcp2.cloud_endpoints` |
| Memorystore | `mxgraph.gcp2.memorystore` |
| Cloud DNS | `mxgraph.gcp2.cloud_dns` |
| IAM | `mxgraph.gcp2.cloud_iam` |
| Service Account | `mxgraph.gcp2.service_accounts` |
| ユーザー | `mxgraph.gcp2.user` |
| GCP Group container | `mxgraph.gcp2.group` with `grIcon=mxgraph.gcp2.group_gcp_infrastructure` |

---

## コンテナ・グループのスタイル

### GCP Project 外枠

```xml
<mxCell id="gcp" value="GCP Project"
  style="shape=mxgraph.gcp2.group;grIcon=mxgraph.gcp2.group_gcp_infrastructure;
         strokeColor=#4d90fe;fillColor=#e8f0fe;
         fontStyle=1;fontSize=14;verticalAlign=top;align=left;
         spacingLeft=44;spacingTop=5;"
  vertex="1" parent="1">
  <mxGeometry x="160" y="50" width="900" height="800" as="geometry" />
</mxCell>
```

### CI/CD Pipeline セクション（黄色）

```xml
<mxCell id="cicd_box" value="CI / CD Pipeline"
  style="rounded=1;dashed=1;strokeColor=#f0a30a;fillColor=#fff8e1;
         strokeWidth=2;verticalAlign=top;align=left;
         spacingLeft=10;fontSize=11;fontStyle=1;fontColor=#5d4037;arcSize=3;"
  vertex="1" parent="1">
  <mxGeometry x="200" y="90" width="460" height="150" as="geometry" />
</mxCell>
```

### Data Services セクション（緑）

```xml
<mxCell id="data_box" value="Data Services"
  style="rounded=1;dashed=1;strokeColor=#388e3c;fillColor=#e8f5e9;
         strokeWidth=2;verticalAlign=top;align=left;
         spacingLeft=10;fontSize=11;fontStyle=1;fontColor=#1b5e20;arcSize=3;"
  vertex="1" parent="1">
  <mxGeometry x="750" y="220" width="180" height="520" as="geometry" />
</mxCell>
```

### Security セクション（赤）

```xml
<mxCell id="sec_box" value="Security"
  style="rounded=1;dashed=1;strokeColor=#c62828;fillColor=#ffebee;
         strokeWidth=2;verticalAlign=top;align=left;
         spacingLeft=10;fontSize=11;fontStyle=1;fontColor=#b71c1c;arcSize=3;"
  vertex="1" parent="1">
  <mxGeometry x="..." y="..." width="..." height="..." as="geometry" />
</mxCell>
```

### External Services セクション（グレー）

```xml
<mxCell id="ext_box" value="External Services"
  style="rounded=1;dashed=1;strokeColor=#9e9e9e;fillColor=#f5f5f5;
         strokeWidth=2;verticalAlign=top;align=left;
         spacingLeft=10;fontSize=11;fontStyle=1;fontColor=#424242;arcSize=3;"
  vertex="1" parent="1">
  <mxGeometry x="..." y="..." width="..." height="..." as="geometry" />
</mxCell>
```

---

## コネクタ（矢印）のスタイル

### 標準の一方向矢印

```xml
<mxCell id="e1" value="HTTPS&#xa;レシート画像"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;fontSize=10;
         exitX=1;exitY=0.5;exitDx=0;exitDy=0;
         entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
  edge="1" source="SOURCE_ID" target="TARGET_ID" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### PII を含むフロー（赤い矢印）

```xml
<mxCell id="e_pii" value="🔒 PII&#xa;ユーザー識別情報"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;fontSize=10;
         strokeColor=#c62828;fontColor=#c62828;fontStyle=1;
         exitX=1;exitY=0.5;exitDx=0;exitDy=0;
         entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
  edge="1" source="SOURCE_ID" target="TARGET_ID" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### 双方向矢印

```xml
<mxCell id="e_bi" value="Read / Write"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;fontSize=10;
         endArrow=block;startArrow=block;startFill=1;endFill=1;"
  edge="1" source="SOURCE_ID" target="TARGET_ID" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

---

## exitX/exitY と entryX/entryY の使い方

ノードの辺の中点を指定する。矢印が他の要素と重ならないよう、
接続する2ノードの相対位置に合わせて使い分ける。

| ノードの位置関係 | exitX/exitY | entryX/entryY |
|---|---|---|
| 左 → 右（水平） | `exitX=1, exitY=0.5` | `entryX=0, entryY=0.5` |
| 上 → 下（垂直） | `exitX=0.5, exitY=1` | `entryX=0.5, entryY=0` |
| 右上 → 左下 | `exitX=0, exitY=1` | `entryX=0.5, entryY=0` |
| 上端 → 右上方向 | `exitX=1, exitY=0` | `entryX=0, entryY=0.5` |
| 下端 → 右下方向 | `exitX=1, exitY=1` | `entryX=0, entryY=0.5` |

---

## レイアウト座標の基本パターン

### パターンA: 縦軸中心のスター型（推奨）

Cloud Run を中心に、上にCI/CD、左に入力、右にデータ、下に外部通知を配置する。

```
x軸の基準 (Cloud Run center x = 540):
  - Artifact Registry center x = 540  → 垂直の Deploy矢印が一直線
  - LINE center x = 540               → 垂直の通知矢印が一直線

y軸の基準 (Cloud Run center y = 430):
  - Cloud Scheduler center y ≈ 430    → ほぼ水平の矢印
  - Vertex AI center y ≈ 430          → ほぼ水平の矢印
  - User center y ≈ 430               → 水平の矢印

データ列（右側）の y座標:
  - Firestore:       center y = 300   (Cloud Run より上)
  - Vertex AI:       center y = 430   (Cloud Run と同高)
  - Secret Manager:  center y = 610   (Cloud Run より下)
```

絶対座標の例：

| ノード | x | y | w | h |
|---|---|---|---|---|
| GCP container | 150 | 50 | 880 | 780 |
| CI/CD box | 205 | 90 | 450 | 150 |
| Cloud Build | 265 | 118 | 60 | 60 |
| Artifact Registry | 510 | 118 | 60 | 60 |
| Cloud Run (大) | 500 | 390 | 80 | 80 |
| Cloud Scheduler | 250 | 400 | 60 | 60 |
| Firestore | 770 | 270 | 60 | 60 |
| Vertex AI | 770 | 400 | 60 | 60 |
| Secret Manager | 770 | 580 | 60 | 60 |
| User (外部左) | 45 | 400 | 60 | 60 |
| LINE (外部下) | 490 | 870 | 110 | 50 |

### パターンB: 左→右 フロー型

大規模システムで複数の Compute ノードがある場合に使用。

```
[User] → [LB/API GW] → [Cloud Run / GKE] → [DB / Cache]
                              ↕
                       [Pub/Sub] → [Cloud Functions]
```

---

## 凡例ボックス

図の右下に必ず配置する。

```xml
<mxCell id="legend" value="凡例"
  style="swimlane;startSize=24;fillColor=#f5f5f5;strokeColor=#666666;
         fontStyle=1;fontSize=12;fontColor=#333333;"
  vertex="1" parent="1">
  <mxGeometry x="1400" y="900" width="220" height="140" as="geometry" />
</mxCell>
<mxCell id="legend_pii" value="🔒 PII : 個人情報を含むフロー"
  style="text;html=1;strokeColor=none;fillColor=none;
         align=left;verticalAlign=middle;fontSize=11;fontColor=#c62828;"
  vertex="1" parent="1">
  <mxGeometry x="1410" y="932" width="200" height="24" as="geometry" />
</mxCell>
<mxCell id="legend_cicd" value="■ CI/CD Pipeline"
  style="text;html=1;strokeColor=none;fillColor=none;
         align=left;verticalAlign=middle;fontSize=11;fontColor=#5d4037;"
  vertex="1" parent="1">
  <mxGeometry x="1410" y="958" width="200" height="24" as="geometry" />
</mxCell>
<mxCell id="legend_data" value="■ Data Services"
  style="text;html=1;strokeColor=none;fillColor=none;
         align=left;verticalAlign=middle;fontSize=11;fontColor=#1b5e20;"
  vertex="1" parent="1">
  <mxGeometry x="1410" y="984" width="200" height="24" as="geometry" />
</mxCell>
<mxCell id="legend_date" value="作成日: YYYY-MM-DD"
  style="text;html=1;strokeColor=none;fillColor=none;
         align=left;verticalAlign=middle;fontSize=10;fontColor=#666666;"
  vertex="1" parent="1">
  <mxGeometry x="1410" y="1010" width="200" height="24" as="geometry" />
</mxCell>
```

---

## 外部サービス（LINE, Slack 等）のスタイル

GCPアイコンが存在しない外部サービスは角丸矩形で表現する。

```xml
<!-- LINE -->
<mxCell id="line" value="LINE&#xa;(通知)"
  style="rounded=1;whiteSpace=wrap;html=1;
         fillColor=#00B900;strokeColor=#007700;
         fontColor=#ffffff;fontSize=12;fontStyle=1;"
  vertex="1" parent="1">
  <mxGeometry x="490" y="870" width="110" height="50" as="geometry" />
</mxCell>

<!-- Slack -->
<mxCell id="slack" value="Slack&#xa;(アラート)"
  style="rounded=1;whiteSpace=wrap;html=1;
         fillColor=#4A154B;strokeColor=#3a0f3b;
         fontColor=#ffffff;fontSize=12;fontStyle=1;"
  vertex="1" parent="1">
  <mxGeometry x="..." y="..." width="110" height="50" as="geometry" />
</mxCell>

<!-- 汎用 外部API -->
<mxCell id="ext_api" value="外部API"
  style="rounded=1;whiteSpace=wrap;html=1;
         fillColor=#f5f5f5;strokeColor=#9e9e9e;
         fontColor=#333333;fontSize=12;fontStyle=0;"
  vertex="1" parent="1">
  <mxGeometry x="..." y="..." width="110" height="50" as="geometry" />
</mxCell>
```

---

## よくあるミスと回避策

| ミス | 回避策 |
|---|---|
| ラベルとアイコンが重なる | `verticalLabelPosition=bottom` を忘れずに付ける |
| 矢印がノードを突き抜ける | `exitX/exitY` と `entryX/entryY` を明示する |
| テキストが矢印の上に乗る | ラベルを短くするか `\n` で改行して2行にする |
| セクション枠がノードを隠す | セクション枠のIDより後にノードを定義する（描画順） |
| 矢印が重なって判別できない | 同じ exit point から出る矢印は `exitY` を0.3 / 0.5 / 0.7 にずらす |
| GCPコンテナ枠の中にLINEなど外部サービスが入る | 外部サービスはGCPコンテナのy範囲外か、x範囲外に配置 |
