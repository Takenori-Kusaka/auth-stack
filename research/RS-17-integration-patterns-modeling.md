# RS-17 連携パターンと認可モデリングの先行事例（一次資料調査ノート）

> 文書ID: RS-17 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-029, R-042, R-044, R-054, R-058, R-059, R-061, R-098, R-100, R-112, R-135, R-138, R-140, R-147, R-148, R-158, R-163, R-171, R-172, R-176, R-190, R-204, R-205, R-206, R-208, R-209（主なもの）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md（§4, §6-4, §9-5）, traceability/seed/seed-03-redteam-decision.md（§7-6〜§7-10, §7-14, §7-15）, research/RS-04-oauth-oidc-profile.md, research/RS-06-workload-identity-delegation-agents.md, research/RS-07-authz-engines-consistency.md, research/RS-08-pep-completeness-tenant-isolation.md
> 供給先（予定）: DL-64 連携パターン集（10_integration/integration-patterns.md）、DL-65 認可モデリングガイド（10_integration/authz-modeling-guide.md）、ADR-005/006/008/009/011/012/017/025/026/029（本書 §5）

本書は AI エージェント（Claude）が 2026-10-03 に Web 上の原典（RFC Editor の RFC 本文、IETF Datatracker、OpenID Foundation、CNCF・OWASP の公式リポジトリ、各ベンダーの公式文書）を取得して調査・起草した。種資料（seed-01〜03）は問いの手掛かりとしてのみ使い、本文の根拠には原典だけを引いた。原典を取得できなかった事項は §6 に「未確認」として列挙し、結論には使っていない。2026-10-03 に、作成者とは別の AI エージェント（Claude）が全 86 脚注の原典を取得して照合し、部分支持だった 5 脚注に関わる記述を修正した（版 0.2）。脚注ごとの判定と修正内容は research/verification/RS-17-verification.md に記録した。検証者も AI エージェントであり、人間のレビュアによる照合はまだ実施していない。

凡例: 主張タグは CONVENTIONS §3 に従う。IETF 文書の MUST / SHOULD / MAY 等は BCP 14 の大文字表記を原文どおりに写し、小文字の "strongly recommended" 等は「BCP 14 キーワードではない」と注記した。ベンダー公式文書の事実は `[V]`、Microsoft による攻撃観測の一次報告は `[I]`、設計推論は `[D]` とした。MCP（LF Projects の仕様）、CloudEvents（CNCF の仕様）、OWASP ASVS は CONVENTIONS §3 が列挙する標準化団体の文書ではないが、仕様本文の規範文（MUST / SHOULD 等）を写す箇所には RS-06 と同じく `[N]` を付けた。決裁で根拠の強さを評価する際は、IETF・OIDF の文書と区別して扱う必要がある。Zanzibar 論文の設計記述は RS-07 と同じく `[V]` とした。前提台帳（01_governance/assumptions-register.md）は未作成で A-ID が採番されていない。そのため規模前提（CONVENTIONS §7 の暫定値）に依存する推論には `[D]` を付け、本文中に「仮定依存（CONVENTIONS §7、A-ID 未採番）」と書いた。他の調査ノートの検証済み主張を引く場合は CONVENTIONS §4 に従い `RS-xx#n` と原典脚注を併記した。

本ストリーム ID「RS-17」は traceability/deliverables.md（TRC-03）の DL 一覧にまだ登録されていない。指示により本書以外のファイルは編集していないため、DL の追加は台帳管理者に委ねる（§6）。

---

## 1. 調査の問い

種資料由来の問い（seed-02 §4・§6-4・§9-5、seed-03 §7-6〜§7-10・§7-15、seed-01 の該当 R-ID）:

1. Web（BFF）、SPA、ネイティブアプリ、入力制約デバイス、M2M のそれぞれで、規範はどの方式をどの強度で要求・推奨しているか（seed-03 §7-10、R-158、R-163）。
2. 5〜15 分の短命 token と数時間のジョブ、退職者が作成した定期ジョブをどう両立させるか（seed-03 §7-7、seed-02 6-4、R-044、R-100）。
3. 非同期経路（queue・イベント）で認可文脈をどう運び、consumer はいつ再認可すべきか（seed-02 6-4、R-058）。
4. PEP の外に出るデータ（DWH・分析基盤）の行・列レベル統制は、主要製品で何ができ、何ができないか（seed-03 §7-9、R-061）。
5. 一覧・検索の認可（pre-filter / post-filter、Zanzibar の Leopard、OpenFGA ListObjects、SpiceDB LookupResources、AuthZEN search）はどう設計すべきか。件数・ページングからの漏えいをどう扱うか（seed-03 §7-6、R-190）。
6. WebSocket・ストリーム・ネイティブアプリ・AI エージェントで、失効はどう伝播するか（seed-03 §7-10、R-112）。
7. 外部連携アプリ（OAuth アプリのマーケットプレイス）の同意と審査は、主要プラットフォームでどう設計されているか（R-029、R-135）。
8. AI エージェント／MCP の連携で、依存サービスは何を検証すべきか（seed-02 9-5、ADR-017）。
9. 管理・サポートのアクセスに、JIT（just-in-time）と JEA（Just Enough Administration）はどう使われているか（R-042、R-054、R-176、ADR-029）。
10. 認可モデルの定義を開発者に委ねる場合、どんなガードレールが要るか（seed-03 §7-15、R-098、R-140、R-147、R-148、R-204、R-205）。

本ストリームで追加した問い:

11. 依存サービスが pattern ごとに実装すべき事項（token、flow、SDK 呼出し、失敗時挙動、試験）のうち、どこまでが規範・公式文書で裏付けられ、どこからが自社判断か。
12. device authorization grant の悪用は実際に観測されているか。規範は使用条件をどう制限しているか。
13. private_key_jwt の audience 規則は改訂中か（RFC 7523bis）。
14. 署名 URL は発行後に失効できるか。寿命の上限は何で決まるか。
15. ヘッダ認証を gateway 化する場合、バックエンドは何を検証すべきか。
16. 主要 SaaS（Google Drive、GitHub、Slack）の共有モデルは、権限の加算・継承・縮小をどう扱うか。それは自社モデルの意味論にどう影響するか。

---

## 2. 結論サマリ（設計への含意）

1. ブラウザ向けの既定は BFF にすべきである [D]（RS-17#1〜#5、RS-04#73）。RFC 10017（BCP 212、2026-08）は、BFF を業務アプリ・機微なアプリ・個人データを扱うアプリに "strongly recommended" とし（小文字で BCP 14 キーワードではない）、BFF は confidential client として動かなければならない（MUST）[N][^1]。同じ対象について、ブラウザ内 OAuth client は "not recommended" とされている [N][^2]。SPA に token を直接持たせる構成は例外審査の対象にする [D]。
2. ネイティブアプリと CLI は、OS のブラウザ（外部 user-agent）と PKCE を使う方式に固定すべきである [D]（RS-17#6〜#10）。RFC 8252 は embedded user-agent の使用を MUST NOT とし、public client の PKCE 実装を MUST としている [N][^3][^4]。アプリに同梱した共有秘密は機密として扱えないとも述べている [N][^4]。
3. 業務 API への device authorization grant は既定で禁止すべきである [D]（RS-17#11〜#17）。RFC 10027（BCP 247、2026-08）は、cross-device flow の前にリスク評価を行うことを MUST とし、device grant を機微・高価値・業務上重要な資源には「避ける」よう述べている [N][^6][^7]。Microsoft は device code flow を可能な限り遮断するよう推奨している [V][^8]。device code phishing を使った攻撃も観測・報告している [I][^9]。
4. M2M の既定は、client credentials と非対称のクライアント認証（private_key_jwt または mTLS）の組にすべきである [D]（RS-17#18〜#23）。client credentials grant は confidential client だけが使わなければならない（MUST）[N][^10]。RFC 9700 は非対称のクライアント認証を RECOMMENDED としている [N][^13]。private_key_jwt の `aud` 規則は改訂中で、RFC 7523bis（IESG 承認済み、RFC Editor 処理中、RFC 未発行）は、AS の issuer 識別子を唯一の `aud` 値とすることを MUST とし、token endpoint URL を `aud` に使うことを MUST NOT としている [N][^12][^85]。自社 profile はこの規則を先行して採用すべきである [D]。
5. 長時間・定期ジョブは、作成者本人の資格情報ではなく、ジョブ用の非人間 ID で実行させるべきである [D]（RS-17#24〜#31）。Databricks は Run as を service principal に変えることを推奨し、理由に「所有者が去ったときにジョブが壊れないため」を挙げている [V][^18]。Power Automate は、所有者のいない orphaned flow が、その利用者に結び付いた接続を使っていると失敗し得ると明記している [V][^20]。規範側では、`offline_access` を使うには同意が必要で（MUST）[N][^15]、RFC 8693 は失効の伝播を token exchange の一般的な性質としていない [N][^16]。利用者の名で動くジョブは、実行時に利用者の状態を再評価する設計を明示する必要がある [D]（RS-06 結論 12 と整合）。
6. イベント駆動では、メッセージ中の主体情報を認可判定の根拠にせず、consumer が実行時に再認可すべきである [D]（RS-17#32〜#35）。CloudEvents は、context attributes に機微情報を載せるべきでない（SHOULD NOT）としている [N][^23]。主体情報を運ぶ Auth Context 拡張について、CloudEvents 自身が「純粋に情報提供であり CloudEvents を保護する目的ではない」と述べている [N][^24]。ASVS 5.0 は、中間サービスではなく原主体の権限で判定することを L3 要件にしている [N][^25]。
7. データ基盤の行・列レベル統制は二層目の guardrail として使い、PEP の代わりにしてはならない [D]（RS-17#36〜#40）。主要製品の公式文書は、それぞれの抜け道や限界を明記している [V][^26][^27][^28][^29]。PostgreSQL では BYPASSRLS ロール、owner、参照整合性検査が RLS を迂回する [V][^26]。BigQuery の row-level security は query duration による side-channel に弱い [V][^27]。Snowflake の row access policy は行の INSERT を防がない [V][^28]。Databricks は一部のアクセス経路で row filter を使えない [V][^29]。
8. 一覧・検索は、資源型ごとに pre-filter と post-filter を選び、返却の直前に Check を必須にすべきである [D]（RS-17#41〜#46、RS-07#20・#21・#33・#65）。AuthZEN 1.0 の search API は、結果が後続の evaluation で許可になることを保証しておらず、ページングも原子的なスナップショットを保証しない [N][^35]。OpenFGA と SpiceDB は、対象数が多い場合に一覧 API 以外の方式（ローカル索引、post-filter、商用の Materialize）を勧めている [V][^32][^33][^34]。Zanzibar も、検索索引は利用側が Expand で作る前提である [V][^30]。
9. 署名 URL は「誰でも使える bearer」であり、個別に失効できないものと扱うべきである [D]（RS-17#47〜#50、RS-08 と整合）。S3 の presigned URL と GCS の signed URL は、URL を持つ者なら誰でも使え、最長 7 日である [V][^36][^37]。Azure は、SAS の生成を監査できず、発行数も追跡できないと明記している [V][^38]。機微データは短寿命の URL を発行時の認可と監査付きで出すか、BFF・proxy 経由にする [D]。
10. 長寿命の接続（WebSocket、SSE、gRPC streaming）では、接続確立時の認可だけでは剥奪が反映されない前提で設計すべきである [D]（RS-17#51〜#56）。RFC 6455 は WebSocket の認証方式を規定していない [N][^39]。ASP.NET Core SignalR は、どの認証方式でも接続中に利用者を自動では再検証しないと明記している [V][^41]。SDK に「期限での切断」と「メッセージ単位の再認可」を組み込み、剥奪から切断までの時間を PoC で測る [D]。
11. 第三者アプリの同意は、事前の審査だけでなく、既存 grant の棚卸しと失効を独立した統制にすべきである [D]（RS-17#57〜#65）。Microsoft Entra は、同意設定の変更は今後の同意にしか影響せず、既存の grant は変わらないと明記している [V][^48]。発行者の検証バッジはアプリの品質を示さないとも明記している [V][^50]。GitHub は、短命 token と細粒度権限を理由に GitHub Apps を OAuth apps より推奨している [V][^43]。
12. AI エージェント／MCP 連携では、tool サーバーごとに audience を絞った token を取り直させ、token の中継を禁止すべきである [D]（RS-17#66〜#71、RS-06#57〜#60）。MCP 2026-07-28 版は、RFC 8707 の `resource` パラメータを MUST、audience 検証を MUST、他の token の受入れ・中継を MUST NOT としている [N][^51]。ただし MCP 2026-07-28 版が基礎として参照する OAuth 2.1 は draft-ietf-oauth-v2-1-13 であり [N][^51]、同草案は最新版 -16 でも Internet-Draft のままである [N][^84]。
13. 管理・サポートのアクセスは、常設権限をなくし、承認付きの期限つき昇格と、事前に定めた操作の集合に限るべきである [D]（RS-17#72〜#77）。Microsoft の Customer Lockbox では、顧客の承認者が 12 時間以内に承認しなければ要求が失効し、承認後のアクセスは最大 4 時間で自動的に取り消され、技術者の操作は監査ログに残る [V][^58]。Entra PIM と Google Cloud PAM も、JIT・承認・期限・監査を製品機能として提供している [V][^55][^57]。
14. レガシーのヘッダ認証を gateway 化する場合、バックエンドは gateway が付ける署名付き JWT を検証し、gateway 以外からの到達を遮断しなければならない [D]（RS-17#78〜#83）。Google IAP は、IAP を迂回されると未署名の ID ヘッダを偽造され得ると明記している [V][^61]。AWS ALB は `x-amzn-oidc-data` の署名と `signer` の検証を求めている [V][^62]。Entra application proxy は connector 以外からの到達を制限するよう求めている [V][^63]。
15. 認可モデルの定義は開発者に委ねてよいが、委ねる範囲と委ねない範囲を分けるべきである [D]（RS-17#84〜#96）。委ねる範囲はドメインの型・関係・権限で、モジュール単位の所有、CI でのテスト、破壊的変更の自動拒否を公式機能で支えられる [V][^66][^67][^68][^69]。委ねない範囲はテナント境界などの横断的な deny ガードレールで、Google Cloud の deny policy が allow より先に評価され、条件を評価できないときも deny が適用されるのと同じ構造を、プラットフォーム側に置く [V][^72][D]。調べた 2 製品では、Google Drive は継承した権限を子で縮小できず、親で変えるか limited access 設定を使う必要があり [V][^76]、GitHub は経路の異なる権限を加算する [V][^78]。このため自社モデルでは縮小（例外的な制限）の意味論を明示的に定義する必要がある [D]。

---

## 3. 調査結果

### 3.1 Web（BFF）と SPA（RFC 10017）

- **RS-17#1** OAuth 2.0 for Browser-Based Applications は RFC 10017（Category: Best Current Practice、BCP 212、2026-08）である [N][^1]。RFC 8252（Native Apps）のヘッダも BCP 212 を示している [N][^3]。RFC 10017 は 3 つの構成を、セキュリティが高い順に BFF、token-mediating backend、ブラウザ内 OAuth client として示している [N][^1]（RS-04#73 と同じ結論）。
- **RS-17#2** BFF は資格情報を AS と確立した confidential client として動かなければならず（MUST）、RFC 9700 §2.1.1 の Authorization Code grant を使わなければならない（MUST）[N][^1]（§6.1.3.1）。cookie については、Secure 属性と HttpOnly 属性を付けなければならない（MUST）[N][^1]。SameSite=Strict を付けるべきであり（SHOULD）、path は `/` にすべきであり（SHOULD）、Domain 属性は付けるべきでない（SHOULD NOT）[N][^1]。cookie 名には `__Host-Http-` のような接頭辞を付けるべきである（SHOULD）[N][^1]（§6.1.3.2）。access token を含む client-side session を使う場合は、cookie の内容を暗号化すべきである（SHOULD）[N][^1]。原文は、SHOULD の項目を MUST にしていない理由を「既存の構成が準拠できるようにするため」と説明している [N][^1]。
- **RS-17#3** BFF は適切な CSRF 防御を実装しなければならない（MUST）[N][^1]（§6.1.3.3）。SameSite=Strict だけでは、同じ site（eTLD+1）に他のアプリが同居する場合に不十分で、サブドメイン乗っ取りから BFF への CSRF が成立し得ると RFC は述べている [N][^1]（§6.1.3.3.1）。CORS の preflight を CSRF 防御に使う方式も示されているが、preflight なしで送れる要求がある点に注意が要るとされている [N][^1]（§6.1.3.3.2）。
- **RS-17#4** RFC は BFF について "This architecture is strongly recommended for business applications, sensitive applications, and applications that handle personal data." と述べ、残る攻撃は利用者のブラウザ内でのクライアント乗っ取りだけだとしている [N][^1]（§6.1.4.3）。ブラウザ内 OAuth client については、攻撃者がクライアントを乗っ取るだけでなく、完全な token 一式を抜き取れるとして、同じ対象に "not recommended" としている [N][^2]（§6.3.4.3）。どちらも小文字表記であり、BCP 14 キーワードではない [N][^1][^2]。
- **RS-17#5** ブラウザ内 OAuth client を使う場合、public client は PKCE を実装しなければならない（MUST）[N][^2]（§6.3.2.1）。AS は、refresh token を使用ごとに rotate するか sender-constrained にしなければならず（MUST）、最大寿命を設けるか一定期間未使用で失効させなければならない（MUST）[N][^2]（§6.3.2.3）。rotate で発行する新しい refresh token の寿命を、最初の refresh token の寿命より延ばしてはならない（MUST NOT）[N][^2]。AS はブラウザアプリに共有秘密によるクライアント認証を要求してはならない（MUST NOT）[N][^2]（§6.3.3.1）。

### 3.2 ネイティブアプリ・CLI（RFC 8252）

- **RS-17#6** RFC 8252（2017-10、BCP 212）は、ネイティブアプリの認可要求を外部 user-agent（通常はブラウザ）で行うことを best current practice としている [N][^3]（§4）。ネイティブアプリは embedded user-agent で認可要求を行ってはならない（MUST NOT）[N][^4]（§8.12）。認可エンドポイントは embedded user-agent からの要求を検知して遮断してよい（MAY）[N][^4]。
- **RS-17#7** public なネイティブアプリは PKCE を実装しなければならず（MUST）、AS はそれを支援しなければならない（MUST）[N][^3]（§6）。AS は PKCE を使わないネイティブアプリからの認可要求を拒否すべきである（SHOULD）[N][^4]（§8.1）。implicit flow は PKCE で保護できないため、ネイティブアプリでの使用は NOT RECOMMENDED である [N][^4]（§8.2）。
- **RS-17#8** AS はネイティブアプリ向けに、private-use URI scheme、claimed "https" scheme、loopback interface の 3 種類の redirect URI を少なくとも提供しなければならない（MUST）[N][^3]（§7）。private-use scheme は、自分が管理するドメイン名を逆順にした名前を使わなければならない（MUST）[N][^3]（§7.1）。claimed "https" は OS が宛先アプリを保証するため、可能なら他の方式より優先すべきである（SHOULD）[N][^3]（§7.2）。loopback では、AS は要求時に任意のポートの指定を許さなければならない（MUST）[N][^3]（§7.3）。
- **RS-17#9** 複数の利用者に配布するアプリに静的に含めた秘密は、機密な秘密として扱うべきでないとされている [N][^4]（§8.5）。AS が public なネイティブアプリに共有秘密によるクライアント認証を要求することは NOT RECOMMENDED である [N][^4]。それでも静的な共有秘密を要求する AS は、そのクライアントを public client として扱い、秘密をクライアントの身元の証明として受け入れてはならない（MUST）[N][^4]。
- **RS-17#10** 上記から、CLI を含むネイティブクライアントの SDK は、OS ブラウザの起動、PKCE、claimed https（不可能なら loopback）を既定にし、embedded WebView による認可画面を禁止すべきである [D]（根拠: RS-17#6〜#9）。ネイティブアプリの refresh token の保護（DPoP 等）は RS-04 の token profile に従う [D]（RS-04 結論 5）。

### 3.3 入力制約デバイス（RFC 8628）とその悪用

- **RS-17#11** RFC 8628（2019-08、Standards Track）は、ブラウザを持たないか入力が制約された、インターネット接続デバイス向けに設計されている [N][^5]（§1）。例として smart TV、メディアコンソール、デジタルフォトフレーム、プリンターが挙がっている [N][^5]。
- **RS-17#12** §5.4 Remote Phishing は、device flow が攻撃者の手元のデバイスで開始され得ることを認め、攻撃者が被害者に「検証 URL を開いて user code を入力せよ」とメールで指示する例を挙げている [N][^5]。対策として、デバイスを認可していることを利用者に伝え、デバイスが手元にあるか確認することを RECOMMENDED とし、AS はデバイスの情報を表示すべきである（SHOULD）としている [N][^5]。user code の寿命は使える程度に長く、phishing での有用性を制限する程度に短くすべきとされるが、RFC 自身が「実時間で利用者とやり取りする phisher が新しいコード（原文は "a fresh token"）を提示することは防げない」と述べている [N][^5]。
- **RS-17#13** RFC 10027『Best Current Practice for Security of Cross-Device Flows』（BCP 247、2026-08）は、cross-device flow を実装する前にリスク評価を行うことを MUST、リスクを十分に緩和できないなら cross-device flow を避けることを SHOULD、§6.1 の緩和策から選ぶことを MUST、可能なら近接性（proximity）を緩和策に含めることを SHOULD としている [N][^6]（§2）。この規定は RFC 8628 の device grant にも、CIBA、OpenID4VP、OpenID4VCI の Pre-Authorized Code Flow にも適用される [N][^6]。
- **RS-17#14** RFC 10027 は RFC 8628 について、"Only use this protocol if other cross-device protocols are not viable due to device or system constraints. Avoid using if the protected resources are sensitive, high value, or business critical." と述べている [N][^7]（§6.2.1.5）。近接性などの追加の緩和策を常に入れるか、事前登録したデバイスに限ることも求めている [N][^7]。同じデバイス上での利用には使わないよう述べている [N][^7]。
- **RS-17#15** Microsoft Entra の Conditional Access は、device code flow を「高リスクの認証方式で、phishing 攻撃の一部や非管理端末からの企業資源アクセスに使われ得る」と位置付けている [V][^8]。そのうえで "Microsoft recommends blocking device code flow wherever possible." と述べている [V][^8]（ms.date 2026-03-24）。device code flow で得た session は protocol tracked となり、後続の refresh でも認証フロー条件の適用対象になる [V][^8]。
- **RS-17#16** Microsoft Threat Intelligence は 2025-02-13 に、Storm-2372 による device code phishing を報告した [I][^9]。初期の観測では、攻撃者は第三者のメッセージングサービス（WhatsApp、Signal、Microsoft Teams）で著名人を装って接触した可能性が高いとされている [I][^9]。そのうえで Teams 会議招待を装ったメールで被害者に device code を入力させ、有効な access token を取得していた [I][^9]。2025-02-14 の追記では、Microsoft Authentication Broker の client ID を使って refresh token を得て、攻撃者が管理するデバイスを Entra ID に登録し、Primary Refresh Token を得る手口に移ったと報告している [I][^9]。2026-07-31 の追記では、Microsoft は Storm-2372 を Midnight Blizzard の初期アクセス担当のサブクラスタと再評価した [I][^9]。推奨された緩和策には、device code flow の遮断と、侵害が疑われる場合の refresh token の失効（revokeSignInSessions）が含まれる [I][^9]。
- **RS-17#17** RS-17#11〜#16 から、業務 API・管理機能・個人データへのアクセスに device grant を既定では許可せず、許可する場合は事前登録したデバイス種別と client_id に限り、近接性または組織ネットワークを条件にすべきである [D]。device grant で得た grant は、後続の refresh を含めて識別できるように監査属性を付けるべきである [D]（根拠: RS-17#15 の protocol tracking の考え方）。

### 3.4 M2M（client credentials、private_key_jwt、mTLS）

- **RS-17#18** RFC 6749 の client credentials grant は、クライアントが自身の管理下にある資源、または AS と事前に取り決めた他の資源所有者の資源にアクセスする場合に使う [N][^10]（§4.4）。この grant は confidential client だけが使わなければならない（MUST）[N][^10]。この grant の token 応答には refresh token を含めるべきでない（SHOULD NOT）[N][^10]（§4.4.3）。
- **RS-17#19** RFC 9700 は、非対称暗号によるクライアント認証（RFC 8705 の mTLS、または RFC 7523 の署名付き JWT、すなわち OIDC の `private_key_jwt`）を RECOMMENDED としている [N][^13]（§2.5）。理由として、AS が機密な対称鍵を保存せずに済み、鍵漏えいに強くなる点を挙げている [N][^13]。access token は特定の RS、またはそれが無理なら少数の RS に audience を絞るべきであり（SHOULD）、RS は自分宛てでない token による要求を拒否しなければならない（MUST）[N][^13]（§2.3）。
- **RS-17#20** RFC 7523 では、クライアント認証用の JWT は `iss`、`sub`（クライアント認証では client_id でなければならない、MUST）、`aud`、`exp` を含まなければならず（MUST）、AS は自分を audience に含まない JWT を拒否しなければならない（MUST）[N][^11]（§3）。`jti` による再送防止は MAY にとどまる [N][^11]。`client_assertion` には JWT を 1 つだけ含めなければならない（MUST NOT contain more than one）[N][^11]（§2.2）。
- **RS-17#21** RFC 7523 の `aud` 規則は改訂中である [N][^12][^85]。draft-ietf-oauth-rfc7523bis-11 は 2026-04-28 に Datatracker へ投稿された版である（本文の日付表記は -07 以降 2026-03-26 のまま更新されていない）[N][^85]。同版は 2026-04-30 に IESG が承認し、2026-05-04 から IESG 状態が RFC Ed Queue であり、RFC はまだ発行されていない（2026-09-30 時点の RPC 状態は In Progress (Second Edit)）[N][^85]。同草案は、クライアント認証の JWT の `aud` に AS の issuer 識別子（RFC 8414）を唯一の値として使わなければならない（MUST）とし、token endpoint URL を audience 値に使ってはならない（MUST NOT）とし、AS はこれを満たさない JWT を拒否しなければならない（MUST）としている [N][^12]。クライアント認証の JWT は `typ` を `client-authentication+jwt` などで明示すべきである（SHOULD）[N][^12]。草案の abstract は、改訂の目的を以前の規定で特定されたセキュリティ脆弱性への対処だと述べている [N][^12]（RS-06 結論 3 の「中リスク層」と整合）。
- **RS-17#22** RFC 8705 の mTLS では、RS は TLS 層からクライアント証明書を取得し、access token に結び付いた証明書と一致するか検証しなければならず（MUST）、一致しなければ 401 `invalid_token` で拒否しなければならない（MUST）[N][^14]（§3）。クライアントが証明書を更新すると、その証明書に束縛された access token は無効になる [N][^14]（§6.3）。TLS を中継装置で終端する場合に、証明書情報をアプリへ安全に渡す方法は範囲外とされている [N][^14]（§6.5）（RS-04#59 と同じ）。
- **RS-17#23** RS-17#18〜#22 から、M2M の自社 profile は次のとおりにするのが妥当である [D]。client credentials は confidential client に限る [D]。クライアント認証は private_key_jwt（`aud`=issuer 単独、`typ` 明示）か mTLS にする [D]。access token は呼出し先 RS ごとに audience を絞る [D]。mTLS の TLS 終端を中継装置で行う場合は、証明書ヘッダの sanitize を必須統制にする（RS-04 結論 5） [D]。依存サービスの契約試験には、`aud` に token endpoint URL を入れた JWT、他の RS 宛ての token、束縛証明書と異なる証明書での要求が、いずれも拒否されることを含める [D]。

### 3.5 バッチ・長時間ジョブと「退職者が作成したジョブ」

- **RS-17#24** OpenID Connect Core 1.0（errata set 2、2023-12-15）の `offline_access` scope は、利用者が不在（ログインしていない）でも UserInfo へのアクセスを得られる refresh token を要求する [N][^15]（§11）。offline access を要求する場合、別の条件がない限り `prompt=consent` を使わなければならず（MUST）、OP は offline access を可能にする refresh token を返すことへの同意を常に得なければならない（MUST）[N][^15]。原文は「以前に保存された同意が常に十分とは限らない」と述べている [N][^15]。
- **RS-17#25** RFC 8693 は、委任（delegation）と成りすまし（impersonation）を区別している [N][^16]（§1.1）。成りすましでは、受け手から見て A は B と区別できない [N][^16]。委任では、A は B とは別の身元を保ったまま B を代理する [N][^16]。token exchange は入力 token と出力 token を強く結び付けず、失効イベントの伝播は「STS プロトコルの一般的な性質ではない」とされている [N][^16]（§2.1）（RS-04#66 と同じ）。
- **RS-17#26** Transaction Tokens 草案（draft-ietf-oauth-transaction-tokens-11、2026-07-30、WG 状態は「WG Consensus: Waiting for Write-Up」、IESG 未提出）は、Txn-Token の寿命を分単位以下と想定し、呼出しの間だけ使わなければならない（MUST）としている [N][^17][^81]（§6）。長時間のバッチやオフライン処理でも、Txn-Token 自体は短命のままとする [N][^17]。TTS は Txn-Token の応答に refresh token を含めてはならない（MUST NOT）[N][^17]（§13.3）。内部から開始する定期処理では、workload が自身の ID で、または workload が参照できる情報で選んだ特定の利用者になり代わって Txn-Token を要求できる [N][^17]（§8.2）（RS-06#37・#39 と同じ）。
- **RS-17#27** Databricks のジョブは、既定で作成者が IS OWNER かつ Run as になり、作成者の権限で実行される [V][^18]。Databricks は "Databricks recommends changing the Run as user to a service principal, so that privileges can be controlled separately from the owner's privileges, and so that jobs do not break when the owner leaves or has changed privileges." と述べている [V][^18]（2026-09-11 更新）。
- **RS-17#28** Power Automate は、所有者が組織を去るなどして有効な所有者がいないフローを orphaned flow と呼び、その利用者アカウントに結び付いた接続を使うフローは失敗し得ると明記している [V][^20]（ms.date 2026-06-11）。管理者は共同所有者を付け、作成者で絞り込んだフローの一覧に所有者を一括で割り当てられる [V][^20]。Microsoft は、全社的に重要なフローを service principal の application user に所有させることで、フローの所有を所有者のライフサイクルから切り離せると述べている [V][^19]（ms.date 2026-08-14）。
- **RS-17#29** BigQuery の scheduled query は、service account として認証するよう設定できる [V][^21]。service account は、利用者の資格情報ではなく自身の資格情報でジョブを実行する [V][^21]。federated identity でサインインした場合は、service account が必須である [V][^21]。既存の scheduled query の資格情報を service account に切り替えることもできる [V][^21]。
- **RS-17#30** GitHub Actions の OIDC では、ジョブごとに OIDC token（JWT）を要求し、クラウド側はその claim が事前に設定した信頼条件に合うか検証したうえで、そのジョブの間だけ有効な短命の access token を発行する [V][^22]。これにより長寿命の秘密をリポジトリに置かずに済む [V][^22]。
- **RS-17#31** RS-17#24〜#30 から、ジョブの認可は次のように分けるのが妥当である [D]。(a) ジョブの実行主体は、作成者ではなくジョブ用の非人間 ID（service principal / workload ID）にする [D]。ジョブのたびに短命の資格情報を得る（RS-17#30 の方式） [D]。(b) 利用者のデータを利用者の権限で処理するジョブは、登録時の同意（`offline_access` 相当）を記録する [D]。実行のたびに、利用者の状態（在籍、テナント所属、権限）を PDP に問い合わせてから Txn-Token か exchange 済み token を得る [D]。(c) 利用者が退職・剥奪されたとき、ジョブを「止める」か「所有者を移す」かを、操作階層ごとに既定で決めておく [D]。RS-17#27・#28 のとおり、主要製品の既定は「作成者の権限で動き、作成者が去ると失敗し得る」である [V][^18][^20]。黙って失敗するのではなく、検知して所有者移転の作業を起こすことを要件にする [D]。

### 3.6 イベント駆動（メッセージ内の認可文脈と再認可）

- **RS-17#32** CloudEvents の最新リリースは v1.0.2 である（GitHub Release `ce@v1.0.2`、2022-02-06 公開）[N][^23]。同版の Privacy and Security の節は、context attributes に機微情報を載せたり表したりすべきでない（SHOULD NOT）とし、producer・consumer・中継者は context attributes を検査・記録してよい（MAY）としている [N][^23]。ドメイン固有の event data は、信頼できる相手に見える範囲を限るために暗号化すべきである（SHOULD）[N][^23]。プロトコル層のセキュリティを使うべきである（SHOULD）[N][^23]。
- **RS-17#33** CloudEvents の Auth Context 拡張（main ブランチ、1.0.3-wip に含まれる）は、occurrence を引き起こした主体の情報（`authtype`、`authid`、`authclaims`）を運ぶ [N][^24]。拡張自身が "This extension is purely informational and is not intended to secure CloudEvents." と述べている [N][^24]。`authclaims` は、consumer が主体に直接成りすませるだけの資格情報を含んではならない（MUST NOT）[N][^24]。ただし、consumer が ID サービスに認証して元の主体になり代わる資格情報を発行させるのに十分な情報は含んでよい（MAY）とされている [N][^24]。
- **RS-17#34** OWASP ASVS 5.0.0 の 8.3.2（L3）は、認可判断の根拠となる値の変更を即座に反映することを求めている [N][^25]。即座に反映できない場合（self-contained token に依存する場合など）は、もう認可されていない利用者が操作したときに警告し、変更を元に戻す緩和策を求めている [N][^25]。ただしこの代替策は情報漏えいを緩和しないと注記している [N][^25]。8.3.3（L3）は、中間サービスの権限ではなく、発端の主体の権限に基づいてアクセスを判定することを求めている [N][^25]。8.4.1（L2）は、マルチテナントのアプリで、操作が権限のないテナントに影響しないよう cross-tenant の統制を求めている [N][^25]。
- **RS-17#35** RS-17#32〜#34 から、イベント駆動の依存サービスは次のように実装するのが妥当である [D]。メッセージには主体・テナント・取引の識別子（不透明な参照）だけを入れ、権限そのものや再利用できる token は入れない [D]。consumer は処理の直前に、元の主体の権限で PDP に再認可を要求する [D]。認可文脈を伝播させる必要がある同期区間には、Transaction Token 形式（RS-06 結論 1）を使う [D]。キューに滞留している間に剥奪された場合の挙動（拒否してデッドレターに送る、監査に記録する）を、操作階層ごとに既定で決める [D]。

### 3.7 データ基盤（行・列レベルのセキュリティ）

- **RS-17#36** PostgreSQL 18 では、RLS を有効にした表にポリシーがなければ既定拒否になる [V][^26]。superuser と BYPASSRLS 属性を持つロールは常に RLS を迂回し、table owner も FORCE ROW LEVEL SECURITY を指定しない限り迂回する [V][^26]。unique・主キー・外部キーなどの参照整合性検査は常に RLS を迂回し、"covert channel" による情報漏えいに注意が要ると明記されている [V][^26]。TRUNCATE と REFERENCES は RLS の対象外である [V][^26]（RS-08#40 と同じ）。
- **RS-17#37** BigQuery の row-level access policy では、`grantee_list` に含まれない利用者は行を一切見られない [V][^27]。公式文書は、row-level access policy を「query duration による side-channel 攻撃に弱い可能性がある」とし、authorized view を「巧妙に作ったクエリ、query duration、その他の side-channel 攻撃に弱い可能性がある」としている [V][^27]（2026-09-30 更新）。
- **RS-17#38** Snowflake の row access policy は、ポリシー所有者のロールで評価され、クエリを実行した者のロールでは評価されない [V][^28]。行の挿入を防がず、見えている行の更新・削除も防がない [V][^28]。row access policy と masking policy の両方がある場合は、row access policy が先に評価される [V][^28]。この機能は Enterprise Edition 以上が必要である [V][^28]。
- **RS-17#39** Databricks Unity Catalog の row filter と column mask は、フィルタやマスクを適用する前の基表の値を利用者が見られないようにする [V][^29]。Databricks Runtime 12.2 LTS 未満は row filter と column mask に対応しておらず、それらの runtime から表を読もうとするとデータを返さない（fail securely）[V][^29]。view には適用できず、path ベースのファイルアクセスや Iceberg REST catalog 経由のアクセスにも対応しない [V][^29]。多数の表で一貫した制御が必要な場合は、カタログ・スキーマ単位でタグに基づいて適用する ABAC policy が推奨されている [V][^29]。ABAC policy は上位の管理者が定義でき、表の所有者が上書き・削除できないとされている [V][^29]（2026-09-24 更新）。
- **RS-17#40** RS-17#36〜#39 から、データ基盤の行・列統制は「PEP を通らない持出し経路の二層目」として使い、次を前提にすべきである [D]。各製品には迂回できる特権主体や非対応の経路がある [V][^26][^29]。side-channel は残る [V][^26][^27]。ポリシーの評価主体が実行者でない製品もある [V][^28]。依存サービス（データ基盤側）の試験には、迂回主体の棚卸し、非対応経路からのアクセスが拒否されること（Databricks の fail securely と同様）、テナント越えの side-channel の抜取り試験を含める [D]（RS-08 結論 5 と整合）。

### 3.8 検索・一覧（pre-filter / post-filter）

- **RS-17#41** Zanzibar 論文は、統一されたアクセス制御基盤の上に「アクセス制御を尊重し、アプリ横断で動く検索索引」のような共通基盤を構築できると述べている [V][^30]（§1）。Expand API は有効な userset の木を返し、クライアントが「アクセス制御付きコンテンツの効率的な検索索引」を作るのに不可欠だとされている [V][^30]（§2.4.5）。つまり Zanzibar でも、検索のための索引は利用側が作る前提である [D]（RS-07#9 と同じ）。
- **RS-17#42** Zanzibar の Leopard は、深いネストや幅の広いグループの membership 判定を高速化する索引で、一部の namespace に限って使われる [V][^31]（§3.2.4）。オフラインで定期的に作る索引と、Watch API で更新を取り込む増分層から成り、1 件の tuple 変更が数万件の索引イベントになり得る [V][^31]（RS-07#8 と同じ）。
- **RS-17#43** OpenFGA の公式文書は、検索と認可を組み合わせる方式を 3 つ挙げている [V][^32]。(1) DB で検索・ソートしてから BatchCheck で絞り込む [V][^32]。(2) changes API からローカル索引を作り、DB の結果と交差させ、索引に未反映の剥奪を落とすために最後に Check する [V][^32]。(3) ListObjects で ID 一覧を得て DB 検索を絞る [V][^32]。(3) が勧められるのは、利用者がアクセスし得る対象が少なく（約 1,000）、その割合も低い場合に限られる [V][^32]。アクセスし得る対象が多く割合が低い場合（Google Drive 型）は (2) が推奨されている [V][^32]（RS-07#21 と同じ）。
- **RS-17#44** OpenFGA の ListObjects は、制限時間（`listObjectsDeadline`、既定 3s）の中で見つけた結果を、最大件数（`listObjectsMaxResults`、既定 1000）まで返す [V][^33]。ListUsers も同様に既定 3s・1000 件で打ち切る [V][^33]（RS-07#20 と同じ）。SpiceDB の LookupResources はカーソルによるページングに対応する [V][^34]。ただし 1 万件を超えると性能問題を起こし得る重い要求とされ、CheckBulk による post-filter、それでも足りなければ Materialize の検討が勧められている [V][^34]（RS-07#33 と同じ）。
- **RS-17#45** AuthZEN Authorization API 1.0（Final、2026-01-11）の search API について、仕様は次の点を定めている [N][^35]（§8）。search の結果を evaluation にかけると `"decision": true` になるべき（SHOULD）だが、それは保証されない [N][^35]。search は推移的に行うことが RECOMMENDED である [N][^35]。ページングは結果集合の原子的なスナップショットを保証せず、ページングの間に項目が増減すると結果が重複・欠落してよい（MAY）[N][^35]。応答の総件数は OPTIONAL で、データが変わればページの合計と一致しないことがある [N][^35]（RS-07#65 と同じ）。
- **RS-17#46** RS-17#41〜#45 から、一覧・検索の自社 profile は次のようにするのが妥当である [D]。資源型ごとに、アクセスし得る対象数と割合（仮定依存: CONVENTIONS §7 の最大テナント約 10 万ユーザー、A-ID 未採番）から方式を選ぶ [D]。どの方式でも、利用者に返す直前のページに Check（BatchCheck）をかける [D]。総件数は返さないか、Check 済みの件数に限る [D]。ページングの不整合（重複・欠落）を許容する UI にする [D]。一覧 API の打ち切り（既定 1000 件・3 秒）を「欠落」として検知し、黙って少ない結果を返さないことを依存サービスの試験項目にする [D]。

### 3.9 ファイル署名 URL

- **RS-17#47** Amazon S3 の presigned URL は、生成した IAM 主体の資格情報を使い、有効期限まで何度でも使える [V][^36]。AWS は presigned URL を「所持者にアクセスを与える bearer token」と呼んでいる [V][^36]。期限は、コンソールでは 1 分〜12 時間、CLI/SDK では最長 7 日まで設定できる [V][^36]。一時的な資格情報で生成した URL は、その資格情報が失効した時点で失効する [V][^36]。一般に、生成に使った資格情報が失効・削除・無効化されると、URL もより遅い期限を指定していても失効する [V][^36]。期限は HTTP 要求の時点で検査されるため、期限直前に始まった大きなダウンロードは期限を過ぎても続く [V][^36]。bucket policy の `s3:signatureAge` 条件や、ネットワーク経路の条件（`aws:SourceIp` 等）で、presigned URL の利用を制限できる [V][^36]。
- **RS-17#48** Google Cloud Storage の signed URL は、有効な間は、アカウントの有無に関係なく所持者の誰でも使える [V][^37]。V4 の最長の有効期限は 604800 秒（7 日）である [V][^37]。URL を知る者は、期限が来るか、URL の署名に使った鍵が rotate されるまで資源にアクセスできる [V][^37]（2026-09-30 更新）。
- **RS-17#49** Azure Storage は、SAS を使う場合は Entra ID の資格情報で保護される user delegation SAS を推奨している [V][^38]。SAS が漏えいすると取得した誰でも使えると明記している [V][^38]。SAS token の生成は監査できず、Azure Storage は生成された SAS の数を追跡しない [V][^38]。service SAS は stored access policy に結び付ければ、アカウント鍵を再生成せずに権限を取り消せる [V][^38]。user delegation SAS と account SAS は stored access policy に対応しない [V][^38]。推奨策には、HTTPS の使用、失効計画、近い期限、最小権限、SAS 有効期限ポリシーの設定が含まれる [V][^38]（ms.date 2026-02-27）。
- **RS-17#50** RS-17#47〜#49 から、署名 URL は「発行後は個別に失効できない bearer」と扱うのが妥当である [D]。依存サービスは、発行の直前に PEP で認可し、発行を監査ログに記録し、要配慮データでは寿命を数分に抑えるか、BFF・proxy 経由の配信にする [D]。剥奪から実効的な拒否までの時間は「URL の残り寿命」で上限が決まるため、操作階層ごとの剥奪 SLO（R-143、R-191）に URL 寿命の上限を含める [D]（RS-08 の署名付き URL の論点と整合）。

### 3.10 WebSocket・ストリームの再認可

- **RS-17#51** RFC 6455 は、WebSocket の handshake で server がクライアントを認証する方法を規定しておらず、cookie、HTTP 認証、TLS 認証など一般の HTTP サーバーで使える方式を使えるとしている [N][^39]（§10.5）。特定のサイトからの入力だけを処理するサーバーは Origin を検証すべきであり（SHOULD）、受け入れられない Origin には 403 で応答すべきである（SHOULD）[N][^39]（§10.2）。
- **RS-17#52** OWASP ASVS 5.0.0 の V4.4 は、全ての WebSocket 接続で WSS を使うこと（L1）、handshake で Origin を許可リストと照合すること（L2）を求めている [N][^40]。アプリ標準の session 管理を使えない場合は専用の token を使い、それを既存の認証済み HTTPS session を通じて取得・検証すること（L2）も求めている [N][^40]。
- **RS-17#53** ASP.NET Core SignalR の公式文書は、接続の確立時に認証済みの利用者を取り込み、接続の間キャッシュすると述べている [V][^41]。"SignalR doesn't automatically revalidate the user during the life of the connection, regardless of the authentication scheme." とも述べている [V][^41]。接続後に役割を外しても、接続が閉じるまで旧役割で hub method を呼べる例が示されている [V][^41]。token が接続中に期限切れになっても、既定では接続は動き続ける [V][^41]。`CloseOnAuthenticationExpiration` を設定すると token の期限で接続を閉じる [V][^41]。.NET 11 以降は接続を保ったまま資格情報を更新する authentication refresh を使える [V][^41]（ms.date 2026-09-20）。
- **RS-17#54** 同文書は、ブラウザの WebSocket API と SSE API は Authorization ヘッダを設定できないため、SignalR がブラウザでは token を query string で送ること、多くのサーバーが query string を記録することを注意している [V][^41]。BFF の前段 reverse proxy が Authorization ヘッダを付け替える構成も示されている [V][^41]。
- **RS-17#55** Amazon API Gateway は、全ての WebSocket API の `$connect` route に authorizer を設定するよう推奨している [V][^42]。WebSocket API の接続時間の上限は 2 時間、アイドル接続のタイムアウトは 10 分で、どちらも引き上げできない [V][^87]。したがって接続時の認可が有効なまま残る時間は、API Gateway 側の上限だけでは最長 2 時間になる [D]。接続確立後のメッセージごとの再認可について、本調査で取得した頁には記述がない（§6、未確認） [D]。
- **RS-17#56** RS-17#51〜#55 から、ストリーム型の連携では「接続時の認可」と「接続中の再認可」を分けて SDK に組み込むのが妥当である [D]。接続中の再認可は、(a) token の期限で切断する、(b) 剥奪イベント（SSF/CAEP の session-revoked 等、RS-04#78）を受けて接続を閉じる、(c) メッセージや購読ごとに PEP で現在の権限を確認する、の 3 つから操作階層ごとに選ぶ [D]。ブラウザからの接続は BFF 経由にして、token を URL に載せない [D]。

### 3.11 外部連携アプリ（同意と審査）

- **RS-17#57** GitHub は "GitHub Apps are preferred to OAuth apps because they use fine-grained permissions, give more control over which repositories the app can access, and use short-lived tokens." と述べている [V][^43]。installation access token は現在 1 時間で失効する [V][^43]。OAuth app の token は既定で長寿命である [V][^43]。organization application policy が有効な場合、OAuth app を組織に入れるには組織所有者の承認が要る [V][^43]。GitHub App は organization application policy の対象外で、組織所有者が許可したリポジトリにしかアクセスできない [V][^43]。
- **RS-17#58** GitHub App のベストプラクティスとして、GitHub は次を挙げている [V][^44]。必要最小限の権限を選ぶ [V][^44]。private key は安全に保管し、ハードコードしない [V][^44]。installation access token は 1 時間、期限付き user access token は 8 時間、refresh token は 6 か月で失効する [V][^44]。`GET /user/installations` で、user access token がどの組織にアクセスできるかを定期的に確認する [V][^44]。組織から外れた利用者や SAML SSO を済ませていない利用者には、自アプリ内でも組織データへのアクセスを止める [V][^44]。
- **RS-17#59** GitHub App が利用者の代わりに動く場合、利用者がアクセスできる資源、アプリが権限を持つ資源、アプリがインストールされたアカウントの資源の 3 条件を全て満たす資源にしかアクセスできない [V][^45]。
- **RS-17#60** Slack Marketplace のガイドラインは、scope に最小権限の原則を適用し、各 scope の理由を示すよう求めている [V][^46]。将来の機能のための scope を含めてはならないとし、ワークスペースのメッセージ・ファイルへの広いアクセスは承認されにくいとしている [V][^46]。アプリは API token を安全に保管しなければならず、ログ、クライアント側コード、公開リポジトリに置いてはならない [V][^46]。OAuth フローでは state パラメータを使わなければならない [V][^46]。アプリは、利用者が Slack 内で本来持たない情報や能力を与えるべきでない（Slack のプライバシーモデル）[V][^46]。
- **RS-17#61** Slack では、app approval を有効にしたワークスペースでは、メンバーのアプリ要求をワークスペース所有者とアプリ管理者が審査する [V][^47]。アプリが optional scope を持つ場合、承認者は許可する scope を選べる [V][^47]。開発者が scope を変更すると、既にインストール済みのアプリでもメンバーの再要求が必要になる場合がある [V][^47]。
- **RS-17#62** Microsoft Entra ID の既定では、全利用者が管理者同意を要しない権限についてアプリに同意できる [V][^48]。Microsoft は、悪意あるアプリがデータへのアクセスを騙し取る危険を減らすため、利用者の同意を検証済み発行者のアプリに限るよう推奨している [V][^48]。組込みポリシー `microsoft-user-default-low` は、検証済み発行者と自テナント登録のアプリに対し、管理者が「低影響」と分類した権限だけの同意を許す [V][^48]。同意設定の変更は今後の同意操作にしか影響せず、既存の同意（grant）はそのまま残る [V][^48]（ms.date 2025-06-15）。
- **RS-17#63** Entra の admin consent workflow では、利用者が同意できないアプリについて管理者の承認を要求できる [V][^49]。審査者に指定しても権限は昇格せず、承認するには管理者同意を付与できる権限が要る [V][^49]。Microsoft Graph のアプリケーション権限を求めるアプリの要求を承認できるのは Global Administrator だけである [V][^49]。要求の有効日数を設定できる [V][^49]。
- **RS-17#64** publisher verification（発行者の検証）は、アプリの発行組織が本物であることを Microsoft が確認したことを示す [V][^50]。2020-11-08 より後に登録された多くのマルチテナントアプリについて、risk-based step-up consent が有効なら、発行者未検証のアプリには利用者が同意できない [V][^50]。一方で、検証バッジは利用者が求めるであろう品質基準（認証取得、業界標準への準拠、ベストプラクティスの遵守）を意味しないと明記されている [V][^50]。
- **RS-17#65** RS-17#57〜#64 から、自社基盤の第三者連携（P-07）には次が必要である [D]。(a) 第三者アプリの登録審査（発行者の確認、最小 scope、scope ごとの理由） [D]。(b) テナント管理者による承認と scope の選択 [D]。(c) 細粒度で短命の token（GitHub App 型） [D]。(d) 既存 grant の定期棚卸しと一括失効 [D]。(d) が要るのは、ポリシーを変えても既存の grant が残るためである（RS-17#62） [D]。seed-02 §10 が挙げる Midnight Blizzard と Salesloft Drift の事例の一次報告は RS-12 の範囲であり、本書では確認していない（§6）[D]。

### 3.12 AI エージェント／MCP

- **RS-17#66** MCP の現行版は 2026-07-28 である [N][^53]。同版の認可仕様では、認可は MCP 実装にとって OPTIONAL である [N][^51]。サポートする場合、HTTP 系 transport はこの仕様に従うべきであり（SHOULD）、STDIO transport は従うべきでなく、環境から資格情報を得る（SHOULD NOT）[N][^51]（RS-06#57 と同じ）。
- **RS-17#67** MCP client は RFC 8707 の Resource Indicators を実装しなければならない（MUST）[N][^51]。`resource` パラメータは認可要求と token 要求の両方に含め、token を使う MCP server の正規 URI を指定しなければならず（MUST）、AS が対応しているかどうかに関係なく送らなければならない（MUST）[N][^51]。RFC 8707 では、AS は `resource` が示す資源に access token の audience を絞るべきである（SHOULD）[N][^54]（§2）。
- **RS-17#68** MCP server は、自分を audience として発行された access token であることを検証しなければならない（MUST）[N][^51]。MCP client は、MCP server の AS が発行した token 以外を MCP server に送ってはならない（MUST NOT）[N][^51]。MCP server は自分の資源に有効な token だけを受け入れなければならず（MUST）、他の token を受け入れたり中継したりしてはならない（MUST NOT）[N][^51]。access token は URI の query string に含めてはならない（MUST NOT）[N][^51]。MCP server は、Protected Resource Metadata（RFC 9728）を実装しなければならない（MUST）[N][^51][^86]。
- **RS-17#69** MCP の Security Best Practices は、token passthrough（MCP server が自分宛てに発行されたことを検証せずに token を受け取り、下流 API へそのまま渡すこと）を anti-pattern とし、認可仕様で明示的に禁止されていると述べている [N][^52]。理由として、レート制限などの統制の迂回、監査証跡で主体を区別できなくなること、盗んだ token による MCP server 経由の持出し、信頼境界の破壊を挙げている [N][^52]。MCP は protocol 上の session を持たず、server が発行する状態ハンドル（カート ID 等）を認証として扱ってはならない（MUST NOT）[N][^52]。
- **RS-17#70** MCP 2026-07-28 版の認可仕様は、基礎とする仕様の 1 つに OAuth 2.1 の draft-ietf-oauth-v2-1-13 を挙げ、AS に OAuth 2.1 の実装を求めている（MUST）[N][^51]。OAuth 2.1 の最新版は draft-ietf-oauth-v2-1-16（2026-09-02 更新、WG Document、IESG 未提出、WG マイルストーンは 2026-12）であり、RFC ではない [N][^84]。MCP が参照する版（-13）と最新版（-16）は異なる [D]。trust domain を越える委任に使える identity chaining は IESG 状態が RFC Ed Queue で RFC 未発行である [N][^83]。ID-JAG（draft-ietf-oauth-identity-assertion-authz-grant-04）は WG Document である [N][^82]（RS-06 結論 3・10 と整合）。
- **RS-17#71** RS-17#66〜#70 から、AI エージェントが自社 API を呼ぶ連携（P-08）では次が妥当である [D]。(a) エージェントは、tool サーバー（MCP server）ごとに `resource` を指定した token を取得する [D]。(b) MCP server が下流の自社 API を呼ぶときは、受け取った token を中継せず、token exchange（RFC 8693）で下流 audience 向けの token を取り直す [D]。その token には利用者とエージェントの両方を `act` で表す（RS-04#66、RS-06 結論 8） [D]。(c) 依存サービスの契約試験に、他 audience の token の拒否と、状態ハンドルだけでのアクセスの拒否を含める [D]。(d) MCP の版と草案（OAuth 2.1、ID-JAG）への依存は adapter に閉じ込める（RS-06 結論 9）[D]。

### 3.13 管理・サポート（JIT、Just Enough Administration）

- **RS-17#72** Microsoft Entra Privileged Identity Management（PIM）は、Entra ID と Azure の資源への just-in-time の特権アクセス、開始日と終了日による期限付き割当、役割の有効化の承認、有効化時の MFA の強制、理由の入力、有効化の通知、アクセスレビュー、監査履歴を機能として挙げている [V][^55]。eligible な割当は、使う前に有効化（MFA、理由、承認など）が必要である [V][^55]。PIM の利用にはライセンスが必要である [V][^55]（ms.date 2026-04-23）。
- **RS-17#73** PowerShell の Just Enough Administration（JEA）は、PowerShell で管理するあらゆるものの委任管理を可能にする [V][^56]。JEA は、仮想アカウントなどで管理者の数を減らし、実行できる cmdlet・関数・外部コマンドを限定し、セッションで実行したコマンドを記録として残す [V][^56]。DNS 管理者に Domain Admins を与えずに DNS 修復に必要なコマンドだけを許す例が示されている [V][^56]（ms.date 2022-11-16）。
- **RS-17#74** Google Cloud Privileged Access Manager（PAM）は、選んだ主体の just-in-time の一時的な権限昇格を制御し、後から監査ログで誰がいつ何にアクセスしたかを確認できる [V][^57]。entitlement には、要求できる主体、理由の要否、一時的に付与する役割（IAM 条件を付けられる）、最大期間、承認の要否を定める [V][^57]。grant の期間が終わると、PAM が役割を取り消す [V][^57]。PAM 以外の手段で該当の role binding を変更すると、PAM が想定どおり動かない可能性があると注意されている [V][^57]（2026-09-30 更新）。
- **RS-17#75** Microsoft Purview の Customer Lockbox では、Microsoft の技術者がテナント名、サービス要求番号、開始時刻、必要な時間、対象サービスを指定してアクセスを要求し、Microsoft Support の管理者が承認した後で、顧客の承認者に通知が届く [V][^58]。顧客が拒否するか 12 時間以内に承認しなければ、要求は失効する [V][^58]。承認後のアクセス権は最大 4 時間で、期間が過ぎると自動的に取り消される [V][^58]。技術者は事前承認済みの cmdlet でアクセスし、その操作は「Microsoft Operator」として顧客の監査ログに記録される [V][^58]。Microsoft 365 は最小権限と just-in-time を原則とし、Microsoft の担当者が顧客コンテンツへ常時アクセスできる権限を持たないと述べている [V][^58]（ms.date 2025-02-03）。
- **RS-17#76** Google Cloud の Access Approval は、Cloud Customer Care やエンジニアリングチームが顧客データにアクセスする際に、顧客の明示的な承認を必要とする [V][^59]。ただし、時間に制約のある障害に対処するため、顧客の操作なしに自動承認される場合があり、その要求は `auto approved` として記録される [V][^59]。Access Transparency の除外事項も Access Approval に適用される [V][^59]。EU Data Boundary with Access Justifications または Sovereign Controls by Partners で展開したワークロードでは、自動承認は自動的に無効になる [V][^59]。
- **RS-17#77** RS-17#72〜#76 から、自社の support tool（P-11）と顧客データへのアクセスは次のように設計するのが妥当である [D]。常設の権限は持たせない [D]。要求ごとに理由（チケット番号）、範囲（テナント・資源）、期間を指定する [D]。社内の二者承認を経たうえで、契約上必要な場合は顧客承認を得る [D]。期間の上限を設けて自動で失効させる [D]。実行できる操作は事前承認済みの集合（JEA 型）に限る [D]。全操作を顧客にも開示できる監査ログに残す [D]。緊急時の自動承認（Access Approval 型）を許す場合は、事後の通知と監査を必須にする（R-042、R-054、R-176、ADR-029）[D]。

### 3.14 レガシー連携（SAML–OIDC bridge、LDAP、ヘッダ認証）

- **RS-17#78** Keycloak（26.8.0）は identity broker を「サービス提供者と ID プロバイダーをつなぐ仲介サービス」と定義し、SAML v2.0、OpenID Connect v1.0、OAuth v2.0 の ID プロバイダーと連携できる [V][^60]。外部 ID と既存アカウントの初回連携（first broker login）について、公式文書は「同じメールアドレスの既存アカウントに自動でリンクすることは潜在的なセキュリティホールである」と述べている [V][^60]。AutoLink の authenticator は、利用者が任意のユーザー名やメールアドレスで自己登録できる一般的な環境では危険だとして、登録を厳密に管理していない限り使わないよう述べている [V][^60]。
- **RS-17#79** Google Cloud IAP の公式文書は "To help secure your app, you must use signed headers for all app types." と述べ、アプリが IAP の付ける `x-goog-iap-jwt-assertion` ヘッダの JWT（header、payload、署名）を検証するよう求めている [V][^61]。目的は、IAP の誤った無効化、firewall の設定誤り、プロジェクト内からの不正アクセスで IAP が迂回された場合の二層目の防御である [V][^61]。IAP が迂回されると、攻撃者は未署名の ID ヘッダ（`x-goog-authenticated-user-{email,id}`）を偽造できる [V][^61]。検証項目は、alg が ES256、kid が IAP の公開鍵に一致、`exp` が未来、`iat` が過去、`aud` が期待する形式、`iss` が `https://cloud.google.com/iap` である [V][^61]（2026-09-30 更新）。
- **RS-17#80** AWS Application Load Balancer は、OIDC 認証の後に利用者 claim を ES256 で署名した JWT（`x-amzn-oidc-data`）として target に渡す [V][^62]。target は claim に基づく認可の前に署名を検証し、JWT header の `signer` が期待する ALB の ARN であることを確認しなければならない [V][^62]。`x-amzn-oidc-accesstoken` と `x-amzn-oidc-identity` は後方互換のための未署名ヘッダで、アプリは独立に検証できない [V][^62]。AWS は、target が ALB からのトラフィックだけを受けるよう security group で制限することを推奨している [V][^62]。認証 session の既定の timeout は 7 日である [V][^62]。
- **RS-17#81** Microsoft Entra application proxy は、ヘッダで認証するオンプレミスのアプリに、Entra ID の claim から作った HTTP ヘッダを渡す SSO を提供する [V][^63]。アプリの認可ポリシー（Conditional Access）は最初の認証要求にだけ適用される [V][^63]。ヘッダ認証のアプリへのアクセスは、connector など許可したヘッダ認証の仕組みからのトラフィックだけに制限すべきであり、通常は firewall やアプリサーバーの IP 制限で行う [V][^63]（ms.date 2026-03-25）。
- **RS-17#82** RFC 4513（LDAP の認証方式、2006-06、Standards Track）では、simple Bind の unauthenticated 方式（DN を指定しパスワードが空）は匿名の認可状態を作るだけで、DN は検証されず、認可に使うものではない（原文は "is not to be used"。小文字表記で BCP 14 キーワードではない）[N][^64]（§5.1.2）。クライアントはパスワード入力 UI で空のパスワードを禁止すべきであり（SHOULD）、サーバーは unauthenticated Bind を既定で `unwillingToPerform` で失敗させるべきである（SHOULD）[N][^64]。RFC は、Bind の成功だけを根拠にディレクトリ外の情報へのアクセスを許すクライアントの誤用が、運用経験上しばしば起きると述べている [N][^64]（§6.3.1）。name/password 方式はパスワードをサーバーへ開示する [N][^64]（§6.3.2）。
- **RS-17#83** RS-17#78〜#82 から、レガシー連携は次の形で gateway 化するのが妥当である [D]。(a) SAML IdP を持つ顧客との連携は broker（SAML→OIDC）で吸収し、broker の初回リンクは不変識別子による照合に限り、メールアドレスによる自動リンクを禁止する（ADR-004、RS-14 と整合させる） [D]。(b) ヘッダ認証のアプリは、gateway が付ける署名付き JWT を検証するよう改修するか、それができない場合は gateway 以外からの到達をネットワークで遮断し、未署名ヘッダを gateway で必ず上書き・除去する [D]。(c) LDAP 連携は、unauthenticated Bind の拒否と TLS を必須にし、Bind の成功を認可の根拠にしない [D]。(d) gateway の認可は最初の要求にしか効かない場合があるため（RS-17#81）、アプリ内の操作単位の認可は別に必要である [D]。

### 3.15 認可モデリングの先行事例と、開発者に委ねる際のガードレール

- **RS-17#84** OpenFGA の公式手順は、(1) 最も重要な機能を選ぶ、(2) object type を列挙する、(3) 関係を列挙する、(4) 関係を定義する、(5) モデルをテストする、(6) 繰り返す、の 6 段階である [V][^65]。要件は「利用者 {user} が {object} に {action} できるのは {条件} の場合」という平文から始めるよう勧めている [V][^65]。「role」という語から始めると誤った方向に進み得るため、役割はモデリングの中で見つけるほうがよいとも述べている [V][^65]。
- **RS-17#85** OpenFGA の modular models は、モデルが大きくなり、多くのチームが関わると「所有の境界が不明確になり、コードレビューの手順がスケールしない」という課題に対し、モデルを複数のファイル・モジュールに分ける機能である [V][^66]。レビューの所有を GitHub・GitLab・Gitea の code owners で表せる [V][^66]。他モジュールの型を拡張（type extension）できるが、追加する関係は既存の関係や他の拡張と重複してはならない [V][^66]。
- **RS-17#86** OpenFGA は "Every OpenFGA model should be tested before deployment" と述べ、`.fga.yaml` にモデル・tuple・テスト（check、list_objects、list_users の期待値）を書き、`fga model test` で実行する方式を示している [V][^67]。良いテストは全ての関係を検証すると述べ、GitHub Actions 用の model testing action を案内している [V][^67]。
- **RS-17#87** SpiceDB は、`zed validate` によるスキーマ検証、assertion（assertTrue / assertFalse / assertCaveated）、アクセス経路を列挙する expected relations、本番での `--explain` によるデバッグを提供している [V][^68]。CI 用の validate action について「未検証の変更のデプロイを防げるため highly recommended」と述べている [V][^68]。
- **RS-17#88** SpiceDB は、データがある relation の削除、他の relation・permission から参照されている relation・permission の削除を拒否する [V][^69]。relation の追加、許可する subject type の追加、permission の計算式の変更は常に許される [V][^69]。relation を移す場合は、新しい relation の追加、二重書込み、backfill、旧 relation の参照削除、旧 relation の削除という複数段階の手順が示されている [V][^69]。
- **RS-17#89** Google Cloud IAM の役割には basic、predefined、custom の 3 種がある [V][^70]。basic role は全サービスにまたがる数千の権限を含み、本番環境では代替がない場合を除き付与しないよう述べている [V][^70]。custom role は Google Cloud が新しい権限を追加しても自動で更新されず、利用者が保守する責任を負う [V][^70]（2026-09-30 更新）。IAM Conditions は、legacy basic role の付与や allUsers / allAuthenticatedUsers には使えず、1 つの allow policy に 100 を超える条件付き role binding を入れないことがベストプラクティスとされている [V][^71]。
- **RS-17#90** Google Cloud IAM は、関係する deny policy を allow policy より先に必ず評価する [V][^72]。deny rule の条件が true になるか、評価できない場合は deny rule が適用される [V][^72]。project・folder・organization に付けた deny policy は、その配下の全資源に効く [V][^72]。deny rule には例外の主体（exception principals）を指定できる [V][^72]。1 資源あたり deny policy は 500 まで、deny rule は合計 500 までである [V][^72]（2026-09-30 更新）。
- **RS-17#91** AWS IAM では、既定で全ての要求が暗黙に拒否される（root user を除く）[V][^73]。明示的な deny は明示的な allow より優先する [V][^73]。評価は、全ポリシー種別での明示的 deny の探索、RCP、SCP、resource-based policy、identity-based policy、permissions boundary、session policy の順に進む [V][^73]。identity-based policy と permissions boundary の両方がある場合、実効権限は両者の積集合になる [V][^74]。Organizations のメンバーアカウントの利用者が resource-based policy の設定されていない資源にアクセスする場合、実効権限は identity-based policy、SCP、RCP の積集合になり、3 つ全てが許可する必要がある [V][^74]。
- **RS-17#92** IAM Access Analyzer の custom policy check は、更新後のポリシーが既存版に比べて新しいアクセスを許すか（CheckNoNewAccess）、指定したアクセスを許さないか（CheckAccessNotGranted）、resource policy が公開アクセスを許し得るか（CheckNoPublicAccess）を、CLI・API から検査できる [V][^75]。検査ごとに料金がかかる [V][^75]。
- **RS-17#93** Google Drive の共有は、user、group、domain、anyone の 4 種の grantee に role を与える ACL である [V][^76]。子のファイル・フォルダは親フォルダの権限を自動で継承する [V][^76]。継承した権限を子で削除・縮小することはできず、親で変えるか limited access 設定を使う必要がある [V][^76]。一方で、子では継承より強い role を与えられる [V][^76]。項目を別の親へ移すと、新しい親の権限で再評価される [V][^76]（2026-09-14 更新）。
- **RS-17#94** GitHub の組織リポジトリの基本役割は Read、Triage、Write、Maintain、Admin の 5 つで、組織所有者は全メンバーに適用する base permission を設定できる [V][^77]。custom repository role は GitHub Enterprise Cloud でだけ作成でき、上限は 20 で、基本役割の 1 つを継承して権限を追加する [V][^78]。"Roles and permissions are additive. If a person is given different levels of access through different avenues, such as team membership and the base permissions for an organization, the user has the sum of all access grants." と明記されている [V][^78]。
- **RS-17#95** Slack Connect では、組織は自分のワークスペースまたは Enterprise organization で作ったチャンネルを所有する [V][^79]。所有する組織だけが、組織の招待、他組織の除外、投稿権限の管理、外部組織が除外・切断された後のチャンネルの継続利用を行える [V][^79]。1 つのチャンネルに最大 250 の組織を招待できる [V][^79]。他組織に見せるプロフィール情報の範囲は組織ごとに選べる [V][^79]。開発者向け文書は、全ての当事者の承認を経ていない招待を一覧する API と、外部への招待を送る前に承認段階を設ける仕組みを示している [V][^80]。
- **RS-17#96** RS-17#84〜#95 から、開発者に認可モデルを委ねる際のガードレールは次のとおりにするのが妥当である [D]。
  1. 委ねる範囲を限定する [D]。ドメインの型・関係・権限は各チームに委ねる [D]。テナント境界、越境共有（ADR-024）、横断型（user、tenant、group）は基盤チームが所有する（OpenFGA modular models の type extension と code owners の考え方: RS-17#85） [D]。
  2. 横断ガードレールは deny 優先にする [D]。プラットフォームが所有する forbid / deny（例: resource のテナントと主体のテナントの不一致は拒否）を、開発者のモデルより先に評価する [D]。条件を評価できない場合は deny を適用する（Google Cloud の deny policy と同じ構造: RS-17#90） [D]。Cedar のように error になった policy を skip するエンジンでは、この性質が自動では成り立たないため、schema 検証と entity 完全性の検査を必須にする（RS-07#41） [D]。
  3. テストを CI の合格条件にする [D]。全ての関係について肯定・否定のテストを書き、テナント越えの否定テストを必須にする（RS-17#86・#87、R-172） [D]。
  4. 破壊的変更を自動で拒否する [D]。データがある relation の削除や参照中の permission の削除を拒否し、移行は多段階の手順で行う（RS-17#88） [D]。モデル ID を固定し、新旧モデルで shadow check を行う（RS-07#18、R-147、R-148） [D]。
  5. 「新しいアクセスが増えないか」を自動で検査する [D]。モデル・policy の変更ごとに差分を検査し、権限が広がる変更には追加の承認を要求する（AWS の CheckNoNewAccess と同じ考え方: RS-17#92、Cedar の解析は RS-07 結論 9） [D]。
  6. 広すぎる役割を禁止する [D]。basic role に相当する全権的な役割を作らせない [D]。custom role の保守責任をチームに明示する（RS-17#89） [D]。
  7. 共有の意味論を明示する [D]。Google Drive では継承した権限を子で縮小できず（親で変えるか limited access 設定を使う）、GitHub では異なる経路の権限が加算される（RS-17#93・#94）[V][^76][^78]。自社モデルで「子での制限」「ゲストの範囲制限」が要る場合は、exclusion（but not）や limited access に相当する型を基盤側で用意し、各チームが独自の意味論を作らないようにする [D]。
  8. 要件から始める [D]。モデルの起点は「誰が・何に・何を・どの条件で」という平文の要件にし、役割名から始めない（RS-17#84） [D]。

---

## 4. 標準・文書ステータス表

確認日はすべて 2026-10-03 である。RFC の状態は RFC 本文のヘッダ、I-D の状態は IETF Datatracker、OIDF 文書は仕様本文、MCP は modelcontextprotocol.io の版表示、ベンダー文書は各頁の更新日表示で確認した。

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| RFC 10017 OAuth 2.0 for Browser-Based Applications | BCP 212 | final（RFC、Best Current Practice） | 2026-08 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc10017 |
| RFC 8252 OAuth 2.0 for Native Apps | BCP 212 | final（RFC、Best Current Practice） | 2017-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8252 |
| RFC 8628 OAuth 2.0 Device Authorization Grant | — | final（RFC、Standards Track） | 2019-08 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8628 |
| RFC 10027 Best Current Practice for Security of Cross-Device Flows | BCP 247 | final（RFC、Best Current Practice） | 2026-08 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc10027 |
| RFC 6749 OAuth 2.0 | — | final（RFC、Standards Track） | 2012-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc6749 |
| RFC 7523 JWT Profile for OAuth 2.0 Client Authentication and Authorization Grants | — | final（RFC、Standards Track。RFC 7523bis による更新が処理中） | 2015-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7523 |
| draft-ietf-oauth-rfc7523bis | -11 | draft（2026-04-30 IESG 承認、2026-05-04 から RFC Ed Queue、RFC 未発行） | 2026-04-28（Datatracker の投稿日。本文の日付表記は 2026-03-26 のまま） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc7523bis/ |
| RFC 9700 OAuth 2.0 Security Best Current Practice | BCP 240 | final（RFC、Best Current Practice） | 2025-01 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9700 |
| RFC 8705 OAuth 2.0 Mutual-TLS | — | final（RFC、Standards Track） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8705 |
| RFC 8693 OAuth 2.0 Token Exchange | — | final（RFC、Standards Track） | 2020-01 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8693 |
| RFC 8707 Resource Indicators for OAuth 2.0 | — | final（RFC、Standards Track） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8707 |
| RFC 9728 OAuth 2.0 Protected Resource Metadata | — | final（RFC、Standards Track） | 2025-04 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9728 |
| RFC 6455 The WebSocket Protocol | — | final（RFC、Standards Track） | 2011-12 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc6455 |
| RFC 4513 LDAP: Authentication Methods and Security Mechanisms | — | final（RFC、Standards Track） | 2006-06 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc4513 |
| OpenID Connect Core 1.0 | errata set 2 | final（OIDF Final） | 2023-12-15 | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html |
| draft-ietf-oauth-transaction-tokens | -11 | draft（WG Consensus: Waiting for Write-Up、IESG 未提出） | 2026-07-30 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ |
| draft-ietf-oauth-identity-chaining | -17 | draft（RFC Ed Queue、RFC 未発行。本文は未読） | Datatracker 更新 2026-08-21 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/ |
| draft-ietf-oauth-identity-assertion-authz-grant（ID-JAG） | -04 | draft（WG Document。本文は未読） | 2026-05-21 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-assertion-authz-grant/ |
| draft-ietf-oauth-v2-1（OAuth 2.1） | -16（MCP 2026-07-28 版が参照するのは -13） | draft（WG Document、IESG 未提出、WG マイルストーン 2026-12） | 2026-09-02 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ |
| OpenID AuthZEN Authorization API | 1.0 | final（OpenID Final Specification） | 2026-01-11 | 2026-10-03 | https://openid.net/specs/authorization-api-1_0.html |
| Model Context Protocol（Authorization） | 2026-07-28 | 現行版（標準化団体の文書ではない。RS-06#55 参照） | 2026-07-28 | 2026-10-03 | https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization |
| CloudEvents | v1.0.2 | final（CNCF の仕様リリース。main は 1.0.3-wip） | 2022-02-06（GitHub Release `ce@v1.0.2` の公開日） | 2026-10-03 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md |
| CloudEvents Auth Context 拡張 | main（1.0.3-wip） | 拡張仕様（リリース版に未収録） | 未確認 | 2026-10-03 | https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/authcontext.md |
| OWASP ASVS | 5.0.0 | final（2026-10-03 時点の最新安定版。GitHub の `latest` は bleeding edge の自動生成版） | 2025-05-30（GitHub Release `v5.0.0_release` の公開日） | 2026-10-03 | https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en |
| Zanzibar（USENIX ATC 2019 論文） | — | 査読論文 | 2019-07 | 2026-10-03 | https://www.usenix.org/system/files/atc19-pang.pdf |
| PostgreSQL 文書（Row Security Policies） | 18 | 製品文書（current） | 未確認 | 2026-10-03 | https://www.postgresql.org/docs/current/ddl-rowsecurity.html |
| Keycloak Server Administration Guide | 26.8.0 | 製品文書 | 未確認 | 2026-10-03 | https://www.keycloak.org/docs/latest/server_admin/index.html |

ベンダー文書（Microsoft Learn、AWS、Google Cloud、Databricks、Snowflake、GitHub、Slack、OpenFGA、AuthZed）の版・更新日は参考文献の各脚注に記した。

---

## 5. 設計への含意（ADR・設計文書への入力）と PoC で実測すべきこと

### 5.1 依存サービスが pattern ごとに行うこと（DL-64 連携パターン集への入力）

表の各セルは RS-17 の各項目からの設計推論 [D] である。P-ID は traceability/deliverables.md §6.3 の暫定割当に従う。

| P | 連携パターン | token・flow | SDK の呼出し | 失敗時の挙動 | 試験（契約試験・負例） | 根拠 |
|---|---|---|---|---|---|---|
| P-01 | ブラウザ→BFF→業務 API | BFF が confidential client として authorization code＋PKCE。ブラウザには token を渡さず、cookie（Secure、HttpOnly、SameSite=Strict、`__Host-Http-`）で session を持つ [D] | BFF 用 SDK が token の保管・更新・API 呼出しを担う。業務 API は RS として aud を検証する [D] | AS 停止中の既存 session の継続時間は操作階層ごとに決める（ADR-013）[D] | cookie 属性の検査、CSRF（サブドメインからの要求）、他 RS 宛て token の拒否 [D] | RS-17#1〜#5 |
| P-02 | ネイティブアプリ・CLI | 外部ブラウザ＋PKCE、claimed https か loopback。共有秘密は使わない [D] | SDK が OS ブラウザ起動と redirect 受信を担う。WebView を使わない [D] | refresh 失敗時は再ログインに戻し、旧 token を破棄する [D] | WebView からの認可要求の拒否、PKCE なしの要求の拒否 [D] | RS-17#6〜#10 |
| P-02 派生 | 入力制約デバイス | 既定は禁止。許可する場合は事前登録したデバイス種別と client_id に限り、近接性か組織ネットワークを条件にする [D] | device grant 専用の監査属性を付ける [D] | 不審な device grant を検知したら refresh token を失効させる [D] | device code phishing の演習、許可外 client_id からの device grant の拒否 [D] | RS-17#11〜#17 |
| P-03 | サービス間の同期呼出し | client credentials＋private_key_jwt（aud=issuer、typ 明示）か mTLS。呼出し先ごとに audience を絞り、利用者文脈は token exchange か Txn-Token で運ぶ [D] | SDK が token の取得・キャッシュ・exchange を担う。PEP は aud・テナント・act を検証する [D] | AS 不達時の挙動は操作階層ごとに決める（ADR-013）[D] | aud=token endpoint URL の JWT、他 RS 宛て token、証明書不一致の拒否 [D] | RS-17#18〜#23 |
| P-04 | 非同期メッセージの consumer | メッセージには不透明な参照（主体・テナント・取引 ID）だけを入れ、token や権限は入れない [D] | consumer は処理直前に、元の主体の権限で PDP に再認可を要求する [D] | 滞留中に剥奪されたら拒否してデッドレターへ送り、監査に記録する [D] | 剥奪後に配信されたメッセージの拒否、テナント ID の改ざんの拒否 [D] | RS-17#32〜#35 |
| P-05 | 長時間・定期ジョブ | 実行主体はジョブ用の非人間 ID。実行ごとに短命資格情報を得る。利用者の名で処理する場合は、登録時の同意を記録し、実行時に利用者の状態を再評価してから token を得る [D] | ジョブ基盤 SDK が「所有者」「実行主体」「代理される利用者」を分けて記録する [D] | 利用者の退職・剥奪時は、操作階層ごとに既定（停止か所有者移転）を適用し、所有者移転の作業を起こす [D] | 退職した利用者のジョブが停止または移転されること、黙って失敗しないこと [D] | RS-17#24〜#31 |
| P-07 | 第三者連携アプリ | 細粒度の scope、短命 token、テナント管理者の承認 [D] | アプリ登録の審査（発行者確認、scope ごとの理由）を基盤側で行う [D] | 異常な利用を検知したら grant を一括失効させる [D] | 既存 grant の棚卸し、ポリシー変更後も残る grant の検出 [D] | RS-17#57〜#65 |
| P-08 | AI エージェント・tool 呼出し | tool サーバーごとに resource を指定した token。下流には exchange で取り直した token を使い、中継しない [D] | MCP の版依存は adapter に閉じ込める [D] | 権限不足のときは step-up（scope の追加）か拒否 [D] | 他 audience の token の拒否、token passthrough の検出、状態ハンドルだけでのアクセスの拒否 [D] | RS-17#66〜#71 |
| P-09 | 一覧・検索 | 資源型ごとに方式を選ぶ（BatchCheck による post-filter、ローカル索引＋Check、ListObjects）[D] | 返却直前のページに BatchCheck をかける [D] | 一覧 API の打ち切りを欠落として扱い、黙って少ない結果を返さない [D] | 剥奪直後の検索結果、件数からの推測、ページング中の変更 [D] | RS-17#41〜#46 |
| P-10 | エクスポート・署名 URL | 発行直前に PEP で認可し、URL 寿命は操作階層ごとの上限以下にする [D] | 発行を監査ログに記録する [D] | 漏えいが疑われる場合は署名鍵・資格情報の失効で一括して無効化する [D] | URL 寿命が上限以下であること、剥奪後に新しい URL が発行されないこと [D] | RS-17#47〜#50 |
| P-11 | 管理コンソール・support tool | JIT の昇格（理由、範囲、期間、二者承認、必要なら顧客承認）[D] | 実行できる操作を事前承認済みの集合に限る [D] | 期限で自動失効する [D] | 期限後のアクセスの拒否、承認なしの昇格の拒否、監査ログの記録率 [D] | RS-17#72〜#77 |
| P-12 派生 | レガシー（SAML・LDAP・ヘッダ認証） | broker で SAML→OIDC、ヘッダは gateway が署名した JWT [D] | バックエンドは署名・発行者・audience を検証する [D] | gateway を迂回した到達はネットワークで遮断する [D] | 未署名ヘッダの偽造、gateway 迂回、メールアドレスによる自動リンクの拒否 [D] | RS-17#78〜#83 |
| P-14 | ストリーム接続 | 接続時の認可＋接続中の再認可（期限での切断、剥奪イベントでの切断、メッセージごとの確認）[D] | ブラウザからは BFF 経由で接続し、URL に token を載せない [D] | 剥奪イベントを受けたら接続を閉じる [D] | 剥奪から切断までの時間、役割変更後の旧権限での呼出しの拒否 [D] | RS-17#51〜#56 |
| P-15 | データ基盤への持出し | 製品の行・列統制を二層目として使う [D] | 迂回できる主体（BYPASSRLS、owner 等）を棚卸しする [D] | 非対応の経路からはデータを返さない（fail securely）[D] | 迂回主体の検出、非対応経路の拒否、side-channel の抜取り試験 [D] | RS-17#36〜#40 |

### 5.2 ADR・設計文書への入力

| 入力先 | 入力する内容 | 根拠 |
|---|---|---|
| ADR-005 token profile、DL-16 | ブラウザは BFF を既定にし、ブラウザ内 OAuth client は例外審査とする。ネイティブは外部ブラウザ＋PKCE とする。device grant は既定禁止で許可リスト制とする（RFC 10027 の MUST に従いリスク評価を記録する）。private_key_jwt は aud=issuer 単独・typ 明示を先行採用する [D] | RS-17#1〜#23 |
| ADR-006 失効と継続評価 | ストリーム接続の再認可方式（期限での切断、剥奪イベントでの切断、メッセージ単位の確認）と、署名 URL の残り寿命を剥奪 SLO に含める [D] | RS-17#47〜#56 |
| ADR-008 管理面、ADR-029 特権・support アクセス | JIT＋二者承認＋顧客承認（契約で要る場合）＋最大期間＋事前承認済み操作（JEA 型）＋顧客に開示できる監査。緊急時の自動承認は事後通知と監査を必須にする [D] | RS-17#72〜#77 |
| ADR-009 workload identity、ADR-026 非同期・長時間ジョブ | ジョブの実行主体を非人間 ID にする。利用者の名で動く処理は実行時に利用者の状態を再評価する。退職時の既定（停止か所有者移転）を決める。Txn-Token の発行方針（どの workload が誰の名で発行を受けられるか）を社内統制にする（RS-06 結論 12 と同じ）[D] | RS-17#24〜#31 |
| ADR-011 policy 言語と PEP–PDP API、DL-65 認可モデリングガイド | §3.15 RS-17#96 の 8 項目のガードレールを入れる。とくに、横断の deny 優先（評価できない場合も deny）、テストの CI 必須化、破壊的変更の自動拒否、新しいアクセスの差分検査、共有の縮小意味論の基盤側定義 [D] | RS-17#84〜#96 |
| ADR-012 PEP coverage とストレージ防御 | イベント consumer の再認可を PEP coverage の対象に含める。データ基盤の行・列統制は二層目とし、迂回主体の棚卸しを KRI にする [D] | RS-17#32〜#40 |
| ADR-017 AI エージェント | tool サーバーごとの audience、中継の禁止、下流への token exchange と `act` による利用者・エージェントの併記、MCP 依存の adapter 化 [D] | RS-17#66〜#71 |
| ADR-004 B2B federation、ADR-021 不可逆識別子 | broker の初回リンクは不変識別子での照合に限り、メールアドレスでの自動リンクを禁止する [D] | RS-17#78 |
| ADR-024 越境共有 | 共有の意味論（加算、継承、子での縮小の可否）を明示的に決める。調べた 2 製品では、Google Drive は継承権限を子で縮小できず（limited access 設定を除く）、GitHub は経路の異なる権限を加算する設計である点を、選択肢の比較に入れる [D] | RS-17#93〜#95 |
| ADR-025 一覧・検索の認可 | 資源型ごとの方式選択、返却直前の Check、総件数の扱い、打ち切りの検知 [D] | RS-17#41〜#46 |
| DL-80 モック・契約試験キット | §5.1 の「試験」列の負例ベクタを契約試験に入れる [D] | §5.1 |

### 5.3 PoC で実測すべきこと（DL-22 への入力。TC-ID は未採番）

1. **ストリーム接続の剥奪反映時間**（R-143、R-191）: 権限剥奪と session 失効から、WebSocket / SSE / gRPC streaming の接続が閉じるか、次のメッセージが拒否されるまでの時間を、方式（期限での切断、CAEP session-revoked の受信、メッセージ単位の確認）ごとに p50 / p99 / 最大で測る [D]（RS-17#53・#56）。
2. **非同期経路の再認可**（R-058、R-100）: キュー滞留中に剥奪したメッセージが consumer で拒否される割合と、再認可の追加遅延を測る [D]（RS-17#35）。
3. **ジョブ所有者の退職**（R-044）: 利用者を無効化したとき、その利用者が作成したジョブ、利用者の名で動くジョブ、ジョブ用 ID で動くジョブが、それぞれ設計どおりに停止・移転・継続するかを確認し、検知までの時間を測る [D]（RS-17#27〜#31）。
4. **一覧・検索の完全性と漏えい**（R-190）: 資源型ごとに、アクセス可能な対象数が 1,000 / 10,000 / 100,000 件のときの方式別の遅延と、打ち切りによる欠落率、剥奪直後に検索結果へ出続ける時間（ローカル索引の遅延）を測る。総件数やページングの挙動から、見えない資源の存在を推測できないかを試験する [D]（RS-17#43〜#46、仮定依存: CONVENTIONS §7、A-ID 未採番）。
5. **署名 URL の実効寿命**: 発行した URL が、設定した期限、署名鍵・資格情報の失効のどちらで無効になるかと、その時刻差を、採用するクラウドごとに測る [D]（RS-17#47〜#49）。
6. **M2M の負例**（R-161、R-173）: `aud` に token endpoint URL を入れた client assertion、他 RS 宛ての access token、束縛と異なる証明書での要求が拒否されることを確認する [D]（RS-17#21〜#23）。
7. **device grant の悪用演習**: 社内の phishing 演習として device code の入力を誘導し、許可リスト外の client_id からの device grant が拒否されること、許可した場合の監査属性が残ることを確認する [D]（RS-17#13〜#17）。
8. **MCP・エージェントの負例**: 他 audience の token、上流 token の中継、状態ハンドルだけでのアクセスが、MCP server と下流 API の両方で拒否されることを確認する [D]（RS-17#67〜#71）。
9. **ヘッダ認証 gateway の迂回**: バックエンドへの直接到達、未署名ヘッダの偽造、署名の `signer`・`aud` の取り違えが拒否されることを確認する [D]（RS-17#79〜#83）。
10. **データ基盤の迂回と side-channel**: 迂回できる主体の棚卸しが自動で取れること、非対応経路からのアクセスが拒否されること、テナント越えの side-channel（query duration、参照整合性エラー）を抜取りで試す [D]（RS-17#36〜#40）。
11. **モデリングのガードレール**: 開発者の変更で横断 deny が破られないこと（評価不能時を含む）、破壊的変更が CI で拒否されること、権限が広がる差分が検出されることを、意図的に誤ったモデル変更を使って確かめる [D]（RS-17#96）。

---

## 6. 調査の限界と未確認事項

- 本書は AI エージェントによる調査である。2026-10-03 に作成者とは別の AI エージェントが全 86 脚注を原典で照合した（結果は 81 脚注が支持、5 脚注が部分支持、不支持と検証不能は 0）。部分支持の箇所は本版で修正済みである。記録は research/verification/RS-17-verification.md にある。検証者も AI エージェントであり、人間のレビュアによる照合は未実施である。実測は一切行っていない。
- 本ストリーム ID「RS-17」は traceability/deliverables.md の DL 一覧に未登録である。指示により本書以外のファイルは編集していないため、DL の追加と主張台帳（traceability/claims-ledger.md）への登録は未実施である。
- Web 取得の方式について記す。RFC、I-D、OIDC Core、CloudEvents、ASVS、Zanzibar 論文、MCP、AuthZEN、PostgreSQL、Keycloak、GitHub、OpenFGA、SpiceDB、BigQuery、GCS、Google Drive、Google Cloud IAM（deny、roles、conditions）、IAP、PAM、Access Approval、Databricks、Snowflake、Slack Marketplace の各文書は、原文を取得して引用箇所の文言を照合した。Microsoft Learn と AWS 文書は、取得ツールが返した原文 Markdown で照合した。Storm-2372 の報告は、作成者は取得ツールの要約経由でしか読んでいなかったが、検証者が原文 HTML を取得して逐語で照合した（2026-07-31 の追記を含む）。
- Slack Connect で「所有組織だけができる操作」の一覧（RS-17#95）と Slack の app approval の頁の全文（RS-17#61）は、版 0.1 では取得できなかった。検証者が Slack Help Center の en-gb 版（同じ記事 ID）から全文を取得し、版 0.2 で反映した。en-US の URL は接続元の地域により ja-jp 版へ転送される。
- **未確認**: Amazon API Gateway の WebSocket で、接続確立後にメッセージごとの再認可を行う公式の仕組みは確認していない（RS-17#55）。接続時間の上限（2 時間、引上げ不可）は版 0.2 で確認した [V][^87]。gRPC streaming の再認可は調べていない。
- **未確認**: Auth Context 拡張がどのリリースに入るかは確認していない（v1.0.2 のタグには含まれないことだけを確認した）。Kafka、AsyncAPI、各クラウドのメッセージング製品の認可機能は調べていない。
- **未確認**: Azure の user delegation SAS の最大有効期間は、本調査で取得した頁には記載がなく確認していない。GCS の signed URL を、署名鍵の rotate 以外の方法で個別に失効できるかは確認していない。
- **未確認**: AWS Lake Formation、Azure Synapse / Fabric、Oracle VPD など、RS-17#36〜#39 以外のデータ基盤製品の行・列統制は調べていない。PostgreSQL RLS の接続プール経由のテナント context 漏れは、本書では扱っていない（RS-08 の範囲）。
- **未確認**: identity chaining（RFC Ed Queue）と ID-JAG（-04）は状態だけを確認し、本文は読んでいない。MCP の Enterprise-Managed Authorization 拡張は読んでいない（RS-06 の範囲）。RFC 9728 はヘッダ（Standards Track、2025-04）だけを確認した。
- **未確認**: seed-02 §10 の第三者 OAuth アプリ関連事故（Midnight Blizzard、Salesloft Drift）の一次報告は、本ストリームでは確認していない（RS-12 の範囲）。Storm-2372 以外の device code phishing の報告（RFC 10027 §6.2.1.2 が参照する報告群）も読んでいない。
- **未確認**: SAML 2.0 仕様本体（OASIS）、SAML–OIDC 変換の標準的な profile の有無、LDAP を OIDC に橋渡しする製品の公式文書は調べていない。Keycloak 以外の broker 製品は比較していない。
- **未確認**: Google Workspace の Drive で、limited access 設定の詳細と権限の伝播にかかる時間は確認していない。GitHub の base permission と custom role の相互作用は、本書で引いた加算の記述以上には確認していない。
- **未確認**: BCP 212 を構成する RFC の一覧は確認していない（RFC 8252 と RFC 10017 の両方のヘッダが BCP 212 を示すことだけを確認した）。
- JEA の公式頁の ms.date は 2022-11-16 であり、現行の PowerShell の版での差分は確認していない。
- seed-03 §7-8（越境共有と三者一致ルール）、§7-11（WORM と削除権）、§7-12（テナントライフサイクル）は本ストリームの範囲外として扱わなかった。

---

## 参考文献

[^1]: IETF (A. Parecki, P. De Ryck, D. Waite)『RFC 10017: OAuth 2.0 for Browser-Based Applications』BCP 212, 2026-08. https://www.rfc-editor.org/rfc/rfc10017 （参照箇所: ヘッダ, §6.1.3.1, §6.1.3.2, §6.1.3.3（6.1.3.3.1, 6.1.3.3.2）, §6.1.4.3、確認日: 2026-10-03）
[^2]: IETF (A. Parecki, P. De Ryck, D. Waite)『RFC 10017: OAuth 2.0 for Browser-Based Applications』BCP 212, 2026-08. https://www.rfc-editor.org/rfc/rfc10017 （参照箇所: §6.3（6.3.2.1, 6.3.2.3, 6.3.3.1, 6.3.4.3 Summary）、確認日: 2026-10-03）
[^3]: IETF (W. Denniss, J. Bradley)『RFC 8252: OAuth 2.0 for Native Apps』BCP 212, 2017-10. https://www.rfc-editor.org/rfc/rfc8252 （参照箇所: ヘッダ, §4, §6, §7, §7.1, §7.2, §7.3、確認日: 2026-10-03）
[^4]: IETF (W. Denniss, J. Bradley)『RFC 8252: OAuth 2.0 for Native Apps』BCP 212, 2017-10. https://www.rfc-editor.org/rfc/rfc8252 （参照箇所: §8.1, §8.2, §8.5, §8.12、確認日: 2026-10-03）
[^5]: IETF (W. Denniss, J. Bradley, M. Jones, H. Tschofenig)『RFC 8628: OAuth 2.0 Device Authorization Grant』2019-08. https://www.rfc-editor.org/rfc/rfc8628 （参照箇所: §1, §3.3, §5.4、確認日: 2026-10-03）
[^6]: IETF (P. Kasselman, D. Fett, F. Skokan)『RFC 10027: Best Current Practice for Security of Cross-Device Flows』BCP 247, 2026-08. https://www.rfc-editor.org/rfc/rfc10027 （参照箇所: ヘッダ, §2 Best Practices、確認日: 2026-10-03）
[^7]: IETF (P. Kasselman, D. Fett, F. Skokan)『RFC 10027: Best Current Practice for Security of Cross-Device Flows』BCP 247, 2026-08. https://www.rfc-editor.org/rfc/rfc10027 （参照箇所: §6.2.1（6.2.1.2〜6.2.1.5）、確認日: 2026-10-03）
[^8]: Microsoft『Authentication flows as a condition in Conditional Access policy』Microsoft Learn, ms.date 2026-03-24. https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-authentication-flows （参照箇所: Device code flow, Protocol tracking、確認日: 2026-10-03）
[^9]: Microsoft Threat Intelligence『Storm-2372 conducts device code phishing campaign』Microsoft Security Blog, 2025-02-13（2025-02-14 追記、2026-07-31 追記・最終更新）. https://www.microsoft.com/en-us/security/blog/2025/02/13/storm-2372-conducts-device-code-phishing-campaign/ （参照箇所: UPDATE (July 31, 2026), 攻撃の概要, February 14, 2025 update, Mitigation and protection guidance、確認日: 2026-10-03。検証者が原文 HTML で逐語照合済み）
[^10]: IETF (D. Hardt, Ed.)『RFC 6749: The OAuth 2.0 Authorization Framework』2012-10. https://www.rfc-editor.org/rfc/rfc6749 （参照箇所: §4.4, §4.4.3、確認日: 2026-10-03）
[^11]: IETF (M. Jones, B. Campbell, C. Mortimore)『RFC 7523: JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants』2015-05. https://www.rfc-editor.org/rfc/rfc7523 （参照箇所: §2.2, §3、確認日: 2026-10-03）
[^12]: IETF (M.B. Jones, B. Campbell, C. Mortimore, F. Skokan)『Updates to OAuth 2.0 JSON Web Token (JWT) Client Authentication and Assertion-Based Authorization Grants』draft-ietf-oauth-rfc7523bis-11, 2026-04-28 投稿（本文の日付表記は 2026-03-26）. https://www.ietf.org/archive/id/draft-ietf-oauth-rfc7523bis-11.txt （参照箇所: Abstract, RFC 7523 §3 項目 3 の置換文, RFC 7523 §3.2 への追加要件、確認日: 2026-10-03）
[^13]: IETF (T. Lodderstedt, J. Bradley, A. Labunets, D. Fett)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.3, §2.5、確認日: 2026-10-03）
[^14]: IETF (B. Campbell, J. Bradley, N. Sakimura, T. Lodderstedt)『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3, §6.3, §6.5、確認日: 2026-10-03）
[^15]: OpenID Foundation (N. Sakimura, J. Bradley, M. Jones, B. de Medeiros, C. Mortimore)『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §11 Offline Access、確認日: 2026-10-03）
[^16]: IETF (M. Jones, A. Nadalin, B. Campbell, J. Bradley, C. Mortimore)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §1.1, §2.1、確認日: 2026-10-03）
[^17]: IETF (A. Tulshibagwale, G. Fletcher, P. Kasselman)『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30. https://www.ietf.org/archive/id/draft-ietf-oauth-transaction-tokens-11.txt （参照箇所: Abstract, §5.1, §6, §8.2, §13.1, §13.3, §13.12, §13.13, §13.15, §14、確認日: 2026-10-03）
[^18]: Databricks『Manage identities, permissions, and privileges for Lakeflow Jobs』Databricks on AWS 文書, 2026-09-11 更新. https://docs.databricks.com/aws/en/jobs/privileges （参照箇所: 既定の所有者と Run as、Run as を service principal に変える推奨、確認日: 2026-10-03）
[^19]: Microsoft『Support for service principal owned flows』Power Automate, Microsoft Learn, ms.date 2026-08-14. https://learn.microsoft.com/en-us/power-automate/service-principal-support （参照箇所: When to use service principal application user、確認日: 2026-10-03）
[^20]: Microsoft『Manage orphaned flows when owner leaves organization』Microsoft Learn（KB 4556130）, ms.date 2026-06-11. https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/flow-management/manage-orphan-flow-when-owner-leaves-org （参照箇所: Summary, Fix permissions for all flows created by a specific user、確認日: 2026-10-03）
[^21]: Google Cloud『Scheduling queries』BigQuery 文書, 2026-09-30 更新. https://docs.cloud.google.com/bigquery/docs/scheduling-queries （参照箇所: Using a service account、確認日: 2026-10-03）
[^22]: GitHub『OpenID Connect』GitHub Docs（Actions, Concepts, Security）. https://docs.github.com/en/actions/concepts/security/openid-connect （参照箇所: 仕組み, Benefits of using OIDC、確認日: 2026-10-03）
[^23]: CNCF CloudEvents『CloudEvents - Version 1.0.2』2022-02-06（GitHub Release `ce@v1.0.2`）. https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md （参照箇所: Privacy and Security、確認日: 2026-10-03）
[^24]: CNCF CloudEvents『Auth Context』拡張（main ブランチ、1.0.3-wip）. https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/authcontext.md （参照箇所: 冒頭, authtype, authid, authclaims、確認日: 2026-10-03）
[^25]: OWASP『Application Security Verification Standard 5.0.0』V8 Authorization. https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md （参照箇所: 8.3.2, 8.3.3, 8.4.1、確認日: 2026-10-03）
[^26]: PostgreSQL Global Development Group『Row Security Policies』PostgreSQL 18 Documentation. https://www.postgresql.org/docs/current/ddl-rowsecurity.html （参照箇所: 冒頭の段落（default-deny, TRUNCATE/REFERENCES, BYPASSRLS, FORCE）, 参照整合性と covert channel の段落、確認日: 2026-10-03）
[^27]: Google Cloud『Introduction to BigQuery row-level security』BigQuery 文書, 2026-09-30 更新. https://docs.cloud.google.com/bigquery/docs/row-level-security-intro （参照箇所: grantee_list の挙動, Limitations と side channel, Comparison of authorized views, row-level security, and separate tables、確認日: 2026-10-03）
[^28]: Snowflake『Understanding row access policies』Snowflake Documentation（版表記なし）. https://docs.snowflake.com/en/user-guide/security-row-intro （参照箇所: Enterprise Edition Feature, How does a row access policy work?, 挿入を防がない旨の注記, masking policy との評価順、確認日: 2026-10-03）
[^29]: Databricks『Row filters and column masks』Databricks on AWS 文書, 2026-09-24 更新. https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks （旧 URL https://docs.databricks.com/aws/en/tables/row-and-column-filters から転送）（参照箇所: 概要, When to use ABAC policies or dynamic views instead, Limitations、確認日: 2026-10-03）
[^30]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §1 Introduction, §2.4.5 Expand、確認日: 2026-10-03）
[^31]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §3.2.4 Leopard Indexing System、確認日: 2026-10-03）
[^32]: OpenFGA『Search With Permissions』web 文書（版表記なし）. https://openfga.dev/docs/interacting/search-with-permissions （参照箇所: Possible options（Option 1〜3）, Choosing the best option、確認日: 2026-10-03）
[^33]: OpenFGA『Relationship Queries: Check, Read, Expand, ListObjects and ListUsers』web 文書（版表記なし）. https://openfga.dev/docs/interacting/relationship-queries （参照箇所: ListObjects — Caveats, ListUsers — Caveats、確認日: 2026-10-03）
[^34]: AuthZed『Querying Data』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/querying-data （参照箇所: LookupResources, LookupSubjects、確認日: 2026-10-03）
[^35]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §8 Search APIs（8.1 Semantics, 8.2 Pagination, 応答の total）、確認日: 2026-10-03）
[^36]: Amazon Web Services『Download and upload objects with presigned URLs』Amazon S3 User Guide. https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html （参照箇所: 冒頭, Who can create a presigned URL, Expiration time for presigned URLs, Limiting presigned URL capabilities, FAQ、確認日: 2026-10-03）
[^37]: Google Cloud『Signed URLs』Cloud Storage 文書, 2026-09-30 更新. https://docs.cloud.google.com/storage/docs/access-control/signed-urls （参照箇所: 冒頭, Overview, When should you use a signed URL?, X-Goog-Expires の説明、確認日: 2026-10-03）
[^38]: Microsoft『Grant limited access to data with shared access signatures (SAS)』Azure Storage, Microsoft Learn, ms.date 2026-02-27. https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview （参照箇所: Types of shared access signatures, How a shared access signature works, Best practices when using SAS、確認日: 2026-10-03）
[^39]: IETF (I. Fette, A. Melnikov)『RFC 6455: The WebSocket Protocol』2011-12. https://www.rfc-editor.org/rfc/rfc6455 （参照箇所: §10.2, §10.5、確認日: 2026-10-03）
[^40]: OWASP『Application Security Verification Standard 5.0.0』V4 API and Web Service. https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x13-V4-API-and-Web-Service.md （参照箇所: V4.4 WebSocket（4.4.1〜4.4.4）、確認日: 2026-10-03）
[^41]: Microsoft『SignalR authentication and authorization』ASP.NET Core, Microsoft Learn, ms.date 2026-09-20. https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz （既定ビュー ?view=aspnetcore-10.0 に転送。.NET 11 の記述は同ビュー内にある）（参照箇所: User and role changes during the connection lifetime, Bearer token authentication, Authentication refresh（.NET 11）、確認日: 2026-10-03）
[^42]: Amazon Web Services『Control and manage access to WebSocket APIs in API Gateway』API Gateway Developer Guide. https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-control-access.html （参照箇所: 本文（$connect への authorizer の推奨）、確認日: 2026-10-03）
[^43]: GitHub『Differences between GitHub Apps and OAuth apps』GitHub Docs. https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps （参照箇所: 冒頭, Who can install GitHub Apps and authorize OAuth apps, Token-based identification、確認日: 2026-10-03）
[^44]: GitHub『Best practices for creating a GitHub App』GitHub Docs. https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app （参照箇所: Select the minimum permissions required, Secure your app's credentials, Validate the organization access for every new authentication, Expire tokens、確認日: 2026-10-03）
[^45]: GitHub『Authenticating with a GitHub App on behalf of a user』GitHub Docs. https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user （参照箇所: 冒頭のアクセス条件 3 項目、確認日: 2026-10-03）
[^46]: Slack『Slack Marketplace app guidelines and requirements』Slack Developer Docs. https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements/ （参照箇所: Scopes, Privacy model, Security requirements、確認日: 2026-10-03）
[^47]: Slack『Manage app requests for your workspace』Slack Help Center. https://slack.com/help/articles/360024269514-Manage-app-requests-for-your-workspace （参照箇所: What to expect, Review app requests, Scope change requests、確認日: 2026-10-03。検証者が en-gb 版 https://slack.com/intl/en-gb/help/articles/360024269514 で全文を照合）
[^48]: Microsoft『Configure how users consent to applications』Microsoft Entra ID, Microsoft Learn, ms.date 2025-06-15. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent （参照箇所: 冒頭, 組込みポリシーの表（microsoft-user-default-low / legacy）, 既存の同意に関する注記、確認日: 2026-10-03）
[^49]: Microsoft『Configure the admin consent workflow』Microsoft Entra ID, Microsoft Learn, ms.date 2024-12-29. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow （参照箇所: 冒頭, Enable the admin consent workflow、確認日: 2026-10-03）
[^50]: Microsoft『Publisher verification overview』Microsoft identity platform, Microsoft Learn, ms.date 2024-08-13. https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview （参照箇所: 冒頭, Benefits の注記（2020-11-08）, FAQ「What does publisher verification not tell me」、確認日: 2026-10-03）
[^51]: Model Context Protocol『Authorization』Specification Version 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization （参照箇所: Protocol Requirements, Standards Compliance（OAuth 2.1 は draft-ietf-oauth-v2-1-13 を参照）, Resource Parameter Implementation, Access Token Usage, Token Handling, Security Considerations、確認日: 2026-10-03）
[^52]: Model Context Protocol『Security Best Practices』2026-07-28 版の文書. https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices （https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices に転送）（参照箇所: Token Passthrough, State Handle Hijacking、確認日: 2026-10-03）
[^53]: Model Context Protocol『Versioning』. https://modelcontextprotocol.io/specification/versioning （https://modelcontextprotocol.io/docs/2026-07-28/learn/versioning に転送）（参照箇所: current protocol version、確認日: 2026-10-03）
[^54]: IETF (B. Campbell, J. Bradley, H. Tschofenig)『RFC 8707: Resource Indicators for OAuth 2.0』2020-02. https://www.rfc-editor.org/rfc/rfc8707 （参照箇所: §2、確認日: 2026-10-03）
[^55]: Microsoft『What is Privileged Identity Management?』Microsoft Entra ID Governance, Microsoft Learn, ms.date 2026-04-23. https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure （参照箇所: What does it do?, Terminology, License requirements、確認日: 2026-10-03）
[^56]: Microsoft『Overview of Just Enough Administration (JEA)』PowerShell, Microsoft Learn, ms.date 2022-11-16. https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/overview （参照箇所: 冒頭, Why is JEA important?、確認日: 2026-10-03）
[^57]: Google Cloud『Privileged Access Manager overview』IAM 文書, 2026-09-30 更新. https://docs.cloud.google.com/iam/docs/pam-overview （参照箇所: 冒頭, Entitlements, Grants, 注意事項、確認日: 2026-10-03）
[^58]: Microsoft『Customer Lockbox requests』Microsoft Purview, Microsoft Learn, ms.date 2025-02-03. https://learn.microsoft.com/en-us/purview/customer-lockbox-requests （参照箇所: Customer Lockbox workflow, Auditing Customer Lockbox requests, FAQ（有効期間 4 時間、12 時間での失効、standing access）、確認日: 2026-10-03）
[^59]: Google Cloud『Overview of Access Approval』Assured Workloads 文書, 2026-09-30 更新. https://docs.cloud.google.com/assured-workloads/access-approval/docs/overview （参照箇所: Overview, Access Approval exclusions（自動承認と auto approved、EU Data Boundary 等での自動承認の無効化）、確認日: 2026-10-03）
[^60]: Keycloak『Server Administration Guide』Version 26.8.0. https://www.keycloak.org/docs/latest/server_admin/index.html （参照箇所: Integrating identity providers（Brokering overview）, First login flow（Automatically link existing first login flow）、確認日: 2026-10-03）
[^61]: Google Cloud『Securing your app with signed headers』Identity-Aware Proxy 文書, 2026-09-30 更新. https://docs.cloud.google.com/iap/docs/signed-headers-howto （参照箇所: 冒頭（secondary security）, Verifying the JWT header / payload、確認日: 2026-10-03）
[^62]: Amazon Web Services『Authenticate users using an Application Load Balancer』Elastic Load Balancing User Guide. https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html （参照箇所: Configure user authentication, User claims encoding and signature verification, Session timeout、確認日: 2026-10-03）
[^63]: Microsoft『Header-based single sign-on (SSO) for on-premises apps with Microsoft Entra application proxy』Microsoft Learn, ms.date 2026-03-25. https://learn.microsoft.com/en-us/entra/identity/app-proxy/application-proxy-configure-single-sign-on-with-headers （参照箇所: Supported capabilities, Considerations、確認日: 2026-10-03）
[^64]: IETF (R. Harrison, Ed.)『RFC 4513: Lightweight Directory Access Protocol (LDAP): Authentication Methods and Security Mechanisms』2006-06. https://www.rfc-editor.org/rfc/rfc4513 （参照箇所: §5.1.2, §6.3.1, §6.3.2、確認日: 2026-10-03）
[^65]: OpenFGA『Getting Started with Modeling』web 文書（版表記なし）. https://openfga.dev/docs/modeling/getting-started （参照箇所: A Process For Defining Authorization Models（01〜06）, roles に関する注記、確認日: 2026-10-03）
[^66]: OpenFGA『Modular Models』web 文書（版表記なし）. https://openfga.dev/docs/modeling/modular-models （参照箇所: 冒頭の課題記述, code owners, Type extensions の制約、確認日: 2026-10-03）
[^67]: OpenFGA『Testing Models』web 文書（版表記なし）. https://openfga.dev/docs/modeling/testing （参照箇所: 冒頭, Write tests, Running tests, CI/CD integration、確認日: 2026-10-03）
[^68]: AuthZed『Validation, Testing, Debugging SpiceDB Schemas』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/modeling/validation-testing-debugging （参照箇所: zed validate, Assertions, Expected Relations, GitHub Actions、確認日: 2026-10-03）
[^69]: AuthZed『Updating and Migrating Schema in SpiceDB』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/modeling/migrating-schema （参照箇所: 許される変更と拒否される変更, 複数段階の移行手順、確認日: 2026-10-03）
[^70]: Google Cloud『Roles and permissions』IAM 文書, 2026-09-30 更新. https://docs.cloud.google.com/iam/docs/roles-overview （参照箇所: Role types, Basic roles の注意, Custom roles の保守責任、確認日: 2026-10-03）
[^71]: Google Cloud『Overview of IAM Conditions』IAM 文書, 2026-09-30 更新. https://docs.cloud.google.com/iam/docs/conditions-overview （参照箇所: Limitations（basic role、allUsers、条件付き binding 数）、確認日: 2026-10-03）
[^72]: Google Cloud『Deny policies』IAM 文書, 2026-09-30 更新. https://docs.cloud.google.com/iam/docs/deny-overview （参照箇所: Policy evaluation, Deny rules（denial conditions, exception principals）, Inheritance, Limits、確認日: 2026-10-03）
[^73]: Amazon Web Services『How AWS enforcement code logic evaluates requests to allow or deny access』IAM User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html （参照箇所: 要約の 3 項目, 評価手順（Deny evaluation〜Session policies）、確認日: 2026-10-03）
[^74]: Amazon Web Services『Policy evaluation logic』IAM User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html （参照箇所: Evaluating identity-based policies with permissions boundaries, with AWS Organizations SCPs or RCPs、確認日: 2026-10-03）
[^75]: Amazon Web Services『Validate policies with IAM Access Analyzer custom policy checks』IAM User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-custom-policy-checks.html （参照箇所: 冒頭, CLI / API の 3 種のチェック、確認日: 2026-10-03）
[^76]: Google『Share files, folders, and drives』Google Drive API 文書, 2026-09-14 更新. https://developers.google.com/workspace/drive/api/guides/manage-sharing （参照箇所: permission の種類, How permissions propagate, 継承権限の取消しに関する注記、確認日: 2026-10-03）
[^77]: GitHub『Repository roles for an organization』GitHub Docs. https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization （参照箇所: Repository roles for organizations, base permissions、確認日: 2026-10-03）
[^78]: GitHub『About custom repository roles』GitHub Enterprise Cloud Docs. https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/about-custom-repository-roles （free-pro-team 版の URL から転送）（参照箇所: 冒頭（Enterprise Cloud、上限 20）, 継承ロール, 加算に関する記述、確認日: 2026-10-03）
[^79]: Slack『Slack Connect guide: Work with external organizations』Slack Help Center. https://slack.com/help/articles/115004151203-A-guide-to-Slack-Connect （参照箇所: Slack Connect for channels（250 組織）, Channel ownership（所有組織だけができる操作 4 項目）, View member profiles、確認日: 2026-10-03。検証者が en-gb 版 https://slack.com/intl/en-gb/help/articles/115004151203 で全文を照合）
[^80]: Slack『Using Slack Connect API methods』Slack Developer Docs. https://docs.slack.dev/apis/slack-connect/using-slack-connect-api-methods/ （旧 URL https://api.slack.com/apis/channels-between-orgs から転送）（参照箇所: List invitations, Governing invitations, Approve invitations、確認日: 2026-10-03）
[^81]: IETF Datatracker『draft-ietf-oauth-transaction-tokens』文書記録. https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ （参照箇所: WG state（WG Consensus: Waiting for Write-Up）, IESG state（I-D Exists）, 最新版 -11、確認日: 2026-10-03）
[^82]: IETF Datatracker『draft-ietf-oauth-identity-assertion-authz-grant』文書記録. https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-assertion-authz-grant/ （参照箇所: WG state（WG Document）, 最新版 -04（2026-05-21）、確認日: 2026-10-03）
[^83]: IETF Datatracker『draft-ietf-oauth-identity-chaining』文書記録. https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/ （参照箇所: IESG state（RFC Ed Queue）, 最新版 -17、確認日: 2026-10-03）
[^84]: IETF Datatracker『draft-ietf-oauth-v2-1』文書記録. https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ （参照箇所: WG state（WG Document）, IESG state（I-D Exists）, 最新版 -16（2026-09-02）, WG milestone（Dec 2026）、確認日: 2026-10-03）
[^85]: IETF Datatracker『draft-ietf-oauth-rfc7523bis』文書記録. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc7523bis/ （参照箇所: IESG state（RFC Ed Queue）, Intended RFC status（Proposed Standard）, 最新版 -11（2026-04-28 投稿）, History（2026-04-30 IESG 承認、2026-05-04 RFC Ed Queue、2026-09-30 RPC 状態 In Progress (Second Edit)）、確認日: 2026-10-03）
[^86]: IETF (M.B. Jones, P. Hunt, A. Parecki)『RFC 9728: OAuth 2.0 Protected Resource Metadata』2025-04. https://www.rfc-editor.org/rfc/rfc9728 （参照箇所: ヘッダ（Standards Track、2025-04）、確認日: 2026-10-03）
[^87]: Amazon Web Services『Quotas for configuring and running a WebSocket in API Gateway』API Gateway Developer Guide. https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html （参照箇所: 表の Connection duration for WebSocket API（2 hours、引上げ不可）, Idle Connection Timeout（10 minutes、引上げ不可）、確認日: 2026-10-03。版 0.2 で検証者が追加）
