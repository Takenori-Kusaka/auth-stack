# 引用監査（旧提案書側）: 参考文献 60 件

> 文書ID: TRC-06（DL-29） / 版: 0.1 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-197, R-198（主なもの）、R-199（主張タグ付与の入力）、G-018
> 依存文書: CONVENTIONS.md, マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md, 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-03-redteam-decision.md

## 0. 本書の位置付けと凡例

- 本書は、旧提案書[^2]の参考文献 60 件について、6 つの監査エージェントが原典を取得して記録した判定を 1 つの台帳に統合したものである [D]。
- 本書は R-197（引用番号と主張の不一致を全件是正）と R-198（Q&A 等の二次情報を一次仕様へ差替）の対応成果物として割り当てられている[^7][^6]。本書が閉じるのは「不一致と差替先の記録」までであり、旧提案書の記述の是正は改訂文書側で行う [D]。
- レビュー側の参考文献の監査は traceability/citation-audit-review.md（TRC-06b）が扱い、本書の範囲外である[^6] [D]。
- 監査と統合はいずれも AI エージェント（Claude）が行った。人手による再確認は未実施であり、G-018 の合格条件（作成者以外の照合者 2 名による突合）は未達である[^8][^1] [D]。

### 0.1 凡例

- **`[^n]`**: 旧提案書の参考文献番号 n を指す。本書自身の脚注と区別するため、旧提案書の番号は必ずコード表記にする。
- **Ln**: 旧提案書ファイル（SHA-256 `e11dc6bbfa5fa9af559395a8be0d0f4e4cd23a86e6ee8e06285b276e645a9b06`、578 行、2026-10-03 確認）の行番号。
- **判定単位**: 参照番号と使用行の組（以下「使用箇所」）ごとの判定。1 文に複数の主張を含む 5 組は監査エージェントが主張ごとに分割したため、判定単位は使用箇所より 6 件多い。
- **判定**: 支持／部分支持／不支持／検証不能。定義は §3.3。
- **検証状態**: 「AI取得確認」= 監査エージェントが差替先を取得し、該当箇所を確認したと記録したもの（人手未確認）。「未特定」= 監査記録に差替先がないもの。
- §1〜§10 の表のセルは監査記録の転記・要約である。セル単位の主張タグは省略し、本注記で代える。件数・分類・Critical/High との対応付けは監査記録から導いた統合者の設計推論である [D]。
- 監査記録に現れる版・更新日（例: 「updated_at 2026-09-15」）は監査エージェントが取得時に記録した値であり、本書作成時に再取得していない [D]。

## 1. 要約

### 1.1 件数

- 参考文献は 60 件で、本文での使用箇所は 112 組（46 行）、判定単位は 118 件である [D]。
- 原典の取得に成功したのは 60 件中 59 件である。取得できなかったのは `[^18]`（HTTP 404）の 1 件である [D]。
- 監査エージェントが一次資料と判定した参照は 60 件中 35 件（58.3%）である。判定単位で数えると、118 件中 70 件（59.3%）が一次資料に付いた判定である [D]。
- 判定単位 118 件の内訳は、支持 43、部分支持 60、不支持 13、検証不能 2 である [D]。
- 不支持・部分支持・検証不能の 75 件を §5 の是正必須一覧に載せた。差替先の一次資料を監査エージェントが提示し取得確認した参照は 32 件である [D]。

| 項目 | 件数 |
|---|---|
| 参考文献（`[^1]`〜`[^60]`） | 60 |
| 原典の取得に成功 | 59（`[^15]`・`[^16]` は 301 転送先で取得） |
| 取得失敗 | 1（`[^18]`、HTTP 404） |
| 一次資料と判定 | 35（58.3%） |
| 使用箇所（参照 × 行） | 112 |
| 使用行（脚注が付いた本文・表の行） | 46 |
| 判定単位 | 118 |
| 監査レコード | 61（`[^41]` のみ 2 件。§4.1） |
| 差替先の提示（AI取得確認） | 32 参照 |

### 1.2 判定別件数

| 判定 | 判定単位 | うち一次資料に付いた判定 | うち二次資料等に付いた判定 | うちエグゼクティブサマリー（L5〜L13） |
|---|---|---|---|---|
| 支持 | 43 | 28 | 15 | 7 |
| 部分支持 | 60 | 37 | 23 | 13 |
| 不支持 | 13 | 5 | 8 | 1 |
| 検証不能 | 2 | 0 | 2 | 1 |
| 計 | 118 | 70 | 48 | 22 |

参照単位で見た判定の分布（各参照の全使用箇所の判定から分類）:

| 分類 | 参照件数 | 参照番号 |
|---|---|---|
| 全使用箇所が支持 | 10 | 5, 7, 24, 25, 44, 45, 46, 57, 58, 60 |
| 部分支持を含み、不支持を含まない | 38 | 1, 2, 3, 4, 6, 8, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 47, 48, 49, 50, 54, 55, 56, 59 |
| 不支持を含む | 11 | 9, 13, 23, 30, 40, 41, 42, 43, 51, 52, 53 |
| 検証不能のみ | 1 | 18 |

全使用箇所が支持の 10 件のうち、`[^7]`・`[^24]`・`[^45]`・`[^58]` の 4 件は一次資料でないと判定されており、差替が必要である（§7）[D]。

### 1.3 問題類型別件数

| 類型 | 判定基準 | 参照件数 | 参照番号 |
|---|---|---|---|
| 参照先不一致 | 使用箇所に不支持を含む（11 件）、または監査記録が文書種別・対象の取り違えを記した（7 件） | 18 | 6, 9, 13, 18, 22, 23, 27, 29, 30, 33, 36, 40, 41, 42, 43, 51, 52, 53 |
| 二次資料依存 | CONVENTIONS §3 が根拠に使わないとする種別（ブログ、Q&A、第三者転載、他社・別製品の文書を別対象の根拠に使用） | 9 | 1, 22, 34, 40, 41, 42, 43, 45, 58 |
| ロケール混在 | 英語原文がある文書を他言語ロケールの URL で引用 | 9 | 12, 15, 23, 24, 26, 31, 35, 41, 56 |
| 旧版・版ずれ | 現行より古い版・提供終了版・公開前版、または現行版と内容が異なると記録 | 7 | 18, 23, 28, 34, 36, 47, 59 |
| 検索スニペット残骸 | タイトル後の説明文、タイトル中のパンくず・節見出しの残骸（§3.4 の機械検査） | 39 | 1, 2, 4, 6, 7, 10, 12, 14, 15, 17, 18, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 45, 52, 53, 54, 55, 56, 57, 58, 59, 60 |
| 取得日（確認日）なし | 参考文献一覧に確認日の記載がない（§3.4） | 60 | 全件 |

上記 6 類型以外に記録された類型:

| 類型 | 参照件数 | 参照番号 |
|---|---|---|
| 参照箇所（節・ページ）の記載なし | 60 | 全件 |
| 同一原典の重複（§8） | 5 組 10 件 | 2/3, 9/35, 16/18, 30/36, 44/45 |
| タイトルが実際のページ名と異なる（汎用名・節見出し・旧名） | 6 | 9, 12, 15, 43, 52, 59 |
| URL の追跡・セッションパラメータ | 3 | 3, 19, 23 |
| 旧 URL（301 転送） | 2 | 15, 16 |
| リンク切れ | 1 | 18 |

### 1.4 一次資料でないと判定された 25 件の内訳

| 区分 | 件数 | 参照番号 |
|---|---|---|
| 翻訳版（ロケール版） | 7 | 12, 23, 24, 26, 31, 35, 56 |
| 他社・別製品の文書 | 5 | 40, 41（翻訳版でもある）, 42, 43, 58 |
| 文書種別・対象の取り違え（発行主体の公式文書） | 4 | 6, 13, 29, 33 |
| 旧リリース版・版違い | 3 | 28, 36, 59 |
| ブログ | 2 | 1, 34 |
| 公開版でないソース・取得不能 | 2 | 7, 18 |
| Q&A（AI 生成回答を含む） | 1 | 22 |
| 第三者による転載 | 1 | 45 |
| 計 | 25 | |

## 2. 対象と範囲

- 対象は旧提案書[^2]の `## References`（L457〜L578）にある番号付き参考文献 60 件と、本文で `[^n]` が付いた全使用箇所である [D]。
- 使用箇所は本書作成時に旧提案書から機械抽出した（正規表現 `\[\^(\d+)\]` で行ごとに抽出）。参考文献 60 件はすべて本文で 1 回以上使われており、未使用の参考文献は 0 件である [D]。
- 対象外: 脚注のない本文の主張（主張台帳 traceability/claims-ledger.md で扱う）、レビュー文書の引用（TRC-06b）[^6] [D]。

## 3. 方法

### 3.1 体制と実施日

- 監査は 2026-10-03 に、AI エージェント（Claude）6 体が参考文献 60 件を分担して行った。各エージェントは原典を取得し、使用箇所ごとに判定・根拠の抜粋・問題・差替先を記録した [D]。
- 統合担当の AI エージェントが、ワークフローから受領した監査レコード（JSON、61 件）を本書に転記し、件数を集計した。監査レコードの原本ファイルは本リポジトリに保存していない。本書の §5 と §9 が転記先である [D]。
- 分担の境界（どのエージェントがどの番号を担当したか）と、監査エージェントへの指示文は、受領記録に含まれていない [D]。

### 3.2 取得手段

監査レコードに取得手段の記録があるものを示す。記録のない参照は手段を特定できない [D]。

| 手段 | 記録のある例 |
|---|---|
| WebFetch | `[^18]`（HTTP 404） |
| curl（HTTP ステータス・HTML の取得） | `[^15]`・`[^16]`（301 転送の確認）、`[^18]`（404）、`[^21]`（HTML からアンカー `#sitesselected` を確認） |
| tavily_extract | `[^18]`（内容を返さなかった） |
| pdftotext（PDF の本文抽出） | `[^44]` |
| PDF 全文検索 | `[^2]`・`[^3]`（PIP・NIST の出現 0 件） |
| ページ内の語の出現数の確認 | `[^36]`（JWT 0 件）、`[^41]`（DPoP・nonce・XSS 0 件）、`[^42]`（at+jwt・RFC 9068・8725 等 0 件）、`[^43]`（Entra・overage 0 件） |

- 取得日を明記した監査レコードは 10 件（`[^41]` の 2 件目、`[^42]`〜`[^50]`）で、いずれも 2026-10-03 である。他の 51 件は取得日の記載がなく、本書は監査実施日 2026-10-03 を確認日として扱う（人手の再確認対象。§3.6）[D]。

### 3.3 判定基準

| 判定 | 基準 |
|---|---|
| 支持 | 使用箇所の主張を構成する要素がすべて参照先に書かれており、強度（MUST/SHOULD/MAY 等）・範囲が一致する。軽微な差は注記する |
| 部分支持 | 一部の要素だけが参照先に書かれている、または強度・範囲・用語・帰属が参照先と異なる |
| 不支持 | 主張を構成する要素が参照先に書かれていない、または参照先の記述と逆である |
| 検証不能 | 参照先を取得できず判定できない |

- 上表は統合時に本書が記述した定義である。監査レコードの判定文言は読み替えずに転記した [D]。
- seed-03 §6 の判定区分（支持／部分支持／不支持／矛盾）のうち「矛盾」は監査レコードで使われていない。原典の記述と逆向き・強度違いのものは不支持または部分支持に含まれており、§6 に別掲した[^5] [D]。
- 「一次資料か」は CONVENTIONS §3 の [N]/[V] の根拠条件[^1]に照らして監査エージェントが付与した。翻訳版・旧リリース版・文書種別違いの公式文書も「いいえ」とした例がある（§1.4）[D]。
- 「主流」「必ず」などの一般化や、推奨構成の妥当性のような設計上の結論は、個別ベンダーの文書では支持されないものとして扱われている（部分支持または不支持）[D]。

### 3.4 本書作成時の機械検査

旧提案書の `## References` 節を本書作成時に正規表現で検査した。監査エージェントの記録とは独立に再現できる [D]。

| 検査 | 基準 | 件数 | 参照番号 |
|---|---|---|---|
| 説明文付き | リンクの後に「 - 」で始まる文がある | 37 | 1, 2, 4, 6, 7, 10, 12, 14, 15, 17, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 45, 52, 53, 54, 55, 56, 57, 58, 59, 60 |
| 説明文の途中切れ | 「...」で終わる 22 件、語・文の途中で終わる 3 件（32, 38, 39） | 25 | 1, 2, 4, 6, 10, 14, 15, 17, 19, 20, 21, 22, 30, 32, 34, 36, 37, 38, 39, 40, 45, 54, 56, 57, 60 |
| タイトルにパンくず・ファイルビュー表記 | 「›」「·」「[XML]」「»」を含む | 6 | 2, 7, 14, 18, 30, 38 |
| タイトルの途中切れ | タイトルが「...」で終わる | 2 | 2, 22 |
| 他言語ロケールの URL | `hl=`、`/ja/`、`ja-jp`、`de-de`、`pt-br` を含む | 9 | 12, 15, 23, 24, 26, 31, 35, 41, 56 |
| 追跡・セッションパラメータ | `trk`、`did`、`WT.mc_id`、`authuser` を含む | 3 | 3, 19, 23 |
| 確認日・参照箇所の記載 | 日付・節・ページの記載がある | 0 | （60 件すべてに記載なし） |

- 「検索スニペット残骸」（§1.3、39 件）は、説明文付き 37 件に、タイトルだけに残骸がある 2 件（`[^18]` の「[XML] … » RFC Editor」、`[^43]` の節見出し「Profiles」）を加えたものである [D]。

### 3.5 限界

- 判定・抜粋・差替先はすべて AI エージェントによる。人手の再確認は行っていない。CONVENTIONS §4 は作成者以外による検証を求め[^1]、G-018 は作成者以外の照合者 2 名による突合を合格条件とする[^8]。本書の状態はこの条件に対して未達である [D]。
- 原典の英文抜粋と日本語の要約は監査エージェントの転記であり、逐語一致は本書作成時に照合していない [D]。
- 随時更新される文書（版表記のない live 文書、`/latest/`・`/main/` の URL）について、取得時のスナップショットやハッシュは保存されていない。seed-03 §6 が主張台帳の項目に挙げる「スナップショット（ハッシュ）」は満たしていない[^5] [D]。
- 6 体の監査エージェントの間で、判定基準の運用が揃っているかは確認していない（例: 翻訳版を一次資料でないとする扱い）[D]。
- 判定は §0.1 に示したハッシュの旧提案書に対するものである。旧提案書が変更されると行番号は対応しなくなる [D]。

### 3.6 人手の再確認が必要な項目

Critical/High との対応付けは、レビューの「重大な不足」表（L83〜L95）[^3]に照らした本書の設計推論である [D]。

| 項番 | 対象 | 該当（行・参照） | 再確認の内容 |
|---|---|---|---|
| 1 | エグゼクティブサマリー | L5〜L13 の 22 判定単位（`[^1]`〜`[^20]` の該当分） | 判定と差替先の該当箇所を原典で確認する。CONVENTIONS §3 はエグゼクティブ要約の全文にタグを求め[^1]、seed-03 §6 は人手照合を全件とする[^5] |
| 2 | Critical「管理面・鍵の root of trust が未設計」関連 | L159（`[^16]`, `[^42]`）、L156・L307（`[^40]`, `[^41]`）、L211（`[^46]`〜`[^48]`） | RFC 9068 §4、RFC 8725 §3.1・§3.12、RFC 9449、RFC 8705 の強度（MUST/SHOULD/MAY）と本文の対応 |
| 3 | Critical「PEP 完全性の証明がない」関連（委任、token 転送、テナント境界、scope と ACL の積） | L10、L12、L13、L53、L155、L215、L453 | RFC 8693 §4.1 の act の定義と MUST、OBO の対象 token、AWS の isolation／authorization の定義 |
| 4 | High「可用性・整合性の合格値が空欄」関連 | L170（`[^43]`）、L207（`[^44]`, `[^45]`） | Zanzibar §2.2 の一貫性モデル、groups overage の閾値と理由 |
| 5 | High「製品・運用モデル未決定」関連 | L124（`[^2]`, `[^3]`, `[^38]`, `[^39]`）、L250（`[^49]`〜`[^51]`）、L259（`[^52]`〜`[^54]`） | OPA の bundle 取得方式、OpenFGA の推奨の範囲、Cedar の schema 変更時の制約 |
| 6 | High「証跡・プライバシー設計が未完」関連 | L124（`[^38]`）、L273（`[^55]`, `[^56]`）、L286（`[^57]`〜`[^60]`） | decision log の項目、W3C Trace Context の規範、Graph activity logs の前提条件 |
| 7 | 原典との相違 | §6 の 19 行 | 逆向き・強度・帰属・範囲の判定 |
| 8 | 監査記録にある 2026 年の変更・日付 | `[^9]`（GitHub の token 形式、2026-04-27〜）、`[^59]`（GHES 3.16 提供終了 2026-07-01）、`[^42]`（draft-ietf-oauth-rfc8725bis-10 の状態）、各ページの更新日 | 取得時点の表示値であり、本書作成時に再取得していない |
| 9 | 逐語引用・ページ番号・節番号 | `[^3]` の p.2〜p.81、RFC 各節番号ほか | 監査エージェントの転記であり、逐語一致を照合していない |
| 10 | 検証不能・重複レコード・URL の不一致 | `[^18]`、`[^41]`、Notion『Authorization』の 2 URL（§4.3） | 原典の再取得、記録の一本化 |
| 11 | 確認日 | 取得日の記載がない 51 レコード | 確認日の確定 |

## 4. 欠番・結果欠落・未監査

### 4.1 欠番と結果欠落

- 参考文献 1〜60 の全番号に監査レコードがある。欠番は 0 件である [D]。
- §2 で機械抽出した使用箇所 112 組を監査レコードの使用箇所と突合した。判定のない組は 0 件である [D]。
- 監査レコードは 61 件で、`[^41]` だけ 2 件ある。2 件の判定は一致している（L156 部分支持、L307 不支持）。差替先の提示は 1 件目が RFC 8705、2 件目が RFC 9449 で、本書は両方を採る（cnf の mTLS 側と DPoP 側を別脚注にする）。dateModified（2026-09-10）と取得日（2026-10-03）は 2 件目にだけ記録がある [D]。

### 4.2 未監査・出典未特定として残す事項

| 事項 | 状態 | 理由・記録 |
|---|---|---|
| `[^18]` の原典内容 | 未監査（検証不能） | URL が HTTP 404。L12 の aud 部分は `[^16]` へ、L215 は RFC 8693 へ差し替える |
| `[^5]` の org_id の直接の参照先（Auth0『Work with Tokens and Organizations』） | 未取得 | 監査記録に言及があるのみ |
| NIST ABAC（PAP/PDP/PEP/PIP）の原典（L124） | 未取得 | 旧提案書は NIST の文書を引いていない。AWS の文書には PIP・NIST の言及がない（`[^2]`・`[^3]`） |
| OPA の原典（L259 の「OPA 型 ABAC」） | 未取得 | L259 の脚注は Cedar の文書だけである |
| L9 Salesforce 部分の「最終権限を網羅しない」 | 出典未特定 | `[^4]` に記載がない |
| L11 の token 形式（Notion、Slack、Dropbox の opaque 性） | 出典未特定 | `[^13]`〜`[^15]` に形式の記載がない |
| L46 Atlassian の role・restriction | 出典未特定 | `[^31]`・`[^32]` に記載がない |
| L87「token permission と App installation 権限の積」 | 出典未特定 | `[^9]`・`[^35]` に記載がなく、監査エージェントは別文書でも明示的な記述を確認できなかった |
| L95 前半（Slack の channel 参加・会話閲覧・installation 所属の評価） | 出典未特定 | `[^37]` に記載がない |
| 旧提案書の脚注のない主張 | 対象外 | 主張台帳（TRC-05）で扱う |
| レビュー文書の引用 | 対象外 | TRC-06b で扱う |

### 4.3 差替先 URL の記録の不一致

- Notion『Authorization』ガイドについて、`[^8]` の監査記録は `https://developers.notion.com/docs/authorization`、`[^13]` の監査記録は `https://developers.notion.com/guides/get-started/authorization` を取得確認先として記録している。両 URL の転送関係は確認していない [D]。

## 5. 是正必須一覧（不支持・部分支持・検証不能の全 75 件）

並びは行番号順、同じ行の中は参照番号順である。「是正方法・差替先」の検証状態は §0.1 の凡例による。

| 行 | 主張（要約） | 参照 | 実際の参照先 | 判定 | 判定理由 | 是正方法・差替先（検証状態） |
|---|---|---|---|---|---|---|
| L5 | AWS 指針は、ユーザーとテナントを結び付けた JWT を入口で検証し、PAP/PDP/PEP を分離し、RBAC と ABAC を組み合わせる構成を示す | `[^1]` | AWS Security Blog 記事（2022-01-31） | 部分支持 | JWT に主体とテナントを載せる点だけ一致。検証するのはアプリケーションで「入口」ではない。PAP/PDP/PEP の記述なし。RBAC と ABAC は併用でなく対比（ABAC が more scalable）。中央認可サービスを単一障害点として避ける記述があり、本文の「共通 PDP」と相違 | 差替: AWS Prescriptive Guidance『Multi-tenant SaaS authorization and API access control』Tenant onboarding and user tenant registration（avp-design-onboarding-registration.html、PDF p.60）（AI取得確認） |
| L5 | 同上 | `[^2]` | AWS PG 同ガイド Introduction（HTML） | 部分支持 | PAP/PDP/PEP の区別と「RBAC, ABAC, or a combination」は Targeted business outcomes にある。JWT とテナントの結び付け・入口での検証はこのページになく、同ガイドの avp-design-onboarding-registration.html と pep.html にある | 節を明記し、JWT 部分と PEP 部分は同ガイドの該当ページを別脚注で引く（AI取得確認） |
| L9 | Salesforce の tnk・scp・client_id 等は主体・テナント・クライアント・API 権限を表すが、ファイル等の最終権限を網羅しない | `[^4]` | Salesforce Help『JWT-Based Access Tokens』 | 部分支持 | tnk（header claim）・scp・client_id の定義はある。「網羅しない」の記述はない。任意 claim の roles は permission set 等によるアクセス制御に使えると記載 | Salesforce 部分の「網羅しない」は [D] として書き分けるか出典を追加（未特定） |
| L9 | Entra の tid・oid・scp・roles は同上 | `[^6]` | Microsoft Learn『Token claims reference for agent IDs』（Agent ID 専用） | 部分支持 | tid・oid・scp・roles の意味はエージェントのシナリオ表で確認できるが、エージェント専用の文脈。「網羅しない」は一般の access token claims reference の Note にある | 差替: Microsoft Learn『Access token claims reference』Payload claims 表と Note（AI取得確認） |
| L10 | API scope は上限、リソース ACL は実効権限という積集合モデルが主流。Notion も scope に加えページ共有を評価 | `[^8]` | Notion『Connection capabilities』 | 部分支持 | Notion の capability と、追加先ページ・子孫へのアクセスは支持。「主流」の一般化は単一ベンダーの文書では支持されない | Notion 部分は維持。一般化は [D] として書き分ける（記述修正） |
| L10 | GitHub も scope に加え個別リソース・インストール先を評価 | `[^9]` | GitHub Docs『Managing your personal access tokens』.md 版 | 部分支持 | token は所有者の権限と scope の範囲に限られ、resource owner・repository を選べる点は支持。GitHub App の installation はこのページの範囲外 | URL を HTML 版へ。installation 部分は別脚注（`[^30]`・`[^36]` の差替先）（AI取得確認） |
| L10 | Google Drive も scope に加え個別リソースを評価 | `[^12]` | Google Drive API『ファイル、フォルダ、ドライブを共有する』日本語版 | 部分支持 | permission resource は支持。OAuth scope との積の記述はない（scope は `[^23]` 側） | 差替: 英語原文『Share files, folders, and drives』。scope は『Choose Google Drive API scopes』を併記（AI取得確認） |
| L11 | JWT は必須でない。Slack・GitHub・Notion・Dropbox は利用者が内容を解釈しない bearer token 中心 | `[^9]` | GitHub Docs PAT（.md 版） | 不支持 | PAT のページに token 形式の記述がない。GitHub Docs『About authentication to GitHub』の token formats 節に、2026-04-27 から新規の GitHub App installation token に stateless 形式（ghs_APPID_JWT）を段階展開したとの記載がある（監査エージェントが取得） | GitHub についての記述を見直す。出典: GitHub Docs『About authentication to GitHub』#githubs-token-formats（AI取得確認） |
| L11 | 同上（Notion） | `[^13]` | Notion『Authentication』 | 部分支持 | bearer token であることは支持。形式（opaque か JWT か）の記述はない | 形式の部分は出典未特定（未特定） |
| L11 | 同上（Slack） | `[^14]` | Slack『Tokens』 | 部分支持 | 接頭辞付き文字列（xoxb- 等）で JWT でないことは読み取れる。opaque・bearer の明記はなく、token の構造（「-」区切りで最後の区画が secret）を説明している | 記述修正（出典は維持） |
| L11 | 同上（Dropbox） | `[^15]` | Dropbox『OAuth』（de-de URL から 301 転送） | 部分支持 | `Bearer <oauth2-access-token>` の記載はある。形式の記述はない | 差替: Dropbox『OAuth』docs.dropboxapi.com（AI取得確認）。形式の部分は未特定 |
| L12 | RFC 8693 は下流向けに audience と scope を絞ったトークン交換と、委任元を表す act を定義する | `[^17]` | RFC 8693（Datatracker HTML） | 部分支持 | 交換の定義は §1・§2.1 で支持（audience・scope は OPTIONAL）。act は §4.1 で委任を受けた現在の行為者と定義されており、「委任元」は原典と逆 | 記述修正（act＝現在の行為者、委任元は sub 側）。URL は RFC Editor 版（AI取得確認） |
| L12 | RFC 9068 はリソースサーバーごとの aud 検証を要求し、同じ token の転送は避けるべき | `[^18]` | 取得不能（RFC Editor prerelease の XML、HTTP 404） | 検証不能 | URL が 404。aud 検証の部分は正規版 RFC 9068 §4 で確認できるが、`[^16]` と同一原典の重複になる | `[^16]`（RFC Editor 版 RFC 9068）へ統合（AI取得確認） |
| L12 | Microsoft の OBO も中間 API 向けトークンを別の宛先へ送らないよう明示 | `[^19]` | Microsoft Learn『On-Behalf-Of flow』（追跡パラメータ付き URL） | 部分支持 | Warning は中間層に発行された token（token B）を意図した宛先以外に送らない趣旨で、本文の「中間 API 向け token（token A）」と対象が異なる。token A については assertion 欄の「別アプリ向け token は引き換えられず拒否すべき」が該当 | 記述修正（対象 token の区別）。URL は追跡パラメータを除いた正規 URL（AI取得確認） |
| L13 | テナント分離と業務認可は独立した防御層として実装すべき。AWS も両者を区別 | `[^20]` | AWS PG『Amazon Verified Permissions multi-tenant design considerations』 | 部分支持 | AWS が isolation と authorization を区別している点は支持。AWS の authorization の定義は「テナントへアクセスする権限」で、本文の「テナント内の操作可否」と異なる。「独立した防御層として実装すべき」の規範は記載なし | 規範部分は [D] として書き分け、定義の違いを本文に反映（記述修正） |
| L38 | M365/SharePoint: OAuth 2.0 access token。tid、oid、scp または roles を利用 | `[^6]` | Microsoft Learn Agent ID 専用 claim 参照 | 部分支持 | 対象は Agent ID の token で、M365/Graph の一般の access token を説明した文書ではない | 差替: Microsoft Learn『Access token claims reference』（AI取得確認） |
| L38 | SharePoint の細粒度権限はサイト・リスト・ファイル・SharePoint ACL。Sites.Selected では対象サイトへの明示割当も必要 | `[^21]` | Microsoft Learn『Microsoft Graph permissions reference』#sitesselected | 部分支持 | 対象サイトコレクションと権限を SharePoint Online 側で設定する点は支持。「サイト、リスト、ファイル、SharePoint ACL」の構成は記載なし。明示割当の直接の記述は別ページにある | 追加: Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』（AI取得確認） |
| L38 | 同上 | `[^22]` | Microsoft Q&A スレッド #5955555 | 部分支持 | コミュニティ回答と AI 生成回答が同趣旨を述べる。Microsoft の公式文書ではない | 差替: Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』（ms.date 2024-11-07）（AI取得確認） |
| L39 | Google Drive: OAuth 2.0 bearer token、サービスアカウントとドメイン全体委任 | `[^23]` | Google『Choose Google Drive API scopes』pt-br 翻訳版 | 不支持 | scope 選択ガイドで、bearer token・サービスアカウント・ドメイン全体委任の説明を含まない | このセルから削除し、`[^24]` の英語原文で引く（AI取得確認） |
| L44 | GitHub: repository selection、org policy、collaborator/team 権限。token はユーザー権限を増やせない | `[^30]` | GitHub Docs『Permissions required for fine-grained personal access tokens』 | 不支持 | permission と endpoint の対応表で、repository selection・org policy・権限を増やせない旨の記述はない | 差替: GitHub Docs『Managing your personal access tokens』英語 HTML 版（AI取得確認） |
| L46 | Atlassian Cloud: bearer token・API token、Jira/Confluence scope、permission・role・restriction、cloudId でサイトをルーティングし製品側が評価 | `[^31]` | Atlassian Support（日本語版）OAuth 2.0 認証情報の作成 | 部分支持 | Bearer、scope、URL 形式 `api.atlassian.com/ex/jira/{cloudId}/{api}` は支持。cloudId によるルーティングの説明、permission・role・restriction の評価は記載なし | 差替: 英語原文『Create OAuth 2.0 credential for service accounts』（AI取得確認）。role・restriction は未特定 |
| L46 | 同上 | `[^32]` | Atlassian Support『Manage API tokens for service accounts』 | 部分支持 | Bearer/basic 認証、URL 例、scope 例、「same permission and scope requirements as regular users」は支持。role・restriction の記載はない | role・restriction の出典を追加（未特定） |
| L47 | Notion: integration を共有した page とその子孫。未共有 page は API から不可視 | `[^8]` | Notion『Connection capabilities』 | 部分支持 | capability と、追加先ページ・子孫へのアクセスは支持。OAuth と未共有ページの不可視は記載なし（Authorization ガイドにある） | 追加: Notion『Authorization』（AI取得確認。URL は §4.3） |
| L47 | 同上 | `[^13]` | Notion『Authentication』 | 不支持 | bearer token の渡し方だけを説明しており、page 共有・子 page・不可視の記述はない | 差替: Notion『Authorization』§Connection permissions（AI取得確認） |
| L51 | Entra access token の代表的 claim は iss、aud、tid、sub/oid、azp/appid、scp または roles、iat/nbf/exp | `[^6]` | Microsoft Learn Agent ID 専用 claim 参照 | 部分支持 | サンプル token に該当 claim は含まれるが、agent が自律動作する場合のサンプル。ページ自身が一般の claim は access token claims reference を参照するよう案内している | 差替: Microsoft Learn『Access token claims reference』（AI取得確認） |
| L51 | 同上、および API 側で aud・tid・主体・actor を検証し、tid と oid の組をデータキーに使う推奨 | `[^33]` | Microsoft Learn『ID token claims reference』 | 部分支持 | ID token の claim 一覧で、scp・azp・appid がない。roles の説明が異なる。API 側の actor 検証の記述はない。tid と oid の組はサービス間でデータを共有する場合の推奨 | 差替: Microsoft Learn『Access token claims reference』と『Secure applications and APIs by validating claims』（AI取得確認） |
| L53 | OBO で API A が token A を提示し API B 専用の token B を取得し、下流は自分向け aud と委任 scope を検証。選択型権限は対象サイトへの明示割当を併用 | `[^22]` | Microsoft Q&A スレッド #5955555 | 部分支持 | スレッドは Application 権限と Managed Identity の事例で、OBO・token A/B・aud 検証を扱わない。支持するのは明示割当の部分だけで、それも非公式回答 | 差替: Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』（AI取得確認） |
| L63 | Box の JWT assertion には iss、sub、box_sub_type、aud、jti、短い exp を置く | `[^26]` | Box API Reference『POST /oauth2/token』日本語版 | 部分支持 | JWT assertion で access token を要求する点は支持。claim（iss〜exp）の説明はない。box_subject_type は client_credentials 用のパラメータで、JWT の box_sub_type とは別物 | 差替: 英語版リファレンス。claim の定義は Box『JWT without SDK』を併記（AI取得確認） |
| L65 | collaboration ACL で item・user/group・role を記録し waterfall 継承。非 collaborator は到達不可。downscoped token を発行できる | `[^11]` | Box『Collaborations』 | 部分支持 | item・user/group・role の記録と非 collaborator の到達不可は支持。waterfall は言及のみで、仕組みは support 記事にある。downscope は記載なし（`[^26]` 側） | 追加: Box Support『Understanding Item Permissions』（AI取得確認） |
| L65 | 同上 | `[^27]` | Box 製品ヘルプ『Getting Started: Box User Basics』（エンドユーザー向け） | 部分支持 | waterfall だけ支持。collaboration の構造、API token があっても到達できないこと、downscope は記載なし | 差替: Box Support『Understanding Item Permissions』。API 側は Box『User types』（AI取得確認） |
| L71 | Dropbox-API-Path-Root で team space または member root を明示し、管理者・ユーザー選択を併用 | `[^34]` | Dropbox.Tech ブログ（2023-11-10、移行告知） | 部分支持 | Path-Root ヘッダの使用は支持。Select-Admin／Select-User の言及はない。ブログであり現行仕様のリファレンスではない | 差替: Dropbox『Path Root Header Modes』。選択ヘッダは `[^10]`（AI取得確認） |
| L75 | Salesforce の access token は tnk・scp・client・iss・aud・sub・時刻等を表現。opaque token は introspection 等で扱える | `[^4]` | Salesforce Help『JWT-Based Access Tokens』 | 部分支持 | claim の定義は支持。opaque token について記事が書くのは User Info endpoint の呼出しだけで、token introspection endpoint の記述はない。「JWT-based access tokens can be used only to access REST APIs」の制約が本文にない | 記述修正（User Info endpoint、REST API 限定の制約）（出典は維持） |
| L81 | ServiceNow の ACL は generic から specific へテーブル階層を探索し、複数条件をすべて満たす必要がある | `[^28]` | ServiceNow『Explore Access Control Lists』Zurich 版 | 部分支持 | 構成要素と全条件の充足は支持。評価順はこのページで定義されていない。同社『ACL rule types』は specific を先に評価すると記述しており、本文と逆。同順位で複数ルールが一致した場合は any one、record は table ACL と field ACL の両方が必要、の規則が本文にない | 記述修正。差替: Brazil 版と『ACL rule types』（AI取得確認） |
| L81 | 同上 | `[^29]` | ServiceNow SDK『ACL API』 | 部分支持 | 構成要素は支持。SDK で ACL レコードを宣言する API 仕様で、評価順を扱わない | 差替: ServiceNow『ACL rule types』（Brazil、2026-09-10）（AI取得確認） |
| L87 | fine-grained token は token permission と、ユーザーまたは App installation の resource 権限の積になる | `[^9]` | GitHub Docs PAT（.md 版） | 部分支持 | 単一 resource owner、repository の選択、permission 区分、権限を増やせないことは支持。App installation の権限との積は記載なし | 「積」の部分は [D] として書き分けるか出典を追加（未特定） |
| L87 | 同上 | `[^35]` | GitHub Docs PAT 日本語版（機械翻訳の注記あり） | 部分支持 | 同上。「積」の記述は監査エージェントが確認できなかった | 差替: 英語版（`[^9]` と統合）（AI取得確認）。「積」は未特定 |
| L89 | 各 endpoint は必要 permission を宣言し X-Accepted-GitHub-Permissions で示す。GitHub App は JWT で installation access token を得て、通常 API は交換後の短命 token を使う | `[^30]` | GitHub Docs『Permissions required for fine-grained personal access tokens』 | 部分支持 | ヘッダの部分は支持。App の JWT と installation access token は記載なし | 追加: GitHub Docs『Generating an installation access token for a GitHub App』（有効期限 1 時間）（AI取得確認） |
| L89 | 同上 | `[^36]` | 同ページの GHES 3.21 版 | 部分支持 | ヘッダの部分は支持。JWT の出現 0 件。github.com についての主張に GHES の特定版を引いている | 差替: 『Generating an installation access token for a GitHub App』。endpoint の部分は `[^30]`（AI取得確認） |
| L95 | Slack は bot の channel 参加・会話閲覧可否・installation 所属を評価。token rotation で 12 時間失効し refresh token もローテーション | `[^37]` | Slack『Using token rotation』 | 部分支持 | rotation（12 時間、refresh token は 1 回限りで再発行）は支持。前半の評価対象は記載なし。「一度有効にすると無効にできない」制約が本文にない | 前半の出典を追加（未特定）。制約を本文に追加（記述修正） |
| L99 | Atlassian は cloudId を Cloud site の一意な tenant identifier として URL に含める。service account の OAuth access token は 60 分 | `[^31]` | Atlassian Support（日本語版）OAuth 2.0 認証情報の作成 | 部分支持 | 60 分（expires_in 3600）、URL 形式、scope は支持。cloudId の定義は記載なし（`[^32]` にある） | 差替: 英語原文（AI取得確認） |
| L99 | 同上 | `[^32]` | Atlassian Support『Manage API tokens for service accounts』 | 部分支持 | cloudId を site (instance) の一意な識別子とする記述は支持。「tenant identifier」は本文の言い換え。60 分は `[^31]` の OAuth の値で、このページの API token は既定 1 年 | 「tenant identifier」は [D] として書き分け、API token と OAuth token の有効期間を区別（記述修正） |
| L105 | Notion integration は OAuth で追加され、capability で上限を定め、page へ共有されなければ取得できない | `[^8]` | Notion『Connection capabilities』 | 部分支持 | capability が上限になることは支持。OAuth による追加と未共有ページの扱いは記載なし | 追加: Notion『Authorization』（AI取得確認） |
| L105 | 同上 | `[^13]` | Notion『Authentication』 | 不支持 | public connection の OAuth flow への言及だけで、capability・page 共有の記述はない。Authorization ガイドでは internal connection は static token、PAT は作成者の権限で動作する | 差替: Notion『Authorization』。PAT の扱いを本文に反映（AI取得確認） |
| L124 | NIST ABAC の PAP/PDP/PEP/PIP が有効で AWS もこの分離を採用。OPA は bundle を各 sidecar へ配布し、input・result・bundle revision・decision_id を decision log に記録 | `[^2]` | AWS PG Introduction | 部分支持 | AWS が採るのは PAP/PDP/PEP の 3 要素。PIP と NIST ABAC の言及はない（PDF 全文検索で 0 件）。OPA の bundle・decision log は同ガイドの devops.html・external-data-opa.html にあり、bundle revision・decision_id はガイドに記載なし | PAP/PDP/PEP 部分は維持。NIST ABAC の原典は未取得（未特定）。OPA 部分は `[^38]` と OPA『Bundles』 |
| L124 | 同上 | `[^3]` | AWS PG PDF | 部分支持 | PAP/PDP/PEP（p.2）、sidecar 配置（p.52-55）、bundle 取得（p.78, p.81）、decision log の外部送出（p.78）は支持。PIP・NIST ABAC・decision log の記録項目は記載なし | ページ番号を明記。記録項目は `[^38]`（AI取得確認） |
| L124 | 同上 | `[^38]` | OPA『Decision Logs』（latest） | 部分支持 | decision_id・input・result・bundle revision は支持。NIST ABAC・AWS・bundle の配布は範囲外 | 版を固定（確認時 v1.21.1）（記述修正） |
| L124 | 同上 | `[^39]` | OPA『Deploying OPA on Kubernetes』 | 部分支持 | sidecar 配置と bundle の取得は支持。仕組みは各 OPA が bundle server から取得するもので、「OPA が各 sidecar へ配布する」と異なる。decision log の項目と NIST ABAC は記載なし | 記述修正（各 OPA が取得）。追加: OPA『Bundles』（AI取得確認） |
| L155 | act は delegation 時必須。代理実行 actor を表し actor chain を監査。RFC 8693 に従う | `[^17]` | RFC 8693 | 部分支持 | act の意味とネストによる委任履歴は支持。RFC 8693 は act を必須にしておらず、「delegation 時必須」は本文の設計判断。ネストされた過去の actor をアクセス制御判断に使わない旨（§4.1、MUST）が本文にない | 「delegation 時必須」に [D] を付け、§4.1 の MUST を本文に追加（記述修正） |
| L156 | cnf は proof-of-possession key binding で、DPoP または mTLS の sender-constrained token に使う | `[^40]` | AuthHero『Multi-Tenant SaaS Authentication Setup』 | 不支持 | cnf・DPoP・mTLS・sender-constrained・proof-of-possession の言及がない | 差替: RFC 9449（§6.1 cnf の jkt）（AI取得確認） |
| L156 | 同上 | `[^41]` | Auth0 Docs『アクセストークンプロファイル』日本語版 | 部分支持 | Auth0 製品が cnf を mTLS Token Binding の確認 claim（x5t#S256）として載せている点は支持。DPoP の記述はない。製品の挙動であり cnf の規範定義ではない | 差替: mTLS 側は RFC 8705 §3.1、DPoP 側は RFC 9449 §6.1（別脚注）（AI取得確認） |
| L159 | resource server は typ=at+jwt、許可 algorithm、iss、aud、署名、exp を検証しなければならない | `[^16]` | RFC 9068 PDF（ietf.org 旧パス） | 部分支持 | §4 の MUST（typ、iss、aud、署名、exp）は支持。algorithm について RFC 9068 が定めるのは alg header の algorithm による検証、none の拒否、AS の鍵の使用で、許可 algorithm の固定は RFC 8725 §3.1 の内容。暗号化 token の扱い（SHOULD reject）が本文にない | 記述修正。URL は RFC Editor 版 HTML。algorithm の固定は RFC 8725 を別脚注（AI取得確認） |
| L159 | JWT BCP は algorithm confusion を避けるため許可 algorithm を固定し、用途ごとに検証ルールと鍵を分けることを求める | `[^42]` | Okta Developer『Create an authorization server』 | 不支持 | 製品の設定手順で、RFC 9068・RFC 8725 の要件に触れない（関係語 0 件）。本文の「鍵を分けることを求める」は、RFC 8725 §3.12 の MUST（相互排他的な検証ルール）と強度が異なる（鍵の分離は取り得る戦略の一つ） | 差替: RFC 8725（BCP 225）§3.1・§3.11・§3.12。後継 draft-ietf-oauth-rfc8725bis-10（2026-08-21、RFC Ed Queue）の状態と確認日を併記（AI取得確認） |
| L170 | Entra は group 数が多いと overage indicator から Graph を照会する。これは membership 変更と token 寿命の不整合を避ける根拠になる | `[^43]` | Auth0『My Organization API Reference』 | 不支持 | Entra・overage の言及がない。原典の Microsoft Learn も理由として挙げるのはヘッダサイズの上限だけで、後半の「不整合を避ける」は記載がない | 差替: Microsoft Learn『Access token claims reference』Groups overage claim 節。後半は [D]（AI取得確認） |
| L211 | SPIFFE は workload ごとの ID を X.509-SVID または JWT-SVID として発行する | `[^47]` | SPIFFE 概説仕様（`/docs/latest/`） | 部分支持 | SPIFFE ID・SVID・Workload API の定義は支持。現行仕様は SVID を X.509・JWT・WIT の 3 種とする。mTLS と短命性の記述はない | 版を固定し 3 種を反映（記述修正） |
| L211 | サービス自身の認証はユーザー JWT の再利用ではなく、SPIFFE/SPIRE 等の短命 workload identity と mTLS を使う | `[^48]` | SPIRE『Use Cases』 | 部分支持 | 短命で自動ローテーションされる X.509-SVID と mTLS は支持。「ユーザー JWT を再利用すべきでない」比較・規範は記載なし | 比較の部分は [D]（記述修正） |
| L215 | Token exchange/OBO: 受信 token を STS へ提示し、下流専用 aud・縮小 scope・元 user sub・呼出し service act を持つ短命 token へ交換 | `[^18]` | 取得不能（prerelease の XML、HTTP 404） | 検証不能 | 正規版 RFC 9068 にも STS・token exchange・act の定義はなく、RFC 8693 への言及は付随的な一文だけ。この主張の原典は RFC 8693 | 差替: RFC 8693 RFC Editor 版（§1・§2.1・§4.1）（AI取得確認） |
| L215 | 同上 | `[^19]` | Microsoft Learn『On-Behalf-Of flow』 | 部分支持 | 受信 token を下流 API 用 token へ交換する点は支持。Microsoft の OBO は jwt-bearer grant と requested_token_use=on_behalf_of による方式で、RFC 8693 の token exchange ではない。act と scope 縮小の言及はない | 記述修正（OBO と RFC 8693 を区別）。URL は正規 URL（AI取得確認） |
| L250 | ReBAC は「user U が object O に relation R を持つか」を check し、階層・group・外部共有を tuple で表す。固定 role は model、custom role と共有関係は tuple | `[^49]` | OpenFGA『Get Started with Modeling』 | 部分支持 | check の定義、parent による階層、member、共有の例は支持。例は drive→folder→document。custom role を tuple に置く分離はこのページになく『Custom Roles』ガイドにある | 追加: OpenFGA『Custom Roles』。check 形式の原典は Zanzibar 論文 §1・§2.1（AI取得確認） |
| L250 | 同上 | `[^50]` | OpenFGA『Concepts』 | 部分支持 | check・tuple・userset は支持。階層・外部共有・custom role の分離は記載なし | 共同脚注を主張ごとに分ける（記述修正） |
| L250 | 同上のうち check の定義、group membership、外部共有、共有関係を tuple へ置くこと | `[^51]` | OpenFGA『Authorization Model Design Principles』 | 不支持 | このページは check の定義、group membership の tuple 表現、外部共有に触れない（同じ行の階層と固定／custom role の分離は支持） | 共同脚注を分け、このページは階層・role 分離の部分にだけ付ける（記述修正） |
| L259 | ReBAC graph は関係と継承、Cedar/OPA 型 ABAC は IP・時刻・device posture・機密区分・契約 plan などの context 条件に使うのが自然 | `[^52]` | Cedar『Policy validation』 | 不支持 | schema による検証の説明だけで、役割分担・OPA・device posture 等は記載なし | 後半の文を [D] とし前提 ID を付ける（記述修正） |
| L259 | 同上 | `[^53]` | Cedar『Schema overview』 | 不支持 | commonContext に ip・timestamp の型宣言の例はあるが、役割分担・OPA の記述はない | 同上（記述修正） |
| L259 | 同上 | `[^54]` | Cedar『Terms & concepts』 | 部分支持 | IP・時刻を context 条件にする点は支持。ページは Cedar 自体が group による RBAC・階層・属性による ABAC を扱うと説明しており、分担は原典の記述ではない。OPA の原典が付いていない | 分担は [D]。OPA は OPA 公式文書を追加（未特定） |
| L273 | OpenTelemetry は trace context の伝搬を標準化し、外部からの偽造 context、外部への内部情報漏洩、baggage への PII/credential 格納を警告している | `[^55]` | OpenTelemetry『Baggage』 | 部分支持 | baggage の外部への漏洩と受信 baggage の真正性への注意は支持。PII・credential の名指し、偽造 trace header、伝搬の標準化、traceparent は記載なし | 警告の部分は `[^56]` の英語原文で引く（記述修正） |
| L273 | OpenTelemetry は trace context の伝搬を標準化する | `[^56]` | OpenTelemetry『コンテキスト伝搬』日本語版 | 部分支持 | 伝搬形式を定めたのは W3C Trace Context で、ページは OpenTelemetry のデフォルト propagator がそのヘッダを使うと述べる | 記述修正（標準は W3C）。差替: 英語原文『Context propagation』（AI取得確認） |
| L273 | 外部リクエストの traceparent を受け付けるが、trust boundary で形式・長さを検証し、必要に応じて新しい trace へ link する | `[^56]` | 同上 | 部分支持 | 信頼できないソースの context を無視またはサニタイズする検討は支持。形式・長さの検証と新しい trace への link は記載なし | 追加: W3C Trace Context（W3C Recommendation 2021-11-23）を [N] の根拠として別脚注（AI取得確認） |
| L286 | GitHub は X-GitHub-Request-Id を返す | `[^59]` | GitHub Docs『Getting started with the REST API』GHES 3.16 版（2026-07-01 提供終了） | 部分支持 | ヘッダは例示レスポンスと Access-Control-Expose-Headers の列挙に出るだけで、意味や付与の保証は説明されていない。対象は提供終了の GHES 版 | 差替: github.com 版（同じく例示のみ）（AI取得確認） |
| L307 | DPoP は access/refresh token を公開鍵へ結び付け、nonce で事前生成 proof の replay を軽減するが、XSS や実行中 client の侵害は解決しない | `[^40]` | AuthHero『Multi-Tenant SaaS Authentication Setup』 | 不支持 | DPoP・nonce・replay・XSS の言及がない。原典 RFC 9449 では refresh token を DPoP 鍵へ結び付けるのは public client だけ（§1, §5）。BFF は RFC 9449 に記載がない | 差替: RFC 9449（§2、§5、§8・§9、§11.2、§11.4）。BFF は [D]（AI取得確認） |
| L307 | 同上 | `[^41]` | Auth0 Docs『アクセストークンプロファイル』日本語版 | 不支持 | DPoP・nonce・replay・XSS の記述がない（出現 0 件） | 差替: RFC 9449（AI取得確認） |
| L453 | 大手 SaaS は token scope に加え resource 側の権限を必ず重ねている。したがって推奨の組合せは既存の設計原則を踏襲し適合する | `[^8]` | Notion『Connection capabilities』 | 部分支持 | Notion が capability とページ単位のアクセスを重ねていることは支持。「必ず」の一般化と設計上の結論は推論 | 結論部分を [D] とし前提 ID を付ける（記述修正） |
| L453 | 同上 | `[^9]` | GitHub Docs PAT（.md 版） | 部分支持 | GitHub が scope と所有者の権限・repository の選択を重ねていることは支持。一般化と結論は推論 | 同上（記述修正）。URL は HTML 版 |
| L453 | 同上 | `[^10]` | Dropbox『Team Files』 | 部分支持 | token の権限と namespace を重ねていることは支持。一般化と結論は推論 | 同上（記述修正） |
| L453 | 同上 | `[^11]` | Box『Collaborations』 | 部分支持 | collaboration による権限が API にも適用されることは支持。全称化と推奨構成は記載なし | 同上（記述修正） |
| L453 | 同上 | `[^12]` | Google Drive 共有ガイド日本語版 | 部分支持 | resource 側の ACL がある事実だけ支持 | 同上（記述修正）。URL は英語原文 |
| L453 | 同上 | `[^22]` | Microsoft Q&A スレッド #5955555 | 部分支持 | SharePoint で scope に加えサイト単位の割当が要る一例だけで、非公式回答 | 同上（記述修正）。Q&A は `[^22]` の差替先へ |

## 6. 原典との相違（向き・強度・帰属・範囲）

§5 のうち、本文の記述が原典と逆向き、強度（MUST/SHOULD/MAY）が異なる、帰属先が異なる、または原典の範囲限定が落ちていると記録された箇所を別掲する。L286 の 2 行は判定が支持で、範囲限定の脱落が注記されたものである [D]。

| 行 | 参照 | 本文の記述 | 原典の記述（監査記録） | 相違の種類 |
|---|---|---|---|---|
| L5 | `[^1]` | JWT を入口で検証し、共通 PDP を置く構成の根拠 | 検証するのはアプリケーション。認可を中央の認可サービスに依存させない（単一障害点）との記述 | 向き |
| L11 | `[^9]` | GitHub は利用者が内容を解釈しない bearer token が中心 | GitHub Docs: 2026-04-27 から新規の GitHub App installation token に ghs_APPID_JWT 形式を段階展開 | 最新情報との相違 |
| L12 | `[^17]` | act は委任元を表す | §4.1: act は委任を受けた現在の行為者。委任元は sub 側 | 向き |
| L12 | `[^17]` | 下流向けに audience と scope を絞る | §2.1: audience・scope は OPTIONAL。§1 の絞り込みは「might」 | 強度 |
| L13 | `[^20]` | 認可＝正しいテナント内で操作を許すかの判断 | 認可＝ユーザーがテナントへアクセスする権限を持つこと | 定義 |
| L75 | `[^4]` | opaque token は token introspection で扱う | User Info endpoint の呼出しだけを記載 | 置換 |
| L81 | `[^28]`, `[^29]` | generic から specific へテーブル階層を探索 | 『ACL rule types』: table → 親 table → *。specific を先に評価 | 向き |
| L99 | `[^32]` | cloudId は tenant identifier。service account の token は 60 分 | site (instance) の識別子。60 分は OAuth access token（`[^31]`）で、API token は既定 1 年 | 用語・対象 |
| L124 | `[^39]` | OPA が policy bundle を各 sidecar へ配布 | 各 OPA が bundle server から取得 | 向き（push と pull） |
| L155 | `[^17]` | act は delegation 時必須 | RFC 8693 は act を必須にしていない。ネストされた過去の actor はアクセス制御判断に使わない（MUST）が本文にない | 強度・欠落 |
| L159 | `[^16]` | 許可 algorithm の検証は RFC 9068 の要求 | RFC 9068 §4 は alg header による検証・none の拒否・AS 鍵の使用。allowlist は RFC 8725 §3.1 | 帰属 |
| L159 | `[^42]` | JWT BCP は用途ごとに鍵を分けることを求める | RFC 8725 §3.12 の MUST は相互排他的な検証ルール。鍵の分離は選択肢の一つ | 強度 |
| L170 | `[^43]` | overage は membership 変更と token 寿命の不整合を避ける根拠 | Microsoft Learn が挙げる理由はヘッダサイズの上限だけ | 根拠の欠落（[D] 相当） |
| L211 | `[^47]` | SVID は X.509-SVID または JWT-SVID | 現行仕様は X.509・JWT・WIT の 3 種 | 版 |
| L215 | `[^19]` | OBO と token exchange（act 付与）を同列に記述 | Microsoft の OBO は jwt-bearer grant と requested_token_use=on_behalf_of。RFC 8693 ではなく act の言及なし | 方式 |
| L273 | `[^56]` | OpenTelemetry が trace context 伝搬を標準化 | 形式は W3C Trace Context。OpenTelemetry のデフォルト propagator がそのヘッダを使う | 帰属 |
| L286 | `[^57]` | Box は box-request-id を返す | 「Most API calls」が返す。エラー本文の request_id とは別物 | 範囲 |
| L286 | `[^60]` | tenant の全 HTTP request を activity log へ出せる | Microsoft Graph が受信した要求に限る。Entra ID P1/P2、診断設定が前提。配信は最大 2 時間 | 範囲・前提 |
| L307 | `[^40]` | DPoP は access/refresh token を公開鍵へ結び付ける | RFC 9449: refresh token の結合は public client だけ（§1, §5） | 範囲 |

## 7. 支持判定だが引用の差替を要する使用箇所

判定は支持であるが、二次資料・翻訳版・旧版・URL の形式により、CONVENTIONS §3・§4[^1]の条件を満たすために差替を要すると記録された使用箇所である [D]。

| 行 | 参照 | 差替の理由 | 差替先（検証状態） |
|---|---|---|---|
| L5 | `[^3]` | URL に追跡パラメータ（`?did=…&trk=…`）、ページ番号・版の記載なし | パラメータを除いた PDF URL。p.2・p.5・p.50-55・p.60-61、文書履歴の最終改訂 2024-05-28 を併記（AI取得確認） |
| L9・L38・L51 | `[^7]` | GitHub 上の Markdown ソース（main ブランチ、コミット未固定）で公開版でない | Microsoft Learn『Secure applications and APIs by validating claims』（ms.date 2025-03-21）（AI取得確認） |
| L12 | `[^16]` | ietf.org の旧パス（301 転送） | RFC 9068 RFC Editor 版 HTML（§4・§5）（AI取得確認） |
| L13 | `[^2]` | 節の記載なし | Introduction の「Tenant isolation and multi-tenant isolation」節を明記（AI取得確認） |
| L39・L57 | `[^12]` | 日本語ロケール | 英語原文『Share files, folders, and drives』（AI取得確認） |
| L57 | `[^23]` | pt-br ロケール、`authuser=1` の混入、翻訳版が英語原文より古い | 英語原文『Choose Google Drive API scopes』（Last updated 2026-09-03）（AI取得確認） |
| L39・L59 | `[^24]` | 日本語ロケール | 英語原文『Using OAuth 2.0 for Server to Server Applications』（AI取得確認） |
| L40・L65 | `[^26]` | 日本語ロケール、英語版とビルドコミットが異なり翻訳の同期を確認できない | 英語版『Request access token（POST /oauth2/token）』（AI取得確認） |
| L41・L69 | `[^15]` | de-de ロケール、旧 URL（301 転送） | Dropbox『OAuth』docs.dropboxapi.com（AI取得確認） |
| L43 | `[^28]` | Zurich リリース固定（現行は Brazil） | Brazil 版『Explore Access Control Lists』（AI取得確認） |
| L43 | `[^29]` | SDK の宣言 API で、ACL 評価規則の一次資料でない | ServiceNow『ACL rule types』または『Explore Access Control Lists』（Brazil）（AI取得確認） |
| L44 | `[^9]` | 機械可読用の .md URL、タイトルが汎用名 | HTML 版『Managing your personal access tokens』（AI取得確認） |
| L53 | `[^19]` | 第三者の追跡パラメータ（`WT.mc_id`） | パラメータを除いた正規 URL（AI取得確認） |
| L207 | `[^44]` | Google Research のストレージ URL、書誌情報なし | USENIX ATC '19 の正規 URL（AI取得確認） |
| L207 | `[^45]` | 第三者（AuthZed 社）の注釈付き転載 | USENIX ATC '19 の正規 URL（`[^44]` と統合）（AI取得確認） |
| L286 | `[^58]` | 別製品（Dev Proxy）の文書を Microsoft Graph の推奨の根拠に使用 | Microsoft Graph『Best practices for working with Microsoft Graph』Reliability and support 節（AI取得確認） |

## 8. 同一原典の重複

### 8.1 旧提案書の中で重複している脚注

CONVENTIONS §4 は 1 つの脚注が 1 つの原典を指すことを求めている[^1]。同じ原典が複数の脚注に分かれている組を示す [D]。

| 原典 | 脚注 | 記録 | 処置案 |
|---|---|---|---|
| AWS Prescriptive Guidance『Multi-tenant SaaS authorization and API access control』 | `[^2]`（HTML Introduction）、`[^3]`（PDF）。`[^20]` は同じガイドの別ページ | 1 つの原典が 2 脚注に分かれ、どの節を根拠にしたかが記載されていない | 1 原典として扱い、節・ページを参照箇所に書く。版（文書履歴の最終改訂 2024-05-28）と確認日を付ける |
| RFC 9068 | `[^16]`、`[^18]` | `[^18]` は公開前の XML で 404 | `[^16]`（RFC Editor 版）へ統合。L215 は RFC 8693 へ |
| GitHub『Managing your personal access tokens』 | `[^9]`（英語 .md）、`[^35]`（日本語） | ロケールと形式だけが違う同じページ | 英語 HTML 版へ統合 |
| GitHub『Permissions required for fine-grained personal access tokens』 | `[^30]`（github.com）、`[^36]`（GHES 3.21） | 版だけが違う同じページ | `[^30]` へ統合。JWT 部分は installation token の文書へ |
| Zanzibar 論文（USENIX ATC '19） | `[^44]`、`[^45]` | `[^45]` は第三者の転載 | USENIX の正規版へ統合 |

### 8.2 差替後に同じ原典へ集まる脚注

差替を反映すると、次の脚注は同じ原典を指す。改訂文書で脚注を振り直す際の入力として記録する [D]。

| 差替先の原典 | 差替元の脚注 |
|---|---|
| Microsoft Learn『Access token claims reference』 | `[^6]`、`[^33]`、`[^43]` |
| Microsoft Learn『Secure applications and APIs by validating claims』 | `[^7]`、`[^33]`（推奨部分） |
| Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』 | `[^21]`（追加）、`[^22]` |
| Notion『Authorization』 | `[^8]`（追加）、`[^13]` |
| GitHub『Generating an installation access token for a GitHub App』 | `[^30]`（追加）、`[^36]` |
| RFC 8693（RFC Editor 版） | `[^17]`、`[^18]`（L215） |
| RFC 9449 | `[^40]`、`[^41]`（DPoP 側） |
| Box Support『Understanding Item Permissions』 | `[^11]`（追加）、`[^27]` |

## 9. 全 60 件の明細

「判定の内訳」は使用行ごとの判定である。「差替先」は監査記録に提示があるものを示し、提示がないものは「提示なし」とする。

| 番号 | 表示タイトル（旧提案書の表記） | 実際の内容 | 一次資料か | 判定の内訳 | 問題 | 差替先（検証状態） |
|---|---|---|---|---|---|---|
| 1 | Security practices in AWS multi-tenant SaaS environments | AWS Security Blog 記事（Keith P / Andy Powell、2022-01-31、英語）。Cognito token の sub と cognito:groups によるテナント文脈、silo/pool/bridge、IAM ABAC、PostgreSQL RLS | いいえ（ブログ） | L5 部分支持 | 二次資料（ブログ）、PAP/PDP/PEP と RBAC＋ABAC 併用の記述なし、2022-01-31 以降の更新なし、説明文の残骸（途中切れ）、確認日・参照箇所なし | AWS PG『Multi-tenant SaaS authorization and API access control』Tenant onboarding and user tenant registration、https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-design-onboarding-registration.html（PDF p.60）（AI取得確認） |
| 2 | docs.aws.amazon.com › prescriptive-guidance › latestMulti-tenant SaaS authorization and API access control ... | AWS PG 同ガイドの Introduction（HTML、英語、著者 Tabby Ward ほか）。ページに版表記なし。PDF の文書履歴は初版 2021-08-17、最終改訂 2024-05-28 | はい | L5 部分支持; L13 支持; L124 部分支持 | タイトルにパンくずと途中切れ、`[^3]` と同一原典、節・版・確認日なし、JWT・OPA の記述は別の節 | 同ページ（節: Targeted business outcomes、Tenant isolation and multi-tenant isolation）。JWT は avp-design-onboarding-registration.html、PEP は pep.html を別脚注（AI取得確認） |
| 3 | AWS Prescriptive Guidance - Multi-tenant SaaS authorization and API access control: Implementation options and best practices | 同ガイドの PDF 版（英語、本文 95 ページ、Copyright 2026）。文書履歴 2021-08-17 初版、2023-05-22 Verified Permissions 追加、2024-01-10 明確化、2024-05-28 AVP の詳細追加 | はい | L5 支持; L124 部分支持 | URL に追跡パラメータ、`[^2]` と同一原典、ページ番号・版・確認日なし、PDF は差し替わる | パラメータを除いた PDF、https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/saas-multitenant-api-access-authorization.pdf（p.2、p.5、p.50-55、p.60-61、p.78、p.81）（AI取得確認） |
| 4 | JWT-Based Access Tokens \| Salesforce Help | Salesforce Help 公式記事（en_US、All Editions）。リリース名の表記なし | はい | L9 部分支持; L42 支持; L75 部分支持 | 説明文の残骸（途中切れ）、リリース版・確認日なし、tnk が header claim であることを本文が区別していない、opaque token の検証手段を introspection と記述 | 提示なし（出典は維持し記述修正） |
| 5 | Single Identity Provider: Authorization - Auth0 Docs | Auth0 Docs のアーキテクチャシナリオ文書（英語、dateModified 2026-06-25） | はい | L9 支持 | 確認日なし、廃止済みの Rules による説明がページに残る、org_id の直接の参照先は『Work with Tokens and Organizations』 | 提示なし（『Work with Tokens and Organizations』は未取得） |
| 6 | Token claims reference for agent IDs - Microsoft Learn | Microsoft Learn の Agent ID 専用 claim 参照（ms.date 2025-11-04、updated_at 2026-08-27）。xms_idrel 等のエージェント固有 claim | いいえ（文書種別の取り違え） | L9 部分支持; L38 部分支持; L51 部分支持 | エージェント ID 専用文書を一般の access token claim の出典に使用、説明文の残骸（途中切れ）、確認日・版なし | Microsoft Learn『Access token claims reference』（ms.date 2023-05-26、updated_at 2026-07-24）、https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference（AI取得確認） |
| 7 | entra-docs/docs/identity-platform/claims-validation.md at main · MicrosoftDocs/entra-docs | GitHub の MicrosoftDocs/entra-docs、main ブランチの Markdown ソース（ms.date 03/21/2025）。公開版は learn.microsoft.com | いいえ（公開版でないソース） | L9 支持; L38 支持; L51 支持 | ブランチ上のソースでコミット未固定、タイトルがファイルビュー表記、説明文がリポジトリ説明、確認日・版なし | Microsoft Learn『Secure applications and APIs by validating claims』（ms.date 2025-03-21、updated_at 2026-06-15）、https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation（AI取得確認） |
| 8 | Connection capabilities - Notion Docs | Notion Developers の API リファレンス（英語、版表記なし）。connection と PAT の capability | はい | L10 部分支持; L47 部分支持; L105 部分支持; L453 部分支持 | 本文は旧用語 integration、版・確認日なし、OAuth と未共有ページの扱いは別ページ | 提示なし。追加先: Notion『Authorization』https://developers.notion.com/docs/authorization（AI取得確認。§4.3） |
| 9 | GitHub Docs | GitHub Docs『Managing your personal access tokens』の Markdown 版（.md、text/markdown、Free/Pro/Team） | はい | L10 部分支持; L11 不支持; L44 支持; L87 部分支持; L453 部分支持 | タイトルが汎用名、機械可読用 URL、版・確認日なし、L11 の token 形式の主張と GitHub の 2026-04-27 以降の記載が異なる | GitHub Docs『Managing your personal access tokens』（Free, Pro & Team）、https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens（AI取得確認）。L11 は『About authentication to GitHub』#githubs-token-formats（AI取得確認） |
| 10 | Team Files \| Dropbox API Documentation | Dropbox 公式 API ガイド（英語、「November 10, 2023 Update」の注記）。namespace、team folder/team space、Path-Root・Select-User・Select-Admin ヘッダ | はい | L10 支持; L41 支持; L71 支持; L453 部分支持 | 説明文が更新バナーの切り取り（途中切れ）、確認日・参照節なし、2023-11-10 以降の変更の有無が未記録 | 提示なし（参照節 API Call Roots、Dropbox-API-Path-Root、Select-User を明記） |
| 11 | Collaborations - Box Dev Docs | Box 開発者ガイド（英語、最終更新 2026-09-18）。collaboration の 3 要素、role、status、group、ドメイン制限 | はい | L10 支持; L40 支持; L65 部分支持; L453 部分支持 | 確認日・参照節なし、版管理のない live 文書、waterfall の仕組みは support 記事、L65 で downscope の主張を同じ脚注群に混在 | 提示なし（waterfall は `[^27]` の差替先） |
| 12 | 権限を更新 | Google Drive API ガイド『ファイル、フォルダ、ドライブを共有する』の日本語版（ja 2026-09-16。英語原文『Share files, folders, and drives』2026-09-14） | いいえ（翻訳版） | L10 部分支持; L39 支持; L57 支持; L453 部分支持 | タイトルが実際のページ名と異なる、日本語ロケール、説明文の残骸、確認日・参照節なし | Google『Share files, folders, and drives』英語原文、https://developers.google.com/workspace/drive/api/guides/manage-sharing（AI取得確認） |
| 13 | Authentication - Notion Docs | Notion API リファレンス『Authentication』（英語、日付なし、例は Notion-Version 2026-03-11）。bearer token の渡し方と token 種別 | いいえ（参照先の取り違え） | L11 部分支持; L47 不支持; L105 不支持 | L47・L105 の主張の原典でない、用語が旧い（integration）、PAT の追加で主張の一般性が成り立たない、確認日・API 版なし | Notion『Authorization』、https://developers.notion.com/guides/get-started/authorization（AI取得確認。§4.3） |
| 14 | docs.slack.dev · authentication · tokensTokens \| Slack Developer Docs | Slack Developer Docs『Tokens』（英語、更新日表示なし）。bot・workflow・user・configuration・app-level・service・legacy token | はい | L11 部分支持; L45 支持; L93 支持 | タイトルにパンくず、説明文の残骸（途中切れ）、確認日なし、service token 等と borrowed visibility の記述が本文にない | 提示なし |
| 15 | Dropbox OAuth Guide | de-de の URL は 301 で https://docs.dropboxapi.com/dropbox-api/docs/oauth へ転送。転送先は Dropbox 公式『OAuth』（英語、日付なし） | はい | L11 部分支持; L41 支持; L69 支持 | de-de ロケールの URL、旧 URL（301）、タイトルが現行名と異なる、説明文の残骸（途中切れ）、確認日・参照節なし | Dropbox『OAuth』、https://docs.dropboxapi.com/dropbox-api/docs/oauth（§Scopes、§Using User and Team Tokens、§Using Refresh Tokens）（AI取得確認） |
| 16 | RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens | IETF RFC 9068（Standards Track、2021-10）の PDF。ietf.org の URL は 301 で rfc-editor.org へ転送 | はい | L12 支持; L159 部分支持 | 旧パス（301）、参照節・確認日なし、`[^18]` と重複、L159 で algorithm の固定を RFC 9068 に帰属 | RFC 9068 RFC Editor 版、https://www.rfc-editor.org/rfc/rfc9068.html（§4、§5）（AI取得確認） |
| 17 | RFC 8693 - OAuth 2.0 Token Exchange | IETF RFC 8693（Datatracker HTML、Standards Track、2020-01） | はい | L12 部分支持; L155 部分支持 | act を「委任元」と記述（原典は現在の行為者）、§4.1 の MUST の欠落、参照節・確認日なし、説明文の残骸（途中切れ） | 提示なし（出典は維持し記述修正。RFC Editor 版 URL は `[^18]` の差替先と同じ） |
| 18 | [XML] rfc9068.notprepped.xml - » RFC Editor | 取得できない（WebFetch・curl とも HTTP 404、tavily_extract も内容を返さない）。RFC 9068 の公開前の未整形 XML と推定 | いいえ（公開前の作業ファイル、取得不能） | L12 検証不能; L215 検証不能 | リンク切れ、公開前版、タイトルの残骸、`[^16]` と重複、L215 の主張と RFC 9068 の内容が対応しない | RFC 8693 RFC Editor 版、https://www.rfc-editor.org/rfc/rfc8693.html（§1、§2.1、§4.1）（AI取得確認） |
| 19 | Microsoft identity platform and OAuth2.0 On-Behalf-Of flow - Microsoft identity platform | Microsoft Learn の OBO リファレンス（en-us、ms.date 2025-01-04、updated_at 2026-06-15） | はい | L12 部分支持; L53 支持; L215 部分支持 | URL に第三者の追跡パラメータ、確認日・版・節なし、説明文の残骸（途中切れ）、L215 で RFC 8693 と同一視 | 同ページの正規 URL、https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow（§Protocol diagram、Warning、First case 表）（AI取得確認） |
| 20 | Amazon Verified Permissions multi-tenant design considerations | AWS PG 同ガイドの節（HTML、英語、日付表示なし）。isolation と authorization の違い、policy store の分離と共有 | はい | L13 部分支持 | 確認日・版なし、説明文の残骸（途中切れ）、AVP の policy store 設計の文脈を一般原則の根拠に使用、`[^2]` と同一文書群で節を特定できない | 提示なし |
| 21 | Microsoft Graph permissions reference | Microsoft Learn（en-us、ms.date 2026-09-14、updated_at 2026-09-15）。#sitesselected に Sites.Selected の記載 | はい | L38 部分支持 | 説明文の残骸（途中切れ）、確認日・アンカーなし、約 846KB の継続更新文書で版の記載なし、明示割当の直接の記述は別ページ | 提示なし。追加先: Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』（AI取得確認） |
| 22 | Implementing Delegated Graph API Access for an Azure ... | Microsoft Q&A スレッド #5955555（英語、2026-07-23〜08-17）。回答はコミュニティボランティア 2 名と AI 生成回答。Application 権限の Sites.Selected で解決 | いいえ（Q&A、AI 生成回答を含む） | L38 部分支持; L53 部分支持; L453 部分支持 | Q&A・AI 生成回答、タイトルの途中切れ、説明文の残骸、Application 権限の事例で委任・OBO の本文と文脈が異なる、確認日なし | Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』（ms.date 2024-11-07、updated_at 2026-02-26）、https://learn.microsoft.com/en-us/graph/permissions-selected-overview（AI取得確認） |
| 23 | Escolher escopos da API Google Drive \| Google for Developers | 『Choose Google Drive API scopes』のポルトガル語（ブラジル）翻訳版（2026-07-14。英語原文 2026-09-03） | いいえ（翻訳版） | L39 不支持; L57 支持 | pt-br ロケール、`authuser=1` の混入、翻訳版が原文より古い、説明文の残骸、確認日・参照箇所なし、L39 は内容が対応しない | Google『Choose Google Drive API scopes』英語原文（Last updated 2026-09-03）、https://developers.google.com/workspace/drive/api/guides/api-specific-auth（AI取得確認） |
| 24 | サーバー間アプリケーションに OAuth 2.0 を使用する \| Authorization | 『Using OAuth 2.0 for Server to Server Applications』の日本語版（2026-03-23、英語原文と同日） | いいえ（翻訳版） | L39 支持; L59 支持 | 日本語ロケール、確認日・参照箇所なし、「Drive 側が評価」は推論 | Google『Using OAuth 2.0 for Server to Server Applications』英語原文、https://developers.google.com/identity/protocols/oauth2/service-account（AI取得確認） |
| 25 | User access tokens - Box Dev Docs | Box 開発者ガイド（英語、Last modified 2026-09-14）。JWT アプリで特定ユーザーの access token を作る手順とコード例 | はい | L40 支持; L63 支持 | claim の正式な定義は別ページ（『JWT without SDK』）、確認日・版なし | 提示なし。追加先: Box『JWT without SDK』https://developer.box.com/guides/authentication/jwt/without-sdk（AI取得確認） |
| 26 | アクセストークンをリクエスト - Box Dev Docs | Box API リファレンス POST /oauth2/token の日本語版（API version 2024.0、更新日なし、英語版とビルドコミットが異なる） | いいえ（翻訳版） | L40 支持; L63 部分支持; L65 支持 | 日本語ロケール、翻訳の同期を確認できない、更新日・確認日・参照箇所なし、L63 の claim の根拠として引いているが claim の説明なし | Box『Request access token（POST /oauth2/token）』英語版、https://developer.box.com/reference/post-oauth2-token（AI取得確認） |
| 27 | Getting Started: Box User Basics - Box Docs | Box 製品ヘルプのエンドユーザー向け入門（英語、日付なし）。waterfall 設計の記述あり。API・token の記述なし | はい | L40 支持; L65 部分支持 | エンドユーザー向けで API・権限モデルの根拠としては粒度が異なる、確認日なし、L65 の「API token があっても到達不可」は支持されない | Box Support『Understanding Item Permissions』、https://support.box.com/hc/en-us/articles/360043697254-Understanding-Item-Permissions（AI取得確認）。API 側は Box『User types』（AI取得確認） |
| 28 | Explore Access Control Lists | ServiceNow 製品文書の Zurich リリース版（英語、2025-07-31）。現行の Brazil 版は 2026-09-10 | いいえ（旧リリース版） | L43 支持; L81 部分支持 | 旧リリース固定の URL、評価順の定義なし（本文の記述は原典と逆）、リリース名・確認日・参照箇所なし | Brazil 版、https://www.servicenow.com/docs/r/platform-security/access-control/exploring-access-control-list.html（AI取得確認） |
| 29 | ACL API | ServiceNow SDK（Fluent）で sys_security_acl を定義する API リファレンス（Brazil、英語、2026-09-10） | いいえ（構成 API で評価規則の一次資料でない） | L43 支持; L81 部分支持 | 評価規則の一次資料でない、タイトルに製品名・リリース名なし、版なしの URL、確認日・参照箇所なし | ServiceNow『ACL rule types』（Brazil、2026-09-10）、https://www.servicenow.com/docs/r/platform-security/access-control/acl-rule-types.html（AI取得確認） |
| 30 | docs.github.com › en › restPermissions required for fine-grained personal access tokens | GitHub Docs の REST リファレンス（英語、Free/Pro/Team、日付なし）。permission ごとの endpoint 一覧と X-Accepted-GitHub-Permissions | はい | L44 不支持; L89 部分支持 | タイトルにパンくず、説明文の残骸（途中切れ）、`[^36]` と重複・版の混在、L44 と L89 後半は支持されない、確認日・参照箇所なし | 提示なし。L44 は『Managing your personal access tokens』、L89 後半は『Generating an installation access token for a GitHub App』（いずれも AI取得確認） |
| 31 | サービス アカウント用の OAuth 2.0 認証情報を作成する | Atlassian Support の日本語版（英語原文の翻訳、版・更新日なし） | いいえ（翻訳版） | L46 部分支持; L99 部分支持 | 日本語ロケール（`[^32]` は英語）、版・確認日なし、引用形式が CONVENTIONS §4 と異なる、説明文の残骸 | Atlassian Support『Create OAuth 2.0 credential for service accounts』英語原文、https://support.atlassian.com/user-management/docs/create-oauth-2-0-credential-for-service-accounts/（AI取得確認） |
| 32 | Manage API tokens for service accounts - Atlassian Support | Atlassian Support（英語）。service account の API token（既定の有効期限 1 年、1〜365 日）。更新日表示なし | はい | L46 部分支持; L99 部分支持 | 説明文の途中切れ、版・確認日なし、ロケールの混在（`[^31]`）、「tenant identifier」は Atlassian の用語でない、API token と OAuth token の有効期間を本文が区別していない | 提示なし |
| 33 | ID token claims reference - Microsoft identity platform | Microsoft Learn の ID token claim 参照（ms.date 2023-05-30、updated_at 2026-06-15）。access token ではなく ID token が対象 | いいえ（文書種別の取り違え） | L51 部分支持 | access token の主張に ID token の文書を引用、説明文の残骸、確認日なし | Microsoft Learn『Access token claims reference』（Payload claims 表）と『Secure applications and APIs by validating claims』（Validate the tenant/subject/actor）（AI取得確認） |
| 34 | API updates to better support team spaces | Dropbox.Tech（Dropbox 公式ブログ）の記事（Dropbox Platform Team、2023-11-10）。team space の構成変更と 2024-01-31 までの対応期限の告知 | いいえ（ブログ） | L71 部分支持 | ブログ、2023 年時点の移行告知で現行仕様のリファレンスでない、説明文の残骸（途中切れ）、確認日なし、`[^10]` へ統合可能 | Dropbox『Path Root Header Modes』、https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/path-root-header-modes。選択ヘッダは `[^10]`（AI取得確認） |
| 35 | 個人用アクセス トークンを管理する - GitHubドキュメント | GitHub Docs の日本語版（「機械または AI で翻訳されている場合があります」の注記あり） | いいえ（機械翻訳版） | L87 部分支持 | 日本語ロケール・機械翻訳、`[^9]` と同じページの重複、「積」の典拠なし、説明文の残骸、確認日なし | GitHub Docs『Managing your personal access tokens』英語版（`[^9]` と統合）（AI取得確認） |
| 36 | Permissions required for fine-grained personal access tokens | GitHub Docs の GHES 3.21 版（英語）。サポート中の GHES は 3.18〜3.22 で、3.21 は最新でない | いいえ（版違い） | L89 部分支持 | github.com の主張に GHES の特定版、`[^30]` と重複、JWT・installation token の記述なし、説明文の残骸（途中切れ）、確認日なし | GitHub Docs『Generating an installation access token for a GitHub App』、https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app（AI取得確認） |
| 37 | Using token rotation \| Slack Developer Docs | Slack Developer Docs（英語、版・更新日の表示なし） | はい | L95 部分支持 | 前半の主張に対応する出典なし、版・確認日なし、「一度有効にすると無効にできない」制約が本文にない、説明文の残骸（途中切れ） | 提示なし（前半の出典は未特定） |
| 38 | www.openpolicyagent.org › management-decision-logsDecision Logs - Open Policy Agent | Open Policy Agent『Decision Logs』（英語、版を固定しない latest の URL、確認時の例は v1.21.1） | はい | L124 部分支持; L286 支持 | タイトルにパンくず、説明文の途中切れ、版未固定、確認日なし | 提示なし（版固定の URL または版番号を記載） |
| 39 | Deploying OPA on Kubernetes \| Open Policy Agent | Open Policy Agent『Deploying OPA on Kubernetes』（英語、版表示なし）。OPA を Pod 内 sidecar の PDP として置く構成 | はい | L124 部分支持 | 説明文の途中切れ、bundle の原典は『Bundles』、本文の「配布」は取得（pull）と異なる、版未固定、確認日なし | 提示なし。追加先: OPA『Bundles』https://www.openpolicyagent.org/docs/management-bundles（AI取得確認） |
| 40 | AuthHero \| Open-Source Multi-tenant Authentication | AuthHero（Auth0 API 互換をうたう OSS 認証製品）の機能ガイド『Multi-Tenant SaaS Authentication Setup』（英語） | いいえ（他社 OSS 製品の文書） | L156 不支持; L307 不支持 | 主張に対応する記述がない（cnf・DPoP 等の言及なし）、他社製品文書で [N] の根拠にならない、説明文の残骸（途中切れ）、確認日なし | RFC 9449『OAuth 2.0 Demonstrating Proof of Possession (DPoP)』（Standards Track、2023-09）、https://www.rfc-editor.org/rfc/rfc9449.html（AI取得確認） |
| 41 | アクセストークンプロファイル - Auth0 Docs | Auth0 Docs（Auth0/Okta）の日本語版（dateModified 2026-09-10）。Auth0 プロファイルと RFC 9068 プロファイルの claim 比較。cnf は mTLS Token Binding の確認 claim（x5t#S256）。DPoP・nonce・XSS の出現 0 件 | いいえ（他社製品の文書、翻訳版） | L156 部分支持; L307 不支持（監査レコード 2 件で一致） | 他社製品の文書を標準の根拠に使用、日本語ロケール、DPoP の記述なし、版・確認日・参照箇所なし | mTLS 側: RFC 8705（Standards Track、2020-02）§3.1、https://www.rfc-editor.org/rfc/rfc8705.html。DPoP 側: RFC 9449 §2、§5、§6.1、§8・§9、§11.2、§11.4（いずれも AI取得確認） |
| 42 | Create an authorization server | Okta Developer の手順ガイド（英語、URL は可変の /main/）。カスタム認可サーバーの scope・claim・access policy の設定。at+jwt・alg・RFC 9068・8725 の出現 0 件 | いいえ（他社製品の文書） | L159 不支持 | 製品のガイドを RFC の要求の根拠に使用、説明文の残骸、可変 URL、本文の強度の写し違い（RFC 8725 §3.12）、後継 draft あり、確認日なし | RFC 8725『JSON Web Token Best Current Practices』（BCP 225、2020-02）、https://www.rfc-editor.org/rfc/rfc8725.html（§3.1、§3.11、§3.12）。後継 draft-ietf-oauth-rfc8725bis-10（2026-08-21、RFC Ed Queue）の状態を併記（AI取得確認） |
| 43 | Profiles | Auth0 Docs『My Organization API Reference』（英語）。B2B 顧客が自組織を管理する API。Entra・overage・Graph の出現 0 件 | いいえ（他社製品の文書、主張に対応しない） | L170 不支持 | タイトルがページ内の節見出しの残骸、主張に対応する記述がない、後半の主張はどの原典にも記載がない（[D]）、確認日なし | Microsoft Learn『Access token claims reference』Groups overage claim 節（JWT で 200 件、SAML で 150 件を超えると overage claim）（AI取得確認） |
| 44 | Zanzibar: Google’s Consistent, Global Authorization System | Pang et al. の論文 PDF（USENIX ATC '19 掲載版の写し、Google Research のストレージ） | はい | L207 支持 | 書誌情報なし、URL の恒久性が不明、参照節・確認日なし、`[^45]` と重複、本文末尾の「単なる TTL cache ではなく」は [D] | 提示なし。追加先: USENIX 正規 URL https://www.usenix.org/conference/atc19/presentation/pang（AI取得確認） |
| 45 | The Google Zanzibar Paper, annotated by AuthZed | AuthZed 社（SpiceDB のベンダー）による Zanzibar 論文の注釈付き転載 | いいえ（第三者による転載） | L207 支持 | 第三者の転載、`[^44]` と重複、説明文の残骸（途中切れ）、URL の識別子の恒久性が不明、確認日なし | Pang et al.『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC '19、https://www.usenix.org/conference/atc19/presentation/pang（§1、§2.1、§2.2）（AI取得確認） |
| 46 | JWT-SVID | SPIFFE 標準『JWT-SVID』（`/docs/latest/`、英語、Stability: Stable）。canonical は GitHub spiffe/spiffe の standards/JWT-SVID.md | はい | L211 支持 | 版未固定、発行者・Stability・確認日・参照節なし、L211 前半との対応を特定できない | 提示なし（canonical の GitHub 版の commit または日付を記録） |
| 47 | Secure Production Identity Framework for Everyone \| SPIFFE | SPIFFE 標準の概説仕様（`/docs/latest/`、英語、Stable）。SVID の種別を X.509・JWT・WIT とする | はい | L211 部分支持 | 本文の 2 種別は現行版と異なる、版未固定、確認日・Stability・参照節なし、mTLS と短命性は記載なし | 提示なし（版を固定し記述を更新） |
| 48 | SPIRE Use Cases | SPIFFE/SPIRE 公式文書（`/docs/latest/`、英語）。mTLS による workload 認証と JWT-SVID のユースケース | はい | L211 部分支持 | SPIRE の版・確認日なし、版未固定、「ユーザー JWT の再利用ではなく」は [D] | 提示なし |
| 49 | Get Started with Modeling | OpenFGA 公式文書（英語、Last modified 2026-09-28）。drive/folder/document と organization member の例 | はい | L250 部分支持 | custom role の根拠は別ページ、一般概念を単一の OSS 製品文書に依拠、版・確認日なし、タイトルに発行者名なし | 提示なし。追加先: OpenFGA『Custom Roles』https://openfga.dev/docs/modeling/custom-roles（AI取得確認） |
| 50 | Concepts | OpenFGA 公式文書（英語、Last modified 2026-09-28）。type、authorization model、relationship tuple、userset、check request | はい | L250 部分支持 | タイトルに発行者名なし、custom role・外部共有・階層の主張は支持されない、版・確認日なし | 提示なし |
| 51 | Authorization Model Design Principles | OpenFGA Best Practices（英語、Last modified 2026-09-28）。明示的な階層、組込み role は relation、custom role は tuple | はい | L250 支持（階層・role の分離）; L250 不支持（check の定義・group・外部共有） | 発行者・版・確認日なし、共同脚注で対応箇所を特定できない、「有効である」に [D] がない | 提示なし（参照節 Modeling Roles、Quick Reference を明記） |
| 52 | Cedar policy validation against schema | Cedar Policy Language Reference Guide『Policy validation』（英語、版・更新日なし） | はい | L259 支持（schema による事前検証）; L259 不支持（ReBAC と ABAC の分担） | タイトルの重複の残骸、実際のページ名と異なる、言語版・確認日なし、共同脚注で設計推論の文まで支えるように読める | 提示なし（後半の文は [D]） |
| 53 | Schema overview \| Cedar Policy Language Reference Guide | Cedar『Schema overview』（英語、本文に「Starting with Cedar version 4.3」の記述） | はい | L259 支持; L259 不支持 | 説明文の残骸、言語版・確認日なし、schema 変更で検証済み policy が無効になり得る制約が本文にない | 提示なし |
| 54 | Terms & concepts \| Cedar Policy Language Reference Guide | Cedar『Terms & concepts』（英語、版・更新日なし） | はい | L259 支持; L259 部分支持 | 説明文の途中切れ、言語版・確認日なし、OPA の主張に OPA の原典がない | 提示なし |
| 55 | Baggage | OpenTelemetry 公式文書 Concepts > Signals > Baggage（英語、Last modified 2026-02-22） | はい | L273 部分支持 | 説明文の残骸、確認日・発行者・参照節（Baggage security considerations）なし | 提示なし |
| 56 | コンテキスト伝搬 | OpenTelemetry の日本語版（2026-09-10 更新。英語原文 Context propagation は 2026-08-10 更新） | いいえ（翻訳版） | L273 部分支持（標準化）; L273 支持（警告 3 点）; L273 部分支持（traceparent の検証） | 日本語ロケール、説明文の途中切れ、確認日なし、「OpenTelemetry が標準化」は帰属が異なる（W3C）、traceparent の検証に [N] の根拠がない | OpenTelemetry『Context propagation』英語原文、https://opentelemetry.io/docs/concepts/context-propagation/（Security considerations）（AI取得確認）。追加: W3C Trace Context（Recommendation 2021-11-23）https://www.w3.org/TR/trace-context/（AI取得確認） |
| 57 | Types and formats - Box Dev Docs | Box 開発者ガイド Guides > API Calls（英語、版・更新日なし） | はい | L286 支持 | 説明文の残骸（途中切れ）、確認日・参照箇所なし、原典の限定（Most API calls）が本文にない | 提示なし |
| 58 | How to Debug Microsoft Graph API Calls - Dev Proxy | Microsoft Learn 上の Dev Proxy（API モック・プロキシツール）の文書（ms.date 2024-01-26、team=cloud_advocates）。Microsoft Graph の製品文書ではない | いいえ（別製品の文書） | L286 支持 | 別製品の文書を Graph の推奨の根拠に使用、タイトルに製品名が混在、確認日・版なし、説明文の残骸 | Microsoft Graph『Best practices for working with Microsoft Graph』、https://learn.microsoft.com/en-us/graph/best-practices-concept（Reliability and support 節、ms.date 2024-11-07）（AI取得確認） |
| 59 | Making A Request | GitHub Docs『Getting started with the REST API』の GHES 3.16 版（英語）。「discontinued on 2026-07-01」と表示 | いいえ（提供終了版） | L286 部分支持 | 提供終了版で github.com の記述でない、タイトルが節見出し、ヘッダは例示出力のみ、説明文の残骸、確認日なし | GitHub Docs『Getting started with the REST API』github.com 版、https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api（AI取得確認。同じく例示のみ） |
| 60 | Access Microsoft Graph activity logs for tenant monitoring | Microsoft Learn の Microsoft Graph 公式文書（ms.date 2025-11-25、updated_at 2026-07-04） | はい | L286 支持 | 説明文の途中切れ、確認日・版なし、前提条件と制約（Entra ID P1/P2、Azure サブスクリプション、診断設定、配信最大 2 時間、Graph 宛ての要求に限る）が本文にない | 提示なし |

## 10. 種資料・レビューの指摘との照合

レビュー[^3]と種資料[^4][^5]が挙げた引用の不一致を、本監査の結果と照合した。種資料は照合の入力としてだけ使い、根拠には使っていない [D]。

| 出所 | 指摘・是正候補 | 本監査の結果 |
|---|---|---|
| レビュー L135 | DPoP の説明に付いた番号が別製品のマルチテナント説明とアクセストークン profile を指す | `[^40]`（AuthHero）L156・L307 とも不支持。`[^41]`（Auth0）L156 部分支持、L307 不支持。差替先は RFC 9449・RFC 8705 |
| レビュー L135 | JWT BCP の説明に付いた番号が認可サーバー作成ガイドを指す | `[^42]`（Okta）L159 不支持。差替先は RFC 8725 |
| レビュー L135 | 「重要論点の一部でQ&Aページを一次仕様の代替にしている」 | `[^22]`（Microsoft Q&A、AI 生成回答を含む）L38・L53・L453 部分支持。差替先は Microsoft Graph『Overview of Selected Permissions in OneDrive and SharePoint』 |
| seed-01 R-197 是正候補 | `[^40]` `[^41]`（156・307 行）→ RFC 9449 / RFC 8705 | 監査結果と一致 |
| seed-01 R-197 是正候補 | `[^42]`（159 行）→ RFC 8725 | 監査結果と一致 |
| seed-01 R-197 是正候補 | `[^43]`（170 行）→ Microsoft Learn 該当ページ | 監査結果と一致（『Access token claims reference』Groups overage claim 節） |
| seed-01 R-197 是正候補 | `[^18]`（215 行）→ RFC 8693 | 監査結果と一致（`[^18]` は 404 で検証不能） |
| seed-01 R-197 是正候補 | `[^6]`（51 行）→ Entra 一般 claim 参照 | 監査結果と一致。51 行のほか L9・L38 も部分支持 |
| seed-01 R-198 の例 | `[^22]` | Q&A であることを確認 |
| seed-03 §7 項目 16 | `[^27]` エンドユーザー向け Box 入門 | L65 部分支持。差替先は Box Support『Understanding Item Permissions』 |
| seed-03 §7 項目 16 | ロケール混在（pt-br、de-de） | 他言語ロケールは 9 件（§1.3） |
| seed-03 §7 項目 16 | github.com の説明に GHES 特定版 | `[^36]`（GHES 3.21）と `[^59]`（GHES 3.16、提供終了） |
| seed-03 §7 項目 16 | 取得日なし | 60 件すべて |
| seed-03 §2 D4 | 参考文献タイトルに検索スニペット断片（「docs.aws.amazon.com › …」「被引用数: 249」） | 前者は `[^2]` ほか 39 件。「被引用数」は旧提案書に出現しない（0 件）。レビュー側の参考文献にあり、TRC-06b の範囲 |

- seed-01 の R-197 是正候補 5 件は、すべて監査済みで差替先が記録された。旧提案書の記述の是正は未実施である [D]。

## 参考文献

[^1]: 本リポジトリ『執筆規約（全成果物共通）』2026-10-03. CONVENTIONS.md （参照箇所: §3, §4, §5, §8、確認日: 2026-10-03）
[^2]: 『マルチテナントSaaS認証・認可基盤の比較調査と設計指針』（旧提案書）SHA-256 e11dc6bbfa5fa9af…、578 行. マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md （参照箇所: L3〜L15 エグゼクティブサマリー、L5〜L453 の脚注使用箇所、L457〜L578 References、確認日: 2026-10-03）
[^3]: 『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: L81〜L95 重大な不足、L133〜L139 文書品質の問題、確認日: 2026-10-03）
[^4]: 計画エージェント（CISO・内部監査・独立保証レンズ）『種資料01: CISO／内部監査／独立保証の観点による指摘分解』2026-10-03. traceability/seed/seed-01-ciso-assurance.md （参照箇所: §2.14 R-197〜R-202 と R-197 是正候補表、確認日: 2026-10-03）
[^5]: 計画エージェント（レッドチームレンズ）『種資料03: 決裁パッケージに対するレッドチーム分析』2026-10-03. traceability/seed/seed-03-redteam-decision.md （参照箇所: §2 D4, §6, §7 項目16、確認日: 2026-10-03）
[^6]: 本リポジトリ『成果物計画（マスターファイル計画）』TRC-03 版 0.1. traceability/deliverables.md （参照箇所: DL-29 行、§8 traceability/ 表、確認日: 2026-10-03）
[^7]: 本リポジトリ『原子要求追跡表（レビュー指摘の原子化）』TRC-01 版 0.1. traceability/R-requirements.md （参照箇所: R-197, R-198 行、確認日: 2026-10-03）
[^8]: 本リポジトリ『/goal 受入基準（G-001〜G-133）』. traceability/G-goal-criteria.md （参照箇所: G-018 行、確認日: 2026-10-03）
