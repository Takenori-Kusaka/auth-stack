# RS-06 workload ID・委任・AI エージェント（一次資料調査ノート）

> 文書ID: RS-06 / 版: 0.2 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-100, R-206, R-209, R-029（主なもの）。関連: R-044, R-143, R-162, R-166, R-173, R-208
> 依存文書: CONVENTIONS.md, traceability/deliverables.md（DL-90）, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md（§4・§9-5）, traceability/seed/seed-03-redteam-decision.md（§7-7・§7-10）
> 供給先: ADR-009, ADR-017, ADR-026（主）、ADR-005, ADR-006, ADR-013, ADR-014, ADR-016, ADR-018, ADR-021, DL-48, DL-55, DL-64, DL-74

## 0. 調査方法と本書の扱い

- 調査は 2026-10-03 に実施した。IETF 文書の状態は IETF Datatracker の文書記録（API）で、本文は IETF アーカイブと RFC Editor の原文で確認した。SPIFFE 仕様は GitHub `spiffe/spiffe` の main ブランチ、MCP 仕様は GitHub `modelcontextprotocol/modelcontextprotocol` と modelcontextprotocol.io の原文、NIST 文書は CSRC・nvlpubs の原文 PDF、クラウド各社は公式ドキュメントで確認した。
- 種資料（seed-01〜03）は調査対象の手掛かりにだけ使い、根拠には使っていない。報道・解説・ブログは原典の所在を探す検索にだけ使った。
- 本書の調査・起草には AI エージェント（Claude）を用いた。原典の取得は curl・WebFetch で行い、本文の該当箇所を直接読んで項目化した。
- Internet-Draft は「work in progress」であり、本書で引く要求強度（MUST/SHOULD）は確認日時点の版のものである。RFC 化までに変わり得る。
- 版 0.2 で、作成者以外による全脚注の原典照合（2026-10-03）の結果を反映した。判定と修正内容は research/verification/RS-06-verification.md に記録した。

## 1. 調査の問い

種資料由来（seed-02 §2-5・§4・§9-5）:

1. Q1: workload identity の基盤を SPIFFE/SPIRE にするか、クラウドネイティブの workload identity にするか。trust domain をどの単位で切るか（seed-02 4-1）。
2. Q2: WIMSE 草案群（arch、workload-creds、mutual-tls 等）への依存度をどこまで許すか（seed-02 4-2）。
3. Q3: 署名付き内部 context を自作せず Transaction Tokens に寄せられるか（seed-02 4-3）。
4. Q4: trust domain を越える委任を RFC 8693、identity chaining、ID-JAG のどれで表すか（seed-02 4-4）。
5. Q5: AI エージェントを独立主体として扱うか、利用者からの委任＋`act` で表すか（seed-02 9-5）。
6. Q6: tool 呼出し単位の認可と、人による承認（step-up）をどう組み込むか（seed-02 9-5）。
7. Q7: `act` チェーンの上限、`may_act`、resource indicator、RAR をどう規定するか（seed-02 2-5）。

本ノートで追加した問い:

8. Q8: MCP の最新版（2026-07-28）の認可要件は何か。20 年計画の基盤が MCP の版変更にどう依存しないようにするか。
9. Q9: 非同期・長時間・定期ジョブの委任について標準は何を述べているか（ADR-026、seed-03 §7-7）。
10. Q10: マルチテナント環境で、workload・エージェント向け token にテナント文脈をどう結合するか。
11. Q11: token exchange や Transaction Token で派生した token に、上流の失効はどう伝わるか（ADR-006、R-143）。
12. Q12: エージェント ID のライフサイクル（プロビジョニング・所有者）を標準化された形で運べるか（SCIM agent 草案）。NIST の検討は何を要求しているか。
13. Q13: 主要クラウドの workload identity federation は SPIFFE と相互運用できるか。

## 2. 結論サマリ

1. Transaction Tokens 草案（draft-ietf-oauth-transaction-tokens-11）は、seed-02 4-3 が問う「署名付き短命内部 context」を目的とする形式（`typ`=`txntoken+jwt`、`aud`=trust domain、`txn`・`sub`・`scope`・`req_wl` 必須、`tctx`・`rctx` 推奨）と、RFC 8693 を使う発行手順を規定している [N][^21]。状態は WG 合意済みの write-up 待ちで IESG 未提出であり、RFC ではない [N][^13]。したがって内部 context は自作せず Transaction Token 形式に寄せ、版を固定した社内 profile と差替え可能な adapter で草案依存を隔離するのが妥当である（RS-06#29〜#42 から導出）[D]。
2. Transaction Token だけでは呼出し元 workload を認証できない。草案自身が「replay に耐性がない」「認証資格情報として使ってはならない（MUST NOT）」「下流へは受け取ったまま無改変で渡す（MUST）」と定めている [N][^21]。各 hop の呼出し元認証は X.509-SVID による mTLS で別途行い、Transaction Token と組み合わせる必要がある（RS-06#4・#34・#35・#36 から導出）[D]。
3. 草案への依存度は層で分けられる。低リスク層は RFC 8693・8707・9207・9396・9728 と SPIFFE の Stable 仕様（X509-SVID、JWT-SVID）であり、SPIRE は CNCF Graduated である [N][V][^13][^3][^4][^7]。中リスク層は Transaction Tokens（WG 合意後）、identity chaining と RFC 7523bis（RFC Editor 処理中）である [N][^13]。高リスク層は WIMSE の標準化トラック草案群（WG Document、標準化トラック文書とアーキテクチャ文書の憲章マイルストーンはいずれも期限超過で IESG 未提出、WIMSE WG 発の RFC は 0 件）、ID-JAG（-04、2026-11-22 失効予定）、Client ID Metadata Document（-02）、OAuth 2.1（-16）である [N][^13][^14]。SCIM のエージェント拡張は個人草案だけで、うち少なくとも 3 件は失効済みである [N][^13]。
4. workload identity の初期基盤は X.509-SVID（exactly one URI SAN を MUST とする Stable 仕様）と mTLS にし、JWT-SVID は仕様自身が replay の危険を認める bearer token なので単一 audience に限って補助的に使い、WIMSE の WIT（Incubating／草案）は RFC 化まで採用しないのが妥当である（RS-06#3〜#5・#23 から導出）[D]。
5. 主要 3 クラウドはいずれも外部 workload の資格情報との federation を公式に提供しており、Microsoft Entra は SPIFFE/SPIRE との federation を、Google Cloud は SPIFFE ID 形式の managed workload identity（AI エージェント用 ID を含む）を公式文書に記載している [V][^48][^50][^52][^49]。自社所有ドメインを trust domain 名にした SPIFFE ID を、クラウド間の共通識別子にできる見込みがある（RS-06#7・#77〜#80 から導出、実接続は PoC で確認）[D]。
6. AI エージェントについて、WIMSE アーキテクチャ草案は「AI 仲介者は委任された workload の特殊例」とし、利用者に帰属しない自律動作は「明確に区別しなければならない（MUST）」、多段の各 hop は「security context を明示的に絞り再結合しなければならない（MUST）」と書く [N][^15]。WIMSE の AIMS 草案は「エージェントは workload」であり「ちょうど 1 つの WIMSE 識別子を割り当てなければならない（MUST）」とする [N][^42]。よってエージェントは認証・監査の上では独立主体（1 エージェント＝1 workload ID）として扱い、利用者のために動くときの認可は委任（`sub`＝利用者、`client_id`／`act`＝エージェント）で表し、自律動作は別 ID・別 scope に分ける併用型が標準の方向と一致する（RS-06#20・#43・#45・#69・#70・#75 から導出）[D]。
7. RFC 8693 の `act` は入れ子で委任履歴を表せるが、アクセス制御では最上位 claim と現在の actor だけを考慮しなければならず（MUST）、過去の actor は情報扱いである [N][^22]。`may_act` も処理義務を定めていない [N][^22]。チェーン長の上限や過去 actor に基づく拒否は、標準ではなく社内 profile（DL-74）で決める必要がある（RS-06#43〜#45 から導出）[D]。
8. 人による承認について、MCP は tool 実行を拒否できる human in the loop を SHOULD とするにとどまる [N][^38]。AIMS 草案は、エージェント内の UI 確認だけを認可として扱ってはならない（MUST NOT）とし、確認は認可サーバーが発行する検証可能な grant に結び付けなければならない（MUST）とするが、実行途中での承認方式には追加の仕様化・設計作業が必要になり得る（may be needed）と注記している [N][^42]。高リスクの tool 操作は、操作内容を RFC 9396 の `authorization_details` で表した step-up grant を認可サーバーから得て、tool 側の PEP がそれを検証する方式にするのが妥当である（RS-06#53・#65・#66・#72 から導出）[D]。
9. MCP 2026-07-28 版では認可自体が OPTIONAL であり、認可を実装する HTTP 系 transport は認可仕様に適合すべき（SHOULD）とされる [N][^30]。認可仕様に適合する実装では、MCP server は RFC 9728 Protected Resource Metadata を実装しなければならず（MUST）、client は RFC 8707 の `resource` を認可要求と token 要求の両方に含めなければならず（MUST）、server は自分宛てに発行された token だけを受け入れ、他の token の受入れ・中継をしてはならない（MUST NOT）[N][^30][^37]。MCP は 2024-11 から 2026-07 までに 5 版を出し、2026-07-28 版では initialize handshake とセッションを削除する破壊的変更を行った [N][^27][^29]。基盤の中核は OAuth の RFC 群に依存させ、MCP 固有の要件は外縁の adapter に閉じ込めるべきである（RS-06#54〜#60 から導出）[D]。
10. trust domain を越える委任の土台は identity chaining（IESG 承認済みで RFC Editor 処理中）である [N][^13][^23]。ID-JAG はその profile で、MCP の Enterprise-Managed Authorization 拡張は「Stable」と表示しながら ID-JAG -04 という WG 草案に依存している [N][^41][^24]。B2B 顧客の企業 IdP に自社 SaaS への AI エージェントのアクセスを仲介させる手段として ID-JAG は有力な候補だが、採用は PoC と任意機能にとどめ、草案の WG Last Call 通過を再検討の契機にすべきである（RS-06#46〜#51・#67 から導出）[D]。
11. RFC 8693 は、token exchange が入力 token と出力 token の間に強い結び付きを作らず、失効の伝播は STS プロトコルの一般的性質ではないと明記している [N][^22]。Transaction Token は提示 token の有効期限を超える寿命を TTS の方針で許す [N][^21]。派生 token の剥奪反映時間は「派生 token の最大寿命」で上限が決まるため、ADR-006 は操作リスク階層ごとに派生 token の最大寿命を数値契約として決める必要がある（RS-06#37・#44 から導出）[D]。
12. 非同期・定期ジョブについて、Transaction Tokens 草案は内部から開始する取引で workload が利用者になり代わって Txn-Token を要求する流れを認めており、どの workload が誰の名で発行を受けられるかの発行方針は範囲外としている [N][^21]。この発行方針は社内統制の中核になる。WIMSE アーキテクチャ草案は、非同期処理を行う workload を actor として示し、その workload 資格情報に結び付けた資格情報を使うよう述べている [N][^15]。ADR-026 は、ジョブ実行時に利用者状態を再確認してから Txn-Token を発行する方式を基本にすべきである（RS-06#39・#40・#19 から導出）[D]。
13. Transaction Tokens 草案はテナントを表す claim を定義しておらず、`sub` は trust domain 内で一意であればよい [N][^21]。WIMSE の workload identity practices 草案は、マルチテナント基盤では偽造しやすい属性だけでアクセスや federation を許してはならない（MUST NOT）とする [N][^19]。社内 profile では `tctx` にテナント ID を必須として入れ、PEP がリソース側テナントと突き合わせる必要がある（RS-06#27・#42 から導出）[D]。
14. NIST の関連文書のうち、SP 800-207A は 2023-09 の Final であり、NIST IR 8587 は 2026-09 の Final で workload identity に「短命で範囲を絞った token」を MUST とする [N][^9][^10]。NCCoE のエージェント ID 文書は 2026-02-05 公開の concept paper（Initial Public Draft、意見募集は 2026-04-02 で終了）で、問いを並べた段階であり、依拠できる要件は含まない [N][^11][^12]。
15. SCIM でエージェントを表す草案は個人草案だけで WG 採択されておらず、現行の基底となる draft-wzdk-scim-agent-resource-00 は Informational の -00 版である（それを拡張する draft-kushwaha-scim-agent-governance-00 も個人提出）[N][^13][^44]。エージェント ID のライフサイクル（所有者・状態）は社内の主体カタログ（DL-48）で定義し、SCIM エージェント拡張は監視対象にとどめるべきである（RS-06#74・#75 から導出）[D]。

## 3. 調査結果

### 3.1 SPIFFE / SPIRE

- **RS-06#1** SPIFFE は SPIFFE ID、SVID（検証可能な ID 文書）、Workload API の 3 要素からなり、SVID の文書形式として X.509 証明書、JWT、WIT が定義されている [N][^1]。原文: "The supported document types are an X.509 certificate, JWT token and WIT token."
- **RS-06#2** SPIFFE は 2026-07-01 に仕様の安定度区分（Proposed／Experimental／Incubating／Stable）を導入した [N][^2]。Stable は「破壊的変更を極力避け、重大なセキュリティ問題の解決に限る」区分で、本番の重要用途を対象とする [N][^2]。Incubating を実装する場合は実装した仕様の改訂を記録することが推奨される [N][^2]。
- **RS-06#3** 2026-10-03 時点で、SPIFFE-ID、X509-SVID、JWT-SVID の各仕様は Stable、WIT-SVID は Incubating と表示されている [N][^5][^3][^4][^6]。
- **RS-06#4** X509-SVID は URI SAN をちょうど 1 つ含まなければならず（MUST）、複数の URI SAN を持つ SVID を検証者は拒否しなければならない（MUST）[N][^3]（§2）。leaf の SPIFFE ID は root でない path を持たなければならず（MUST）、署名用証明書を認証に使ってはならない（MUST NOT）[N][^3]（§3.1、§3.2）。
- **RS-06#5** JWT-SVID は `aud` と `exp` を必須とし、検証者は `aud` がないか自分が含まれない token を拒否しなければならない（MUST）[N][^4]（§3.2、§3.3、§4）。仕様は JWT-SVID を bearer token として replay 攻撃を受けやすいと明記し、複数 audience では受信者が他の audience へ成りすませるため単一 audience を「strongly recommended」（小文字表記。なお SPIFFE 仕様群は BCP 14（RFC 2119/8174）の適用を宣言しておらず、大文字の MUST 等も慣用表記である）とする [N][^4]（§3.2、§7.1、§7.2）。原文: "Being a bearer token, JWT-SVIDs are susceptible to replay attacks."
- **RS-06#6** JWT-SVID の `alg` は RFC 7518 §3.3〜§3.5 の値に限られ（MUST）、`typ` は任意で、設定する場合は `JWT` か `JOSE` でなければならない（MUST）[N][^4]（§2.1、§2.3）。SPIFFE bundle 内の JWT-SVID 検証鍵は JWK の `use`=`jwt-svid` で識別され、実装は検証前にこれを抽出しなければならない（MUST）[N][^4]（§6）。
- **RS-06#7** SPIFFE の trust domain 名は自己登録であり、大域的一意性の保証も重複を防ぐ技術的手段もない [N][^5]（§2.1.1）。仕様は、自社が登録しているドメイン名を接尾辞に使うと衝突の可能性が下がると助言している [N][^5]（§2.1.1）。
- **RS-06#8** SPIRE は 2018-03-29 に CNCF に受け入れられ、2020-06-22 に Incubating、2022-08-22 に Graduated となった [V][^7]。最新リリースは v1.15.3（2026-08-21 公開）で、1.14 系にも v1.14.7（2026-05-28）が出ている [V][^8]。

### 3.2 NIST 文書

- **RS-06#9** NIST SP 800-207A『A Zero Trust Architecture Model for Access Control in Cloud-Native Applications in Multi-Location Environments』（PDF 本体の題名。CSRC の文書ページは「Multi-Cloud Environments」と表示）は 2023-09 公開の Final である [N][^9]。ID-SEG-REC-2 は、各サービスが短命で暗号学的に検証可能な ID 資格情報を接続ごとに提示し、定期的に再認証することを推奨する（should）[N][^9]（p.8）。同文書は、接続単位の認証の安全性を、接続を長くしないこと（通常は証明書の TTL 程度、構成によっては 15〜30 分）で保つと述べる [N][^9]（p.8）。
- **RS-06#10** SP 800-207A の ID-SEG-REC-4 の注記で、NIST は外部利用者の短命な資格情報（例: OAuth 2.0 token）を、各 hop で認証できるローカルな token に交換することを推奨している [N][^9]（p.8）。ID-SEG-REC-5 は、各サービスアクセスで認証済み利用者が対象リソースに対して認可されていることを確かめるよう求め、その判定はアプリ自身、JWT の claim、外部 PDP のいずれでもよいとする [N][^9]（p.9）。
- **RS-06#11** NIST IR 8587『Protecting Tokens and Assertions from Forgery, Theft, and Misuse』は 2026-09 公開の Final である [N][^10]。§5.3.1.6 は、workload identity（非人間主体、自動化サービス、機械間処理）が承認済みの企業 ID 基盤だけから発行される範囲を絞った短命 token を使わなければならない（MUST）とし、可能な場合は mTLS や DPoP による送信者制約を使うべき（SHOULD）とする [N][^10]（§5.3.1.6、p.32）。同書の MUST は、政策や契約で拘束されない限り任意適合とされる [N][^10]（§1.2）。
- **RS-06#12** NIST IR 8587 は、AI エージェントが署名付き token を使う場合には同書の指針を適用すべきとしつつ、AI エージェント固有のアクセスリスクは範囲外とし、追加の指針や新しい標準が必要と述べる [N][^10]（§1.1.1、p.2）。
- **RS-06#13** NIST NCCoE の『Accelerating the Adoption of Software and Artificial Intelligence Agent Identity and Authorization』は 2026-02-05 公開の concept paper で、CSRC 上の区分は Initial Public Draft、意見募集は 2026-04-02 で終了している [N][^12]。同書は NCCoE の実証プロジェクトの範囲を決めるための意見募集であり、検討対象の標準として MCP、OAuth 2.0/2.1、OpenID Connect、SPIFFE/SPIRE、SCIM、NGAC を挙げる [N][^11]（p.1、p.6〜7）。初期の範囲は企業内ユースケースで、信頼できない外部エージェントの識別・アクセス管理は扱わない [N][^11]（p.7）。
- **RS-06#14** NCCoE concept paper は「on behalf of」の委任をどう扱うか、human-in-the-loop の承認のためにエージェント ID と人の ID をどう結び付けるか、行動を予測できないエージェントに最小権限をどう設定するかを、答えではなく問いとして列挙している [N][^11]（p.4）。

### 3.3 WIMSE（Workload Identity in Multi-System Environments）

- **RS-06#15** 2026-10-03 時点の WIMSE WG 文書の状態は次のとおりである [N][^13]。draft-ietf-wimse-arch-08（Informational、WG Document）、workload-creds-02、mutual-tls-02、wpt-02、http-signature-07、identifier-03（いずれも Standards Track 予定、WG Document）、workload-identity-practices-07（Informational、IESG 提出済み・AD Evaluation）、aims-00（Informational、WG Document）。旧 s2s-protocol は Replaced（Dead WG Document）で、workload-creds・http-signature・mutual-tls・wpt の 4 文書に置き換えられた [N][^13]。
- **RS-06#16** WIMSE WG の憲章マイルストーンは、標準化トラック文書の IESG 提出期限を 2025-03（3 件）と 2025-11（1 件）、アーキテクチャ文書の提出期限を 2026-07 としている [N][^14]。2026-10-03 時点でこれらはいずれも IESG に提出されておらず、Datatracker 上に WIMSE WG 発の RFC は存在しない [N][^13][^14]。このほか WG ページの Milestones 表には 2024-11 期限の Informational 文書（Kubernetes におけるファイルシステム経由の JWT 配布の考慮事項）のマイルストーンも掲載されている。WG 文書のうち IESG に提出済みなのは workload-identity-practices（AD Evaluation）だけである [N][^13][^14]。
- **RS-06#17** WIMSE アーキテクチャ草案は、trust domain を FQDN で識別すべき（SHOULD）とし、trust domain と trust anchor・JWK Set の対応付けは真正性・完全性・鮮度を保証する安全な手段で得なければならない（MUST）とする（手段自体は範囲外）[N][^15]（§3.1.1）。資格情報には有効期限を区切った自動更新を使うべき（SHOULD）とする [N][^15]（§3.1.3）。
- **RS-06#18** WIMSE アーキテクチャ草案は、gateway が受け取った OAuth access token を token exchange で transaction token 等の内部 context token に変換し、外部向けの bearer access token は通常は内部に転送しない構成例を示す [N][^15]（§3.2.2）。認証の成功を暗黙の認可として扱うことを避けるよう述べる [N][^15]（§4.5）。
- **RS-06#19** WIMSE アーキテクチャ草案は、非同期・バッチ要求では、元の要求元を subject とし、非同期処理を行う workload を actor chain の actor として示す、範囲を絞った資格情報を発行元から得て、それを行為 workload の workload identity 資格情報に結び付けるべき（小文字 should）と述べる [N][^15]（§3.4.9）。
- **RS-06#20** WIMSE アーキテクチャ草案 §3.4.11 は、AI 仲介者を委任された workload の特殊例とし、エージェントは明示的に変換・縮小を認可されていない限り上流の security context を伝播すべき（SHOULD）とする [N][^15]。上流主体に帰属しない自律動作は、別の workload identity や token scope などで委任動作と明確に区別しなければならず（MUST）、エージェント間の多段委任では各 hop が security context を明示的に絞り再結合しなければならない（MUST）[N][^15]。原文: "Such autonomous actions MUST be clearly distinguished from delegated ones, for example by using separate workload identities or token scopes."
- **RS-06#21** workload-creds 草案は、各 WIMSE 資格情報がちょうど 1 つの workload 識別子を持つと定め、運用上の相関情報を 2 つ目の識別子として同じ資格情報に入れてはならない（MUST NOT）とする [N][^16]（§4）。X.509 の Workload Identity Certificate では識別子をちょうど 1 つの URI SAN に入れなければならない（MUST）[N][^16]（§6.1）。
- **RS-06#22** workload-creds 草案の WIT（Workload Identity Token）は `typ`=`wit+jwt` の JWT で、`cnf.jwk` に workload の公開鍵を含めなければならず（MUST）、bearer token として使ってはならない（MUST NOT）[N][^16]（§5.1、§9.2）。汎用実装は ES256 をサポートしなければならず（MUST）、WIT は有効期限を持たなければならず（MUST）、時間単位の短命にすべき（SHOULD）とされる [N][^16]（§5.1、§9.2.1）。
- **RS-06#23** workload-creds 草案の実装状況節（自己申告で IETF は検証しない）では、SPIFFE の X.509-SVID は Workload Identity Certificate と「完全互換で広く使われている」一方、SPIFFE の WIT 対応は beta、Defakto は alpha、Teleport は research と記載されている [N][^16]（§8）。
- **RS-06#24** workload-creds 草案は、WIT と Transaction Token の併用を想定し、WIT の ID で呼べる API を、context token の情報でアクセスできる個別リソースを決める例を示す [N][^16]（§5.3）。
- **RS-06#25** mutual-tls 草案は、認可ポリシーが trust domain と検証に使った trust anchor を考慮せずに識別子の path 部分だけを評価してはならない（MUST NOT）とし、無関係な workload インスタンス間で秘密鍵を共有してはならない（MUST NOT）とする [N][^17]（§5）。identifier 草案は、識別子は暗号学的に検証された資格情報で提示された場合に限り認証済みとみなし、平文で受け取った識別子を認証済みとして扱ってはならない（MUST NOT）とする [N][^18]（§7.2）。識別子は、trust domain の方針で明示的に意図する場合を除き、別の workload に再割当てすべきでない（SHOULD NOT）[N][^18]（§4.5）。
- **RS-06#26** workload identity practices 草案は、token の寿命が表す workload インスタンスの寿命を超えてはならず（MUST NOT、発行基盤が寿命を判定できない場合を除く）、インスタンス停止時に発行元は資格情報を無効化しなければならない（MUST、残余期間が許容できるほど短い場合を除く）とする [N][^19]（§5.4、§5.5）。JWT 資格情報は `aud` を持たなければならず（MUST）、原則として複数 audience を持ってはならない（MUST NOT）[N][^19]（§5.7）。Kubernetes のような基盤 API 用 token をその API 以外に使ってはならない（MUST NOT）[N][^19]（§5.7）。
- **RS-06#27** workload identity practices 草案 §5.8 は、マルチテナント基盤の relying party は偽造しやすい属性だけでアクセスや federation を許してはならず（MUST NOT）、各テナントが同じ issuer 識別子を設定できる環境では `iss` が信頼できる発行者を一意に示さないことがあると警告する [N][^19]。
- **RS-06#28** WPT 草案（draft-ietf-wimse-wpt-02）の Workload Proof Token は WIT の鍵所持を HTTP 要求単位で証明する署名付き JWT で、要求に Transaction Token が含まれる場合はその SHA-256 ハッシュを `tth` claim に入れることが必須である [N][^20]（§2）。これにより Transaction Token を各 hop の送信者証明に結び付けられるが、仕組み自体は WG 草案である [N][^20][^13]。

### 3.4 Transaction Tokens（draft-ietf-oauth-transaction-tokens-11）

- **RS-06#29** draft-ietf-oauth-transaction-tokens-11 は 2026-07-30 付けで、Datatracker 上の WG 状態は「WG Consensus: Waiting for Write-Up」、IESG 状態は「I-D Exists」（IESG 未提出）、失効予定は 2027-01-31 である [N][^13][^21]。
- **RS-06#30** 草案は Txn-Token を、利用者または workload の ID と認可・要求 context を運び、trust domain 内の呼出し連鎖に伝播させる、特定取引に結び付いた短命の署名付き JWT と定義する [N][^21]（§1）。脅威として、正当な取引なしの workload 呼出し、利用者・workload の任意の成りすまし、パラメータ改変、access token の窃取を挙げる [N][^21]（§1）。
- **RS-06#31** JOSE ヘッダーの `typ` は `txntoken+jwt` でなければならない（MUST）[N][^21]（§9.1）。必須 claim は `iat`、`aud`（有効な trust domain を示し、それ以外で受け入れてはならない）、`exp`、`txn`（取引の一意識別子）、`sub`、`scope`、`req_wl`（要求した workload）であり、`tctx`（呼出し連鎖で不変の値）と `rctx`（要求環境）は RECOMMENDED、`iss` は OPTIONAL である [N][^21]（§9.2）。受信者は理解できない claim を無視しなければならない（MUST）[N][^21]（§9.2）。
- **RS-06#32** リモートの TTS に HTTP で要求する場合は RFC 8693 を使わなければならず（MUST）、`grant_type` は token-exchange、`requested_token_type` は `urn:ietf:params:oauth:token-type:txn_token`、`audience` は trust domain 名でなければならない（MUST）[N][^21]（§5.1、§11.1）。`subject_token` には受信した外部 token のほか、自己署名 JWT や署名なし JSON オブジェクトも使える [N][^21]（§11.1、§11.2）。
- **RS-06#33** TTS は要求元 workload のクライアント認証と `subject_token` を検証しなければならず（MUST）、発行する `scope` を元の `subject_token` の scope 以下にしなければならない（MUST）[N][^21]（§11.3、§13.6）。`subject_token` の scope が判定できない場合、TTS は要求を拒否しなければならず、不明な scope を無制限とみなしてはならない（MUST NOT）[N][^21]（§13.14）。
- **RS-06#34** TTS と要求元 workload は相互認証しなければならず（MUST）、workload は公開鍵方式または RFC 7523 の署名付き JWT で TTS に認証すべき（SHOULD）で、その鍵は SPIFFE 等で配布してよい（MAY）[N][^21]（§11.5）。
- **RS-06#35** HTTP で Txn-Token を渡す場合は `Txn-Token` ヘッダーを使わなければならず（MUST）、`Authorization` ヘッダーを使ってはならない（MUST NOT）[N][^21]（§12、§12.1）。受信 workload は署名、`aud`、有効期限を検証しなければならず（MUST）、自分の下流呼出しには受け取った Txn-Token を無改変で含めなければならない（MUST）[N][^21]（§12.2）。受信後の認可判断の方法は範囲外である [N][^21]（§12.2）。
- **RS-06#36** Txn-Token は replay 攻撃に耐性がなく、寿命は短くしなければならない（MUST）[N][^21]（§13.1）。原文: "A Txn-Token is not resistant to replay attacks." `txn` を記録すれば replay を発見でき、受信側で一度だけの利用を検査すれば強い防御になるが、状態を共有しないインスタンス群では実行できない場合がある [N][^21]（§13.2）。Txn-Token を workload の認証資格情報として使ってはならず（MUST NOT）、OAuth access token として使ってもならない（MUST NOT）[N][^21]（§13.12、§13.13）。
- **RS-06#37** Txn-Token の寿命は分単位以下が想定され、提示された token が期限切れなら TTS は発行してはならない（MUST NOT）が、Txn-Token の寿命が提示 token の期限を超えることは TTS の方針で許される（MAY）[N][^21]（§6）。長時間のバッチやオフライン処理でも Txn-Token 自体は短命のままとする [N][^21]（§6）。
- **RS-06#38** Txn-Token を使う各 trust domain は論理的にちょうど 1 つの TTS を持たなければならない（MUST）[N][^21]（§3、§10）。可用性や遅延のために TTS の複数インスタンスを置くことは想定されており、workload 側の構成情報は TTS インスタンスの不正な追加・削除から保護されるべきとされる（小文字の should で BCP 14 の規範語ではない）[N][^21]（§13.8）。
- **RS-06#39** 内部から開始する取引では、workload が自身の ID で、または workload が参照できる情報に基づいて選んだ特定利用者になり代わって（impersonation）Txn-Token を要求できる [N][^21]（§8.2）。TTS はどの workload に発行するかを選択的にすべきとされるが、発行方針の定義と管理は範囲外である [N][^21]（§13.10）。
- **RS-06#40** 既存の Txn-Token を `subject_token` として置換 token を発行する場合、TTS は許可範囲を広げる変更や `txn`・`sub`・`aud` の変更をしてはならず（MUST NOT）、期限切れ token の置換も発行してはならない（MUST NOT）[N][^21]（§13.15）。置換で寿命を延ばすなら置換回数を制限すべき（SHOULD）で、要求元 workload の呼出し連鎖を引き継がなければならない（MUST、方式は範囲外）[N][^21]（§13.15）。
- **RS-06#41** 別の trust domain のリソースへ context を保ったままアクセスする場合は、identity chaining 草案を使うべき（SHOULD）とされる [N][^21]（§14）。Txn-Token 全体をそのままログに記録してはならない（MUST NOT）[N][^21]（§15.2）。token type URN（`txn_token`・`self_signed`・`unsigned_json`）と `tctx`・`rctx` claim は草案の IANA Considerations に登録内容として記載され（RFC 発行時に登録される草案上の記述）、メディアタイプ `txntoken+jwt` と HTTP ヘッダー `Txn-Token` は草案自身が「will be proposed」「is proposed」と書く段階にある [N][^21]（§16、§16.1〜§16.4）。IANA レジストリ側の登録状況は確認していない。
- **RS-06#42** 草案はテナントを表す claim を定義しておらず、`sub` は `aud` の trust domain 内で一意であればよく、OpenID Connect と違って `iss` と結び付かない [N][^21]（§9.2）。`scope` の値は TTS が trust domain の認可モデルに沿って決め、その表現方法は配備ごとの裁量とされる [N][^21]（§9.2.1）。

### 3.5 委任と trust domain 越え（RFC 8693、identity chaining、ID-JAG、RFC 7523bis、RFC 9396）

- **RS-06#43** RFC 8693（2020-01、Standards Track）は、impersonation では A が権利の範囲内で B と区別できなくなるのに対し、delegation では A は B と別の ID を保ち、A が B を代表して行動すると明示されると定義する [N][^22]（§1.1）。原文: "In a sense, A is an agent for B."
- **RS-06#44** RFC 8693 の認可サーバーは、`subject_token` と（あれば）`actor_token` を種別に応じて検証しなければならない（MUST）[N][^22]（§2.1）。token exchange は入力 token と出力 token の間に強い結び付きを作らず、失効イベントの伝播は STS プロトコルの一般的性質ではなく実装・token 種別・配備に依存すると明記している [N][^22]（§2.1）。
- **RS-06#45** RFC 8693 の `act` は入れ子で委任の履歴を表せるが、token の消費者はアクセス制御で最上位 claim と現在の actor だけを考慮しなければならず（MUST）、入れ子の過去 actor は情報扱いでアクセス制御に使わない [N][^22]（§4.1）。`may_act` は、ある主体が別主体の代わりに行動することを認可されているという表明で、token exchange で認可サーバーが判定に「使うかもしれない」と書かれており処理義務はない [N][^22]（§4.4）。
- **RS-06#46** draft-ietf-oauth-identity-chaining-17（2026-07-19、Standards Track 予定）は、IETF 系の状態が「Submitted to IESG for Publication」、IESG 状態が「RFC Ed Queue」、RFC Editor 状態が「In Progress」である [N][^13]。同草案は、trust domain A 内の RFC 8693 token exchange で得た JWT authorization grant を RFC 7523 の assertion として trust domain B の認可サーバーに提示して access token を得る方式を定める [N][^23]（Abstract、§2.3、§2.4）。
- **RS-06#47** identity chaining 草案では、発行する JWT authorization grant の `aud` は B の認可サーバーを示さなければならず（MUST）、単一の認可サーバーに限ることが RECOMMENDED である [N][^23]（§2.3.3）。B の認可サーバーは RFC 7523 §3・§3.1 に従い grant を検証し、subject を特定できなければ拒否しなければならない（MUST）[N][^23]（§2.4.2）。B の認可サーバーは A の client に refresh token を発行すべきでなく（SHOULD NOT）、grant は bearer なので短命化・一回限り・クライアント認証で replay を緩和する [N][^23]（§5.4、§5.5）。
- **RS-06#48** draft-ietf-oauth-identity-assertion-authz-grant-04（ID-JAG、2026-05-21）は WG Document で、2026-11-22 に失効予定である [N][^13][^24]。同草案は identity chaining を Cross-App Access 用に profile 化したもので、token exchange の `subject_token` として ID Token や SAML assertion などの identity assertion を受け付けなければならず（MUST）、IdP が発行した refresh token を追加で受け付けてもよい（MAY）[N][^24]（§1、§4.3）。
- **RS-06#49** ID-JAG の `typ` は `oauth-id-jag+jwt` でなければならず（MUST）、`iss`・`sub`・`aud`・`client_id`・`jti`・`exp`・`iat` が REQUIRED、`act`・`tenant`・`authorization_details`・`resource`・`scope` 等が OPTIONAL である [N][^24]（§3.1）。リソース側認可サーバーは `aud` が自分の issuer 識別子ちょうど 1 つであることと、`client_id` が認証済みクライアントと一致することを検証しなければならず（MUST）、付与する scope・resource は ID-JAG 内の部分集合にしてよい（MAY）[N][^24]（§4.4.1）。
- **RS-06#50** ID-JAG は confidential client に限って支えるべき（SHOULD）とされる [N][^24]（§9.1）。IdP は同じ trust domain 内で自ら発行した ID-JAG に対して access token を発行してはならない（MUST NOT）が、テナントや顧客の境界を越える場合は 1 つのソフトウェアが両役割を担ってよい [N][^24]（§9.3）。同じ ID-JAG を別の下流認可サーバー向けの grant として再利用してはならない（MUST NOT）[N][^24]（§9.3）。リソース側認可サーバーは refresh token を返すべきでなく（SHOULD NOT）、期限切れ時は ID-JAG を再提示する [N][^24]（§4.4.3）。
- **RS-06#51** ID-JAG は `actor_token` の受付を認めるが、その検証・認可・`act` claim への反映の規範的処理は定めておらず、将来の profile や拡張に委ねている [N][^24]（§9.7）。マルチテナントの IdP は対象側がテナント文脈を必要とする場合に `tenant` claim を含めなければならず（MUST）、`sub` は `iss`＋`tenant`＋`sub` で一意でなければならない（MUST）[N][^24]（§6.1、§6.3）。`tenant` claim の定義は OpenID の別文書（[OpenID.Enterprise]）を参照している [N][^24]（§3.1）。
- **RS-06#52** draft-ietf-oauth-rfc7523bis-11（文書内日付 2026-03-26、Datatracker 掲載 2026-04-28）は IESG 状態が「RFC Ed Queue」である [N][^13][^25]。同草案は RFC 7523 の audience 要件を締め、クライアント認証用 JWT の `aud` は認可サーバーの issuer 識別子を唯一の値としなければならず（MUST）、token endpoint の URL を audience に使ってはならない（MUST NOT）、比較はアプリケーション profile が別に定めない限り単純文字列比較でなければならない（MUST）とする [N][^25]（§4）。
- **RS-06#53** RFC 9396（2023-05）は、`scope` では表せない細粒度の認可（例: 「Merchant A に 45 ユーロ送金」）を JSON の `authorization_details` で要求する手段を定める [N][^26]（§1）。

### 3.6 Model Context Protocol（MCP）

- **RS-06#54** MCP 仕様リポジトリには 2024-11-05、2025-03-26、2025-06-18、2025-11-25、2026-07-28 の 5 版があり、2026-07-28 版は 2026-07-28 にリリースされた [N][^27]。modelcontextprotocol.io の `/specification/latest` は 2026-07-28 版の schema を指している [N][^39]。
- **RS-06#55** MCP は「Model Context Protocol a Series of LF Projects, LLC」として運営され、最終決定権を持つ Lead Maintainers（BDFL）を頂点とする階層型の技術ガバナンスを採っており、IETF・OpenID Foundation・W3C のような標準化団体の手続きではない [V][^28]。
- **RS-06#56** 2026-07-28 版は、Streamable HTTP のプロトコルレベルのセッションと `Mcp-Session-Id` ヘッダーを削除し、`initialize` handshake を廃して各要求に版とクライアント能力を載せる stateless 方式に変えた [N][^29]。同版は機能のライフサイクル・廃止方針を採用し、廃止予告から削除まで最低 12 か月の期間を置くとした [N][^29]。Dynamic Client Registration（RFC 7591）は Client ID Metadata Document を優先して廃止予定（Deprecated）とされた [N][^29]。
- **RS-06#57** MCP の認可は OPTIONAL である [N][^30]。実装する場合、HTTP 系 transport は本仕様に適合すべき（SHOULD）で、STDIO transport は本仕様に従うべきでなく（SHOULD NOT）環境から資格情報を得る [N][^30]（Protocol Requirements）。認可サーバーは OAuth 2.1 を実装しなければならない（MUST）[N][^30]（Overview）。
- **RS-06#58** MCP server は RFC 9728 Protected Resource Metadata を実装しなければならず（MUST）、その文書は `authorization_servers` に少なくとも 1 つの認可サーバーを含めなければならない（MUST）[N][^30][^31]。MCP client は RFC 9728 で認可サーバーを発見しなければならず（MUST）、認可サーバーメタデータの `issuer` が取得に使った issuer 識別子と一致しなければそのメタデータを使ってはならない（MUST NOT）[N][^30][^31]。RFC 9728 自体も、返された `resource` 値が要求に使った resource 識別子と同一でなければ内容を使ってはならない（MUST NOT）と定める [N][^32]（§3.3）。
- **RS-06#59** MCP client は RFC 8707 の `resource` パラメータを認可要求と token 要求の両方に含め、MCP server の正規 URI を指定しなければならず（MUST）、認可サーバーが対応しているかに関係なく送らなければならない（MUST）[N][^30]（Resource Parameter Implementation）。RFC 8707 は、認可サーバーは発行する access token を `resource` で示された対象に audience 制限すべき（SHOULD）と定める [N][^33]（§2）。RFC 9728 は、複数のリソースサーバーと通信する client は audience 制限された token を要求すべき（SHOULD）とする [N][^32]（§7.4）。
- **RS-06#60** MCP server は自分宛てに発行された access token だけを受け入れなければならず（MUST）、他の token を受け入れたり中継したりしてはならない（MUST NOT）[N][^30]（Token Handling）。上流 API を呼ぶ MCP server は、MCP client から受け取った token を上流へ素通ししてはならない（MUST NOT）[N][^37]（Access Token Privilege Restriction）。
- **RS-06#61** MCP の認可サーバーは認可応答に RFC 9207 の `iss` を含めるべき（SHOULD）で、含める場合はメタデータで表明しなければならない（MUST）[N][^30]（Authorization Response Validation）。MCP client は認可コードを token endpoint に送る前に RFC 9207 §2.4 の検証をしなければならず（MUST）、仕様は将来の版で認可サーバー側の `iss` 付与を MUST に上げる見込みを記している [N][^30]。RFC 9207 は、`iss` が期待する issuer と一致しない応答を client は拒否しなければならない（MUST）と定める [N][^34]（§2.4）。
- **RS-06#62** MCP の client 登録は、事前登録、Client ID Metadata Document（CIMD）、Dynamic Client Registration の順で選ぶべき（SHOULD）とされ、CIMD は client と認可サーバーの双方がサポートすべき（SHOULD）、DCR は MAY かつ廃止予定である [N][^35][^30]。CIMD 草案（-02）は共有秘密に基づくクライアント認証方式の使用を禁じ（MUST NOT）、認可サーバーが特殊用途 IP アドレスに解決される URL を取得することを禁じている（MUST NOT、本番環境）[N][^36]（§4.1、§8.6）。
- **RS-06#63** MCP 2026-07-28 版の認可仕様は規範参照として OAuth 2.1 の draft-ietf-oauth-v2-1-13 と CIMD の draft-00 を指定しているが、確認日時点の最新版はそれぞれ -16 と -02 である [N][^30][^13]。CIMD のセキュリティ考慮事項の節番号は -00 の §6 から -02 の §8 に移っている [N][^37][^36]。
- **RS-06#64** MCP client は PKCE を実装し、可能な限り `S256` を使わなければならず（MUST）、認可サーバーメタデータに `code_challenge_methods_supported` がなければ処理を続けてはならない（MUST）[N][^37]（Authorization Code Protection）。認可サーバーは事前登録値と完全一致で redirect URI を検証しなければならず（MUST）、public client には refresh token を rotation しなければならない（MUST）[N][^37]（Open Redirection、Token Theft）。
- **RS-06#65** 実行時に scope が足りない場合、MCP server は `403` と `WWW-Authenticate: Bearer error="insufficient_scope"`、必要 scope、resource metadata の URI を返すべき（SHOULD）で、必要 scope は要求引数と文脈から動的に決めてよい [N][^30]（Scope Challenge Handling）。利用者の代わりに動く client は step-up 認可を試みるべき（SHOULD）で、server は scope の階層を考慮しなければならない（MUST）[N][^30]（Step-Up Authorization Flow）。
- **RS-06#66** MCP の tools 仕様は、信頼と安全のために tool 呼出しを拒否できる human in the loop を常に置くべき（SHOULD）とし、アプリケーションは実行前の確認プロンプトを示すべき（SHOULD）とする [N][^38]。client は信頼できる server から得たものでない限り tool の annotation を信頼してはならない（MUST）[N][^38]。仕様全体の Key Principles にある「tool を呼ぶ前に利用者の明示的同意を得なければならない」は小文字の must で書かれており、BCP 14 の規範語は大文字の場合に限るとの宣言に照らすと規範要求ではない [N][^39]。同節は MCP 自体はプロトコルレベルでこれらの原則を強制できないと述べる [N][^39]。
- **RS-06#67** MCP の認可拡張リポジトリは Enterprise-Managed Authorization を Stable、OAuth Client Credentials 拡張を draft と表示している [N][^40]。Enterprise-Managed Authorization は ID-JAG（draft-04）を企業内の MCP 配備に適用するもので、MCP client が利用者操作なしに access token を取得でき、企業管理者が利用可能な MCP server を管理できると述べる [N][^41]（§1.1、§2）。

### 3.7 AI エージェント関連（AIMS、SCIM、ベンダー実装、草案の分散）

- **RS-06#68** draft-ietf-wimse-aims-00（AI Identity Management System、2026-09-15、Informational）は WIMSE WG 文書で、個人草案 draft-klrc-aiagent-auth を置き換えた [N][^13][^42]。同草案は新プロトコルを定義せず、WIMSE・OAuth・SPIFFE・OpenID SSF などの既存および策定中の仕様をエージェント用途に組み合わせる [N][^42]（Abstract、§2）。
- **RS-06#69** AIMS 草案は「エージェントは workload」とし、エージェントは一意に識別されなければならず（MUST）、ちょうど 1 つの WIMSE 識別子（SPIFFE ID でもよい）を割り当てられなければならない（MUST）とする [N][^42]（§4、§6）。エージェントは識別子に暗号学的に結び付いた資格情報を持たなければならず（MUST）、資格情報は短命にすべき（SHOULD）で明示的な有効期限を持たなければならない（MUST）[N][^42]（§7）。静的 API キーはエージェント ID のアンチパターンとされる [N][^42]（§7）。
- **RS-06#70** AIMS 草案の access token では、エージェントの ID を `client_id`、利用者やシステムの代わりに動く場合のその主体を `sub` で表し、リソースサーバーはこれらの識別子をアクセス判定に使わなければならない（MUST）[N][^42]（§10.3）。利用者が委任する場合は authorization code grant を、エージェント自身の権限で動く場合は client credentials grant か JWT authorization grant を使い、静的な長期 client secret は使わない [N][^42]（§10.4.1、§10.4.2）。
- **RS-06#71** AIMS 草案は、エージェント・LLM・tool を構成するマイクロサービス間で access token を受け渡す代わりに Transaction Token に交換できる（can exchange）とし（§10.5）、tool が複数のマイクロサービスで実装される場合は transaction token を使うべき（小文字の should）とする（§10.8）。tool が受け取った access token を下流へ転送することはアンチパターンとされる [N][^42]（§10.5、§10.8）。認可サーバーが異なる資源へは identity chaining か ID-JAG 等を使うべき（SHOULD）とする [N][^42]（§10.6）。
- **RS-06#72** AIMS 草案 §10.7 は、エージェント内の UI で得た利用者確認はそれだけでは認可にならず、認可サーバーが発行する検証可能な grant に結び付けなければならず（MUST）、エージェントはローカル UI の確認だけを十分な認可として扱ってはならない（MUST NOT）とする [N][^42]。手段として OpenID CIBA（2021-09-01 Final）による帯域外承認を挙げつつ、CIBA は client 起動しか想定せず実行途中の確認に合わないため、追加の仕様化・設計作業が必要になり得る（may be needed）と注記している [N][^42][^43]。原文: "the agent MUST NOT treat local UI confirmation alone as sufficient authorization."
- **RS-06#73** AIMS 草案 §11 は、配備はエージェントの行動と認可文脈を事後に再構成できる監視を維持しなければならず（MUST）、監査記録は改ざん検知可能でなければならない（MUST）とする [N][^42]。監査イベントは少なくとも、認証済みエージェント識別子、委任元主体、アクセス先リソース・tool、要求操作と判定、時刻と相関 ID、判定に影響した状態、是正・失効イベントと原因を記録しなければならない（MUST）[N][^42]。失効や格下げの通知を受けた受信者は、無効になった認可判定や token を使い続けてはならない（MUST NOT）[N][^42]。
- **RS-06#74** SCIM でエージェントを表す草案は、draft-wzdk-scim-agent-resource-00（2026-06-05、Informational）と draft-kushwaha-scim-agent-governance-00（2026-07-26）がいずれも個人提出（Individual Submissions）で、先行の draft-wahl-scim-agent-schema-01、draft-scim-agent-extension-00（2025-10-11）、draft-abbey-scim-agent-extension-00 は失効している [N][^13]。wzdk-00 は SCIM に `Agent` リソース型を追加し、`agentUserName` を必須かつ一意（MUST）とし、責任者を表す `owners` 属性と、グループのメンバーにエージェントを含められる拡張を定める [N][^44]（§3、§4.1、§4.2、§4.4）。kushwaha-00 は、真偽値より細かいライフサイクル状態、自律度区分、有効期間などのガバナンス属性を追加する [N][^45]（Abstract）。
- **RS-06#75** Microsoft Entra Agent ID の公式文書（2026-06-15 更新）は、エージェント ID を利用者・アプリケーション（service principal）・workload の ID と区別される専用の ID 構造とし、エージェントが自身に与えられた権限で自律的に動く方式と、利用者の権限の委任を受けて動く方式の両方を挙げる [V][^46]。Copilot Studio で作成したエージェントには作成者が sponsor として記録される [V][^46]。
- **RS-06#76** IETF Datatracker の文書 API で、名前に「agent」を含み 2025-06-01 以降に更新された Internet-Draft は 258 件あり、題名・要旨に AI 関連語（AI、agentic、autonomous、LLM、language model、MCP を単語境界 `\b` 付き・大文字小文字を問わない正規表現で照合。単語境界なしの部分一致では 237 件）を含むものは 203 件で、そのうち名前が `draft-ietf-` で始まる WG 文書は 0 件であった [M][^47]。測定条件: 2026-10-03 実行、`name__contains=agent&type=draft&time__gte=2025-06-01`、`time` は最終更新時刻で失効済み草案を含む。名前に「agent」を含まない WG 文書（例: draft-ietf-wimse-aims）は数えていない。

### 3.8 主要クラウドの workload identity federation

- **RS-06#77** Google Cloud の Workload Identity Federation（2026-09-30 更新）は、オンプレミスやマルチクラウドの workload に、service account キーの代わりに federated identity で Google Cloud リソースへのアクセスを与える [V][^48]。対応する外部資格情報には X.509 クライアント証明書、AWS、Azure、OIDC または SAML 2.0 に対応する任意の IdP が含まれ、リソースへの直接アクセス許可と service account の impersonation の両方が使える [V][^48]。
- **RS-06#78** Google Cloud の managed workload identities（2026-09-30 更新）は SPIFFE に基づき、Certificate Authority Service から X.509 資格情報と trust anchor を発行する [V][^49]。SPIFFE ID の形式として Compute Engine 用、GKE 用に加え、Vertex AI Agent Engine のエージェント用（`spiffe://agents.global.org-ORGANIZATION_ID.system.id.goog/resources/aiplatform/...`）が記載され、GKE 向けは Preview と表示されている [V][^49]。
- **RS-06#79** AWS IAM Roles Anywhere は、自社 CA が発行した X.509 証明書で AWS 外の workload に一時資格情報を与え、CA を trust anchor として登録する [V][^50]。信頼境界はアカウント単位で、ロールの信頼ポリシーに条件を付けない限り、アカウント内の任意の trust anchor の証明書で同じアカウントの任意の対象ロールを引き受けられる [V][^50]。AWS IAM outbound identity federation は、AWS 上の workload が STS の `GetWebIdentityToken` API で短命の署名付き JWT を取得し、外部サービスが OIDC discovery で公開された検証鍵で検証する方式で、署名アルゴリズム・許可 audience・有効期間を IAM ポリシーで制御できる [V][^51]。
- **RS-06#80** Microsoft Entra Workload ID の workload identity federation（2026-08-13 更新）は、Kubernetes、GitHub Actions、Google Cloud、AWS（outbound identity federation 経由）、SPIFFE/SPIRE などの外部 IdP の token を Microsoft identity platform の access token に交換できる [V][^52]。federated identity credential の `issuer`・`subject`・`audience` は外部 token の値と大文字小文字を区別して一致しなければならず、外部 IdP の署名鍵は最初の 100 個までしか保存されない [V][^52]。

## 4. 標準・文書ステータス表

状態列と日付列は各脚注の原典と IETF Datatracker の文書記録 [N][^13] による。確認日はすべて 2026-10-03。

| 名称 | 版 | 状態 | 公表日（版の日付） | 確認日 | URL |
|---|---|---|---|---|---|
| RFC 8693 OAuth 2.0 Token Exchange | RFC | final（Standards Track） | 2020-01 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8693 |
| RFC 8707 Resource Indicators for OAuth 2.0 | RFC | final（Standards Track） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8707 |
| RFC 9207 OAuth 2.0 AS Issuer Identification | RFC | final（Standards Track） | 2022-03 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9207 |
| RFC 9396 OAuth 2.0 Rich Authorization Requests | RFC | final（Standards Track） | 2023-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9396 |
| RFC 9728 OAuth 2.0 Protected Resource Metadata | RFC | final（Standards Track） | 2025-04 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9728 |
| draft-ietf-oauth-transaction-tokens | -11 | draft（WG Consensus: Waiting for Write-Up、IESG 未提出、2027-01-31 失効予定） | 2026-07-30 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ |
| draft-ietf-oauth-identity-chaining | -17 | draft（Submitted to IESG、RFC Ed Queue、PS 予定） | 2026-07-19 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/ |
| draft-ietf-oauth-identity-assertion-authz-grant（ID-JAG） | -04 | draft（WG Document、2026-11-22 失効予定） | 2026-05-21 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-assertion-authz-grant/ |
| draft-ietf-oauth-rfc7523bis | -11 | draft（RFC Ed Queue、PS 予定） | 2026-03-26（文書内日付。Datatracker 掲載 2026-04-28） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc7523bis/ |
| draft-ietf-oauth-client-id-metadata-document（CIMD） | -02 | draft（WG Document） | 2026-07-06 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/ |
| draft-ietf-oauth-spiffe-client-auth | -02 | draft（WG Document） | 2026-06-15 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-spiffe-client-auth/ |
| draft-ietf-oauth-v2-1（OAuth 2.1） | -16 | draft（WG Document） | 2026-09-03 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ |
| draft-ietf-wimse-arch | -08 | draft（WG Document、Informational、憲章期限 2026-07 超過） | 2026-07-06 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-arch/ |
| draft-ietf-wimse-workload-creds | -02 | draft（WG Document） | 2026-07-02 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-workload-creds/ |
| draft-ietf-wimse-mutual-tls | -02 | draft（WG Document） | 2026-07-06 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-mutual-tls/ |
| draft-ietf-wimse-wpt | -02 | draft（WG Document） | 2026-08-27 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-wpt/ |
| draft-ietf-wimse-http-signature | -07 | draft（WG Document） | 2026-09-20 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-http-signature/ |
| draft-ietf-wimse-identifier | -03 | draft（WG Document） | 2026-07-06 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-identifier/ |
| draft-ietf-wimse-workload-identity-practices | -07 | draft（Submitted to IESG、AD Evaluation、Informational） | 2026-09-22 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-workload-identity-practices/ |
| draft-ietf-wimse-aims | -00 | draft（WG Document、Informational） | 2026-09-15 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-aims/ |
| draft-ietf-wimse-s2s-protocol | -07 | Replaced（Dead WG Document） | 2025-10-16（2025-11-06 は置換処理による Datatracker 記録の更新日） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-wimse-s2s-protocol/ |
| draft-wzdk-scim-agent-resource | -00 | draft（個人提出、Informational） | 2026-06-05 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-wzdk-scim-agent-resource/ |
| draft-kushwaha-scim-agent-governance | -00 | draft（個人提出、Informational） | 2026-07-26（文書内日付。Datatracker 掲載 2026-07-27 UTC） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-kushwaha-scim-agent-governance/ |
| draft-wahl-scim-agent-schema / draft-scim-agent-extension / draft-abbey-scim-agent-extension | -01 / -00 / -00 | Expired（個人提出） | 2025-08-19 / 2025-10-11 / 2025-10-16 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-wahl-scim-agent-schema/ |
| SPIFFE X509-SVID / JWT-SVID / SPIFFE-ID | main（最終変更 2026-07-01） | Stable（SPIFFE 安定度区分） | 2026-07-01 | 2026-10-03 | https://github.com/spiffe/spiffe/tree/main/standards |
| SPIFFE WIT-SVID / Broker API | main | Incubating | 2026-07-01（WIT-SVID 追加） | 2026-10-03 | https://github.com/spiffe/spiffe/blob/main/standards/WIT-SVID.md |
| SPIRE | v1.15.3 | CNCF Graduated（2022-08-22） | 2026-08-21 | 2026-10-03 | https://github.com/spiffe/spire/releases |
| NIST SP 800-207A | — | final | 2023-09 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/207/a/final |
| NIST IR 8587 | — | final | 2026-09 | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8587/final |
| NIST NCCoE concept paper: Software and AI Agent Identity and Authorization | — | ipd（concept paper、意見募集 2026-04-02 終了） | 2026-02-05 | 2026-10-03 | https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd |
| MCP Specification（認可を含む） | 2026-07-28 | 最新版（SDO 外の LF Projects 仕様） | 2026-07-28 | 2026-10-03 | https://modelcontextprotocol.io/specification/2026-07-28 |
| MCP Enterprise-Managed Authorization 拡張 | — | Stable 表示（ID-JAG -04 に依存） | 2026-06-18（最終変更） | 2026-10-03 | https://github.com/modelcontextprotocol/ext-auth |
| OpenID Connect CIBA Core 1.0 | 1.0 | final | 2021-09-01 | 2026-10-03 | https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html |

種資料の記述との差分（Phase 2 の再検証結果）[N][^13][^27][^12][^7]:

| 種資料の記述（seed-02） | 確認結果 |
|---|---|
| identity-chaining【要】 | IESG 承認済みで RFC Editor 処理中（RFC Ed Queue）。RFC 番号は未付与。 |
| MCP 2026-07-28 認可【確:要再検証】 | 2026-07-28 版が最新であることを確認。DCR が廃止予定になり CIMD が SHOULD になった。 |
| NIST NCCoE concept paper(2026-02)【確:要再検証】 | 2026-02-05 公開の Initial Public Draft。意見募集は終了。その後の段階は未確認（§6）。 |
| SCIM Agent【草】（draft-wzdk-scim-agent-resource） | 個人提出の -00。WG 採択されていない。 |
| SPIRE(CNCF Graduated)【確】 | 2022-08-22 Graduated を確認。 |
| WIMSE arch/workload-creds/mutual-tls【草】 | いずれも WG Document。憲章マイルストーンは期限超過。 |

## 5. 設計への含意

### 5.1 ドラフト依存度の層別（Q2 への回答）

状態列は §3・§4 の確認結果 [N]、層と方針は本ノートの設計推論 [D] である。

| 層 | 対象 | 根拠 | 方針 |
|---|---|---|---|
| L1 確定 | RFC 8693・8707・9207・9396・9728、SPIFFE X509-SVID・JWT-SVID・SPIFFE-ID（Stable）、SPIRE（Graduated） | RS-06#3・#8・§4 | 基盤の契約に直接使う |
| L2 終盤 | identity chaining、RFC 7523bis（RFC Ed Queue）、Transaction Tokens（WG 合意後） | RS-06#29・#46・#52 | 版を固定した社内 profile で採用し、RFC 発行時に差分を取り込む |
| L3 流動 | WIMSE workload-creds・WPT・http-signature・mutual-tls・identifier・arch、ID-JAG、CIMD、OAuth 2.1、SPIFFE WIT-SVID | RS-06#15・#16・#23・#48・#63 | 振る舞い（例: mTLS の識別子検証）は取り入れるが、wire format には依存しない。PoC と任意機能に限る |
| L4 未成熟 | AIMS（-00）、SCIM エージェント草案（個人提出・失効あり）、エージェント関連個人草案群 | RS-06#68・#74・#76 | 設計の参考と監視対象にとどめ、契約に入れない |

### 5.2 ADR・設計文書への入力

| 入力先 | 入力内容 | 根拠 | 閉じ方 |
|---|---|---|---|
| ADR-009（workload identity・token exchange） | (a) 認証は X.509-SVID＋mTLS を既定にし、識別子検証は trust domain と trust anchor を必ず結合する [D]。(b) 内部 context は Transaction Token 形式（`txntoken+jwt`）の社内 profile とし、`tctx` にテナント ID・profile 版を必須にする [D]。(c) trust domain は自社所有 FQDN で命名し、cell ごとに分けるかは ADR-013 と同時に決める [D]。(d) JWT-SVID は単一 audience、`use`=`jwt-svid` 鍵の分離を条件に補助的に使う [D]。 | RS-06#4〜#7・#17・#25・#29〜#42 | A（方針）、C（性能・可用性） |
| ADR-017（非人間 ID・AI エージェント） | (a) エージェントごとに 1 つの workload ID（SPIFFE ID）を発行し、認証・監査上は独立主体とする [D]。(b) 利用者のための動作は委任（`sub`＝利用者、`client_id`／`act`＝エージェント）で表し、impersonation は使わない [D]。(c) 自律動作は別 ID または別 scope に分け、委任動作と混在させない [D]。(d) 高リスク tool 操作は、`authorization_details` で操作内容を表した step-up grant を認可サーバーから取得させ、UI 確認だけでは許可しない [D]。(e) MCP の tool annotation は信頼しない [D]。 | RS-06#20・#43・#45・#53・#66・#69〜#72・#75 | A（方針）、C（承認 UX・遅延） |
| ADR-026（非同期・長時間ジョブ） | (a) 定期ジョブは実行時に TTS へ内部開始フローで要求し、TTS は発行前に利用者の在籍・権限状態を再確認する [D]。(b) 「どの workload が誰の名で Txn-Token を得られるか」を TTS 発行方針として台帳化し、変更を二者承認にする [D]。(c) ジョブの actor は実行 workload とし、元の利用者を `sub` に保つ [D]。 | RS-06#19・#37・#39・#40 | A・B（発行方針の承認者）・C |
| ADR-005／DL-16（token profile） | token 種別間の相互排他的検証規則に、`txntoken+jwt`、`wit+jwt`、`oauth-id-jag+jwt`、`client-authentication+jwt` を加える [D]。JWT-SVID は `typ` で区別できない（任意かつ `JWT`／`JOSE`）ため、`iss`・`aud`・検証鍵集合で区別する [D]。 | RS-06#6・#22・#31・#49・#52 | A・C（負例試験） |
| ADR-006（失効・継続評価） | 派生 token（交換後 access token、Txn-Token、置換 Txn-Token）の最大寿命を操作リスク階層ごとに数値契約として決め、剥奪反映時間の上限として扱う [D]。置換による寿命延長は回数上限を設ける [D]。 | RS-06#37・#40・#44・#73 | B（数値決裁）・C |
| ADR-013（cell・fail-mode） | trust domain ごとに論理 TTS が 1 つ必要なため、TTS は cell ごとに置き、cell 越えは identity chaining として扱うかを決める [D]。SPIRE server・TTS 停止時の SVID・Txn-Token の残存寿命と縮退動作を fail-mode 表に入れる [D]。 | RS-06#38・#41・#46 | A・C（chaos 試験） |
| ADR-014（監査） | AIMS の必須監査項目（エージェント ID、委任元、tool、判定、相関 ID、状態、失効）を decision event スキーマに写像し、`txn` を相関 ID に使う [D]。Txn-Token 原文はログに残さない [D]。 | RS-06#41・#73 | A |
| ADR-016／ADR-018（versioning・出口） | L2・L3 の草案に依存する箇所を一覧化し、再検討トリガー（Transaction Tokens の RFC 発行、WIMSE creds の WGLC、ID-JAG の WGLC または失効、MCP の新版）を登録する [D]。MCP 固有要件は外縁の adapter に閉じ込める [D]。 | RS-06#16・#54〜#56・#63・§5.1 | A |
| ADR-021（不可逆識別子） | SPIFFE trust domain 名と workload／エージェント識別子の命名規則を不可逆識別子として扱い、自社所有ドメインを接尾辞にし、再割当てを禁止する [D]。 | RS-06#7・#17・#25 | A・B（DEC-3） |
| ADR-004（B2B federation） | 顧客企業 IdP が自社 SaaS へのエージェントアクセスを仲介する手段として ID-JAG を任意機能で検討し、`tenant`・`aud_tenant` の扱いを決める [D]。SCIM エージェント拡張は採用しない [D]。 | RS-06#48〜#51・#74 | A・C |
| DL-55／DL-74（Token Exchange API） | `requested_token_type` に txn_token を含める、`act` チェーン長の上限と過去 actor の扱い、`may_act` の検証有無、`resource` 必須化、RAR の受付範囲を社内 profile で規定する [D]。 | RS-06#32・#45・#53・#59 | A・C |
| DL-48（主体カタログ） | agent/AI 類型に、workload ID、所有者（owners／sponsor）、自律度区分、有効期間、委任可否を必須属性として定義する [D]。 | RS-06#69・#74・#75 | A |
| DL-64（連携パターン P-03・P-05・P-08） | P-03 は mTLS＋Txn-Token、P-05 は内部開始 Txn-Token、P-08 は MCP server を OAuth リソースサーバー（RFC 9728 必須、token 素通し禁止）として扱う既定形にする [D]。 | RS-06#35・#39・#58〜#60 | A・C |

### 5.3 PoC で実測すべきこと

TC-ID は 12_poc で採番する。合否基準の数値は BIA・数値契約（DL-20）から決め、ここでは測定項目だけを挙げる [D]。

1. TTS の発行遅延（p50/p99/p99.9）と可用性、呼出し連鎖の深さ別の総遅延、`tctx` を含めた Txn-Token のサイズ（RS-06#31・#38 から）[D]。
2. TTS・SPIRE server を停止したときの、既発行 SVID・Txn-Token による業務継続時間と、停止中に失効させた主体が拒否されるまでの時間（RS-06#37・#38・#44 から）[D]。
3. Txn-Token の replay 検知率（`txn` 記録あり／なし、インスタンス間で状態共有あり／なし）と、mTLS の peer ID と `req_wl` の不一致検知（RS-06#35・#36 から）[D]。
4. cross-tenant 負例: `tctx` のテナントとリソースのテナントが異なる要求、別 trust domain の `aud` を持つ Txn-Token、path だけ一致する SPIFFE ID が全件拒否されること（RS-06#25・#27・#42 から）[D]。
5. token 種別の取違え負例: Txn-Token を access token として提示、WIT を bearer として提示、JWT-SVID を別 audience へ提示、ID-JAG を別の下流認可サーバーへ再提示（RS-06#5・#22・#36・#50 から）[D]。
6. MCP 適合と負例: RFC 9728 メタデータの `resource` 不一致、`iss` 不一致（mix-up）、他リソース宛 token の提示、token 素通しの検出、`insufficient_scope` からの step-up（RS-06#58〜#61・#65 から）[D]。
7. 人による承認: CIBA 等で得た step-up grant を tool 側 PEP が検証する方式の遅延と完了率、UI 確認だけの要求が拒否されること（RS-06#66・#72 から）[D]。
8. 定期ジョブ: 所有者を無効化した後のジョブ実行が TTS で拒否されるまでの時間（RS-06#39 から）[D]。
9. クラウド federation: SPIRE 発行の JWT-SVID または X.509-SVID で、Entra・Google Cloud・AWS（Roles Anywhere）へ接続できること、各社の鍵数上限・大文字小文字一致条件での失敗挙動（RS-06#77〜#80 から）[D]。
10. ID-JAG: 2 種類の IdP で ID-JAG を発行し、自社 SaaS の認可サーバーが `aud`・`client_id`・`tenant` を検証すること（任意機能の採否判断用、RS-06#48〜#51 から）[D]。

## 6. 調査の限界と未確認事項

本節は本調査の作業範囲の記録である。

- NCCoE のプロジェクトページ（nccoe.nist.gov）は HTTP 403 で取得できず、concept paper 後の段階（project description、協力者募集等）は確認できなかった。CSRC の文書ページは concept paper（ipd）だけを掲載していた。
- Transaction Tokens 草案には実装状況節がなく、製品・OSS の実装状況は確認していない。Txn-Token に対応した TTS の既製品があるかは未確認。
- SPIRE v1.15.3 のリリースノート本文は読んでおらず、SPIRE の WIT-SVID 対応状況は確認していない。workload-creds 草案の実装状況節（自己申告）にある記述だけを根拠とした。
- Google Cloud の managed workload identities は GKE 向けが Preview と表示されていることだけを確認し、Compute Engine 向け・エージェント ID の提供段階（GA か否か）は確認していない。
- AWS の AssumeRoleWithWebIdentity、EKS Pod Identity、AWS における SPIFFE の直接サポートの有無は調べていない。
- ID-JAG が `tenant` claim の定義に参照する OpenID の文書（[OpenID.Enterprise]）の状態は確認していない。
- MCP 拡張リポジトリの「Stable」の定義、セキュリティベストプラクティス文書（token passthrough の説明）は読んでいない。12 か月の廃止猶予は、2026-07-28 版の変更履歴に加え、独立検証時に feature lifecycle ポリシー本文の「at least twelve」months の記述を確認した [N][^29][^53]。
- WIMSE WG 憲章の本文はマイルストーン部分だけを照合した。憲章の範囲記述（AI エージェントを扱うか）は確認していない。
- OpenID Foundation の AI エージェント関連の活動・文書、NIST CAISI の AI エージェント RFI、EU AI Act 等の規制側の要求は調べていない（後者は RS-16 の範囲）。
- SSF/CAEP/RISC（AIMS が参照）の状態は RS-04 に、RFC 9700・OAuth 2.1 の差分は RS-03 に委ねた。
- 種資料にある CVE-2025-55241（未署名の内部 actor token）の教訓は、一次報告で確認していないため本ノートの根拠に使っていない（RS-09 の範囲）。
- RS-06#76 の件数は名前と正規表現による近似で、AI と無関係な「agent」（例: user agent）の除外や、名前に「agent」を含まない関連草案の捕捉は完全ではない。生データは本リポジトリに保存していない（再現は §3.7 の条件で可能）。
- 性能・可用性の数値は一切得ておらず、すべて §5.3 の PoC に委ねた。

## 参考文献

[^1]: SPIFFE Project『Secure Production Identity Framework for Everyone (SPIFFE)』GitHub spiffe/spiffe main（standards/SPIFFE.md、Stability: Stable）. https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE.md （参照箇所: §3、Appendix A、確認日: 2026-10-03）
[^2]: SPIFFE Project『SPIFFE Specification Stability』GitHub spiffe/spiffe main（standards/STABILITY.md、2026-07-01 commit 21896ac）. https://github.com/spiffe/spiffe/blob/main/standards/STABILITY.md （参照箇所: §2、§2.3、確認日: 2026-10-03）
[^3]: SPIFFE Project『The X.509 SPIFFE Verifiable Identity Document』GitHub spiffe/spiffe main（standards/X509-SVID.md、Stability: Stable、最終変更 2026-07-01）. https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md （参照箇所: 冒頭の Stability 表示、§2、§3.1、§3.2、確認日: 2026-10-03）
[^4]: SPIFFE Project『The JWT SPIFFE Verifiable Identity Document』GitHub spiffe/spiffe main（standards/JWT-SVID.md、Stability: Stable、最終変更 2026-07-01）. https://github.com/spiffe/spiffe/blob/main/standards/JWT-SVID.md （参照箇所: 冒頭の Stability 表示、§2.1、§2.3、§3.2、§3.3、§4、§6、§7.1、§7.2、確認日: 2026-10-03）
[^5]: SPIFFE Project『The SPIFFE Identity and Verifiable Identity Document』GitHub spiffe/spiffe main（standards/SPIFFE-ID.md、Stability: Stable、最終変更 2026-07-01）. https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE-ID.md （参照箇所: 冒頭の Stability 表示、§2.1、§2.1.1、確認日: 2026-10-03）
[^6]: SPIFFE Project『The WIT SPIFFE Verifiable Identity Document』GitHub spiffe/spiffe main（standards/WIT-SVID.md、Stability: Incubating、2026-07-01 追加）. https://github.com/spiffe/spiffe/blob/main/standards/WIT-SVID.md （参照箇所: 冒頭の Stability 表示、確認日: 2026-10-03）
[^7]: Cloud Native Computing Foundation『SPIRE』プロジェクトページ. https://www.cncf.io/projects/spire/ （参照箇所: 受入・Incubating・Graduated の日付、確認日: 2026-10-03）
[^8]: SPIFFE Project『spiffe/spire Releases』GitHub（v1.15.3 2026-08-21、v1.14.7 2026-05-28）. https://github.com/spiffe/spire/releases （参照箇所: リリース一覧、確認日: 2026-10-03）
[^9]: R. Chandramouli, Z. Butcher / NIST『SP 800-207A: A Zero Trust Architecture Model for Access Control in Cloud-Native Applications in Multi-Location Environments』（PDF 本体の題名。CSRC 文書ページの表示は「...in Multi-Cloud Environments」）Final, 2023-09. https://doi.org/10.6028/NIST.SP.800-207A （参照箇所: p.8〜9 の ID-SEG-REC-1〜5、確認日: 2026-10-03）
[^10]: R. Galluzzo, A. Regenscheid, S. Nelson, C. Lazcano / NIST・CISA『NIST IR 8587: Protecting Tokens and Assertions from Forgery, Theft, and Misuse: Implementation Recommendations for Agencies and Cloud Service Providers』Final, 2026-09. https://doi.org/10.6028/NIST.IR.8587 （参照箇所: §1.1.1（p.2）、§1.2、§5.3.1.6（p.32）、確認日: 2026-10-03）
[^11]: H. Booth, B. Fisher, R. Galluzzo, J. Roberts / NIST NCCoE『Accelerating the Adoption of Software and AI Agent Identity and Authorization』Concept Paper, DRAFT, 2026-02. https://www.nccoe.nist.gov/sites/default/files/2026-02/accelerating-the-adoption-of-software-and-ai-agent-identity-and-authorization-concept-paper.pdf （参照箇所: p.1 Abstract、p.4 Note to Reviewers、p.6〜7 §1〜§3、確認日: 2026-10-03）
[^12]: NIST CSRC『[Concept Paper] Accelerating the Adoption of Software and Artificial Intelligence Agent Identity and Authorization』文書ページ（Initial Public Draft、Date Published 2026-02-05、Comments Due 2026-04-02）. https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd （参照箇所: 公開日、意見募集期限と終了表示、確認日: 2026-10-03）
[^13]: IETF『Datatracker document records』API（/api/v1/doc/document/<name>/ と doc.json の rev・time・states・expires・group、type=rfc の group 検索）. https://datatracker.ietf.org/api/v1/doc/document/ （参照箇所: §4 表に列挙した各 Internet-Draft の状態、各版の掲載日は doc.json の rev_history.published による（time は記録の最終更新時刻で版の日付ではない）、WIMSE WG の RFC 検索結果、置換関係（relateddocument API）、確認日: 2026-10-03）
[^14]: IETF『Workload Identity in Multi System Environments (wimse) — About』WG ページ（charter-ietf-wimse-01、Milestones）. https://datatracker.ietf.org/wg/wimse/about/ （参照箇所: Milestones 表、確認日: 2026-10-03）
[^15]: J. Salowey, Y. Rosomakho, H. Tschofenig / IETF『Workload Identity in a Multi System Environment (WIMSE) Architecture』draft-ietf-wimse-arch-08, 2026-07-06. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-arch-08 （参照箇所: §3.1.1、§3.1.3、§3.2.2、§3.4.9、§3.4.11、§4.5、確認日: 2026-10-03）
[^16]: B. Campbell ほか / IETF『WIMSE Workload Credentials』draft-ietf-wimse-workload-creds-02, 2026-07-02. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-workload-creds-02 （参照箇所: §4、§5.1、§5.3、§6.1、§8、§9.2、§9.2.1、確認日: 2026-10-03）
[^17]: J. Salowey, Y. Rosomakho / IETF『Workload Authentication Using Mutual TLS』draft-ietf-wimse-mutual-tls-02, 2026-07-06. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-mutual-tls-02 （参照箇所: §5、確認日: 2026-10-03）
[^18]: Y. Rosomakho, J. Salowey / IETF『Workload Identifier』draft-ietf-wimse-identifier-03, 2026-07-06. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-identifier-03 （参照箇所: §4.5、§7.2、確認日: 2026-10-03）
[^19]: A. Schwenkschuster, Y. Rosomakho / IETF『Workload Identity Practices』draft-ietf-wimse-workload-identity-practices-07, 2026-09-22. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-workload-identity-practices-07 （参照箇所: §5.4、§5.5、§5.7、§5.8、確認日: 2026-10-03）
[^20]: B. Campbell, A. Schwenkschuster / IETF『WIMSE Workload Proof Token』draft-ietf-wimse-wpt-02, 2026-08-27. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-wpt-02 （参照箇所: Abstract、§2（tth・oth）、確認日: 2026-10-03）
[^21]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §1、§3、§5.1、§6、§8.2、§9.1、§9.2、§9.2.1、§10、§11.1〜§11.5、§12、§12.1、§12.2、§13.1、§13.2、§13.6、§13.8、§13.10、§13.12〜§13.15、§14、§15.2、§16、確認日: 2026-10-03）
[^22]: M. Jones ほか / IETF『RFC 8693: OAuth 2.0 Token Exchange』Standards Track, 2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §1.1、§2.1、§4.1、§4.4、確認日: 2026-10-03）
[^23]: A. Schwenkschuster ほか / IETF『OAuth Identity and Authorization Chaining Across Domains』draft-ietf-oauth-identity-chaining-17, 2026-07-19. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-chaining-17 （参照箇所: Abstract、§2.3、§2.3.3、§2.4、§2.4.2、§5.4、§5.5、確認日: 2026-10-03）
[^24]: A. Parecki, K. McGuinness, B. Campbell / IETF『Identity Assertion JWT Authorization Grant』draft-ietf-oauth-identity-assertion-authz-grant-04, 2026-05-21. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant-04 （参照箇所: §1、§3.1、§4.3、§4.4.1、§4.4.3、§6.1、§6.3、§9.1、§9.3、§9.7、確認日: 2026-10-03）
[^25]: M. Jones, B. Campbell, C. Mortimore, F. Skokan / IETF『Updates to OAuth 2.0 JSON Web Token (JWT) Client Authentication and Assertion-Based Authorization Grants』draft-ietf-oauth-rfc7523bis-11, 2026-03-26. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-rfc7523bis-11 （参照箇所: Abstract、§4、確認日: 2026-10-03）
[^26]: T. Lodderstedt, J. Richer, B. Campbell / IETF『RFC 9396: OAuth 2.0 Rich Authorization Requests』Standards Track, 2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §1、確認日: 2026-10-03）
[^27]: Model Context Protocol『modelcontextprotocol/modelcontextprotocol』GitHub（docs/specification の版ディレクトリ一覧、Releases: 2026-07-28 は 2026-07-28 公開）. https://github.com/modelcontextprotocol/modelcontextprotocol/tree/main/docs/specification （参照箇所: 版ディレクトリ 2024-11-05〜2026-07-28、Releases 一覧、確認日: 2026-10-03）
[^28]: Model Context Protocol『Governance and Stewardship』. https://modelcontextprotocol.io/community/governance （参照箇所: General Project Policies、Technical Governance、確認日: 2026-10-03）
[^29]: Model Context Protocol『Key Changes』Specification 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/changelog （参照箇所: Major changes 1〜2、Minor changes 7〜9、Deprecated 4、Governance and process updates 1、確認日: 2026-10-03）
[^30]: Model Context Protocol『Authorization』Specification 2026-07-28（basic/authorization）. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization （参照箇所: Protocol Requirements、Standards Compliance、Overview、Authorization Response Validation、Resource Parameter Implementation、Token Handling、Scope Challenge Handling、Step-Up Authorization Flow、確認日: 2026-10-03）
[^31]: Model Context Protocol『Authorization Server Discovery』Specification 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery （参照箇所: Authorization Server Location、Authorization Server Metadata Discovery、確認日: 2026-10-03）
[^32]: M. Jones, P. Hunt, A. Parecki / IETF『RFC 9728: OAuth 2.0 Protected Resource Metadata』Standards Track, 2025-04. https://www.rfc-editor.org/rfc/rfc9728 （参照箇所: §3.3、§7.4、確認日: 2026-10-03）
[^33]: B. Campbell, J. Bradley, H. Tschofenig / IETF『RFC 8707: Resource Indicators for OAuth 2.0』Standards Track, 2020-02. https://www.rfc-editor.org/rfc/rfc8707 （参照箇所: §2、確認日: 2026-10-03）
[^34]: K. Meyer zu Selhausen, D. Fett / IETF『RFC 9207: OAuth 2.0 Authorization Server Issuer Identification』Standards Track, 2022-03. https://www.rfc-editor.org/rfc/rfc9207 （参照箇所: §2.4、確認日: 2026-10-03）
[^35]: Model Context Protocol『Client Registration』Specification 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration （参照箇所: 冒頭の優先順位、Client ID Metadata Documents、Dynamic Client Registration、確認日: 2026-10-03）
[^36]: A. Parecki, E. Smith / IETF『OAuth Client ID Metadata Document』draft-ietf-oauth-client-id-metadata-document-02, 2026-07-06. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-02 （参照箇所: §4.1、§8、§8.2、§8.6、確認日: 2026-10-03）
[^37]: Model Context Protocol『Authorization Security Considerations』Specification 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations （参照箇所: Token Theft、Authorization Code Protection、Open Redirection、Client ID Metadata Document Security、Access Token Privilege Restriction、確認日: 2026-10-03）
[^38]: Model Context Protocol『Tools』Specification 2026-07-28（server/tools）. https://modelcontextprotocol.io/specification/2026-07-28/server/tools （参照箇所: 冒頭の Warning（human in the loop）、Tool の annotations に関する Warning、確認日: 2026-10-03）
[^39]: Model Context Protocol『Specification』（/specification/latest、schema 2026-07-28）. https://modelcontextprotocol.io/specification/latest （参照箇所: BCP 14 の宣言、Security and Trust & Safety の Key Principles と Implementation Guidelines、確認日: 2026-10-03）
[^40]: Model Context Protocol『MCP Authorization Extensions』README, GitHub modelcontextprotocol/ext-auth. https://github.com/modelcontextprotocol/ext-auth （参照箇所: Extensions（Stable／Draft の区分）、確認日: 2026-10-03）
[^41]: Model Context Protocol『Enterprise-Managed Authorization』GitHub modelcontextprotocol/ext-auth specification/stable（Status: Stable、最終変更 2026-06-18）. https://github.com/modelcontextprotocol/ext-auth/blob/main/specification/stable/enterprise-managed-authorization.mdx （参照箇所: Status 表示、§1.1、§1.2、§2、確認日: 2026-10-03）
[^42]: P. Kasselman ほか / IETF『AI Identity Management System』draft-ietf-wimse-aims-00, 2026-09-15. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-aims-00 （参照箇所: Abstract、§2、§4、§6、§7、§10.3、§10.4.1、§10.4.2、§10.5〜§10.8、§11、確認日: 2026-10-03）
[^43]: OpenID Foundation『OpenID Connect Client-Initiated Backchannel Authentication Flow - Core 1.0』Final, 2021-09-01. https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html （参照箇所: 文書冒頭の状態・日付、Abstract、確認日: 2026-10-03）
[^44]: M. Wahl, D. Zollner, P. Dingle, I. Kazzouzi / IETF『AI Agent Resource Extension for the System for Cross-domain Identity Management (SCIM)』draft-wzdk-scim-agent-resource-00, 2026-06-05. https://datatracker.ietf.org/doc/html/draft-wzdk-scim-agent-resource-00 （参照箇所: §3、§4.1、§4.2、§4.4、確認日: 2026-10-03）
[^45]: S. Kushwaha / IETF『SCIM Agent Governance Extension』draft-kushwaha-scim-agent-governance-00, 2026-07-26. https://datatracker.ietf.org/doc/html/draft-kushwaha-scim-agent-governance-00 （参照箇所: Abstract、確認日: 2026-10-03）
[^46]: Microsoft『What are agent identities? - Microsoft Entra Agent ID』Microsoft Learn（updated_at 2026-06-15）. https://learn.microsoft.com/en-us/entra/agent-id/what-are-agent-identities （参照箇所: Why agent identities exist、Agent identities versus application identities、What agent identities enable、Agent identities in practice、確認日: 2026-10-03）
[^47]: IETF『Datatracker document search API』（`/api/v1/doc/document/?name__contains=agent&type=draft&time__gte=2025-06-01&limit=400`、2026-10-03 実行、total_count 258）. https://datatracker.ietf.org/api/v1/doc/document/?name__contains=agent&type=draft&time__gte=2025-06-01&limit=400&format=json （参照箇所: 返却された 258 件の name・title・abstract、照合は単語境界付き正規表現、確認日: 2026-10-03。独立検証で同条件により 258／203／0 件を再現）
[^48]: Google Cloud『Workload Identity Federation』IAM documentation（Last updated 2026-09-30 UTC）. https://docs.cloud.google.com/iam/docs/workload-identity-federation （参照箇所: 冒頭の概要、対応 IdP、アクセス管理方式、確認日: 2026-10-03）
[^49]: Google Cloud『Managed workload identities』IAM documentation（Last updated 2026-09-30 UTC）. https://docs.cloud.google.com/iam/docs/managed-workload-identity （参照箇所: 概要、SPIFFE interoperability、SPIFFE ID 形式、機能一覧の Preview 表示、確認日: 2026-10-03）
[^50]: Amazon Web Services『What is AWS Identity and Access Management Roles Anywhere?』IAM Roles Anywhere User Guide. https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html （参照箇所: 冒頭、IAM Roles Anywhere concepts、Account trust boundary、確認日: 2026-10-03）
[^51]: Amazon Web Services『Federating AWS Identities to external services』IAM User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_outbound.html （参照箇所: 冒頭 2 段落、How It Works、確認日: 2026-10-03）
[^52]: Microsoft『Workload Identity Federation - Microsoft Entra Workload ID』Microsoft Learn（updated_at 2026-08-13）. https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation （参照箇所: Supported scenarios（SPIFFE/SPIRE を含む）、How it works の Note、署名鍵 100 個の記述、確認日: 2026-10-03）
[^53]: Model Context Protocol『Feature Lifecycle and Deprecation Policy』. https://modelcontextprotocol.io/community/feature-lifecycle （参照箇所: minimum deprecation window（"at least twelve" months）、確認日: 2026-10-03）
