# RS-16 超大規模並行開発の統治（一次資料調査ノート）

> 文書ID: RS-16 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-105, R-106, R-107, R-108, R-109, R-022, R-136, R-138, R-140, R-179, R-194, R-208, R-209（seed-01 §2 の採番。対応付けのためだけに参照し、根拠には使わない）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md（DL-100, DL-62〜DL-80, DEC-8）, 01_governance/assumptions-register.md（A-050〜A-054）, traceability/seed/seed-01-ciso-assurance.md（§2.8, §2.11）, traceability/seed/seed-02-cto-technical.md（ADR 一覧 A16, §9 9-3）, traceability/seed/seed-03-redteam-decision.md（C3, §2, §7-14, §7-15）, research/RS-07-authz-engines-consistency.md, research/RS-11-twenty-year-evolution-pqc.md

本書は AI エージェント（Claude）が 2026-10-03 に Web 上の原典を取得して調査・起草した。RFC、OpenID、OpenAPI、AsyncAPI、CloudEvents、Kubernetes、Google AIP、デジタル庁の文書は、本文（HTML・テキスト・PDF）を直接取得して該当箇所を照合した。種資料（seed-01〜03）は問いの手掛かりとしてだけ使い、本文の根拠には原典だけを引いた。原典を取得できなかった事項は §6 に「未確認」として列挙し、結論には使っていない。v0.1 の判定は作成者による自己調査であった。v0.2 では、作成者以外のエージェントが全 69 脚注の原典を再取得して照合し、版・日付・範囲のずれを修正した（記録: research/verification/RS-16-verification.md、2026-10-03）。この照合も AI エージェントによるもので、人間による検証ではない。

凡例: 主張タグは CONVENTIONS §3 に従う。

- `[N]` は、標準化団体・仕様策定団体の仕様（IETF RFC、OpenID Foundation、OpenAPI Initiative、AsyncAPI Initiative、CloudEvents、JSON Schema、semver.org のコミュニティ仕様）、NIST SP、および日本政府の閣議決定・デジタル庁の標準化ルール文書に付けた。日本政府の文書は地方公共団体情報システムを対象とする規範であり、本基盤には直接適用されない。
- `[V]` は、製品・プロジェクトの公式文書（Google AIP、Kubernetes、Stripe、Microsoft、AWS、Pact、Microcks、Buf、protobuf、Spectral）とサービス提供者の利用規約・FAQ に付けた。規範でも製品文書でもない公式発行物（CNCF TAG の白書・成熟度モデル、Team Topologies 公式サイト、DORA の指標定義）も、発行元の一次記述として `[V]` を付けた。
- `[M]` は、公表統計（デジタル庁の移行状況）、検証事業の結果、DORA の調査結果に付け、測定条件を併記した。
- 規模に関する前提は前提台帳（01_governance/assumptions-register.md）の A-ID を参照した。A-050（依存サービス 300）、A-051（事業ドメイン 30）、A-052（開発組織 25・開発チーム 60）、A-053（開発者 1,500）、A-054（プラットフォームチーム 24 FTE）である。

---

## 1. 調査の問い

種資料由来の問い（seed-01 R-105〜R-109・R-140、seed-02 A16・9-3、seed-03 C3・§2・§7-14・§7-15、deliverables の DEC-8・DL-62〜DL-80）:

1. 300 サービスと 20〜30 の開発組織が認証・認可基盤の完成を待たずに並行開発するには、何を「契約」として凍結し、何を凍結しないべきか（DEC-8、ADR-022、R-109）。
2. 契約記述に使う仕様（OpenAPI 3.1、JSON Schema 2020-12、AsyncAPI 3.0、CloudEvents 1.0）は、確認日時点でどの版がどの状態にあるか。どの版で凍結するのが妥当か（R-109）。
3. consumer-driven contract testing（Pact 等）は、公式文書上どの条件で有効で、どの条件で向かないか。モックと契約試験キットに何を入れるべきか（DL-80）。
4. 版管理と非推奨期間について、主要な API 提供者は互換性と非推奨の期間をどう定めているか（R-105、R-108、seed-02 9-3）。
5. Sunset header（RFC 8594）と Deprecation header（RFC 9745）の標準化状態と規範要求は何か（R-108）。
6. 変更管理委員会はどう設計すべきか。統制要求と開発速度の研究結果はそれぞれ何を言っているか（R-140、R-194）。
7. platform engineering（CNCF Platforms White Paper）と Team Topologies は、共通基盤の提供方法（SDK、self-service、オンボーディング、測定）について何を述べているか（R-136、R-138、seed-03 C3・§7-15）。
8. オンボーディングのリードタイムについて、公開された基準や先例はあるか（DL-66）。
9. 日本の大規模・多ベンダー案件（自治体情報システム標準化、ガバメントクラウド、共通機能）では、仕様の版管理・改定周期・適合確認・問い合わせ対応をどう統治しているか。その結果は何だったか。

本ストリームで追加した問い:

10. 認証・認可のプロトコルには、「未知の claim や parameter は無視する」といった独自の互換性規則がある。これらは一般的な API 互換性の規則と衝突しないか（ADR-005、ADR-016）。
11. 「破壊的変更」の定義は、提供者の間で一致しているか（enum 値の追加、エラーコードの変更、既定値の変更など）。
12. consumer が 300 規模になったとき、provider 側の開発を止めずに契約試験を回す仕組みは公式にどう提供されているか（pending pacts、consumer version selectors、can-i-deploy）。
13. SDK のサポート期間と、基盤の版と SDK の版の skew（版差）の許容幅は、先例ではどう定められているか。
14. client 登録などのオンボーディング手順を、標準の範囲で self-service にできるか（RFC 7591）。
15. 契約記述ツールは OpenAPI 3.2 や AsyncAPI 3.x に対応しているか。その状況は凍結版の選択に効くか。
16. DEC-8（連携契約 v1 の凍結）は、R-022（退出基準を満たすまで不可逆な標準化・強制移行を凍結する）と衝突しないか。

---

## 2. 結論サマリ（設計への含意）

1. 契約として凍結すべきものは「識別子と境界」である [D]（RS-16#14〜#21, #63, #67, #71 より）。具体的には、issuer URL、discovery と JWKS の取得規則、access token の claim profile、エラー形式、PEP–PDP API、監査イベントの共通項目、SDK の公開インタフェースである [D]。issuer は ID Token の iss と同一でなければならず（MUST）、一致しない metadata は使ってはならない（MUST NOT）ため、事後に変えられない [N][^16][^17]。デジタル庁の共通機能の標準も、インタフェースは標準化する一方、内部の機能は最低限の必須機能だけを定め、事業者の追加を妨げない方針をとる [N][^62]。PDP エンジン、ストア、cell 構成などの内部実装は凍結の対象外とする [D]。
2. DEC-8 の凍結は、R-022 が凍結を求める「不可逆な標準化・強制移行」と衝突し得る [D]（R-022 は seed-01 §2.1 の原子要求）。v1 の凍結は「版付き・非推奨期間付き・強制移行なし」とし、不可逆なのは識別子（ADR-021）だけであることを決裁文に明記する必要がある [D]（RS-16#17, #34, #40 より）。
3. 「破壊的変更」の定義は提供者ごとに異なるので、自社で明文化する必要がある [D]。Google AIP-180 は、既定値の変更を破壊的変更とし（must not）、応答で使う enum への値の追加には「適切な注意」を求める（should）[V][^22]。Microsoft Graph は、enum へのメンバ追加とエラーコードの変更を後方互換の変更に分類する [V][^25]。Stripe は enum を closed（値の集合が増減しない）と open に分け、open な enum への値の追加を API 版を上げない後方互換の変更とする [V][^29]。どの定義を採るかで、契約試験の合否と非推奨手続の要否が変わる [D]（RS-16#24, #27, #32 より）。
4. 認証・認可の契約には、一般的な API 互換性の規則と逆向きに働く規則がある [D]。JWT は、理解できない claim を無視しなければならない（MUST）[N][^13]。OAuth 2.0 の AS は、認識できない要求 parameter を無視しなければならない（MUST）[N][^14]。このため、新しいセキュリティ制約を新しい claim として追加しても、旧版の PEP や SDK は黙って無視する [D]。制約を強める変更は、JWS の crit（理解できなければ JWS を無効とする）か、typ や token profile の版の変更で表し、互換性区分上は「破壊的」として扱う必要がある [N][^15][D]（RS-16#14〜#16 より）。
5. 契約記述仕様の版の状態は次のとおりである [D]。OpenAPI の最新は 3.2.1（2026-09-10）で、3.1 系の最新は 3.1.2（2025-09-19）である [N][^1]。OpenAPI は minor 版でも後方互換でない変更があり得ると明記している [N][^1]。JSON Schema の現行版 2020-12 は、2022-12-18 に失効した Internet-Draft の形で公開されており、策定団体は IETF での発行をやめた [N][^3][^4][V][^5]。AsyncAPI の最新は 3.1.0（2026-01-31、破壊的変更なし）である [N][^6][V][^7]。CloudEvents の最新リリースは 1.0.2 で、CNCF Graduated である [N][^9][V][^10]。v1 の凍結は、OpenAPI 3.1 系、JSON Schema 2020-12 の方言、AsyncAPI 3.x、CloudEvents 1.0 で行い、OpenAPI 3.2 への移行は使用ツールの対応を PoC で確認してから判断する [D]（RS-16#1〜#13 より）。
6. Pact の公式文書は、Pact が向く条件として「consumer と provider の双方の開発を自組織または提携組織が管理している」ことに加え、consumer の要求が provider の機能を駆動すること、provider チームが consumer チームごとに個別の関係を管理できる程度に consumer が少ないことを挙げる [V][^44]。逆に、相手側が Pact を使わない場合、consumer を個別に識別できない公開 API、特定の consumer の要求で機能が変わらない provider（例として「API が完全に安定した OAuth provider」を挙げる）には向かないとしている [V][^44]。本基盤の consumer は client_id や workload ID で識別できる [D]。しかし、300 規模の consumer の全員と個別の関係を持つことは上記の条件を満たしにくく、AS の標準 endpoint（token endpoint 等）は Pact の文書が例に挙げる「API が完全に安定した OAuth provider」に近い [D][A-050]。また 20〜30 の開発組織がすべて同じ契約試験の道具立てを採らなければ、consumer-driven の試験は成立しない [D][A-052]。したがって、試験は二層にする [D]。下層は、全 consumer に必須のスキーマ適合試験と、モック（OpenAPI・AsyncAPI から生成するもの、Microcks 型）である [V][^52][D]。上層は、主要な consumer に限った consumer-driven 契約である [D]。上層を使う consumer には、調達契約で Pact Broker への登録を義務づける [D]（RS-16#46〜#56 より）。
7. 非推奨期間の公開先例は、安定度の段階によって大きく異なる [D]。Kubernetes は、GA の API をメジャー版の中では削除せず、Beta の API は廃止告知から 9 か月または 3 リリースの長い方まで提供する [V][^33]。Google AIP-185 は、Beta 機能の削除前の非推奨期間として 180 日を推奨する [V][^24]。Microsoft Graph は、GA の API を削除する少なくとも 24 か月前に非推奨を宣言する [V][^25]。Google Cloud の利用規約は、顧客向け API を後方互換でない形で大きく変更する前と、同等の代替のないサービス停止の前に、12 か月以上前の通知を約するが、Cloud Identity Services と GA 前の機能はその対象外である [V][^37]。AWS の SDK は、GA 版を少なくとも 24 か月支援し、maintenance への移行を 6 か月以上前に告知する [V][^39]。GビズID の連携利用規約は、重大な変更の 90 日前までの公表を定める [V][^40]。自治体標準化では、仕様書の改定を遅くとも制度施行日の 1 年以上前に行い、改定日を原則として年 2 回（8 月 31 日・1 月 31 日）に固定している [N][^62][^63]。本基盤の GA 契約の最短非推奨期間は、これらの先例と BIA（DL-21）から決めるべき数値契約であり、本書では値を置かない [D]（RS-16#26, #34〜#45, #73 より）。
8. 退役は計画どおりに進まない前提で方針を作る必要がある [D]。Azure AD Graph は、2019 年に非推奨を告知し退役日を 2023-06-30 としたが、Microsoft の移行文書は完全退役の予定日を 2025-08-31 と記載している（"will be fully retired"。実際に停止した事実は本原典では確認していない）[V][^36]。その間 Microsoft は、新規アプリは明示の opt-in なしでは利用不可（2024-08-31）、既存アプリにも明示の opt-in を要求（2025-02-01）、延長アクセスの終了（2025-08-31 予定）と、段階的に締め出す計画を示した [V][^36]。非推奨方針には、最短期間に加えて、延長の判断基準、段階的な締め出しの順序、未移行 consumer の計測方法を含める [D]（RS-16#40 より。RS-11#77 と同旨）。
9. 未移行 consumer の数は、実行時に計測できるようにする [D]。RFC 9745（Standards Track、2025-03）は Deprecation header を定め、併用する Sunset header の日時は Deprecation の日時より前であってはならない（MUST NOT）とする [N][^31]。ただし両 header は「ヒント」であり、client に保証を与えない [N][^31][^32]。Kubernetes は、非推奨 API への要求に Warning header を返し、監査イベントに注記を付け、削除予定リリースのラベル付きメトリクスを出す [V][^33]。基盤側（AS、PDP、SDK）で同等の計測を client_id 単位で行えば、非推奨の進捗を consumer 単位で追跡できる [D]（RS-16#34〜#38 より）。
10. 変更管理委員会は二層にするのが妥当である [D]。NIST SP 800-53 Rev.5 の CM-3 は、構成管理対象の変更を、セキュリティとプライバシーの影響分析を明示的に考慮して承認または却下することを求める [N][^54]。一方 DORA の 2019 年の調査報告（回答者約 1,000 人の質問票調査）は、CAB や上級管理者など外部の承認を要する重い変更承認がソフトウェアのデリバリー性能に負の影響を与えるとし、そうした承認手続をもつ組織の回答者は低パフォーマーである可能性が 2.6 倍高かったと報告した [M][^71][^56]。同報告はまた、より正式な承認手続が変更失敗率の低さと関連するという仮説を支持する証拠は見つからなかったと報告している [M][^71][^56]。そこで、委員会の審議は契約変更（破壊的変更、非推奨、例外、凍結日）に限る [D]。個々の実装変更は、peer review、自動の契約試験、can-i-deploy で通す [V][^46][D]（RS-16#49, #57〜#60 より）。
11. 共通基盤は「製品」として提供する [D]。CNCF の白書は、platform の属性として、self-service、文書とオンボーディング、任意かつ組合せ可能（optional and composable）、secure by default などを挙げる [V][^58]。白書はまた、トップダウンの強制だけで採用を進める platform チームは利用者の抵抗に遭うと警告する [V][^58]。本基盤では、強制する範囲（認証、token 検証、PEP、監査イベント）と、pull で採用される範囲（それ以外の便利機能）を分けて宣言する [D]（RS-16#62〜#67 より）。
12. オンボーディングのリードタイムについて、公開された基準値は見つからなかった [D]。GビズID の利用規約は、審査期間を保証しないと明記している [V][^40]。デジタル認証サービスは、申込からテスト環境・本契約・本番環境までの 5 段階を示すが、所要期間は示していない [V][^42]。CNCF の白書は、新サービスを本番に出すまでの時間などを platform の効率指標に挙げる [V][^58]。オンボーディング各段階の所要時間は、自社の数値契約として置き、パイロット 2〜3 サービスの PoC で実測する [D]（RS-16#45, #64, #80 より）。
13. 日本の自治体標準化は、移行先の仕様の版を固定しても（2023 年 3 月末時点の標準仕様書への適合を移行目標とし、それ以降の改定への適合は 2026 年度以降に回した [N][^62]）、多ベンダーの並行移行が期限内に終わらない場合があることを示す公表データである [D]。対象 34,366 システムのうち 10,013（29.1%）が、移行期限の 2025 年度末までに移行できなかった [M][^68]。デジタル庁は主な要因を、移行作業と直後の運用に想定以上の SE リソースが必要と判明し、事業者が移行スケジュールを大幅に見直したことだとしている [M][^68]。20〜30 の開発組織が並行する本計画では、契約の凍結に加えて、各組織の要員確保と移行順序の平準化をゲート条件にする必要がある [D][A-052]（RS-16#78 より）。
14. 仕様書だけでは多ベンダー間の連携はそろわない [D]。デジタル庁の検証事業（20 社参加）では、共通機能標準仕様書に準拠して他ベンダーの認証認可サーバーとの疎通・連携ができることを確認した [M][^69]。一方で、同じ検証で、仕様書の記載に対する解釈がベンダーごとにずれる可能性、未定義部分の仕様がベンダーごとに異なる可能性、認証プロトコルだけでなく認証フローの確認も必要なこと、本番切替時に調整が集中することが課題として挙がった [M][^69]。契約 v1 には、仕様書に加えて、参照実装、適合確認ツール、負例ベクタ、疑義対応窓口（FAQ 公開）、正誤表の運用を含める必要がある [D]（RS-16#72〜#79 より）。
15. SDK は、API の版を SDK のリリースに固定（pin）し、基盤との版差の許容幅を宣言する [D]。Stripe の SDK は、強い型付け言語では SDK リリース時点の最新 API 版に固定される [V][^29][^30]。Kubernetes は、kubelet が kube-apiserver より最大 3 minor 版古いことを許容する [V][^35]。Microsoft Graph の SDK は、最新メジャー版だけを支援し、直前のメジャー版は最新版のリリースから 12 か月、セキュリティ修正だけを受ける [V][^25]。300 サービスの SDK を同時に更新することはできないので、許容する版差（例: N−2）と SDK のサポート期間を数値契約にする [D][A-050]（RS-16#31〜#33, #39, #44 より）。

---

## 3. 調査結果

### 3.1 契約記述仕様の状態

- **RS-16#1** OpenAPI Specification の改訂履歴（v3.2.1 の Appendix A）は次のとおりである [N][^1]。3.2.1 が 2026-09-10、3.2.0 が 2025-09-19、3.1.2 が 2025-09-19、3.1.1 が 2024-10-24、3.1.0 が 2021-02-15、3.0.4 が 2024-10-24 である [N][^1]。確認日時点の最新は 3.2.1 である [N][^1]。
- **RS-16#2** OpenAPI の版は major.minor.patch で表し、major.minor の部分が機能セットを指す（SHALL）[N][^1]。patch 版は誤りの修正や明確化のためのもので、機能セットを変えない [N][^1]。ただし minor 版でも、影響が利益に比べて小さいと判断されれば、後方互換でない変更が入ることがある [N][^1]。原文: "Occasionally, non-backwards compatible changes may be made in minor versions of the OAS where impact is believed to be low relative to the benefit provided."
- **RS-16#3** OpenAPI 3.1 の Schema Object は JSON Schema Draft 2020-12 の上位集合である [N][^2]。`jsonSchemaDialect` は、文書内の Schema Object の `$schema` の既定値を URI で指定する [N][^2]。原文: "Models are defined using the Schema Object, which is a superset of the JSON Schema Specification Draft 2020-12."
- **RS-16#4** JSON Schema の公式サイトは、現行版を 2020-12、前版を 2019-09 としている [N][^3]。2020-12 の Core 文書は Internet-Draft（draft-bhutton-json-schema-01）で、2022-06-16 に公開され、2022-12-18 に失効した [N][^4]。intended status は Informational である [N][^4]。`$schema` は方言（dialect）の識別子を兼ね、`$vocabulary` はメタスキーマが使う語彙と、その実装が必須か任意かを示す [N][^4]。
- **RS-16#5** JSON Schema の策定団体は、仕様を IETF で発行することをやめ、2025-01-13 の公式ブログ時点では財団に属さず独立していると述べている [V][^5]。その後の所属の変化は確認していない（§6）。同団体は次期版について、「upgrade compatibility」を最優先の関心事とすると述べている [V][^5]。同時に、破壊的変更が決して起きないわけではないとも述べている [V][^5]。次期版では、将来の keyword と衝突させないため、利用者の独自 property に `x-` で始まる名前を使う規約を定め、任意の追加 property を認めなくする予定である（2020-12 との非互換点として同団体が挙げる）[V][^5]。原文: "Moving forward, upgrade compatibility is our #1 concern when developing a new release. That doesn't mean that a breaking change will never happen"。確認日時点でも、公式サイトが示す現行版は 2020-12 のままである [N][^3]。
- **RS-16#6** AsyncAPI の最新版は 3.1.0 である [N][^6]。版の構造は major.minor.patch で、patch 版は既存の major.minor 向けのツールと互換でなければならない（must）[N][^6]。minor 版を上げても、それより低い minor 版向けに作られたツールの動作を妨げないよう配慮する、としている [N][^6]。
- **RS-16#7** AsyncAPI 3.1.0 のリリースノートは 2026-01-31 付である [V][^7]。3.1.0 は minor リリースで破壊的変更を含まず、主な追加は ROS 2 の protocol binding である [V][^7]。原文: "This is a minor release, and it doesn't bring any breaking changes."
- **RS-16#8** AsyncAPI 3.0.0 のリリースノートは 2023-12-05 付で、v2 からの破壊的変更の移行ガイドを案内している [V][^8]。主な変更は、channel と operation の分離（channel の再利用）、publish / subscribe から send / receive への置換、server の url の host・path・protocol への分割である [V][^8]。
- **RS-16#9** CloudEvents の最新リリースは 1.0.2（タグ ce@v1.0.2）である [N][^9]。必須の context 属性は id、source、specversion、type である [N][^9]。producer は `source` と `id` の組を事象ごとに一意にしなければならない（MUST）[N][^9]。specversion にはこの版を指す値として `1.0` を使わなければならない（MUST）[N][^9]。specversion は major と minor だけを含む [N][^9]。
- **RS-16#10** CloudEvents の `dataschema` は、data が従うスキーマを示す [N][^9]。スキーマに互換でない変更を加えたときは、別の URI で表すべきである（SHOULD）[N][^9]。`type` は reverse-DNS 名を前置すべきで（SHOULD）、その形式は producer が決め、type の版を含んでもよい [N][^9]。原文: "Incompatible changes to the schema SHOULD be reflected by a different URI."
- **RS-16#11** CloudEvents は 2018-05-15 に CNCF に受理され、2019-10-24 に Incubating、2024-01-25 に Graduated になった [V][^10]。
- **RS-16#12** RFC 9457（Problem Details for HTTP APIs）は Standards Track（2023-07）で、RFC 7807 を廃止・置換した [N][^11]。problem type の定義は、その type に固有の拡張メンバを追加してよい（MAY）[N][^11]。problem details を受け取る client は、認識できない拡張メンバを無視しなければならない（MUST）[N][^11]。原文: "Clients consuming problem details MUST ignore any such extensions that they don't recognize; this allows problem types to evolve and include additional information in the future."
- **RS-16#13** lint ツールの Spectral は、v6.17.0（2026-10-01 リリース）の README で、既定の ruleset が OpenAPI v2・v3.0・v3.1・v3.2、AsyncAPI、Arazzo v1 を検証できると記している [V][^12]。AsyncAPI のどの版に対応するかは、README には書かれていない [V][^12]。コード生成、モック、差分検出などの他のツールの OpenAPI 3.2・AsyncAPI 3.x への対応は確認していない（§6）[D]。

### 3.2 認証・認可プロトコルに固有の互換性規則

- **RS-16#14** JWT（RFC 7519 §4）は、JWT が有効とみなされるために含むべき claim の集合は文脈依存で、仕様の範囲外だとする [N][^13]。そのうえで、アプリケーションが別の要求を定めない限り、実装が理解できない claim は無視しなければならない（MUST）[N][^13]。原文: "in the absence of such requirements, all claims that are not understood by implementations MUST be ignored."
- **RS-16#15** OAuth 2.0（RFC 6749）では、AS は認識できない要求 parameter を無視しなければならない（MUST、§3.1・§3.2）[N][^14]。client は、認可応答・token 応答の認識できない parameter を無視しなければならない（MUST、§4.1.2 ほか）[N][^14]。
- **RS-16#16** JWS（RFC 7515 §4.1.11）の `crit` header parameter は、理解して処理しなければならない拡張が使われていることを示す [N][^15]。列挙された拡張 header parameter を受信者が理解・支持しない場合、その JWS は無効である [N][^15]。`crit` を使う場合は完全性保護が必須で、JWS Protected Header にだけ置かなければならない（MUST）[N][^15]。`crit` の使用自体は OPTIONAL である [N][^15]。
- **RS-16#17** OpenID Connect Discovery 1.0（errata set 2 を取り込んだ Final、2023-12-15）は、OP metadata の `issuer` を、その OP が発行する ID Token の `iss` claim の値と同一にしなければならない（MUST）と定める [N][^16]。RP は、構成要求に使った Issuer URL、metadata の `issuer`、ID Token の `iss` がすべて完全一致することを確認しなければならない（MUST、§7）[N][^16]。
- **RS-16#18** OAuth 2.0 Authorization Server Metadata（RFC 8414 §3.3）も、返された `issuer` 値は、well-known URI を挿入した issuer 識別子と同一でなければならず（MUST）、一致しない場合は応答の内容を使ってはならない（MUST NOT）と定める [N][^17]。したがって issuer 識別子は、変更すると全 RP・全 RS の設定変更を伴う不可逆な契約要素である [D]（RS-16#17 と合わせて。ADR-021 への入力）。
- **RS-16#19** OpenID Connect Core 1.0 §10.1.1 は署名鍵の rotation 手順を示す [N][^18]。署名者は鍵を jwks_uri の JWK Set で公開し、各メッセージの JOSE Header の kid で検証鍵を示す [N][^18]。検証者は見慣れない kid を見たら jwks_uri から鍵を取り直す [N][^18]。JWK Set は、退役直後の署名鍵をしばらく保持すべきである（SHOULD）[N][^18]。この取得規則は全 SDK・全 PEP が同じ挙動をとるべき契約要素である [D]。
- **RS-16#20** OAuth 2.0 Dynamic Client Registration（RFC 7591、Standards Track、2015-07）は、client 登録を API で行う手順を定める [N][^19]。software statement は client ソフトウェアのメタデータをまとめて表明する JWT である [N][^19]。登録要求で提示する software statement は、JWS で署名または MAC されていなければならず（MUST）、表明者を示す `iss` claim を含まなければならない（MUST）[N][^19]。AS が登録できる者を限定する場合は、initial access token の使用が必須となる [N][^19]。
- **RS-16#21** HTTP Semantics（RFC 9110 §5.1、STD 97、2022-06）は、proxy は認識できない header field を転送しなければならず（MUST。Connection header に列挙された field と、遮断・変換を設定した場合を除く）、その他の受信者は認識できない header・trailer field を無視すべきである（SHOULD）と定める [N][^20]。受信者が安全に無視できる意味をもつ新しい field は、プロトコル版を変えずに導入できる [N][^20]。Deprecation・Sunset header を後から追加しても、旧 client には影響しないことの根拠になる [D]。
- **RS-16#22** OpenID Foundation は 2026-01-12、AuthZEN の Authorization API 1.0 を OpenID Final Specification として承認したと告知した [N][^21]。投票結果は賛成 81、反対 1、棄権 25 である [N][^21]。PEP–PDP 契約を凍結するときに参照できる Final 仕様である（RS-07#60 と同旨）[D]。

### 3.3 互換性と破壊的変更の定義

- **RS-16#23** Google AIP-180（Backwards compatibility、Approved）は互換性を 3 種類に分ける [V][^22]。source 互換（旧版向けのコードが新版でコンパイルできなければならない）、wire 互換（旧版向けのコードが新しいサーバと正しく通信できなければならない）、semantic 互換（旧版向けのコードが、合理的な開発者が期待する結果を受け取り続けなければならない）である（いずれも must）[V][^22]。
- **RS-16#24** AIP-180 によれば、同一メジャー版の中で、新しい interface・method・message・field・enum・enum 値を追加してよい（may）[V][^22]。request でだけ使う enum には値を自由に追加してよい [V][^22]。response で使う enum にも値を追加してよいが、適切な注意を払うべきである（should）[V][^22]。既存要素の削除・改名、field の型変更、oneof への出し入れ、resource 名の変更、既定値の変更は禁止される（must not）[V][^22]。利用者の合理的なコードを壊しそうな、目に見える挙動や意味の変更もしてはならない（must not）[V][^22]。原文: "Changing the default value is considered breaking and must not be done."
- **RS-16#25** Google AIP-181（Stability levels）の規定は次のとおりである [V][^23]。alpha では破壊的変更が許され、利用者は安定性を期待してはならない（must）[V][^23]。beta では、後方互換でない変更は合理的な非推奨期間を経てからでなければならず（must）、その期間は beta にする時点で定めなければならない（must）[V][^23]。beta は期限を区切り、問題がなければ stable に昇格すべきで（should）、その期間の目安は 90 日である [V][^23]。stable では破壊的変更があってはならない（must）[V][^23]。破壊的変更が必要なら次のメジャー版を作るべきである（should）[V][^23]。stable を含む版の停止には、stable にする時点で、非推奨期間を含む正式な手続を定めなければならない（must）[V][^23]。stable の中で例外的に小さな破壊的変更を行う場合は、新しいメジャー版を作るのと同等以上の重みで扱い、Google では API Governance チームの承認を要する [V][^23]。セキュリティや規制上の例外的な場合には、安定度に関係なく破壊的変更をしてよく（may）、その場合は非推奨期間を約束しない [V][^23]。
- **RS-16#26** Google AIP-185（API versioning）は、すべての API にメジャー版番号を持たせ、REST では URI path の先頭に置かなければならない（must）とする [V][^24]。minor と patch の版番号は公開してはならない（must not）[V][^24]。channel 方式では、メジャー版ごとに alpha・beta・stable の channel を最大 1 つずつ持つ [V][^24]。非推奨の機能を上位の channel に昇格させてはならない（must not）[V][^24]。beta channel の機能は十分な期間非推奨にした後で削除してよく（may）、その期間として 180 日を推奨する [V][^24]。なお AIP-185 は、channel 方式を推奨としつつ、版を日付（YYYY-MM-DD）で表し `X-Goog-Api-Version` header か `$apiVersion` query parameter で指定する interface-based versioning も定めている [V][^24]。
- **RS-16#27** Microsoft Graph の方針では、後方互換でない変更の例として、resource の URL や基本的な要求・応答の変更、宣言済み property の削除・改名・型変更、API や parameter の削除・改名、必須 request header の追加を挙げる [V][^25]。後方互換の変更の例として、nullable または既定値を持つ property の追加、enum へのメンバ追加、既存 collection へのページングの導入、エラーコードの変更、property の順序変更、resource ID などの不透明な文字列の長さや形式の変更を挙げる [V][^25]。client は、これまで定義されていなかった property や派生型を受け取る準備をしておくべきだとしている [V][^25]。RS-16#24 と比べると、enum の扱いとエラーコードの扱いが異なる [D]。
- **RS-16#28** Microsoft Graph は、版を退役させる少なくとも 24 か月前に非推奨を宣言し、GA に達した個々の API も削除の少なくとも 24 か月前に非推奨を宣言する [V][^25]。メジャー版を上げると、旧版は即座に非推奨となり、告知の 24 か月後に支援を終える [V][^25]。サービスのセキュリティや健全性の問題については、この方針に例外を設ける [V][^25]。非推奨後まもなく新規アプリに新 API の使用を求め、既存の利用中アプリだけに旧 API の継続を認める場合があるとしている [V][^25]。beta の API を本番アプリで使うことは支援されない [V][^25]。
- **RS-16#29** Protocol Buffers（proto3 言語ガイド）は、既存 field の番号の変更を安全でないとし、既存の oneof への field の移動も安全でないとする [V][^26]。field の追加と削除は wire 上安全である [V][^26]。field を削除するときは、その番号を reserved にしなければならない（must）[V][^26]。JSON や TextFormat の解析を続けられるよう、field 名も reserved にすべきだとしている [V][^26]。proto3 の message は未知の field を保持し、解析と直列化の出力に含める [V][^26]。
- **RS-16#30** Buf の breaking change 検出は、規則を FILE、PACKAGE、WIRE_JSON、WIRE の 4 カテゴリに分け、この順に厳しさの段階をなす [V][^27]。既定は FILE で、迷ったら FILE から始めるよう勧める [V][^27]。protobuf の JSON 符号化は field 名の変更で壊れるため、WIRE より WIRE_JSON のほうが安全だとしている [V][^27]。
- **RS-16#31** Semantic Versioning 2.0.0 は、公開 API に後方互換でない変更を入れたら major 版を上げなければならない（MUST）と定める [N][^28]。後方互換な機能追加と、公開 API の機能を非推奨にしたときは、minor 版を上げなければならない（MUST）[N][^28]。major 版 0 は初期開発用で、いつ何が変わってもよい（MAY）[N][^28]。FAQ は、機能を完全に削除する major リリースの前に、非推奨を含む minor リリースを少なくとも 1 つ出すべきだとする [N][^28]。
- **RS-16#32** Stripe は、2024-09-30.acacia 以降、破壊的変更を含まない API 版を毎月リリースし、年 2 回、破壊的変更を含む版から始まるメジャーリリースを出す [V][^29]。確認日時点の現行版は 2026-09-30.endive である [V][^29]。curl による要求はアカウントの既定 API 版を使い、`Stripe-Version` header で上書きできる [V][^29]。webhook イベントは、endpoint 作成時に設定した API 版を使い、未設定ならアカウントの既定版を使う [V][^29]。同じ文書は enum を closed と open に分け、open な enum には Stripe が API 版を上げずに後方互換の変更として値を追加できるとし、応答で受け取る open enum には未知の値への安全な fallback を持つべきだとする [V][^29]。
- **RS-16#33** Stripe のサーバ側 SDK は、その SDK がリリースされた時点で最新だった API 版で要求を送る [V][^30]。同文書の導入部は、Java、Go、.NET などの強い型付け言語では別の API 版を指定できない（"can't target"）とし、Java の説明では別の API 版の指定を推奨しないとする [V][^30]。理由は、応答オブジェクトが SDK の型と一致せず要求が失敗し得るためである [V][^30]。webhook の版を上げるときは、新版の endpoint を追加して二重配信を受け、処理側を切り替えてから旧 endpoint を無効にする手順を示し、移行中のイベント処理はべき等でなければならないとしている [V][^30]。

### 3.4 非推奨・退役の期間と告知

- **RS-16#34** RFC 9745（The Deprecation HTTP Response Header Field）は Standards Track で、2025-03 に発行された [N][^31]。Deprecation は Item Structured Header Field で、値は RFC 9651 §3.3.7 の Date でなければならない（MUST）[N][^31]。非推奨にしても resource の挙動は変わらない [N][^31]。Sunset header を併用する場合、その日時は Deprecation の日時より前であってはならない（MUST NOT）[N][^31]。Sunset の日付形式は歴史的経緯で Deprecation と異なる（例: `Deprecation: @1688169599`、`Sunset: Sun, 30 Jun 2024 23:59:59 UTC`）[N][^31]。header はヒントとして扱うべきで、client の開発者は参照先の文書で真正性と正確性を確かめるべきである（SHOULD）[N][^31]。Deprecation の値が過去の日付なら、client の開発者は、resource の挙動が非推奨日以前と同じままだと仮定してはならない（MUST）[N][^31]。
- **RS-16#35** RFC 8594（The Sunset HTTP Header Field）は Informational で、2019-05 に発行された [N][^32]。Sunset は、resource が指定時点で応答しなくなる見込みであることを示し、値は HTTP-date である [N][^32]。client は Sunset の日時をヒントとして扱うべきで（SHOULD）、その時点まで resource が使えることは保証されない [N][^32]。過去の日時は「現在」とみなすのが最も安全だとしている [N][^32]。原文: "Applications should never treat an advertised Sunset date as a definitive prediction of what is going to happen at the specified point in time"。
- **RS-16#36** Kubernetes Deprecation Policy（2026-08-21 更新）の API 要素の規則は次のとおりである [V][^33]。Rule #1: API 要素は API group の版を上げることでしか削除できない [V][^33]。Rule #2: 同一リリース内の API 版の間で、オブジェクトは情報を失わずに往復変換できなければならない [V][^33]。Rule #3: API 版を、より安定度の低い API 版に置き換える形で非推奨にしてはならない [V][^33]。Rule #4a: GA の API 版は非推奨にできるが、Kubernetes のメジャー版の中では削除してはならない [V][^33]。Beta の API 版は、導入から 9 か月または 3 minor リリースの長い方以内に非推奨にし、非推奨から 9 か月または 3 minor リリースの長い方を経て提供を止める [V][^33]。Alpha の API 版は、予告なくどのリリースでも削除できる [V][^33]。Rule #4b: preferred version と storage version は、新旧両方の版を支援するリリースを出すまで進めてはならない [V][^33]。原文: "GA API versions may be marked as deprecated, but must not be removed within a major version of Kubernetes"（RS-11#76 と同旨）。
- **RS-16#37** 同ポリシーは、API 以外にも期間を定める [V][^33]。利用者向け CLI の GA 要素は、非推奨告知の後 12 か月または 2 リリースの長い方以上動作させなければならない（Rule #5a）[V][^33]。管理者向けコンポーネントの CLI の GA 要素は 6 か月または 1 リリースの長い方以上（Rule #5b）である [V][^33]。API や CLI で制御しない挙動の非推奨は、告知後 1 年以上動作させなければならない（Rule #7）[V][^33]。feature gate は、Beta から GA に移るとき 6 か月または 2 リリースの長い方以上動作させなければならない（Rule #9）[V][^33]。
- **RS-16#38** Kubernetes v1.19 以降、非推奨の REST API への要求には次の 3 つが行われる [V][^33]。応答に Warning header を返し、監査イベントに `"k8s.io/deprecated":"true"` の注記を付け、`apiserver_requested_deprecated_apis` gauge メトリクスを 1 にする [V][^33]。このメトリクスは group・version・resource・subresource のラベルと、提供を止めるリリースを示す `removed_release` ラベルを持つ [V][^33]。
- **RS-16#39** Kubernetes は、直近 3 つの minor リリースのリリースブランチを保守し、1.19 以降の版には約 1 年の patch 支援を提供する [V][^34]。Version Skew Policy（2026-04-14 更新）は、kubelet が kube-apiserver より新しくてはならず、最大 3 minor 版まで古くてよいと定める [V][^35]。HA 構成の kube-apiserver 同士は、最新と最古の差を 1 minor 版以内にしなければならない [V][^35]。
- **RS-16#40** Microsoft の公式文書（ms.date 2025-09-29）は、Azure AD Graph の退役について次の経過と予定を示す [V][^36]。2019 年に非推奨を告知し、退役日を 2023-06-30 とした [V][^36]。2023-06-30 に 3 年の告知期間が終わり、退役サイクルに入った [V][^36]。2024-08-31 以降に作成された新規アプリは、明示的に延長アクセスに opt-in しない限り使えない [V][^36]。2025-02-01 からは既存アプリも opt-in が必要とされた [V][^36]。2025-08-31 に延長アクセスを終え、完全に退役する予定と記載している（原文 "Azure AD Graph will be fully retired."）[V][^36]。実際に 2025-08-31 に停止したことを示す記述は同文書になく、停止の事実は未確認である（§6）。告知から完全退役の予定日まで約 6 年で、予定日は当初の退役日から 2 年あまり延びた [D]（RS-11#77 と同旨）。
- **RS-16#41** Google Cloud Terms of Service（2026-09-02 更新）§1.4(e) は、Google がサービス（または付随する重要な機能）を停止する前（同等のサービス・機能で置き換える場合を除く）と、顧客向け API を後方互換でない形で大きく変更する前に、少なくとも 12 か月前に通知すると定める [V][^37]。法令順守、重大なセキュリティリスク、重大な経済的・技術的負担を避けるための変更は制限しない [V][^37]。この条項は Cloud Identity Services と GA 前のサービス・機能には適用されず、GWS Services については Core Services にだけ適用される [V][^37]。
- **RS-16#42** Microsoft の Modern Lifecycle Policy は、後継の製品・サービスがない場合、支援終了の少なくとも 12 か月前に通知すると定める [V][^38]。無償サービスとプレビューは除く [V][^38]。一部の Azure サービスでは最大 3 年前に通知する場合がある [V][^38]。
- **RS-16#43** AWS SDKs and Tools maintenance policy は、SDK のメジャー版の寿命を 5 段階に分ける（Developer Preview、GA、Maintenance Announcement、Maintenance、End-of-Support）[V][^39]。GA 版は少なくとも 24 か月支援する [V][^39]。maintenance mode に入る少なくとも 6 か月前に公表し、maintenance mode の既定期間は 12 か月である [V][^39]。依存先（言語ランタイムなど）は、提供元の支援終了から少なくとも 6 か月は支援を続ける [V][^39]。告知手段として、影響を受けるアカウントへのメール、文書と GitHub README の更新、ブログ、SDK への非推奨警告の追加を挙げる [V][^39]。
- **RS-16#44** Microsoft Graph の SDK は、各ライブラリの最新メジャー版だけを支援し、新機能・バグ修正・回避策を提供する [V][^25]。直前のメジャー版は、最新メジャー版のリリースから 12 か月、セキュリティ修正だけを受ける [V][^25]。
- **RS-16#45** デジタル庁の「GビズID サービス連携 利用規約」（version1.3、2026-07-09 制定）は、連携を希望する行政機関等が申請し、デジタル庁が審査を終えた時点で連携承認を通知すると定める [V][^40]。同規約は、審査の期間について何ら保証しないと明記する [V][^40]。サービスの休廃止や、性質に大きな影響を及ぼす重大な変更は、90 日前までにウェブサイトで公表するか利用者に通知して行う [V][^40]。同条 2 項は、前項にかかわらず、性質に重大な変更が生じない範囲でサービスの内容を変更できるとする [V][^40]。

### 3.5 契約試験とモック

- **RS-16#46** Pact の公式文書は、契約試験を「各アプリケーションを個別に検査し、送受信するメッセージが『契約』に記述された共通理解に適合するかを確かめることで、統合点を試験する手法」と定義する [V][^43]。Pact は code-first の consumer-driven 契約試験ツールで、HTTP とメッセージの統合を対象とする [V][^43]。契約は consumer の自動試験の実行中に生成されるため、consumer が実際に使う部分だけが試験される [V][^43]。原文: "only parts of the communication that are actually used by the consumer(s) get tested."
- **RS-16#47** Pact の公式文書（When to use Pact）は、Pact が向く条件として、consumer と provider の双方の開発を自分（チーム・組織・提携組織）が管理していること、双方が開発中であること、provider チームが応答データを容易に制御できること、consumer の要求が provider の機能を駆動すること、provider チームが consumer チームごとに個別の関係を管理できる程度に consumer が少ないことの 5 つを挙げる [V][^44]。向かない条件として、相手側のチームが Pact を使わない API、consumer を個別に識別できない API（公開 API など）、試験対象の API を使わずに provider へデータを投入できない場合、provider の応答データを制御できない場合、機能が特定の consumer の要求で駆動・変更されない provider（例: 公開 API や「API が完全に安定した OAuth provider」）、consumer と provider のチーム間に良い意思疎通の経路がない場合、性能・負荷試験、provider の機能試験、検証せずに下流へ渡すだけの pass-through API、ブラウザ駆動試験の汎用モック用途を挙げる [V][^44]。原文: "There is a small enough number of consumers for a given provider that the provider team can manage an individual relationship with each consumer team."
- **RS-16#48** provider state は、試験シナリオの前提条件で、Cucumber の Given に相当する [V][^45]。検証時に、provider のデータソースへ直接データを注入して、consumer が期待する応答を返せるようにする [V][^45]。
- **RS-16#49** can-i-deploy は、consumer と provider の版の組ごとの検証結果の表（Matrix）を調べる [V][^46]。展開しようとする版と、その環境に既にある連携先の全版との間に成功した検証結果がある場合にだけ展開を許す [V][^46]。どの環境にどの版があるかは `record-deployment` で Broker に記録する [V][^46]。
- **RS-16#50** pending pacts は、provider のブランチが最初の検証成功を公開するまで、契約の内容を pending として扱う機能である [V][^47]。pending の契約で不一致が出ても、検証タスク全体は失敗にならない [V][^47]。この機能がないと、consumer チームの契約変更が、展開済みの consumer と互換な provider の展開まで止めてしまう [V][^47]。
- **RS-16#51** consumer version selectors は、provider が検証する consumer の版を選ぶ指定である [V][^48]。公式文書の各言語の例は、`mainBranch` と `deployedOrReleased` の組合せを使っている [V][^48]。
- **RS-16#52** webhook のイベント `contract_requiring_verification_published` は、検証が必要な契約が公開されたときに provider の検証ビルドを起動するためのものである [V][^49]。Broker は、provider の main ブランチの版と、provider が展開された各環境の版の検証を起動する [V][^49]。この webhook を使うには `record-deployment` または `record-release` の記録が必要である [V][^49]。
- **RS-16#53** PactFlow（SmartBear）の Bi-Directional Contract Testing は、consumer の期待を表す契約と provider の能力を表す契約を比較する「静的な」契約試験である [V][^50]。provider 契約は、OpenAPI 文書と、実装がその OpenAPI に適合するかを確かめる試験（self-verification の結果）の 2 つから成る [V][^50]。consumer 契約（pact）が provider 契約と互換でない場合、または self-verification が失敗した場合は、不適合と表示される [V][^50]。
- **RS-16#54** Microcks は 2023-06-22 に CNCF に受理され、2026-05-03 に Incubating になった [V][^51]。
- **RS-16#55** Microcks は、OpenAPI、AsyncAPI、GraphQL、gRPC スキーマ、Postman collection、SoapUI project を artifact として取り込み、仕様中の制約と例からモックを生成して endpoint で提供する [V][^52]。取り込んだ知識と例を使い、実装が期待に適合するかを検証できる（契約試験・適合試験）[V][^52]。
- **RS-16#56** OpenID Foundation の RP 向け適合試験では、RP が対応する response_type に応じて Basic、Implicit、Hybrid の試験計画を実行できる [V][^53]。form_post 版の profile と、session 管理・logout の試験 profile もある [V][^53]。利用者は certification.openid.net に Google・GitLab のアカウントか、WebFinger に対応した任意の OIDC OP でログインして、自分で試験を実行する [V][^53]。

### 3.6 変更管理

- **RS-16#57** NIST SP 800-53 Rev.5（Release 5.2.0）の CM-3（Configuration Change Control）は、次の a〜g を求める [N][^54]。a: 構成管理対象とする変更の種類を決めて文書化する／b: 提案された変更を審査し、セキュリティとプライバシーの影響分析を明示的に考慮して承認または却下する／c: 変更の決定を文書化する／d: 承認された変更を実装する／e: 変更記録を組織が定める期間保持する／f: 変更に関する活動を監視・レビューする／g: 組織が定める頻度または条件で招集する構成変更管理の組織要素を通じて、変更管理を調整・監督する [N][^54]。NIST は 2025-08-27 に Release 5.2.0 を出した [N][^55]。
- **RS-16#58** CM-3 の discussion は、構成変更を管理するプロセスに、変更を審査・承認する Configuration Control Board や Change Advisory Board が含まれるとする [N][^54]。新規システムや大規模な更新では、開発組織の代表を委員会に入れることを検討するとしている [N][^54]。拡張 CM-3(2) は、変更の実装を確定する前に試験・検証・文書化することを求める [N][^54]。拡張 CM-3(4) は、組織が定めるセキュリティとプライバシーの代表者を委員会の構成員にすることを求める [N][^54]。CM-4 は、変更の実装前にセキュリティとプライバシーへの影響を分析することを求める [N][^54]。
- **RS-16#59** DORA（Google Cloud の研究プログラム）は、2019 年の State of DevOps Report に基づき、変更承認は開発過程での peer review と、悪い変更を早期に検出・防止・是正する自動化で行うのが最もよいとする [M][^56]。チーム外の CAB や上級管理者による重い承認は、ソフトウェアのデリバリー性能に負の影響を与えた [M][^56]。正式な外部レビューが変更失敗率の低さと関連するという仮説を支持する証拠は見つからなかった [M][^56]。原文: "no evidence was found to support the hypothesis that a more formal, external review process was associated with lower change fail rates." 報告本体（p.50〜51）は、重い変更承認手続をもつ組織の回答者は低パフォーマーである可能性が 2.6 倍高かったとし、承認を増やすと処理が遅くなり、大きな batch を低頻度で出すことになって変更失敗率が上がるという仮説はデータで支持されたとする [M][^71]。同報告は外部承認から peer review への移行を推奨し、CAB の役割をチーム間の通知・調整、プロセス改善の支援、上位の事業判断に移すよう述べる [M][^71]。測定条件: 2019 年の質問票調査で回答者は約 1,000 人、23 百万人の母集団を仮定した 95% 信頼区間で誤差 3%（報告 p.7 の注記）。統計手法の詳細と効果量の信頼区間は本ノートでは確認していない（§6）[M][^71]。
- **RS-16#60** 同じ文書は、職務分離の要求は、チームの開発基盤に記録される peer review で満たすよう勧める [M][^56]。CAB の役割は、チーム間の通知と調整、プロセス改善の支援、事業上の重要なトレードオフ（市場投入の速さと事業リスクなど）の判断に移るとしている [M][^56]。よくある落とし穴として、中央の CAB に頼って誤りを捕まえようとすること、すべての変更を同じに扱うこと、問題が起きるたびにプロセスを足すことを挙げる [M][^56]。
- **RS-16#61** DORA は、ソフトウェアデリバリー性能の指標を 5 つ定義する（2026-01-05 付の文書）[V][^57]。スループット側は change lead time（コミットから本番展開までの時間）、deployment frequency、failed deployment recovery time である [V][^57]。不安定性側は change fail rate（展開のうち直後の介入を要したものの比率）と deployment rework rate（本番の事故の結果として行われた計画外の展開の比率）である [V][^57]。

### 3.7 platform engineering と Team Topologies

- **RS-16#62** CNCF TAG App Delivery の Platforms White Paper は、v1 が 2023-03 に完成し、その後の改訂を `latest` で続けている [V][^59]。白書は platform を「利用者の必要に応じて定義・提示される、統合された能力の集合」と定義する [V][^58]。platform の属性として、platform as a product、user experience、documentation and onboarding、self-service、利用者の認知負荷の低減、optional and composable、secure by default の 7 つを挙げる [V][^58]。能力の一つとして、サービスと利用者の identity・認可、証明書と鍵の発行、静的な秘密情報の保管を担う identity and secret management を挙げる [V][^58]。
- **RS-16#63** 白書は各属性を次のように述べる [V][^58]。self-service: 利用者は能力を自律的・自動的に要求し受け取れなければならない [V][^58]。documentation and onboarding: 文書と例を提供し、新規プロジェクトのオンボーディングを速める道具を提供すべきである [V][^58]。optional and composable: platform は製品開発の妨げになってはならず、提供物の一部だけを使えるようにすべきである [V][^58]。reduced cognitive load: 利用者が platform のサービスの運用責任を負ってはならない [V][^58]。
- **RS-16#64** 白書は、platform の効率の指標として、サービスや試験環境などの要求から提供までの時間、新サービスを構築して本番に展開するまでの時間、新しい利用者が最初のコード変更を出すまでの時間を挙げる [V][^58]。利用者満足（活動利用者数と継続率、NPS）とデリバリー性能（DORA 指標）も挙げる [V][^58]。
- **RS-16#65** 白書は、利用者の feedback なしに機能を出したり、トップダウンの強制で採用を進めたりする platform チームは、利用者の抵抗と反発に遭い、約束した価値の多くを失うとする [V][^58]。最初は、少数の積極的で熟練したアプリチームに絞って始めることもあり得るとしている [V][^58]。原文: "Platform teams that release features and experiences without feedback or that rely on top-down mandates to achieve adoption are almost certain to find resistance and resentment from their users"。
- **RS-16#66** CNCF の Platform Engineering Maturity Model（v1.0）は、Investment、Adoption、Interfaces、Operations、Measurement の 5 側面を、Provisional、Operational、Scalable、Optimizing の 4 段階で評価する [V][^60]。Adoption は、erratic（散発的）、extrinsic push（外部の誘因や強制で使われる）、intrinsic pull（実証された価値によって自律的に採用される）、participatory（利用者が platform に投資する）と進む [V][^60]。Interfaces は、custom processes、standard tooling、self-service solutions、integrated services と進む [V][^60]。
- **RS-16#67** Team Topologies の公式サイトは、チームの基本型を 4 つ挙げる [V][^61]。stream-aligned team（業務領域の作業の流れに沿うチーム）、enabling team（stream-aligned team の障害の克服を助ける）、complicated subsystem team（高度な専門知識が要る部分を担う）、platform team（stream-aligned team の提供を速める内部製品を提供する）である [V][^61]。相互作用の型は 3 つで、collaboration（高帯域・高コスト）、X-as-a-Service（最小の相互作用で提供・利用する、低コストで境界が明確）、facilitating（障害除去の一時的な支援）である [V][^61]。同サイトは、チームの認知負荷を監視して減らすことと、必要十分な能力だけを提供する Thinnest Viable Platform を説く [V][^61]。

### 3.8 日本の大規模・多ベンダー案件の公開資料（地方公共団体情報システム標準化）

- **RS-16#68** 地方公共団体情報システム標準化基本方針（2024-12-24 閣議決定）は、基幹業務システムを 2025 年度末までに標準準拠システムへ移行することを目指す [N][^62]。2023 年 4 月以降の標準仕様書の改定への対応は、政策上必要なものを除き、2026 年度以降のシステム改修時に適合させる [N][^62]。一部の機能には、遅くとも 2028 年度末までに機能標準化基準に適合することを条件に、移行後の実装を認める経過措置を設ける [N][^62]。
- **RS-16#69** 同方針は、標準準拠システムを、マネージドサービスの組合せで構成し、サービス単位で疎結合にし、サービス同士を API で連携させる「モダンアプリケーション」のアーキテクチャで構築することを念頭に置くとする [N][^62]。自治体独自の施策を実現するシステムは、標準準拠システムとは別のシステムとして疎結合で構築し、原則として標準準拠システムをカスタマイズしないようにする [N][^62]。
- **RS-16#70** 同方針の「連携要件の標準」は、(a) どのような場合に、(b) どのデータを、(c) どの標準準拠システム等に対し、どのように提供または照会するかの要件と、そのためのデータ連携機能の要件を定める [N][^62]。標準準拠システムは連携要件の標準に定めるとおり実装しなければならない [N][^62]。ただし、1 事業者が複数業務のシステムを 1 パッケージで一体提供する場合、パッケージ内の連携は事業者の責任で行い、データ連携機能の要件どおりに実装する必要はない [N][^62]。
- **RS-16#71** 同方針は、共通機能の標準の作成方針を次のように定める [N][^62]。(1) 標準準拠システムの共通機能とのインタフェース部分にカスタマイズを生じさせないよう、インタフェースの標準を作成する [N][^62]。(2) 共通機能の外部システムとのインタフェースは、外部システムの仕様に従う [N][^62]。(3) 共通機能の内部は最低限の実装必須機能についてだけ標準を作り、事業者が内部機能を追加したり、疎結合で新しい機能を作ったりすることを妨げない [N][^62]。
- **RS-16#72** 同方針は、データ要件・連携要件の標準化基準への適合について、標準準拠システムはデジタル庁が提供するツールで行う適合確認試験に合格しなければならないとする [N][^62]。非機能要件の標準は、常時の適合確認が難しい項目を含むため、自治体が SLA などの取決めに明示することで適合性を担保する [N][^62]。
- **RS-16#73** 同方針と、デジタル庁の「標準仕様書の改定・運用について（基本的な考え方）」（2025-01-29）は、改定時期を次のように定める [N][^62][^63]。機能標準化基準を盛り込んだ標準仕様書の改定時期は、遅くとも制度改正の施行日の 1 年以上前とし、原則として毎年 8 月 31 日または 1 月 31 日（標準仕様書改定基準日）とする [N][^62][^63]。データ要件・連携要件標準仕様書は、各業務の標準仕様書の改定後 1 か月後を目途に改定する [N][^63]。改定基準日までの改定が難しい場合でも、制度所管省庁は制度改正の検討段階から自治体と事業者への影響を確認し、改定案をできる限り早く公開する [N][^63]。
- **RS-16#74** 同じ「基本的な考え方」は、標準準拠システムの開発過程で事業者から出る解釈の確認や疑義について、「開発のボトルネックとなることのないよう」、改定プロセスを待たずに随時対応するとしている [N][^63]。疑義には標準化 PMO ツールで答え、必要に応じて FAQ として公開する [N][^63]。解釈の補記や誤記の訂正は、改定プロセスを待たず正誤表で対応できる [N][^63]。正誤表は版数単位で作り、訂正があったことが確認できる形で公開する [N][^63]。正誤表で対応できる範囲は、別に定める ID 管理方針上の訂正・補記に限る [N][^63]。
- **RS-16#75** デジタル庁の「データ要件・連携要件の運用について」（2024-04-08 改定）は、全体バージョン管理と適合確認試験で事業者が対応すべき版数を明確にするため、従来の「正誤」対応を廃止し、一律に「改定」として扱うと再整理した [N][^64]。業務標準仕様書の改定に伴う改定は、原則として業務標準仕様書の改定後 1 か月以内に公開する [N][^64]。改定案は自治体とベンダーに全国意見照会を行い、その期間は最大 3 週間である [N][^64]。2026 年 9 月末の改定予定も、業務標準仕様書の 8 月末改定に続く形で公表されている [N][^65]。
- **RS-16#76** デジタル庁の「標準仕様書と適合確認に関する考え方」（2023-10-27）は、機能要件ごと（機能 ID 単位）に適合基準日を明示し、原則として仕様書の改定日から 1 年後以降の日付とする [N][^66]。デジタル庁は、標準仕様書間の整合性を保つため、各仕様書の版数と、それに対応するデータ要件・連携要件の版数を横串で管理する「全体バージョン管理」を作る [N][^66]。全体バージョン管理のメジャーバージョンアップは、新しい機能要件標準仕様書の作成時、ある業務の改定が他業務の仕様書改定を伴う時、共通標準仕様書のメジャーバージョンアップ時に行い、それ以外はマイナーバージョンアップとする [N][^66]。
- **RS-16#77** デジタル庁の共通機能の標準仕様には、「OAuth2.0アクセストークン発行API仕様書」（第1.4版、2026-09-30）、「OAuth2.0アクセストークン情報取得API仕様書」（第1.4版、2026-09-30）、「OAuth2.0アクセストークン無効化API仕様書」（第1.3版、2026-09-30）が含まれる [N][^67]。発行 API と情報取得 API の仕様書は、第1.0版（2023-03-30）、第1.1版（2024-09-30）、第1.2版（2025-09-30）、第1.3版（2026-02-27）、第1.4版（2026-09-30）と改定された [N][^67]。無効化 API の仕様書は、第1.0版（2023-03-30）から第1.3版（2026-09-30）まで改定された [N][^67]。各版には変更箇所記載版が併せて公開されている [N][^67]。共通機能標準仕様書の本体は、第1.0版（2022-08-31）から第2.8版（2026-09-30）まで改定を重ねた [N][^67]。「API連携に関する詳細技術仕様書【第1.0版】」など 7 文書は、2022-08-31 に公開され、2023-03-30 に廃止された [N][^67]。初版の公開から約 7 か月で文書単位の廃止・統合が起きたことになる [D]。
- **RS-16#78** デジタル庁の公表（2026-06-30 掲載、2026 年 3 月末時点）によれば、標準化対象の 34,366 システムのうち 10,013 システム（29.1%）が、移行支援期間の終期である 2025 年度末までに移行できなかった（特定移行支援システム）[M][^68]。該当システムを 1 つ以上持つ団体は 1,788 団体中 1,015 団体（56.8%）である [M][^68]。事由別では、「事業者のリソースひっ迫による開発又は移行作業等の遅延の影響を受けるもの等」が 9,590 システムで、メインフレーム 44、個別開発 190、現行事業者が開発せず代替調達の見込みが立たないもの 189 を大きく上回る [M][^68]。デジタル庁は主な要因を、移行期限が迫るにつれ、移行作業と直後の運用に想定以上の SE リソースが必要と判明し、事業者が移行スケジュールを大幅に見直したことだとしている [M][^68]。2026 年度末までに全体の約 90% が移行を完了する見込みとしている [M][^68]。測定条件: 総務省の標準化 PMO ツールによる集計 [M][^68]。
- **RS-16#79** デジタル庁の「令和6年度 共同利用方式の推進及びマルチベンダーにおけるシステム間連携の検証事業 報告書（本紙）」（2026-03-27）は、20 社が参加したベンダー検証の結果を示す [M][^69]。共通機能標準仕様書に準拠した内容で、他社システムとのファイル連携・API 連携と、他ベンダーの認証認可サーバーとの疎通・連携ができることを確認した [M][^69]。同時に次の課題を挙げた [M][^69]。仕様書の記載内容の解釈について、ベンダーごとに齟齬が生じる可能性がある [M][^69]。認証機能・ファイル連携機能のリファレンスガイド（Oracle Cloud Infrastructure 編）でカスタムアプリの詳細仕様が定義されていないため、ベンダーごとに仕様が異なる可能性がある [M][^69]。他ベンダーが構築した認証基盤を使う場合は、認証プロトコルだけでなく認証フローも確認が必要である [M][^69]。本番切替時には自治体とベンダーの間で短期間に多数の調整が進むため、余裕のあるスケジュールで整理・調整する必要がある [M][^69]。測定条件: 検証環境（推奨構成と技術仕様に準拠）でテストデータを用いた検証 [M][^69]。
- **RS-16#80** デジタル庁のデジタル認証サービスは、マイナンバーカードによる認証・署名の機能を API で提供し、OpenID Connect / OAuth 2.0 で組み込める [V][^41]。民間事業者の利用手続は、(1) 利用の申込、(2) 事前準備契約の締結、(3) テスト環境の提供・テスト、(4) 本契約の締結、(5) 本番環境の提供・テストの順である [V][^42]。各段階の所要期間は示されていない [V][^42]。

### 3.9 横断比較（設計推論）

**表 1 非推奨・退役期間の公開先例**（原典は各行の脚注。数値は各提供者の自社方針であり、本基盤の値ではない）

| 提供者・文書 | 対象 | 最短の告知・併存期間 | 例外 | 出典 |
|---|---|---|---|---|
| Kubernetes | GA の API 版 | メジャー版の中で削除しない | — | [^33] |
| Kubernetes | Beta の API 版 | 非推奨から 9 か月または 3 リリースの長い方 | — | [^33] |
| Kubernetes | 挙動（API・CLI 以外） | 告知後 1 年以上 | — | [^33] |
| Google AIP-185 | Beta channel の機能 | 180 日（推奨） | Alpha は予告なし | [^24] |
| Google AIP-181 | Stable | 停止手続を stable 化の時点で定める（期間の数値は規定なし） | セキュリティ・規制 | [^23] |
| Microsoft Graph | 版、GA の API | 24 か月以上 | セキュリティ・健全性 | [^25] |
| Google Cloud Terms | サービス停止（同等の代替がない場合）、後方互換でない API の大きな変更 | 12 か月以上 | 法令・セキュリティ・負担。Cloud Identity Services と GA 前は対象外 | [^37] |
| Microsoft Modern Lifecycle | 後継のない製品・サービス | 12 か月以上 | 無償・プレビュー | [^38] |
| AWS SDK | SDK メジャー版 | GA 24 か月以上、maintenance 告知 6 か月以上、maintenance 既定 12 か月 | — | [^39] |
| GビズID | サービスの休廃止・重大な変更 | 90 日前までに公表 | 性質に重大な変更が生じない変更 | [^40] |
| 自治体標準化 | 標準仕様書の改定 | 制度施行日の 1 年以上前。適合基準日は改定日の 1 年後以降 | 政策上必要なもの | [^62][^66] |

- **RS-16#81** 表 1 の先例は、期間を安定度（alpha・beta・GA）か対象の種類（API、CLI、挙動、SDK）ごとに分けている点で共通する [D]（RS-16#25, #26, #36, #37, #43 より）。一方、期間の長さは 90 日から「メジャー版の中では削除しない」まで幅が大きい [D]。また、セキュリティ上の緊急変更は、どの提供者も非推奨期間の約束から外している [D]（RS-16#25, #28, #41 より）。本基盤の非推奨方針（DL-70、ADR-016）も、安定度別の期間と、緊急変更の例外条件・事後承認手続を併せて定める必要がある [D]。
- **RS-16#82** 互換性の判定は、宣言（仕様書）と実行時の計測の両方で行う必要がある [D]。宣言の側は、OpenAPI・protobuf の差分検出（Buf の 4 カテゴリ、AIP-180 の規則）で機械化できる [V][^27][^22][D]。しかし、claim の意味の変更、既定値の変更、エラーコードの意味の変更は、スキーマの差分だけでは検出できない [D]（RS-16#14, #24, #27 より）。この種の変更は、契約試験の負例ベクタと、変更審査会での審議の対象にする必要がある [D]。

---

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| OpenAPI Specification | 3.2.1 | final（OAI 発行の現行最新） | 2026-09-10 | 2026-10-03 | https://spec.openapis.org/oas/v3.2.1.html |
| OpenAPI Specification | 3.2.0 | final（3.2.1 で patch 済み） | 2025-09-19 | 2026-10-03 | https://spec.openapis.org/oas/v3.2.0.html |
| OpenAPI Specification | 3.1.2 | final（3.1 系の最新 patch） | 2025-09-19 | 2026-10-03 | https://spec.openapis.org/oas/v3.1.2.html |
| JSON Schema Core / Validation | 2020-12（draft-bhutton-json-schema-01） | 公式サイト上の現行版。IETF 上は失効した Internet-Draft（intended Informational、2022-12-18 失効）。策定団体は IETF 経由の発行を終了 | 2022-06-16 | 2026-10-03 | https://json-schema.org/specification |
| AsyncAPI Specification | 3.1.0 | final（minor、破壊的変更なし） | 2026-01-31（リリースノート） | 2026-10-03 | https://www.asyncapi.com/docs/reference/specification/v3.1.0 |
| AsyncAPI Specification | 3.0.0 | final（v2 から破壊的変更あり） | 2023-12-05（リリースノート） | 2026-10-03 | https://www.asyncapi.com/docs/reference/specification/v3.0.0 |
| CloudEvents | 1.0.2 | final（最新リリース。main は 1.0.3-wip）。プロジェクトは CNCF Graduated（2024-01-25） | 2022-02-06（タグ） | 2026-10-03 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md |
| RFC 9457 Problem Details for HTTP APIs | — | Proposed Standard（Standards Track）。RFC 7807 を廃止 | 2023-07 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9457 |
| RFC 9745 The Deprecation HTTP Response Header Field | — | Proposed Standard（Standards Track） | 2025-03 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9745 |
| RFC 8594 The Sunset HTTP Header Field | — | Informational | 2019-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8594 |
| RFC 9110 HTTP Semantics | STD 97 | Internet Standard | 2022-06 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9110 |
| RFC 7519 JWT / RFC 7515 JWS | — | Proposed Standard | 2015-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7519 , https://www.rfc-editor.org/rfc/rfc7515 |
| RFC 6749 OAuth 2.0 | — | Proposed Standard | 2012-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc6749 |
| RFC 8414 OAuth 2.0 AS Metadata | — | Proposed Standard | 2018-06 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8414 |
| RFC 7591 OAuth 2.0 Dynamic Client Registration | — | Proposed Standard | 2015-07 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7591 |
| OpenID Connect Core 1.0 / Discovery 1.0 | errata set 2 | final | 2023-12-15 | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html , https://openid.net/specs/openid-connect-discovery-1_0.html |
| OpenID AuthZEN Authorization API | 1.0 | final（OpenID Final Specification） | 承認告知 2026-01-12 | 2026-10-03 | https://openid.net/authorization-api-1-0-final-specification-approved/ |
| Semantic Versioning | 2.0.0 | 公開版（semver.org のコミュニティ仕様。SDO 発行ではない） | 公表日の記載は未確認 | 2026-10-03 | https://semver.org/ |
| NIST SP 800-53 Rev.5 | Release 5.2.0 | final（minor release） | 2025-08-27 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final |
| DORA Accelerate: State of DevOps 2019 | 2019 | 公開（調査報告書） | 2019 | 2026-10-03 | https://services.google.com/fh/files/misc/state-of-devops-2019.pdf |
| Google AIP-180 / AIP-181 / AIP-185 | — | Approved（作成 2019-07-23 / 2019-02-18 / 2024-10-22） | 同左 | 2026-10-03 | https://google.aip.dev/180 , /181 , /185 |
| Kubernetes Deprecation Policy | — | 現行（2026-08-21 更新。同日に URL を移設し、旧 URL /docs/reference/using-api/deprecation-policy/ は 301 で転送） | 2026-08-21 | 2026-10-03 | https://kubernetes.io/docs/reference/deprecation-policy/ |
| Kubernetes Version Skew Policy | — | 現行（2026-04-14 更新） | 2026-04-14 | 2026-10-03 | https://kubernetes.io/releases/version-skew-policy/ |
| Microsoft Graph versioning and support | — | 現行（ms.date 2024-11-07、更新 2025-08-06） | 2024-11-07 | 2026-10-03 | https://learn.microsoft.com/en-us/graph/versioning-and-support |
| AWS SDKs and Tools maintenance policy | — | 現行（日付記載なし） | 未確認 | 2026-10-03 | https://docs.aws.amazon.com/sdkref/latest/guide/maint-policy.html |
| Google Cloud Terms of Service | — | 現行（2026-09-02 更新） | 2026-09-02 | 2026-10-03 | https://cloud.google.com/terms |
| CNCF Platforms White Paper | v1（2023-03 完成）、latest 版を公開 | 公開（改訂継続） | 2023-03（v1） | 2026-10-03 | https://tag-app-delivery.cncf.io/whitepapers/platforms/ |
| CNCF Platform Engineering Maturity Model | v1.0 | 公開（サイトは v1 を掲載、改訂は latest で継続） | 2023-10（v1 完成。Version info の README[^70]） | 2026-10-03 | https://tag-app-delivery.cncf.io/whitepapers/platform-eng-maturity-model/ |
| 地方公共団体情報システム標準化基本方針 | 2024-12-24 改定 | 閣議決定（現行） | 2024-12-24 | 2026-10-03 | https://www.digital.go.jp/policies/local_governments |
| 地方公共団体情報システム共通機能標準仕様書 | 第2.8版 | 公表済み（現行） | 2026-09-30 | 2026-10-03 | https://www.digital.go.jp/policies/local_governments/common-feature-specification |
| OAuth2.0アクセストークン発行／情報取得／無効化 API 仕様書（共通機能） | 第1.4版／第1.4版／第1.3版 | 公表済み（現行） | 2026-09-30（3 文書とも） | 2026-10-03 | 同上 |
| GビズID サービス連携 利用規約 | version1.3 | 現行 | 2026-07-09 | 2026-10-03 | https://gbiz-id.go.jp/top/manual/pdf/rules_for_RP.pdf |
| Pact Broker | v2.122.0 | release | 2026-10-01 | 2026-10-03 | https://github.com/pact-foundation/pact_broker |
| Microcks | 1.15.0 | release（CNCF Incubating、2026-05-03） | 2026-08-05 | 2026-10-03 | https://github.com/microcks/microcks |
| Spectral | v6.17.0 | release | 2026-10-01 | 2026-10-03 | https://github.com/stoplightio/spectral |

---

## 5. 設計への含意（ADR・設計文書への入力）と PoC 実測項目

### 5.1 ADR・設計文書への入力

| 入力先 | 入力する内容 | 根拠 |
|---|---|---|
| ADR-022（連携契約の標準）、DEC-8 | 契約 v1 の凍結範囲を表 2 のとおり 3 段階に分ける。v1 の決裁文には「識別子だけが不可逆で、他は版付き・非推奨期間付き・強制移行なし」と書き、R-022 との衝突を避ける [D] | RS-16#17, #18, #71, §2-1, §2-2 |
| ADR-021（不可逆識別子） | issuer URL、kid の命名規則、scope・permission・resource type の名前空間、CloudEvents の `type` と `source` の命名を、自社所有ドメインで v1 から固定する [D] | RS-16#9, #10, #17, #18 |
| ADR-005（token profile）、DL-75 | access token の claim profile に「未知の claim は無視される」前提を明記する。制約を強める変更は typ または profile 版を変え、必要なら crit を使う。新 claim の追加だけで制約を強める変更は互換性区分で「破壊的」とする [D] | RS-16#14〜#16 |
| ADR-016（versioning・deprecation）、DL-70、DL-23 | 破壊的変更の定義表を自社で定める（enum 値の追加、エラーコードの変更、既定値の変更、claim の意味の変更をどちらに入れるか）。安定度別（alpha・beta・GA）の最短非推奨期間、緊急変更の例外と事後承認、延長の判断基準、段階的な締め出しの順序、未移行 consumer の計測方法を定める。期間の値は表 1 を参考値として DL-21（BIA）と DL-20 で決める [D] | RS-16#23〜#28, #32, #34〜#44, 表 1 |
| ADR-011（PEP–PDP API）、DL-72 | PEP–PDP 契約は AuthZEN 1.0 の evaluation・evaluations を凍結の対象にし、自社拡張（decision_id、model revision、consistency）は版付きの profile にする [D] | RS-16#22、RS-07#60 |
| DL-71（共通スキーマ） | エラー形式に RFC 9457 を採用し、拡張メンバは追加のみで後方互換とする。監査・失効イベントの封筒に CloudEvents 1.0 を使う場合は、スキーマ非互換の変更時に dataschema の URI を変える [D] | RS-16#10, #12 |
| DL-80（モック・契約試験キット） | 二層の試験とする。全 consumer 必須の層は、OpenAPI・AsyncAPI からのモック、スキーマ適合試験、負例ベクタ（未知 claim、crit、未知 kid、aud 誤り、cross-tenant）。任意の層は Pact の consumer-driven 契約（pending pacts、mainBranch と deployedOrReleased の selector、can-i-deploy）。OIDC の RP 実装は OIDF の RP 適合試験を自己実行させる [D] | RS-16#46〜#56 |
| DL-62（連携ハンドブック総覧）、DL-68（開発者 FAQ） | 疑義対応窓口（自治体標準化の PMO ツール相当）を置き、回答を FAQ として公開する。仕様の誤記・解釈の補記は正誤表で即時に出し、意味が変わるものは改定として版を上げる [D] | RS-16#74, #75 |
| DL-66（オンボーディング手順） | 段階（登録、workload ID 発行、モデル登録、PEP 組込み、契約試験合格、shadow、本番切替）ごとに所要時間の SLO を置き、self-service の範囲を明示する。非本番環境の client 登録は RFC 7591 の software statement と initial access token で自動化する案を検討する [D] | RS-16#20, #45, #64, #80 |
| DL-27（運用・要員モデル）、R-140 | 変更管理を二層にする。上層の「契約変更審査会」は、破壊的変更・非推奨・例外・凍結日を審議し、セキュリティ・プライバシーの代表（CM-3(4)）と consumer 側の開発組織の代表を構成員にする。改定は年 2 回の固定日に束ねる（自治体標準化の改定基準日に倣う）。下層の実装変更は peer review、自動の契約試験、can-i-deploy で通す [D] | RS-16#57〜#60, #73 |
| DL-20（数値契約）、R-194 | 変更の数値契約の候補として、DORA の 5 指標、契約変更の告知から施行までの期間、未移行 consumer 数、オンボーディング各段階の所要時間、疑義への回答時間を挙げる。値は BIA と PoC で決める [D] | RS-16#61, #64 |
| DL-31（段階導入計画）、DL-42 | 多ベンダー並行の移行では、契約凍結だけでなく、各組織の要員確保と移行時期の平準化をゲート条件にする。要員を確保できない組織は後続の波に回す [D][A-052] | RS-16#78, #79 |
| SDK 方針（ADR-022、DL-70） | SDK は SemVer に従い、API 版をリリース時に固定する。基盤との版差の許容幅（例: N−2）と、メジャー版ごとの支援期間（GA・maintenance）を宣言する。SDK に非推奨警告を出す機能を持たせる [D] | RS-16#31〜#33, #39, #43, #44 |

**表 2 契約 v1 の凍結範囲（案）**

| 区分 | 対象 | 変更の扱い | 根拠 |
|---|---|---|---|
| 不可逆（v1 で固定、変えない） | issuer URL、sub/tid の形式、scope・permission・resource type の名前空間、CloudEvents の type/source の命名、kid の命名規則 | 変更しない。変更が避けられない場合は新しい識別子を並行運用し、旧識別子は非推奨手続で退役させる | RS-16#9, #17, #18 |
| 版付き凍結（v1 で固定、互換な追加は可） | discovery・JWKS の取得規則、access token の claim profile、エラー形式（RFC 9457）、PEP–PDP API（AuthZEN 1.0 ＋自社 profile）、監査イベントの共通項目、SDK の公開インタフェース | 後方互換な追加だけを minor で許す。制約の強化と意味の変更は破壊的変更として扱い、新版を並行提供して非推奨手続を踏む | RS-16#12, #14〜#16, #19, #22, #31 |
| 凍結しない | AS・IdP 製品、PDP エンジン、ストア、cell 構成、内部 API | 契約の範囲内で自由に変更する。契約試験で外部挙動の不変を確かめる | RS-16#71 |

### 5.2 PoC で実測すべきこと（DL-22 への入力。TC-ID は未採番）

1. モックだけで開発した consumer を実基盤に切り替えたときの不適合件数と、その原因の内訳（仕様の解釈のずれ、未定義部分、認証フローの違い）[D]（RS-16#79 の課題の再現確認）。
2. 未知の claim・parameter・header を注入したときに、全言語の SDK と代表的な PEP 実装がそれを無視して動作し続けるか。crit に未知の拡張を入れたときに拒否するか [D]（RS-16#14〜#16, #21）。
3. 署名鍵の rotation 演習で、未知の kid を見た検証側が JWKS を取り直すまでの時間と失敗率を、SDK の版ごと（N、N−1、N−2）に測る [D]（RS-16#19, #39）。
4. 破壊的変更の検出率。field の削除、enum 値の追加、既定値の変更、claim の意味の変更などの変更を仕込み、Buf・OpenAPI 差分ツール・契約試験・負例ベクタがそれぞれ何を検出し、何を見逃すかを測る [D]（RS-16#24, #27, #29, #30, #82）。
5. 非推奨の計測。Deprecation・Sunset header と、client_id 単位の非推奨 API 利用メトリクスを実装し、模擬の非推奨で全 consumer を特定できるか、移行完了までの時間を測る [D]（RS-16#34, #38）。
6. 契約試験の規模。provider 1 つに対して consumer の契約を 50 件と 300 件（合成）置いたときの検証時間、pending pacts の挙動、can-i-deploy の応答時間を測る [D][A-050]（RS-16#49〜#52）。
7. オンボーディングのリードタイム。パイロット 2〜3 サービスで、各段階の所要時間、手作業の数、問い合わせ件数を記録する [D]（RS-16#64, #80。seed-03 C3 のパイロット参加確約と連動）。
8. 契約記述ツールの対応。採用候補のコード生成・モック・lint・差分ツールが、OpenAPI 3.1 と 3.2、AsyncAPI 3.0 と 3.1 の文書を正しく扱えるかを確かめる [D]（RS-16#1, #6, #13）。
9. 疑義対応の負荷。パイロット期間に開発組織あたり週何件の疑義が出て、FAQ・正誤表でどれだけ再発を防げたかを測る [D]（RS-16#74）。

---

## 6. 調査の限界と未確認事項

- ISO/IEC 27001:2022 附属書 A.8.32（変更管理）と ITIL 4 の change enablement は、有償文書のため本文を確認していない（未確認）。変更管理の規範は NIST SP 800-53 Rev.5 の CM-3 だけで確認した。
- NIST SP 800-53 は、NIST が GitHub（usnistgov/oscal-content）で公開する OSCAL 形式の Release 5.2.0 カタログから本文を読み、CSRC のページで Release 5.2.0 の発行（2025-08-27）を確認した。PDF 版との文言照合はしていない。
- DORA の CAB に関する主張は、v0.1 では dora.dev の capability 文書だけで確認していた。v0.2 の独立検証で 2019 年の State of DevOps Report 本体（p.7 の回答者数と誤差、p.50〜51 の変更管理の分析）を確認した[^71]。統計手法の詳細と、2.6 倍という値の信頼区間は確認していない（未確認）。そのため結論は「重い外部承認が性能を上げる証拠はない」という方向性に限って使い、2.6 倍の値は結論に使っていない。
- Team Topologies は公式サイトの key concepts だけを確認し、書籍本体（M. Skelton, M. Pais）は読んでいない（未確認）。
- Stripe が後方互換とみなす変更の網羅的な一覧は、確認日時点の公式文書（Versioning、Upgrades）に見当たらなかった（未確認）。ただし Versioning の文書は、open な enum への値の追加を後方互換の変更として扱うことを明記している（RS-16#32）。二次情報の検索結果にはそうした一覧の存在が示されていたが、根拠には使っていない。
- PactFlow の Bi-Directional Contract Testing は、SmartBear の PactFlow On-Premises の UI 解説ページだけを確認した。互換性検査の詳細（compatibility checks）と、consumer-driven 方式との精度の違いについての公式の注意事項は読んでいない（未確認）。PactFlow が商用製品であることも本書では原典で確認していない。
- Pact Specification（v1〜v4）の版と状態は確認していない（未確認）。
- Spectral 以外の契約ツール（oasdiff、Prism、Microcks、コード生成器）が OpenAPI 3.2 と AsyncAPI 3.x にリリース版で対応しているかは確認していない（未確認）。oasdiff の README は OpenAPI 3.1・3.2 対応の説明ページに言及していたが、本文は読んでいない。Spectral の README も AsyncAPI の対応版を明記していない。
- OpenAPI 3.1 から 3.2 への変更点の一覧（後方互換でない変更の有無）は読んでいない（未確認）。凍結版を 3.1 系とする判断は、ツール対応の不確実性に基づく推論である。
- JSON Schema の次期安定版の公開時期は確認できなかった（未確認）。策定団体が 2025-01-13 以降に財団へ加盟したかどうかも確認していない（未確認）。
- AsyncAPI 3.1.0 の仕様ページは公開日を記載していないため、公表日はリリースノートの日付（2026-01-31）で代用した。
- 共有の認証基盤へのオンボーディングのリードタイムについて、公開された基準値や実績値は見つからなかった。GビズID の審査・検証環境の実際の所要期間と、デジタル認証サービスの各段階の所要期間は未確認である。
- デジタル庁の検証事業の報告書は本紙だけを読み、基礎資料と個票（ZIP）は読んでいない（未確認）。「解釈の齟齬が生じる可能性」は報告書が挙げた課題であり、発生件数の実測値ではない。
- 特定移行支援システムの要因は、デジタル庁による整理をそのまま記した。独立の検証はしていない。公共の基幹業務システムの結果を民間の本計画に当てはめるのは推論である。
- Google Cloud Terms の「Cloud Identity Services」の定義範囲は確認していない（未確認）。
- Microsoft Graph の versioning ページの ms.date は 2024-11-07 であり、それ以降の方針変更の有無は、同ページの記載以外では確認していない。
- AWS SDKs and Tools maintenance policy は、ページ上に公表日が記載されておらず、公表日は未確認である。CNCF Platform Engineering Maturity Model は、ページの Version info が指す README に「v1 は 2023 年 10 月に完成」とある[^70]。
- Azure AD Graph が 2025-08-31 に実際に停止したかは、Microsoft の移行文書（ms.date 2025-09-29）が未来形（"will be fully retired"）のままであるため確認できなかった（未確認）。同文書が最新告知としてリンクする Microsoft Entra Blog（2025-06-27 更新）は、延長アクセス中のアプリは 2025 年 9 月初めから使えなくなり、それまでに 8〜24 時間の一時停止試験を 1〜2 回行うと告知していた。これはベンダー自身の告知であるが、停止の事実の記録ではないため、本書の結論には使っていない。
- 01_governance/assumptions-register.md の A-060 は「法域・業界規制の判定は RS-16 と DL-34 で行う」と記しているが、traceability/deliverables.md（DL-100）は RS-16 を本テーマ（超大規模並行開発の統治）に割り当てている。ID の参照がずれている可能性がある。本書は指示されたファイル以外を編集しないため、記録だけにとどめる。
- v0.2 で、作成者以外のエージェントによる原典照合（DL-100 の E3 証拠、research/verification/RS-16-verification.md）を実施した。全 69 脚注の原典を取得し、部分支持 5 件（[^5][^36][^37][^44][^67]）を修正した。不支持と検証不能は 0 件である。照合も AI エージェントによるもので、人間の専門家による確認は未実施である。

---

## 参考文献

[^1]: OpenAPI Initiative『OpenAPI Specification v3.2.1』2026-09-10. https://spec.openapis.org/oas/v3.2.1.html （参照箇所: §2.1 Versions, Appendix A Revision History、確認日: 2026-10-03）
[^2]: OpenAPI Initiative『OpenAPI Specification v3.1.2』2025-09-19. https://spec.openapis.org/oas/v3.1.2.html （参照箇所: Schema Object の説明, OpenAPI Object の jsonSchemaDialect、確認日: 2026-10-03）
[^3]: JSON Schema『Specification』. https://json-schema.org/specification （参照箇所: "The current version is 2020-12" の段落、確認日: 2026-10-03）
[^4]: A. Wright, H. Andrews, B. Hutton, G. Dennis『JSON Schema: A Media Type for Describing JSON Documents』draft-bhutton-json-schema-01, 2022-06-16. https://json-schema.org/draft/2020-12/json-schema-core （参照箇所: Status of This Memo, §8.1.1 $schema, §8.1.2 $vocabulary、確認日: 2026-10-03）
[^5]: G. Dennis (JSON Schema)『Moving Toward a Stable Spec』JSON Schema Blog, 2025-01-13. https://json-schema.org/blog/posts/stable-json-schema （参照箇所: Publication Process, Compatibility with Draft 2020-12, Maximize Forward Compatibility、確認日: 2026-10-03）
[^6]: AsyncAPI Initiative『AsyncAPI Specification 3.1.0』. https://www.asyncapi.com/docs/reference/specification/v3.1.0 （参照箇所: Versions 節、確認日: 2026-10-03）
[^7]: AsyncAPI Initiative『AsyncAPI 3.1.0 Release Notes』2026-01-31. https://www.asyncapi.com/blog/release-notes-3.1.0 （参照箇所: 冒頭の互換性の記述, ROS 2 binding, 移行方法、確認日: 2026-10-03）
[^8]: AsyncAPI Initiative『AsyncAPI 3.0.0 Release Notes』2023-12-05. https://www.asyncapi.com/blog/release-notes-3.0.0 （参照箇所: 移行ガイドへの案内, operation と channel の分離, send/receive, server の host/path/protocol、確認日: 2026-10-03）
[^9]: CloudEvents『CloudEvents - Version 1.0.2』（タグ ce@v1.0.2, 2022-02-06）. https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md （参照箇所: Context Attributes の id, source, specversion, type, dataschema、確認日: 2026-10-03）
[^10]: Cloud Native Computing Foundation『CloudEvents』プロジェクトページ. https://www.cncf.io/projects/cloudevents/ （参照箇所: 受理日と成熟度の遷移、確認日: 2026-10-03）
[^11]: M. Nottingham, E. Wilde, S. Dalal『Problem Details for HTTP APIs』RFC 9457, Standards Track, 2023-07. https://www.rfc-editor.org/rfc/rfc9457 （参照箇所: 冒頭の Obsoletes 表示, §3.2 Extension Members、確認日: 2026-10-03）
[^12]: Stoplight『stoplightio/spectral』README（タグ v6.17.0, 2026-10-01）. https://github.com/stoplightio/spectral （参照箇所: Ready-to-use Rulesets の記述、確認日: 2026-10-03）
[^13]: M. Jones, J. Bradley, N. Sakimura『JSON Web Token (JWT)』RFC 7519, 2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §4 JWT Claims、確認日: 2026-10-03）
[^14]: D. Hardt (Ed.)『The OAuth 2.0 Authorization Framework』RFC 6749, 2012-10. https://www.rfc-editor.org/rfc/rfc6749 （参照箇所: §3.1, §3.2, §4.1.2, §5.1、確認日: 2026-10-03）
[^15]: M. Jones, J. Bradley, N. Sakimura『JSON Web Signature (JWS)』RFC 7515, 2015-05. https://www.rfc-editor.org/rfc/rfc7515 （参照箇所: §4.1.11 "crit" Header Parameter、確認日: 2026-10-03）
[^16]: N. Sakimura, J. Bradley, M. Jones, E. Jay『OpenID Connect Discovery 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-discovery-1_0.html （参照箇所: §3 OpenID Provider Metadata の issuer, §7 Security Considerations、確認日: 2026-10-03）
[^17]: M. Jones, N. Sakimura, J. Bradley『OAuth 2.0 Authorization Server Metadata』RFC 8414, 2018-06. https://www.rfc-editor.org/rfc/rfc8414 （参照箇所: §3.3 Authorization Server Metadata Validation、確認日: 2026-10-03）
[^18]: N. Sakimura, J. Bradley, M. Jones, B. de Medeiros, C. Mortimore『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §10.1.1 Rotation of Asymmetric Signing Keys、確認日: 2026-10-03）
[^19]: J. Richer (Ed.), M. Jones, J. Bradley, M. Machulak, P. Hunt『OAuth 2.0 Dynamic Client Registration Protocol』RFC 7591, Standards Track, 2015-07. https://www.rfc-editor.org/rfc/rfc7591 （参照箇所: §1.2 Terminology の Initial Access Token, §2.3 Software Statement, §3、確認日: 2026-10-03）
[^20]: R. Fielding, M. Nottingham, J. Reschke (Eds.)『HTTP Semantics』RFC 9110, STD 97, 2022-06. https://www.rfc-editor.org/rfc/rfc9110 （参照箇所: §5.1 Field Names、確認日: 2026-10-03）
[^21]: OpenID Foundation『Authorization API 1.0 Final Specification Approved』2026-01-12. https://openid.net/authorization-api-1-0-final-specification-approved/ （参照箇所: 告知本文と投票結果、確認日: 2026-10-03）
[^22]: Google『AIP-180: Backwards compatibility』Approved, 2019-07-23. https://google.aip.dev/180 （参照箇所: Guidance の互換性の 3 類型, Adding components, Enum values, Default values must not change, Semantic changes、確認日: 2026-10-03）
[^23]: Google『AIP-181: Stability levels』Approved, 2019-02-18. https://google.aip.dev/181 （参照箇所: Alpha, Beta, Stable, Major versions, Isolated changes, Emergency changes、確認日: 2026-10-03）
[^24]: Google『AIP-185: API Versioning』Approved, 2024-10-22. https://google.aip.dev/185 （参照箇所: Guidance の major version, Channel-based versioning の deprecation と 180 日の推奨、確認日: 2026-10-03）
[^25]: Microsoft『Versioning, support, and breaking change policies for Microsoft Graph』Microsoft Learn, ms.date 2024-11-07（更新 2025-08-06）. https://learn.microsoft.com/en-us/graph/versioning-and-support （参照箇所: Support policy and deprecation information, API contract and nonbackward compatible changes, Versions、確認日: 2026-10-03）
[^26]: Google『Language Guide (proto 3)』protobuf.dev. https://protobuf.dev/programming-guides/proto3/ （参照箇所: Updating A Message Type, Deleting Fields, Reserved Field Numbers/Names, Unknown Fields、確認日: 2026-10-03）
[^27]: Buf『Rules and categories』Buf Docs（Breaking change detection）. https://buf.build/docs/breaking/rules/ （参照箇所: Categories の FILE/PACKAGE/WIRE_JSON/WIRE と既定値の記述、確認日: 2026-10-03）
[^28]: T. Preston-Werner『Semantic Versioning 2.0.0』. https://semver.org/ （参照箇所: Specification 項目 4, 7, 8, FAQ "How should I handle deprecating functionality?"、確認日: 2026-10-03）
[^29]: Stripe『Versioning』Stripe API Reference（現行版 2026-09-30.endive の表示）. https://docs.stripe.com/api/versioning （参照箇所: リリース方式の説明, Stripe-Version header, webhook の版, 各言語 SDK の版固定の記述（言語別タブ）, Enums 節、確認日: 2026-10-03）
[^30]: Stripe『Upgrade your integration』Stripe Docs. https://docs.stripe.com/upgrades （参照箇所: Specify the API version in your SDK（導入文と Java タブ）, Update your event destinations, Update your webhook endpoints、確認日: 2026-10-03。英語版は ?locale=en-US で取得）
[^31]: S. Dalal, E. Wilde『The Deprecation HTTP Response Header Field』RFC 9745, Standards Track, 2025-03. https://www.rfc-editor.org/rfc/rfc9745 （参照箇所: §1, §2.1 Syntax, §4 Sunset, §5 Resource Behavior, §7 Security Considerations、確認日: 2026-10-03）
[^32]: E. Wilde『The Sunset HTTP Header Field』RFC 8594, Informational, 2019-05. https://www.rfc-editor.org/rfc/rfc8594 （参照箇所: §3 The Sunset HTTP Response Header Field, §6 The Sunset Link Relation Type, §8 Security Considerations、確認日: 2026-10-03）
[^33]: The Kubernetes Authors『Kubernetes Deprecation Policy』kubernetes.io, 最終更新 2026-08-21. https://kubernetes.io/docs/reference/deprecation-policy/ （旧 URL https://kubernetes.io/docs/reference/using-api/deprecation-policy/ は 301 で転送）（参照箇所: Deprecating parts of the API（Rule #1〜#4b, REST resources の Warning header と metric）, Deprecating a flag or CLI（Rule #5a〜#6）, Deprecating a feature or behavior（Rule #7〜#10）、確認日: 2026-10-03）
[^34]: The Kubernetes Authors『Releases』kubernetes.io. https://kubernetes.io/releases/ （参照箇所: Release History の冒頭段落、確認日: 2026-10-03）
[^35]: The Kubernetes Authors『Version Skew Policy』kubernetes.io, 最終更新 2026-04-14. https://kubernetes.io/releases/version-skew-policy/ （参照箇所: Supported version skew の kube-apiserver と kubelet、確認日: 2026-10-03）
[^36]: Microsoft『Migrate from Azure Active Directory (Azure AD) Graph to Microsoft Graph』Microsoft Learn, ms.date 2025-09-29. https://learn.microsoft.com/en-us/graph/migrate-azure-ad-graph-overview （参照箇所: Key timelines in the retirement of Azure AD Graph、確認日: 2026-10-03）
[^37]: Google『Google Cloud Terms of Service』最終更新 2026-09-02. https://cloud.google.com/terms （参照箇所: §1.4(e) Discontinuation of Services、確認日: 2026-10-03）
[^38]: Microsoft『Modern Lifecycle Policy』Microsoft Learn, ms.date 2020-01-10. https://learn.microsoft.com/en-us/lifecycle/policies/modern （参照箇所: Continuity and migration、確認日: 2026-10-03）
[^39]: Amazon Web Services『AWS SDKs and Tools maintenance policy』AWS SDKs and Tools Reference Guide. https://docs.aws.amazon.com/sdkref/latest/guide/maint-policy.html （参照箇所: Versioning, SDK major version lifecycle, Dependency lifecycle, Communication methods、確認日: 2026-10-03）
[^40]: デジタル庁『G ビズ ID サービス連携 利用規約』version1.3, 2026-07-09 制定. https://gbiz-id.go.jp/top/manual/pdf/rules_for_RP.pdf （参照箇所: 第5条 サービス連携手続等, 第14条 本サービスの休廃止等, 改定履歴、確認日: 2026-10-03）
[^41]: デジタル庁『民間事業者向け情報｜デジタル認証サービス』. https://services.digital.go.jp/auth-and-sign/business/ （参照箇所: 利用できるAPI（認証API・署名API）の記述、確認日: 2026-10-03）
[^42]: デジタル庁『民間事業者向けよくある質問｜デジタル認証サービス』. https://services.digital.go.jp/auth-and-sign/business-faq/ （参照箇所: 「デジタル認証サービスAPIへの利用条件、申込手続きはどのようになりますか。」の回答、確認日: 2026-10-03）
[^43]: Pact Foundation『Introduction』Pact Docs. https://docs.pact.io/ （参照箇所: What is contract testing?, Consumer driven contracts、確認日: 2026-10-03）
[^44]: Pact Foundation『When to use Pact』Pact Docs, 最終更新 2022-04-13. https://docs.pact.io/getting_started/what_is_pact_good_for （参照箇所: What is Pact good for? / What is it not good for?、確認日: 2026-10-03）
[^45]: Pact Foundation『Provider states』Pact Docs. https://docs.pact.io/getting_started/provider_states （参照箇所: 冒頭の定義と使い方、確認日: 2026-10-03）
[^46]: Pact Foundation『Can I Deploy』Pact Docs. https://docs.pact.io/pact_broker/can_i_deploy （参照箇所: The Matrix, Recording deployments、確認日: 2026-10-03）
[^47]: Pact Foundation『Pending pacts』Pact Docs. https://docs.pact.io/pact_broker/advanced_topics/pending_pacts （参照箇所: 定義, 解決する問題, pending の判定、確認日: 2026-10-03）
[^48]: Pact Foundation『Consumer Version Selectors』Pact Docs. https://docs.pact.io/pact_broker/advanced_topics/consumer_version_selectors （参照箇所: 各言語の設定例（mainBranch, deployedOrReleased）、確認日: 2026-10-03）
[^49]: Pact Foundation『Webhooks』Pact Docs. https://docs.pact.io/pact_broker/webhooks （参照箇所: Using webhooks with the 'contract_requiring_verification_published' event、確認日: 2026-10-03）
[^50]: SmartBear『Bi-Directional Contract Testing』PactFlow On-Premises Documentation. https://support.smartbear.com/pactflow-on-premises/docs/en/user-guide/user-interface/user-interface-2-x-x/bi-directional-contract-testing.html （参照箇所: 冒頭の定義, Statuses, Provider Contract Tab、確認日: 2026-10-03）
[^51]: Cloud Native Computing Foundation『Microcks』プロジェクトページ. https://www.cncf.io/projects/microcks/ （参照箇所: 受理日と成熟度の遷移、確認日: 2026-10-03）
[^52]: Microcks『Main Concepts』Microcks Documentation. https://microcks.io/documentation/overview/main-concepts/ （参照箇所: Artifacts, Mocks, Tests の説明、確認日: 2026-10-03）
[^53]: OpenID Foundation『OpenID Connect RP Testing』. https://openid.net/certification/connect_rp_testing/ （参照箇所: テスト計画と profile の説明, 実行手順、確認日: 2026-10-03）
[^54]: NIST『Electronic (OSCAL) Version of NIST SP 800-53 Rev 5.2.0 Controls and SP 800-53A Rev 5.2.0 Assessment Procedures』5.2.0. https://github.com/usnistgov/oscal-content/blob/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json （参照箇所: CM-3 の statement と guidance, CM-3(2), CM-3(4), CM-4、確認日: 2026-10-03）
[^55]: NIST CSRC『SP 800-53 Rev. 5, Security and Privacy Controls for Information Systems and Organizations』. https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final （参照箇所: 2025-08-27 の Release 5.2.0 の記載、確認日: 2026-10-03）
[^56]: DORA (Google Cloud)『Capabilities: Streamlining change approval』. https://dora.dev/capabilities/streamlining-change-approval/ （参照箇所: 冒頭, How to implement a change approval process, Common pitfalls、確認日: 2026-10-03）
[^57]: DORA (Google Cloud)『DORA's software delivery performance metrics』2026-01-05. https://dora.dev/guides/dora-metrics/ （参照箇所: Throughput と Instability の各指標の定義、確認日: 2026-10-03）
[^58]: CNCF TAG App Delivery『CNCF Platforms White Paper』（latest 版）. https://tag-app-delivery.cncf.io/whitepapers/platforms/ （参照箇所: What is a platform, Attributes of platforms, Capabilities of platforms, How to measure the success of platforms, Challenges with platforms、確認日: 2026-10-03）
[^59]: CNCF TAG App Delivery『Platforms white paper』README（Version info）. https://github.com/cncf/tag-app-delivery/tree/main/platforms-whitepaper/README.md （参照箇所: v1 完成時期と latest の記述、確認日: 2026-10-03）
[^60]: CNCF TAG App Delivery『Platform Engineering Maturity Model』v1.0. https://tag-app-delivery.cncf.io/whitepapers/platform-eng-maturity-model/ （参照箇所: Model table, Adoption, Interfaces、確認日: 2026-10-03）
[^61]: Team Topologies『Key Concepts』. https://teamtopologies.com/key-concepts （参照箇所: Four fundamental topologies, Three team interaction modes, Managing Team Cognitive Load, Thinnest Viable Platform、確認日: 2026-10-03）
[^62]: 内閣（閣議決定）『地方公共団体情報システム標準化基本方針』2024-12-24 改定. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/6a6cf2e1/20241224_policies_local_governments_doc_04.pdf （参照箇所: 2.2 目標（移行目標と経過措置, (4) 迅速で柔軟なシステムの構築）, 4.1.2 連携要件の標準, 4.3.1 共通機能の標準, 4.3.2 ドキュメントの版管理, 5.1.2 機能標準化基準の変更方針, 5.2.2 共通標準化基準の適合性の確認、確認日: 2026-10-03）
[^63]: デジタル庁 地方業務システム基盤チーム『標準仕様書の改定・運用について（基本的な考え方）』2025-01-29. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/394352a4/20250129_policies_local_governments_outline_01.pdf （参照箇所: p.1〜p.4、確認日: 2026-10-03）
[^64]: デジタル庁 地方業務システム基盤チーム『データ要件・連携要件の運用について』2024-04-08 改定. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/f757d23a/20240408_policies_local_governments_outline_01.pdf （参照箇所: 1. 公開タイミング（※2）, 2. 公開スケジュール, 公開対応フロー説明 #6・#8、確認日: 2026-10-03）
[^65]: デジタル庁 地方業務システム基盤チーム『データ要件・連携要件標準仕様書の令和８年９月末改定スケジュール（予定）について』2026-08. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/397b0bed/20260820_policies_local_governments_outline_01.pdf （参照箇所: p.2, p.3 のスケジュール、確認日: 2026-10-03）
[^66]: デジタル庁 地方業務システム基盤チーム『標準仕様書と適合確認に関する考え方』2023-10-27. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/d779571b/20231027_policies_local_governments_outline_02.pdf （参照箇所: p.11〜p.14 機能要件の標準への適合性の確認, p.16〜p.17 全体バージョン管理、確認日: 2026-10-03）
[^67]: デジタル庁『共通機能の標準仕様』（最終更新 2026-09-30）. https://www.digital.go.jp/policies/local_governments/common-feature-specification （参照箇所: 仕様書最新版のリンク集（2026-09-30 更新）, 地方公共団体情報システム共通機能標準仕様書の版一覧, OAuth2.0 アクセストークン系 API 仕様書の版一覧, 廃止等仕様書、確認日: 2026-10-03）
[^68]: デジタル庁『移行支援期間における特定移行支援システムの数について（令和8年（2026年）3月末時点）』2026-06-30 掲載. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/d70e8d19/20260630_policies_local_governments_doc_1.pdf （参照箇所: p.1 事由別の表と要因の説明、確認日: 2026-10-03）
[^69]: デジタル庁『令和6年度 共同利用方式の推進及びマルチベンダーにおけるシステム間連携の検証事業 報告書（本紙）』2026-03-27. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/92d70acb-8407-4f60-8b45-363d9a2d358d/c71cd4d5/20260327_policies_local_governments_government-cloud-vendor-verification_01.pdf （表紙の日付は令和8年3月。2026-03-27 はファイル名による）（参照箇所: p.2 令和６年度のガバメントクラウドに係る検証事業について（20社）, p.7 各検証項目の検証内容・検証結果・総括（2/5）のオ・カ・キ（PDF の 8 枚目）、確認日: 2026-10-03）
[^70]: CNCF TAG App Delivery『Platform Engineering Maturity Model』README（Version info）. https://github.com/cncf/tag-app-delivery/tree/main/platforms-maturity-model/README.md （参照箇所: "v1 was completed in October 2023" の記述、確認日: 2026-10-03）
[^71]: N. Forsgren, D. Smith, J. Humble, J. Frazelle (DORA / Google Cloud)『Accelerate: State of DevOps 2019』2019. https://services.google.com/fh/files/misc/state-of-devops-2019.pdf （参照箇所: p.7 注 2（回答者約 1,000 人、誤差 3%）, p.50〜51 Heavyweight change process と CAB の役割、確認日: 2026-10-03）
