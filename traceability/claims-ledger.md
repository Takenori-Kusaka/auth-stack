# 主張台帳（旧提案書の主張の初期登録）

> 文書ID: TRC-05 / 版: 0.1 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-197, R-199, R-200, R-201, R-263, R-087, R-196（主なもの）、G-017, G-019, G-024, G-035
> 依存文書: CONVENTIONS.md, マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md, 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md, traceability/citation-audit-proposal.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-03-redteam-decision.md, 01_governance/assumptions-register.md

## 要約（集計）

| 項目 | 件数 |
|---|---|
| 主張数 | 287（CL-0001〜CL-0287） |
| タグ別 | `[N]` 13／`[V]` 75／`[I]` 0／`[M]` 0／`[D]` 194／`[A]` 5（`[A]` は未登録仮定） |
| 処置別 | 維持 100／原典差替 56／修正 83／削除 23／要実測 22／要前提登録 3 |

- 自己評価・根拠のない断定・識別力のない格付け・非公開構造の一般化は「削除」（23 件）、一律値（token 寿命 5〜15 分、一律 fail-closed）と未実測の性質・値は「要実測」（22 件）とした。内訳は §2 に示す [D]。
- 集計の詳細（処置×タグ、脚注の有無、節別）は §1 に示す [D]。

## 0. 本書の位置付けと凡例

- 本書は CL-xxxx の定義場所（DL-105）であり、本版は旧提案書[^2]の本文から抽出した主張を CL-0001〜CL-0287 として登録したものである[^8] [D]。
- 旧提案書は CTO/CISO レビュー[^3]で本番不承認（Phase 0 のみ条件付き承認）となった。本書は、旧提案書の各主張を新構成へ移すか、どう直すかを主張単位で決めるための台帳である [D]。
- 脚注が付いた主張の判定は引用監査（TRC-06）[^4]の判定を転記した。脚注のない主張は引用監査の対象外であり[^4]、本書で初めて処置を割り当てた [D]。
- 旧提案書は仮定を明示していない。根拠のない数値や前提を述べる主張は `[A]` とし、理由欄の冒頭に「未登録仮定」と記した。前提台帳（GOV-01）[^10]の A-ID は、対応する仮置き値がある場合だけ参照した [D]。
- 関連 R は原子要求追跡表[^7]の R-ID（R-001〜R-210 は seed-01[^5]と同じ番号）を、分かる範囲で付けた。付与は本書作成者の設計推論である [D]。
- 本書の抽出・分類・処置の割当は AI エージェント（Claude）が行った。作成者以外による照合は未実施であり、G-019 の合格条件（作成者以外のレビュアーによる確認）に対して未達である[^9] [D]。
- §3 の表のセルは台帳の記録である。セルごとの主張タグは省略し、本注記で代える [D]。

### 0.1 対象と抽出の規則

- 対象は旧提案書（SHA-256 `e11dc6bbfa5fa9af559395a8be0d0f4e4cd23a86e6ee8e06285b276e645a9b06`、578 行、2026-10-03 確認）の本文 L1〜L453 である。`## References`（L457〜L578）は引用監査[^4]が扱うため対象外とした [D]。
- 事実・規範・設計判断・評価を述べる文を主張とした。1 文に複数の主張がある場合は分割した。見出し、対象の列挙だけの行（L21〜L30）、図・コードは、主張を含む場合だけ 1 件として登録した [D]。
- 表は行ごとに登録した。10 サービス比較表（L36〜L47）は 1 行を「境界・token」「権限」「最終判定位置」の 3 主張に分け、参考ポジション表（L329〜L341）は 1 行を 1 主張（柔軟性・セキュリティの格付けと理由）とした [D]。
- 箇条書きは 1 項目を 1 主張とした。ただし同じ趣旨の繰り返しも、行が異なれば別の主張として登録した（例: token 寿命の一律値は L151 と L372 の 2 件）[D]。
- 「行」は旧提案書の行番号である。複数行にわたる主張は範囲で示した [D]。

### 0.2 列の定義

| 列 | 内容 |
|---|---|
| CL-ID | 主張の ID。旧提案書の出現順に採番した |
| 行 | 旧提案書の行番号（Ln） |
| 主張（要約） | 旧提案書の主張の要約（30〜80 字）。原文の強度（「必須」「すべき」「必ず」等）は残した |
| タグ | 主張の種別を CONVENTIONS §3 の区分に当てはめたもの。根拠が足りていることを意味しない |
| 旧引用 | 旧提案書がその主張に付けた参考文献番号。本書の脚注と区別するためコード表記にした |
| 監査判定 | 引用監査（TRC-06）の判定（支持／部分支持／不支持／検証不能）。行に複数の主張があり監査の判定理由から主張ごとに読み分けたものは括弧で注記した |
| 処置 | §0.4 の 6 区分のいずれか 1 つ |
| 理由・注記 | 処置の理由。原典との相違、レビュー・種資料の該当箇所、前提 A-ID |
| 移管先 | 新構成での移管先（成果物計画[^8] §8 のパス）。削除は棄却記録（traceability/rejected-hypotheses.md）に経緯を残す |
| 関連 R | 関連する原子要求 |

### 0.3 主張種別タグ

| タグ | 本書での当てはめ |
|---|---|
| `[N]` | 標準・規範（RFC、NIST、SPIFFE 仕様、JWS の性質など）の内容を述べる主張 |
| `[V]` | 製品・サービスの公開仕様の事実を述べる主張（Zanzibar 論文の記述を含む） |
| `[I]` | 事故・障害の一次報告に基づく主張。旧提案書には該当がない |
| `[M]` | 実測に基づく主張。旧提案書には該当がない |
| `[D]` | 設計判断・設計推論・評価・類型化を述べる主張 |
| `[A]` | 根拠のない数値・前提（未登録仮定）。前提台帳へ登録するか、実測で置き換えるまで結論に使わない |

### 0.4 処置の定義

| 処置 | 定義 | 主な閉じ方区分 |
|---|---|---|
| 維持 | 内容と原典（あれば）を新構成へ移す。旧提案書の参考文献は全 60 件に確認日がないため[^4]、維持でも CONVENTIONS §4 の形式（版・確認日・参照箇所）で引き直し、[D] には前提 ID を付ける | A 机上 |
| 原典差替 | 内容は移せるが、原典の差替または追加が要る（二次資料、翻訳版、旧版、他社製品の文書、文書種別の取り違え、出典なし） | A 机上 |
| 修正 | 内容（向き・強度・範囲・帰属・用語・前提）を書き直す。原典差替を伴う場合は理由欄に記した | A 机上 |
| 削除 | 新構成へ移さない。根拠のない自己評価・断定、識別力のない格付け、非公開構造の一般化が該当する | A 机上 |
| 要実測 | 主張の値または真偽が PoC・試験の実測で決まる。実測までは「仮置き」または「TBD」として扱い、結論に使わない | C 実測（値の決裁は B） |
| 要前提登録 | 主張が明示されていない前提に依存する。前提台帳へ A-ID として登録してから使う | A 机上（値の確定は B） |

## 1. 集計

### 1.1 総数

| 項目 | 件数 |
|---|---|
| 主張数 | 287 |
| うち旧提案書の脚注が付いた主張 | 91 |
| うち脚注のない主張（引用監査の対象外） | 196 |
| 脚注が付いた主張のうち、監査判定に不支持・検証不能を含むもの | 17 |

- 引用監査の使用箇所（参照 × 行）112 組は、すべていずれかの主張に対応付けた。対応のない組、旧提案書にない組はともに 0 件である（本書作成時に機械照合）[D]。

### 1.2 タグ別

| タグ | 件数 | 比率 |
|---|---|---|
| `[N]` | 13 | 4.5% |
| `[V]` | 75 | 26.1% |
| `[I]` | 0 | 0.0% |
| `[M]` | 0 | 0.0% |
| `[D]` | 194 | 67.6% |
| `[A] 未登録仮定` | 5 | 1.7% |
| 計 | 287 | 100.0% |

- `[I]`・`[M]` は 0 件である。旧提案書には事故の一次報告と実測に基づく主張がない [D]。
- `[D]` が 194 件（67.6%）を占める。新構成では各 `[D]` に前提とした CL・A・RS の ID を付ける必要がある（G-019）[^9] [D]。

### 1.3 処置別

| 処置 | 件数 | 比率 |
|---|---|---|
| 維持 | 100 | 34.8% |
| 原典差替 | 56 | 19.5% |
| 修正 | 83 | 28.9% |
| 削除 | 23 | 8.0% |
| 要実測 | 22 | 7.7% |
| 要前提登録 | 3 | 1.0% |
| 計 | 287 | 100.0% |

### 1.4 処置×タグ

| 処置 | `[N]` | `[V]` | `[I]` | `[M]` | `[D]` | `[A]` | 計 |
|---|---|---|---|---|---|---|---|
| 維持 | 1 | 6 | 0 | 0 | 93 | 0 | 100 |
| 原典差替 | 5 | 48 | 0 | 0 | 3 | 0 | 56 |
| 修正 | 7 | 20 | 0 | 0 | 56 | 0 | 83 |
| 削除 | 0 | 1 | 0 | 0 | 22 | 0 | 23 |
| 要実測 | 0 | 0 | 0 | 0 | 19 | 3 | 22 |
| 要前提登録 | 0 | 0 | 0 | 0 | 1 | 2 | 3 |
| 計 | 13 | 75 | 0 | 0 | 194 | 5 | 287 |

### 1.5 脚注の有無と処置

| 区分 | 維持 | 原典差替 | 修正 | 削除 | 要実測 | 要前提登録 | 計 |
|---|---|---|---|---|---|---|---|
| 脚注あり | 10 | 48 | 31 | 2 | 0 | 0 | 91 |
| 　うち不支持・検証不能を含む | 0 | 11 | 6 | 0 | 0 | 0 | 17 |
| 脚注なし | 90 | 8 | 52 | 21 | 22 | 3 | 196 |

- 脚注が付いた主張で「維持」は 10 件にとどまる。監査判定が支持でも、翻訳版・旧版・他社製品の文書・範囲の脱落のため原典差替または修正が要るものがある（TRC-06 §6・§7）[^4] [D]。

### 1.6 節別の処置

| 節（旧提案書） | 主張数 | 維持 | 原典差替 | 修正 | 削除 | 要実測 | 要前提登録 |
|---|---|---|---|---|---|---|---|
| エグゼクティブサマリー（L3〜L15） | 22 | 5 | 3 | 9 | 3 | 1 | 1 |
| 調査範囲と確度（L17〜L32） | 4 | 2 | 0 | 1 | 0 | 0 | 1 |
| 10 サービスの比較表（L36〜L47） | 30 | 2 | 17 | 11 | 0 | 0 | 0 |
| 各社の詳述（L49〜L107） | 42 | 9 | 23 | 10 | 0 | 0 | 0 |
| 役割レイヤー（L109〜L124） | 20 | 11 | 2 | 4 | 0 | 3 | 0 |
| フロー類型（L126〜L135） | 5 | 3 | 0 | 1 | 1 | 0 | 0 |
| JWT 設計（L137〜L193） | 28 | 14 | 3 | 9 | 0 | 2 | 0 |
| 推奨認可フロー（L195〜L219） | 18 | 10 | 1 | 4 | 0 | 3 | 0 |
| 異種スコープの吸収（L221〜L267） | 14 | 7 | 2 | 3 | 0 | 2 | 0 |
| トレーサビリティ（L269〜L290） | 12 | 3 | 3 | 5 | 0 | 1 | 0 |
| セキュリティ対策（L292〜L307） | 14 | 7 | 2 | 2 | 0 | 3 | 0 |
| 4 象限マッピング（L309〜L341） | 21 | 0 | 0 | 3 | 18 | 0 | 0 |
| 推奨アーキテクチャ（L343〜L378） | 12 | 5 | 0 | 5 | 0 | 2 | 0 |
| 採用しない案（L380〜L392） | 7 | 5 | 0 | 2 | 0 | 0 | 0 |
| 意思決定事項（L394〜L405） | 9 | 6 | 0 | 2 | 0 | 1 | 0 |
| 導入ロードマップ（L407〜L434） | 16 | 5 | 0 | 9 | 0 | 1 | 1 |
| CTO/CISO 想定論点（L436〜L447） | 8 | 3 | 0 | 3 | 0 | 2 | 0 |
| 最終指針（L449〜L453） | 5 | 3 | 0 | 0 | 1 | 1 | 0 |

## 2. 重点処置（自己評価・断定・一律値・未登録仮定）

- レビューは「推奨自社基盤＝柔軟性・セキュリティとも非常に高い」という自己評価の削除（L139、L233）と、「5〜15分token、全fail-closed等の一律値」の未承認（L232）を判定した[^3]。本書はこれらと同種の主張を、削除または要実測に割り当てた [D]。
- 削除した主張の経緯は棄却記録（DL-107）へ、要実測の主張は数値契約（DL-20）・失敗モード表（DL-19）・PoC 試験計画（DL-22）へ移す[^8] [D]。

### 2.1 削除（23 件）

| CL-ID | 行 | 主張（要約） | 類型 |
|---|---|---|---|
| CL-0003 | L5 | 上記のハイブリッド方式が、今回想定する SaaS に「最も妥当」である | 根拠のない断定 |
| CL-0010 | L10 | API スコープは上限、リソース ACL は実効権限という積集合モデルが「主流」である | 根拠のない断定 |
| CL-0021 | L15 | 推奨ターゲットは、4 象限の「高セキュリティ・高柔軟性」に置く | 自己評価 |
| CL-0123 | L135 | 大規模 SaaS は入口で claim、resource 層で ACL/ReBAC、S2S で委任、管理 policy で ABAC を組み合わせる | 非公開構造の一般化 |
| CL-0210 | L313 | 柔軟性を、domain 固有 resource・階層・外部共有・custom role 等へ再設計なしで対応できる度合いと定義する | 循環した評価軸 |
| CL-0211 | L314 | セキュリティを least privilege・tenant 分離・revocation・aud 制約・監査・fail-closed の総合度と定義 | 循環した評価軸 |
| CL-0212 | L316 | 「柔軟性が高いほど必ずセキュリティが低い」という関係は成立しない | 撤回する枠組みの一部 |
| CL-0214 | L316 | 型付き schema・policy 検証・guardrail・domain owner・決定監査を設ければ、高柔軟性と高セキュリティは両立できる | 自己評価 |
| CL-0216 | L321 | 固定 scope・単一 tenant token・allowlist（Notion・GitHub の一部）は低柔軟・高セキュリティである | 根拠のない格付け |
| CL-0218 | L323 | 短命 aud token・typed ReBAC/ABAC・PEP/PDP・workload ID・audit の組合せは高柔軟・高セキュリティで目標 | 自己評価 |
| CL-0219 | L327 | 参考ポジションの評価はベンダー公表値でなく、公開モデルを比較するための定性的な相対評価である | 根拠のない格付け |
| CL-0220 | L331 | Microsoft 365/SharePoint の柔軟性を「高」、セキュリティを「高」と評価する | 根拠のない格付け |
| CL-0221 | L332 | Google Drive の柔軟性を「高」、セキュリティを「高」と評価する（理由: ACL・継承・委任統制） | 根拠のない格付け |
| CL-0222 | L333 | Box の柔軟性を「高」、セキュリティを「高」と評価する（理由: collaboration graph・downscope） | 根拠のない格付け |
| CL-0223 | L334 | Dropbox の柔軟性を「中〜高」、セキュリティを「高」と評価する（理由: scope・team token・namespace） | 根拠のない格付け |
| CL-0224 | L335 | Salesforce の柔軟性を「高」、セキュリティを「高」と評価する（設定の複雑性ありと注記） | 根拠のない格付け |
| CL-0225 | L336 | ServiceNow の柔軟性を「非常に高」、セキュリティを「中〜高」と評価する（governance 負荷が高い） | 根拠のない格付け |
| CL-0226 | L337 | GitHub の柔軟性を「中〜高」、セキュリティを「高」と評価する（理由: owner・repository・permission の積） | 根拠のない格付け |
| CL-0227 | L338 | Slack の柔軟性を「中」、セキュリティを「高」と評価する（理由: token type と installation/channel 境界） | 根拠のない格付け |
| CL-0228 | L339 | Atlassian Cloud の柔軟性を「高」、セキュリティを「高」と評価する（理由: cloudId routing・scope） | 根拠のない格付け |
| CL-0229 | L340 | Notion の柔軟性を「中」、セキュリティを「高」と評価する（理由: capability と明示 page share） | 根拠のない格付け |
| CL-0230 | L341 | 推奨自社基盤の柔軟性は「非常に高」、セキュリティも「非常に高」である | 自己評価 |
| CL-0286 | L453 | 大手 SaaS の実例は、token scope だけでなく resource 側の権限を「必ず」重ねている | 根拠のない断定 |

### 2.2 要実測（22 件）

| CL-ID | 行 | 主張（要約） | 類型 |
|---|---|---|---|
| CL-0022 | L15 | その位置は短命 token・service 別 aud・workload ID・共通 schema・関係グラフ・PEP・強制監査の組合せで実現する | 根拠のない断定 |
| CL-0106 | L118 | PIP の属性が欠落した場合は、原則として deny とする | 一律値 |
| CL-0108 | L119 | PDP の失敗時の原則として、timeout・error は一律に deny とする | 一律値 |
| CL-0110 | L120 | PEP は bypass 不能であり、既定で deny（deny by default）とする | 未証明の性質 |
| CL-0131 | L151 | iat・nbf・exp は必須とし、有効時間は 5〜15 分を基準に短命化し、clock skew の上限を定める | 一律値 |
| CL-0148 | L174〜L190 | 例示 payload は有効期間 600 秒（exp−iat）とし、amr に pwd と mfa を置く | 一律値 |
| CL-0157 | L204 | 更新は業務データと tuple/outbox を同一 transaction で記録し、非同期反映時は consistency token を渡す | 値・効果が未実測 |
| CL-0168 | L219 | 単純な read chain では PDP 決定を短時間 cache してよく、key に tenant・principal・revision 等を含める | 値・効果が未実測 |
| CL-0169 | L219 | deny cache は短くし、権限剥奪・tenant 停止・MFA 要求の変更は push invalidation 等で即時に無効化する | 値・効果が未実測 |
| CL-0177 | L256 | 共通 SDK/sidecar は token 検証・tenant binding・check API・decision log・fail-closed を担う | 一律値 |
| CL-0182 | L267 | 判定式の条件のどれか一つでも不明・取得失敗・不一致なら deny とする | 一律値 |
| CL-0193 | L290 | 特権操作・policy 変更・共有変更・token exchange・deny spike は 100% 監査し、sampling で落とさない | 値・効果が未実測 |
| CL-0200 | L299 | stale authorization を短命 token・PDP revision・push 無効化・consistency token で防ぐ | 値・効果が未実測 |
| CL-0203 | L302 | PDP 障害には local sidecar/cache・circuit breaker・fail closed・重要 read の限定 grace で対処する | 一律値との不整合 |
| CL-0204 | L303 | ACL graph の循環・爆発は typed DAG・depth/fanout limit・query budget・precompute で防ぐ | 値・効果が未実測 |
| CL-0236 | L372 | 技術方針として、access token の寿命を一律に 5〜15 分とする | 一律値 |
| CL-0241 | L377 | relation tuple と resource 更新に outbox を使い、剥奪は優先配信して cache を revision で無効化する | 値・効果が未実測 |
| CL-0255 | L402 | PDP p99・cache staleness・剥奪の伝播・regional failover・fail-closed の範囲を SLO 化する | 値・効果が未実測 |
| CL-0262 | L413 | Phase 0 で authorization SLO・RTO/RPO・最大 staleness・権限剥奪の反映時間を決裁する | 値・効果が未実測 |
| CL-0276 | L441 | PDP 障害には plane 分離・sidecar・署名 bundle・cache・replica で備え、権限不明時は fail closed とする | 一律値 |
| CL-0279 | L444 | object 権限は request ごとに評価し revision invalidation を使うため、剥奪が token 期限まで残らない | 値・効果が未実測 |
| CL-0287 | L453 | したがって短命 JWT・service 別 aud・token exchange・workload ID・typed ReBAC・PEP 等の組合せは要件に適合 | 根拠のない断定 |

- 要実測のうち、一律値（token 寿命の一律値、一律 fail-closed）に当たるものは 8 件である。fail-closed の一律適用は L118・L119・L256・L267・L441 にあり、L302 の「重要 read の限定 grace」と同じ文書内で整合していない [D]。

### 2.3 未登録仮定（`[A]`、5 件）

| CL-ID | 行 | 主張（要約） | 処置 |
|---|---|---|---|
| CL-0004 | L5, L225, L352 | 想定対象は File・Tool・Site 等を持つ単一の異種マイクロサービス SaaS である（暗黙の前提） | 要前提登録 |
| CL-0023 | L19 | 調査対象は、組織内でオブジェクトを動的に作成・共有・管理する 10 サービスである（L21〜L30） | 要前提登録 |
| CL-0131 | L151 | iat・nbf・exp は必須とし、有効時間は 5〜15 分を基準に短命化し、clock skew の上限を定める | 要実測 |
| CL-0148 | L174〜L190 | 例示 payload は有効期間 600 秒（exp−iat）とし、amr に pwd と mfa を置く | 要実測 |
| CL-0236 | L372 | 技術方針として、access token の寿命を一律に 5〜15 分とする | 要実測 |

- 旧提案書には規模・法域・利用者数・サービス数の前提が書かれていない。規約 §7 の基準シナリオ[^1]と前提台帳[^10]が定める前提との差は、要前提登録の主張として前提台帳へ移す [D]。

## 3. 主張一覧

- 並びは旧提案書の出現順である。監査判定の詳細（実際の参照先、差替先の URL、検証状態）は引用監査[^4] §5・§9 を参照する [D]。

### 3.1 エグゼクティブサマリー（L3〜L15）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0001 | L5 | JWT を全権限の搬送に使わず、主体・テナント境界・粗粒度の委任だけを短命 token で運ぶ | `[D]` | — | 脚注なし | 維持 | レビューが「強い」と評価した方向（万能 JWT の否定）。新構成では前提（RS-04、ADR-005）を付けた [D] として書き直す。「短命」の値は L151・L372 の主張で要実測 | 00_decision/01-executive-summary.md、04_architecture/reference-architecture-v2.md | R-249 |
| CL-0002 | L5 | 動的権限は各リソースサービス「または」共通 PDP でリクエストごとに評価する | `[D]` | — | 脚注なし | 修正 | 「または」で中核トポロジー（resource-local 評価か共通 PDP か）が未決定のまま結論に置かれている（seed-03 §7-17）。ADR-011・ADR-013 で決めた結果に書き換える | 05_adr/ADR-011-policy-language-pep-pdp-api.md、05_adr/ADR-013-cell-partitioning-fail-mode.md | R-099, R-254 |
| CL-0003 | L5 | 上記のハイブリッド方式が、今回想定する SaaS に「最も妥当」である | `[D]` | — | 脚注なし | 削除 | 最上級の断定に対し比較した代替案がない（マネージド IdP＋ライブラリ、連邦型、現状維持の比較なし。seed-03 §7-3）。代替案比較（DL-44）の結論で置き換え、本文は「方向性候補」とする | 00_decision/08-alternatives-comparison.md、traceability/rejected-hypotheses.md | R-201, R-264 |
| CL-0004 | L5, L225, L352 | 想定対象は File・Tool・Site 等を持つ単一の異種マイクロサービス SaaS である（暗黙の前提） | `[A]` 未登録仮定 | — | 脚注なし | 要前提登録 | 未登録仮定。「今回想定するSaaS」の規模・法域・事業ドメインが書かれていない（seed-03 §7-1）。規約 §7 の基準シナリオ（1000億円規模、約300 サービス、100万人、多法域）との差を A-050・A-060 等に対して登録する | 01_governance/assumptions-register.md | R-001, R-010 |
| CL-0005 | L5 | AWS 指針は tenant と user を結ぶ JWT を入口で検証し、PAP/PDP/PEP 分離と RBAC＋ABAC 併用を示す | `[V]` | `[^1]` `[^2]` `[^3]` | `[^1]` 部分支持／`[^2]` 部分支持／`[^3]` 支持 | 修正 | 原典と向きが逆の箇所がある（検証はアプリケーション側で「入口」ではない、中央認可サービスを単一障害点として避ける記述、RBAC と ABAC は対比）。`[^1]` はブログ。AWS PG の該当節（avp-design-onboarding-registration、pep）へ差替（TRC-06 §5・§6） | research/RS-08-pep-completeness-tenant-isolation.md | R-197, R-198 |
| CL-0006 | L7 | 以下の 5 点は、大手 SaaS の公開仕様から確認できる共通点である | `[D]` | — | 脚注なし | 修正 | 5 点には規範（「避けるべき」「実装すべき」）が含まれ、公開仕様の事実ではない。10 社の選定根拠もない（L19）。事実 [V] と設計判断 [D] に分けて書く | research/RS-17-integration-patterns-modeling.md | R-199, R-263 |
| CL-0007 | L9 | 大手 SaaS では、認証とオブジェクト認可は別レイヤーである | `[D]` | `[^4]` `[^5]` `[^6]` `[^7]` | 行全体: `[^4]` 部分支持／`[^5]` 支持／`[^6]` 部分支持／`[^7]` 支持（要差替） | 修正 | 根拠は token claim の文書だけで、各社の内部構成は非公開（L32）。公開 API の外形挙動から導いた設計原則 [D] として書き直す | 04_architecture/reference-architecture-v2.md | R-249 |
| CL-0008 | L9 | Entra の tid・oid・scp・roles、Salesforce の tnk・scp・client_id、Auth0 の org_id は主体等を表す | `[V]` | `[^4]` `[^5]` `[^6]` `[^7]` | `[^4]` 部分支持／`[^5]` 支持／`[^6]` 部分支持／`[^7]` 支持（要差替） | 原典差替 | `[^6]` は Agent ID 専用文書のため『Access token claims reference』へ、`[^7]` は GitHub 上のソースのため Learn 公開版へ。tnk は header claim である旨を書き分ける | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0009 | L9 | これらの token 情報は、個々のファイルやフォルダの最終権限そのものを網羅しない | `[V]` | `[^4]` `[^6]` | `[^4]` 部分支持（記載なし）／`[^6]` 部分支持 | 修正 | Entra 部分は『Access token claims reference』の Note で支持。Salesforce 部分は出典未特定のため [D] として書き分ける（TRC-06 §4.2） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0010 | L10 | API スコープは上限、リソース ACL は実効権限という積集合モデルが「主流」である | `[D]` | `[^8]` `[^9]` `[^10]` `[^11]` `[^12]` | `[^8]` 部分支持／`[^9]` 部分支持／`[^10]` 支持／`[^11]` 支持／`[^12]` 部分支持 | 削除 | 「主流」は全称的な一般化の断定で、個別ベンダー文書では支持されない（TRC-06 §3.3）。確認できた個別事例は次の 2 行の主張として残し、設計原則は [D] として別に立てる | traceability/rejected-hypotheses.md | R-201, R-263 |
| CL-0011 | L10 | Box では token を持っていても、所有またはコラボレータであるコンテンツにだけアクセスできる | `[V]` | `[^11]` | 支持 | 維持 | 原典と一致。版・確認日・参照節を付けて引き直す | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0012 | L10 | Drive・GitHub・Notion・Dropbox も scope に加え、個別リソース・インストール先・共有・名前空間を評価する | `[V]` | `[^12]` `[^9]` `[^8]` `[^10]` | `[^12]` 部分支持／`[^9]` 部分支持／`[^8]` 部分支持／`[^10]` 支持 | 原典差替 | Drive は英語原文と scope ガイドを併記、GitHub の installation は別文書、Notion は『Authorization』を追加（TRC-06 §5 L10） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0013 | L11 | JWT は必須ではなく、「一時アクセストークンは基本的に JWT」を設計要件として固定すべきでない | `[D]` | — | 脚注なし（前提は次行の事例） | 維持 | 結論は ADR-005（opaque/JWT 境界）の入力として維持する。前提の事例（次行）は修正が要るため、前提 CL を差し替えて再導出する。L453「短命JWT」との不整合は ADR-005 で解消する | 05_adr/ADR-005-token-profile.md | R-095 |
| CL-0014 | L11 | Slack・GitHub・Notion・Dropbox は、利用者が内容を解釈しない bearer token を中心に設計されている | `[V]` | `[^13]` `[^9]` `[^14]` `[^15]` | `[^13]` 部分支持／`[^9]` 不支持／`[^14]` 部分支持／`[^15]` 部分支持 | 修正 | GitHub は 2026-04-27 から App installation token に JWT 形式を段階展開したと監査が記録（TRC-06 §6、人手未確認）。Notion・Dropbox の opaque 性は出典未特定。GitHub を事例から外すか記述を改める | research/RS-04-oauth-oidc-profile.md | R-197 |
| CL-0015 | L12 | 下流サービスに同じ万能 token を転送し続ける方式は避けるべきである | `[D]` | — | 脚注なし | 維持 | レビューが「強い」と評価（宛先限定）。前提は RFC 9068 §4 の aud 検証と RFC 8693（次の 2 行を修正後に付け替える） | 04_architecture/workload-identity-delegation.md | R-251 |
| CL-0016 | L12 | RFC 9068 は、リソースサーバーごとに aud を検証することを要求する | `[N]` | `[^16]` `[^18]` | `[^16]` 支持／`[^18]` 検証不能（HTTP 404） | 原典差替 | `[^18]`（公開前 XML）を `[^16]` の RFC Editor 版 §4 に統合し、旧パス URL も差し替える | research/RS-04-oauth-oidc-profile.md | R-197 |
| CL-0017 | L12 | RFC 8693 は、下流向けに audience と scope を絞る交換と、委任元を表す act を定義する | `[N]` | `[^17]` | 部分支持 | 修正 | act は委任を受けた「現在の行為者」で、委任元は sub 側（§4.1。向きが逆）。audience・scope は OPTIONAL（§2.1。強度違い） | research/RS-06-workload-identity-delegation-agents.md | R-197, R-100 |
| CL-0018 | L12 | Microsoft の OBO も、中間 API 向け token を別の宛先へ送らないよう明示している | `[V]` | `[^19]` | 部分支持 | 修正 | Warning の対象は中間層に発行された token B で、本文の token A と異なる。追跡パラメータを除いた正規 URL へ差し替える | research/RS-06-workload-identity-delegation-agents.md | R-197 |
| CL-0019 | L13 | テナント分離と業務認可は、独立した防御層として実装すべきである | `[D]` | `[^2]` `[^20]` | 規範部分は記載なし（TRC-06 §5 L13） | 維持 | レビューが「強い」と評価（テナント境界の多層化）。規範部分は AWS 文書に記載がないため、前提 ID を付けた [D] として書く | 04_architecture/reference-architecture-v2.md、04_architecture/pep-contract.md | R-250 |
| CL-0020 | L13 | 分離は誤テナントへの到達を防ぐ境界、認可はテナント内の操作可否の判断であり、AWS も両者を区別する | `[V]` | `[^2]` `[^20]` | `[^2]` 支持／`[^20]` 部分支持 | 修正 | AWS の authorization の定義は「ユーザーがテナントへアクセスする権限」で、本文の「テナント内の操作可否」と異なる（定義の相違。TRC-06 §6） | research/RS-08-pep-completeness-tenant-isolation.md | R-197 |
| CL-0021 | L15 | 推奨ターゲットは、4 象限の「高セキュリティ・高柔軟性」に置く | `[D]` | — | 脚注なし | 削除 | 4 象限は評価軸を提案自身の特徴で定義した循環で識別力がない（seed-03 §7-4）。実装前の構想は「高セキュリティを目標とする設計候補」にすぎない（レビュー L139） | traceability/rejected-hypotheses.md | R-200, R-201 |
| CL-0022 | L15 | その位置は短命 token・service 別 aud・workload ID・共通 schema・関係グラフ・PEP・強制監査の組合せで実現する | `[D]` | — | 脚注なし | 要実測 | 構成要素の列挙は維持できる（R-249〜R-257）が、「実現する」は未実証の断定。PoC（R-205・R-206）と独立評価で検証する仮説として書き直す | 12_poc/preregistered-test-plan.md、00_decision/01-executive-summary.md | R-205, R-206 |

### 3.2 調査範囲と確度（L17〜L32）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0023 | L19 | 調査対象は、組織内でオブジェクトを動的に作成・共有・管理する 10 サービスである（L21〜L30） | `[A]` 未登録仮定 | — | 脚注なし | 要前提登録 | 未登録仮定。選定基準・母集団・除外理由がない。自社規模との前提差（人員、基盤、整合性保証、運用体制）を明記する（G-015） | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0024 | L32 | 各社の内部マイクロサービス間プロトコル・内部 claim・PDP 実装・失効方式は通常非公開である | `[D]` | — | 脚注なし | 維持 | 限界の明示として維持する。L135・L440・L453 はこの限界に反して内部構造を一般化しており、そちらを削除・修正する | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0025 | L32 | 公開資料で確認できる事実を「確認済み」、自社設計への転用を「設計上の帰結」として分離する | `[D]` | — | 脚注なし | 修正 | 宣言した区別ラベルは本文で一度も使われていない（全文検索で L32 の 1 件のみ）。CONVENTIONS §3 のタグ（[V]・[D] 等）で全主張に付け直す | traceability/claims-ledger.md | R-199, R-263 |
| CL-0026 | L32 | 外部 API が JWT を返すことと、社内の全サービスが同じ JWT を解釈することは同義ではない | `[D]` | — | 脚注なし | 維持 | 論理的な区別として維持する | 05_adr/ADR-005-token-profile.md | R-095 |

### 3.3 10 サービスの比較表（L36〜L47）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0027 | L38 | M365 の境界は Entra tenant と SharePoint site で、access token の tid・oid・scp/roles を使う | `[V]` | `[^6]` `[^7]` | `[^6]` 部分支持／`[^7]` 支持（要差替） | 原典差替 | `[^6]` を『Access token claims reference』、`[^7]` を Learn 公開版へ。境界（tenant・site）の部分は出典がない | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0028 | L38 | 粗粒度は Graph 権限、細粒度はサイト・リスト・ファイル ACL で、Sites.Selected は明示割当も要る | `[V]` | `[^21]` `[^22]` | `[^21]` 部分支持／`[^22]` 部分支持（Q&A） | 原典差替 | `[^22]` は Q&A（AI 生成回答を含む）で根拠に使えない。『Overview of Selected Permissions in OneDrive and SharePoint』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-198 |
| CL-0029 | L38 | M365 では Graph/SharePoint 側がトークン権限と対象リソース権限を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | 列見出しは「公開仕様から分かる」とするが脚注がなく、内部の判定位置は非公開（L32）。公開 API の外形挙動からの推論 [D] と明記する（同列の他 9 行も同じ） | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0030 | L39 | Drive の境界は domain・ユーザー・shared drive で、bearer token とドメイン全体委任を使う | `[V]` | `[^23]` `[^24]` | `[^23]` 不支持／`[^24]` 支持（翻訳版） | 原典差替 | `[^23]`（scope ガイドの pt-br 版）は内容が対応しないため外し、`[^24]` の英語原文で引く | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0031 | L39 | 粗粒度は drive.file〜drive の scope、細粒度は permission の type/role・継承・shared drive 所属 | `[V]` | `[^12]` | 支持（翻訳版） | 原典差替 | 日本語ロケール版を英語原文『Share files, folders, and drives』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0032 | L39 | Google Drive では Drive サービス側が ACL を評価する（公開仕様から分かる最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由 | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0033 | L40 | Box の境界は enterprise と user/service account、JWT assertion は取得手段で access token と別物 | `[V]` | `[^25]` `[^26]` | `[^25]` 支持／`[^26]` 支持（翻訳版） | 原典差替 | `[^26]` の日本語版を英語版リファレンスへ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0034 | L40 | 粗粒度はアプリ scope・subject type・downscope、細粒度は collaboration・role・waterfall 継承 | `[V]` | `[^11]` `[^27]` | `[^11]` 支持／`[^27]` 支持（エンドユーザー向け） | 原典差替 | `[^27]` はエンドユーザー向け入門で、API の根拠としては粒度が異なる。『Understanding Item Permissions』へ | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0035 | L40 | Box ではコンテンツサービスが scope と collaboration を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由 | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0036 | L41 | Dropbox の境界は team・member・namespace で、短命 OAuth token は team 用と user 用を区別する | `[V]` | `[^15]` | 支持 | 原典差替 | de-de ロケールの旧 URL（301 転送）を docs.dropboxapi.com の『OAuth』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0037 | L41 | scope は files・sharing・team・member 等、ルートは namespace・team space と Path-Root で明示する | `[V]` | `[^10]` | 支持 | 維持 | 原典と一致。参照節（API Call Roots、Dropbox-API-Path-Root）と確認日を付ける | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0038 | L41 | Dropbox API が token 主体・scope・namespace・共有権限を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由 | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0039 | L42 | Salesforce の境界は org で、access token は opaque か JWT、JWT は tnk・scp・client_id 等を持つ | `[V]` | `[^4]` | 支持 | 修正 | 判定は支持だが、tnk が header claim であること、JWT 形式は REST API 限定であることが落ちている（TRC-06 §9 `[^4]`） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0040 | L42 | 粗粒度は OAuth/custom scope・profile・permission set、細粒度は object・record・field・共有ルール | `[V]` | — | 脚注なし | 原典差替 | セルに出典がない。Salesforce 公式の共有・権限モデル文書を付ける（未特定） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0041 | L42 | Salesforce ではプラットフォームが org 文脈とメタデータ権限を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由 | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0042 | L43 | ServiceNow の境界は instance で、OAuth 等で主体を確立し、公開された認可モデルは ACL 中心である | `[V]` | — | 脚注なし（同行の脚注は細粒度セル） | 原典差替 | セルに出典がない | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0043 | L43 | 粗粒度は role・security attribute、細粒度は table・field・record・operation ごとの ACL と script | `[V]` | `[^28]` `[^29]` | `[^28]` 支持（旧リリース版）／`[^29]` 支持（SDK 文書） | 原典差替 | Zurich 版を現行の Brazil 版へ、SDK の宣言 API を『ACL rule types』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0044 | L43 | ServiceNow ではテーブル問い合わせ前後とレコード文脈で ACL を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由。評価順の記述は L81 で原典と逆と判定されている | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0045 | L44 | GitHub の境界は enterprise・organization・repository owner、認証は OAuth・App・PAT である | `[V]` | — | 脚注なし | 原典差替 | セルに出典がない | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0046 | L44 | 権限は repository selection・org policy・collaborator/team で決まり、token はユーザー権限を増やせない | `[V]` | `[^9]` `[^30]` | `[^9]` 支持（.md 版）／`[^30]` 不支持 | 原典差替 | `[^30]`（endpoint 対応表）は内容が対応しない。『Managing your personal access tokens』英語 HTML 版へ | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0047 | L44 | GitHub API が token permission と resource membership の積を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由。「積」の出典は未特定（TRC-06 §4.2 L87） | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0048 | L45 | Slack の境界は enterprise・workspace・installation で、token type（bot/user 等）が主体を決める | `[V]` | `[^14]` | 支持 | 維持 | 原典と一致。service token 等の追加種別の有無を確認日付きで記す | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0049 | L45 | 粗粒度は OAuth scope、細粒度は channel membership・workspace installation・user visibility | `[V]` | — | 脚注なし | 原典差替 | セルに出典がない（L95 前半も出典未特定） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0050 | L45 | Slack API が token type・scope・workspace/channel 関係を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由 | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0051 | L46 | Atlassian の境界は Cloud site（cloudId）で、OAuth 2.0 bearer token と API token を使う | `[V]` | `[^31]` `[^32]` | 行全体: `[^31]` 部分支持／`[^32]` 部分支持 | 原典差替 | `[^31]` の日本語版を英語原文へ差し替える。この部分は原典で支持される | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0052 | L46 | 粗粒度は Jira/Confluence scope、細粒度は project・space・issue・page の権限・role・restriction | `[V]` | `[^31]` `[^32]` | 部分支持（role・restriction の記載なし） | 原典差替 | role・restriction の出典が未特定（TRC-06 §4.2） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0053 | L46 | api.atlassian.com/ex/.../{cloudId} でサイトをルーティングし、製品側が権限を評価する | `[D]` | `[^31]` `[^32]` | 部分支持（ルーティングの説明・評価位置の記載なし） | 修正 | URL 形式は支持されるが、「cloudId によるルーティング」と評価位置は原典にない。[D] として書く | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0054 | L47 | Notion の境界は workspace で、OAuth access token と integration capability を使う | `[V]` | — | 脚注なし（同行の脚注は細粒度セル） | 原典差替 | 用語は現行の connection へ改める。internal connection の static token、PAT の扱いを追加する（TRC-06 §5 L105） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0055 | L47 | integration を共有した page とその子孫だけが対象で、未共有の page は API から不可視である | `[V]` | `[^8]` `[^13]` | `[^8]` 部分支持／`[^13]` 不支持 | 原典差替 | Notion『Authorization』§Connection permissions へ差し替える（URL の不一致は TRC-06 §4.3） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0056 | L47 | Notion API が capability と page の共有関係を評価する（最終判定位置） | `[D]` | — | 脚注なし | 修正 | L38 の最終判定位置と同じ理由 | research/RS-17-integration-patterns-modeling.md | R-263 |

### 3.4 各社の詳述（L49〜L107）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0057 | L51 | Entra access token の代表的 claim は iss・aud・tid・sub/oid・azp/appid・scp/roles・時刻である | `[V]` | `[^6]` `[^7]` `[^33]` | `[^6]` 部分支持／`[^7]` 支持（要差替）／`[^33]` 部分支持 | 原典差替 | `[^6]`（Agent ID）・`[^33]`（ID token）は文書種別の取り違え。『Access token claims reference』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0058 | L51 | Microsoft は API 側で aud・tid・主体・actor を検証し、tid と oid の組をデータキーに使うよう推奨する | `[V]` | `[^7]` `[^33]` | `[^7]` 支持（要差替）／`[^33]` 部分支持 | 修正 | tid と oid の組はサービス間でデータを共有する場合の推奨で、範囲が落ちている。『Secure applications and APIs by validating claims』で引く | research/RS-08-pep-completeness-tenant-isolation.md | R-197 |
| CL-0059 | L53 | OBO では API A が自身の資格情報と token A を提示し、API B 専用の token B を取得する | `[V]` | `[^19]` | 支持 | 原典差替 | 内容は支持。URL の追跡パラメータ（WT.mc_id）を除き、参照節（Protocol diagram）を記す | research/RS-06-workload-identity-delegation-agents.md | R-197 |
| CL-0060 | L53 | OBO により、下流は自分向けの aud と委任 scope を検証でき、API A 向け token を横流ししない | `[D]` | `[^19]` | 支持 | 維持 | OBO の仕組みからの推論として維持する | 04_architecture/workload-identity-delegation.md | R-251 |
| CL-0061 | L53 | SharePoint 固有の権限は Graph scope だけで決まらず、選択型権限は対象サイトへの明示割当を併用する | `[V]` | `[^22]` | 部分支持（Q&A） | 原典差替 | Q&A スレッドは Application 権限の事例で非公式回答。『Overview of Selected Permissions in OneDrive and SharePoint』へ | research/RS-17-integration-patterns-modeling.md | R-198 |
| CL-0062 | L57 | Drive は OAuth scope をアプリの最大機能上限とし、広域の drive より drive.file を推奨する | `[V]` | `[^23]` | 支持（翻訳版） | 原典差替 | pt-br 版（英語原文より古く、authuser が混入）を英語原文『Choose Google Drive API scopes』へ | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0063 | L57 | 権限は user/group/domain/anyone と role からなる permission resource で、親から子へ伝播する | `[V]` | `[^12]` | 支持（翻訳版） | 原典差替 | 英語原文へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0064 | L59 | サーバー間はサービスアカウントを用い、必要時のみ管理者がドメイン全体の委任と scope を許可する | `[V]` | `[^24]` | 支持（翻訳版） | 原典差替 | 英語原文『Using OAuth 2.0 for Server to Server Applications』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0065 | L59 | ユーザー代理は JWT assertion の sub に対象ユーザーを指定し、最終的なファイル権限は Drive 側が評価する | `[V]` | `[^24]` | 支持（翻訳版） | 修正 | 「Drive 側が評価」は原典の記述でなく推論（TRC-06 §9 `[^24]`）。[V] と [D] に分ける | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0066 | L63 | Box の JWT は自己完結型の認可 token ではなく、短命 access token を得るための signed assertion である | `[V]` | `[^25]` `[^26]` | `[^25]` 支持／`[^26]` 部分支持 | 原典差替 | `[^26]` の日本語版を英語版へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0067 | L63 | Box の assertion には iss・sub・box_sub_type・aud・jti・短い exp を置き、subject を選ぶ | `[V]` | `[^25]` `[^26]` | `[^25]` 支持／`[^26]` 部分支持 | 原典差替 | claim の正式な定義は『JWT without SDK』。`[^26]` の box_subject_type は client_credentials 用で別物 | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0068 | L65 | Box の権限は collaboration ACL で item・user/group・role を記録し、フォルダ階層に waterfall 継承する | `[V]` | `[^11]` `[^27]` | `[^11]` 部分支持／`[^27]` 部分支持（waterfall の仕組みは別記事） | 原典差替 | Box Support『Understanding Item Permissions』を追加・差替する | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0069 | L65 | Box では API token があっても、所有者・collaborator でないコンテンツには到達できない | `[V]` | `[^11]` `[^27]` | `[^11]` 部分支持（この部分は支持）／`[^27]` 部分支持（この部分は記載なし） | 原典差替 | `[^27]` を外し、`[^11]` と Box『User types』で引く | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0070 | L65 | Box は token exchange で resource と scope を限定した downscoped token を発行できる | `[V]` | `[^26]` | 支持（翻訳版） | 原典差替 | 英語版リファレンスへ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0071 | L69 | Dropbox は user token と team token を分け、files・sharing・team info 等の scope で機能を制限する | `[V]` | `[^15]` | 支持 | 原典差替 | de-de の旧 URL を docs.dropboxapi.com（§Scopes）へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0072 | L69 | team token は承認した管理者個人ではなく team に結び付き、member として動くには選択ヘッダーを使う | `[V]` | `[^15]` | 支持 | 原典差替 | 同上（§Using User and Team Tokens） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0073 | L71 | ファイル操作は namespace に相対化され、Path-Root で team space か member root を明示する | `[V]` | `[^10]` `[^34]` | `[^10]` 支持／`[^34]` 部分支持（ブログ） | 原典差替 | `[^34]` は 2023 年の移行告知ブログ。『Path Root Header Modes』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-198 |
| CL-0074 | L71 | テナント・名前空間の文脈を、曖昧なパス文字列に依存させない設計になっている | `[D]` | — | 脚注なし | 維持 | 事例からの設計上の示唆として維持する（三者一致の参考） | 04_architecture/pep-contract.md | R-250 |
| CL-0075 | L75 | Salesforce は org を境界とし、access token に tnk・scp・client・iss・aud・sub・時刻等を表現できる | `[V]` | `[^4]` | 部分支持 | 修正 | tnk は header claim、JWT-based access token は REST API 限定という制約が落ちている | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0076 | L75 | Salesforce は opaque token も扱い、resource server は introspection か認可面を使える | `[V]` | `[^4]` | 部分支持 | 修正 | 原典が記すのは User Info endpoint の呼出しで、introspection の記述はない（置換。TRC-06 §6） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0077 | L77 | 実効権限は OAuth scope だけでなく、profile/permission set と object/field/record の共有の組合せで決まる | `[V]` | — | 脚注なし | 原典差替 | 出典がない。Salesforce 公式の共有モデル文書を付ける（未特定） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0078 | L77 | org ID を境界として固定し、業務オブジェクトの認可メタデータを token 寿命に閉じ込めない点が重要である | `[D]` | — | 脚注なし | 維持 | 設計上の示唆として維持する | 04_architecture/token-profile.md | R-249 |
| CL-0079 | L81 | ServiceNow の ACL は table.field と operation を基準に role・属性・条件・script を組み合わせる | `[V]` | `[^28]` `[^29]` | 部分支持（構成要素は支持） | 原典差替 | Brazil 版『Explore Access Control Lists』と『ACL rule types』へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0080 | L81 | ServiceNow は generic から specific へテーブル階層を探索し、複数条件をすべて満たす必要がある | `[V]` | `[^28]` `[^29]` | 部分支持（評価順は原典と逆） | 修正 | 『ACL rule types』は specific を先に評価する（向きが逆）。同順位の複数一致は any one、record は table と field の両 ACL が要る、の規則が欠落 | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0081 | L83 | ServiceNow は token に全 permission を列挙せず、主体の属性を入力にサービス側で再認可する典型である | `[D]` | — | 脚注なし | 維持 | 公開 ACL モデルからの推論として維持する | research/RS-17-integration-patterns-modeling.md | R-249 |
| CL-0082 | L83 | 柔軟性は高いが、script ACL の複雑性・評価コスト・説明可能性の管理に共通規約とテストが要る | `[D]` | — | 脚注なし | 維持 | 任意 script の例外承認（L401）の前提として維持する | 10_integration/authz-modeling-guide.md | R-098, R-256 |
| CL-0083 | L87 | GitHub の fine-grained token は一つの resource owner・選択 repository・permission に絞れる | `[V]` | `[^9]` `[^35]` | 部分支持（この部分は支持） | 原典差替 | `[^9]`（.md 版）と `[^35]`（機械翻訳版）を英語 HTML 版 1 本に統合する | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0084 | L87 | token は保持者の権限を増やさず、token permission とユーザー/App installation 権限の積になる | `[V]` | `[^9]` `[^35]` | 部分支持（「積」は記載なし） | 修正 | 「権限を増やさない」は支持。「App installation 権限との積」は出典未特定で、[D] として書き分ける（TRC-06 §4.2） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0085 | L89 | GitHub の各 endpoint は必要 permission を宣言し、X-Accepted-GitHub-Permissions で示せる | `[V]` | `[^36]` `[^30]` | 部分支持（この部分は支持） | 原典差替 | `[^36]`（GHES 3.21）を外し、`[^30]` の github.com 版で引く | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0086 | L89 | GitHub App は JWT で installation access token を得て、通常 API は交換後の短命 token を使う | `[V]` | `[^36]` `[^30]` | 部分支持（JWT・installation token の記載なし） | 原典差替 | 『Generating an installation access token for a GitHub App』（有効期限 1 時間）を追加する | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0087 | L89 | この分離は、自社でも workload の秘密鍵/identity と resource access token を分ける根拠になる | `[D]` | — | 脚注なし | 維持 | 方向性はレビューが評価（非人間 ID の分離）。他社事例は例示に限り、根拠は自社の脅威モデルで示す（G-015） | 04_architecture/workload-identity-delegation.md | R-255 |
| CL-0088 | L93 | Slack では token type 自体が主体モデルを表し、bot・user・app-level・workflow token が別の主体となる | `[V]` | `[^14]` | 支持 | 維持 | 原典と一致。版・確認日を付ける | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0089 | L95 | Slack は scope に加え、bot の channel 参加・会話の閲覧可否・installation の所属を評価する | `[V]` | `[^37]` | 部分支持（前半の記載なし） | 原典差替 | 前半の出典が未特定（TRC-06 §4.2） | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0090 | L95 | Slack の token rotation を有効にすると access token は 12 時間で失効し、refresh token も更新される | `[V]` | `[^37]` | 部分支持（この部分は支持） | 修正 | 「一度有効にすると無効にできない」制約と、refresh token が 1 回限りである点が落ちている | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0091 | L99 | Atlassian は cloudId を Cloud site の一意な tenant identifier として API URL に含める | `[V]` | `[^31]` `[^32]` | 部分支持 | 修正 | 原典は site（instance）の一意な識別子と記す。「tenant identifier」は本文の言い換えで、[D] として書き分ける | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0092 | L99 | Atlassian の service account の OAuth access token は 60 分で、cloudId 付きの URL へ送る | `[V]` | `[^31]` `[^32]` | 部分支持 | 修正 | 60 分は OAuth token（`[^31]`）の値。`[^32]` の API token は既定 1 年で、両者を区別する | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0093 | L101 | Atlassian の project・issue・space・page の権限は製品側で評価され、scope だけでは object 権限を得ない | `[V]` | — | 脚注なし | 原典差替 | 出典がない。`[^32]` の「regular users と同じ permission と scope の要件」が一部を支える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0094 | L101 | tenant 文脈を URL ルーティングと token 認可の両方で一致確認する方式は、テナント混同防御の参考になる | `[D]` | — | 脚注なし | 維持 | 三者一致（L370）の参考事例として維持する。他社事例は例示に限る（G-015） | 04_architecture/pep-contract.md | R-250 |
| CL-0095 | L105 | Notion integration は OAuth で workspace へ追加され、capability で操作の上限を定める | `[V]` | `[^8]` `[^13]` | `[^8]` 部分支持／`[^13]` 不支持 | 原典差替 | 『Authorization』へ差し替え、internal connection の static token と PAT（作成者の権限で動作）を反映する | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0096 | L105 | Notion integration が page へ明示的に共有されなければ、その page と子孫を API で取得できない | `[V]` | `[^8]` `[^13]` | `[^8]` 部分支持／`[^13]` 不支持 | 原典差替 | 同上 | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0097 | L107 | scope と共有 graph を分離した最小権限設計で、本人の権限を自動継承しないため blast radius が小さい | `[D]` | — | 脚注なし | 修正 | PAT は作成者の権限で動作する（TRC-06 §5 L105）ため、全 token 種別には当てはまらない | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0098 | L107 | Notion 型の明示共有では、大量の page への管理操作に明示的な共有運用が必要になる | `[D]` | — | 脚注なし | 維持 | 運用負荷の推論として維持する | research/RS-17-integration-patterns-modeling.md | — |

### 3.5 役割レイヤー（L109〜L124）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0099 | L115 | IdP/AS が人・アプリ・workload の認証、MFA/SSO、consent、token の発行・交換・失効を担う | `[D]` | — | 脚注なし | 維持 | 責務の分解として維持する。build/buy は ADR-001 で決める。認証ライフサイクル（登録〜削除、回復、IdP 連携）は別途欠落している（R-028） | 04_architecture/reference-architecture-v2.md、05_adr/ADR-001-build-buy-identity-provider.md | R-094, R-028 |
| CL-0100 | L115 | IdP/AS は、検証に失敗した場合の原則として token の発行を拒否する | `[D]` | — | 脚注なし | 維持 | 安全側原則として維持する。IdP 停止時の業務継続は失敗モード表で別に扱う | 04_architecture/fail-mode-matrix.md | R-262 |
| CL-0101 | L116 | Tenant Context Service が login/BFF/gateway で active tenant の選択・所属確認・routing を行う | `[D]` | — | 脚注なし | 維持 | レビュー評価（テナント境界）と整合する | 04_architecture/reference-architecture-v2.md | R-250 |
| CL-0102 | L116 | Tenant Context Service は、active tenant と membership が一致しない要求を拒否する | `[D]` | — | 脚注なし | 維持 | ゲスト・委託先の所属は membership 側で表す前提。越境共有の扱いは ADR-024 で定義する | 04_architecture/pep-contract.md | R-250 |
| CL-0103 | L117 | PAP が管理面で role・relation・policy・schema を登録し、版管理する | `[D]` | — | 脚注なし | 維持 | PAP は root of trust の対象範囲（R-056）として保護する | 04_architecture/reference-architecture-v2.md、04_architecture/root-of-trust.md | R-056 |
| CL-0104 | L117 | PAP は、失敗時の原則として無効な schema・policy の登録を拒否する | `[D]` | — | 脚注なし | 維持 | 変更統制（R-256）と整合する | 04_architecture/authorization-model.md | R-256 |
| CL-0105 | L118 | PIP が resource・group・device・location 等の属性を directory・resource DB・cache から供給する | `[D]` | — | 脚注なし | 維持 | 属性の鮮度・所有者は認可モデルで定義する | 04_architecture/authorization-model.md | R-098 |
| CL-0106 | L118 | PIP の属性が欠落した場合は、原則として deny とする | `[D]` | — | 脚注なし | 要実測 | 全操作一律の fail-closed に当たる（レビュー意思決定マトリクス「全fail-closed等の一律値: 未承認」）。操作 5 分類ごとに PIP 不達・欠落時の挙動と限定 grace を決め、障害注入で実測する | 04_architecture/fail-mode-matrix.md | R-087, R-082, R-085 |
| CL-0107 | L119 | PDP は principal×action×resource×context を評価し、centralized service か sidecar に置く | `[D]` | — | 脚注なし | 修正 | 配置が「または」で未決定。ADR-013 で cell・fault domain と合わせて決める | 05_adr/ADR-013-cell-partitioning-fail-mode.md | R-099 |
| CL-0108 | L119 | PDP の失敗時の原則として、timeout・error は一律に deny とする | `[D]` | — | 脚注なし | 要実測 | 一律 fail-closed（R-087）。全操作に一律適用すると PDP 障害が全社停止へ直結するとレビューが指摘。public/read-sensitive/write/privileged/break-glass ごとの PDP 不達時挙動を決め、実測する | 04_architecture/fail-mode-matrix.md、07_slo/numeric-contracts.md | R-087, R-082, R-086 |
| CL-0109 | L120 | PEP が gateway と各 microservice で token 検証・tenant binding・PDP 呼出し・決定の強制を行う | `[D]` | — | 脚注なし | 維持 | レビュー評価（PEP/PDP 分離） | 04_architecture/pep-contract.md | R-254 |
| CL-0110 | L120 | PEP は bypass 不能であり、既定で deny（deny by default）とする | `[D]` | — | 脚注なし | 要実測 | 「bypass 不能」は証明のない性質の主張（Critical: PEP 完全性）。全 entry point の inventory、coverage の機械的検証、bypass test で示すまで目標として書く | 04_architecture/pep-contract.md、05_adr/ADR-012-pep-coverage-storage-guardrails.md | R-058, R-059, R-060 |
| CL-0111 | L121 | Token Exchange/Delegation が AS/STS で下流の aud・scope へ絞り、actor chain を保持する | `[D]` | — | 脚注なし | 維持 | レビュー評価（宛先限定） | 04_architecture/workload-identity-delegation.md | R-251, R-100 |
| CL-0112 | L121 | Token Exchange は、失敗時の原則として audience が一致しない要求を拒否する | `[D]` | — | 脚注なし | 維持 | 安全側原則として維持する | 04_architecture/workload-identity-delegation.md | R-251 |
| CL-0113 | L122 | Audit が全サービスと集約基盤で、誰が何をどの tenant でなぜ許可・拒否されたかを記録する | `[D]` | — | 脚注なし | 維持 | レビュー評価（監査の追跡項目）。量・費用・機密性は L403 の主張で扱う | 04_architecture/audit-privacy.md | R-257 |
| CL-0114 | L122 | Audit の失敗時の原則として、重要操作は監査不能なら拒否「も検討」する | `[D]` | — | 脚注なし | 修正 | 「検討」で挙動が未決定。操作分類ごとの監査不能時挙動（R-083）と監査経路停止時の挙動（R-127）として決める | 04_architecture/fail-mode-matrix.md、04_architecture/audit-privacy.md | R-083, R-127 |
| CL-0115 | L124 | 認可の機能分解には、NIST ABAC の PAP/PDP/PEP/PIP が有効である | `[N]` | `[^2]` `[^3]` | 部分支持（NIST・PIP の記載なし） | 原典差替 | 旧提案は NIST の文書を引いていない。NIST の ABAC 原典を取得して引く（未取得。TRC-06 §4.2） | research/RS-07-authz-engines-consistency.md | R-197 |
| CL-0116 | L124 | AWS のマルチテナント SaaS 指針も、PAP/PDP/PEP/PIP の分離を採用している | `[V]` | `[^2]` `[^3]` | 部分支持 | 修正 | AWS が採るのは PAP/PDP/PEP の 3 要素で、PIP の記載はない（PDF 全文検索 0 件） | research/RS-08-pep-completeness-tenant-isolation.md | R-197 |
| CL-0117 | L124 | OPA は policy bundle を各 sidecar へ配布し、sidecar に置いた OPA が判定する | `[V]` | `[^39]` `[^3]` | 部分支持 | 修正 | 各 OPA が bundle server から取得（pull）する仕組みで、「配布」（push）と向きが異なる。OPA『Bundles』を追加する | research/RS-07-authz-engines-consistency.md | R-197 |
| CL-0118 | L124 | OPA は input・result・bundle revision・decision_id を decision log へ記録できる | `[V]` | `[^38]` | 部分支持（この部分は支持） | 原典差替 | 版を固定する（確認時 v1.21.1）。latest の URL は内容が変わり得る | research/RS-10-audit-privacy-residency.md | R-197 |

### 3.6 フロー類型（L126〜L135）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0119 | L130 | Claim-centric tenant RBAC（Entra・Salesforce）は低レイテンシだが、role 肥大化と権限変更の残存が弱み | `[D]` | — | 脚注なし | 修正 | Salesforce は record 共有をプラットフォーム側で評価する（L77）ため、この分類と整合しない。「低レイテンシ」は実測がない | research/RS-17-integration-patterns-modeling.md | R-263 |
| CL-0120 | L131 | Scope＋Resource ACL/ReBAC（Drive・Box・Dropbox・Notion）は動的共有に強いが、一貫性と高可用性が要る | `[D]` | — | 脚注なし | 維持 | 類型化として維持する。代表 SaaS は公開 API の挙動による分類と明記する | research/RS-17-integration-patterns-modeling.md | R-253 |
| CL-0121 | L132 | Installation/Delegation 型（GitHub・Slack・Atlassian）は外部連携を最小権限化できるが、文脈が複雑 | `[D]` | — | 脚注なし | 維持 | 類型化として維持する | research/RS-17-integration-patterns-modeling.md | — |
| CL-0122 | L133 | Central policy/ABAC hybrid（ServiceNow・OPA/Cedar 型）は異種 domain に強いが、統制と説明性が課題 | `[D]` | — | 脚注なし | 維持 | 類型化として維持する。OPA/Cedar は SaaS でなくエンジンである点を書き分ける | research/RS-07-authz-engines-consistency.md | R-098 |
| CL-0123 | L135 | 大規模 SaaS は入口で claim、resource 層で ACL/ReBAC、S2S で委任、管理 policy で ABAC を組み合わせる | `[D]` | — | 脚注なし | 削除 | 各社の内部構成は非公開と自ら認めており（L32）、内部構造の一般化に根拠がない（G-015、seed-03 §7-5） | traceability/rejected-hypotheses.md | R-263 |

### 3.7 JWT 設計（L137〜L193）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0124 | L141 | 推奨する access token は認証済み request context の封筒であり、業務 ACL のスナップショットではない | `[D]` | — | 脚注なし | 維持 | レビュー評価（万能 JWT の否定） | 04_architecture/token-profile.md | R-249 |
| CL-0125 | L145 | iss は必須 claim とし、tenant 値から組み立てず、信頼する発行者の allowlist と JWKS に結合する | `[D]` | — | 脚注なし | 維持 | 署名鍵と issuer の結合（R-161）として維持する | 04_architecture/token-profile.md、11_contracts/schemas/access-token-claims.schema.json | R-161 |
| CL-0126 | L146 | aud は必須で service または API product 単位とし、全 microservice 共通の audience を禁止する | `[D]` | — | 脚注なし | 維持 | 粒度（service か API product か）は ADR-005 で決める | 05_adr/ADR-005-token-profile.md | R-251 |
| CL-0127 | L147 | sub は必須で、display name や email ではなく不変の opaque ID とする | `[D]` | — | 脚注なし | 維持 | 不可逆識別子の選定（ADR-021）へ移す | 05_adr/ADR-021-irreversible-identifiers.md | R-037 |
| CL-0128 | L148 | tid は必須で、resource の tenant と毎回一致を検証し、ユーザーの所属一覧は入れない | `[D]` | — | 脚注なし | 修正 | 正当な越境共有・ゲスト・委託先アクセスと「毎回一致」が衝突する（seed-03 §7-8）。越境共有モデル（ADR-024）と合わせて照合規則を定める | 05_adr/ADR-024-cross-tenant-sharing.md、04_architecture/pep-contract.md | R-250 |
| CL-0129 | L149 | azp または client_id を必須とし、user と client を別の主体として監査する | `[D]` | — | 脚注なし | 修正 | RFC 9068 §2.2 は client_id を REQUIRED とする[^11]。azp は OIDC の ID token の claim で、claim 名を規範に合わせる | 04_architecture/token-profile.md | R-161 |
| CL-0130 | L150 | scp または roles を必須とし、API capability の上限として delegated scope と app role を混同しない | `[D]` | — | 脚注なし | 修正 | RFC 9068 §2.2.3 は scope 要求時に "scope" claim を SHOULD とする[^11]。scp は Microsoft 等の独自名（L9）。規範の claim 名と独自名の対応を決める | 05_adr/ADR-005-token-profile.md | R-161 |
| CL-0131 | L151 | iat・nbf・exp は必須とし、有効時間は 5〜15 分を基準に短命化し、clock skew の上限を定める | `[A]` 未登録仮定 | — | 脚注なし | 要実測 | 未登録仮定。根拠のない一律値で、レビューは「未承認。リスク階層と実測に基づき決定」とした。A-027 は容量計算用の仮置きで決定値ではない。操作階層ごとに BIA と PoC 実測（失効伝播、refresh 負荷）で決め、clock skew 上限も数値契約に置く | 07_slo/numeric-contracts.md、05_adr/ADR-005-token-profile.md | R-087, R-189, R-196 |
| CL-0132 | L152 | jti は「推奨」とし、高リスク操作の replay 検知と失効の補助に使う | `[D]` | — | 脚注なし | 修正 | RFC 9068 §2.2 は jti を REQUIRED とする[^11]。L159 で RFC 9068 の profile を引いており、強度が整合しない | 04_architecture/token-profile.md | R-161 |
| CL-0133 | L153 | sid は条件付きとし、logout・CAE・session revoke との連携に使う | `[D]` | — | 脚注なし | 維持 | 失効・継続評価（DL-56）へ移す | 04_architecture/revocation-continuous-evaluation.md | R-112 |
| CL-0134 | L154 | amr・acr・auth_time は条件付きとし、privileged operation の step-up に使う | `[D]` | — | 脚注なし | 維持 | RFC 9068 §2.2.1 では OPTIONAL[^11]。step-up の鮮度（max_age）は R-045 で決める | 04_architecture/token-profile.md | R-045 |
| CL-0135 | L155 | act は delegation 時に必須とし、代理実行 actor の chain を監査し、RFC 8693 に従う | `[N]` | `[^17]` | 部分支持 | 修正 | RFC 8693 は act を必須にしていない（「delegation 時必須」は設計判断 [D]）。ネストした過去の actor をアクセス制御判断に使わない（§4.1、MUST）が欠落 | 04_architecture/workload-identity-delegation.md | R-100, R-162 |
| CL-0136 | L156 | cnf は高リスク時に推奨し、DPoP または mTLS の sender-constrained token に使う | `[N]` | `[^40]` `[^41]` | `[^40]` 不支持／`[^41]` 部分支持 | 原典差替 | `[^40]`（AuthHero）・`[^41]`（Auth0 日本語版）は他社製品の文書。RFC 9449 §6.1（DPoP）と RFC 8705 §3.1（mTLS）を別脚注で引く | 04_architecture/token-profile.md | R-197, R-259 |
| CL-0137 | L157 | ver は推奨とし、独自 claim schema の版として consumer の段階移行と互換性管理に使う | `[D]` | — | 脚注なし | 維持 | versioning 方針（ADR-016）へ移す | 05_adr/ADR-016-versioning-deprecation.md | R-109 |
| CL-0138 | L159 | RFC 9068 の resource server は typ=at+jwt・許可 algorithm・iss・aud・署名・exp を検証しなければならない | `[N]` | `[^16]` | 部分支持 | 修正 | typ・iss・aud・署名・exp の MUST は §4 で支持。許可 algorithm の固定は RFC 8725 §3.1 の内容（帰属違い）。暗号化 token の扱い（SHOULD reject）が欠落 | research/RS-04-oauth-oidc-profile.md、04_architecture/token-profile.md | R-161 |
| CL-0139 | L159 | JWT BCP は許可 algorithm を固定し、用途ごとに検証ルールと鍵を分離するよう求めている | `[N]` | `[^42]` | 不支持 | 修正 | `[^42]` は Okta の設定手順で RFC に触れない。RFC 8725 §3.1・§3.11・§3.12 へ差替。§3.12 の MUST は相互排他的な検証規則で、鍵の分離は選択肢の一つ（強度違い）。後継 draft の状態を併記 | research/RS-04-oauth-oidc-profile.md | R-161, R-162 |
| CL-0140 | L163 | 全フォルダ ID・全拠点 ID・全 object permission の列挙を token に入れてはならない | `[D]` | — | 脚注なし | 維持 | 万能 JWT の否定と整合する | 04_architecture/token-profile.md | R-249 |
| CL-0141 | L164 | 変更頻度の高い group membership の完全一覧を token に入れてはならない | `[D]` | — | 脚注なし | 維持 | 理由（サイズと剥奪遅延）は [D]。L170 の overage は例示に限る | 04_architecture/token-profile.md | R-249 |
| CL-0142 | L165 | email・氏名・機密分類など、API の判定に不要な PII を token に入れてはならない | `[D]` | — | 脚注なし | 維持 | 最小化（R-119）。RFC 9068 §6 のプライバシー考慮と対応付ける | 04_architecture/token-profile.md | R-119 |
| CL-0143 | L166 | 暗号化されていない機密属性は token に入れない。署名 JWT は payload を秘匿しない | `[N]` | — | 脚注なし | 原典差替 | 後半は JWS の性質であり、規範の原典（RFC 7515・RFC 7519）を付ける | 04_architecture/token-profile.md | R-119 |
| CL-0144 | L167 | 任意の下流サービスが意味を独自に解釈する、版管理されない claim を token に入れてはならない | `[D]` | — | 脚注なし | 維持 | L157（ver）と対にする | 05_adr/ADR-016-versioning-deprecation.md | R-109 |
| CL-0145 | L168 | trace ID や request ID を、恒久的な token claim として埋め込んではならない | `[D]` | — | 脚注なし | 維持 | 相関 ID は token の外で伝搬する（L273） | 04_architecture/token-profile.md | — |
| CL-0146 | L170 | Entra は group 数が多いと token に全 group を載せず、overage indicator から Graph を照会する | `[V]` | `[^43]` | 不支持 | 原典差替 | `[^43]` は Auth0 の別 API の文書。『Access token claims reference』Groups overage claim 節（JWT 200 件、SAML 150 件）へ差し替える | research/RS-17-integration-patterns-modeling.md | R-197 |
| CL-0147 | L170 | overage はサイズ上限だけでなく、membership 変更と token 寿命の不整合を避ける根拠になる | `[D]` | `[^43]` | 不支持 | 修正 | 原典が挙げる理由はヘッダサイズの上限だけ。後半は [D] と明記する | 04_architecture/token-profile.md | R-197 |
| CL-0148 | L174〜L190 | 例示 payload は有効期間 600 秒（exp−iat）とし、amr に pwd と mfa を置く | `[A]` 未登録仮定 | — | 脚注なし | 要実測 | 未登録仮定。例示値が L151 の一律値（10 分）を具体化している。例示であることを明記し、寿命は L151 と同じく実測で決める。「pwd＋mfa」だけでは AAL を判断できない（R-027） | 04_architecture/token-profile.md | R-087, R-189 |
| CL-0149 | L174〜L190 | 例示 payload は scp・azp を使い、RFC 9068 が REQUIRED とする client_id を含まない | `[D]` | — | 脚注なし | 修正 | RFC 9068 §2.2（client_id REQUIRED）・§2.2.3（scope）と整合しない[^11]。JSON Schema（DL-75）を正とし、例はそこから生成する | 11_contracts/schemas/access-token-claims.schema.json | R-161 |
| CL-0150 | L193 | この token だけで folder:F123 への write を許可してはならない | `[D]` | — | 脚注なし | 維持 | 万能 JWT の否定と整合する | 04_architecture/pep-contract.md | R-249 |
| CL-0151 | L193 | File Service は tenant の一致を確認後、Check(user, action, object, context) を PDP へ問う | `[D]` | — | 脚注なし | 維持 | Check API は AuthZEN 準拠の契約（DL-72）で再定義する | 11_contracts/authorization-api.openapi.yaml、04_architecture/pep-contract.md | R-254 |

### 3.8 推奨認可フロー（L195〜L219）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0152 | L199 | ユーザーを OIDC Authorization Code＋PKCE で認証し、組織横断ユーザーには active tenant の選択を求める | `[D]` | — | 脚注なし | 維持 | RFC 9700 準拠表（R-158）で PKCE 等を規範と対応付ける | 04_architecture/token-profile.md、02_requirements/identity-lifecycle.md | R-158 |
| CL-0153 | L200 | AS は所属を確認して BFF/API 専用の短命 token を発行し、長寿命 bearer をブラウザに置かない | `[D]` | — | 脚注なし | 維持 | BFF の採用はレビューと整合する（R-163）。「短命」の値は L151 | 04_architecture/token-profile.md | R-163 |
| CL-0154 | L201 | Gateway は署名・typ・iss・aud・exp・nbf・azp を検証し、外部の tenant・actor header を除去して再生成する | `[D]` | — | 脚注なし | 維持 | JWT 厳格検証（R-161）。alg allowlist と鍵-issuer 結合を検証項目に加える | 04_architecture/pep-contract.md | R-161, R-250 |
| CL-0155 | L202 | resource service は resource ID から正規の tenant を DB/index で解決し、token の tid と一致させる | `[D]` | — | 脚注なし | 修正 | 越境共有と衝突する（L148 と同じ）。resource index 自体の完全性・遅延も PEP 外データ（DL-57）として扱う | 04_architecture/pep-contract.md、05_adr/ADR-024-cross-tenant-sharing.md | R-250, R-061 |
| CL-0156 | L203 | PEP は主体・操作・resource・context を PDP へ問い、PDP は所属・relation・role・条件・deny を評価 | `[D]` | — | 脚注なし | 維持 | deny semantics と conflict resolution は ADR-011 で定義する | 05_adr/ADR-011-policy-language-pep-pdp-api.md | R-098, R-254 |
| CL-0157 | L204 | 更新は業務データと tuple/outbox を同一 transaction で記録し、非同期反映時は consistency token を渡す | `[D]` | — | 脚注なし | 要実測 | コンテンツ更新と relation 更新の原子的結合、変更直後の読取の consistency mode は engine/store に依存し、PoC で実測して決める | 04_architecture/authorization-model.md、12_poc/preregistered-test-plan.md | R-144, R-145 |
| CL-0158 | L205 | 応答に外部 request ID を返し、内部で trace_id・decision_id・policy/model revision 等を記録する | `[D]` | — | 脚注なし | 維持 | レビュー評価（監査の追跡項目） | 04_architecture/audit-privacy.md | R-257 |
| CL-0159 | L207 | Zanzibar は relation tuple を用い、ACL と content の変更の因果順序を守る snapshot で check する | `[V]` | `[^44]` `[^45]` | `[^44]` 支持／`[^45]` 支持（第三者転載） | 原典差替 | `[^45]`（AuthZed 社の注釈付き転載）を外し、USENIX ATC '19 の正規版（§2.2）に統合する | research/RS-07-authz-engines-consistency.md | R-197, R-142 |
| CL-0160 | L207 | new enemy 問題を避けるには、単なる TTL cache ではなく、この一貫性要件を設計に含める必要がある | `[D]` | — | 脚注なし（`[^44]` は前文） | 維持 | レビューが評価（一貫性認識）。採用 engine の実保証範囲を明記し、「Zanzibar相当」とは主張しない（R-142） | 04_architecture/authorization-model.md | R-142, R-253 |
| CL-0161 | L211 | サービス自身の認証にはユーザー JWT を再利用せず、短命の workload identity と mTLS を使う | `[D]` | `[^48]` | 部分支持 | 維持 | 短命の X.509-SVID と mTLS は支持。「ユーザー JWT の再利用ではなく」の比較は [D]。レビュー評価（非人間 ID） | 04_architecture/workload-identity-delegation.md | R-255, R-100 |
| CL-0162 | L211 | SPIFFE は workload ごとの ID を X.509-SVID または JWT-SVID として発行する | `[N]` | `[^47]` | 部分支持 | 修正 | 現行仕様は SVID を X.509・JWT・WIT の 3 種とする（版ずれ）。版を固定する | research/RS-06-workload-identity-delegation-agents.md | R-197 |
| CL-0163 | L211 | JWT-SVID では sub に SPIFFE ID を置き、aud と exp を必須とする | `[N]` | `[^46]` | 支持 | 維持 | 版（latest）を固定し、canonical の GitHub 版の commit か日付を記録する | research/RS-06-workload-identity-delegation-agents.md | R-197 |
| CL-0164 | L213 | ユーザー委任を下流へ渡す方式は、token exchange/OBO・trusted context・再認可のいずれかとする | `[D]` | — | 脚注なし | 維持 | ADR-009 の選択肢として維持する | 05_adr/ADR-009-workload-identity-token-exchange.md | R-100 |
| CL-0165 | L215 | token exchange/OBO で下流専用 aud・縮小 scope・元 user の sub・呼出し元の act を持つ短命 token へ交換 | `[N]` | `[^18]` `[^19]` | `[^18]` 検証不能／`[^19]` 部分支持 | 修正 | 原典は RFC 8693（§1・§2.1・§4.1）。Microsoft の OBO は jwt-bearer grant による方式で RFC 8693 ではなく、act もない。両者を区別する | 04_architecture/workload-identity-delegation.md | R-100, R-197 |
| CL-0166 | L216 | trusted context では mTLS で認証した上流 PEP が署名/MAC 付きの短命 context を渡し、下流が検証する | `[D]` | — | 脚注なし | 修正 | 標準化されていない独自方式で、MAC 鍵の管理（root of trust）と、上流 PEP が侵害された場合の波及の分析がない | 05_adr/ADR-009-workload-identity-token-exchange.md、03_threat-model/threat-catalog.md | R-100, R-049 |
| CL-0167 | L217 | 高リスク・resource 固有の操作では下流が PDP へ再 check し、上流の allow を無条件に継承しない | `[D]` | — | 脚注なし | 維持 | confused deputy 対策として維持する | 04_architecture/workload-identity-delegation.md | R-100 |
| CL-0168 | L219 | 単純な read chain では PDP 決定を短時間 cache してよく、key に tenant・principal・revision 等を含める | `[D]` | — | 脚注なし | 要実測 | 「短時間」の値がない。操作分類ごとの cache 最大齢（R-080）として実測で決める | 04_architecture/fail-mode-matrix.md、07_slo/numeric-contracts.md | R-080, R-146 |
| CL-0169 | L219 | deny cache は短くし、権限剥奪・tenant 停止・MFA 要求の変更は push invalidation 等で即時に無効化する | `[D]` | — | 脚注なし | 要実測 | 「即時」に数値がない。剥奪→拒否の最大時間（操作単位）を数値契約に置き、実測する | 04_architecture/revocation-continuous-evaluation.md、07_slo/numeric-contracts.md | R-143, R-191 |

### 3.9 異種スコープの吸収（L221〜L267）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0170 | L225 | 各サービスのフォルダ・組織・拠点・ツール等を巨大な role 表に押し込めず、型付き entity graph で表す | `[D]` | — | 脚注なし | 維持 | レビュー評価（細粒度認可） | 04_architecture/authorization-model.md | R-252 |
| CL-0171 | L227〜L248 | 例示 model では folder の owner は file を読み書きできず、folder の editor は write だけを得る | `[D]` | — | 脚注なし | 修正 | L242〜L243 の read は parent.viewer、write は parent.editor だけを継承し、folder の owner・editor の read が導かれない。file の relation 宣言もない。擬似構文で特定 engine の検証器を通らない。採用 engine の言語で書き直して試験する | 10_integration/authz-modeling-guide.md、04_architecture/authorization-model.md | R-171, R-205 |
| CL-0172 | L250 | ReBAC は「U が O に R を持つか」を check し、階層・group membership・外部共有を tuple で表現できる | `[V]` | `[^49]` `[^50]` `[^51]` | `[^49]` 部分支持／`[^50]` 部分支持／`[^51]` 不支持 | 原典差替 | check の定義の原典は Zanzibar 論文 §1・§2.1。共同脚注を主張ごとに分け、`[^51]` は階層・role 分離の部分だけに付ける | research/RS-07-authz-engines-consistency.md | R-197 |
| CL-0173 | L250 | 固定 role は schema/model に、顧客が作る custom role と共有関係は tuple に置く分離が有効である | `[D]` | `[^51]` `[^49]` | `[^51]` 支持（この部分）／`[^49]` 部分支持 | 原典差替 | OpenFGA『Custom Roles』を追加する。「有効」は [D] とし、前提 ID を付ける | 10_integration/authz-modeling-guide.md | R-252 |
| CL-0174 | L252 | すべてを一個の巨大な authorization graph へ統合する必要はない | `[D]` | — | 脚注なし | 維持 | policy store 分割（R-151）と global 集約の原則不承認（R-265）と整合する | 04_architecture/cell-blast-radius.md | R-151, R-265 |
| CL-0175 | L254 | 共通 control plane は命名規約・tenant root・model registry・policy 版・audit schema を持つ | `[D]` | — | 脚注なし | 維持 | model registry の契約は DL-73 で定める | 11_contracts/relationship-model-registry.openapi.yaml、04_architecture/reference-architecture-v2.md | R-212 |
| CL-0176 | L255 | domain 別の data plane は File・Tool・Site 等の tuple/属性の shard と PDP endpoint を持つ | `[D]` | — | 脚注なし | 修正 | 分割軸が domain だけで、tenant・cell 単位の障害封じ込め（R-150、R-153）がない | 04_architecture/cell-blast-radius.md | R-150, R-153 |
| CL-0177 | L256 | 共通 SDK/sidecar は token 検証・tenant binding・check API・decision log・fail-closed を担う | `[D]` | — | 脚注なし | 要実測 | SDK の既定挙動として一律 fail-closed を置いている（R-087）。操作分類ごとの失敗モードを SDK の設定にし、障害注入で実測する。他の機能は連携ハンドブックへ移す | 04_architecture/fail-mode-matrix.md、10_integration/integration-patterns.md | R-087, R-085 |
| CL-0178 | L257 | domain owner が action/resource type と継承規則を所有し、schema review と migration を行う | `[D]` | — | 脚注なし | 維持 | 責任分界（R-136）と、中央 schema 審査のボトルネック（seed-03 §7-15）を運用モデルで扱う | 08_operations/operating-model.md、10_integration/authz-modeling-guide.md | R-136 |
| CL-0179 | L259 | Cedar 等の schema 付き engine は型・属性・親子関係を定義し、policy を事前に検証できる | `[V]` | `[^52]` `[^53]` `[^54]` | 支持（schema による事前検証） | 維持 | schema の変更で検証済み policy が無効になり得る制約を追記する（TRC-06 §9 `[^53]`） | research/RS-07-authz-engines-consistency.md | R-098 |
| CL-0180 | L259 | ReBAC graph は関係と継承、Cedar/OPA 型 ABAC は IP・時刻・device・機密区分等の条件に使うのが自然 | `[D]` | `[^52]` `[^53]` `[^54]` | `[^52]` 不支持／`[^53]` 不支持／`[^54]` 部分支持 | 修正 | 分担は原典の記述でなく [D]。原典は Cedar 自体が RBAC・階層・ABAC を扱うと説明している。OPA の原典が付いていない | 05_adr/ADR-011-policy-language-pep-pdp-api.md | R-098 |
| CL-0181 | L265 | 実効許可は token・tenant・client・scope・relation・条件・明示 deny なしの全条件の積である | `[D]` | — | 脚注なし | 維持 | deny semantics（R-098）として維持する。tenant_bound は越境共有（ADR-024）に合わせて定義し直す | 04_architecture/pep-contract.md | R-098 |
| CL-0182 | L267 | 判定式の条件のどれか一つでも不明・取得失敗・不一致なら deny とする | `[D]` | — | 脚注なし | 要実測 | 一律 fail-closed（R-087）。「不明なら deny」は安全側原則として維持するが（R-262）、取得失敗時の扱いは操作分類ごとの限定 grace（R-085、R-086）を含めて決め、実測する | 04_architecture/fail-mode-matrix.md | R-087, R-262 |
| CL-0183 | L267 | super-admin・support access は graph に混ぜず、専用 principal・JIT・MFA・理由・時間制限・全件監査を要する | `[D]` | — | 脚注なし | 維持 | レビュー評価（特権アクセス） | 05_adr/ADR-029-privileged-support-access.md | R-258 |

### 3.10 トレーサビリティ（L269〜L290）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0184 | L273 | 外部の traceparent は受け付けるが、trust boundary で形式・長さを検証し、必要なら新しい trace へ link する | `[D]` | `[^56]` | 部分支持 | 原典差替 | 形式・長さ・link の規範の原典は W3C Trace Context（Recommendation 2021-11-23）。[N] の別脚注を付ける | 04_architecture/audit-privacy.md | R-197 |
| CL-0185 | L273 | OpenTelemetry は、サービス境界を越えた trace context の伝搬を標準化している | `[V]` | `[^56]` | 部分支持 | 修正 | 伝搬形式を定めたのは W3C Trace Context で、OpenTelemetry の既定 propagator がそれを使う（帰属違い） | research/RS-10-audit-privacy-residency.md | R-197 |
| CL-0186 | L273 | OpenTelemetry は偽造 context・内部情報の外部漏洩・baggage への PII/credential 格納を警告している | `[V]` | `[^55]` `[^56]` | `[^55]` 部分支持／`[^56]` 支持（翻訳版） | 原典差替 | 英語原文『Context propagation』Security considerations へ差し替える | research/RS-10-audit-privacy-residency.md | R-197 |
| CL-0187 | L275〜L284 | 認可監査イベントは event_id から delegation_chain まで、8 群の項目を少なくとも持つ | `[D]` | — | 脚注なし | 修正 | 項目を先に列挙しているが、目的・最小化・保持・所在地・アクセス統制が定義されていない（R-118〜R-122）。subject_id・resource_id 等はそれ自体が機密になる | 11_contracts/schemas/audit-event.schema.json、05_adr/ADR-014-audit-data.md | R-118, R-119, R-257 |
| CL-0188 | L286 | OPA の decision log は decision_id・input/result・bundle revision を持ち、監査と debug に使える | `[V]` | `[^38]` | 支持 | 維持 | 版を固定する（確認時 v1.21.1） | research/RS-10-audit-privacy-residency.md | R-197 |
| CL-0189 | L286 | Microsoft Graph は、クライアントの client-request-id とサービスの request-id の記録を推奨している | `[V]` | `[^58]` | 支持（別製品の文書） | 原典差替 | `[^58]` は Dev Proxy の文書。『Best practices for working with Microsoft Graph』Reliability and support 節へ差し替える | research/RS-10-audit-privacy-residency.md | R-197 |
| CL-0190 | L286 | Microsoft Graph は、tenant の全 HTTP request を activity log へ出力できる | `[V]` | `[^60]` | 支持 | 修正 | Graph 宛ての要求に限る、Entra ID P1/P2 と診断設定が前提、配信は最大 2 時間、という範囲・前提が落ちている | research/RS-10-audit-privacy-residency.md | R-197 |
| CL-0191 | L286 | GitHub は X-GitHub-Request-Id、Box は box-request-id を、それぞれ応答で返す | `[V]` | `[^59]` `[^57]` | `[^59]` 部分支持／`[^57]` 支持 | 修正 | Box は「Most API calls」に限る。GitHub は提供終了の GHES 3.16 版で、ヘッダは例示出力だけ。github.com 版へ差し替える | research/RS-10-audit-privacy-residency.md | R-197 |
| CL-0192 | L290 | 分散 trace は性能・因果関係のため、監査 log は否認防止・証跡のための別のデータである | `[D]` | — | 脚注なし | 維持 | 監査を trace sampling に依存させない方針（R-128） | 04_architecture/audit-privacy.md | R-128 |
| CL-0193 | L290 | 特権操作・policy 変更・共有変更・token exchange・deny spike は 100% 監査し、sampling で落とさない | `[D]` | — | 脚注なし | 要実測 | 100% は、記録率・欠損検知・backpressure・監査経路停止時の挙動を定義して実測しなければ保証にならない（レビュー「必須の数値契約」） | 07_slo/numeric-contracts.md、04_architecture/audit-privacy.md | R-127, R-193 |
| CL-0194 | L290 | 監査 log は append-only/WORM・tenant 別のアクセス制御・保持・改ざん検知・SIEM 転送を備える | `[D]` | — | 脚注なし | 修正 | WORM と削除権・データ所在地が衝突する（seed-03 §7-11）。保持期間の値、SIEM 障害時の挙動、費用がない（R-120、R-125、R-126） | 04_architecture/audit-privacy.md、05_adr/ADR-014-audit-data.md | R-120, R-123, R-124, R-126 |
| CL-0195 | L290 | 監査 log には、業務 payload や JWT 原文を保存しない（最小化） | `[D]` | — | 脚注なし | 維持 | 最小化（R-119）として維持する | 04_architecture/audit-privacy.md | R-119 |

### 3.11 セキュリティ対策（L292〜L307）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0196 | L294〜L305 | 主要な脅威と対策を、10 行の脅威表（tenant 混同〜trace/baggage 注入）で示す | `[D]` | — | 脚注なし | 修正 | 攻撃者モデルがなく、フィッシング耐性、recovery bypass、IdP mix-up、JWKS 差替え、policy rollback 等の具体脅威が欠ける（R-166、R-168）。脅威ごとに予防・検知・封じ込め・復旧・証拠を書く（R-167） | 03_threat-model/threat-catalog.md、03_threat-model/attacker-model.md | R-166, R-167, R-168 |
| CL-0197 | L296 | tenant 混同/IDOR は tenant の逆引き・RLS/partition key・二重境界で防ぎ、negative test で確認する | `[D]` | — | 脚注なし | 維持 | 三者一致・storage guardrail と対応付け、cross-tenant property test（R-172）へ移す | 03_threat-model/threat-catalog.md、12_poc/preregistered-test-plan.md | R-061, R-172 |
| CL-0198 | L297 | token 横流しは service 別 aud・token exchange・短命化・DPoP/mTLS で防ぎ、他 API での拒否を試験する | `[D]` | — | 脚注なし | 維持 | token 誤用の PoC（R-173）へ移す | 03_threat-model/threat-catalog.md | R-251, R-173 |
| CL-0199 | L298 | token 窃取は BFF・HttpOnly/SameSite cookie・refresh rotation・cnf・秘密を log しないことで防ぐ | `[D]` | — | 脚注なし | 維持 | RFC 9700 準拠表で規範と対応付ける | 03_threat-model/threat-catalog.md | R-163, R-259 |
| CL-0200 | L299 | stale authorization を短命 token・PDP revision・push 無効化・consistency token で防ぐ | `[D]` | — | 脚注なし | 要実測 | 対策の十分性は、剥奪の反映時間と stale allow の継続時間の実測で決まる（R-143、R-146、R-191） | 04_architecture/revocation-continuous-evaluation.md、12_poc/preregistered-test-plan.md | R-143, R-191 |
| CL-0201 | L300 | confused deputy は sub と azp/act の別検証・downscope・resource owner の固定で防ぐ | `[D]` | — | 脚注なし | 維持 | 宛先限定の方向（R-251）と整合する | 03_threat-model/threat-catalog.md | R-251 |
| CL-0202 | L301 | policy drift は schema・policy-as-code・静的検証・unit/property/differential test で防ぐ | `[D]` | — | 脚注なし | 維持 | 変更統制（R-256）と differential test の PoC（R-175） | 03_threat-model/threat-catalog.md | R-256, R-175 |
| CL-0203 | L302 | PDP 障害には local sidecar/cache・circuit breaker・fail closed・重要 read の限定 grace で対処する | `[D]` | — | 脚注なし | 要実測 | L119・L267・L441 の一律 fail-closed と、この行の「重要 read の限定 grace」が同じ文書内で不整合。grace の範囲・最大齢を操作分類ごとに決め、PDP 障害注入で実測する | 04_architecture/fail-mode-matrix.md | R-082, R-085, R-086 |
| CL-0204 | L303 | ACL graph の循環・爆発は typed DAG・depth/fanout limit・query budget・precompute で防ぐ | `[D]` | — | 脚注なし | 要実測 | 上限値がない。最大 graph depth/fanout と query budget を数値契約に置き（A-036 は仮置き）、worst-case 負荷試験で実測する | 07_slo/numeric-contracts.md、04_architecture/capacity-model.md | R-190 |
| CL-0205 | L304 | support/admin 濫用は JIT/PAM・MFA・二者承認・理由・全件記録で防ぎ、break-glass を定期レビューする | `[D]` | — | 脚注なし | 維持 | レビュー評価（特権アクセス） | 05_adr/ADR-029-privileged-support-access.md | R-258 |
| CL-0206 | L305 | trace/baggage 注入は、trust boundary での sanitize・PII 禁止・outbound filter で防ぐ | `[D]` | — | 脚注なし | 維持 | forged traceparent/baggage の試験を PoC に入れる | 03_threat-model/threat-catalog.md | R-119 |
| CL-0207 | L307 | DPoP は access/refresh token を公開鍵へ結び付け、盗まれた token 単独での利用を難しくする | `[N]` | `[^40]` `[^41]` | `[^40]` 不支持／`[^41]` 不支持 | 修正 | 原典 RFC 9449 では refresh token を結び付けるのは public client だけ（§1、§5。範囲違い）。RFC 9449 へ差し替える | research/RS-04-oauth-oidc-profile.md | R-163, R-197 |
| CL-0208 | L307 | DPoP の nonce により、事前に生成された proof の replay も軽減できる | `[N]` | `[^40]` `[^41]` | `[^40]` 不支持／`[^41]` 不支持 | 原典差替 | RFC 9449 §8・§9 で引く | research/RS-04-oauth-oidc-profile.md | R-197 |
| CL-0209 | L307 | DPoP は XSS や実行中の client の侵害を解決しないため、短命化・BFF・CSP・鍵保護と併用する | `[D]` | `[^40]` `[^41]` | `[^40]` 不支持／`[^41]` 不支持 | 原典差替 | 限界は RFC 9449 §11.2・§11.4 で引く。BFF との併用は RFC 9449 に記載がなく [D] | 04_architecture/token-profile.md | R-163 |

### 3.12 4 象限マッピング（L309〜L341）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0210 | L313 | 柔軟性を、domain 固有 resource・階層・外部共有・custom role 等へ再設計なしで対応できる度合いと定義する | `[D]` | — | 脚注なし | 削除 | 評価軸を提案自身の特徴で定義しており、推奨案が高く出る循環（seed-03 §7-4）。運用コストの軸がない | traceability/rejected-hypotheses.md | R-201 |
| CL-0211 | L314 | セキュリティを least privilege・tenant 分離・revocation・aud 制約・監査・fail-closed の総合度と定義 | `[D]` | — | 脚注なし | 削除 | 同上。性質の主張は攻撃者モデル・統制・証拠・残余リスクの受容者の形で書く（CONVENTIONS §5） | traceability/rejected-hypotheses.md | R-201 |
| CL-0212 | L316 | 「柔軟性が高いほど必ずセキュリティが低い」という関係は成立しない | `[D]` | — | 脚注なし | 削除 | 4 象限の枠組みごと撤回する。反例も示されていない | traceability/rejected-hypotheses.md | R-201 |
| CL-0213 | L316 | 自由記述の script や無制限の custom claim では、柔軟性とセキュリティに負の相関が生じる | `[D]` | — | 脚注なし | 修正 | 相関の主張には根拠がない。リスクの記述（任意 script の review 困難）として脅威カタログへ移す | 03_threat-model/threat-catalog.md | R-098 |
| CL-0214 | L316 | 型付き schema・policy 検証・guardrail・domain owner・決定監査を設ければ、高柔軟性と高セキュリティは両立できる | `[D]` | — | 脚注なし | 削除 | 実証のない断定で、「高セキュリティ」は実装前構想の自己評価（レビュー L139）。統制ごとの効果は PoC と独立評価で示す（R-205、R-201） | traceability/rejected-hypotheses.md | R-200, R-201 |
| CL-0215 | L320 | 全 API 共通 JWT・長寿命・巨大 role claim・独自 parse はアンチパターンで、速い PoC 以外は採用不可 | `[D]` | — | 脚注なし | 修正 | 内容は万能 JWT の却下（L384）と同旨で維持する。象限の格付けを外し、却下案として代替案比較へ移す | 00_decision/08-alternatives-comparison.md | R-249 |
| CL-0216 | L321 | 固定 scope・単一 tenant token・allowlist（Notion・GitHub の一部）は低柔軟・高セキュリティである | `[D]` | — | 脚注なし | 削除 | 他社製品に「高セキュリティ」を格付けする証拠がない（R-201） | traceability/rejected-hypotheses.md | R-201 |
| CL-0217 | L322 | 任意 claim・任意 script ACL・自由な policy（統制なし ABAC 等）は高柔軟・低セキュリティである | `[D]` | — | 脚注なし | 修正 | 「review・説明・負荷予測が難しい」というリスクの記述は脅威カタログへ移し、象限の格付けと製品名（ServiceNow）の評価は外す | 03_threat-model/threat-catalog.md | R-098 |
| CL-0218 | L323 | 短命 aud token・typed ReBAC/ABAC・PEP/PDP・workload ID・audit の組合せは高柔軟・高セキュリティで目標 | `[D]` | — | 脚注なし | 削除 | 実装前構想への「高セキュリティ」の自己格付け。代表に Zanzibar を挙げる（R-142）。目標は「高セキュリティを目標とする設計候補」と書く（R-200） | traceability/rejected-hypotheses.md | R-200, R-142 |
| CL-0219 | L327 | 参考ポジションの評価はベンダー公表値でなく、公開モデルを比較するための定性的な相対評価である | `[D]` | — | 脚注なし | 削除 | 評価基準・評価者・根拠が示されず、「数値」と称するが表は定性語。参考ポジション表（L331〜L341）ごと撤回する | traceability/rejected-hypotheses.md | R-201 |
| CL-0220 | L331 | Microsoft 365/SharePoint の柔軟性を「高」、セキュリティを「高」と評価する | `[D]` | — | 脚注なし | 削除 | 識別力がない（セキュリティは 10 社中 9 社が「高」、1 社が「中〜高」）。他社製品のセキュリティ格付けに証拠がない（R-201、seed-03 §7-4） | traceability/rejected-hypotheses.md | R-201 |
| CL-0221 | L332 | Google Drive の柔軟性を「高」、セキュリティを「高」と評価する（理由: ACL・継承・委任統制） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0222 | L333 | Box の柔軟性を「高」、セキュリティを「高」と評価する（理由: collaboration graph・downscope） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0223 | L334 | Dropbox の柔軟性を「中〜高」、セキュリティを「高」と評価する（理由: scope・team token・namespace） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0224 | L335 | Salesforce の柔軟性を「高」、セキュリティを「高」と評価する（設定の複雑性ありと注記） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0225 | L336 | ServiceNow の柔軟性を「非常に高」、セキュリティを「中〜高」と評価する（governance 負荷が高い） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由。「非常に高」は CONVENTIONS §5 が禁じる自己評価型の形容詞に当たる | traceability/rejected-hypotheses.md | R-201 |
| CL-0226 | L337 | GitHub の柔軟性を「中〜高」、セキュリティを「高」と評価する（理由: owner・repository・permission の積） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0227 | L338 | Slack の柔軟性を「中」、セキュリティを「高」と評価する（理由: token type と installation/channel 境界） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0228 | L339 | Atlassian Cloud の柔軟性を「高」、セキュリティを「高」と評価する（理由: cloudId routing・scope） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0229 | L340 | Notion の柔軟性を「中」、セキュリティを「高」と評価する（理由: capability と明示 page share） | `[D]` | — | 脚注なし | 削除 | L331 と同じ理由 | traceability/rejected-hypotheses.md | R-201 |
| CL-0230 | L341 | 推奨自社基盤の柔軟性は「非常に高」、セキュリティも「非常に高」である | `[D]` | — | 脚注なし | 削除 | レビューの意思決定マトリクスで「削除」と判定。実装前構想の自己評価で、CONVENTIONS §5 の禁止表現「非常に高いセキュリティ」に当たる。評価は実装証拠・適合性・攻撃試験・運用実績・SLO・監査結果でのみ上げる | traceability/rejected-hypotheses.md | R-200, R-201 |

### 3.13 推奨アーキテクチャ（L343〜L378）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0231 | L347〜L365 | 論理構成は Gateway PEP・AS/STS・Service PEP・PDP・Relationship Store・PIP・PAP・監査系からなる | `[D]` | — | 脚注なし | 修正 | root of trust（鍵、KMS/HSM、JWKS、CI/CD）、顧客 IdP・SCIM、管理面、非同期経路、cell 境界が図にない（R-049、R-164）。PDP が 1 箱で topology を表さない | 04_architecture/reference-architecture-v2.md | R-164, R-056 |
| CL-0232 | L369 | Human identity は OIDC/OAuth 2.0 とし、enterprise federation・MFA・SCIM を IdP の責務とする | `[D]` | — | 脚注なし | 修正 | 認証ライフサイクルが薄い（Critical）。IAL/AAL/FAL、回復、account linking、IdP と主体の保証の結合が未定義（R-027、R-028、R-047）。build/buy は ADR-001 | 02_requirements/identity-lifecycle.md、05_adr/ADR-001-build-buy-identity-provider.md | R-027, R-028, R-094 |
| CL-0233 | L370 | active tenant を明示的に選択させ、token の tid・route・resource tenant の三者一致を強制する | `[D]` | — | 脚注なし | 修正 | 正当な越境共有・ゲストと三者一致が衝突する（seed-03 §7-8）。越境共有モデルを定義してから照合規則を決める | 05_adr/ADR-024-cross-tenant-sharing.md | R-250 |
| CL-0234 | L371 | workload ID は SPIFFE/SPIRE かクラウドの workload ID＋mTLS とし、共有 client secret を廃止する | `[D]` | — | 脚注なし | 維持 | 方向性承認（R-206）。廃止対象の数は As-Is（A-113）で把握する | 05_adr/ADR-009-workload-identity-token-exchange.md | R-206, R-255 |
| CL-0235 | L372 | access token は非対称署名・API 単位の aud・最小 claim、更新は rotation 付き refresh か BFF session | `[D]` | — | 脚注なし | 維持 | RFC 9700 の refresh token 保護（sender constraint または rotation）と対応付ける | 05_adr/ADR-005-token-profile.md | R-158, R-259 |
| CL-0236 | L372 | 技術方針として、access token の寿命を一律に 5〜15 分とする | `[A]` 未登録仮定 | — | 脚注なし | 要実測 | 未登録仮定。L151 と同じ一律値で、レビューは未承認とした。操作階層・token 種別ごとに BIA と実測で決め、数値契約に「値＋根拠」または「TBD＋所有者＋期限」で置く | 07_slo/numeric-contracts.md | R-087, R-189, R-196 |
| CL-0237 | L373 | Delegation は RFC 8693 token exchange/OBO とし、act・縮小 scope・downstream audience を使う | `[D]` | — | 脚注なし | 修正 | OBO と RFC 8693 を同列にしている（L215 と同じ）。act の定義を原典どおりにする | 04_architecture/workload-identity-delegation.md | R-100 |
| CL-0238 | L374 | Fine-grained authz は ReBAC を主軸に固定 RBAC と ABAC を合成し、folder 等を型付き resource にする | `[D]` | — | 脚注なし | 維持 | 方向性承認。実証（R-205）で裏付ける | 04_architecture/authorization-model.md | R-205, R-252 |
| CL-0239 | L375 | control plane は中央、decision plane は region/domain に分散し、sidecar 等で低遅延化する | `[D]` | — | 脚注なし | 修正 | レビューは「control plane 中央、decision plane 分散」だけでは不足とした。障害封じ込め、policy store 分割、quota、cell、段階 rollout、緊急 freeze、既知良好版への復帰が要る。「低遅延化」は未実測 | 04_architecture/cell-blast-radius.md、05_adr/ADR-013-cell-partitioning-fail-mode.md | R-150, R-153, R-155, R-156 |
| CL-0240 | L376 | Policy は schema-first・policy-as-code・model revision pinning・CI での試験を必須とする | `[D]` | — | 脚注なし | 維持 | レビュー評価（変更統制） | 04_architecture/authorization-model.md | R-147, R-256 |
| CL-0241 | L377 | relation tuple と resource 更新に outbox を使い、剥奪は優先配信して cache を revision で無効化する | `[D]` | — | 脚注なし | 要実測 | outbox は非同期で、原子的結合と剥奪の反映時間を実測で確認する（L204 と同じ） | 04_architecture/authorization-model.md、04_architecture/revocation-continuous-evaluation.md | R-145, R-143 |
| CL-0242 | L378 | Observability は W3C Trace Context＋OpenTelemetry とし、unsampled の認可監査を別系統にする | `[D]` | — | 脚注なし | 維持 | 監査の独立経路（R-128） | 04_architecture/audit-privacy.md | R-128 |

### 3.14 採用しない案（L380〜L392）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0243 | L380〜L392 | 採用しない案は、万能 JWT・中央 PDP のみ・サービス完全自治の 3 案である | `[D]` | — | 脚注なし | 修正 | 代替案が両極端で、マネージド IdP＋サービス内認可ライブラリ、共通契約だけの連邦型、現状維持との比較がない（seed-03 §7-3） | 00_decision/08-alternatives-comparison.md | R-088 |
| CL-0244 | L384 | 全 role・group・folder・site・tool の permission を JWT に詰め、各 service がローカル判定する案は採らない | `[D]` | — | 脚注なし | 維持 | レビュー評価（万能 JWT の否定） | 00_decision/08-alternatives-comparison.md、traceability/rejected-hypotheses.md | R-249 |
| CL-0245 | L384 | 万能 JWT は低遅延だが、肥大化・剥奪遅延・schema 結合・解釈差・不整合・漏洩時の blast radius が大きい | `[D]` | — | 脚注なし | 維持 | 却下理由として維持する | 00_decision/08-alternatives-comparison.md | R-249 |
| CL-0246 | L388 | すべての request を単一 region の中央 PDP へ同期的に問い合わせる案は採用しない | `[D]` | — | 脚注なし | 維持 | global 集約の原則不承認（R-265）と整合する | 00_decision/08-alternatives-comparison.md | R-265 |
| CL-0247 | L388 | 中央 PDP は可用性・tail latency・障害半径を一か所に集中させるため、control と decision の plane を分ける | `[D]` | — | 脚注なし | 修正 | plane を分けるだけでは不足（L375 と同じ）。cell・policy store 分割・quota 等と合わせて書く | 04_architecture/cell-blast-radius.md | R-150, R-157 |
| CL-0248 | L392 | 各サービスが claim・role 名・tenant header・認可 DB・監査形式を自由に定める完全自治では、証明と監査が困難になる | `[D]` | — | 脚注なし | 維持 | 却下理由として維持する | 00_decision/08-alternatives-comparison.md | R-212 |
| CL-0249 | L392 | domain 固有の model は許容しても、共通の contract と guardrail は必須とする | `[D]` | — | 脚注なし | 維持 | 連携契約（11_contracts）として具体化する | 11_contracts/README.md | R-212 |

### 3.15 意思決定事項（L394〜L405）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0250 | L396 | CTO/CISO の決裁対象は、製品名より先に、次の 8 原則と SLO である | `[D]` | — | 脚注なし | 修正 | 経営決裁の対象はリスク許容度・損失シナリオ・予算・要員・Gate 計画である（R-005、R-202）。8 原則は設計判断であり、決裁事項 DEC-1〜DEC-9 へ組み替える | 00_decision/03-decision-items.md | R-202, R-211 |
| CL-0251 | L398 | 認証と認可を分離し、token は主体・tenant・capability を運び、object 権限は PDP/resource service で評価する | `[D]` | — | 脚注なし | 維持 | 万能 JWT の否定と整合する | 04_architecture/reference-architecture-v2.md | R-249 |
| CL-0252 | L399 | テナント境界を tid に加え resource-derived tenant・storage partition/RLS・service 認可の多層で強制する | `[D]` | — | 脚注なし | 維持 | レビュー評価（テナント境界）。storage guardrail の検証は R-061 | 04_architecture/pep-contract.md | R-250, R-061 |
| CL-0253 | L400 | token 境界として、service 別 aud・短命化・token exchange・workload identity を必須とする | `[D]` | — | 脚注なし | 維持 | 方向性承認（R-206）。短命化の値は L151 で要実測 | 05_adr/ADR-009-workload-identity-token-exchange.md | R-206 |
| CL-0254 | L401 | 認可モデルは typed ReBAC を基本に RBAC と限定 ABAC を合成し、任意 script は例外承認制とする | `[D]` | — | 脚注なし | 維持 | 方向性承認（R-205） | 05_adr/ADR-011-policy-language-pep-pdp-api.md | R-205, R-252 |
| CL-0255 | L402 | PDP p99・cache staleness・剥奪の伝播・regional failover・fail-closed の範囲を SLO 化する | `[D]` | — | 脚注なし | 要実測 | 指標名だけで合格値が空欄（High）。値は BIA と PoC 実測で決め、空欄のまま本番承認しない（R-196） | 07_slo/numeric-contracts.md | R-077, R-192, R-196 |
| CL-0256 | L403 | 全 decision を説明可能にし、policy/model revision・actor chain・resource・reason を追跡する | `[D]` | — | 脚注なし | 修正 | 全 decision の監査は大量・高コストで、主体・資源の情報自体が機密になる（High）。記録率・欠損検知・backpressure・保持を定義する | 04_architecture/audit-privacy.md | R-125, R-127, R-257 |
| CL-0257 | L404 | schema・policy は review・静的検証・unit/negative/property test・canary・rollback を通す | `[D]` | — | 脚注なし | 維持 | レビュー評価（変更統制） | 04_architecture/authorization-model.md | R-256 |
| CL-0258 | L405 | JWT・trace baggage・監査 log に、不要な PII や secret を置かない | `[D]` | — | 脚注なし | 維持 | 最小化（R-119） | 04_architecture/audit-privacy.md | R-119 |

### 3.16 導入ロードマップ（L407〜L434）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0259 | L407〜L434 | 導入は Phase 0（脅威モデルと契約）から Phase 3（高保証化）までの 4 段階で進める | `[D]` | — | 脚注なし | 修正 | Phase 0 を経営リスク定義からやり直す（R-277）。Gate 0〜6 と退出基準、独立保証のゲート（Gate 5）がない（R-216、R-067） | 00_decision/06-gate-plan-and-plan-b.md | R-277, R-216, R-067 |
| CL-0260 | L411 | Phase 0 で tenant crossing・外部共有・support・委任・async job を含む DFD を作成する | `[D]` | — | 脚注なし | 修正 | DFD は全 entry point・trust boundary・管理面・緊急経路を対象にする（R-164）。Gate 1 に位置付ける | 03_threat-model/dfd-entry-points.md | R-164, R-058 |
| CL-0261 | L412 | Phase 0 で resource type/action の命名・token profile・audit event schema 等を確定する | `[D]` | — | 脚注なし | 維持 | 連携契約として維持する（R-212） | 11_contracts/README.md | R-212 |
| CL-0262 | L413 | Phase 0 で authorization SLO・RTO/RPO・最大 staleness・権限剥奪の反映時間を決裁する | `[D]` | — | 脚注なし | 要実測 | 決裁の前に BIA と PoC 実測が要る。数値契約の導出の鎖に載せる（R-196） | 07_slo/numeric-contracts.md、01_governance/business-impact-analysis.md | R-196, R-009 |
| CL-0263 | L417 | Phase 1 で OIDC AS・active tenant flow・BFF・service 別の aud を実装する | `[D]` | — | 脚注なし | 修正 | AS の build/buy が未決定（R-094、R-203）。認証ライフサイクルと保証レベルの定義より前に実装を置いている | 05_adr/ADR-001-build-buy-identity-provider.md、08_operations/phased-rollout.md | R-094, R-203 |
| CL-0264 | L418 | Phase 1 で共通の token validation/tenant binding SDK を配布する | `[D]` | — | 脚注なし | 維持 | 連携ハンドブックの導入手順へ移す | 10_integration/onboarding.md | R-212 |
| CL-0265 | L419 | Phase 1 で File Service に tenant→folder→file、user/group→role の ReBAC model を導入する | `[D]` | — | 脚注なし | 修正 | engine/store の選定と PoC（R-089、R-097）より前に導入を置いている。単一 SaaS の domain 前提に依存する（L5 の前提登録） | 05_adr/ADR-010-authz-engine-store-consistency.md | R-089, R-097 |
| CL-0266 | L420 | Phase 1 で shadow authorization により、既存の判定との差分を計測する | `[D]` | — | 脚注なし | 要前提登録 | 依存する前提「既存の判定」（As-Is の認可実装）が記述されていない（seed-03 §7-2）。前提台帳の A-112（既存の認可実装）に値を登録してから計画に使い、差分の扱い（allow の拡大は即時調査）と rollback 条件を定める | 08_operations/phased-rollout.md、02_requirements/as-is-inventory.md | R-177, R-178 |
| CL-0267 | L424 | Phase 2 で PDP を region/domain へ分散し、model/policy bundle を署名して配布する | `[D]` | — | 脚注なし | 修正 | 分割軸に tenant・cell がない（R-150）。bundle の署名鍵は root of trust の対象（R-049、R-056） | 04_architecture/cell-blast-radius.md、04_architecture/root-of-trust.md | R-150, R-056 |
| CL-0268 | L425 | Phase 2 で SPIFFE/workload identity・mTLS・token exchange を導入する | `[D]` | — | 脚注なし | 維持 | 方向性承認（R-206） | 08_operations/phased-rollout.md | R-206 |
| CL-0269 | L426 | Phase 2 で transactional outbox・revision-aware cache・revocation channel を実装する | `[D]` | — | 脚注なし | 維持 | レビュー評価（一貫性認識）。値は L377 で要実測 | 04_architecture/authorization-model.md | R-253 |
| CL-0270 | L427 | Phase 2 で OpenTelemetry の trace と unsampled の decision audit を統合する | `[D]` | — | 脚注なし | 修正 | 監査を trace と独立した経路にする方針（L378）と「統合」が整合しない | 04_architecture/audit-privacy.md | R-128 |
| CL-0271 | L431 | Phase 3 で schema validation・property/mutation test・formal invariant を CI に加える | `[D]` | — | 脚注なし | 維持 | 実施時期は Gate 計画で前倒しを検討する | 09_assurance/continuous-assurance-plan.md | R-256 |
| CL-0272 | L432 | Phase 3 で DPoP または mTLS-bound token を管理系・高リスク API に適用する | `[D]` | — | 脚注なし | 修正 | 適用範囲は RFC 9700 準拠表と FAPI 2.0 の採否（R-158〜R-160）で決める。本番前の Gate で決める事項を Phase 3 に置いている | 05_adr/ADR-020-fapi2-applicability.md | R-160, R-158 |
| CL-0273 | L433 | Phase 3 で JIT support access・dual approval・session recording を導入する | `[D]` | — | 脚注なし | 修正 | 特権アクセスの統制を最終段に置いている。本番移行前の PoC（R-176）と承認条件に含める | 05_adr/ADR-029-privileged-support-access.md | R-176, R-258 |
| CL-0274 | L434 | Phase 3 で cross-tenant fuzzing・PDP 障害・stale ACL・鍵 rotation の演習を定期化する | `[D]` | — | 脚注なし | 修正 | 攻撃・障害の試験を本番後の定期演習としてだけ置き、高保証 PoC（Gate 4）と独立保証（Gate 5）がない（R-169、R-063〜R-066） | 12_poc/preregistered-test-plan.md、09_assurance/independent-assurance-plan.md | R-169, R-172, R-174 |

### 3.17 CTO/CISO 想定論点（L436〜L447）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0275 | L440 | JWT だけで完結しない理由は、大手 SaaS も scope/identity と resource ACL を分離しているからである | `[D]` | — | 脚注なし | 修正 | 内部構造は非公開（L32）で、公開 API の外形挙動の例示に限る（G-015、seed-03 §7-5）。理由は自社の要件（動的共有・剥奪・階層）から導く | 00_decision/01-executive-summary.md | R-249 |
| CL-0276 | L441 | PDP 障害には plane 分離・sidecar・署名 bundle・cache・replica で備え、権限不明時は fail closed とする | `[D]` | — | 脚注なし | 要実測 | 一律 fail-closed（R-087）。「全停止しない」ことは障害注入（R-174）で実測し、操作分類ごとの挙動を決める | 04_architecture/fail-mode-matrix.md | R-087, R-174 |
| CL-0277 | L442 | 柔軟な policy の危険は typed schema・validation・domain 所有・CI test・版付き rollout で統制する | `[D]` | — | 脚注なし | 維持 | レビュー評価（変更統制） | 04_architecture/authorization-model.md | R-256 |
| CL-0278 | L443 | tenant claim の改ざんには署名検証、resource-derived tenant と storage 境界の照合、header 除去で対処する | `[D]` | — | 脚注なし | 修正 | 署名鍵・JWKS の侵害（全テナントの token 偽造）を想定していない。root of trust と侵害 runbook を対にする（R-049〜R-057） | 04_architecture/root-of-trust.md | R-049, R-057 |
| CL-0279 | L444 | object 権限は request ごとに評価し revision invalidation を使うため、剥奪が token 期限まで残らない | `[D]` | — | 脚注なし | 要実測 | 剥奪→拒否の最大時間は cache・replica 由来の staleness に依存し、操作単位で実測する | 04_architecture/revocation-continuous-evaluation.md | R-143, R-146, R-191 |
| CL-0280 | L445 | 内部 network でも Zero Trust として service identity を検証し、共有 secret より rotation と監査に優れる | `[D]` | — | 脚注なし | 維持 | 比較の部分は [D]。原則は Zero Trust の基準（R-230）と整合する | 04_architecture/workload-identity-delegation.md | R-230, R-255 |
| CL-0281 | L446 | 全サービス共通は tenant/user/group/action の契約だけとし、resource type と relation は domain 所有 | `[D]` | — | 脚注なし | 維持 | 連携契約と認可モデリングガイドへ移す | 10_integration/authz-modeling-guide.md | R-212 |
| CL-0282 | L447 | decision ID・revision・relation path・actor chain を監査し、PDP に explain 機能を持たせる | `[D]` | — | 脚注なし | 修正 | explain の可否・粒度は engine に依存し、製品評価軸（ADR-010）で確認する。relation path の記録は機密性の扱い（R-119）を要する | 05_adr/ADR-010-authz-engine-store-consistency.md | R-257, R-093 |

### 3.18 最終指針（L449〜L453）

| CL-ID | 行 | 主張（要約） | タグ | 旧引用 | 監査判定 | 処置 | 理由・注記 | 移管先 | 関連 R |
|---|---|---|---|---|---|---|---|---|---|
| CL-0283 | L451 | 認証基盤を「JWT 発行機」、認可基盤を「role claim parser」と定義してはならない | `[D]` | — | 脚注なし | 維持 | 万能 JWT の否定と整合する | 00_decision/01-executive-summary.md | R-249 |
| CL-0284 | L451 | 認証基盤は人・client・workload と active tenant を確立し、短命・宛先限定・委任追跡可能な credential を発行する | `[D]` | — | 脚注なし | 維持 | 宛先限定の方向（R-251）と整合する | 04_architecture/reference-architecture-v2.md | R-251 |
| CL-0285 | L451 | 認可基盤は domain の resource graph と context policy を共通 schema・API・監査で評価し、PEP が最終強制する | `[D]` | — | 脚注なし | 維持 | PEP/PDP 分離（R-254）と整合する | 04_architecture/reference-architecture-v2.md | R-254 |
| CL-0286 | L453 | 大手 SaaS の実例は、token scope だけでなく resource 側の権限を「必ず」重ねている | `[V]` | `[^12]` `[^22]` `[^9]` `[^10]` `[^11]` `[^8]` | 6 件とも部分支持 | 削除 | 「必ず」は全称的な断定で、確認できたのは 6 例だけ（`[^22]` は Q&A）。個別の事例は §3.1・§3.3 の主張として残す | traceability/rejected-hypotheses.md | R-197, R-198, R-201 |
| CL-0287 | L453 | したがって短命 JWT・service 別 aud・token exchange・workload ID・typed ReBAC・PEP 等の組合せは要件に適合 | `[D]` | — | 脚注なし | 要実測 | 「適合する」は未実証の断定。方向性承認（R-205、R-206）は実証による裏付けが条件。「短命 JWT」は L11（JWT は必須でない）と不整合で、ADR-005 で決める | 12_poc/preregistered-test-plan.md、00_decision/01-executive-summary.md | R-205, R-206, R-095 |

## 4. 限界と未了事項

- 主張の切り出し（1 文をいくつに分けるか）は作成者の判断であり、件数は分け方で変わる。集計は処置の傾向を示すもので、旧提案書の品質の定量評価ではない [D]。
- 脚注のない主張の処置と理由は、本書作成者（AI エージェント）がレビュー[^3]・種資料[^5][^6]・原子要求追跡表[^7]に照らして付けた設計推論である。種資料は処置理由の手掛かりとしてのみ使い、技術的主張の根拠には使っていない [D]。
- RFC 9068 との照合（L149・L150・L152・L154・L174〜L190 の主張）は、本書作成時に作成者が原典[^11]で確認したものであり、作成者以外による照合は未実施である [D]。
- 成果物計画[^8]が DL-105 に求める列のうち、版・取得日・スナップショットハッシュ・検証者は本版に含めていない。脚注付きの主張は引用監査[^4]の記録に依存し、その記録も人手の再確認が未実施である（G-018 未達）[^9] [D]。
- 本版は旧提案書の主張だけを登録した。新構成の各文書が立てる主張（決裁事項・ADR の結論を支える主張）は、各文書の起草時に CL-0288 以降として追記する（G-019）[^9] [D]。
- 処置は台帳上の割当であり、新構成の各文書で是正が済んだことを意味しない。是正の状態は traceability/traceability-matrix.md（DL-104）で追跡する[^8] [D]。
- 旧提案書が変更されると行番号は対応しなくなる。本書は §0.1 のハッシュの版に対するものである [D]。

## 参考文献

[^1]: 本リポジトリ『執筆規約（全成果物共通）』2026-10-03. CONVENTIONS.md （参照箇所: §3, §4, §5, §6, §7、確認日: 2026-10-03）
[^2]: 『マルチテナントSaaS認証・認可基盤の比較調査と設計指針』（旧提案書）SHA-256 e11dc6bbfa5fa9af…、578 行. マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md （参照箇所: L1〜L453、確認日: 2026-10-03）
[^3]: 『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: 重大な不足、技術上の危険点、文書品質の問題 L133〜L139、必須の数値契約、意思決定マトリクス L221〜L233、確認日: 2026-10-03）
[^4]: 本リポジトリ『引用監査（旧提案書側）: 参考文献 60 件』TRC-06 版 0.1. traceability/citation-audit-proposal.md （参照箇所: §1, §4.2, §5, §6, §7, §9、確認日: 2026-10-03）
[^5]: 計画エージェント（CISO・内部監査・独立保証レンズ）『種資料01: CISO／内部監査／独立保証の観点による指摘分解』2026-10-03. traceability/seed/seed-01-ciso-assurance.md （参照箇所: §2 R-001〜R-210、確認日: 2026-10-03）
[^6]: 計画エージェント（レッドチームレンズ）『種資料03: 決裁パッケージに対するレッドチーム分析』2026-10-03. traceability/seed/seed-03-redteam-decision.md （参照箇所: §6, §7、確認日: 2026-10-03）
[^7]: 本リポジトリ『原子要求追跡表（レビュー指摘の原子化）』TRC-01 版 0.1. traceability/R-requirements.md （参照箇所: R-001〜R-277、確認日: 2026-10-03）
[^8]: 本リポジトリ『成果物計画（マスターファイル計画）』TRC-03 版 0.1. traceability/deliverables.md （参照箇所: DL-105 行, §8、確認日: 2026-10-03）
[^9]: 本リポジトリ『/goal 受入基準』TRC-02. traceability/G-goal-criteria.md （参照箇所: G-017, G-018, G-019, G-024, G-035、確認日: 2026-10-03）
[^10]: 本リポジトリ『前提台帳（Assumptions Register）』GOV-01 版 0.1. 01_governance/assumptions-register.md （参照箇所: A-027, A-036, A-050, A-060, A-112, A-113、確認日: 2026-10-03）
[^11]: Bertocci, V. / IETF『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』Standards Track, 2021-10. https://www.rfc-editor.org/rfc/rfc9068.html （参照箇所: §2.1, §2.2, §2.2.1, §2.2.3、確認日: 2026-10-03）
