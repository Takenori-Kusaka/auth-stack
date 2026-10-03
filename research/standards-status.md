# 標準・規制ステータス台帳

> 文書ID: RES-01 / 版: 0.1 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-026, R-198, R-281, G-013, G-071, G-119（成果物 DL-84）
> 依存文書: CONVENTIONS.md, research/RS-01〜RS-17（各 §4 の標準・文書ステータス表）, research/verification/RS-01〜RS-17-verification.md, traceability/deliverables.md（DL-84）, 01_governance/assumptions-register.md（A-060, A-070, A-072, A-080, A-081, A-103）

本書は AI エージェント（Claude）が 2026-10-03 に作成した。調査ノート RS-01〜RS-17 の §4（標準・文書ステータス表、計 515 行）と各ノートの独立検証記録を入力にし、同じ文書を指す行を 1 件にまとめて 403 件の台帳にした。ノート間で状態・日付・参照先が食い違った 17 件は、原典を再取得して確定した（§6 差異メモ）。種資料（traceability/seed/）は根拠に使っていない。本書の照合も AI によるもので、人間のレビュアや第三者による確認ではない。

---

## 1. 本書の位置付け

- 本書は成果物 DL-84（標準ステータス台帳）であり、参照する標準・規格・法令・指針ごとに版、状態、確認日、原典 URL、次回確認日を記録し、四半期ごとに更新する文書として計画されている [D]（traceability/deliverables.md DL-84）。
- 受入基準 G-013 は、全件に版・状態・確認日・原典 URL・次回確認日・更新所有者があり、draft・ipd に依存する設計判断に依存の程度と代替策があることを求めている [D]（traceability/G-goal-criteria.md G-013）。本書は前者を §4 の各行と §3.5 で、後者を §7 で扱う [D]。
- 「本基盤での扱い」「再確認周期」「更新所有者」は本書時点の暫定区分であり、設計推論 [D] である。確定は各 ADR、適用性判定（DL-34）、経営の承認（G-071、閉じ方 B）で行う [D]。
- 前提台帳の値（法域 A-060、データ種別 A-070、決済の分離 A-072、業界構成 A-080、高保証テナント A-081、暗号移行 A-103）は仮置きであり、値が変わると「扱い」の条件付き区分が変わる [D][A-060][A-080]。

## 2. 凡例

### 2.1 列の定義

| 列 | 内容 |
|---|---|
| ID | 本台帳内の通し番号（SS-＋区分記号＋連番）。§6・§7 から参照する |
| 名称 | 文書名。同じ文書を複数ノートが引く場合は 1 行にまとめた |
| 発行組織 | 文書の発行主体。掲載サイトの運営者と異なる場合は「掲載:」で併記した |
| 版/番号 | 版、RFC 番号、I-D の改訂番号（-NN）、法令番号など |
| 状態 | 状態の正規化語（final、draft、ipd、公布済未施行、施行済、適用中、NPRM、提案、Replaced 等）と補足。末尾のタグは根拠の種別（[N] 規範・標準・法令の原典、[V] ベンダー・プロジェクトの公式文書、[I] 事故の一次報告・公的勧告） |
| 公表日 | 文書の版の日付。I-D は Datatracker 上の当該版の投稿日、法令は採択日・公布日と官報掲載日 |
| 施行日 | 法令・規則の発効日・適用日・施行日。法令以外は「—」 |
| 確認日 | 原典で状態を確認した日。全件 2026-10-03（各ノートの確認日と、本書で再取得した日） |
| URL | 原典の URL。ノートによって参照先が異なる場合は、原典で確認した現行の参照先を採った（§6） |
| 本基盤での扱い | §2.3 の 4 区分。括弧内は条件と用途 |
| 再確認周期 | §3.4 の規則による周期と次回確認日 |
| 出典ノート | その行を §4 に載せていた調査ノート。各行の値は当該ノートの §4 と検証記録に基づき、原典は URL 列が指す |

### 2.2 状態区分（集計用）

| 区分 | 含めるもの |
|---|---|
| final | 確定版の標準・仕様（RFC、OIDF Final、W3C Recommendation、OASIS Standard、ISO Published、FIDO Proposed Standard、NIST final 等）、施行済・適用中の法令、確定した政府・業界の指針、リリース済みのコミュニティ仕様 |
| draft | I-D、OIDF の Implementer's Draft・WG draft、W3C の WD・CR、FIDO WD、NIST ipd、改定案、NPRM、立法提案、意見募集版のガイドライン、未公表の予定標準 |
| 公布済未施行 | 公布・公表済みで義務の発生日が未到来の法令・規則 |
| 失効・置換・退役 | Replaced・Expired の I-D、Final に置き換えられた草案、Historical に移された認証、退役版、closed の指令、後続 patch で置き換えられた版 |
| その他 | 事故の一次報告と公的勧告、製品・OSS のリリースとベンダー文書、論文・書籍・白書、認定一覧などの公開記録、係属中の訴訟 |

### 2.3 本基盤での扱い（4 区分）

| 区分 | 意味 |
|---|---|
| 準拠基準 | 本基盤の設計・連携契約・統制が適合を主張する対象。逸脱は採否表または ADR に記録する。法令は適用判定（DL-34）の結果、適用される場合に限る（「条件付」と記した行） |
| 参照 | 設計・統制・評価・見積りの入力として使うが、適合は主張しない。顧客の契約要求で準拠対象に変わり得るものを含む |
| 監視のみ | 状態の変化だけを追跡し、設計の根拠にしない（draft、ipd、NPRM、提案、experimental 機能等） |
| 不採用 | 使わない（置換・失効・退役、または本基盤の方針と合わないもの）。状態の追跡は必要に応じて続ける |

## 3. 集計と運用規則

### 3.1 件数

ノート 17 本の §4 の 515 行を統合し、403 件にした [D]。状態区分ごとの件数は次のとおりである [D]（§4 の各行の集計）。

| 区分 | final | draft | 公布済未施行 | 失効・置換・退役 | その他（非規範・製品・事故報告等） | 計 |
|---|---:|---:|---:|---:|---:|---:|
| A IETF の RFC・BCP | 52 | 0 | 0 | 0 | 0 | 52 |
| B IETF の Internet-Draft | 0 | 26 | 0 | 2 | 0 | 28 |
| C OpenID Foundation の仕様と公開記録 | 11 | 8 | 0 | 1 | 3 | 23 |
| D W3C・FIDO Alliance・OASIS・ISO・DMTF・IANA | 11 | 4 | 0 | 0 | 3 | 18 |
| E NIST・米国連邦機関の技術文書と指針 | 37 | 7 | 0 | 1 | 1 | 46 |
| F 日本の法令・政府基準・業界指針 | 27 | 1 | 3 | 0 | 0 | 31 |
| G EU・英国の法令・規制文書・判例 | 21 | 4 | 0 | 0 | 4 | 29 |
| H 米国の法令・規制・政策文書 | 14 | 2 | 2 | 0 | 0 | 18 |
| I 業界団体・コミュニティの仕様と枠組み | 33 | 2 | 0 | 2 | 0 | 37 |
| J 公的勧告・事故の一次報告 | 0 | 0 | 0 | 1 | 48 | 49 |
| K 製品・OSS・ベンダー文書（版・料金・SLA を含む） | 0 | 0 | 0 | 0 | 52 | 52 |
| L 論文・書籍・白書（非規範） | 0 | 0 | 0 | 1 | 19 | 20 |
| **計** | **206** | **54** | **5** | **8** | **130** | **403** |

- final は 206 件、draft は 54 件である [D]。ほかに公布済未施行 5 件、失効・置換・退役 8 件、その他 130 件がある [D]。
- 本基盤での扱いは、準拠基準 74 件、参照 272 件、監視のみ 50 件、不採用 7 件である [D]。
- 再確認周期は、月次 22 件、四半期 117 件、半年 58 件、年次 206 件である [D]。
- ノート間の差異は 17 件で、内訳は一方の記述の誤り・旧情報・不正確な表記 8 件、未確認事項の解消 1 件、基準日・参照先の違い 6 件、情報の欠落 2 件である [D]（§6）。

### 3.2 draft・ipd の内訳

draft 54 件の内訳は、IETF の I-D 26 件、OIDF の草案 8 件、W3C・FIDO の草案 4 件、NIST の ipd・未公表標準 7 件、日本の改定案 1 件、EU の提案・意見募集版 4 件、米国の NPRM・未確定規則 2 件、コミュニティ仕様の未リリース・Incubating 2 件である [D]。

### 3.3 更新の手順

- 台帳全体を四半期ごとに見直し、版を上げる [D]（DL-84、G-071）。次回の全体見直しは 2027-01-03 を目安とする [D]。
- 周期とは別に、次の事象を起点に該当行を随時更新する [D]: RFC の発行、I-D の IESG 提出・承認・失効・置換、OIDF の Final・Implementer's Draft 承認、NIST の ipd から final への移行、法令の公布・施行・政令の公布、NPRM の最終規則化、判決、製品のメジャー版リリースとサポート終了。
- 状態が変わった行は、旧状態・新状態・確認日・原典を §6 と同じ形式で記録し、その行に依存する ADR と連携契約（11_contracts/）の所有者に通知する [D]（R-281）。
- 自動検査（DL-111）では、全行に状態と確認日があること、確認日が再確認周期を過ぎていないこと、draft・ipd の行に依存する ADR に代替策があることを検査する [D]（G-013）。

### 3.4 再確認周期の規則

| 周期 | 適用する行 |
|---|---|
| 月次 | RFC Editor Queue の I-D、施行日が 6 か月以内に迫る法令・規則、最終化の期限を過ぎた規則（CIRCIA）、Final 投票が予定された OIDF 草案、係属中の訴訟、版の更新頻度が高い SDO 外仕様（MCP）、後継版が RFC Editor Queue にある RFC |
| 四半期 | WG 段階の I-D・OIDF 草案・W3C 草案・NIST ipd、改定作業中の指針、NPRM・立法提案、製品・OSS のリリース、料金・SLA、後継版が作業中の final 文書 |
| 半年 | 改正動向のある施行済法令、政府・業界の指針、統制カタログ、公的勧告（改訂があるもの） |
| 年次 | 安定した RFC・OIDF Final・W3C Recommendation、事故報告、論文・書籍・白書、失効・置換済みの文書 |

### 3.5 更新所有者（役割）

所有者は個人ではなく役割に置く [D]（G-071）。以下は案であり、承認は経営会議で行う（閉じ方 B）[D]。

| 区分 | 更新所有者（案） |
|---|---|
| A IETF の RFC・BCP | CTO 室（標準担当） |
| B IETF の Internet-Draft | CTO 室（標準担当） |
| C OpenID Foundation の仕様と公開記録 | CTO 室（標準担当） |
| D W3C・FIDO Alliance・OASIS・ISO・DMTF・IANA | CTO 室（標準担当） |
| E NIST・米国連邦機関の技術文書と指針 | CISO 室（暗号・鍵管理の文書は CTO 室と共同） |
| F 日本の法令・政府基準・業界指針 | 法務責任者＋個人情報保護責任者（業界指針は CISO 室と共同） |
| G EU・英国の法令・規制文書・判例 | 法務責任者＋個人情報保護責任者 |
| H 米国の法令・規制・政策文書 | 法務責任者 |
| I 業界団体・コミュニティの仕様と枠組み | CISO 室（API・イベント契約の仕様は CTO 室） |
| J 公的勧告・事故の一次報告 | CISO 室（脅威情報担当） |
| K 製品・OSS・ベンダー文書（版・料金・SLA を含む） | 認証・認可プラットフォームチーム（製品評価） |
| L 論文・書籍・白書（非規範） | CTO 室 |

## 4. 台帳

各行の「状態」「公表日」「施行日」は事実であり、根拠の種別を状態列のタグで示す [D]。「本基盤での扱い」は設計推論 [D] であり、仮定に依存する場合は前提台帳の ID を併記した。「再確認周期」と §3.5 の所有者も設計推論 [D] である。

### 4.1 IETF の RFC・BCP（52 件）

更新所有者（案）: CTO 室（標準担当） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-A01 | RFC 9700 Best Current Practice for OAuth 2.0 Security | IETF | RFC 9700（BCP 240） | final（Best Current Practice）[N] | 2025-01 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9700 | 準拠基準（MUST/SHOULD ごとの採否と逸脱を採否表に記録） [D] | 年次（次回 2027-10-03） | RS-04、RS-11、RS-12、RS-13、RS-17 |
| SS-A02 | RFC 6749 The OAuth 2.0 Authorization Framework | IETF | RFC 6749 | final（Proposed Standard。RFC 8252・RFC 8996・RFC 9700 で更新。OAuth 2.1 草案が置換を予定）[N] | 2012-10 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc6749 | 準拠基準 [D] | 四半期（次回 2027-01-03） | RS-04、RS-16、RS-17 |
| SS-A03 | RFC 9126 OAuth 2.0 Pushed Authorization Requests（PAR） | IETF | RFC 9126 | final（Proposed Standard）[N] | 2021-09 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9126 | 準拠基準（FAPI 範囲では必須） [D] | 年次（次回 2027-10-03） | RS-04 |
| SS-A04 | RFC 9449 OAuth 2.0 Demonstrating Proof of Possession（DPoP） | IETF | RFC 9449 | final（Proposed Standard）[N] | 2023-09 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9449 | 準拠基準（public client の送信者制約） [D] | 年次（次回 2027-10-03） | RS-04、RS-11 |
| SS-A05 | RFC 8705 OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens | IETF | RFC 8705 | final（Proposed Standard）[N] | 2020-02 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8705 | 準拠基準（サービス間・B2B サーバー連携） [D] | 年次（次回 2027-10-03） | RS-04、RS-17 |
| SS-A06 | RFC 9396 OAuth 2.0 Rich Authorization Requests（RAR） | IETF | RFC 9396 | final（Proposed Standard）[N] | 2023-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9396 | 準拠基準（RS-06 の L1） [D] | 年次（次回 2027-10-03） | RS-04、RS-06 |
| SS-A07 | RFC 9068 JWT Profile for OAuth 2.0 Access Tokens | IETF | RFC 9068 | final（Proposed Standard）[N] | 2021-10 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9068 | 準拠基準（FAPI 範囲の RS256 非対応は逸脱として記録） [D] | 年次（次回 2027-10-03） | RS-04、RS-11 |
| SS-A08 | RFC 8725 JSON Web Token Best Current Practices | IETF | RFC 8725（BCP 225） | final（Best Current Practice。後継 8725bis が RFC Editor Queue）[N] | 2020-02 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8725 | 準拠基準 [D] | 月次（次回 2026-11-03） | RS-04、RS-05、RS-11 |
| SS-A09 | RFC 8693 OAuth 2.0 Token Exchange | IETF | RFC 8693 | final（Proposed Standard）[N] | 2020-01 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8693 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-04、RS-06、RS-17 |
| SS-A10 | RFC 8707 Resource Indicators for OAuth 2.0 | IETF | RFC 8707 | final（Proposed Standard）[N] | 2020-02 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8707 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-04、RS-06、RS-17 |
| SS-A11 | RFC 7662 OAuth 2.0 Token Introspection | IETF | RFC 7662 | final（Proposed Standard）[N] | 2015-10 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7662 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-04 |
| SS-A12 | RFC 9701 JWT Response for OAuth Token Introspection | IETF | RFC 9701 | final（Proposed Standard）[N] | 2025-01 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9701 | 準拠基準（FAPI Message Signing の範囲） [D] | 年次（次回 2027-10-03） | RS-04 |
| SS-A13 | RFC 7009 OAuth 2.0 Token Revocation | IETF | RFC 7009 | final（Proposed Standard）[N] | 2013-08 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7009 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-04 |
| SS-A14 | RFC 9207 OAuth 2.0 Authorization Server Issuer Identification | IETF | RFC 9207 | final（Proposed Standard）[N] | 2022-03 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9207 | 準拠基準（複数 AS と対話する RP の mix-up 対策） [D] | 年次（次回 2027-10-03） | RS-03、RS-04、RS-06 |
| SS-A15 | RFC 9470 OAuth 2.0 Step Up Authentication Challenge Protocol | IETF | RFC 9470 | final（Proposed Standard）[N] | 2023-09 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9470 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-04、RS-13 |
| SS-A16 | RFC 10017 OAuth 2.0 for Browser-Based Applications | IETF | RFC 10017（BCP 212） | final（Best Current Practice）[N] | 2026-08 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc10017 | 準拠基準（BFF の根拠） [D] | 年次（次回 2027-10-03） | RS-04、RS-17 |
| SS-A17 | RFC 8252 OAuth 2.0 for Native Apps | IETF | RFC 8252（BCP 212） | final（Best Current Practice）[N] | 2017-10 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8252 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-17 |
| SS-A18 | RFC 8628 OAuth 2.0 Device Authorization Grant | IETF | RFC 8628 | final（Proposed Standard）[N] | 2019-08 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8628 | 参照（RFC 10027 に従い、他の方式が使えない場合に限定） [D] | 年次（次回 2027-10-03） | RS-13、RS-17 |
| SS-A19 | RFC 10027 Best Current Practice for Security of Cross-Device Flows | IETF | RFC 10027（BCP 247） | final（Best Current Practice）[N] | 2026-08 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc10027 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-13、RS-17 |
| SS-A20 | RFC 7523 JWT Profile for OAuth 2.0 Client Authentication and Authorization Grants | IETF | RFC 7523 | final（Proposed Standard。7523bis による更新が RFC Editor Queue）[N] | 2015-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7523 | 準拠基準 [D] | 月次（次回 2026-11-03） | RS-17 |
| SS-A21 | RFC 9728 OAuth 2.0 Protected Resource Metadata | IETF | RFC 9728 | final（Proposed Standard）[N] | 2025-04 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9728 | 準拠基準（MCP server を RS として扱う既定形を含む） [D] | 年次（次回 2027-10-03） | RS-06、RS-17 |
| SS-A22 | RFC 8414 OAuth 2.0 Authorization Server Metadata | IETF | RFC 8414 | final（Proposed Standard）[N] | 2018-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8414 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A23 | RFC 7591 OAuth 2.0 Dynamic Client Registration Protocol | IETF | RFC 7591 | final（Proposed Standard）[N] | 2015-07 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7591 | 参照（非本番の client 登録自動化の候補。MCP 2026-07-28 版では DCR が廃止予定） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A24 | RFC 7519 JSON Web Token ／ RFC 7515 JSON Web Signature | IETF | RFC 7519 ／ RFC 7515 | final（Proposed Standard。RFC 7519 は RFC 7797・RFC 8725 で更新）[N] | 2015-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7519 , https://www.rfc-editor.org/rfc/rfc7515 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A25 | RFC 7518 JSON Web Algorithms（JWA） | IETF | RFC 7518 | final（Proposed Standard。RFC 9864 で更新）[N] | 2015-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7518 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-05 |
| SS-A26 | RFC 9864 Fully-Specified Algorithms for JOSE and COSE | IETF | RFC 9864 | final（Standards Track）[N] | 2025-10 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9864 | 参照（alg 識別子の版付き profile の設計入力） [D][A-103] | 年次（次回 2027-10-03） | RS-11 |
| SS-A27 | RFC 9964 ML-DSA for JOSE and COSE | IETF | RFC 9964 | final（Proposed Standard）[N] | 2026-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9964 | 参照（PQ 署名移行の候補） [D][A-103] | 四半期（次回 2027-01-03） | RS-05、RS-11 |
| SS-A28 | RFC 7696 Guidelines for Cryptographic Algorithm Agility | IETF | RFC 7696（BCP 201） | final（Best Current Practice）[N] | 2015-11 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc7696 | 参照 [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-A29 | RFC 9881 ML-DSA in X.509 Public Key Infrastructure | IETF | RFC 9881 | final（Standards Track）[N] | 2025-10 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9881 | 参照（TLS の ML-DSA 認証の RFC 化後に評価） [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-A30 | RFC 9909 SLH-DSA in X.509 Public Key Infrastructure | IETF | RFC 9909 | final（Standards Track）[N] | 2025-12 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9909 | 参照 [D][A-103] | 年次（次回 2027-10-03） | RS-11 |
| SS-A31 | RFC 9954 Hybrid Key Exchange in TLS 1.3 | IETF | RFC 9954 | final（Informational）[N] | 2026-07 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9954 | 参照 [D][A-103] | 年次（次回 2027-10-03） | RS-11 |
| SS-A32 | RFC 10024 Post-Quantum/Traditional Hybrid Key Agreement for TLS 1.3 | IETF | RFC 10024 | final（Standards Track）[N] | 2026-08 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc10024 | 参照（TLS 鍵交換の PQ 移行を先行させる候補） [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-A33 | RFC 9847 IANA Registry Updates for TLS and DTLS | IETF | RFC 9847 | final（Standards Track）[N] | 2025-12 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9847 | 参照 [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-A34 | RFC 9958 Post-Quantum Cryptography for Engineers | IETF | RFC 9958 | final（Informational）[N] | 2026-06 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9958 | 参照 [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-A35 | RFC 6265 HTTP State Management Mechanism（Cookies） | IETF | RFC 6265 | final（Proposed Standard。6265bis が RFC Editor Queue）[N] | 2011-04 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc6265 | 準拠基準 [D] | 月次（次回 2026-11-03） | RS-11 |
| SS-A36 | RFC 8996 Deprecating TLS 1.0 and TLS 1.1 | IETF | RFC 8996（BCP 195） | final（Best Current Practice）[N] | 2021-03 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc8996 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-A37 | RFC 9155 Deprecating MD5 and SHA-1 Signature Hashes in TLS 1.2 | IETF | RFC 9155 | final（Standards Track）[N] | 2021-12 | — | 2026-10-03 | https://www.rfc-editor.org/info/rfc9155 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-A38 | RFC 9162 Certificate Transparency Version 2.0 | IETF | RFC 9162 | final（Experimental。RFC 6962 を廃止）[N] | 2021-12 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9162 | 参照（監査ログの改ざん検知設計の入力） [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-A39 | RFC 9943 SCITT Architecture | IETF | RFC 9943 | final（Proposed Standard）[N] | 2026-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9943 | 参照 [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-A40 | RFC 9942 COSE Receipts | IETF | RFC 9942 | final（Proposed Standard）[N] | 2026-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9942 | 参照 [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-A41 | RFC 7643 SCIM: Core Schema | IETF | RFC 7643 | final（Proposed Standard。RFC 9865・RFC 9967 で更新）[N] | 2015-09 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7643 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-14 |
| SS-A42 | RFC 7644 SCIM: Protocol | IETF | RFC 7644 | final（Proposed Standard。RFC 9865・RFC 9967 で更新）[N] | 2015-09 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7644 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-14 |
| SS-A43 | RFC 9865 SCIM Cursor-Based Pagination | IETF | RFC 9865 | final（Proposed Standard）[N] | 2025-10 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9865 | 参照（大規模テナント同期での採否は DL-08 で判断） [D] | 年次（次回 2027-10-03） | RS-14 |
| SS-A44 | RFC 9967 SCIM Profile for Security Event Tokens | IETF | RFC 9967 | final（Proposed Standard）[N] | 2026-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9967 | 参照 [D] | 年次（次回 2027-10-03） | RS-03、RS-14 |
| SS-A45 | RFC 9576 The Privacy Pass Architecture | IETF | RFC 9576 | final（Informational）[N] | 2024-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9576 | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-A46 | RFC 9577 ／ RFC 9578 Privacy Pass（HTTP 認証方式・発行プロトコル） | IETF | RFC 9577 ／ RFC 9578 | final（Proposed Standard）[N] | 2024-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9577 , https://www.rfc-editor.org/rfc/rfc9578 | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-A47 | RFC 9457 Problem Details for HTTP APIs | IETF | RFC 9457 | final（Proposed Standard。RFC 7807 を廃止）[N] | 2023-07 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9457 | 準拠基準（DL-71 のエラー形式） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A48 | RFC 9745 The Deprecation HTTP Response Header Field | IETF | RFC 9745 | final（Proposed Standard）[N] | 2025-03 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9745 | 参照（採否は ADR-016） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A49 | RFC 8594 The Sunset HTTP Header Field | IETF | RFC 8594 | final（Informational）[N] | 2019-05 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8594 | 参照（採否は ADR-016） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A50 | RFC 9110 HTTP Semantics | IETF | RFC 9110（STD 97） | final（Internet Standard）[N] | 2022-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9110 | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-A51 | RFC 6455 The WebSocket Protocol | IETF | RFC 6455 | final（Proposed Standard）[N] | 2011-12 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc6455 | 参照 [D] | 年次（次回 2027-10-03） | RS-17 |
| SS-A52 | RFC 4513 LDAP: Authentication Methods and Security Mechanisms | IETF | RFC 4513 | final（Proposed Standard）[N] | 2006-06 | — | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc4513 | 参照（レガシー連携に限る） [D] | 年次（次回 2027-10-03） | RS-17 |

### 4.2 IETF の Internet-Draft（28 件）

更新所有者（案）: CTO 室（標準担当） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-B01 | draft-ietf-oauth-v2-1（OAuth 2.1） | IETF OAuth WG | -16 | draft（WG Document、IESG: I-D Exists＝未提出。WG マイルストーン 2026-12）[N]（差異 Δ-01） | 2026-09-03（失効予定 2027-03-07）[^1][^2] | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ | 監視のみ（規範根拠に使わない） [D] | 四半期（次回 2027-01-03） | RS-04、RS-06、RS-17 |
| SS-B02 | draft-ietf-oauth-rfc8725bis（JWT BCP 改訂） | IETF OAuth WG | -10 | draft（BCP 予定。IESG: RFC Ed Queue、RFC Editor: Blocked＝参照文書待ち、2026-08-25〜）[N]（差異 Δ-04）[^7] | 2026-08-21 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ | 監視のみ（RFC 発行時に JWT 検証規則へ差分を取り込む） [D] | 月次（次回 2026-11-03） | RS-04、RS-05、RS-11 |
| SS-B03 | draft-ietf-oauth-status-list（Token Status List） | IETF OAuth WG | -21 | draft（Standards Track 予定。RFC Ed Queue、RFC Editor: In Progress。画面表示は Awaiting First editor）[N] | 2026-06-21 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/ | 監視のみ（RFC 化まで採用候補） [D] | 月次（次回 2026-11-03） | RS-04 |
| SS-B04 | draft-ietf-oauth-transaction-tokens（Transaction Tokens） | IETF OAuth WG | -11 | draft（WG Consensus: Waiting for Write-Up、IESG 未提出、2027-01-31 失効予定）[N][^8] | 2026-07-30 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ | 参照（RS-06 の L2。版を固定した社内 profile として ADR-009 で採用候補。§7） [D] | 月次（次回 2026-11-03） | RS-06、RS-08、RS-17 |
| SS-B05 | draft-ietf-oauth-identity-chaining（Identity and Authorization Chaining Across Domains） | IETF OAuth WG | -17 | draft（PS 予定。Submitted to IESG、RFC Ed Queue、RFC Editor 処理: Awaiting First editor（2026-08-21〜））[N]（差異 Δ-02） | 2026-07-19[^3][^4] | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/ | 参照（RS-06 の L2。版固定。§7） [D] | 月次（次回 2026-11-03） | RS-06、RS-17 |
| SS-B06 | draft-ietf-oauth-rfc7523bis（RFC 7523 等の更新） | IETF OAuth WG | -11 | draft（PS 予定。2026-04-30 IESG 承認、RFC Ed Queue、RFC Editor 処理: In Progress（Second Edit、2026-09-30〜））[N]（差異 Δ-03） | 2026-04-28（本文の日付表記 2026-03-26）[^5][^6] | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc7523bis/ | 参照（RS-06 の L2。版固定。§7） [D] | 月次（次回 2026-11-03） | RS-06、RS-17 |
| SS-B07 | draft-ietf-oauth-identity-assertion-authz-grant（ID-JAG） | IETF OAuth WG | -04 | draft（WG Document、2026-11-22 失効予定）[N] | 2026-05-21 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-assertion-authz-grant/ | 監視のみ（RS-06 の L3。任意機能の PoC に限る） [D] | 四半期（次回 2027-01-03） | RS-06、RS-17 |
| SS-B08 | draft-ietf-oauth-client-id-metadata-document（CIMD） | IETF OAuth WG | -02 | draft（WG Document）[N] | 2026-07-06 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B09 | draft-ietf-oauth-spiffe-client-auth | IETF OAuth WG | -02 | draft（WG Document）[N] | 2026-06-15 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-spiffe-client-auth/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B10 | draft-ietf-wimse-arch | IETF WIMSE WG | -08 | draft（WG Document、Informational。憲章期限 2026-07 を超過）[N] | 2026-07-06 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-arch/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B11 | draft-ietf-wimse-workload-creds | IETF WIMSE WG | -02 | draft（WG Document）[N] | 2026-07-02 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-workload-creds/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B12 | draft-ietf-wimse-mutual-tls | IETF WIMSE WG | -02 | draft（WG Document）[N] | 2026-07-06 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-mutual-tls/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B13 | draft-ietf-wimse-wpt | IETF WIMSE WG | -02 | draft（WG Document）[N] | 2026-08-27 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-wpt/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B14 | draft-ietf-wimse-http-signature | IETF WIMSE WG | -07 | draft（WG Document）[N] | 2026-09-20 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-http-signature/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B15 | draft-ietf-wimse-identifier | IETF WIMSE WG | -03 | draft（WG Document）[N] | 2026-07-06 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-identifier/ | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B16 | draft-ietf-wimse-workload-identity-practices | IETF WIMSE WG | -07 | draft（Submitted to IESG、AD Evaluation、Informational）[N] | 2026-09-22 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-workload-identity-practices/ | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B17 | draft-ietf-wimse-aims | IETF WIMSE WG | -00 | draft（WG Document、Informational）[N] | 2026-09-15 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-aims/ | 監視のみ（RS-06 の L4） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B18 | draft-ietf-wimse-s2s-protocol | IETF WIMSE WG | -07 | Replaced（Dead WG Document）[N] | 2025-10-16 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-s2s-protocol/ | 不採用（置換済み） [D] | 年次（次回 2027-10-03） | RS-06 |
| SS-B19 | draft-wzdk-scim-agent-resource | 個人提出（IETF） | -00 | draft（個人提出、Informational。WG 未採択）[N] | 2026-06-05 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-wzdk-scim-agent-resource/ | 不採用（SCIM エージェント拡張は採用しない: ADR-004 入力。状態は追跡） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B20 | draft-kushwaha-scim-agent-governance | 個人提出（IETF） | -00 | draft（個人提出、Informational）[N] | 2026-07-26（Datatracker 掲載 2026-07-27 UTC） | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-kushwaha-scim-agent-governance/ | 不採用（同上） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-B21 | draft-wahl-scim-agent-schema ／ draft-scim-agent-extension ／ draft-abbey-scim-agent-extension | 個人提出（IETF） | -01 ／ -00 ／ -00 | Expired（個人提出）[N] | 2025-08-19 ／ 2025-10-11 ／ 2025-10-16 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-wahl-scim-agent-schema/ | 不採用（失効） [D] | 年次（次回 2027-10-03） | RS-06 |
| SS-B22 | draft-ietf-dnsop-domain-verification-techniques | IETF DNSOP WG | -13 | draft（I-D Exists、BCP 予定、WG: Waiting for WG Chair Go-Ahead、改訂要の注記。2026-12-24 失効予定）[N] | 2026-06-22 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-dnsop-domain-verification-techniques/ | 参照（domain verification 手順の入力。版を固定して引く） [D] | 四半期（次回 2027-01-03） | RS-14 |
| SS-B23 | draft-ietf-jose-pq-composite-sigs | IETF JOSE WG | -04 | draft（WG Document、I-D Exists）[N] | 2026-09-11 | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-jose-pq-composite-sigs/ | 監視のみ（draft の codepoint に依存しない: ADR-018） [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-B24 | draft-ietf-cose-sphincs-plus | IETF COSE WG | -10 | draft（AD Evaluation）[N] | 2026-07-28（Datatracker 最終更新 2026-08-24） | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-cose-sphincs-plus/ | 監視のみ [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-B25 | draft-ietf-lamps-pq-composite-sigs | IETF LAMPS WG | -19 | draft（RFC Editor Queue）[N] | 2026-04-21（Datatracker 最終更新 2026-10-02） | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/ | 監視のみ [D][A-103] | 月次（次回 2026-11-03） | RS-11 |
| SS-B26 | draft-ietf-tls-mlkem | IETF TLS WG | -11 | draft（RFC Editor Queue、Informational 予定）[N] | 2026-09-17（Datatracker 最終更新 2026-09-24） | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-tls-mlkem/ | 監視のみ [D][A-103] | 月次（次回 2026-11-03） | RS-11 |
| SS-B27 | draft-ietf-tls-mldsa | IETF TLS WG | -06 | draft（RFC Editor Queue、Informational 予定）[N] | 2026-09-11（Datatracker 最終更新 2026-09-29） | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-tls-mldsa/ | 監視のみ（RFC 化後に RFC 9881 と併せて評価: ADR-009） [D][A-103] | 月次（次回 2026-11-03） | RS-11 |
| SS-B28 | draft-ietf-httpbis-rfc6265bis（Cookies 改訂） | IETF HTTPBIS WG | -22 | draft（RFC Editor Queue）[N] | 2025-12-01（Datatracker 最終更新 2026-08-13） | — | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/ | 参照（SameSite 等の属性はブラウザ実装と本草案に依拠。§7） [D] | 月次（次回 2026-11-03） | RS-11 |

### 4.3 OpenID Foundation の仕様と公開記録（23 件）

更新所有者（案）: CTO 室（標準担当） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-C01 | OpenID Connect Core 1.0 incorporating errata set 2 | OpenID Foundation | errata set 2 | final（OIDF Final Specification）[N] | 2023-12-15（初版 2014-02-25） | — | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-05、RS-11、RS-12、RS-14、RS-16、RS-17 |
| SS-C02 | OpenID Connect Discovery 1.0 incorporating errata set 2 | OpenID Foundation | errata set 2 | final（OIDF Final Specification）[N] | 2023-12-15 | — | 2026-10-03 | https://openid.net/specs/openid-connect-discovery-1_0.html | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-11、RS-16 |
| SS-C03 | OpenID Federation 1.0 | OpenID Foundation | 1.0 | final（OIDF Final Specification）[N] | 2026-02-17 | — | 2026-10-03 | https://openid.net/specs/openid-federation-1_0.html | 参照 [D] | 年次（次回 2027-10-03） | RS-03 |
| SS-C04 | OpenID Connect CIBA Core 1.0 | OpenID Foundation | 1.0 | final（OIDF Final Specification）[N] | 2021-09-01 | — | 2026-10-03 | https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html | 参照 [D] | 年次（次回 2027-10-03） | RS-06 |
| SS-C05 | FAPI 2.0 Security Profile | OpenID Foundation（FAPI WG） | Final | final（OIDF Final Specification）[N] | 2025-02-22（承認告知 2025-02-19） | — | 2026-10-03 | https://openid.net/specs/fapi-security-profile-2_0-final.html | 準拠基準（高保証範囲に限定。部分採用は「FAPI 2.0 準拠」と称さない） [D][A-081] | 年次（次回 2027-10-03） | RS-04、RS-15 |
| SS-C06 | FAPI 2.0 Attacker Model | OpenID Foundation（FAPI WG） | Final | final（OIDF Final Specification）[N] | 2025-02-22（承認告知 2025-02-19） | — | 2026-10-03 | https://openid.net/specs/fapi-attacker-model-2_0-final.html | 参照（脅威モデル 03_threat-model の入力） [D] | 年次（次回 2027-10-03） | RS-04 |
| SS-C07 | FAPI 2.0 Message Signing | OpenID Foundation（FAPI WG） | Final | final（OIDF Final Specification）[N] | 2025-09-25（承認告知 2025-09-26） | — | 2026-10-03 | https://openid.net/specs/fapi-message-signing-2_0-final.html | 準拠基準（高保証範囲のうち署名を要する操作） [D][A-081] | 年次（次回 2027-10-03） | RS-04、RS-15 |
| SS-C08 | FAPI 2.0 HTTP Signatures | OpenID Foundation（FAPI WG） | working copy | draft（FAPI WG 一覧で Drafts に区分）[N] | working copy の表示 2026-06-26 | — | 2026-10-03 | https://openid.bitbucket.io/fapi/fapi-2_0-http-signatures.html | 監視のみ（要求本文の否認防止は当面業務層の署名・監査で補う） [D] | 四半期（次回 2027-01-03） | RS-04 |
| SS-C09 | OpenID Shared Signals Framework 1.0 | OpenID Foundation（Shared Signals WG） | 1.0 | final（OIDF Final Specification。Final 承認告知 2025-09-02、プレスリリース 2025-09-16）[N]（差異 Δ-05）[^9][^10] | 2025-08-29 | — | 2026-10-03 | https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html | 準拠基準（受信プロファイルは DL-17 で定義） [D] | 年次（次回 2027-10-03） | RS-03、RS-04、RS-13、RS-14 |
| SS-C10 | OpenID Continuous Access Evaluation Profile（CAEP）1.0 | OpenID Foundation（Shared Signals WG） | 1.0 | final（同上）[N]（差異 Δ-05） | 2025-08-29 | — | 2026-10-03 | https://openid.net/specs/openid-caep-1_0-final.html | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-04、RS-13、RS-14 |
| SS-C11 | OpenID RISC Profile 1.0 | OpenID Foundation（Shared Signals WG） | 1.0 | final（同上）[N]（差異 Δ-05） | 2025-08-29 | — | 2026-10-03 | https://openid.net/specs/openid-risc-1_0-final.html | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-04、RS-13、RS-14 |
| SS-C12 | OpenID CAEP Interoperability Profile 1.0 | OpenID Foundation（Shared Signals WG） | Implementer's Draft 1 | draft（ID1。2026-09-15 の WG 合意で修正後にレビューをやり直し、当初の Final 投票期間 2026-09-26〜10-10 は進行していない。改訂後の日程は未確認）[N] | 2024-06-25（ID 承認告知 2024-08-20） | — | 2026-10-03 | https://openid.net/specs/openid-caep-interoperability-profile-1_0-ID1.html | 監視のみ（Final まで依存しない） [D] | 月次（次回 2026-11-03） | RS-04 |
| SS-C13 | OpenID AuthZEN Authorization API 1.0 | OpenID Foundation（AuthZEN WG） | 1.0 | final（OIDF Final Specification）[N] | 2026-01-11（承認告知 2026-01-12） | — | 2026-10-03 | https://openid.net/specs/authorization-api-1_0.html | 準拠基準（PEP–PDP 契約 DL-72。自社拡張は版付き profile） [D] | 年次（次回 2027-10-03） | RS-07、RS-16、RS-17 |
| SS-C14 | AuthZEN Authorization API 1.0 Implementer's Draft | OpenID Foundation（AuthZEN WG） | draft 01 | 置換済み（Final に置き換えられた）[N] | 承認 2024-11-15 | — | 2026-10-03 | https://openid.net/authzen-authorization-api-1-0-implementers-draft-approved | 不採用（Final を使う） [D] | 年次（次回 2027-10-03） | RS-07 |
| SS-C15 | AuthZEN COAZ Framework | OpenID Foundation（AuthZEN WG） | 1.0 | draft（WG draft）[N] | 未確認 | — | 2026-10-03 | https://openid.net/wg/authzen/specifications | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-C16 | AuthZEN COAZ-MCP Binding | OpenID Foundation（AuthZEN WG） | 1.0 | draft（WG draft）[N] | 未確認 | — | 2026-10-03 | https://openid.net/wg/authzen/specifications | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-C17 | AuthZEN Access Request and Approval Profile | OpenID Foundation（AuthZEN WG） | 1.0 | draft（WG draft）[N] | 未確認 | — | 2026-10-03 | https://openid.net/wg/authzen/specifications | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-C18 | AuthZEN Profile for Obligations | OpenID Foundation（AuthZEN WG） | 1.0 | draft（WG draft）[N] | 未確認 | — | 2026-10-03 | https://openid.net/wg/authzen/specifications | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-C19 | IPSIE AL SCIM 2.0 Profile | OpenID Foundation（IPSIE WG） | Draft 00 | draft（WG 文書、Informational。WG の Specifications ページは Implementer's Drafts・Final とも「None yet」）[N] | 2026-09-08 | — | 2026-10-03 | https://openid.net/specs/ipsie-al-scim-profile-1_0.html | 参照（目標値の候補にとどめる） [D] | 四半期（次回 2027-01-03） | RS-14 |
| SS-C20 | IPSIE SL1 OpenID Connect Profile | OpenID Foundation（IPSIE WG） | Draft 00（openid.net 掲載版。表示上の失効日 2025-10-20。editor's draft は 2026-09-29 付で更新中） | draft（WG 文書、Informational。Implementer's Drafts・Final とも「None yet」）[N] | 2025-04-18 | — | 2026-10-03 | https://openid.net/specs/ipsie-openid-connect-sl1-profile-1_0.html | 参照（同上） [D] | 四半期（次回 2027-01-03） | RS-14 |
| SS-C21 | OIDF Certified OpenID Providers & Profiles（認定一覧） | OpenID Foundation | 公開一覧（随時更新） | 公開記録 [N] | 記載なし | — | 2026-10-03 | https://openid.net/certification/certified-openid-providers-profiles/ | 参照（製品評価 DL-13 の評価軸） [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-C22 | OIDF Certified FAPI 2.0 OP Security Profile Final & Message Signing Final（認定一覧） | OpenID Foundation | 公開一覧（随時更新） | 公開記録 [N] | 記載なし | — | 2026-10-03 | https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/ | 参照（同上） [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-C23 | OIDF Self-Certification Fees | OpenID Foundation | 版表記なし | 公開（随時改定）[N] | 記載なし | — | 2026-10-03 | https://openid.net/certification/fees/ | 参照 [D] | 年次（次回 2027-10-03） | RS-15 |

### 4.4 W3C・FIDO Alliance・OASIS・ISO・DMTF・IANA（18 件）

更新所有者（案）: CTO 室（標準担当） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-D01 | Web Authentication: An API for accessing Public Key Credentials Level 3 | W3C | REC-webauthn-3-20260825 | final（W3C Recommendation）[N] | 2026-08-25 | — | 2026-10-03 | https://www.w3.org/TR/webauthn-3/ | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-15 |
| SS-D02 | Trace Context（Level 1） | W3C | Level 1 | final（W3C Recommendation）[N] | 2021-11-23 | — | 2026-10-03 | https://www.w3.org/TR/trace-context/ | 準拠基準（traceparent・tracestate に個人識別情報を入れない） [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-D03 | Trace Context Level 2 | W3C | Level 2 | draft（Candidate Recommendation Draft）[N] | 2024-03-28 | — | 2026-10-03 | https://www.w3.org/TR/trace-context-2/ | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-D04 | Baggage | W3C | — | draft（Candidate Recommendation Snapshot）[N] | 2024-05-30 | — | 2026-10-03 | https://www.w3.org/TR/baggage/ | 参照（認可文脈を baggage に載せない設計の根拠。§7） [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-D05 | Device Bound Session Credentials（DBSC） | W3C（WebAppSec WG） | FPWD（WD-dbsc-1-20250821）／Editor's Draft（2026-09-08） | draft（W3C 公表版は FPWD のみ。ED は作業中）[N] | 2025-08-21（ED 2026-09-08） | — | 2026-10-03 | https://www.w3.org/TR/2025/WD-dbsc-1-20250821/ , https://w3c.github.io/webappsec-dbsc/ | 監視のみ（session 窃取対策の PoC 候補） [D] | 四半期（次回 2027-01-03） | RS-13 |
| SS-D06 | Inaccessibility of CAPTCHA | W3C | Group Draft Note | 非規範 Note [N] | 2021-12-16 | — | 2026-10-03 | https://www.w3.org/TR/turingtest/ | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-D07 | FIDO Credential Exchange Format（CXF） | FIDO Alliance | v1.0 ps-errata-20260309 | final（Proposed Standard）[N] | 2026-03-09 | — | 2026-10-03 | https://fidoalliance.org/specs/cx/cxf-v1.0-ps-errata-20260309.html | 参照 [D] | 四半期（次回 2027-01-03） | RS-03 |
| SS-D08 | FIDO Credential Exchange Protocol（CXP） | FIDO Alliance | v1.0 wd-20241003 | draft（Working Draft）[N] | 2024-10-03 | — | 2026-10-03 | https://fidoalliance.org/specs/cx/cxp-v1.0-wd-20241003.html | 監視のみ（プロバイダ間の passkey 移行を前提にしない: ADR-018） [D] | 四半期（次回 2027-01-03） | RS-03 |
| SS-D09 | FIDO White Paper: High Assurance Enterprise FIDO Authentication | FIDO Alliance | — | 白書（非規範）[N] | 掲載ページ表示 2024-08-29 | — | 2026-10-03 | https://fidoalliance.org/white-paper-high-assurance-enterprise-fido-authentication/ | 参照 [D] | 年次（次回 2027-10-03） | RS-03 |
| SS-D10 | SAML V2.0 Core（Assertions and Protocols） | OASIS | saml-core-2.0-os | final（OASIS Standard）[N] | 2005-03-15 | — | 2026-10-03 | https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf | 準拠基準（顧客 IdP との federation） [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-D11 | SAML V2.0 Profiles | OASIS | saml-profiles-2.0-os | final（OASIS Standard）[N] | 2005-03-15 | — | 2026-10-03 | https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf | 準拠基準（IdP 起点の unsolicited response は既定で無効） [D] | 年次（次回 2027-10-03） | RS-03、RS-14 |
| SS-D12 | ISO/IEC 26131:2024（OpenID Connect Core 1.0 errata set 2） | ISO/IEC JTC 1 | Edition 1 | final（Published 60.60）[N] | 2024-10 | — | 2026-10-03 | https://www.iso.org/standard/89056.html | 参照（OIDC Core と同内容の ISO 版） [D] | 年次（次回 2027-10-03） | RS-03 |
| SS-D13 | ISO/IEC 27001:2022 | ISO/IEC JTC 1/SC 27 | 第3版 | final（Published 60.60。改訂中の表示なし）[N] | 2022-10 | — | 2026-10-03 | https://www.iso.org/standard/27001 | 参照（認証取得の要否は組織決定） [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-D14 | ISO/IEC 27001:2022/Amd 1:2024 Climate action changes | ISO/IEC JTC 1/SC 27 | Amd 1 | final（Published 60.60）[N] | 2024-02 | — | 2026-10-03 | https://www.iso.org/standard/88435.html | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-D15 | ISO/IEC 27005:2022 | ISO/IEC JTC 1/SC 27 | 第4版 | final（Published 60.60）[N] | 2022-10 | — | 2026-10-03 | https://www.iso.org/standard/80585.html | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-D16 | DSP0262 CADF Data Format and Interface Definitions | DMTF | 1.0.0 | final（DMTF Standard。以後の本体改訂は確認できず）[N] | 2014-06-19 | — | 2026-10-03 | https://www.dmtf.org/sites/default/files/standards/documents/DSP0262_1.0.0.pdf | 参照（監査 export 形式の候補: ADR-018） [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-D17 | DSP2038 CADF OpenStack Profile | DMTF | 1.1.0 | final（DMTF Informational。本文は未読）[N] | 2015-04-16（DMTF 標準ページの表示） | — | 2026-10-03 | https://www.dmtf.org/standards/cadf | 参照 [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-D18 | DNSSEC Practice Statement for the Root Zone KSK Operator | IANA | 第8版 | 有効（運用方針文書）[N] | 2025-04-14 | — | 2026-10-03 | https://www.iana.org/dnssec/procedures/ksk-operator/ksk-dps-20250414.html | 参照（key ceremony の公開事例） [D] | 年次（次回 2027-10-03） | RS-05 |

### 4.5 NIST・米国連邦機関の技術文書と指針（46 件）

更新所有者（案）: CISO 室（暗号・鍵管理の文書は CTO 室と共同） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-E01 | NIST CSWP 29 The NIST Cybersecurity Framework（CSF）2.0 | NIST | 2.0 | final（後継版・draft の掲示なし）[N] | 2024-02-26 | — | 2026-10-03 | https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final | 準拠基準（マッピング対象: R-026） [D] | 年次（次回 2027-10-03） | RS-01、RS-13 |
| SS-E02 | NIST SP 1303 CSF 2.0 Enterprise Risk Management Quick-Start Guide | NIST | — | final [N] | 2024-10-21 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/1303/final | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E03 | NIST IR 8286 Rev.1 Integrating Cybersecurity and Enterprise Risk Management | NIST | Rev.1 | final（ipd 2025-02-26。原版は 2025-12-18 撤回）[N] | 2025-12-18 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8286/r1/final | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E04 | NIST IR 8286A Rev.1 Identifying and Estimating Cybersecurity Risk for ERM | NIST | Rev.1 | final（原版は 2025-12-18 撤回）[N] | 2025-12-18 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8286/a/r1/final | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E05 | NIST IR 8286B-upd1 Prioritizing Cybersecurity Risk for ERM | NIST | upd1 | final（2022-02 版を置換）[N] | 2025-02-26 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8286/b/upd1/final | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E06 | NIST IR 8286C Rev.1 Staging Cybersecurity Risks for ERM and Governance Oversight | NIST | Rev.1 | final（ipd は 2025-12-18 に obsolete）[N] | 2025-12 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8286/c/r1/final | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E07 | NIST IR 8286D-upd1 Using Business Impact Analysis to Inform Risk Prioritization and Response | NIST | upd1 | final（2022-11 版を置換）[N] | 2025-02-26 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8286/d/upd1/final | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E08 | NIST SP 800-37 Rev.2 Risk Management Framework | NIST | Rev.2 | final（Rev.3 の掲示なし）[N] | 2018-12-20 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/37/r2/final | 参照（受容権限の非委任性） [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E09 | NIST SP 800-63-4 Digital Identity Guidelines | NIST | Rev.4 | final [N] | 2025-07-31 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/4/final | 準拠基準（保証レベルの枠組み。マッピング対象: R-026） [D] | 年次（次回 2027-10-03） | RS-03、RS-13 |
| SS-E10 | NIST SP 800-63A-4 Identity Proofing and Enrollment | NIST | Rev.4 | final [N] | 2025-07-31 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/a/4/final | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-13 |
| SS-E11 | NIST SP 800-63B-4 Authentication and Authenticator Management | NIST | Rev.4 | final [N] | 2025-07-31 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/b/4/final | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-13、RS-15 |
| SS-E12 | NIST SP 800-63C-4 Federation and Assertions | NIST | Rev.4 | final [N] | 2025-07-31 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/c/4/final | 準拠基準 [D] | 年次（次回 2027-10-03） | RS-03、RS-13、RS-14 |
| SS-E13 | NIST SP 800-53 Rev.5 Security and Privacy Controls | NIST | Rev.5（Release 5.2.0） | final（Release 5.2.0 は minor release）[N]（差異 Δ-17） | 2020-09（2020-12-10 更新を含む）。Release 5.2.0 は 2025-08-27[^27] | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final | 参照（統制カタログ。06_controls のマッピング先） [D] | 半年（次回 2027-04-03） | RS-05、RS-08、RS-09、RS-10、RS-16 |
| SS-E14 | NIST SP 800-53A Rev.5 Assessing Security and Privacy Controls | NIST | Rev.5（Release 5.2.0） | final [N] | 2022-01（Release 5.2.0 は 2025-08-27） | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/a/r5/final | 参照 [D] | 半年（次回 2027-04-03） | RS-08 |
| SS-E15 | NIST SP 800-53B Control Baselines | NIST | Release 5.2.0（OSCAL profile 5.2.0） | final（Release 5.2.0 はベースライン変更なし）[N] | 2020-09（2020-12-10 更新を含む。5.2.0 は 2025-08-27） | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final | 参照 [D] | 半年（次回 2027-04-03） | RS-08 |
| SS-E16 | NIST SP 800-207 Zero Trust Architecture | NIST | 初版 | final [N] | 2020-08 | — | 2026-10-03 | https://doi.org/10.6028/NIST.SP.800-207 | 参照 [D] | 年次（次回 2027-10-03） | RS-08、RS-09 |
| SS-E17 | NIST SP 800-207A | NIST | — | final [N] | 2023-09 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/207/a/final | 参照 [D] | 年次（次回 2027-10-03） | RS-06 |
| SS-E18 | NIST IR 8587 Protecting Tokens and Assertions from Forgery, Theft, and Misuse | NIST | — | final [N] | 2026-09 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8587/final | 参照（workload の短命・範囲限定 token の根拠） [D] | 半年（次回 2027-04-03） | RS-06 |
| SS-E19 | NCCoE concept paper: Software and AI Agent Identity and Authorization | NIST NCCoE | ipd | draft（Initial Public Draft の concept paper。意見募集は 2026-04-02 終了。その後の段階は未確認）[N] | 2026-02-05 | — | 2026-10-03 | https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-E20 | NIST AI 100-2 E2025 Adversarial Machine Learning | NIST | E2025 | final（2025-06-03 付で誤記の存在と将来更新予定の注記あり）[N] | 2025-03 | — | 2026-10-03 | https://doi.org/10.6028/NIST.AI.100-2e2025 | 参照 [D] | 半年（次回 2027-04-03） | RS-08 |
| SS-E21 | NIST SP 800-57 Part 1 Rev.5 Recommendation for Key Management | NIST | Rev.5 | final（現行。Rev.6 は ipd）[N] | 2020-05-04 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final | 参照（鍵管理規範の基礎） [D] | 四半期（次回 2027-01-03） | RS-05 |
| SS-E22 | NIST SP 800-57 Part 1 Rev.6 | NIST | Rev.6 ipd | ipd（意見募集 2026-02-05 締切、final 未公表）[N] | 2025-12-05 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/57/pt1/r6/ipd | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-05 |
| SS-E23 | NIST SP 800-130 A Framework for Designing Cryptographic Key Management Systems | NIST | — | final [N] | 2013-08-15 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/130/final | 参照 [D] | 年次（次回 2027-10-03） | RS-05 |
| SS-E24 | NIST SP 800-152 A Profile for U.S. Federal Cryptographic Key Management Systems | NIST | — | final [N] | 2015-10-28 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/152/final | 参照 [D] | 年次（次回 2027-10-03） | RS-05 |
| SS-E25 | FIPS 140-3 Security Requirements for Cryptographic Modules | NIST | — | final [N] | 2019-03-22 | — | 2026-10-03 | https://csrc.nist.gov/pubs/fips/140-3/final | 準拠基準（鍵保管 HSM・KMS の調達要件。適用範囲は ADR-007） [D] | 年次（次回 2027-10-03） | RS-05 |
| SS-E26 | FIPS 140-2 認証（CMVP の移行） | NIST CMVP | — | 失効（予定表上 2026-09-22 に全証明書を Historical List へ移す。確認日の抽出照合 5 件は全件 Historical）[N] | — | — | 2026-10-03 | https://csrc.nist.gov/projects/fips-140-3-transition-effort | 不採用（新規調達で FIPS 140-2 認証を根拠にしない） [D] | 年次（次回 2027-10-03） | RS-05 |
| SS-E27 | FIPS 203 Module-Lattice-Based Key-Encapsulation Mechanism（ML-KEM） | NIST | — | final（errata・改訂予告あり）[N] | 2024-08-13 | — | 2026-10-03 | https://csrc.nist.gov/pubs/fips/203/final | 参照（PQ 移行） [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-E28 | FIPS 204 Module-Lattice-Based Digital Signature Standard（ML-DSA） | NIST | — | final（errata あり）[N] | 2024-08-13 | — | 2026-10-03 | https://csrc.nist.gov/pubs/fips/204/final | 参照（PQ 移行） [D][A-103] | 四半期（次回 2027-01-03） | RS-05、RS-11 |
| SS-E29 | FIPS 205 Stateless Hash-Based Digital Signature Standard（SLH-DSA） | NIST | — | final [N] | 2024-08-13 | — | 2026-10-03 | https://csrc.nist.gov/pubs/fips/205/final | 参照 [D][A-103] | 年次（次回 2027-10-03） | RS-11 |
| SS-E30 | FIPS 206 FN-DSA | NIST | — | 未公表（CSRC に ipd・final とも掲載なし）[N] | — | — | 2026-10-03 | https://csrc.nist.gov/publications/fips | 監視のみ [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-E31 | NIST SP 800-227 Recommendations for Key-Encapsulation Mechanisms | NIST | — | final [N] | 2025-09-18 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/227/final | 参照 [D][A-103] | 年次（次回 2027-10-03） | RS-11 |
| SS-E32 | NIST IR 8547 Transition to Post-Quantum Cryptography Standards | NIST | ipd | ipd（意見募集 2025-01-10 締切、final 未公表）[N] | 2024-11-12 | — | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8547/ipd | 監視のみ（期限の計画値は final の規範で裏付ける。§7） [D][A-103] | 四半期（次回 2027-01-03） | RS-05、RS-11 |
| SS-E33 | NIST SP 800-131A Rev.2 Transitioning the Use of Cryptographic Algorithms and Key Lengths | NIST | Rev.2 | final（現行。Rev.3 は ipd）[N] | 2019-03-21 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/131/a/r2/final | 参照 [D] | 四半期（次回 2027-01-03） | RS-11 |
| SS-E34 | NIST SP 800-131A Rev.3 | NIST | Rev.3 ipd | ipd（意見募集 2024-12-04 締切、final 未公表）[N] | 2024-10-21 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd | 監視のみ [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-E35 | NIST CSWP 39 Considerations for Achieving Crypto Agility | NIST | upd1 | final（初版 2025-12-19 を置換）[N] | 2026-06-29 | — | 2026-10-03 | https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final | 参照（ADR-015 の入力） [D] | 年次（次回 2027-10-03） | RS-11 |
| SS-E36 | NIST SP 800-218 Secure Software Development Framework（SSDF） | NIST | 1.1 | final（現行。1.2 は ipd）[N] | 2022-02 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/218/final | 準拠基準（マッピング対象: R-026） [D] | 四半期（次回 2027-01-03） | RS-05 |
| SS-E37 | NIST SP 800-218 Rev.1（SSDF 1.2） | NIST | 1.2 ipd | ipd（意見募集 2026-01-30 締切、final 未公表）[N] | 2025-12-17 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/218/r1/ipd | 監視のみ（final 公表時に 1.1 とのマッピング差分を取る） [D] | 四半期（次回 2027-01-03） | RS-05 |
| SS-E38 | NIST SP 800-92 Guide to Computer Security Log Management | NIST | 初版 | final（Rev.1 で置換予定）[N] | 2006-09-13 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/92/final | 参照 [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-E39 | NIST SP 800-92 Rev.1 | NIST | Rev.1 ipd | ipd（意見期限 2023-11-29。CSRC 表示は "addressing public comments"）[N] | 2023-10-11 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/92/r1/ipd | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-E40 | NIST SP 800-88 Rev.2 Guidelines for Media Sanitization | NIST | Rev.2 | final（Rev.1 を置換）[N] | 2025-09 | — | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/88/r2/final | 参照 [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-E41 | NSA CNSA 2.0 Cybersecurity Advisory（Algorithms） | NSA | Ver.1.0 | 公表済（国家安全保障システム向け）[N] | 2022-09 | — | 2026-10-03 | https://media.defense.gov/2025/May/30/2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF | 参照（期限の比較対象。本基盤は NSS ではない） [D] | 半年（次回 2027-04-03） | RS-11 |
| SS-E42 | NSA CNSA 2.0 FAQ | NSA | Ver.2.1 | 公表済（国家安全保障システム向け）[N] | 2024-12 | — | 2026-10-03 | https://media.defense.gov/2022/Sep/07/2003071836/-1/-1/1/CSI_CNSA_2.0_FAQ_.PDF | 参照 [D] | 半年（次回 2027-04-03） | RS-11 |
| SS-E43 | CISA Product Categories for Technologies That Use Post-Quantum Cryptography Standards | CISA | — | 公表済（随時更新）[N] | 2026-01-23 | — | 2026-10-03 | https://www.cisa.gov/resources-tools/resources/product-categories-technologies-use-post-quantum-cryptography-standards | 参照 [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-E44 | CISA Product Security Bad Practices | CISA | Version 2.0 | 公表済（政府指針、拘束力なし）[N] | 2025-01-17 | — | 2026-10-03 | https://www.cisa.gov/resources-tools/resources/product-security-bad-practices | 参照 [D] | 半年（次回 2027-04-03） | RS-14 |
| SS-E45 | CISA Corporate Cyber Governance: Owning Cyber Risk at the Board Level | CISA | — | 公表済（機関ブログ、非拘束。確認日時点で「Archived Content」表示）[N] | 2025-01-08 | — | 2026-10-03 | https://www.cisa.gov/news-events/news/corporate-cyber-governance-owning-cyber-risk-board-level | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-E46 | GAO Cost Estimating and Assessment Guide | 米国 GAO | GAO-20-195G | final [N] | 2020-03-12 | — | 2026-10-03 | https://www.gao.gov/products/gao-20-195g | 参照（TCO 見積り手法） [D] | 年次（次回 2027-10-03） | RS-15 |

### 4.6 日本の法令・政府基準・業界指針（31 件）

更新所有者（案）: 法務責任者＋個人情報保護責任者（業界指針は CISO 室と共同） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-F01 | 個人情報の保護に関する法律 | 日本国（法律） | 平成 15 年法律第 57 号（e-Gov 現行版: 2026-10-01 施行分まで反映） | 施行済（令和 8 年法律第 56 号ほかの未施行改正あり。差異 Δ-09）[N] | 2003-05-30 公布 | 現行版は 2026-10-01 施行分まで反映。未施行の改正: 令和 8 年法律第 56 号（2027-01-17、政令で定める日）ほか他法による改正 4 件[^16] | 2026-10-03 | https://laws.e-gov.go.jp/law/415AC0000000057 | 準拠基準（適用判定は DL-34） [D][A-060] | 月次（次回 2026-11-03） | RS-02、RS-10、RS-13、RS-14 |
| SS-F02 | 個人情報の保護に関する法律施行規則 | 個人情報保護委員会 | 平成 28 年個人情報保護委員会規則第 3 号（e-Gov 現行版: 2026-06-14 施行分まで反映） | 施行済 [N] | — | 現行版は 2026-06-14 施行分まで反映 | 2026-10-03 | https://laws.e-gov.go.jp/law/428M60020000003 | 準拠基準 [D][A-060] | 月次（次回 2026-11-03） | RS-02、RS-13 |
| SS-F03 | 個人情報の保護に関する法律等の一部を改正する法律 | 日本国（法律） | 令和 8 年法律第 56 号 | 公布済未施行（附則の一部だけ施行済み。本則の改正規定は未施行）[N]（差異 Δ-09） | 2026-07-17 公布（成立 2026-07-10: RS-02） | 附則第 13 条・第 16 条・第 17 条: 2026-07-17。附則第 1 条第 3 号の規定: 2027-01-17。その他: 公布から 2 年以内の政令で定める日（e-Gov の仮置き 2028-07-16）[^16][^17] | 2026-10-03 | https://laws.e-gov.go.jp/api/2/law_revisions/415AC0000000057 | 準拠基準（施行前。施行日までに対応を計画） [D][A-060] | 月次（次回 2026-11-03） | RS-02、RS-10、RS-13、RS-14 |
| SS-F04 | 個人情報の保護に関する法律についてのガイドライン（通則編） | 個人情報保護委員会 | 平成 28 年 11 月（令和 8 年 6 月一部改正） | final [N] | 2026-06 | — | 2026-10-03 | https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/ | 準拠基準 [D][A-060] | 四半期（次回 2027-01-03） | RS-02、RS-10 |
| SS-F05 | 個人情報の保護に関する法律についてのガイドライン（外国にある第三者への提供編） | 個人情報保護委員会 | 令和 7 年 12 月一部改正 | final [N] | 2025-12 | — | 2026-10-03 | https://www.ppc.go.jp/files/pdf/251212_guidelines02.pdf | 準拠基準 [D][A-060] | 四半期（次回 2027-01-03） | RS-10 |
| SS-F06 | 「個人情報の保護に関する法律についてのガイドライン」に関する Q&A | 個人情報保護委員会 | Web 版（項目ごとに更新日） | 現行（監督機関の解釈。法令ではない）[N] | 項目別 | — | 2026-10-03 | https://www.ppc.go.jp/personalinfo/faq/APPI_QA/ | 参照 [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-F07 | ISMAP 管理基準 | ISMAP 運営委員会 | 令和 2 年 6 月 3 日（令和 6 年 7 月 1 日最終改定） | final [N] | 2024-07-01 | — | 2026-10-03 | https://www.ismap.go.jp/csm/sys_attachment.do?sys_id=23f1a570c3f7825041e39551150131b1 | 参照（公共顧客の要求で準拠対象になり得る） [D][A-080] | 四半期（次回 2027-01-03） | RS-02 |
| SS-F08 | ISMAP 管理基準改定案 | ISMAP 運営委員会 | 改定案（2025-12 公表。スケジュール案は 2025-12-25 版と 2026-09-17 更新版） | draft（改定案。改定日・施行日は検討中）[N] | 2025-12 | スケジュール案（2026-09-17）: 2027-05 に関係規程類を改定、施行はそれ以降 | 2026-10-03 | https://www.ismap.go.jp/csm?id=kb_article_view&sysparm_article=KB0012199 | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-02 |
| SS-F09 | 政府機関等のサイバーセキュリティ対策のための統一基準 | サイバーセキュリティ戦略本部（掲載: 国家サイバー統括室） | 令和 7 年度版（2026-09-14 一部改定） | final [N] | 2025-06-27 決定 | 2026-09-14 改定分は 2026-10-01 施行 | 2026-10-03 | https://www.cyber.go.jp/pdf/policy/general/kijyunr7.pdf | 参照（政府系顧客の要求） [D][A-080] | 半年（次回 2027-04-03） | RS-02 |
| SS-F10 | DS-511 行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン | デジタル庁（デジタル社会推進会議幹事会決定） | 初版（DS-500 を全面改定し文書番号を変更） | final（決定。Normative）[N]（差異 Δ-06） | 2025-09-30[^11][^12] | —（2025-09-30 決定） | 2026-10-03 | https://www.digital.go.jp/resources/standard_guidelines | 参照（国の行政機関向け。保証レベル設計の国内参照） [D] | 半年（次回 2027-04-03） | RS-02、RS-03 |
| SS-F11 | DS-512 行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン 解説書 | デジタル庁 | 初版（デジタル社会推進実践ガイドブック） | final（Informative）[N]（差異 Δ-07） | 2026-02-24[^11][^13] | — | 2026-10-03 | https://www.digital.go.jp/resources/standard_guidelines | 参照 [D] | 半年（次回 2027-04-03） | RS-02、RS-03 |
| SS-F12 | 重要電子計算機に対する不正な行為による被害の防止に関する法律（サイバー対処能力強化法） | 日本国（法律） | 令和 7 年法律第 42 号 | 施行済（特別社会基盤事業者の届出・報告等）[N] | 2025-05-23 公布 | 特別社会基盤事業者の報告等: 2026-10-01 | 2026-10-03 | https://www.cas.go.jp/jp/seisaku/cyber_anzen_hosyo_torikumi/index.html | 準拠基準（該当性は DL-34。クラウドが特定重要電子計算機に該当し得る） [D][A-060] | 半年（次回 2027-04-03） | RS-02 |
| SS-F13 | 同法に基づく特定侵害事象等の報告等に関する制度の解説 | 国家サイバー統括室 | 令和 8 年 10 月 1 日版 | final [N] | 2026-10-01 | — | 2026-10-03 | https://www.cyber.go.jp/pdf/policy/infra/cyber_kaisetau_202610.pdf | 参照 [D] | 半年（次回 2027-04-03） | RS-02 |
| SS-F14 | 重要インフラのサイバーセキュリティ対策のための統一基準 | サイバーセキュリティ戦略本部 | 初版 | 施行済 [N] | 2026-07-31 決定 | 2026-10-01 | 2026-10-03 | https://www.cyber.go.jp/policy/group/infra/policy.html | 参照（重要インフラ顧客の要求） [D][A-080] | 半年（次回 2027-04-03） | RS-02 |
| SS-F15 | 金融分野におけるサイバーセキュリティに関するガイドライン | 金融庁 | 2024-10-04 制定、2025-07-04 改正[^14][^15] | final（適用中。2025-07-04 改正は NISC 改組に伴う技術的修正）[N]（差異 Δ-08） | 2024-10-04 | 2024-10-04 適用 | 2026-10-03 | https://www.fsa.go.jp/common/law/cybersecurity_guideline.pdf | 参照（金融顧客の監督上の期待。契約で準拠対象になり得る） [D][A-080] | 半年（次回 2027-04-03） | RS-01、RS-02 |
| SS-F16 | 金融機関等コンピュータシステムの安全対策基準・解説書 | 金融情報システムセンター（FISC） | 第 14 版 | final（本文未取得）[N] | 2026-03-25（PDF 版） | — | 2026-10-03 | https://www.fisc.or.jp/topics/007222.php | 参照 [D][A-080] | 半年（次回 2027-04-03） | RS-02 |
| SS-F17 | 医療情報システムの安全管理に関するガイドライン | 厚生労働省 | 第 7.0 版 | final [N] | 2026-06（通知 2026-06-29） | — | 2026-10-03 | https://www.mhlw.go.jp/stf/shingi/0000516275_00006.html | 参照（医療機関側の要求） [D][A-080] | 半年（次回 2027-04-03） | RS-02 |
| SS-F18 | 医療情報を取り扱う情報システム・サービスの提供事業者における安全管理ガイドライン | 経済産業省・総務省 | 第 2.0 版 | final [N] | 2025-03-28 | — | 2026-10-03 | https://www.meti.go.jp/policy/mono_info_service/healthcare/teikyoujigyousyagl.html | 準拠基準（条件付: 医療顧客を収容する場合） [D][A-080] | 半年（次回 2027-04-03） | RS-02 |
| SS-F19 | 犯罪による収益の移転防止に関する法律施行規則の改正（令和 7 年共同命令第 3 号） | 共同命令（掲載: 警察庁 JAFIC） | 令和 7 年共同命令第 3 号 | 公布済未施行 [N] | 2025-06-24 | 2027-04-01 | 2026-10-03 | https://www.npa.go.jp/sosikihanzai/jafic/hourei/hotop.htm | 参照（特定事業者の顧客が eKYC を使う場合の要件。本基盤は本人確認書類を保持しない） [D][A-070] | 四半期（次回 2027-01-03） | RS-02 |
| SS-F20 | 犯罪による収益の移転防止に関する法律施行規則の改正（対面） | 共同命令（掲載: 警察庁 JAFIC） | 令和 8 年共同命令第 1 号 | 公布済未施行 [N] | 2026-03-06 | 2027-04-01 | 2026-10-03 | https://www.npa.go.jp/sosikihanzai/jafic/hourei/260306/anbun.pdf | 参照 [D][A-070] | 四半期（次回 2027-01-03） | RS-02 |
| SS-F21 | 金融商品取引業者等向けの総合的な監督指針 | 金融庁 | 2025-10-15 改正 | 適用中（同日適用）[N] | 2025-10-15 | 2025-10-15 | 2026-10-03 | https://www.fsa.go.jp/news/r7/shouken/20251015/20251015.html | 参照（証券顧客の不正アクセス対策要件） [D][A-080] | 半年（次回 2027-04-03） | RS-13 |
| SS-F22 | 保険会社向けの総合的な監督指針（Ⅱ－３－１３－２－２ インターネット取引）ほか同日改正の監督指針等 | 金融庁 | 2026-07-17 改正 | 適用中（同日適用）[N] | 2026-07-17 | 2026-07-17 | 2026-10-03 | https://www.fsa.go.jp/news/r8/sonota/20260717-2/20260717.html | 参照 [D][A-080] | 半年（次回 2027-04-03） | RS-13 |
| SS-F23 | インターネット取引における不正アクセス等防止に向けたガイドライン | 日本証券業協会 | 2025-10-15 改正 | 施行中 [N] | 2025-10-15 | 2025-10-15 | 2026-10-03 | https://www.jsda.or.jp/houdou/2025/20251015fuseiaccess-guideline.pdf | 参照 [D][A-080] | 半年（次回 2027-04-03） | RS-13 |
| SS-F24 | クレジットカード・セキュリティガイドライン | クレジット取引セキュリティ対策協議会（掲載: 日本クレジット協会） | 6.1 版 | 公表済み [N] | 2026-03 | — | 2026-10-03 | https://www.j-credit.or.jp/security/pdf/Creditcardsecurityguidelines_6.1_published.pdf | 参照（決済顧客の不正ログイン対策要件） [D][A-080] | 半年（次回 2027-04-03） | RS-13 |
| SS-F25 | サイバーセキュリティ経営ガイドライン | 経済産業省・IPA | Ver3.0 | 最新（経産省ページの最終更新 2023-05-31）[N] | 2023-03-24 | — | 2026-10-03 | https://www.meti.go.jp/policy/netsecurity/mng_guide.html | 参照（統治文書の入力） [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-F26 | コーポレートガバナンス・コード | 東京証券取引所 | 2026 年 7 月版 | 施行済（有価証券上場規程の一部改正）[N] | 2026-07-21 | 2026-07-21 | 2026-10-03 | https://www.jpx.co.jp/equities/listing/cg/ | 参照（上場区分は仮定依存。A-ID 未採番） [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-F27 | 地方公共団体情報システム標準化基本方針 | 日本国（閣議決定。掲載: デジタル庁） | 2024-12-24 改定 | 閣議決定（現行）[N] | 2024-12-24 | — | 2026-10-03 | https://www.digital.go.jp/policies/local_governments | 参照（多ベンダー統治の先例） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-F28 | 地方公共団体情報システム共通機能標準仕様書 | デジタル庁 | 第 2.8 版 | 公表済み（現行）[N] | 2026-09-30 | — | 2026-10-03 | https://www.digital.go.jp/policies/local_governments/common-feature-specification | 参照 [D] | 半年（次回 2027-04-03） | RS-16 |
| SS-F29 | OAuth2.0 アクセストークン発行／情報取得／無効化 API 仕様書（共通機能） | デジタル庁 | 第 1.4 版／第 1.4 版／第 1.3 版 | 公表済み（現行）[N] | 2026-09-30（3 文書とも） | — | 2026-10-03 | https://www.digital.go.jp/policies/local_governments/common-feature-specification | 参照 [D] | 半年（次回 2027-04-03） | RS-16 |
| SS-F30 | GビズID サービス連携 利用規約 | デジタル庁 | version1.3 | 現行 [N] | 2026-07-09 | — | 2026-10-03 | https://gbiz-id.go.jp/top/manual/pdf/rules_for_RP.pdf | 参照（GビズID と連携する場合は準拠対象） [D] | 半年（次回 2027-04-03） | RS-16 |
| SS-F31 | PQC 移行 中間とりまとめ | 内閣官房 | — | 公表済（工程表は 2026 年度策定予定・未掲載）[N] | 令和 7 年 11 月 | — | 2026-10-03 | https://www.cas.go.jp/jp/seisaku/pqc/pdf/report_202511.pdf | 参照 [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |

### 4.7 EU・英国の法令・規制文書・判例（29 件）

更新所有者（案）: 法務責任者＋個人情報保護責任者 [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-G01 | 一般データ保護規則（GDPR） | 欧州議会・EU 理事会 | Regulation (EU) 2016/679（OJ L 119） | 適用中 [N] | 2016-04-27 採択、2016-05-04 官報掲載 | 2016-05-24 発効、2018-05-25 適用（第 99 条）[^34] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng | 準拠基準（適用判定は DL-34） [D][A-060] | 半年（次回 2027-04-03） | RS-02、RS-10、RS-13、RS-14 |
| SS-G02 | Digital Omnibus 提案（GDPR 改正を含む） | 欧州委員会 | COM(2025) 836 | 提案（立法手続の状態は未確認）[N] | 2025-11（EDPB-EDPS 意見の記載による） | — | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_edps_jointopinion_202602_digitalomnibus_en.pdf | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-G03 | EDPB Guidelines 05/2021（GDPR 第 3 条と第 V 章の関係） | EDPB | Version 2.0 | final（意見募集後に採択）[N] | 2023-02-14 | — | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf | 参照（遠隔アクセスと移転の判定） [D] | 半年（次回 2027-04-03） | RS-10 |
| SS-G04 | EDPB Guidelines 01/2025 on Pseudonymisation | EDPB | 意見募集版 | draft（意見募集 2025-01-17〜03-14。final 版は未確認）[N] | 2025-01-16 採択（意見募集版） | — | 2026-10-03 | https://www.edpb.europa.eu/public-consultations/guidelines-012025-on-pseudonymisation_en | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-G05 | EDPB Guidelines 02/2025 on processing of personal data through blockchain technologies | EDPB | Version 1.1 | draft（意見募集版、期限 2025-06-09。final 版は未確認）[N] | 2025-04-08 | — | 2026-10-03 | https://www.edpb.europa.eu/system/files/2025-04/edpb_guidelines_202502_blockchain_en.pdf | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-G06 | EDPB CEF 2025 報告書（right to erasure） | EDPB | — | 採択（執行調査報告、非拘束）[N] | 2026-02-10 採択（公表 2026-02-18） | — | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_cef-report_2025_right-to-erasure_en.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-G07 | EDPB-EDPS Joint Opinion 2/2026（Digital Omnibus） | EDPB・EDPS | — | 採択（意見、非拘束）[N] | 2026-02-10 | — | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_edps_jointopinion_202602_digitalomnibus_en.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-G08 | EDPB 書簡（US Supreme Court judgment Trump v. Slaughter） | EDPB（議長名） | — | 送付済み（非拘束）[N] | 2026-07-31 | — | 2026-10-03 | https://www.edpb.europa.eu/system/files/2026-08/edpb_letter_20260731_us_supremecourt_judgment_trump_v_slaughter_en.pdf | 参照（EU-US DPF の動向） [D] | 月次（次回 2026-11-03） | RS-10 |
| SS-G09 | CJEU C-579/21 Pankki S | EU 司法裁判所 | 判決 | 確定判決（先決裁定）[N] | 2023-06-22 | — | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62021CJ0579 | 参照（照会記録の開示範囲） [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-G10 | CJEU C-413/23 P EDPS v SRB | EU 司法裁判所 | 判決 | 確定判決（上訴審）[N] | 2025-09-04 | — | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62023CJ0413 | 参照（個人データ概念と仮名化データ） [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-G11 | EU-US Data Privacy Framework 十分性認定 | 欧州委員会 | Implementing Decision (EU) 2023/1795 | 有効（一般裁判所 T-553/23 が 2025-09-03 に取消請求を棄却。上訴 C-703/25 P が係属し、上訴審の判決の有無は未確認）[N]（差異 Δ-11）[^20] | 2023-07-10 採択 | — | 2026-10-03 | https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en | 参照（EU→米国移転の根拠候補。適否は DL-34） [D][A-060] | 月次（次回 2026-11-03） | RS-02、RS-10 |
| SS-G12 | 上訴 C-703/25 P（Latombe v Commission） | EU 司法裁判所 | OJ C/2025/6610 | 係属中（2025-10-31 提起）[N]（差異 Δ-11） | 2025-12-22 官報掲載[^21] | — | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62025CN0703 | 監視のみ [D] | 月次（次回 2026-11-03） | RS-10 |
| SS-G13 | 英国に対する GDPR 十分性認定（更新） | 欧州委員会 | 2031-12-27 まで | 有効 [N] | 2025-12-19（IP/25/3059 の公表日） | — | 2026-10-03 | https://ec.europa.eu/commission/presscorner/detail/en/ip_25_3059 | 参照 [D][A-060] | 半年（次回 2027-04-03） | RS-02 |
| SS-G14 | UK GDPR | 英国（保持 EU 法） | legislation.gov.uk 改正反映版（2026-09-30 の情報委員会への移行に伴う改正を反映） | 施行済 [N] | — | 現行版は 2026-09-30 施行の改正まで反映 | 2026-10-03 | https://www.legislation.gov.uk/eur/2016/679/article/33 | 準拠基準 [D][A-060] | 半年（次回 2027-04-03） | RS-02 |
| SS-G15 | Data (Use and Access) Act 2025 第 9 次施行規則（情報コミッショナー職の廃止・情報委員会への機能移管） | 英国（DSIT 所管の施行規則） | S.I. 2026/1015 | 施行済 [N] | 2026 | 2026-09-30 | 2026-10-03 | https://www.legislation.gov.uk/uksi/2026/1015/contents/made | 参照（通知先の変更） [D] | 半年（次回 2027-04-03） | RS-02 |
| SS-G16 | NIS2 指令 | 欧州議会・EU 理事会 | Directive (EU) 2022/2555（OJ L 333） | 発効済（加盟国の国内法化を要する。国内法化の状況と改正動向は未確認）[N]（差異 Δ-12） | 2022-12-14 採択、2022-12-27 官報掲載 | 2023-01-16 発効（第 45 条）。加盟国の国内措置は 2024-10-17 までに採択し 2024-10-18 から適用（第 41 条）[^19] | 2026-10-03 | https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng | 準拠基準（該当性は DL-34） [D][A-060] | 半年（次回 2027-04-03） | RS-01、RS-02 |
| SS-G17 | NIS2 実施規則（技術的・方法論的要件） | 欧州委員会 | Implementing Regulation (EU) 2024/2690 | 適用中 [N] | 2024-10-17 採択、2024-10-18 官報掲載 | 2024-11-07 発効（第 16 条、官報掲載日から算出）[^28] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng | 準拠基準（条件付: 対象事業者に該当する場合） [D][A-060] | 半年（次回 2027-04-03） | RS-02、RS-10 |
| SS-G18 | デジタル・オペレーショナル・レジリエンス法（DORA） | 欧州議会・EU 理事会 | Regulation (EU) 2022/2554（OJ L 333） | 適用中 [N]（差異 Δ-10） | 2022-12-14 採択、2022-12-27 官報掲載 | 2023-01-16 発効、2025-01-17 適用（第 64 条）[^18] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng | 準拠基準（条件付: 金融顧客の ICT 第三者として契約要件を受ける場合） [D][A-080] | 半年（次回 2027-04-03） | RS-02、RS-14、RS-15 |
| SS-G19 | DORA RTS（ICT リスク管理枠組み） | 欧州委員会 | Delegated Regulation (EU) 2024/1774 | 現行 [N] | 2024-03-13 採択、2024-06-25 官報掲載 | 2024-07-15 発効（第 42 条、官報掲載日から算出）[^29] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj | 参照（金融顧客の要求。ログ障害検知等） [D][A-080] | 半年（次回 2027-04-03） | RS-10 |
| SS-G20 | DORA インシデント報告の委任規則 | 欧州委員会 | Delegated Regulation (EU) 2025/301 | 適用中 [N] | 2024-10-23 採択、2025-02-20 官報掲載 | 2025-03-12 発効（第 7 条、官報掲載日から算出）[^30] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg_del/2025/301/oj/eng | 参照 [D][A-080] | 半年（次回 2027-04-03） | RS-02 |
| SS-G21 | eIDAS 改正規則（European Digital Identity Framework） | 欧州議会・EU 理事会 | Regulation (EU) 2024/1183 | 発効済（ウォレット関連の期限は実施法令の発効が起算点）[N] | 2024-04-11 採択、2024-04-30 官報掲載 | 2024-05-20 発効（第 2 条、官報掲載日から算出）[^31] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2024/1183/oj/eng | 参照 [D] | 半年（次回 2027-04-03） | RS-02 |
| SS-G22 | EUDI ウォレット実施規則（PID・属性証明） | 欧州委員会 | Implementing Regulation (EU) 2024/2977 | 発効済 [N] | 2024-11-28 採択、2024-12-04 官報掲載 | 2024-12-24 発効 | 2026-10-03 | https://eur-lex.europa.eu/eli/reg_impl/2024/2977/oj/eng | 参照 [D] | 半年（次回 2027-04-03） | RS-02 |
| SS-G23 | EU データ法（Data Act） | 欧州議会・EU 理事会 | Regulation (EU) 2023/2854 | 適用中 [N] | 2023-12-13 採択、2023-12-22 官報掲載 | 2024-01-11 発効、2025-09-12 適用（第 3 条第 1 項は 2026-09-12 以降に上市の製品、第 29 条の切替料金禁止は 2027-01-12 から）[^33] | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng | 準拠基準（条件付: データ処理サービスの切替義務。DL-34 で判定） [D][A-060] | 四半期（次回 2027-01-03） | RS-02、RS-15 |
| SS-G24 | 委員会勧告 (EU) 2024/1101（PQC への協調移行） | 欧州委員会 | Recommendation (EU) 2024/1101 | 採択済（勧告、拘束力なし）[N] | 2024-04-11 | — | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401101 | 参照 [D][A-103] | 半年（次回 2027-04-03） | RS-11 |
| SS-G25 | EU PQC Coordinated Implementation Roadmap | EU PQC Workstream（掲載: 欧州委員会） | Part 1 v1.1 | 公表済 [N] | 2025-06-11（掲載 2025-06-23） | — | 2026-10-03 | https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography | 参照 [D][A-103] | 半年（次回 2027-04-03） | RS-11 |
| SS-G26 | PQC migration timelines | 英国 NCSC | Version 1.0 | 公表済 [N] | 2025-03-20（メタデータ dateModified 2026-08-03） | — | 2026-10-03 | https://www.ncsc.gov.uk/guidance/pqc-migration-timelines | 参照 [D][A-103] | 半年（次回 2027-04-03） | RS-11 |
| SS-G27 | Cyber Governance Code of Practice | 英国 DSIT | — | 公表済（gov.uk 上の分類は Guidance。法的拘束力の記載なし）[N] | 2025-04-08 | — | 2026-10-03 | https://www.gov.uk/government/publications/cyber-governance-code-of-practice/cyber-governance-code-of-practice | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-G28 | PSD2 RTS（強固な顧客認証と安全な通信） | 欧州委員会 | Delegated Regulation (EU) 2018/389（OJ L 69） | 施行中 [N] | 2017-11-27 採択、2018-03-13 官報掲載 | 2018-03-14 発効、2019-09-14 適用（第 38 条。第 30 条第 3 項・第 5 項は 2019-03-14）[^32] | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 | 参照（決済顧客の SCA 要件） [D][A-080] | 半年（次回 2027-04-03） | RS-13 |
| SS-G29 | EU Payment Services Regulation（PSR）／PSD3 | 欧州議会・EU 理事会 | 暫定合意文 | draft（暫定合意 2025-11-27、ECON 承認 2026-05-05、正式採択前）[N] | — | — | 2026-10-03 | https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-revision-of-eu-rules-on-payment-services | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-13 |

### 4.8 米国の法令・規制・政策文書（18 件）

更新所有者（案）: 法務責任者 [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-H01 | Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure（最終規則） | 米国 SEC | Release No. 33-11216 | 施行済（8-K Item 1.05 撤廃の請願あり。SEC の対応は未確認）[N] | 2023-07-26 | 2023-09-05 発効 | 2026-10-03 | https://www.sec.gov/rules-regulations/2023/07/s7-09-22 | 参照（上場区分は仮定依存。A-ID 未採番） [D] | 半年（次回 2027-04-03） | RS-01 |
| SS-H02 | 17 CFR §229.106（Regulation S-K Item 106） | 米国 SEC | 2023-09-05 版 | 現行（eCFR は 2026-10-01 まで更新済み）[N] | 2023-08-04 | 2023-09-05 | 2026-10-03 | https://www.ecfr.gov/current/title-17/section-229.106 | 参照 [D] | 半年（次回 2027-04-03） | RS-01 |
| SS-H03 | SEC Form 8-K Item 1.05 | 米国 SEC | 現行様式 | 施行済 [N] | — | — | 2026-10-03 | https://www.sec.gov/files/form8-k.pdf | 参照（侵害通知の時計） [D] | 半年（次回 2027-04-03） | RS-02 |
| SS-H04 | CCPA 規則（サイバーセキュリティ監査等） | California Privacy Protection Agency | 2026-01-01 発効版 | 施行済（監査証明の提出は 2028〜2030 の段階適用）[N] | 2025-09-23 承認公表 | 2026-01-01 | 2026-10-03 | https://cppa.ca.gov/announcements/2025/20250923.html | 準拠基準（条件付: カリフォルニア州住民のデータ。DL-34） [D][A-060] | 半年（次回 2027-04-03） | RS-02 |
| SS-H05 | California Civil Code §1798.82（侵害通知） | カリフォルニア州 | 現行（SB 446、2025 年法律第 319 章による改正） | 施行済 [N] | — | 改正は 2026-01-01 施行 | 2026-10-03 | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82 | 準拠基準（条件付） [D][A-060] | 半年（次回 2027-04-03） | RS-02 |
| SS-H06 | California Civil Code §1798.105（CCPA 削除権） | カリフォルニア州 | Prop.24 による改正 | 現行 [N] | — | 2020-12-16 発効、2023-01-01 運用開始 | 2026-10-03 | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.105 | 準拠基準（条件付） [D][A-060] | 半年（次回 2027-04-03） | RS-10 |
| SS-H07 | HIPAA Security Rule（45 CFR Part 164 Subpart C。§164.312 ほか） | 米国 HHS | eCFR 現行（§164.312・§164.316 の版は 2016-12-30。eCFR は 2026-10-01 まで更新） | 施行済 [N]（差異 Δ-13） | — | — | 2026-10-03 | https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312 | 準拠基準（条件付: 医療顧客の Business Associate になる場合） [D][A-080] | 四半期（次回 2027-01-03） | RS-02、RS-10 |
| SS-H08 | HIPAA Security Rule 改正 NPRM | 米国 HHS | 90 FR 898（RIN 0945-AA22） | NPRM（2026 Unified Agenda で Long-Term Actions、Final Action の目標 2027-07）[N]（差異 Δ-13）[^25][^26] | 2025-01-06 | — | 2026-10-03 | https://www.federalregister.gov/documents/2025/01/06/2024-30983 | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-02、RS-10 |
| SS-H09 | CIRCIA 報告規則 | CISA（DHS） | NPRM 89 FR 23644（RIN 1670-AA04） | 最終規則未公表（2026 Unified Agenda の目標 2026-09 を経過。法定期限 2025-10-04 も経過）[N] | 2024-04-04（NPRM） | — | 2026-10-03 | https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202510&RIN=1670-AA04 | 監視のみ [D] | 月次（次回 2026-11-03） | RS-02 |
| SS-H10 | 28 CFR Part 202（bulk 機微個人データ・政府関連データへのアクセス防止規則） | 米国司法省 | eCFR 現行 | 施行済 [N] | — | — | 2026-10-03 | https://www.ecfr.gov/current/title-28/chapter-I/part-202 | 準拠基準（条件付: 米国の bulk 機微データ。DL-34） [D][A-060] | 半年（次回 2027-04-03） | RS-02 |
| SS-H11 | 17 CFR 240.17a-4（記録保存） | 米国 SEC | eCFR（同条の最終改正 2024-08-02） | 現行規則 [N] | — | — | 2026-10-03 | https://www.ecfr.gov/current/title-17/chapter-II/part-240/section-240.17a-4 | 参照（WORM 要件の参照。証券顧客） [D][A-080] | 半年（次回 2027-04-03） | RS-10 |
| SS-H12 | 47 CFR 64.2010(h)（SIM 変更） | 米国 FCC | eCFR 2026-10-01 時点の版（同条の最終改正 89 FR 47870, 2024-06-04） | 公布済み・遵守日未設定 [N] | 88 FR 85814（2023-12-08）等 | 遵守日未設定 | 2026-10-03 | https://www.ecfr.gov/current/title-47/part-64/section-64.2010 | 参照（SMS 利用のリスク評価の入力） [D] | 四半期（次回 2027-01-03） | RS-13 |
| SS-H13 | FedRAMP Consolidated Rules for 2026（CR26） | FedRAMP（GSA） | CR26 | 公表済・任意採用期間中（2027-01-01 義務化）[N] | 2026-07-04（任意採用開始） | 2027-01-01 義務化 | 2026-10-03 | https://fedramp.gov/2026/timeline/ | 参照（米国連邦顧客を扱う場合） [D][A-080] | 月次（次回 2026-11-03） | RS-02 |
| SS-H14 | FFIEC Authentication and Access to Financial Institution Services and Systems | FFIEC（掲載: FRB SR 21-14） | — | 監督ガイダンス（2005・2011 版を置換。現行性は FFIEC サイトで未確認）[N] | 2021-08-11 | — | 2026-10-03 | https://www.federalreserve.gov/supervisionreg/srletters/sr2114.pdf | 参照 [D][A-080] | 半年（次回 2027-04-03） | RS-13 |
| SS-H15 | Executive Order 14412（PQC 移行） | 米国大統領令 | EO 14412（91 FR 38483） | 署名・官報掲載済 [N] | 2026-06-22 署名（官報 2026-06-25） | 2026-06-22 | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2026/06/eo-14412.pdf | 参照（FAR 改正案で連邦契約者に 2030-12-31 までの PQC 準拠を求めるよう指示） [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-H16 | OMB M-26-15 Execution of the Migration to Post-Quantum Cryptography | 米国 OMB | M-26-15 | 発出済（NSS 適用外）[N] | 2026-06-24 | 2026-06-24 | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf | 参照 [D][A-103] | 四半期（次回 2027-01-03） | RS-11 |
| SS-H17 | OMB M-21-31 Improving the Federal Government's Investigative and Remediation Capabilities Related to Cybersecurity Incidents | 米国 OMB | M-21-31 | 発出済（現在も有効かは未確認）[N] | 2021-08-27 | — | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2021/08/M-21-31-Improving-the-Federal-Governments-Investigative-and-Remediation-Capabilities-Related-to-Cybersecurity-Incidents.pdf | 参照（ログ保持の比較対象） [D] | 年次（次回 2027-10-03） | RS-10 |
| SS-H18 | OMB M-22-09 Moving the U.S. Government Toward Zero Trust Cybersecurity Principles | 米国 OMB | M-22-09 | 発出済（現行性は未確認）[N] | 2022-01-26 | — | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2022/01/M-22-09.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |

### 4.9 業界団体・コミュニティの仕様と枠組み（37 件）

更新所有者（案）: CISO 室（API・イベント契約の仕様は CTO 室） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-I01 | PCI DSS | PCI SSC | v4.0.1 | final（v4.0 は 2024-12-31 退役。v4.0.1 本文は未取得。v4.0.1 への RFC を 2026-06-03〜07-20 に実施）[N] | 2024-06-11（PCI SSC の公表告知） | — | 2026-10-03 | https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1 | 準拠基準（条件付: 決済 API の認可が CDE 側から呼ばれる場合など。範囲判定は DL-34） [D][A-072] | 四半期（次回 2027-01-03） | RS-02、RS-10 |
| SS-I02 | PCI DSS v4.0 SAQ D for Service Providers | PCI SSC | v4.0 | 退役（v4.0 は 2024-12-31 退役。要件文言の出典として使用）[N] | 2022-04 | — | 2026-10-03 | https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf | 参照（退役版。v4.0.1 本文の取得まで文言照合に限る） [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-I03 | Trust Services Criteria（SOC 2 の基準） | AICPA | 2017（Revised Points of Focus 2022） | final（本文未取得）[N] | 2023-09-30（サイト掲載日） | — | 2026-10-03 | https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022 | 参照（第三者保証の基準候補） [D] | 年次（次回 2027-10-03） | RS-02 |
| SS-I04 | OWASP Application Security Verification Standard（ASVS） | OWASP | 5.0.0 | final（GitHub release tag `v5.0.0_release`。`latest` は bleeding edge の自動生成版）[N]（差異 Δ-16）[^24] | 2025-05-30 | — | 2026-10-03 | https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0/en | 準拠基準（マッピング対象: R-026） [D] | 年次（次回 2027-10-03） | RS-08、RS-09、RS-13、RS-17 |
| SS-I05 | OWASP API Security Top 10 | OWASP | 2023 | 公開済（awareness document）[N] | 月日は未確認 | — | 2026-10-03 | https://github.com/OWASP/API-Security/tree/master/editions/2023/en | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-I06 | OWASP Top 10 for LLM Applications | OWASP | 2025 | 公開済（原稿の最終更新コミット 2025-10-27。公表月日は未確認）[N] | — | — | 2026-10-03 | https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns | 参照 [D] | 半年（次回 2027-04-03） | RS-08 |
| SS-I07 | OWASP Web Security Testing Guide（WSTG） | OWASP | v4.2 | released [N] | 2020-12-03 | — | 2026-10-03 | https://owasp.org/www-project-web-security-testing-guide/v42/ | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-I08 | OWASP Authorization Cheat Sheet | OWASP | 随時更新（master） | living document [N] | — | — | 2026-10-03 | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-I09 | OWASP Credential Stuffing Prevention Cheat Sheet | OWASP | 版表記なし（随時更新） | 非規範ガイダンス [N] | — | — | 2026-10-03 | https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-I10 | OWASP Automated Threat Handbook | OWASP | 1.30 | released [N] | 2026-03-17 | — | 2026-10-03 | https://github.com/OWASP/www-project-automated-threats-to-web-applications/tree/master/assets/files/EN | 参照（定期パスワード失効の記述は SP 800-63B-4 と食い違う: RS-13） [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-I11 | MITRE ATT&CK | MITRE | v19.2 | current（v19: 2026-04-28〜、v19.2 Agile: 2026-08-06）[N] | 2026-08-06 | — | 2026-10-03 | https://attack.mitre.org/resources/versions/ | 参照（脅威モデルの入力） [D] | 半年（次回 2027-04-03） | RS-13 |
| SS-I12 | MITRE CWE | MITRE | 4.20 | released [N] | 2026-04-30 | — | 2026-10-03 | https://cwe.mitre.org/ | 参照 [D] | 半年（次回 2027-04-03） | RS-08 |
| SS-I13 | SaaS Security Capability Framework（SSCF） | Cloud Security Alliance | v1.0.1（v1.0.0 は 2025-09-24） | 公開版（拘束力なし、認証制度は未整備）[N] | 2026-04-09 | — | 2026-10-03 | https://cloudsecurityalliance.org/artifacts/saas-security-capability-framework-sscf | 参照（顧客が設定できる機能の比較軸） [D] | 半年（次回 2027-04-03） | RS-14 |
| SS-I14 | OpenAPI Specification | OpenAPI Initiative | 3.2.1 | final（現行最新）[N] | 2026-09-10 | — | 2026-10-03 | https://spec.openapis.org/oas/v3.2.1.html | 準拠基準（契約記述 DL-70） [D] | 四半期（次回 2027-01-03） | RS-08、RS-16 |
| SS-I15 | OpenAPI Specification | OpenAPI Initiative | 3.2.0 | final（3.2.1 で patch 済み）[N] | 2025-09-19 | — | 2026-10-03 | https://spec.openapis.org/oas/v3.2.0.html | 不採用（3.2.1 を使う） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-I16 | OpenAPI Specification | OpenAPI Initiative | 3.1.2 | final（3.1 系の最新 patch）[N] | 2025-09-19 | — | 2026-10-03 | https://spec.openapis.org/oas/v3.1.2.html | 参照（3.1 系のツール互換が必要な場合） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-I17 | JSON Schema Core / Validation | JSON Schema 策定団体 | 2020-12（draft-bhutton-json-schema-01） | 公式サイト上の現行版（IETF 上は失効した I-D。策定団体は IETF 経由の発行を終了）[N] | 2022-06-16 | — | 2026-10-03 | https://json-schema.org/specification | 参照（OpenAPI・AsyncAPI 経由で使う） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-I18 | AsyncAPI Specification | AsyncAPI Initiative | 3.1.0 | final（minor、破壊的変更なし）[N] | 2026-01-31（リリースノート） | — | 2026-10-03 | https://www.asyncapi.com/docs/reference/specification/v3.1.0 | 準拠基準（イベント契約） [D] | 四半期（次回 2027-01-03） | RS-16 |
| SS-I19 | AsyncAPI Specification | AsyncAPI Initiative | 3.0.0 | final（v2 から破壊的変更あり。後継 minor は 3.1.0）[N] | 2023-12-05（リリースノート） | — | 2026-10-03 | https://www.asyncapi.com/docs/reference/specification/v3.0.0 | 参照（3.1.0 を優先） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-I20 | CloudEvents | CNCF（CloudEvents プロジェクト） | 1.0.2 | final（最新リリース。main は 1.0.3-wip。プロジェクトは CNCF Graduated 2024-01-25）[N] | 2022-02-06（GitHub Release `ce@v1.0.2`） | — | 2026-10-03 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md | 準拠基準（監査・失効イベントの封筒の候補: DL-71） [D] | 半年（次回 2027-04-03） | RS-16、RS-17 |
| SS-I21 | CloudEvents Auth Context 拡張 | CNCF（CloudEvents プロジェクト） | main（1.0.3-wip） | draft（拡張仕様。リリース版に未収録）[N] | 未確認 | — | 2026-10-03 | https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/authcontext.md | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-17 |
| SS-I22 | Semantic Versioning | semver.org（コミュニティ仕様。SDO 発行ではない） | 2.0.0 | 公開版 [N] | 未確認 | — | 2026-10-03 | https://semver.org/ | 準拠基準（SDK の版管理） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-I23 | OpenTelemetry Specification | OpenTelemetry（CNCF、SDO 外） | v1.61.0 | release（Trace API は Stable。Tracing SDK は "Stable, except where otherwise specified"、Baggage API は Stable）[N] | 2026-09-14 | — | 2026-10-03 | https://github.com/open-telemetry/opentelemetry-specification/releases/tag/v1.61.0 | 参照（相関用。監査経路とは分離） [D] | 四半期（次回 2027-01-03） | RS-08、RS-10 |
| SS-I24 | OCSF schema | OCSF（Linux Foundation プロジェクト、SDO 外） | 1.9.0 | release（最新）[N] | 2026-08-03 | — | 2026-10-03 | https://github.com/ocsf/ocsf-schema/releases/tag/1.9.0 | 参照（監査イベントの写像先・export 形式の候補: ADR-014） [D] | 四半期（次回 2027-01-03） | RS-10 |
| SS-I25 | SLSA（Supply-chain Levels for Software Artifacts） | OpenSSF（SLSA プロジェクト） | v1.2 | Approved [N] | 2025-11-24 | — | 2026-10-03 | https://slsa.dev/spec/v1.2/ | 参照（供給網の目標水準は ADR で決定） [D] | 半年（次回 2027-04-03） | RS-05 |
| SS-I26 | SPIFFE X509-SVID ／ JWT-SVID ／ SPIFFE-ID | SPIFFE（CNCF） | main（最終変更 2026-07-01） | Stable（SPIFFE の安定度区分）[N] | 2026-07-01 | — | 2026-10-03 | https://github.com/spiffe/spiffe/tree/main/standards | 準拠基準（workload identity の初期基盤。RS-06 の L1） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-I27 | SPIFFE WIT-SVID ／ Broker API | SPIFFE（CNCF） | main | Incubating [N] | 2026-07-01（WIT-SVID 追加） | — | 2026-10-03 | https://github.com/spiffe/spiffe/blob/main/standards/WIT-SVID.md | 監視のみ（RS-06 の L3） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-I28 | Model Context Protocol（MCP）Specification（Authorization を含む） | MCP（LF Projects。SDO 外） | 2026-07-28 | 最新版（SDO 外の仕様。DCR は廃止予定、CIMD が SHOULD）[N] | 2026-07-28 | — | 2026-10-03 | https://modelcontextprotocol.io/specification/2026-07-28 | 参照（版を固定した adapter で対応。§7） [D] | 月次（次回 2026-11-03） | RS-06、RS-17 |
| SS-I29 | MCP Enterprise-Managed Authorization 拡張 | MCP（LF Projects） | — | Stable 表示（ID-JAG -04 に依存）[N] | 2026-06-18（最終変更） | — | 2026-10-03 | https://github.com/modelcontextprotocol/ext-auth | 監視のみ（draft 依存。§7） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-I30 | FAIR Model（標準成果物） | FAIR Institute | v3.0 | 公表済（本文未取得）[N] | 2025-01-23 告知 | — | 2026-10-03 | https://www.fairinstitute.org/blog/fair-standards-update-new-artifacts-and-expanding-the-standards-committee | 参照（リスク定量化） [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I31 | FAIR Controls Analytics Model（FAIR-CAM） | FAIR Institute | v1.0 | 公表済（本文未取得）[N] | 2025-01-23 告知 | — | 2026-10-03 | https://www.fairinstitute.org/blog/fair-standards-update-new-artifacts-and-expanding-the-standards-committee | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I32 | Open FAIR Risk Taxonomy（O-RT）／ Risk Analysis（O-RA） | The Open Group | 3.1 ／ 2.1 | 公表済（本文未取得。NIST は 3.0.1 を引用）[N] | 2025-05-22 告知 | — | 2026-10-03 | https://blog.opengroup.org/2025/05/22/exciting-updates-for-the-open-fair-body-of-knowledge-and-certification-program/ | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I33 | Director's Handbook on Cyber-Risk Oversight | NACD・ISA | 第 5 版（2026） | 公表済（正式公表日は未確認。PDF 作成 2026-04-02）[N] | 2026 | — | 2026-10-03 | https://www.nacdonline.org/globalassets/public-pdfs/2026_directors-handbook-cyber-risk_accessible.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I34 | Cybersecurity Topical Requirement | IIA | — | 発効済 [N] | 2025-02-05 発行 | 2026-02-05 発効 | 2026-10-03 | https://www.theiia.org/en/standards/2024-standards/topical-requirements/cybersecurity/ | 参照（内部監査） [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I35 | Third-Party Topical Requirement | IIA | — | 発効済（本文は未読）[N] | — | 2026-09-15 発効 | 2026-10-03 | https://www.theiia.org/en/standards/2024-standards/topical-requirements/ | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I36 | Statement of Position: Three Lines Model | IIA | 2026 | 公表済（従前の Position Paper を置換）[N] | 2026-07-08 | — | 2026-10-03 | https://www.theiia.org/en/resources/statements-of-position/ | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |
| SS-I37 | Statement of Position: The Internal Audit Function's Role in ERM | IIA | 2026 | 公表済（同主題の従前の Position Paper を置換）[N] | 2026-07-08 | — | 2026-10-03 | https://www.theiia.org/en/resources/statements-of-position/ | 参照 [D] | 年次（次回 2027-10-03） | RS-01 |

### 4.10 公的勧告・事故の一次報告（49 件）

更新所有者（案）: CISO 室（脅威情報担当） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-J01 | AA23-320A Scattered Spider | CISA・FBI | 2025-07-29 改訂版 | 公的勧告（改訂あり）[I] | 2023-11-16（最終改訂 2025-07-29） | — | 2026-10-03 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a | 参照（help desk 経由の回復・MFA 疲労の事例） [D] | 半年（次回 2027-04-03） | RS-03、RS-12、RS-13、RS-14 |
| SS-J02 | AA23-341A Star Blizzard | CISA ほか | — | 公的勧告 [I] | 2023-12-07 | — | 2026-10-03 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-341a | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-J03 | Emergency Directive 24-02（Microsoft 社内メール侵害への対応） | CISA | — | closed（sunset。2026-01-08 表示）[I] | 2024-04-02 | — | 2026-10-03 | https://www.cisa.gov/news-events/directives/ed-24-02-mitigating-significant-risk-nation-state-compromise-microsoft-corporate-email-system | 参照（事故対応の先例） [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J04 | Implementing Phishing-Resistant MFA（fact sheet） | CISA | — | 公的勧告 [I] | 2022-10 | — | 2026-10-03 | https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-J05 | Implementing Number Matching in MFA Applications（fact sheet） | CISA | — | 公的勧告 [I] | 2022-10 | — | 2026-10-03 | https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-J06 | Mobile Communications Best Practice Guidance | CISA | — | 公的勧告 [I] | 2024-12-18 | — | 2026-10-03 | https://www.cisa.gov/sites/default/files/2024-12/guidance-mobile-communications-best-practices.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-J07 | PSA I-052126-PSA（Kali365） | FBI IC3 | — | 公的勧告 [I] | 2026-05-21 | — | 2026-10-03 | https://ic3.gov/PSA/2026/PSA260521 | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-J08 | Incidents impacting retailers | 英国 NCSC | — | 公的機関ブログ [I] | 2025-05-04 | — | 2026-10-03 | https://www.ncsc.gov.uk/blog-post/incidents-impacting-retailers | 参照 [D] | 年次（次回 2027-10-03） | RS-13 |
| SS-J09 | Review of the Summer 2023 Microsoft Exchange Online Intrusion | Cyber Safety Review Board（DHS） | — | 政府報告（確定）[I] | 2024-03-20 付（DHS 公表 2024-04-02。PDF は 2025-03 のパスで再掲） | — | 2026-10-03 | https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf | 参照（署名鍵管理・監査保持の勧告） [D] | 年次（次回 2027-10-03） | RS-05、RS-12、RS-14 |
| SS-J10 | Results of Major Technical Investigations for Storm-0558 Key Acquisition | Microsoft（MSRC） | 2024-03-12 追記版 | 公表済（追記で訂正済み）[I] | 2023-09-06 | — | 2026-10-03 | https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J11 | Microsoft mitigates China-based threat actor Storm-0558 targeting of customer email | Microsoft（MSRC） | Revision 2023-09-06 | 公表済（更新あり）[I] | 2023-07-11 | — | 2026-10-03 | https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J12 | Analysis of Storm-0558 techniques for unauthorized email access | Microsoft Threat Intelligence | 2023-09-06 追記 | 公表済 [I] | 2023-07-14 | — | 2026-10-03 | https://www.microsoft.com/en-us/security/blog/2023/07/14/analysis-of-storm-0558-techniques-for-unauthorized-email-access/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J13 | Microsoft actions following attack by nation state actor Midnight Blizzard（初報） | Microsoft（MSRC） | — | 公表済（最終 PIR は未確認）[I] | 2024-01-19 | — | 2026-10-03 | https://www.microsoft.com/en-us/msrc/blog/2024/01/microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J14 | Update on Microsoft actions following attack by nation state actor Midnight Blizzard | Microsoft（MSRC） | — | 公表済（最終 PIR は未確認）[I] | 2024-03-08 | — | 2026-10-03 | https://www.microsoft.com/en-us/msrc/blog/2024/03/update-on-microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J15 | Midnight Blizzard: Guidance for responders on nation-state attack | Microsoft Threat Intelligence | 2024-02-13 微修正 | 公表済 [I] | 2024-01-25 | — | 2026-10-03 | https://www.microsoft.com/en-us/security/blog/2024/01/25/midnight-blizzard-guidance-for-responders-on-nation-state-attack/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J16 | Securing our future: April 2025 progress report on Microsoft's Secure Future Initiative | Microsoft | — | 公表済（ベンダー自己申告）[I] | 2025-04-21 | — | 2026-10-03 | https://www.microsoft.com/en-us/security/blog/2025/04/21/securing-our-future-april-2025-progress-report-on-microsofts-secure-future-initiative/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J17 | Okta RCA（Support Case Management System への不正アクセス） | Okta | — | 公表済（RCA）[I] | 2023-11-03 | — | 2026-10-03 | https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J18 | Okta Form 8-K Ex.99.2 "October Customer Support Security Incident - Update" | Okta（SEC 提出書類） | — | 公表済（第三者フォレンジック報告は未公開）[I] | 2023-11-29 | — | 2026-10-03 | https://www.sec.gov/Archives/edgar/data/1660134/000166013423000065/okta-10312023_ex992.htm | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J19 | Thanksgiving 2023 security incident | Cloudflare | — | 公表済 [I] | 2024-02-01 | — | 2026-10-03 | https://blog.cloudflare.com/thanksgiving-2023-security-incident/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J20 | The impact of the Salesloft Drift breach on Cloudflare and our customers | Cloudflare | — | 公表済 [I] | 2025-09-02 | — | 2026-10-03 | https://blog.cloudflare.com/response-to-salesloft-drift-incident/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J21 | UNC5537 Targets Snowflake Customer Instances（データ窃取と恐喝） | Mandiant（Google Cloud） | 2024-06-17 更新 | 公表済（更新あり）[I] | 2024-06-10（構造化データの datePublished。ページ表示は 2024-06-11） | — | 2026-10-03 | https://cloud.google.com/blog/topics/threat-intelligence/unc5537-snowflake-data-theft-extortion | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J22 | Widespread Data Theft Targets Salesforce Instances via Salesloft Drift | Google Threat Intelligence Group | 2025-08-28 追記 | 公表済（追記あり）[I] | 2025-08-26（構造化データの datePublished。ページ表示は 2025-08-27） | — | 2026-10-03 | https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J23 | Salesloft Trust Center（Drift 更新、Mandiant 調査要約） | Salesloft | 2025-09-06 更新ほか | 調査終了（2025-09-30）[I] | 2025-09-06 ほか（ページ表示は 2026-04-17） | — | 2026-10-03 | https://trust.salesloft.com/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J24 | nOAuth（Azure AD の email claim 悪用） | Descope | — | 公表済 [I] | 2023-06-20 | — | 2026-10-03 | https://www.descope.com/blog/post/noauth | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J25 | Potential Risk of Privilege Escalation in Azure AD Applications | Microsoft（MSRC） | — | 公表済 [I] | 2023-06-20 | — | 2026-10-03 | https://www.microsoft.com/en-us/msrc/blog/2023/06/potential-risk-of-privilege-escalation-in-azure-ad-applications | 参照（email claim を認可に使わない） [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J26 | nOAuth Abuse Alert | Semperis | — | 公表済 [I] | 2025-06-25 | — | 2026-10-03 | https://www.semperis.com/blog/noauth-abuse-alert-full-account-takeover/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J27 | Guidance on Potential Misconfiguration of Authorization of Multi-Tenant Applications that use Azure AD | Microsoft（MSRC） | — | 公表済 [I] | 2023-03-29 | — | 2026-10-03 | https://www.microsoft.com/en-us/msrc/blog/2023/03/guidance-on-potential-misconfiguration-of-authorization-of-multi-tenant-applications-that-use-azure-ad | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J28 | CircleCI Jan 4, 2023 security incident report | CircleCI | — | 公表済 [I] | 2023-01-13（UTC） | — | 2026-10-03 | https://circleci.com/blog/jan-4-2023-incident-report/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J29 | MGM Resorts Form 8-K（Item 2.02・7.01） | MGM Resorts（SEC 提出書類） | — | 公表済（提出書類）[I] | 2023-10-05（Date of Report） | — | 2026-10-03 | https://www.sec.gov/Archives/edgar/data/789570/000119312523251667/d461062d8k.htm | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J30 | CVE-2025-55241（Microsoft Entra ID actor token）MSRC Update Guide | Microsoft（MSRC） | 最終改訂 2025-09-18（v1.1。Attack Complexity を High→Low） | 公開・緩和済み [I] | 2025-09-04 | — | 2026-10-03 | https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-55241 | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J31 | CVE-2025-55241（NVD） | NIST NVD | vulnStatus: Modified（lastModified 2026-06-17。NVD の CVSS v3.1 は 9.8、Microsoft は 10.0） | 公開 [I] | 2025-09-04 | — | 2026-10-03 | https://nvd.nist.gov/vuln/detail/CVE-2025-55241 | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J32 | One Token to rule them all（CVE-2025-55241 の発見者開示） | Dirk-jan Mollema | — | 公表済（発見者開示）[I] | 2025-09-17 | — | 2026-10-03 | https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J33 | Security alert: Attack campaign involving stolen OAuth user tokens | GitHub | 2022-04-27 更新 | 公表済 [I] | 2022-04-15 | — | 2026-10-03 | https://github.blog/news-insights/company-news/security-alert-stolen-oauth-user-tokens/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J34 | April 2022 Incident Review | Heroku | Last Updated 2022-06-14 | 公表済 [I] | 2022-06-14（最終更新日。初出日はページに記載なし） | — | 2026-10-03 | https://www.heroku.com/blog/april-2022-incident-review/ | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J35 | Notice of Security Incident | LastPass | 更新統合版 | 公表済 [I] | 2022-12-22 | — | 2026-10-03 | https://blog.lastpass.com/posts/notice-of-recent-security-incident | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J36 | Security Incident Update and Recommended Actions | LastPass | 本文照合は旧 URL の Wayback 2023-03-01 版 | 公表済（現行 URL は本文が折りたたみ表示で直接取得不可）[I] | 2023-03-01 | — | 2026-10-03 | https://blog.lastpass.com/posts/security-incident-update-recommended-actions | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J37 | Incident 2 – Additional details of the attack | LastPass | Wayback 2023-03-05 取得版 | 公表済（現行 URL は JS 描画のため未取得）[I] | 2023-03 | — | 2026-10-03 | https://web.archive.org/web/20230305/https://support.lastpass.com/help/incident-2-additional-details-of-the-attack | 参照 [D] | 年次（次回 2027-10-03） | RS-12 |
| SS-J38 | Google Cloud Incident #20013（Google User ID Service） | Google Cloud | Issue Summary 2020-12-18、訂正 2020-12-22 | 公表済（当事者報告）[I] | 2020-12-18 | — | 2026-10-03 | https://status.cloud.google.com/incident/zall/20013 | 参照（認証基盤障害の事例） [D] | 年次（次回 2027-10-03） | RS-09、RS-12 |
| SS-J39 | Azure AD RCA（Tracking ID SM79-F88、2020-09-28） | Microsoft Azure | 最終 RCA | 公表済（現行 status history には非掲載。Wayback 2020-10-15 取得版）[I] | 未確認（2020-10-15 以前） | — | 2026-10-03 | https://web.archive.org/web/20201015125110/https://status.azure.com/en-us/status/history/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J40 | Azure AD RCA（Tracking ID LN01-P8Z、2021-03-15） | Microsoft Azure | 最終 RCA（Wayback 2021-04-02 取得版） | 公表済（現行サイトは PIR を各 5 年保持と明記し、本件は非掲載）[I]（差異 Δ-14） | 未確認（2021-04-02 以前。事象は 2021-03-15〜16）[^22] | — | 2026-10-03 | https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09、RS-12 |
| SS-J41 | Auth0 Detailed Root Cause Analysis（2021-04-20 US-1 障害） | Auth0（Okta） | 2021-07-01 更新（最終） | 公表済 [I] | 2021-07-01 | — | 2026-10-03 | https://cdn.auth0.com/blog/Detailed_Root_Cause_Analysis_(RCA)_4-2021.pdf | 参照（fallback による相関障害の事例） [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J42 | Atlassian Post-Incident Review（April 2022 outage） | Atlassian | 2024-11-18 更新 | 公表済（旧 URL は転送）[I] | 2022-04-30 | — | 2026-10-03 | https://www.atlassian.com/blog/how-we-build/post-incident-review-april-2022-outage | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J43 | Preliminary Post Incident Review（Falcon content update） | CrowdStrike | 2024-07-25 19:00 UTC 更新 | 公表済 [I] | 2024-07-24 | — | 2026-10-03 | https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J44 | External Technical Root Cause Analysis（Channel File 291） | CrowdStrike | — | 公表済 [I] | 2024-08-06 | — | 2026-10-03 | https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J45 | Google Cloud Service Health incident（Service Control、2025-06-12） | Google Cloud | Mini Incident Report 2025-06-12、Incident Report 2025-06-13 | 公表済 [I] | 2025-06-13（Incident Report） | — | 2026-10-03 | https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J46 | Cloudflare service outage June 12, 2025 | Cloudflare | — | 公表済 [I] | 2025-06-12 | — | 2026-10-03 | https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J47 | Summary of the Amazon DynamoDB Service Disruption（us-east-1） | AWS | — | 公表済 [I] | 未確認（事象 2025-10-19/20） | — | 2026-10-03 | https://aws.amazon.com/message/101925/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J48 | Cloudflare outage on November 18, 2025 | Cloudflare | — | 公表済 [I] | 2025-11-18 | — | 2026-10-03 | https://blog.cloudflare.com/18-november-2025-outage/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-J49 | Okta Status（incident I-10874 の RCA 要約） | Okta | RCA 要約 2026-07-06 掲載 | 公表済（status page の incident 更新欄）[I] | 2026-07-06 | — | 2026-10-03 | https://status.okta.com/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |

### 4.11 製品・OSS・ベンダー文書（版・料金・SLA を含む）（52 件）

更新所有者（案）: 認証・認可プラットフォームチーム（製品評価） [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-K01 | Cedar 言語 | Cedar（OSS） | 4.5（SDK 4.10.0〜4.13.0） | 現行版 [V] | 2026-04-23 | — | 2026-10-03 | https://docs.cedarpolicy.com/other/doc-history.html | 参照（認可エンジン候補の評価。採否は ADR） [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K02 | Cedar CLI | Cedar（OSS） | cedar-policy-cli-v4.13.0 | release [V] | 2026-09-15 | — | 2026-10-03 | https://github.com/cedar-policy/cedar/releases | 参照 [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K03 | Cedar `tpe` ／ `partial-eval`（Rust crate の feature） | Cedar（OSS） | SDK 4.13.0 時点 | experimental feature [V] | `tpe` 導入 2025-10-06（v4.6.0） | — | 2026-10-03 | https://github.com/cedar-policy/cedar/blob/main/cedar-policy/CHANGELOG.md | 監視のみ（experimental に本番依存しない） [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K04 | OpenFGA | OpenFGA（CNCF Incubating） | v1.21.0 | release [V] | 2026-09-20 | — | 2026-10-03 | https://github.com/openfga/openfga/releases/tag/v1.21.0 | 参照（認可エンジン候補の評価。採否は ADR） [D] | 四半期（次回 2027-01-03） | RS-07、RS-08 |
| SS-K05 | OpenFGA CLI（fga） | OpenFGA | v0.8.1 | release（store export の既定 tuple 上限 100）[V] | 2026-09-24 | — | 2026-10-03 | https://github.com/openfga/cli | 参照 [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K06 | OpenFGA AuthZEN エンドポイント | OpenFGA | 版表記なし（文書の最終更新 2026-09-28） | experimental（`--experimentals=authzen`）[V] | — | — | 2026-10-03 | https://openfga.dev/docs/interacting/authzen | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K07 | SpiceDB | AuthZed | v1.56.2 | release（CNCF 成熟度の記載なし）[V] | 2026-09-11 | — | 2026-10-03 | https://github.com/authzed/spicedb/releases/tag/v1.56.2 | 参照（認可エンジン候補の評価。採否は ADR） [D] | 四半期（次回 2027-01-03） | RS-07、RS-08 |
| SS-K08 | Open Policy Agent（OPA） | OPA（CNCF Graduated） | v1.21.1 | release [V] | 2026-09-29 | — | 2026-10-03 | https://github.com/open-policy-agent/opa/releases/tag/v1.21.1 | 参照 [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K09 | Topaz | Aserto | v0.33.22 | release [V] | 2026-09-28 | — | 2026-10-03 | https://github.com/aserto-dev/topaz | 参照 [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K10 | Topaz の AuthZEN ネイティブ対応 | Aserto | v0.32.54 以降（告知時点） | 告知は draft 02/03 前提で Final 承認前。Final 版への準拠は未確認 [V] | 2025-02-28 | — | 2026-10-03 | https://www.aserto.com/blog/authzen-gartner-iam-and-native-support-in-topaz | 監視のみ [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K11 | Permify | Permify | v1.7.4 | release（AGPL-3.0）[V] | 2026-09-10 | — | 2026-10-03 | https://github.com/Permify/permify | 参照 [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K12 | Amazon Verified Permissions 料金・クォータ | AWS | 版の表記なし（マネージドサービス） | 公開ページ（随時改定）[V] | 記載なし | — | 2026-10-03 | https://aws.amazon.com/verified-permissions/pricing/ , https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html | 参照 [D] | 四半期（次回 2027-01-03） | RS-07 |
| SS-K13 | SPIRE | SPIFFE（CNCF Graduated、2022-08-22） | v1.15.3 | release [V] | 2026-08-21 | — | 2026-10-03 | https://github.com/spiffe/spire/releases | 参照（L1 の候補実装） [D] | 四半期（次回 2027-01-03） | RS-06 |
| SS-K14 | Keycloak | Keycloak（CNCF Incubating） | 26.8.0 | release [V] | 2026-10-01 | — | 2026-10-03 | https://github.com/keycloak/keycloak/releases | 参照（AS/IdP 候補の評価。採否は ADR-001・DL-13） [D] | 四半期（次回 2027-01-03） | RS-15、RS-17 |
| SS-K15 | Keycloak 文書（features、high availability、importExport、oidc-layers、Server Administration Guide） | Keycloak | 26.8.0 版の文書 | 公開 [V] | 記載なし | — | 2026-10-03 | https://www.keycloak.org/server/features , https://www.keycloak.org/docs/latest/server_admin/index.html | 参照 [D] | 四半期（次回 2027-01-03） | RS-15、RS-17 |
| SS-K16 | Red Hat build of Keycloak Life Cycle and Support Policies | Red Hat | 版表記なし | 公開 [V] | 記載なし | — | 2026-10-03 | https://access.redhat.com/support/policy/updates/red_hat_build_of_keycloak_notes | 参照（LTS 評価 DL-33） [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K17 | Ory Hydra ／ Ory Kratos | Ory | v26.2.0 | release（Apache-2.0）[V] | 2026-03-20 | — | 2026-10-03 | https://github.com/ory/hydra/releases | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K18 | ZITADEL | ZITADEL | v4.19.4 | release（AGPL-3.0）[V] | 2026-10-01 | — | 2026-10-03 | https://github.com/zitadel/zitadel/releases | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K19 | authentik | authentik（OSS） | 2026.8.3 | release（MIT＋enterprise 別ライセンス）[V] | 2026-09-17 | — | 2026-10-03 | https://github.com/goauthentik/authentik/releases | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K20 | node-oidc-provider | panva（OSS） | v9.12.2 | release（MIT）[V] | 2026-09-05 | — | 2026-10-03 | https://github.com/panva/node-oidc-provider | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K21 | Microsoft Online Services SLA | Microsoft | 2026 年 10 月版（WW English、文書日付 2026-10-01） | 公開 [V] | 2026-10-01 | — | 2026-10-03 | https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K22 | Microsoft Entra External ID 料金（Learn／Retail Prices API） | Microsoft | ms.date 2026-06-22（Basic MAU は 2025-07-01 発効） | 公開（随時改定）[V] | 2026-06-22 | — | 2026-10-03 | https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K23 | Auth0 Platform Service Level Agreement | Okta（Auth0） | Rev 4.5.2 | 公開（現行契約への適用は未確認）[V] | 2022-02-01 | — | 2026-10-03 | https://www.okta.com/sites/default/files/2022-02/ServiceLevelAgreement-for-Auth0-Platform-02-7-22.pdf | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K24 | Amazon Cognito SLA | AWS | 版表記なし | 公開 [V] | 2022-05-04（最終更新） | — | 2026-10-03 | https://aws.amazon.com/cognito/sla/ | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K25 | Amazon Cognito 料金 | AWS | 版表記なし | 公開（随時改定）[V] | 記載なし | — | 2026-10-03 | https://aws.amazon.com/cognito/pricing/ | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K26 | Google Identity Platform 料金・SLA | Google Cloud | 版表記なし | 公開（随時改定）[V] | 記載なし | — | 2026-10-03 | https://cloud.google.com/identity-platform/pricing , https://cloud.google.com/identity-platform/sla | 参照 [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K27 | AWS Customer Agreement | AWS | Last Updated: 2026-08-14 | 公開（随時改定）[V] | 2026-08-14（最終更新） | — | 2026-10-03 | https://aws.amazon.com/agreement/ | 参照（退出条項の比較） [D] | 四半期（次回 2027-01-03） | RS-15 |
| SS-K28 | Google Cloud Terms of Service | Google Cloud | 2026-09-02 更新 | 現行 [V] | 2026-09-02 | — | 2026-10-03 | https://cloud.google.com/terms | 参照 [D] | 四半期（次回 2027-01-03） | RS-16 |
| SS-K29 | Microsoft Graph versioning and support | Microsoft | ms.date 2024-11-07（更新 2025-08-06） | 現行 [V] | 2024-11-07 | — | 2026-10-03 | https://learn.microsoft.com/en-us/graph/versioning-and-support | 参照（非推奨期間の先例） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-K30 | AWS SDKs and Tools maintenance policy | AWS | 日付記載なし | 現行 [V] | 未確認 | — | 2026-10-03 | https://docs.aws.amazon.com/sdkref/latest/guide/maint-policy.html | 参照 [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-K31 | Google AIP-180 ／ AIP-181 ／ AIP-185 | Google | — | Approved（作成 2019-07-23 ／ 2019-02-18 ／ 2024-10-22）[V] | 同左 | — | 2026-10-03 | https://google.aip.dev/180 , https://google.aip.dev/181 , https://google.aip.dev/185 | 参照（互換性・安定度の定義の先例） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-K32 | Kubernetes Deprecation Policy | Kubernetes（CNCF） | — | 現行（2026-08-21 に URL を移設。旧 URL は 301 で転送）[V]（差異 Δ-15） | 2026-08-21（最終更新） | — | 2026-10-03 | https://kubernetes.io/docs/reference/deprecation-policy/ [^23] | 参照（非推奨期間の先例） [D] | 年次（次回 2027-10-03） | RS-11、RS-16 |
| SS-K33 | Kubernetes Version Skew Policy | Kubernetes（CNCF） | — | 現行（2026-04-14 更新）[V] | 2026-04-14 | — | 2026-10-03 | https://kubernetes.io/releases/version-skew-policy/ | 参照 [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-K34 | Pact Broker | Pact Foundation | v2.122.0 | release [V] | 2026-10-01 | — | 2026-10-03 | https://github.com/pact-foundation/pact_broker | 参照（契約試験 DL-80） [D] | 四半期（次回 2027-01-03） | RS-16 |
| SS-K35 | Microcks | Microcks（CNCF Incubating、2026-05-03） | 1.15.0 | release [V] | 2026-08-05 | — | 2026-10-03 | https://github.com/microcks/microcks | 参照 [D] | 四半期（次回 2027-01-03） | RS-16 |
| SS-K36 | Spectral | Stoplight | v6.17.0 | release [V] | 2026-10-01 | — | 2026-10-03 | https://github.com/stoplightio/spectral | 参照 [D] | 四半期（次回 2027-01-03） | RS-16 |
| SS-K37 | PostgreSQL 文書（Row Security Policies ほか） | PostgreSQL Global Development Group | 18（current）。19 は Beta 4（2026-09-24） | 現行サポート版の製品文書 [V] | 未確認 | — | 2026-10-03 | https://www.postgresql.org/docs/18/ , https://www.postgresql.org/docs/current/ddl-rowsecurity.html | 参照（DB 側の二重防御） [D] | 四半期（次回 2027-01-03） | RS-08、RS-17 |
| SS-K38 | PgBouncer | PgBouncer | 1.26.0 | released [V] | 2026-09-23 | — | 2026-10-03 | https://www.pgbouncer.org/ | 参照 [D] | 四半期（次回 2027-01-03） | RS-08 |
| SS-K39 | Istio | Istio（CNCF） | 1.31.1（docs は latest） | released [V] | 2026-09-21 | — | 2026-10-03 | https://istio.io/latest/docs/ | 参照 [D] | 四半期（次回 2027-01-03） | RS-08 |
| SS-K40 | BigQuery 文書（行・列レベルのセキュリティ） | Google Cloud | — | 現行 [V] | 最終更新 2026-09-30 | — | 2026-10-03 | https://cloud.google.com/bigquery/docs/row-level-security-intro | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-K41 | Snowflake 文書（row access policy／masking policy） | Snowflake | — | 現行（Enterprise Edition 以上）[V] | ページに日付表示なし | — | 2026-10-03 | https://docs.snowflake.com/en/user-guide/security-row-intro | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-K42 | Snowflake: Planning for the deprecation of single-factor password sign-ins | Snowflake | 2026-10-03 取得版 | 現行の製品文書（日付は予定値）[V] | 不明（随時更新） | — | 2026-10-03 | https://docs.snowflake.com/en/user-guide/security-mfa-rollout | 参照 [D] | 四半期（次回 2027-01-03） | RS-12 |
| SS-K43 | Elastic 文書（Document Level Security／Field Level Security） | Elastic | current | 現行 [V] | ページに日付表示なし | — | 2026-10-03 | https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-K44 | GitHub REST API 文書（GitHub App の permission 一覧） | GitHub | docs.github.com（Free/Pro/Team） | 現行 [V] | ページに日付表示なし | — | 2026-10-03 | https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-K45 | Semgrep 登録ルール | Semgrep | semgrep-rules develop ブランチ | 現行 [V] | — | — | 2026-10-03 | https://github.com/semgrep/semgrep-rules | 参照（enforcement coverage の静的検査） [D] | 四半期（次回 2027-01-03） | RS-08 |
| SS-K46 | CodeQL query help | GitHub | latest | 現行 [V] | — | — | 2026-10-03 | https://codeql.github.com/codeql-query-help/ | 参照 [D] | 四半期（次回 2027-01-03） | RS-08 |
| SS-K47 | Microsoft Learn: Backup Authentication System for Microsoft Entra ID | Microsoft | ms.date 2025-07-22 | 公開中（製品文書）[V] | 2025-07-22（更新 2026-09-28） | — | 2026-10-03 | https://learn.microsoft.com/en-us/entra/architecture/backup-authentication-system | 参照（認証の縮退運転の事例） [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-K48 | Microsoft Learn: Manage emergency access admin accounts | Microsoft | ms.date 2026-06-04 | 公開中（製品文書）[V] | 2026-06-04 | — | 2026-10-03 | https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access | 参照（break-glass） [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-K49 | Microsoft Entra Token Protection | Microsoft | ms.date 2026-08-14 | Windows ネイティブは一般提供、ブラウザはプレビュー [V] | — | — | 2026-10-03 | https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-token-protection | 参照（端末束縛の製品例） [D] | 四半期（次回 2027-01-03） | RS-13 |
| SS-K50 | Chrome の DBSC 対応（Windows） | Google | Chrome 145（Chrome for Developers）／146（Google ブログ） | 一般提供（版表記が告知間で不一致）[V] | 2026-03〜2026-05-28 | — | 2026-10-03 | RS-13 の参考文献（脚注 60〜62）を参照 | 監視のみ（W3C DBSC が draft のため） [D] | 四半期（次回 2027-01-03） | RS-13 |
| SS-K51 | Google Cloud KMS の PQC 署名（ML-DSA・SLH-DSA） | Google Cloud | — | GA（リリースノート 2026-07-16）。ML-KEM は Preview（2025-09-23）以降の GA 記録なし [V] | 2026-07-16 | — | 2026-10-03 | https://docs.cloud.google.com/kms/docs/release-notes | 参照（KMS の PQ 対応比較: ADR-007・ADR-018） [D][A-103] | 四半期（次回 2027-01-03） | RS-05 |
| SS-K52 | CMVP 証明書 #4884（AWS KMS HSM） | NIST CMVP（対象: AWS） | HW 3.0 ／ FW 1.8.104 | Active（sunset 2029-11-17、Interim validation）[V] | 2024-11-18 | — | 2026-10-03 | https://csrc.nist.gov/projects/cryptographic-module-validation-program/certificate/4884 | 参照（FIPS 140-3 適合の確認例） [D] | 半年（次回 2027-04-03） | RS-05 |

### 4.12 論文・書籍・白書（非規範）（20 件）

更新所有者（案）: CTO 室 [D]

| ID | 名称 | 発行組織 | 版/番号 | 状態 | 公表日 | 施行日 | 確認日 | URL | 本基盤での扱い | 再確認周期 | 出典ノート |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SS-L01 | Zanzibar: Google's Consistent, Global Authorization System | Google（USENIX ATC 2019） | USENIX ATC 2019 Proceedings | 査読付き論文（確定版）[V] | 2019-07（会議 2019-07-10〜12） | — | 2026-10-03 | https://www.usenix.org/system/files/atc19-pang.pdf | 参照（性能値は測定条件が異なり目標値の根拠にしない） [D] | 年次（次回 2027-10-03） | RS-07、RS-17 |
| SS-L02 | Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization | ACM PACMPL（OOPSLA1） | Vol.8 OOPSLA1（DOI 10.1145/3649835）／arXiv 2403.04651v2 | 査読付き論文（確定版）／arXiv 拡張版 [V] | 2024-04-29 ／ 2024-03-08 | — | 2026-10-03 | https://doi.org/10.1145/3649835 , https://arxiv.org/abs/2403.04651 | 参照 [D] | 年次（次回 2027-10-03） | RS-07 |
| SS-L03 | Google『Site Reliability Engineering』（ch.21 Handling Overload、ch.22 Addressing Cascading Failures、Being On-Call） | Google（書籍オンライン版） | 書籍オンライン版 | 公開中（非規範）[V] | 書籍 2016（オンライン版の更新日は未確認） | — | 2026-10-03 | https://sre.google/sre-book/addressing-cascading-failures/ , https://sre.google/sre-book/being-on-call/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09、RS-15 |
| SS-L04 | Google『The Site Reliability Workbook』（ch.14、ch.16、App.C） | Google（書籍オンライン版） | 書籍オンライン版 | 公開中（非規範）[V] | 書籍 2018（オンライン版の更新日は未確認） | — | 2026-10-03 | https://sre.google/workbook/canarying-releases/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L05 | Google『Building Secure and Reliable Systems』（ch.8〜10） | Google（書籍オンライン版） | 書籍オンライン版 | 公開中（非規範）[V] | 書籍 2020 | — | 2026-10-03 | https://google.github.io/building-secure-and-reliable-systems/raw/ch08.html | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L06 | AWS Well-Architected: Reducing the Scope of Impact with Cell-Based Architecture | AWS | 初版（改訂履歴なし） | 公開済み whitepaper（非規範）[V] | 2023-09-20 | — | 2026-10-03 | https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L07 | AWS Fault Isolation Boundaries | AWS | 2023-02-09 小改訂 | 公開済み whitepaper（非規範）[V] | 2022-11-16 | — | 2026-10-03 | https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/abstract-and-introduction.html | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L08 | AWS Well-Architected Reliability Pillar REL11-BP05（static stability） | AWS | 版番号表示なし（随時更新） | 公開中（非規範）[V] | 未確認 | — | 2026-10-03 | https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_withstand_component_failures_static_stability.html | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L09 | Amazon Builders' Library: Static stability using Availability Zones | AWS | — | 公開中 [V] | 未確認 | — | 2026-10-03 | https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L10 | Amazon Builders' Library: Workload isolation using shuffle-sharding | AWS | Builder Center 版 | 公開中（旧 URL は Builder Center へ 301）[V] | Builder Center 掲載 2026-06-12（最終更新 2026-06-15）。原掲載日は未確認 | — | 2026-10-03 | https://builder.aws.com/content/3F06NpJ8YeoIGP8VHTw4n81pFn8/workload-isolation-using-shuffle-sharding | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L11 | Amazon Builders' Library: Avoiding fallback in distributed systems | AWS | 旧 aws.amazon.com 版（Wayback 2024-08-16 取得） | 公開中（旧 URL は Builder Center へ 301。Builder Center 版は動的描画で取得不可）[V] | 未確認 | — | 2026-10-03 | https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L12 | Amazon Builders' Library: Automating safe, hands-off deployments | AWS | Builder Center 版 | 公開中 [V] | Builder Center 掲載 2026-06-12（最終更新 2026-07-07）。原掲載日は未確認 | — | 2026-10-03 | https://builder.aws.com/content/3ErTKQOTKc5NIw031UePBPxTQ6I/automating-safe-hands-off-deployments | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L13 | Amazon Builders' Library: Ensuring rollback safety during deployments | AWS | Builder Center 版 | 公開中 [V] | 未確認 | — | 2026-10-03 | https://builder.aws.com/content/3F04j2yRAAMBuPSPs50xwXZqg01/ensuring-rollback-safety-during-deployments | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L14 | Amazon Builders' Library: Minimizing correlated failures in distributed systems | AWS | Builder Center 版 | 公開中 [V] | 未確認 | — | 2026-10-03 | https://builder.aws.com/content/3Ev2H7t3l2eZa9xBXiZcAjz12JK/minimizing-correlated-failures-in-distributed-systems | 参照 [D] | 年次（次回 2027-10-03） | RS-09 |
| SS-L15 | AWS SaaS Tenant Isolation Strategies | AWS | — | historical reference only（確認日時点の表示）[V] | 2020-08-01 | — | 2026-10-03 | https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html | 参照（履歴としてのみ。現行は SaaS Lens） [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-L16 | AWS Well-Architected SaaS Lens | AWS | — | 現行 [V] | 2023-04-04（初版 2020-12-03） | — | 2026-10-03 | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-L17 | AWS Prescriptive Guidance: managed PostgreSQL for multi-tenant SaaS | AWS | — | 現行 [V] | 2021-09-30（更新 2024-04-29） | — | 2026-10-03 | https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/ | 参照 [D] | 年次（次回 2027-10-03） | RS-08 |
| SS-L18 | Accelerate: State of DevOps 2019 | DORA（Google Cloud） | 2019 | 公開（調査報告書）[V] | 2019 | — | 2026-10-03 | https://services.google.com/fh/files/misc/state-of-devops-2019.pdf | 参照（変更の数値契約の候補指標） [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-L19 | CNCF Platforms White Paper | CNCF TAG App Delivery | v1（2023-03 完成）、latest 版を公開 | 公開（改訂継続）[V] | 2023-03（v1） | — | 2026-10-03 | https://tag-app-delivery.cncf.io/whitepapers/platforms/ | 参照 [D] | 年次（次回 2027-10-03） | RS-16 |
| SS-L20 | CNCF Platform Engineering Maturity Model | CNCF TAG App Delivery | v1.0 | 公開（サイトは v1 を掲載、改訂は latest で継続）[V] | 2023-10（v1 完成） | — | 2026-10-03 | https://tag-app-delivery.cncf.io/whitepapers/platform-eng-maturity-model/ | 参照 [D] | 年次（次回 2027-10-03） | RS-16 |

## 5. 未確認事項と本台帳の限界

1. 本台帳で原典を再取得したのは、§6 の差異 17 件、EU 法令 9 件の発効日・適用日（官報掲載日と発効条項から算出）、個人情報保護法の改正履歴、§4 の RFC 54 件の状態（RFC Editor のメタデータ）に限られる [D]。それ以外の行の状態・日付は、各ノートの作成者が 2026-10-03 に原典で確認し、別の AI エージェントが独立検証した値をそのまま採った [D]（research/verification/）。
2. 本文を取得していない文書がある [D]。FISC 安全対策基準 第 14 版（SS-F16）、PCI DSS v4.0.1（SS-I01。要件文は退役版 v4.0 の SAQ D で照合）、AICPA TSC（SS-I03）、FAIR Model・FAIR-CAM・O-RT/O-RA（SS-I30〜SS-I32）、IIA Third-Party Topical Requirement（SS-I35）、DMTF DSP2038（SS-D17）である [D]。これらの状態は掲載ページの表示による [D]。
3. 公表日を原典で確認できなかった行がある [D]。AuthZEN の WG 草案 4 件（SS-C15〜SS-C18）、Azure AD の RCA 2 件（SS-J39・SS-J40）、AWS us-east-1 の障害報告（SS-J47）、Amazon Builders' Library の原掲載日、Semantic Versioning 2.0.0（SS-I22）、OWASP API Security Top 10 2023 の月日（SS-I05）などである [D]。結論には使っていない [D]。
4. 次の状態は未確認のままである [D]。EU-US DPF の上訴 C-703/25 P の判決の有無（SS-G12）、NIS2 の加盟国の国内法化状況（SS-G16）、Digital Omnibus の立法手続（SS-G02）、EDPB Guidelines 01/2025・02/2025 の final 版（SS-G04・SS-G05）、OMB M-21-31・M-22-09 と FFIEC ガイダンスの現行性（SS-H17・SS-H18・SS-H14）、SEC への 8-K Item 1.05 撤廃請願への対応（SS-H01）、CAEP Interoperability Profile の改訂後の日程（SS-C12）、NCCoE concept paper の次の段階（SS-E19）、個人情報保護法改正の政令・規則・ガイドラインの内容（SS-F03）。
5. e-Gov の改正履歴には、令和 8 年法律第 56 号のほかに、個人情報保護法を改正する未施行の他法が 4 件登録されている（令和 8 年法律第 46 号: 施行 2028-12-23、令和 8 年法律第 59 号: 2027-04-16、令和 8 年法律第 62 号: 2026-11-02、令和 6 年法律第 60 号: 2027-04-01）[N][^16]。いずれのノートもこれらを扱っておらず、改正内容が本基盤に関係するかは未確認である [D]。SS-F01 を月次確認の対象にした理由の一つである [D]。
6. 「本基盤での扱い」の区分は、ノートの §2・§5 の設計含意と前提台帳から本書が付けた暫定区分である [D]。法令を「準拠基準（条件付）」とした行は、適用判定（DL-34）で非適用になれば「参照」に変わる [D][A-060][A-080]。
7. 本台帳の照合と起草は AI エージェント（Claude）が行った。人間による照合と、法務・CISO・CTO による区分の承認は未了である [D]。

## 6. 差異メモ

ノート間で、同じ文書の状態・日付・参照先が食い違った 17 件を記録する [D]。いずれも 2026-10-03 に原典を取得して確定し、§4 の該当行に反映した [D]。本書は「指示されたファイル以外は編集しない」条件で作成したため、ノート側（RS-xx）の記述は修正していない [D]。「ノート側の扱い」は改訂の候補を示す [D]。

| ID | 対象（台帳行） | ノート間の記述 | 原典で確定した内容 | 種別 | ノート側の扱い |
|---|---|---|---|---|---|
| Δ-01 | draft-ietf-oauth-v2-1 -16（SS-B01） | RS-04・RS-06: 公表日 2026-09-03。RS-17: 2026-09-02 | -16 の投稿は 2026-09-03T00:22Z で、本文ヘッダの日付も 3 September 2026 である [N][^1][^2]。台帳は 2026-09-03 とした [D] | 誤り（RS-17） | RS-17 §4 の日付を改訂候補とする [D] |
| Δ-02 | draft-ietf-oauth-identity-chaining -17（SS-B05） | RS-06: 公表日 2026-07-19。RS-17: 「Datatracker 更新 2026-08-21」 | -17 の投稿は 2026-07-19 で、本文の日付も 19 July 2026 である [N][^3][^4]。2026-08-21 は RFC Editor 側の処理状態が Awaiting First editor に変わった日である [N][^3]。台帳は公表日を 2026-07-19 とし、処理状態を状態列に記した [D] | 基準日の違い | 改訂は不要。RS-17 は基準を明記するとよい [D] |
| Δ-03 | draft-ietf-oauth-rfc7523bis -11（SS-B06） | RS-06: 2026-03-26（文書内日付。掲載 2026-04-28）。RS-17: 2026-04-28（投稿日） | 本文ヘッダの日付は 26 March 2026 である [N][^6]。Datatracker の失効予定日 2026-10-30 は 2026-04-28 の投稿と整合する [N][^5]。台帳は投稿日を公表日とし本文日付を併記した [D]。確認日時点の RFC Editor の処理状態は In Progress（Second Edit、2026-09-30 から）である [N][^5] | 基準日の違い | 改訂は不要。両ノートとも処理状態は確認日時点の値に更新するとよい [D] |
| Δ-04 | draft-ietf-oauth-rfc8725bis -10（SS-B02） | RS-04: RFC Ed Queue、RFC Editor 状態 Blocked。RS-05・RS-11: RFC Ed Queue だけ | 2026-08-25 に IESG 状態が RFC Ed Queue、RFC Editor 状態が Blocked（Reference Not Received）になり、確認日まで変わっていない [N][^7] | 情報の欠落（RS-05・RS-11） | RS-05・RS-11 は Blocked を追記するとよい [D] |
| Δ-05 | OpenID SSF・CAEP・RISC 1.0（SS-C09〜SS-C11） | RS-03・RS-04・RS-13: 承認告知 2025-09-02。RS-14: 承認公表 2025-09-16 | OIDF は 2025-09-02 に 3 仕様の Final 承認（賛成 85・反対 1・棄権 25）を告知した [N][^9]。2025-09-16 はプレスリリースの日付である [N][^10]。台帳は承認告知 2025-09-02、プレスリリース 2025-09-16 と併記した [D] | 表記の誤り（RS-14） | RS-14 §4 の「承認公表」を「プレスリリース」に改める候補 [D] |
| Δ-06 | DS-511（SS-F10） | RS-02: 版「2025 年版（Normative）」、状態 final。RS-03: 版「初版」、状態「決定・施行済」 | DS-511 は 2025-09-30 のデジタル社会推進会議幹事会決定で、改定履歴は「初版決定」である。DS-500 を全面改定し、文書番号を DS-511 に変えたものである [N][^11][^12]。「2025 年版」「施行」の表記は原典にない [D]。台帳は「初版、決定（Normative）」とした [D] | 表記の誤り（双方の一部） | RS-02 の版表記と RS-03 の「施行済」を改訂候補とする [D] |
| Δ-07 | DS-512（SS-F11） | RS-02: 初版か改定版かは未確認。RS-03: 初版 | DS-512 本文の改定履歴は 2026-02-24「初版決定」である。発行はデジタル庁で、区分はデジタル社会推進実践ガイドブック（Informative）である [N][^11][^13] | 未確認の解消 | RS-02 §6 の該当事項は解消できる [D] |
| Δ-08 | 金融分野におけるサイバーセキュリティに関するガイドライン（SS-F15） | RS-01: 版「2025-07-04 一部改正」、2024-10-04 適用。RS-02: 版「2024-10-04 版」 | 掲載版の末尾は「令和６年10月４日 制定 令和７年７月４日 改正」である [N][^14]。2025-07-04 の改正は NISC の国家サイバー統括室への改組に伴う技術的修正で、意見公募手続は行われていない [N][^15]。現行版は 2025-07-04 改正版である [D] | 旧情報（RS-02） | RS-02 §4 の版を改訂候補とする [D] |
| Δ-09 | 個人情報の保護に関する法律等の一部を改正する法律（SS-F03） | RS-02: 法律番号は未確認、状態「公布済未施行」。RS-10・RS-13・RS-14: 令和 8 年法律第 56 号、一部施行済み | e-Gov の改正履歴には、令和 8 年法律第 56 号（公布 2026-07-17）による施行日 2026-07-17・2027-01-17・2028-07-16 の 3 件がある [N][^16]。同法附則第 1 条は、本則を公布から 2 年以内の政令で定める日、附則第 13 条・第 16 条を公布の日、附則第 17 条を令和 8 年法律第 46 号の公布の日とこの法律の公布の日のいずれか遅い日、第 3 号の規定を公布から 6 月を経過した日に施行すると定める [N][^17]。2028-07-16 は e-Gov の仮置き日である [N][^16]。台帳の状態は「公布済未施行（附則の一部だけ施行済み）」とした [D] | 旧情報（RS-02） | RS-02 §4・§6 の法律番号と状態を改訂候補とする [D] |
| Δ-10 | DORA（SS-G18） | RS-02・RS-15: 公表日 2022-12-27（官報）。RS-14: 2022-12-14 | 規則の日付（採択）は 2022-12-14、官報 OJ L 333 への掲載は 2022-12-27 である。第 64 条により官報掲載の 20 日後に発効し、2025-01-17 から適用される [N][^18]。台帳は採択日と官報掲載日を併記した [D] | 基準日の違い | 改訂は不要 [D] |
| Δ-11 | EU-US Data Privacy Framework 十分性認定（SS-G11・SS-G12） | RS-02: 公表日 2025-09-03（判決）。RS-10: 2023-07-10 | 十分性認定（Implementing Decision (EU) 2023/1795）の採択は 2023-07-10 である。2025-09-03 は一般裁判所が T-553/23 で取消請求を棄却した判決の日である [N][^20]。上訴 C-703/25 P は 2025-10-31 に提起され、2025-12-22 に官報に掲載された [N][^21] | 基準日の違い | RS-02 の公表日欄は「判決日」と明記するとよい [D]。上訴審の判決の有無は未確認のまま（§5） |
| Δ-12 | NIS2 指令（SS-G16） | RS-01: 状態「施行済」。RS-02: 「発効済」 | 指令は第 45 条で官報掲載の 20 日後に発効する（2023-01-16）。加盟国は第 41 条により 2024-10-17 までに国内措置を採択・公表し、2024-10-18 から適用する [N][^19]。指令は事業者に直接適用されないため、台帳の状態は「発効済（加盟国の国内法化を要する）」とした [D] | 表記の不正確（RS-01） | RS-01 §4 の「施行済」を改訂候補とする [D] |
| Δ-13 | HIPAA Security Rule 改正 NPRM（SS-H08） | RS-02: NPRM（2025-01-06）、Long-Term Actions、最終化目標 2027-07。RS-10: 改正提案の状態は未確認 | Federal Register で RIN 0945-AA22 に紐づく掲載文書は 2025-01-06 の Proposed Rule（90 FR 898）1 件だけである [N][^25]。Unified Agenda（pubId=202510）は Long-Term Actions、Final Action 07/00/2027 と表示する [N][^26] | 情報の欠落（RS-10） | RS-10 §6 の該当事項は解消できる [D] |
| Δ-14 | Azure AD RCA LN01-P8Z（SS-J40） | RS-09: 公表日は未確認（2021-04-02 以前）。RS-12: 2021-03 | Wayback 2021-04-02 版の見出しは「3/15 RCA - Authentication errors across multiple Microsoft services (Tracking ID LN01-P8Z)」で、3/15 は事象の日（2021-03-15 19:00 UTC〜03-16 09:37 UTC）である [I][^22]。RCA の掲載日は記載されていない [D]。台帳は「未確認（2021-04-02 以前）」とした [D] | 誤り（RS-12 の 2021-03 は事象月） | RS-12 §4 の公表日を改訂候補とする [D] |
| Δ-15 | Kubernetes Deprecation Policy（SS-K32） | RS-11: URL /docs/reference/using-api/deprecation-policy/。RS-16: /docs/reference/deprecation-policy/ | 旧 URL は HTTP 301 で新 URL に転送され、新 URL のページは 2026-08-21 の最終更新（move deprecation policy）を表示する [V][^23]。台帳は新 URL とした [D] | 旧情報（RS-11 の URL） | RS-11 の URL を改訂候補とする [D] |
| Δ-16 | OWASP ASVS 5.0.0（SS-I04） | RS-08・RS-09: tree/v5.0.0_release。RS-17: tree/v5.0.0 | GitHub の 5.0.0 Release は tag `v5.0.0_release`（2025-05-30 公開）である。`v5.0.0` はブランチ名で、両 URL とも参照できる [N][^24]。台帳は Release の tag を参照先とした [D] | 参照先の違い | RS-17 は tag を参照するとよい [D] |
| Δ-17 | NIST SP 800-53 Rev.5（SS-E13） | RS-05・RS-08・RS-09: 公表日 2020-09（Release 5.2.0 は 2025-08-27）。RS-10・RS-16: 2025-08-27 | CSRC の表示は Date Published September 2020（2020-12-10 の更新を含む）で、2025-08-27 に Release 5.2.0 を minor release として公表した [N][^27]。台帳は両方を併記した [D] | 基準日の違い | 改訂は不要 [D] |

差異に数えなかった表記の揺れは次のとおりである [D]。

- 日付の精度の違い: SP 800-63-4 系（2025-07 と 2025-07-31）、CSF 2.0（2024-02 と 2024-02-26）、ASVS 5.0.0（2025-05 と 2025-05-30）、Transaction Tokens -11（2026-07 と 2026-07-30）、Google Cloud Incident #20013（2020-12 と 2020-12-18）、PCI DSS v4.0.1（2024-06 と 2024-06-11）。台帳は細かい方を採った [D]。
- 状態語の違い: RFC の「Standards Track」「Proposed Standard」「final（RFC）」は同じ状態の別表記である [D]。台帳は「final（Proposed Standard）」のように成熟度を括弧で示した [D]。
- 併記の有無: CSRB 報告の DHS 公表日（2024-04-02）、OIDC Core の初版日（2014-02-25）、MCP 仕様の参照先（版のトップと Authorization のページ）、Keycloak 文書の参照ページは、ノートによって併記の有無が異なるだけで、食い違いではない [D]。

## 7. draft 段階のものに設計上依存する場合の注意

### 7.1 原則

1. draft・ipd・WG 草案・提案段階の文書は、規範要求（MUST・SHALL）の根拠として引用しない [D]（RS-04 §2-12）。設計がその内容に従う場合は、文書名・版（-NN 等）・確認日を固定した「社内 profile」として ADR と連携契約に書く [D]（RS-06 §5.1 の L2）。
2. 依存の程度は RS-06 §5.1 の層別で表す [D]。L2（終盤）は版を固定して採用してよい [D]。L3（流動）は振る舞いだけを取り入れ、wire format・claim 名・codepoint には依存しない [D]。L4（未成熟）は契約に入れない [D]。
3. 依存する ADR には、final の標準だけで同じ目的を満たす代替策と、再検討の起点（RFC 発行、WGLC、IESG 提出、失効、置換、新版、final 公表）を書く [D]（G-013）。連携契約には、準拠する標準・版・状態・準拠範囲・独自拡張と、draft の場合の互換方針を書く [D]（G-119）。
4. RFC Editor Queue にある I-D も RFC ではなく、RFC 番号が付くまでは本文が編集され得る [D]。参照文書待ちで止まることもある（8725bis は 2026-08-25 から RFC Editor 状態が Blocked）[N][^7]。RFC 番号が付くまでは draft として扱い、月次で確認する [D]。
5. I-D には Datatracker 上の失効予定日がある（例: Transaction Tokens -11 は 2027-01-31、ID-JAG -04 は 2026-11-22）[N][^8]（ID-JAG は RS-06 §4）。失効や Replaced（例: SS-B18）は依存の解消の起点として扱う [D]。
6. NIST ipd の期限値（IR 8547 ipd の移行期限など）は final で変わり得る [D]。PQC 移行の計画値（A-103）は、final・発出済みの文書（EO 14412、OMB M-26-15、CNSA 2.0、EU ロードマップ、英国 NCSC の時間軸）と突き合わせて記録し、ipd だけを根拠にしない [D][A-103]。
7. 公布済未施行の法令は施行日から逆算して対応を計画する [D]。ただし「政令で定める日」に e-Gov が置く日付（例: 2028-07-16）は仮置きであり、確定した期限として扱わない [N][^16][D]。
8. NPRM・立法提案・意見募集版（HIPAA 改正、CIRCIA、PSR/PSD3、Digital Omnibus、EDPB Guidelines 01/2025・02/2025、ISMAP 改定案）は設計要件にしない [D]。最終化・公布の時点で適用性判定（DL-34）をやり直す [D]。
9. SDO 外で改版の速い仕様（MCP）は、版を固定した adapter に閉じ込める [D]（RS-06 §5.2 ADR-016・ADR-018）。その仕様が草案に依存する部分（MCP Enterprise-Managed Authorization 拡張は ID-JAG -04 に依存）を、基盤の内部契約へ伝播させない [D]。

### 7.2 draft に依存する設計と代替策

「状態」列は §4 と同じ原典による事実 [N] であり、他の列は設計推論 [D] である。依存の程度は §7.1 の 2 の層別による [D]。

| 対象（台帳行） | 状態（2026-10-03） | 依存する設計 | 依存の程度 | 代替策（final の標準で構成） | 再検討の起点 |
|---|---|---|---|---|---|
| Transaction Tokens -11（SS-B04） | WG Consensus: Waiting for Write-Up、IESG 未提出 [N] | ADR-009 の内部 context（`txntoken+jwt` の社内 profile）、ADR-026、DL-55・DL-74 | L2（版固定で採用候補） | RFC 8693 の token exchange と RFC 9068 の JWT（サービス別 aud。RFC 8707）で内部伝播を構成する [D] | IESG 提出、RFC 発行、または失効（2027-01-31） |
| Identity Chaining -17（SS-B05） | RFC Ed Queue、RFC Editor 処理中 [N] | ADR-009・ADR-013 の trust domain・cell 越えの委任 | L2 | RFC 8693 と RFC 7523 の組合せを社内 profile で規定する [D] | RFC 発行 |
| RFC 7523bis -11（SS-B06） | RFC Ed Queue、RFC Editor 処理中（Second Edit）[N] | ADR-005 の client 認証・assertion grant の検証規則 | L2 | RFC 7523 と RFC 8725 の検証規則で運用し、RFC 発行時に差分を取り込む [D] | RFC 発行 |
| JWT BCP 改訂 8725bis -10（SS-B02） | RFC Ed Queue、RFC Editor: Blocked [N] | ADR-005・ADR-007 の JWT 検証規則 | 依存しない（参照のみ） | RFC 8725、RFC 9068、RFC 7519 で規則を構成する [D] | RFC 発行 |
| Token Status List -21（SS-B03） | RFC Ed Queue [N] | ADR-006 の失効表現の候補 | 依存しない（採用候補） | introspection（RFC 7662・RFC 9701）と短命 token で失効を反映する [D] | RFC 発行 |
| OAuth 2.1 -16（SS-B01） | WG Document、IESG 未提出 [N] | ADR-005 の説明上の参照 | 依存しない | RFC 6749、RFC 9700、RFC 10017、RFC 8252 で同等の要件を構成する [D] | IESG 提出、RFC 発行 |
| ID-JAG -04（SS-B07）と MCP Enterprise-Managed Authorization 拡張（SS-I29） | WG Document（2026-11-22 失効予定）／拡張は Stable 表示で ID-JAG -04 に依存 [N] | ADR-004 の顧客 IdP 仲介によるエージェントアクセス（任意機能） | L3 | RFC 8693 と顧客 IdP との OIDC・SAML federation で構成する [D] | WGLC、失効、拡張の改版 |
| CIMD -02（SS-B08）、MCP 2026-07-28（SS-I28） | WG Document ／ SDO 外の最新版 [N] | DL-64 の P-08（MCP server を RS とする既定形）の client 登録 | L3（MCP は版固定 adapter） | 事前登録 client と RFC 9728・RFC 8707 で構成する [D] | CIMD の WGLC、MCP の新版 |
| WIMSE 群（SS-B10〜SS-B17）、spiffe-client-auth（SS-B09）、SPIFFE WIT-SVID（SS-I27） | WG Document・Submitted to IESG・-00 ／ Incubating [N] | ADR-009 の workload 認証 | L3（AIMS は L4） | SPIFFE X509-SVID（Stable）と mTLS（RFC 8705）で構成する [D] | WGLC、Stable 化 |
| SCIM エージェント草案（SS-B19〜SS-B21） | 個人提出・Expired [N] | ADR-004・ADR-017（採用しない方針） | L4（契約に入れない） | 主体カタログ（DL-48）の自社定義と SCIM（RFC 7643・7644）で扱う [D] | WG 採択 |
| FAPI 2.0 HTTP Signatures（SS-C08） | FAPI WG の Drafts [N] | 要求本文の否認防止 | 依存しない | 業務層の署名と監査で補う [D] | OIDF Final |
| CAEP Interoperability Profile ID1（SS-C12） | Implementer's Draft 1。Final 化のレビューやり直し [N] | ADR-006・DL-17 の受信プロファイル | 依存しない | SSF・CAEP・RISC 1.0 Final と自社受信プロファイルで構成する [D] | OIDF Final 承認 |
| AuthZEN の WG 草案（SS-C15〜SS-C18） | WG draft [N] | ADR-011 の PEP–PDP 契約の拡張 | 依存しない | AuthZEN Authorization API 1.0 Final と版付きの自社 profile で構成する [D] | Implementer's Draft 承認 |
| IPSIE profile（SS-C19・SS-C20） | Draft 00 [N] | ADR-006 の失効目標（5 分を候補値） | 参照のみ | 数値契約は PoC の実測で決める（DL-20）[D] | Implementer's Draft 承認 |
| domain verification techniques -13（SS-B22） | I-D、BCP 予定、改訂要 [N] | ADR-004 の domain 検証と再検証の手順 | L2 相当（版固定で参照） | DNS TXT による検証と定期再検証を自社手順として文書化する [D] | BCP 発行、失効（2026-12-24） |
| RFC 6265bis -22（SS-B28） | RFC Ed Queue [N] | BFF の session cookie 属性 | 実質的な依存あり（SameSite 属性は RFC 6265 になく、6265bis で定義される）[N][^35][^36] | CSRF 対策を cookie 属性だけに頼らず、BFF 側の CSRF token と Origin 検証を併用する。対象ブラウザでの挙動を PoC で確認する [D] | RFC 発行 |
| W3C DBSC（SS-D05）と Chrome の対応（SS-K50） | FPWD・Editor's Draft ／ 一部ブラウザで一般提供 [N][V] | session 窃取対策 | 監視のみ（PoC 候補） | BFF、短命 session、高リスク操作の再認証、native は DPoP で構成する [D] | W3C の CR・REC、複数ブラウザの一般提供 |
| W3C Trace Context Level 2（SS-D03）・Baggage（SS-D04） | CR Draft ／ CR Snapshot [N] | 監査の相関 | 依存しない | Trace Context Level 1（Recommendation）を使い、認可文脈を baggage に載せない [D] | Recommendation 化 |
| FIDO CXP（SS-D08） | Working Draft [N] | ADR-018 の passkey の可搬性 | 依存しない（前提にしない） | RP ID を自社ドメインに固定し、再登録の手順を用意する [D] | Proposed Standard |
| PQC の I-D（SS-B23〜SS-B27）、NIST ipd（SS-E22・SS-E32・SS-E34）、FIPS 206（SS-E30） | I-D・RFC Ed Queue・ipd・未公表 [N] | ADR-015・ADR-009・ADR-018、A-103 | draft の codepoint に依存しない | RFC 9964、RFC 9881・9909、RFC 10024、FIPS 203・204・205 で構成し、alg 識別子を版付き profile で持ち複数鍵を併存させる [D][A-103] | RFC 発行、final 公表 |
| NIST の他の ipd（SS-E19・SS-E37・SS-E39） | ipd [N] | 統制マッピング（06_controls） | 依存しない | 現行 final（SSDF 1.1、SP 800-92 等）にマッピングする [D] | final 公表 |
| 法令・規制の草案（SS-F08・SS-G02・SS-G04・SS-G05・SS-G29・SS-H08・SS-H09） | 改定案・提案・意見募集版・NPRM・最終規則未公表 [N] | DL-34、06_controls/applicability | 要件にしない | 現行の規定で判定する [D] | 最終化・公布 |
| 公布済未施行（SS-F03・SS-F19・SS-F20・SS-H12・SS-H13） | 公布済未施行・任意採用期間 [N] | DL-34、侵害通知の runbook | 施行日から逆算して対応 | 施行までは現行規定で運用する [D] | 政令の公布、施行日の到来 |

## 参考文献

§4 の各行の原典は URL 列が指し、値は出典ノートの §4 と参考文献に基づく。以下は本書で再取得し、差異の確定（§6）と法令の施行日の補記（§4）に使った原典である。

[^1]: IETF Datatracker『draft-ietf-oauth-v2-1』文書記録と履歴（Datatracker API で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ （参照箇所: rev 16、new_revision 2026-09-03T00:22:00Z、状態 Active・I-D Exists・WG Document、expires 2027-03-07、確認日: 2026-10-03）
[^2]: D. Hardt, A. Parecki, T. Lodderstedt『The OAuth 2.1 Authorization Framework』draft-ietf-oauth-v2-1-16, 2026-09-03. https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-16.txt （参照箇所: 冒頭ヘッダ（3 September 2026、Expires: 7 March 2027）、確認日: 2026-10-03）
[^3]: IETF Datatracker『draft-ietf-oauth-identity-chaining』文書記録と履歴（Datatracker API で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/ （参照箇所: new_revision -17 2026-07-19T14:03:49Z、RPC status "Awaiting First editor" 2026-08-21T20:25:31Z、状態 RFC Ed Queue・Submitted to IESG for Publication・RFC Editor In Progress、確認日: 2026-10-03）
[^4]: A. Schwenkschuster ほか『OAuth Identity and Authorization Chaining Across Domains』draft-ietf-oauth-identity-chaining-17, 2026-07-19. https://www.ietf.org/archive/id/draft-ietf-oauth-identity-chaining-17.txt （参照箇所: 冒頭ヘッダ（19 July 2026、Intended status: Standards Track）、確認日: 2026-10-03）
[^5]: IETF Datatracker『draft-ietf-oauth-rfc7523bis』文書記録と履歴（Datatracker API で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc7523bis/ （参照箇所: rev 11、expires 2026-10-30、状態 RFC Ed Queue・RFC Editor In Progress、RPC status "In Progress (Second Edit)" 2026-09-30T17:49:30Z、確認日: 2026-10-03）
[^6]: M.B. Jones ほか『Updates to OAuth 2.0 JSON Web Token (JWT) Client Authentication and Assertion-Based Authorization Grants』draft-ietf-oauth-rfc7523bis-11, 2026-03-26. https://www.ietf.org/archive/id/draft-ietf-oauth-rfc7523bis-11.txt （参照箇所: 冒頭ヘッダ（26 March 2026、Updates: 7521, 7522, 7523, 9126 (if approved)）、確認日: 2026-10-03）
[^7]: IETF Datatracker『draft-ietf-oauth-rfc8725bis』文書記録と履歴（Datatracker API で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: 2026-08-25T21:13:51Z の "IESG state changed to RFC Ed Queue"・"RFC Editor state changed to Blocked"・"RPC status changed to blocked: Reference Not Received"、intended_std_level bcp、確認日: 2026-10-03）
[^8]: IETF Datatracker『draft-ietf-oauth-transaction-tokens』文書記録（Datatracker API で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ （参照箇所: rev 11、expires 2027-01-31、状態 I-D Exists・WG Consensus: Waiting for Write-Up、確認日: 2026-10-03）
[^9]: OpenID Foundation『Three Shared Signals Final Specifications Approved』2025-09-02. https://openid.net/three-shared-signals-final-specifications-approved/ （参照箇所: 本文（3 仕様の Final 承認、投票結果 Approve 85・Object 1・Abstain 25）、確認日: 2026-10-03）
[^10]: OpenID Foundation『PRESS RELEASE: OpenID Foundation finalizes global standards for real-time identity security』2025-09-16. https://openid.net/press-release-openid-foundation-finalizes-global-standards-for-real-time-identity-security/ （参照箇所: 冒頭（San Ramon, CA, 16 September 2025、3 仕様の Final 承認）、確認日: 2026-10-03）
[^11]: デジタル庁『標準ガイドライン群』. https://www.digital.go.jp/resources/standard_guidelines （参照箇所: DS-511 と DS-512 の欄（策定日または最終改定日、ドキュメントの位置づけ）、DS-500-1 の「（前版）」表示、確認日: 2026-10-03）
[^12]: デジタル庁『DS-511 行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン』2025-09-30. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/12cb1a6c/20250930_resources_standard_guideline_identityverification_01.pdf （参照箇所: 表紙（2025 年 9 月 30 日 デジタル社会推進会議幹事会決定、Normative）、p.ii 改定履歴（初版決定、DS-500 の全面改定と文書番号の変更）、確認日: 2026-10-03）
[^13]: デジタル庁『DS-512 行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン 解説書』2026-02-24. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/c7edc43c/20260224_resources_standard_guideline_identityverification_1.pdf （参照箇所: 表紙（デジタル社会推進実践ガイドブック、Informative）、p.i 改定履歴（初版決定）、確認日: 2026-10-03）
[^14]: 金融庁『金融分野におけるサイバーセキュリティに関するガイドライン』掲載版. https://www.fsa.go.jp/common/law/cybersecurity_guideline.pdf （参照箇所: 表紙（令和６年 10 月４日）、末尾（令和６年10月４日 制定、令和７年７月４日 改正）、確認日: 2026-10-03）
[^15]: 金融庁『「金融分野におけるサイバーセキュリティに関するガイドライン」の一部改正について』2025-07-04. https://www.fsa.go.jp/news/r7/sonota/20250704/20250704.html （参照箇所: 本文（NISC の国家サイバー統括室への改組に伴う技術的修正、行政手続法に基づく意見公募手続の不実施）、確認日: 2026-10-03）
[^16]: デジタル庁 e-Gov 法令 API『個人情報の保護に関する法律 改正履歴（law_revisions）』. https://laws.e-gov.go.jp/api/2/law_revisions/415AC0000000057 （参照箇所: 令和八年法律第五十六号（公布 2026-07-17）の施行日 2026-07-17・2027-01-17・2028-07-16（施行日欄の注記「公布の日から起算して二年を超えない範囲内において政令で定める日」）と施行状態、令和八年法律第四十六号・第五十九号・第六十二号、令和六年法律第六十号の未施行改正、確認日: 2026-10-03）
[^17]: デジタル庁 e-Gov 法令 API『個人情報の保護に関する法律（令和八年法律第五十六号による改正を反映した未施行版）』law_data 415AC0000000057_20280716_508AC0000000056. https://laws.e-gov.go.jp/api/2/law_data/415AC0000000057_20280716_508AC0000000056 （参照箇所: 令和八年七月一七日法律第五六号 附則第 1 条（施行期日）第 1 号〜第 3 号、確認日: 2026-10-03）
[^18]: 欧州議会・EU 理事会『Regulation (EU) 2022/2554 on digital operational resilience for the financial sector』OJ L 333, 27.12.2022（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng （参照箇所: 表題（of 14 December 2022）、Art. 64、末尾（Done at Strasbourg, 14 December 2022）、確認日: 2026-10-03）
[^19]: 欧州議会・EU 理事会『Directive (EU) 2022/2555 (NIS 2 Directive)』OJ L 333, 27.12.2022（EU 出版局から取得）. https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng （参照箇所: Art. 41(1)、Art. 45、末尾（Done at Strasbourg, 14 December 2022）、確認日: 2026-10-03）
[^20]: EU 司法裁判所『Press Release No 106/25: Judgment of the General Court in Case T-553/23, Latombe v Commission』2025-09-03. https://curia.europa.eu/jcms/upload/docs/application/pdf/2025-09/cp250106en.pdf （参照箇所: p.1（取消請求の棄却、十分性認定の採択日 2023-07-10）、脚注 4（Implementing Decision (EU) 2023/1795）、確認日: 2026-10-03）
[^21]: EU 官報『Appeal brought on 31 October 2025 by Philippe Latombe against the judgment of the General Court delivered on 3 September 2025 in Case T-553/23 (Case C-703/25 P)』OJ C/2025/6610, 22.12.2025（EU 出版局から取得）. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62025CN0703 （参照箇所: 表題、確認日: 2026-10-03）
[^22]: Microsoft Azure『Azure status history』Wayback Machine 2021-04-02 取得版. https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ （参照箇所: 「3/15 RCA - Authentication errors across multiple Microsoft services (Tracking ID LN01-P8Z)」の Summary of Impact、確認日: 2026-10-03）
[^23]: Kubernetes『Kubernetes Deprecation Policy』. https://kubernetes.io/docs/reference/deprecation-policy/ （参照箇所: ページ末尾の "Last modified August 21, 2026 … move deprecation policy"、旧 URL https://kubernetes.io/docs/reference/using-api/deprecation-policy/ の HTTP 301 応答、確認日: 2026-10-03）
[^24]: OWASP『ASVS』GitHub リポジトリの Releases・Tags・Branches（GitHub API で取得）. https://github.com/OWASP/ASVS/releases （参照箇所: Release "OWASP Application Security Verification Standard 5.0.0"（tag v5.0.0_release、2025-05-30T09:35:31Z）、Release "latest"（Bleeding Edge）、branch v5.0.0、確認日: 2026-10-03）
[^25]: Federal Register『Documents with RIN 0945-AA22』Federal Register API. https://www.federalregister.gov/api/v1/documents.json?conditions%5Bregulation_id_number%5D=0945-AA22 （参照箇所: 該当文書 1 件（2025-01-06、Proposed Rule、90 FR 898）、確認日: 2026-10-03）
[^26]: reginfo.gov『View Rule: RIN 0945-AA22』Unified Agenda（pubId=202510）. https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202510&RIN=0945-AA22 （参照箇所: Agenda Stage of Rulemaking: Long-Term Actions、Timetable（NPRM 01/06/2025、Final Action 07/00/2027）、確認日: 2026-10-03）
[^27]: NIST CSRC『SP 800-53 Rev. 5 Security and Privacy Controls for Information Systems and Organizations』. https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final （参照箇所: Date Published（September 2020, includes updates as of Dec. 10, 2020）、Planning Note（08/27/2025、Release 5.2.0）、確認日: 2026-10-03）
[^28]: 欧州委員会『Commission Implementing Regulation (EU) 2024/2690』OJ L 2024/2690, 18.10.2024（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng （参照箇所: 表題（of 17 October 2024）、Art. 16、確認日: 2026-10-03）
[^29]: 欧州委員会『Commission Delegated Regulation (EU) 2024/1774』OJ L 2024/1774, 25.6.2024（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj （参照箇所: 表題（of 13 March 2024）、Art. 42、確認日: 2026-10-03）
[^30]: 欧州委員会『Commission Delegated Regulation (EU) 2025/301』OJ L 2025/301, 20.2.2025（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg_del/2025/301/oj/eng （参照箇所: 表題（of 23 October 2024）、Art. 7、確認日: 2026-10-03）
[^31]: 欧州議会・EU 理事会『Regulation (EU) 2024/1183 amending Regulation (EU) No 910/2014 as regards establishing the European Digital Identity Framework』OJ L 2024/1183, 30.4.2024（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg/2024/1183/oj/eng （参照箇所: 表題（of 11 April 2024）、Art. 2、確認日: 2026-10-03）
[^32]: 欧州委員会『Commission Delegated Regulation (EU) 2018/389』OJ L 69, 13.3.2018（EU 出版局から取得）. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 （参照箇所: 表題（of 27 November 2017）、Art. 38、確認日: 2026-10-03）
[^33]: 欧州議会・EU 理事会『Regulation (EU) 2023/2854 (Data Act)』OJ L 2023/2854, 22.12.2023（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng （参照箇所: 表題（of 13 December 2023）、Art. 50、確認日: 2026-10-03）
[^34]: 欧州議会・EU 理事会『Regulation (EU) 2016/679 (General Data Protection Regulation)』OJ L 119, 4.5.2016（EU 出版局から取得）. https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng （参照箇所: 表題（of 27 April 2016）、Art. 99、確認日: 2026-10-03）
[^35]: A. Barth『HTTP State Management Mechanism』RFC 6265, 2011-04. https://www.rfc-editor.org/rfc/rfc6265.txt （参照箇所: 全文（SameSite 属性の定義がないことを全文検索で確認）、確認日: 2026-10-03）
[^36]: IETF HTTPBIS WG『Cookies: HTTP State Management Mechanism』draft-ietf-httpbis-rfc6265bis-22, 2025-12-01. https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-22.txt （参照箇所: §4.1.2.7 The SameSite Attribute、§5.6.7 The SameSite Attribute、確認日: 2026-10-03）
