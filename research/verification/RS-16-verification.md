# RS-16 独立検証記録（超大規模並行開発の統治）

> 文書ID: RS-16-VER / 版: 1.0 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-105, R-106, R-107, R-108, R-109, R-140, R-194（RS-16 の対応要求のうち、検証で修正が及んだもの）
> 依存文書: CONVENTIONS.md, research/RS-16-parallel-development-governance.md
> 対象: research/RS-16-parallel-development-governance.md（検証前 v0.1 → 検証後 v0.2）
> 検証者: AI エージェント（Claude）。RS-16 の作成者とは別のエージェントが実施した。人間による検証ではない。

## 1. 検証方法

- 全 69 脚注について、脚注の URL（または同一原典の公式な別所在）から本文を取得し、脚注が付いた各文（§2 結論サマリ、§3 の RS-16#1〜#82、表 1、§4 ステータス表、§6）を原典の該当箇所と照合した [D]。
- 取得手段: curl で HTML・テキスト・PDF・JSON を保存した [D]。HTML は Python の HTML パーサでテキスト化し、引用句を文字列検索で照合した [D]。RFC はテキスト版（rfc-editor.org/rfc/rfcNNNN.txt）を取得し、状態は RFC Editor のメタデータ（rfcNNNN.json）でも確認した [D]。日本語 PDF は pdftotext では文字化けしたため PyMuPDF で抽出した [D]。GitHub 上の原典は raw.githubusercontent.com から取得し、リリース日は `gh api` で確認した [D]。NIST SP 800-53 は公式 OSCAL カタログ（version 5.2.0）を JSON として読み、CM-3・CM-3(2)・CM-3(4)・CM-4 の statement と guidance を抽出した [D]。デジタル認証サービスの 2 ページ（[^41][^42]）は本文が動的描画のため、同サイトの page-data.json から本文 Markdown を取得した [D]。Stripe の 2 ページは言語別タブの本文がページ内データにあるため、そのデータから照合した [D]。
- 判定基準: 「支持」は主張の内容・数値・日付・規範強度が原典と一致するもの。「部分支持」は主旨は原典にあるが、版・日付・範囲・一般化・時制（予定と事実）のいずれかが原典とずれる文を含むもの。「不支持」は原典に根拠がないもの。「検証不能」は原典を取得できないもの [D]。1 つの脚注を複数の文が引く場合、1 文でもずれがあれば部分支持とした [D]。参照箇所（節番号・頁・題名）や URL だけの誤りは、内容が一致していれば「支持」とし、別途修正した [D]。
- 規範強度: `[N]` の脚注（RFC、OpenID、OpenAPI、AsyncAPI、CloudEvents、JSON Schema、SemVer、NIST、閣議決定・デジタル庁文書）は、要求文の語（MUST/SHOULD/MAY、shall/should、「しなければならない」等）まで照合した [D]。`[V]` の Google AIP・CNCF 白書など小文字の must/should を使う文書も、ノートが付した強度と原文の語を照合した [D]。

## 2. 判定サマリ

| 区分 | 件数 | 脚注 |
|---|---|---|
| 脚注総数（検証対象） | 69 | [^1]〜[^69] |
| 原典本文を取得 | 69 | 全件 |
| 支持 | 64 | 下表参照 |
| 部分支持（修正済み） | 5 | [^5], [^36], [^37], [^44], [^67] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

- 判定とは別に、参照箇所・URL・題名・日付の記載を正した脚注が 5 件ある [D]。[^32]（節番号）、[^33]（URL 移設）、[^44]（題名と更新日。部分支持の修正と同時）、[^67]（更新日。部分支持の修正と同時）、[^69]（頁と日付の根拠）である [D]。
- 検証で原典を追加した脚注が 2 件ある [D]。[^70]（CNCF Platform Engineering Maturity Model の Version info README。v0.1 で「公表日未確認」とした事項を解消）と、[^71]（DORA『Accelerate: State of DevOps 2019』本体。v0.1 が dora.dev の capability 文書だけで確認していた主張を、報告本体で確認）である [D]。v0.2 の脚注数は 71 である [D]。
- 最も重い誤りは版の誤りである [D]。[^67] の参照先ページは 2026-09-30 に更新されており、共通機能標準仕様書は第2.8版、OAuth2.0 アクセストークン発行・情報取得・無効化 API 仕様書は第1.4版・第1.4版・第1.3版（いずれも 2026-09-30）が最新であった。v0.1 は一つ前の版（第2.7版、第1.3版・第1.3版・第1.2版）を「現行」としていた [D]。

## 3. 脚注ごとの判定表

| 脚注 | 原典（取得先） | 照合した主張 | 判定 | 版・状態・日付・強度の確認 | 備考 |
|---|---|---|---|---|---|
| [^1] | OAS v3.2.1（spec.openapis.org） | #1 改訂履歴、#2 版の規則と原文、§2-5 | 支持 | Appendix A で 3.2.1=2026-09-10、3.2.0・3.1.2=2025-09-19、3.1.1・3.0.4=2024-10-24、3.1.0=2021-02-15 を確認。"SHALL designate the OAS feature set" を確認。/oas/ の一覧と latest.html でも最新は 3.2.1 | — |
| [^2] | OAS v3.1.2 | #3 superset の原文、jsonSchemaDialect | 支持 | 版 3.1.2、19 September 2025 | — |
| [^3] | json-schema.org/specification | #4 現行 2020-12・前版 2019-09、#5 末尾、§2-5 | 支持 | "The current version is 2020-12!" を確認 | — |
| [^4] | draft-bhutton-json-schema-01（json-schema.org のミラー） | #4 Internet-Draft、公開 2022-06-16、失効 2022-12-18、Intended Status Informational、$schema・$vocabulary | 支持 | 状態・日付は本文の表示どおり | — |
| [^5] | JSON Schema Blog『Moving Toward a Stable Spec』2025-01-13、G. Dennis | #5、§2-5 | 部分支持 | 2025-01-13 付の記事 | (1) 「確認日時点では独立して発行している」は、2025-01 の記事の "currently we are independent" を 2026-10 時点の事実に拡張していた。(2) 「`x-` で始まる名前を利用者の独自 property 用に予約している」は現在形だが、原文は次期版で定める予定（"the specification will define a convention"、2020-12 との非互換点として列挙）。両方を修正 |
| [^6] | AsyncAPI 3.1.0 仕様 | #6 版の構造と patch 互換（小文字 must）、minor の配慮、§2-5 | 支持 | サイトの版リンクは v3.0.0 と v3.1.0 のみ。GitHub Releases でも v3.1.0（2026-01-31）が最新 | — |
| [^7] | AsyncAPI 3.1.0 Release Notes | #7 2026-01-31、破壊的変更なし、ROS 2 binding、原文 | 支持 | 著者 Lukasz Gornicki | — |
| [^8] | AsyncAPI 3.0.0 Release Notes | #8 2023-12-05、移行ガイド、channel と operation の分離、send/receive、host・path・protocol | 支持 | 著者 Jonas Lagoni | — |
| [^9] | CloudEvents spec v1.0.2（raw） | #9 必須属性、source+id 一意（MUST）、specversion "1.0"（MUST）、major/minor のみ、#10 dataschema（SHOULD）、type の reverse-DNS（SHOULD） | 支持 | タグ ce@v1.0.2 の公開は 2022-02-06（GitHub Releases）。main は "1.0.3-wip" | type に版を含め得る点は原文 "might include"。ノートは強度語を付しておらず整合 |
| [^10] | CNCF プロジェクトページ | #11 受理 2018-05-15、Incubating 2019-10-24、Graduated 2024-01-25 | 支持 | — | — |
| [^11] | RFC 9457（txt） | #12 Obsoletes 7807、Standards Track、MAY・MUST と原文 | 支持 | 本文ヘッダは July 2023。RFC Editor のメタデータは Proposed Standard、obsoleted_by なし | メタデータの pub_date 表示は August 2023 だが、引用は RFC 本文の表示（2023-07）に従った |
| [^12] | stoplightio/spectral README（develop と v6.17.0 タグ） | #13 OpenAPI v2/v3.0/v3.1/v3.2・AsyncAPI・Arazzo v1、AsyncAPI の版は記載なし | 支持 | v6.17.0 は 2026-10-01 公開（gh api）。develop と v6.17.0 の README は同一 | — |
| [^13] | RFC 7519 | #14 §4 の原文（MUST be ignored） | 支持 | Proposed Standard、2015-05。updated_by: RFC 7797, 8725（当該文の効力に影響なし） | — |
| [^14] | RFC 6749 | #15 AS の §3.1・§3.2（MUST ignore unrecognized request parameters）、client の §4.1.2・§4.2.2・§5.1 | 支持 | Proposed Standard、2012-10。updated_by: RFC 8252, 8996, 9700。obsoleted_by なし | — |
| [^15] | RFC 7515 | #16 crit の定義、無効化、integrity protected・Protected Header のみ（MUST）、OPTIONAL | 支持 | Proposed Standard、2015-05 | — |
| [^16] | OpenID Connect Discovery 1.0 errata set 2 | #17 issuer と iss の同一（MUST、§3・§4.3）、RP の完全一致確認（MUST、§7.2） | 支持 | Final、2023-12-15 | RP の確認義務は §7.2 Impersonation Attacks |
| [^17] | RFC 8414 | #18 §3.3 の MUST・MUST NOT、§2-1 | 支持 | Proposed Standard、2018-06 | — |
| [^18] | OpenID Connect Core 1.0 errata set 2 | #19 §10.1.1（kid、jwks_uri 再取得、退役鍵の保持 SHOULD） | 支持 | Final、2023-12-15 | — |
| [^19] | RFC 7591 | #20 software statement（MUST 署名/MAC、MUST iss）、Initial Access Token の必須条件 | 支持 | Proposed Standard、2015-07 | — |
| [^20] | RFC 9110 | #21 §5.1 proxy の MUST forward、他の受信者の SHOULD ignore、新 field の導入 | 支持 | Internet Standard（STD 97）、2022-06 | 原文の MUST には「Connection に列挙された field、遮断・変換を設定した場合を除く」の例外がある。結論に影響しないが、強度の範囲を正確にするため例外を追記 |
| [^21] | OpenID Foundation 告知 | #22 2026-01-12、賛成 81・反対 1・棄権 25 | 支持 | 総投票 107（定足数 20% 超）も確認 | — |
| [^22] | Google AIP-180 | #23 3 類型（must）、#24 追加（may）、enum（should）、削除・改名・型・oneof・resource 名・既定値（must not）、意味の変更（must not）、§2-3 | 支持 | State Approved、Created 2019-07-23 | — |
| [^23] | Google AIP-181 | #25 alpha・beta・stable・major versions・isolated・emergency の各強度と 90 日の目安 | 支持 | State Approved、Created 2019-02-18 | ページには interface-based の Experimental・Preview 等の節も追加されている（ノートの主張には影響なし） |
| [^24] | Google AIP-185 | #26 major version（must、URI path の先頭）、minor/patch 非公開（must not）、channel、pre-deprecated の禁止、180 日の推奨、§2-7 | 支持 | State Approved、Created/Updated 2024-10-22 の表示 | ページ本文には 2025 年の日付例を含む interface-based versioning の節があり、表示上の Updated 日付より後に改訂された可能性がある。ノートに interface-based versioning の存在を追記 |
| [^25] | Microsoft Graph versioning and support | #27 後方互換でない/互換の変更例、#28 24 か月・例外・beta 非支援、#44 SDK 支援、§2-3・§2-7・§2-15 | 支持 | ms.date 2024-11-07、updated_at 2025-08-06 | — |
| [^26] | protobuf.dev proto3 Language Guide | #29 番号変更・oneof への移動は unsafe、追加・削除は wire-safe、番号の reserved（must）、名前の reserved（should）、未知 field の保持 | 支持 | 版表示なし | — |
| [^27] | Buf Docs Rules and categories | #30 4 カテゴリ（strictest→lenient）、既定 FILE、迷ったら FILE、WIRE_JSON のほうが安全 | 支持 | 版表示なし | 原文は WIRE_JSON を「推奨の最低水準」ともしている |
| [^28] | semver.org | #31 項目 4・7・8 の MUST・MAY、FAQ の deprecation | 支持 | 2.0.0、著者 Tom Preston-Werner（About 節） | SDO 発行でない旨はノート §4 に記載済み |
| [^29] | Stripe API Reference『Versioning』 | #32 acacia 以降の月次・年 2 回、現行 2026-09-30.endive、Stripe-Version、webhook の版、§2-15 の SDK 固定（言語別タブ） | 支持 | 現行版表示 2026-09-30.endive | 同ページの Enums 節（open enum への値追加は後方互換）を見落としていたため、#32・§2-3・§6 に追記・修正 |
| [^30] | Stripe Docs『Upgrade your integration』（英語版） | #33 SDK の版、強い型付け言語、webhook の二重配信手順、べき等（must） | 支持 | 既定取得は日本語版にリダイレクトされたため ?locale=en-US で英語原文を確認 | 導入文は "You can't target a different API version"、Java タブは "We don't recommend"。ノートの「推奨されない」は Java タブと一致。導入文の表現も併記 |
| [^31] | RFC 9745 | #34 Item・Date（MUST）、挙動不変、Sunset との順序（MUST NOT）、例の形式、hint、SHOULD 確認、過去日付時の MUST、§2-9 | 支持 | Proposed Standard、2025-03 | — |
| [^32] | RFC 8594 | #35 HTTP-date、SHOULD treat as hints、過去日時の扱い、原文 | 支持（参照箇所修正） | Informational、2019-05 | 脚注の節番号が誤り（header は §3、link relation は §6）。修正 |
| [^33] | Kubernetes Deprecation Policy | #36 Rule #1〜#4b と原文、#37 Rule #5a・#5b・#7・#9、#38 v1.19 以降の Warning・注記・metric、表 1、§2-7・§2-9 | 支持（URL 修正） | Last modified 2026-08-21（commit "move deprecation policy"）。脚注 URL は 301 で /docs/reference/deprecation-policy/ に転送 | 新 URL に差し替え、旧 URL を併記 |
| [^34] | Kubernetes Releases | #39 直近 3 minor（1.37/1.36/1.35）の保守、1.19 以降約 1 年 | 支持 | — | — |
| [^35] | Kubernetes Version Skew Policy | #39 kubelet は apiserver より新しくてはならず 3 minor まで古くてよい、HA apiserver は 1 minor 以内、§2-15 | 支持 | Last modified 2026-04-14 | kubelet < 1.25 は 2 minor までという但し書きがある（本基盤の結論には影響なし） |
| [^36] | Microsoft Learn『Migrate from Azure AD Graph to Microsoft Graph』 | #40、§2-8 | 部分支持 | ms.date 2025-09-29、updated_at 2025-09-13 | (1) 原文は "August 31, 2025: ... Azure AD Graph will be fully retired."（未来形）で、2025-08-31 に退役したという事実の記述ではない。ノートは「完全退役は 2025-08-31 になった」「完全に退役した」と事実として書いていた。(2) 2024-08-31 の段階は「新規アプリの利用禁止」ではなく「明示の opt-in なしでは利用不可」。両方を修正し、停止の事実は未確認として §6 に記載 |
| [^37] | Google Cloud Terms of Service | #41 §1.4(e)、表 1、§2-7 | 部分支持 | Last modified 2026-09-02 | 原文の 12 か月通知は、サービス停止については「同等のサービス・機能で置き換える場合を除く」との限定があり、GWS Services は Core Services のみに適用される。ノートと表 1 は限定を落とし、約束の範囲を広く書いていた。修正 |
| [^38] | Microsoft Modern Lifecycle Policy | #42 後継なしの 12 か月、無償・プレビュー除外、最大 3 年 | 支持 | ms.date 2020-01-10、updated_at 2024-06-18 | 同ページには「対応が必要な変更は最低 30 日前に通知」の記述もある（ノートの主張外） |
| [^39] | AWS SDKs and Tools maintenance policy | #43 5 段階、GA 24 か月、6 か月前公表、maintenance 12 か月、依存先 6 か月、告知手段 | 支持 | ページに日付表示なし | — |
| [^40] | GビズID サービス連携 利用規約（PDF） | #45 第5条3項（審査期間の保証なし）、第14条1項（90 日前）・2項、改定履歴 | 支持 | 改定履歴に version1.3 2026-07-09 制定を確認（PDF の作成日は 2026-06-11） | — |
| [^41] | デジタル認証サービス 民間事業者向け情報（page-data.json） | #80 API 提供、OpenID Connect / OAuth 2.0 で組み込み可能 | 支持 | — | 本文は動的描画。同サイトのページデータで照合 |
| [^42] | 同 民間事業者向けよくある質問（page-data.json） | #80 5 段階の手続、§2-12 | 支持 | — | 所要期間の記載がないことも確認 |
| [^43] | Pact Docs Introduction | #46 定義、code-first、consumer-driven、原文 | 支持 | — | — |
| [^44] | Pact Docs『When to use Pact』 | #47、§2-6 | 部分支持（題名修正） | 最終更新 2022-04-13（Alex Haynes） | 「向く条件」5 つのうち 2 つ（consumer の要求が provider を駆動する、provider が consumer チームごとに個別の関係を管理できる程度に consumer が少ない）と、「向かない条件」のうち「API が完全に安定した OAuth provider」など 4 つを省いていた。省かれた条件は 300 consumer 規模の認証基盤に直接かかわるため、#47 と §2-6 に追記。結論（二層の試験）は追記後も維持できる。脚注の題名をページの実題名に修正 |
| [^45] | Pact Docs Provider states | #48 Given 相当、データ源への直接注入 | 支持 | — | — |
| [^46] | Pact Docs Can I Deploy | #49 Matrix、全連携先版との成功検証、record-deployment | 支持 | — | — |
| [^47] | Pact Docs Pending pacts | #50 最初の成功検証まで pending、検証失敗にしない、展開の阻害 | 支持 | — | pending は provider の main リリースパイプラインにのみ適用される旨の注記もある |
| [^48] | Pact Docs Consumer Version Selectors | #51 mainBranch と deployedOrReleased | 支持 | — | 原文はこの 2 つを "Recommended" と明記 |
| [^49] | Pact Docs Webhooks | #52 main ブランチと各環境の版の検証起動、record-deployment/record-release の前提 | 支持 | — | 前提条件には main ブランチの設定、branch 付き検証結果の公開等もある |
| [^50] | SmartBear PactFlow On-Premises 文書 | #53 static contract testing、provider 契約 2 要素、不適合の条件 | 支持 | 版表示なし | — |
| [^51] | CNCF プロジェクトページ（Microcks） | #54 受理 2023-06-22、Incubating 2026-05-03 | 支持 | — | §4 の Microcks 1.15.0（2026-08-05）は gh api で確認 |
| [^52] | Microcks Main Concepts | #55 artifact の種類、mocks、tests（contract/conformance） | 支持 | — | — |
| [^53] | OpenID Foundation RP Testing | #56 Basic/Implicit/Hybrid、form_post、session・logout、ログイン手段 | 支持 | — | ログインに使える OP は「WebFinger 対応の」任意の OIDC OP。限定を追記 |
| [^54] | NIST OSCAL カタログ（SP 800-53 Rev 5.2.0） | #57 CM-3 a〜g、#58 discussion、CM-3(2)、CM-3(4)、CM-4、§2-10 | 支持 | カタログ metadata の version 5.2.0（last-modified 2026-05-11）。統制文は命令形で、組織定義パラメータ付き | — |
| [^55] | NIST CSRC SP 800-53 Rev.5 | #57 Release 5.2.0 = 2025-08-27 | 支持 | Planning Note (08/27/2025) を確認。これより新しい Release の告知は同ページになし | — |
| [^56] | dora.dev『Streamlining change approval』 | #59・#60、§2-10 | 支持 | 版表示なし | 主張は DORA 自身の要約文書に一致。報告本体を [^71] として追加し、測定条件を補った |
| [^57] | dora.dev『DORA's software delivery performance metrics』 | #61 5 指標の定義 | 支持 | Last updated 2026-01-05、著者 Nathen Harvey | — |
| [^58] | CNCF Platforms White Paper（latest） | #62 定義と 7 属性、identity and secret management、#63 各属性の must/should、#64 指標、#65 原文と少数チームからの開始、§2-11・§2-12 | 支持 | 版表示なし（latest） | — |
| [^59] | tag-app-delivery platforms-whitepaper README | #62 v1 は 2023-03 完成、latest で継続 | 支持 | — | — |
| [^60] | CNCF Platform Engineering Maturity Model | #66 5 側面×4 段階、Adoption・Interfaces の各段階 | 支持 | PDF ファイル名は v1.0 | v0.1 が「公表日未確認」とした点は、ページの Version info が指す README に "v1 was completed in October 2023" とあった。[^70] を追加し §4・§6 を更新 |
| [^61] | Team Topologies Key Concepts | #67 4 類型、3 相互作用（コストの記述を含む）、認知負荷、TVP | 支持 | — | — |
| [^62] | 地方公共団体情報システム標準化基本方針（PDF） | #68〜#73（2.2 の目標・経過措置・(4)、4.1.2、4.3.1、5.1.2、5.2.2）、§2-1・§2-7・§2-13 | 支持 | 政策ページで「2024年12月24日閣議決定」を確認（PDF 表紙は令和6年12月）。同ページ上で後続の改定はない | 4.3.2 は版管理を「デジタル庁が別途定める」とするのみ（ノートはこれを根拠にしていない） |
| [^63] | 標準仕様書の改定・運用について（基本的な考え方）（PDF） | #73・#74 | 支持 | 表紙 2025/1/29。一覧ページでも「2025年1月29日作成」 | — |
| [^64] | データ要件・連携要件の運用について（PDF） | #75 正誤対応の廃止（※2）、1 か月以内、全国意見照会最大 3 週間 | 支持 | 一覧ページで「2024年4月8日改定」を確認 | — |
| [^65] | 令和8年9月末改定スケジュール（予定）（PDF） | #75 9 月末改定予定、業務標準仕様書の 8 月末改定に続く | 支持 | 表紙 2026/8 | 予定の文書であり、改定が実施されたかは本検証の対象外 |
| [^66] | 標準仕様書と適合確認に関する考え方（PDF） | #76 機能 ID 単位の適合基準日、改定日から 1 年後以降、全体バージョン管理とメジャー/マイナーの条件、表 1 | 支持 | 一覧ページで「2023年10月27日作成」 | 該当は p.11〜13 と p.16〜17（脚注どおり） |
| [^67] | デジタル庁『共通機能の標準仕様』 | #77、§4 | 部分支持（版・日付修正） | ページの最終更新 2026-09-30 | 2026-09-30 の更新で、共通機能標準仕様書 第2.8版、OAuth2.0 アクセストークン発行 API 第1.4版、情報取得 API 第1.4版、無効化 API 第1.3版（いずれも 2026-09-30）が公開されていた。v0.1 は一つ前の版を「現行」としていた。#77・§4・脚注を修正し、OAuth 系 API 仕様書の改定履歴を追記。廃止 7 文書（2022-08-31 公開、2023-03-30 廃止）は一致 |
| [^68] | 特定移行支援システム数（令和8年3月末時点）（PDF） | #78 全数値、要因、約 90% 見込み、PMO ツール、§2-13 | 支持 | 一覧ページで 2026-06-30 の更新を確認 | — |
| [^69] | 令和6年度 共同利用方式・マルチベンダー検証事業 報告書（本紙）（PDF） | #79 20 社、オ・カ・キの結果と課題、測定条件、§2-14 | 支持（参照頁修正） | 表紙は「令和８年３月」。2026-03-27 はファイル名による | 脚注の頁を「p.1・p.6」から「p.2・p.7（PDF の 8 枚目）」に修正 |

## 4. ノートへの修正内容

| # | 箇所 | 修正前（要旨） | 修正後（要旨） | 理由（脚注） |
|---|---|---|---|---|
| 1 | #77・§4（2 行）・[^67] | 共通機能標準仕様書 第2.7版（2026-02-27）、OAuth 系 API 仕様書 第1.3版・第1.3版・第1.2版を現行とする | 第2.8版、第1.4版・第1.4版・第1.3版（いずれも 2026-09-30）。OAuth 系の改定履歴（第1.0版 2023-03-30 以降）を追記 | 参照ページが 2026-09-30 に更新済み（[^67]） |
| 2 | #40・§2-8 | 「2025-08-31 に完全に退役した」「新規アプリの利用禁止（2024-08-31）」 | 2025-08-31 は完全退役の予定日（"will be fully retired"）で、停止の事実は未確認。2024-08-31 は「明示の opt-in なしでは利用不可」 | 原文の時制と表現（[^36]） |
| 3 | #41・表 1・§2-7 | サービス停止と後方互換でない API 変更の 12 か月通知（限定なし） | サービス停止は同等の代替がない場合に限ること、GWS は Core Services のみに適用されることを追記 | 原文 §1.4(e) の限定（[^37]） |
| 4 | #47・§2-6・[^44] | 「向く条件」3 つ、「向かない条件」6 つ。題名『What is Pact good for?』 | 向く条件 5 つ（consumer 数が個別の関係を管理できる程度に少ない等）、向かない条件 10（「API が完全に安定した OAuth provider」等）を原文どおりに列挙。§2-6 に、300 consumer 規模と AS の標準 endpoint がこれらの条件に当たりにくいことを追記。題名を『When to use Pact』（最終更新 2022-04-13）に修正 | 原文の条件の省略（[^44]）。二層の試験という結論は維持 |
| 5 | #5 | 「確認日時点では独立して発行している」「`x-` で始まる名前を予約している」 | 2025-01-13 の記事時点で独立と述べていること、`x-` の規約は次期版で定める予定であることに修正 | 原文の日付と時制（[^5]） |
| 6 | §2-10・#59・§6・[^71] 新設 | DORA の主張は capability 文書のみで確認。標本・効果量は未確認 | 2019 年報告本体で、回答者約 1,000 人・誤差 3%、低パフォーマーである可能性 2.6 倍、変更失敗率との関連の仮説は不支持、CAB の新しい役割を確認し、測定条件を記載 | 二次的な要約から原典への差し替え（[^71]） |
| 7 | #32・§2-3・§6 | Stripe の後方互換の変更の一覧は見当たらない（未確認） | Versioning 文書の Enums 節（open enum への値追加は後方互換）を追記し、§2-3 の比較に加えた。網羅的な一覧が見当たらない点は未確認のまま | 原典の見落とし（[^29]） |
| 8 | #33・[^30] | 強い型付け言語では別の API 版の指定は「推奨されない」 | 導入文は「指定できない」、Java タブは「推奨しない」と両方を記載。参照箇所を英語版の節名に修正 | 原文の 2 つの表現（[^30]） |
| 9 | #21 | proxy は認識できない header を転送しなければならない（MUST） | MUST の例外（Connection に列挙、遮断・変換の設定）を追記 | 規範要求の範囲（[^20]） |
| 10 | #56 | 任意の OIDC OP でログイン | WebFinger に対応した任意の OIDC OP | 原文の限定（[^53]） |
| 11 | #26 | channel 方式のみ記述 | AIP-185 が interface-based versioning（日付版、header/query で指定）も定めていることを追記 | 原典の現行内容（[^24]） |
| 12 | §4・§6・[^70] 新設 | Maturity Model の公表日 未確認 | 2023-10（v1 完成、Version info の README） | 原典で確認（[^70]） |
| 13 | §4・[^33] | 旧 URL | 新 URL（旧 URL は 301 転送）を記載 | URL 移設（[^33]） |
| 14 | [^32] | 参照箇所 §2・§3 | §3・§6 | 節番号の誤り |
| 15 | [^69] | 参照箇所 p.1・p.6 | p.2・p.7（PDF の 8 枚目）、表紙日付と掲載日の根拠を注記 | 頁の誤り |
| 16 | §4 | DORA 2019 報告の行なし | 1 行追加 | [^71] の追加に伴う |
| 17 | §5.1 ADR-016 行 | 根拠に #32 なし | #32 を追加 | 修正 7 に伴う |
| 18 | 冒頭メタ情報・本文冒頭・§6 末尾 | 版 0.1、独立検証は未実施 | 版 0.2、独立検証の実施と記録先、AI による照合である旨 | 追跡可能性 |

- §2 結論サマリの結論そのもの（識別子と境界の凍結、認証プロトコル固有の互換性規則、二層の試験、二層の変更管理、退役の遅延を前提とした方針、仕様書以外の参照実装・適合確認ツールの必要性など）は、修正後も RS-16#1〜#82 の支持された記述から導けるため、変更していない [D]。
- §2-8 の結論「退役は計画どおりに進まない前提で方針を作る」は、予定日が 2023-06-30 から 2025-08-31 に延びたという原典の記述だけで支えられる [D]。実際の停止日が未確認でも、結論は維持できる [D]。
- §2-13 の自治体標準化の結論は、[^67] の版の修正の影響を受けない [D]。

## 5. 検証不能・未確認として残した事項

脚注単位の検証不能はない [D]。原典を取得したうえで、原典に記載がないため「未確認」のまま残した事項、または検証で新たに「未確認」とした事項は次のとおりである [D]。

| 事項 | 理由 |
|---|---|
| Azure AD Graph が 2025-08-31 に実際に停止したか | [^36] は未来形のままで、停止の事実を記録した Microsoft の製品文書を確認できなかった。ノート §6 に記載 |
| JSON Schema の策定団体の 2025-01-13 以降の所属 | [^5] 以降の公式発表を確認していない。仕様ページ（[^3]）は現行版を 2020-12 のまま示している |
| AWS SDKs and Tools maintenance policy の公表日 | ページに日付表示がない |
| DORA 2019 報告の統計手法の詳細と 2.6 倍の信頼区間 | 報告本体の該当頁に記載がない。結論には方向性だけを使い、値は使っていない |
| Stripe が後方互換とみなす変更の網羅的な一覧 | Versioning・Upgrades の 2 文書には enum 以外の一覧がない |
| デジタル庁の 2026 年 9 月末のデータ要件・連携要件改定が予定どおり実施されたか | [^65] は予定の文書であり、実施の記録は確認していない（ノートは「予定が公表されている」とだけ述べており、記述との矛盾はない） |
| AIP-185 の実際の最終改訂日 | ページの Updated 表示（2024-10-22）と本文の 2025 年の日付例が整合しない |

## 6. 二次情報・種資料の扱い

- ノートの根拠に報道・解説記事・AI 要約は使われていない。各主張は標準原典・公式文書・政府文書に付いている [D]。
- [^56]（dora.dev）は DORA 自身による要約文書であり、二次情報ではないが報告本体ではない。検証で報告本体（[^71]）を取得し、主張を本体で確認した [D]。
- Microsoft Entra Blog（2025-06-27 更新、"Important Update: Azure AD Graph retirement"）はベンダー自身の告知で、[^36] が最新告知としてリンクしている。延長アクセスの終了を 2025 年 9 月初めとし、事前に一時停止試験を行うと告知しているが、停止の事実の記録ではない。ノートでは §6 に手掛かりとして記し、結論の根拠には使っていない [D]。
- Microsoft Entra Blog の別の告知（2024-06、2025-01）は、完全退役を 2025-06-30 の後または 2025-07-01 としていた（検索結果のスニペットで確認、本文は未取得）。予定日が複数回変わったことを示す手掛かりだが、本文を取得していないため、ノートには記載していない [D]。
- 種資料（seed-01〜03）は、ノート §1 の問いの出典表示にだけ使われ、主張の根拠には使われていないことを確認した [D]。前提台帳の A-050〜A-054 の値（300、30、25 組織・60 チーム、1,500、24）は 01_governance/assumptions-register.md と一致した [D]。

## 7. 参考（取得記録）

- 取得日: 2026-10-03。取得物は検証者のスクラッチパッドに保存した（リポジトリには含めない）[D]。
- 取得に失敗して代替手段を使ったもの: デジタル庁の PDF 7 件（pdftotext で文字化け → PyMuPDF）、デジタル認証サービスの 2 ページ（本文が動的描画 → page-data.json）、Stripe Upgrades（日本語版へリダイレクト → ?locale=en-US）、Stripe Versioning の言語別タブ（ページ内データから照合）、GitHub API の rate limit（未認証 curl が 403 → gh api）[D]。
- RFC Editor の /rfc/rfcNNNN は情報ページへ転送されるため、本文は .txt 版で照合した [D]。
- WebSearch は本セッションの上限に達していたため使えず、Azure AD Graph の追加確認には Tavily の検索・抽出を使った [D]。
