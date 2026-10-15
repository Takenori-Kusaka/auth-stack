# ADR-021 不可逆識別子（issuer・sub/tid・RP ID・entityID・リソース型名前空間）

> 文書ID: ADR-021 / 版: 0.2（v1.2 の同期） / 状態: proposed（決裁前。CONVENTIONS §1 の区分では draft）/ 最終更新: 2026-10-15（0.2: v1.2 の同期で §8A「v1.2 で判明した論点」V12-21-1・V12-21-2 を追記した。決定は変えていない）
> 可逆性: **不可逆**。外部の RP・顧客 IdP・利用者の認証器・依存サービスの保存データに写し取られるものは不可逆とする。具体的には、issuer URL、sub・tid・client_id・SAML 接続 ID の値と「不透明に扱う」という契約、WebAuthn RP ID、SAML SP entityID/ACS、pairwise の採否、名前空間の命名規則、claim 名である。**可逆**として切り出すのは次のものである。cell 別の内部 issuer（ADR-005 V4。依存サービスに保存させない）、kid の値、新規払出しに使う符号化方式（既存値は変えない）、表示用のテナント名・slug、製品内部 ID、運用規則（台帳、CI 検査、再検証周期）、信頼区画・専用 issuer の追加（§3.9）。
> DEC-3 対象: はい（traceability/deliverables.md §5 の ADR-021 行、§6.1 の DEC-3 行。ADR-007 の KD7-1「issuer の粒度」と同時に決裁する）
> 対応要求: R-037, R-047, R-209（主。deliverables.md の ADR-021 行）／G-067（主。対応成果物に本書を名指し）／G-020（全 ADR の必須節）。関連: R-029, R-036, R-043, R-046, R-090, R-101, R-104, R-105, R-109, R-118, R-128, R-140, R-150, R-158, R-161, R-173, R-203, R-208, R-250, R-283／G-065, G-073, G-075, G-081, G-086, G-088, G-101, G-116, G-137, G-139, G-141（閉じ方と状態は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md（CL-0125, CL-0127）, traceability/dissent-log.md（DS-18）, 01_governance/assumptions-register.md, 01_governance/durability-charter-20y.md（§5.3）, 02_requirements/principal-catalog.md（§3.2, §3.3）, 02_requirements/tenant-lifecycle.md（INV-1, INV-2, K-8）, 02_requirements/as-is-inventory.md, 03_threat-model/attacker-model.md, 05_adr/ADR-005-token-profile.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md, research/RS-03, RS-04, RS-05, RS-06, RS-07, RS-10, RS-11, RS-12, RS-14, RS-15, RS-16, RS-17（各 research/verification/ の検証記録を含む）
> 作成方法: 3 つの起草レンズの案（sec: セキュリティ・保証、ops: 運用性・費用・組織実現性、evo: 20 年の進化・退出）を 3 名の判定者が採点した。本書は、集計上の勝者 sec を土台に、判定者が挙げた取込み（graft）と事実誤りの訂正を統合した確定版の決裁案である。judge panel は AI エージェント（Claude）による模擬の自己レビューであり、実在の CTO/CISO の判定・決裁ではない（CONVENTIONS §8）。research にない原典（参考文献で「統合時に取得」と記したもの）は、統合者が 2026-10-15 に取得して本文と照合した。作成者以外による照合はまだ済んでいない。
> 表記: 決定は D21-xx、決裁案は K21-x、棄却仮説は ADR-021/RH-xx、試験案は TC-021-xx（仮番。12_poc の DL-22 で採番）、残余リスクは RR21-xx、新規仮定は NA-021-x と表記する。表のセルのうちタグのないものは設計推論 [D] であり、本注記で個別のタグに代える。

## 要旨

- **ドメイン**: 識別子はすべて、ブランド名・組織名を含まない識別子専用の自社所有 registrable domain（以下 `<id-domain>`）の下に置く [D]。製品・cell・リージョン・テナント・alg・組織名は識別子に含めない [D]。事業売却の可能性がある事業単位にだけ、最初から別の専用 domain を割り当てるかどうかを決裁する（K21-2）[D]。
- **issuer**: issuer は「信頼区画」ごとに 1 つとし、`https://<不透明ラベル>.<id-domain>`（path なし）の形にする [D]。基準は 3 区画（企業向け本番、消費者向け本番、sandbox）である [D]。sandbox は別の registrable domain に置く [D]。これに加えて、契約で求められた場合に限り、高保証テナント向けの専用 issuer 枠を設ける [D][A-081]。cell・リージョン・テナントごとには issuer を分けない [D]。この結論は ADR-007 がいま要求しているテナント別 issuer と対立する。そのため KD7-1 と同時に決裁する [D]。
- **主体などの識別子**: sub・tid・client_id・SAML 接続 ID は、基盤が CSPRNG で払い出す不透明値（122 bit 以上）とする [D]。値は変えず、再利用しない [D]。製品が生成する ID は外部に出さない [D]。email・UPN・SCIM userName による結合は、どの経路でも禁止する（nOAuth 対策）[D]。
- **passkey**: WebAuthn RP ID は信頼区画の login ホスト（`<p>.<id-domain>`）とする [D]。user handle は sub と別の 32 byte 乱数にする [D]。製品を乗り換えても passkey を使い続けられるよう、credential record と user handle の export/import を調達要件にする [D]。
- **相談事項 1（認可後の claim に trace id を付けるか）**: access token にも ID Token にも W3C の trace-id は入れない [D]。「共通の認証・認可を通った一貫した要求」の証跡は、次の識別子を連鎖させ、改ざん検知可能な監査記録の上で trace-id と突き合わせて残す [D]。
  - `(iss, jti)`: token の識別子（署名済み）
  - `sid`: session の識別子（署名済み）
  - `txn`: 内部取引の識別子。edge で外部 token を検証した後に発行する Txn-Token の中に置く（署名済み）
  - `decision_id`: PDP 判定の識別子

  「trace id 的な id」の役割に最も近いのは `txn` である [D]。
- **相談事項 2（将来に備えて付加を検討すべき claim）**: 所属（`tid`）以外に、v1 で名前と形式を固定する claim は次のとおりである [D]。
  - 主体類型
  - `act`／`may_act`（AI エージェントや代理人による委任）
  - `acr`／`amr`／`auth_time`
  - `cnf`
  - `sid`／`txn`
  - token profile の版

  `authorization_details`、`status`、`verified_claims` は名前だけを予約する [D]。W3C VC Data Model 2.0 に備え、issuer URL を VC の issuer にそのまま使える形に保つ [D]。sub は解決可能な URL にしない [D]。role・group・権限は token に焼き込まない [D]（§2.6）。

---

## 1. 文脈

### 1.1 解くべき問題

計画期間 20 年 [A-100] の間に、AS/IdP 製品・認可エンジン・PEP SDK をそれぞれ少なくとも 1 回置き換え [A-104]、暗号も少なくとも 1 回移行する [A-103]。それでも外部に配った識別子だけは変えずに保つ必要がある [D]。旧提案は「sub は不変の opaque ID」とだけ書き、根拠を示していなかった。この主張は処置「維持」で本書へ移された（CL-0127）[D]。

| 識別子 | 配布先 | 変えた場合に作業が生じる相手と規模（基準シナリオ） |
|---|---|---|
| issuer URL | 外部 RP、第三者 client、顧客の OIDC 設定 | 外部 client 800 [A-013]、OIDC 連携 200 [A-114]。内部 RS（300 [A-050]）は ADR-005 V4 の内部 issuer だけを受け取るので、外部 issuer の影響を直接は受けない [D] |
| sub・tid | 依存サービスの保存データ、外部 RP の利用者キー | 300 サービス [A-050]、登録 100 万（5 年後 300 万）[A-001][A-102] |
| WebAuthn RP ID | 利用者の認証器の中の credential | 自社で認証する 47.5 万人のうち、フィッシング耐性ありの 7%（約 3.3 万人）[A-115]。passkey が普及すれば、その分だけ増える |
| SAML SP entityID・ACS | 顧客 IdP の設定 | SAML 1,800 接続 [A-114] |
| client_id | client の設定、grant | client 800、grant 3 万 [A-013] |
| 名前空間・claim 名 | 認可モデル、tuple、policy、契約、事象 | 事業ドメイン 30 [A-051]、tuple 7.55 億 [A-049] |

OpenID 2.0 から OIDC への移行では、利用者の識別子を移すためだけに専用の標準（OpenID 2.0 to OpenID Connect Migration 1.0、2015-04-16 Final）が作られた [N][^27]（RS-11#68）。識別子の移行は、標準化が必要になるほどの費用を生むということである [D]。

本書が答える問いは次の 8 つである [D]。

| # | 問い | 主な R/G | 本書の節 |
|---|---|---|---|
| Q1 | issuer をどの粒度で分けるか（単一、信頼区画、cell・リージョン、テナント）。どのドメインに置くか | G-067, R-209, R-161 | D21-01〜08 |
| Q2 | sub・tid・オブジェクト ID の形式。不透明・不変・再利用しない・email に依存しない・nOAuth 対策 | R-037, R-047, G-086, G-101 | D21-09〜14 |
| Q3 | WebAuthn RP ID と user handle。IdP を乗り換えた後も passkey を使えるか | R-043, R-090, R-203, R-208 | D21-15〜18 |
| Q4 | SAML entityID と ACS | R-036, R-046, R-047 | D21-19〜21 |
| Q5 | OAuth client_id | R-158, R-161 | D21-22〜24 |
| Q6 | リソース型・action・relation・scope・claim 名・事象 type の名前空間 | R-105, R-109, R-140, G-116 | D21-25〜28 |
| Q7 | テナントの統合・分割・cell 間移動、M&A、事業売却 | R-150, R-209, G-075 | D21-29〜33 |
| Q8 | 相関識別子（相談事項 1）と、将来に備えて付加する claim（相談事項 2） | R-118, R-128 | D21-34〜40 |

### 1.2 攻撃者モデル（識別子の形式で残余リスクを下げる対象）

| 攻撃者 | 識別子に関わる攻撃 | 一次報告・規範 |
|---|---|---|
| FAPI A1a（AS として参加する web attacker）、ATK-04（侵害された顧客 IdP） | issuer mix-up、他テナント宛ての assertion の注入 | RFC 9700 [N][^6]（RS-04#4）、SP 800-63C-4 [N][^8] |
| ATK-02（悪意あるテナント管理者）、ATK-04 | 自テナントで被害者の email を設定し、email で結合するアプリの account を乗っ取る（nOAuth） | Descope [I][^14]（RS-03#61）、MSRC [I][^15]（RS-03#62）。Semperis の 2025 年の調査では、セルフサインアップ可能な 104 アプリのうち 9 アプリが脆弱だった [I][^16]（RS-12#44） |
| ATK-06（侵害された microservice）と鍵の侵害 | 鍵スコープの検証漏れによる区画越え、送信元テナントを検証しない API | Storm-0558: consumer と enterprise の鍵が共通の metadata endpoint に並び、利用側が issuer/scope の検証を追加しなかった [I][^17]（RS-12#5）。CVE-2025-55241 [I][^18]（RS-12#53） |
| ATK-01（外部攻撃者）、ATK-19（変更・自動化の誤り） | ドメインの失効・奪取、DNS 記録の再投入、サブドメインの乗っ取りによる RP ID・issuer の悪用 | 新しい所有者による旧記録の再投入 [N][^31]（RS-14#27） |
| ATK-10（policy author）、ATK-17（内部不正の開発者） | 名前空間の衝突・乗っ取り（他ドメインの type・relation の再定義） | OpenFGA modular models の type extension の制約 [V][^29]（RS-17#85） |

### 1.3 制約（規範。強度は原文どおり）

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-1 | `sub` は Issuer の中で局所的に一意で、再割当てしない。255 文字以下の ASCII で、大文字と小文字を区別する。RP が安定識別子として頼れるのは `iss` と `sub` の組だけである。email・phone_number・preferred_username・name を一意識別子に使ってはならない。Issuer は email の値を時期を変えて別の利用者に再利用してよい | MUST NOT / MAY | OIDC Core §2, §5.7 [N][^1]（RS-03#58, RS-14#1） |
| N-2 | pairwise では、Sector Identifier ごとに一意の sub を計算する。値は OP 以外が逆算できてはならない。異なる Sector Identifier からは異なる値を出す。算出は決定的でなければならない | MUST / MUST NOT | OIDC Core §8, §8.1 [N][^2]（統合時に取得） |
| N-3 | OP metadata の issuer は、ID Token の iss と同一でなければならない。RP は、構成要求に使った Issuer URL、metadata の issuer、iss の完全一致を確かめる。RFC 8414 でも同一性が MUST で、一致しない応答は使ってはならない | MUST / MUST NOT | OIDC Discovery §3, §7 [N][^3]（RS-16#17）、RFC 8414 §3.3 [N][^4]（RS-16#18） |
| N-4 | 認可応答の iss は、query と fragment を含まない https URL にする。クライアントは単純な文字列比較で照合する | MUST | RFC 9207 §2 [N][^5]（RS-04#71） |
| N-5 | 複数の AS と対話するクライアントでは、mix-up 対策が REQUIRED である（適用条件付き。DS-18）。client_id と利用者識別子が共通の名前空間にある場合は、クライアントが利用者と混同され得る claim に影響を与えられるようにすべきでない。避けられないなら、RS が区別できる手段を設けなければならない | REQUIRED / SHOULD NOT / MUST | RFC 9700 §2.6, §4.4, §4.15.1 [N][^6]（RS-04#4, #22） |
| N-6 | JWT が iss を含む場合、使われた鍵がその issuer に属することを検証し、属さなければ拒否する | MUST | RFC 8725 §3.8 [N][^7]（RS-05#36） |
| N-7 | RP は subject を IdP をまたいで一意として扱ってはならない。FAL2 以上では、連携 ID に平文の個人情報を含めてはならない。account linking には認証済み session が要る（SHALL）。その session では既存の連携 ID で認証させるべきである（SHOULD）。IdP の allowlist ではワイルドカードのドメイン識別子を使ってはならない。識別子と鍵の更新手順は trust agreement で定め、認証された保護経路で実行する | SHALL NOT / SHALL / SHOULD | SP 800-63C-4 §3.4, §3.6.1, §3.8.1, §4.6.2.1, §4.9 [N][^8]（RS-03#57, #59, RS-14#2, #14, #15） |
| N-8 | public key credential は、登録したときと同じ RP ID でしか使えない。RP ID は origin の effective domain と同じか、その registrable domain suffix でなければならない。related origins を使う場合は全 origin で共通の RP ID を選び、`/.well-known/webauthn` を置く。クライアントが支援を義務づけられる registrable origin label は、少なくとも 5 つである | MUST | WebAuthn L3 §4, §5.11 [N][^9]（RS-03#29, RS-15#59） |
| N-9 | user handle は最大 64 byte の不透明なバイト列で、利用者には表示しない。username や email などの個人識別情報を含めてはならない | MUST NOT | WebAuthn L3 §5.4.3 [N][^10]（統合時に取得） |
| N-10 | SAML の entity identifier は 1024 文字以下の URI である。自ドメインを含む URL で自らを識別することが RECOMMENDED である。persistent NameID は、利用者の実識別子と対応の分からない擬似乱数で作らなければならず、256 文字を超えてはならない | 構文規定 / RECOMMENDED / MUST / MUST NOT | SAML 2.0 Core §8.3.6, §8.3.7 [N][^44]（統合時に取得） |
| N-11 | SCIM の id は安定していて再割当てできず、クライアントが指定してはならない。削除済みと同じ userName での作成を 409 で拒否すべきでない。したがって userName は時間をまたいで一意とは限らない | MUST / MUST NOT / SHOULD NOT | RFC 7643 §3.1 [N][^21]（RS-03#75）、RFC 7644 §3.6 [N][^20]（RS-14#10） |
| N-12 | UUID は、推測困難だと仮定すべきでなく、security capability（持っているだけでアクセスできる識別子）として使ってはならない。UUIDv4 の乱数は 122 bit である。UUIDv7 の先頭 48 bit は Unix 時刻（ミリ秒）である | SHOULD NOT / MUST NOT | RFC 9562 §5.4, §5.7, §8 [N][^45]（統合時に取得） |
| N-13 | JWT の新しい claim 名は、IANA「JSON Web Token Claims」registry に登録するか、衝突耐性のある名前にすべきである。Private Name は衝突し得るので注意して使うべきである | should（小文字。RFC 2119 の規範語ではない） | RFC 7519 §4.2, §4.3 [N][^36]（統合時に取得） |
| N-14 | jti は、偶然一致する確率が無視できるように割り当てなければならない。issuer が複数ある場合は、issuer 間の衝突も防がなければならない。jti 自体は OPTIONAL である | MUST / OPTIONAL | RFC 7519 §4.1.7 [N][^36] |
| N-15 | ネイティブアプリの private-use URI scheme には、自分が管理するドメイン名を逆順にした名前を使う | MUST | RFC 8252 §7.1 [N][^46]（RS-17#8） |
| N-16 | IANA registry に登録した alg 識別子は変更・削除すべきでない（deprecated の印を付ける） | SHOULD NOT | RFC 7696 §5 [N][^26]（RS-11#40） |
| N-17 | CloudEvents の type には reverse-DNS 名を前置すべきである。source と id の組は事象ごとに一意にしなければならない | SHOULD / MUST | CloudEvents 1.0.2 [N][^28]（RS-16#9, #10） |
| N-18 | AuthZEN の情報モデルでは、Subject と Resource に type と id が REQUIRED である | REQUIRED | AuthZEN Authorization API 1.0 §5 [N][^47]（RS-07#63） |
| N-19 | SPIFFE の trust domain 名は自己登録であり、大域的な一意性は保証されない。自社が登録しているドメイン名を接尾辞に使うと衝突の可能性が下がる。WIMSE アーキテクチャ草案は、trust domain を FQDN で識別すべき（SHOULD）としている（draft-08、IESG 未提出） | 助言 / SHOULD | SPIFFE-ID §2.1.1 [N][^22]（RS-06#7）、WIMSE arch §3.1.1 [N][^23]（RS-06#17） |

### 1.4 事故と製品の前例

- **nOAuth**: Azure AD（当時）の email claim は変更可能で、未検証だった [I][^14]。そのため email で account を統合するアプリでは、攻撃者が自分のテナントで被害者の email を設定して乗っ取れた [I][^14]（RS-03#61）。MSRC は、email claim を認可に使ってはならないとした [I][^15]（RS-03#62）。Microsoft は `tid` と `oid` の組をキーにするよう示している [V][^13]（RS-03#64）。
- **Storm-0558**: 2018 年に consumer と enterprise の共通の鍵メタデータ endpoint が導入された [I][^17]。一方で、検証ライブラリは鍵スコープの検証を自動化するようには更新されなかった [I][^17]。利用側の開発者は、ライブラリが検証すると誤認していた [I][^17]（RS-12#5）。教訓は 2 つある。区画の分離を利用側の追加検証だけに任せないこと、そして鍵スコープの検証を SDK の既定にすることである [D]。
- **製品の RP ID**: Auth0 では、ドメイン名が変わると旧ドメインに紐付いた passkey は無効になる [V][^32]（RS-15#46）。Cognito では、条件によって RP ID を custom domain の FQDN にしなければならない [V][^33]（RS-15#54）。passkey の秘密鍵は authenticator 側にある。移行で運べるのは RP 側の公開鍵 credential の記録だけである（RS-15#60 の (a)。RS-15 の検証済み主張から導いたもの）[D]。
- **passkey 移行の標準**: CXF 1.0 は Proposed Standard（2026-03-09 errata 版）である [N][^11]。CXP 1.0 は Working Draft（2024-10-03）のままである [N][^12]（RS-03#30）。

### 1.5 前提（A-ID）と新規仮定

| A-ID | 値（基準） | 本書への効き方 |
|---|---|---|
| A-001, A-102 | 登録 100 万（5 年後 300 万） | sub の払出し数。墓石の件数 |
| A-007, A-009 | テナント 1 万（成長 2.5 万）、最大 10 万人 | テナント別 issuer にした場合の issuer 数 |
| A-010 | B2C 6 realm（ブランド×法域）、最大 realm 12 万 | 消費者区画の中の分割（区画 issuer を分けるか、区画内の分割にとどめるか。K21-1） |
| A-013 | client 800（第三者 150＋顧客自作 650）、grant 3 万 | issuer 粒度の費用、pairwise の対象 |
| A-014 | AI エージェント ID 1 万（範囲 1,000〜20 万） | 主体類型 claim と委任 claim の必要性 |
| A-015 | 複数テナント所属 3%（2.1 万） | sub をテナントから独立させる根拠 |
| A-027 | access token 寿命 10 分（容量計算用の仮置き） | token に要求単位の trace-id を入れられない理由 |
| A-050, A-051, A-052 | 300 サービス、30 ドメイン、25 組織 | 名前空間の単位と、検査の対象数 |
| A-054 | プラットフォームチーム 24 FTE（認証 5、PEP SDK 4、SRE 6 ほか） | 運用費の分母 |
| A-062, A-063 | 所在地指定 5%（500 テナント）、4 リージョン | issuer をリージョンから切り離す根拠 |
| A-081 | 高保証テナント 50（成長 150、規制強化 600） | 専用 issuer 枠の件数 |
| A-100, A-101, A-103, A-104 | 20 年、3〜5 年ごとの再決裁、暗号移行 1 回以上、製品置換 1 回以上 | 識別子に製品名・alg 名を入れない根拠 |
| A-111 | 既存 12 ストア、重複 15% | 移行時の linking と識別子の付け直し |
| A-114 | SAML 1,800・OIDC 200 接続 | entityID/ACS を変えた場合に顧客側で必要になる再設定の件数 |
| A-115 | 自社で認証する 47.5 万人。フィッシング耐性あり 7% | passkey の再登録の規模 |

**新規仮定（前提台帳へ追加要）**

| 仮 ID | 内容 | 仮置き値 | 効くところ |
|---|---|---|---|
| NA-021-1 | 外部 RP・第三者 client のうち、複数 issuer の動的な発見と検証を実装できるものの比率（ops 案由来） | 基準 30%、範囲 10〜60% | 案D（テナント別 issuer）の費用 |
| NA-021-2 | 計画期間中に、事業単位の売却（carve-out）または買収が 1 回以上起きる（evo 案由来） | 1 回以上、範囲 0〜3 回 | K21-2（事業単位ごとに専用 domain を持たせるか） |
| NA-021-3 | 識別子専用 registrable domain を、商号変更や M&A の後も 20 年以上保有し続けられる（sec 案由来） | 保有を継続する | D21-01 の前提 |
| NA-021-4 | テナント統合・分割の年間件数（ops 案由来） | TBD（所有者: 営業・顧客成功責任者、期限: G3、決め方: 過去 5 年の契約変更実績から推定） | 案D の運用費 |
| NA-021-5 | 第三者 client 1 件あたりの、テナント別 issuer への改修工数 | 1〜5 人日（仮置き。所有者: プロダクト責任者、期限: G3、決め方: 代表的な第三者 3 社へのヒアリング） | 案D の費用 |

### 1.6 既存文書との関係（対立点を含む）

- tenant-lifecycle の INV-1 と INV-2 は、本書への必須入力である [D]。INV-1 は、テナント ID を issuer・資源 ID・cell 名・kid に埋め込まないことを定める。INV-2 は、cell 間移動の前後で (iss, sub) を変えないことを定める。K-8 は「(b) 共通 issuer＋tid＋cell 別署名鍵」を推奨している [D]。
- **ADR-007 は「テナント／realm ごとの不変 issuer」を ADR-021 に要求している（KD7-1）。その理由は、外部 RP でも、RFC 8725 §3.8 と OIDC の issuer 一致という標準の検証だけで cell 単位の封じ込めが効くためである。本書の推奨（信頼区画 issuer＋cell 別鍵）はこれと対立する** [D]。本書の推奨を採ると、第三者 RP での cell 単位の封じ込めは失われる。この差分は残余リスク RR21-01 として受容者を置く（§6.3）[D]。issuer の粒度は、ADR-007 KD7-1 と本書 K21-1 を DEC-3 で同時に決裁する [D]。**未決の論点（整合調整で明記）**: この対立は ADR-001（D4-1 の issuer、D16-2 の置換単位）、ADR-013（G2 の DNS 構成、規制スコープ cell、KD13-3）と 03_threat-model/threat-catalog.md（テナントごとの不変 issuer を予防策に挙げる行）にも波及する。整合調整では各文書に条件付きの記述を置き、経緯を 05_adr/reconciliation-notes.md の U-01 にまとめた [D]。
- principal-catalog §3.2 は、sub の文字列から主体類型を推論させないこと（接頭辞を付けないこと）と、単一の名前空間から払い出すことを定めている。本書はこれに従う [D]。
- ADR-005 は、内部 RS が受け取るのは cell ごとの内部 issuer の JWT だけとしている（V4）。また、1 つの token に載せる tid は 1 つだけとしている（V9）[D]。本書はこれを前提にする。

### 1.7 関連研究

RS-03#29, #30, #57〜#59, #61〜#64, #66, #75／RS-04#4, #22, #60, #61, #71／RS-05#36／RS-06#7, #17, #27, #29, #31, #35, #36, #40, #41 と結論 7・13／RS-07#63／RS-10#16〜#18, #22／RS-11#40, #43, #68／RS-12#5, #42〜#44, #53／RS-14#1, #2, #10, #14, #15, #24, #25, #27／RS-15#46, #54, #59, #60／RS-16#9, #10, #17, #18／RS-17#8, #85, #88 [D]。

### 1.8 範囲

- 範囲は、外部の当事者が保存・設定・登録する識別子と名前である [D]。外部の当事者とは、RP、RS、顧客 IdP、認証器、第三者 client、監査の消費者を指す。
- token の種別・typ・寿命は ADR-005 で扱う [D]。alg と鍵階層は ADR-015 と ADR-007、テナントの状態遷移の手順は ADR-028 と DL-49、監査イベントのスキーマは ADR-014 と DL-77 で扱う [D]。
- SPIFFE の trust domain 名と Txn-Token の採否は ADR-009 で決める [D]。本書が定めるのは、それらが従う命名と形式の規則だけである（D21-28、D21-36）[D]。

---

## 2. 決定

### 2.1 ドメインと issuer（Q1）

- **D21-01** 識別子は、すべて識別子専用の自社所有 registrable domain `<id-domain>` の下に置く [D][NA-021-3]。
  - 名称にはブランド名・製品名・組織名を含めない [D]。識別子に組織名を含めると、組織再編や M&A のたびに識別子が変わるためである（durability-charter §5.3 原則 3、R-209）[D]。
  - 名称の選定は事業責任者と法務の決定（区分 B）とする [D]。
  - ベンダーやクラウド事業者のドメインは、本番の外部契約に使わない [D]（RS-15#46, #54）。
- **D21-02** `<id-domain>` は次の統制で守る [D]。
  - registrar の registry lock
  - 長期の登録と自動更新
  - DNSSEC 署名
  - CAA による発行 CA の限定
  - ゾーンと登録名義の変更に対する二者統制（ADR-008）
  - 複数の DNS 事業者
  - 保有状態と失効期限の KRI 監視（01_governance/kri.md へ追加要）

  `<id-domain>` の下には、顧客ごとのサブドメインや、顧客が CNAME を向けるサブドメインを作らない [D]。apex とその配下の origin は、すべて基盤チームの管理下に置く [D]。理由は、同じ registrable domain の配下の origin がサブドメイン乗っ取りの踏み台になり得るためである（RS-17#3 の SameSite に関する指摘、N-8 の suffix 規則から導出）[D]。
- **D21-03** 本番の issuer は「信頼区画」ごとに 1 つとし、`https://<p>.<id-domain>` の形にする [D]。
  - `<p>` は台帳で払い出す短い不透明ラベルである [D]。
  - path・query・fragment は持たせない [N][^5][D]。path を持たせないのは、discovery の配置の誤りを減らすためと、将来ホスト単位で委任・移管できるようにするためである [D]。
  - 信頼区画とは、署名鍵・ポリシー・母集団を相互に受理してはならない単位を指す [D]。
  - 基準の区画は次の 3 つである [D]。sandbox だけは別の registrable domain に置き、本番の RP ID・cookie の範囲・信頼アンカーと構造上重ならないようにする（G-141、RS-12#15 の非本番テナントからの侵入）[D]。
    - `prod-enterprise`: B2B 顧客と従業員
    - `prod-consumer`: B2C
    - `sandbox`
  - 従業員を `prod-enterprise` から分けて別区画にするかどうかは、K21-1 で決める [D]。
  - 区画ごとに JWKS・署名鍵・ポリシーを分ける [D]。
  - 理由: 区画を issuer で分けておけば、外部 RP でも、鍵と issuer の結合検証（N-6 の MUST）と issuer の完全一致（N-3）という標準の検証だけで、区画をまたぐ受理を拒否できる [D]。Storm-0558 型の区画越え（RS-12#5）を、利用側の追加検証に頼らずに防げる [D]。
- **D21-04** A-010 の B2C 6 realm（ブランド×法域）は、`prod-consumer` 区画の中の分割として扱う。区画 issuer は分けない [D][A-010]。ただし、K21-2 で売却可能性のある事業単位と判定されたブランドは、最初から独自の専用 domain と独自の区画 issuer を持たせる [D][NA-021-2]。
- **D21-05** 高保証テナント（A-081 の基準 50、規制強化で 600）のうち、契約で専用の封じ込め単位を求めたテナントには、専用 issuer `https://<dedicated-key>.<id-domain>` を払い出す [D][A-081]（G-139）。
  - `dedicated-key` は不透明な値で、tid とは別のものである [D]。
  - 専用 issuer にするかどうかは、テナント作成時か契約締結時に決める [D]。共有区画と専用 issuer の間の移動は、既定ではなく例外として扱う [D]。移動の手順は D21-32 に置く。
  - 規制が所在地ごとに独立した発行者を求めた場合の「規制分離 issuer」もこの枠で提供し、ラベルには法域名を入れない [D]。
  - 枠の上限は K21-3 で決める [D]。
- **D21-06** issuer には、cell、リージョン、テナント ID、ブランド、製品名、alg 名、版番号を含めない [D]（INV-1、INV-2、RS-11#40, #43）。
  - データ所在地は、cell ごとの署名鍵（kid は不透明値）と、鍵とテナント・cell の結合検証（D21-07）で表す [D]。
  - cell 間を移動しても (iss, sub) は変えない [D]（INV-2）。K-8 は (b) を採る [D]。
- **D21-07** 鍵は「区画（または専用 issuer）× cell」の単位で分ける（ADR-007）[D]。区画の JWKS には、その区画のすべての cell の有効な鍵を載せる [D]。
  - 第一者の検証点（共通 SDK・sidecar・edge・BFF）は、次の 3 点を既定で検証する。利用側はこの検証を無効にできない [D]。
    - (a) kid がその issuer の JWKS にあること（N-6）[N][^7]
    - (b) 鍵の cell と、token の tid が現在割り当てられている cell が一致すること
    - (c) 区画の間で鍵を共有していないこと
  - cell 間の移動中は、移動元と移動先の両方の鍵を受理する（tenant-lifecycle INV-2）[D]。
  - テナント→cell の対応表は、署名した静的な配布物として検証点に配る [D]。対応表を取得できない場合は、最後に検証できた版を期限内に限って使い、期限が切れたら拒否する（fail-closed）[D]。期限の値と p99 の遅延予算は TC-021-03 で決める（TBD。所有者: SRE 責任者、期限: G4）[D]。
  - Storm-0558 では、開発者がライブラリによる検証を誤認した（§1.4）。そのため、この検証は SDK の既定とし、契約試験（DL-80）で検査する [D]。
- **D21-08** cell ごとの**内部 issuer**（ADR-005 V4）は可逆とし、不可逆識別子に含めない [D]。依存サービスは、内部 issuer の値を利用者や資源の参照キーとして保存してはならない [D]。保存してよいのは、区画の issuer と sub の組、および tid である [D]。これを契約試験（DL-80）で検査する [D]。
- **D21-08b** discovery 文書と JWKS は、静的な配布物として複数リージョンから配信する [D]。global な動的部品にはしない（ADR-013・ADR-023 と整合させる）[D]。

### 2.2 sub・tid・オブジェクト ID（Q2）

- **D21-09** sub は基盤が払い出す。
  - 中身: CSPRNG による 122 bit 以上の乱数である [D]。
  - 契約: 外部に約束するのは「64 文字以下の ASCII の不透明文字列として扱い、大文字と小文字を区別して比較し、解析しないこと」だけとする [D]。払い出す値は小文字の英数字だけで構成する [D]。こうしておけば、大文字と小文字を同一視するストアでも衝突しない [D]。
  - 符号化: 候補は、RFC 4648 の base32 alphabet を小文字化した自社表記（padding なし、26 文字）と、UUIDv4 の正準表記（小文字 36 文字）の 2 つである。どちらにするかは DL-71 で決める（TBD。所有者: 認証チーム、期限: G3、決め方: TC-021-08 の相互運用試験）[D]。
  - 符号化を変えても、払い出し済みの値は変えない [D]。このため、符号化方式そのものは新規の払出しについて可逆である [D]。
  - 含めないもの: 時刻、テナント、リージョン、主体類型、連番、email の hash、製品内部 ID [D]。
  - 時刻を含む形式（UUIDv7 など）は、作成時期を漏らすので外部に出す ID には使わない [N][^45][D]。
- **D21-10** sub は、全類型（利用者、service account、エージェント、client の service principal を含む）に共通の単一名前空間から払い出す [D]。
  - 類型は別の claim で運ぶ（principal-catalog §3.2、R-029）[D]。
  - 値は基盤が払い出し、登録者は選べない（N-5 を満たす）[D]。
  - sub はテナントに属さない。複数のテナントに所属しても、統合・分割・所属変更があっても変わらない [D][A-015]。
- **D21-11** sub は**製品の内部 ID と切り離す**。
  - IdP 製品には、自社の sub を属性として持たせ、それを `sub` claim として出力させる [D]。
  - これができない製品は採用しない（ADR-001 と DL-13 の必須要件）[D]。乗換えのたびに識別子の移行標準が必要になる事態（RS-11#68）を避けるためである [D]。
- **D21-12** tid は D21-09 と同じ規則で払い出す [D]。
  - 顧客名・ドメイン名・契約番号から導かない [D]。
  - 人が読む slug は可変の表示属性とし、識別や認可には使わない [D]。
  - 1 つの token に載せる tid は 1 つだけとする（ADR-005 V9）[D]。
- **D21-13** 削除した sub・tid・client_id・接続 ID は、計画期間 [A-100] を通じて墓石として保持し、再発番しない [D]。
  - 墓石に残すのは、不透明値と削除日だけである。個人情報は残さない [D]。
  - 規模は 5 年後の 300 万主体 [A-102] × 約 100 byte ≈ 300 MB の桁で、費用要因にはならない [D]。
  - SCIM の id を再割り当てしない規則（N-11）を、本基盤の全識別子に広げる [D]。
- **D21-14** 業務オブジェクトの ID は各ドメインが払い出してよい。ただし次の条件を守る [D]。
  - テナント ID、個人情報、業務上の意味（患者名・疾病名など）を含めない [D]（INV-1、data-classification）。
  - 122 bit 以上の乱数（UUIDv4 相当）を最低線とする [D]。
  - ID の推測困難性をアクセス制御の根拠にしない（N-12 の MUST NOT）[N][^45]。
  - PEP は、オブジェクトの所属テナントを資源側の正本から導き、token の tid と突き合わせる（R-250）[D]。
  - 時刻順の ID は、外部に出ない内部の DB キーに限って、各ドメインの判断で使ってよい [D]。
- **D21-14b** 外部 IdP に由来する連携 ID は、（tid、上流の IdP 識別子［OIDC issuer／SAML entityID］、外部 subject）の 3 つ組で記録し、本基盤の sub とは別に持つ [N][^8][D]（RS-14#2、R-047）。
  - Entra に由来する連携では、外部 subject に `tid`＋`oid` を使う [V][^13]（RS-03#64）。
  - SAML では persistent NameID を要求する [D]。email 形式の NameID は結合キーに使わない [D]。
  - IdP の allowlist ではワイルドカードを使わない（N-7）[N][^8]。
- **D21-14c** 結合キー（account linking）の規則は次のとおりとする [D]。
  - email、電話番号、preferred_username、UPN、SCIM の userName と externalId は、識別子・結合キー・認可のどれにも使わない [N][^1][N][^20][I][^14][V][^13][D]。
  - 共通 SDK は、これらの claim を結合キーに使う API を提供しない [D]。
  - account linking は、認証済み session の中で、既存の連携 ID による再認証を経た場合にだけ許す [D]。これは SP 800-63C-4 の認証済み session の要求（SHALL）と、既存の連携 ID で認証させる推奨（SHOULD）から導いた自社規則である [N][^8]（RS-03#59、RS-03 結論 8）。
  - email の一致による自動 linking は、管理画面の設定でも有効にできないようにする [D]。
  - Entra の `xms_edov` などのドメイン検証済み表示は、表示用途に限り、結合の根拠には使わない [D]（RS-03#63 から導出）。
  - RISC の `identifier-recycled` を受信したら、その email・電話番号に結び付いた回復先・通知先・未承諾の招待を凍結し、利用者に再確認させる [N][^19][D]（RS-03#66）。

### 2.3 pairwise（Q2 の副論点）

- **D21-14d** sub の種類は次のように使い分ける [D]。
  - 第一者の client（自社の BFF、アプリ、内部 RP）には public の sub を渡す [D]。
  - 第三者アプリと顧客が自作した client（A-013 の 800）に渡す ID Token と UserInfo には、pairwise を既定にする [D]。目的は、client の間で利用者の行動を許可なく相関させないことである [N][^2]。
  - Sector Identifier は client の登録時に固定し、変更を認めない（登録審査の項目にする）[D]。
  - pairwise の採否は非対称に不可逆である [D]。pairwise から public に変えると相関を許す方向の変更になり、逆向きに変えると連携先の保存データを壊す。
- **D21-14e** pairwise の計算に使う秘密は、鍵階層（ADR-007）で管理する [D]。アルゴリズムと秘密を製品の外へ持ち出し、乗換え先でも同じ値を再計算できることを、調達要件にする（ADR-001、DL-13）[D]。これは N-2 の「決定的であること」（MUST）を製品の乗換えをまたいで保つための条件である [D]。

### 2.4 WebAuthn RP ID と user handle（Q3）

- **D21-15** RP ID は、信頼区画の login ホスト `<p>.<id-domain>` にする [D]。
  - そのホストは、認証の画面と API だけに使う [D]。
  - apex にしない理由は 2 つある。企業区画と消費者区画の passkey を RP ID の層でも分けるため、そして `<id-domain>` の他のサブドメインを credential の要求主体から外すためである [N][^9][D]。
  - 専用 issuer（D21-05）のテナントは、所属する区画の RP ID を使う [D]。共有区画と専用 issuer の間を移動しても passkey は使える [D]。
- **D21-16** ブランドドメインのアプリから ceremony を行う必要がある場合は、related origins（`/.well-known/webauthn`）を使う [D]。列挙する registrable origin label は 5 以下に抑える [N][^9][D]。6 つ目以降は、そのドメインから login ホストへ遷移させる [D]。顧客別の vanity domain は、canonical な login origin への転送にだけ使い、RP ID にも issuer にもしない [D]。
- **D21-17** user handle は sub とは別に、32 byte の乱数として払い出す [D]。
  - 個人識別情報は含めない（N-9 の MUST NOT）[N][^10]。
  - sub を流用しない理由: user handle は認証器の内部に残る [D]。sub と分けておけば、sub が漏れても認証器側の記録と対応付けられない [D]。
- **D21-18** IdP 製品を乗り換えた後も passkey を使えるための必要条件は、次の 4 つである。これを ADR-001 と DL-13 の必須要件にし、PoC（TC-021-04）の対象にする [D]。
  - (a) 自社のホストを RP ID として使えること（カスタムドメイン）
  - (b) credential record を export できること。対象は credential ID、公開鍵、署名カウンタ、user handle、BE/BS フラグ、登録日時である
  - (c) 乗換え先の製品が、その記録を import できること
  - (d) import した credential で認証が通ること

  認証器プロバイダの間で passkey を移す CXF/CXP は、20 年の前提にしない [N][^11][^12][D]。

### 2.5 SAML entityID と ACS（Q4）

- **D21-19** 顧客 IdP と接続するときに本基盤が SP として名乗る entityID は `https://sso.<id-domain>/s/<接続 ID>` とし、ACS は `https://sso.<id-domain>/s/<接続 ID>/acs` とする [D]。
  - 接続 ID は D21-09 と同じ規則で払い出し、tid とは別の値にする [D]。
  - entityID の長さは 1024 文字以下で、自ドメインを含む URL にする（N-10 の RECOMMENDED）[N][^44]。
  - 製品固有のパス（製品名や realm 名）は、自社の edge・reverse proxy の背後に隠し、rewrite で対応させる [D]。
  - 顧客 IdP 向けの OIDC redirect_uri も、同じ方針で接続ごとの固定パスとする [D]。
- **D21-20** 接続はテナントに属する [D]。テナントの統合・分割・cell 間移動では、接続の所属を付け替えるだけで、entityID と ACS は変えない [D]。cell への振り分けは router が行い、ホスト名に cell 名を入れない [D]。
  - 理由: assertion の Audience が接続（＝テナントと IdP の組）に結び付く [D]。そのため、テナント A の IdP の assertion をテナント B の ACS に出しても、audience の不一致で拒否される（ATK-04 の注入対策）[D]。
- **D21-21** 本基盤が IdP として下流の SaaS に SAML を出す場合は、次のとおりとする [D]。
  - Issuer（IdP entityID）は、その区画の issuer と同じ文字列にする [D]。
  - persistent NameID は D21-14d の pairwise 規則に従い、擬似乱数で 256 文字以下にする [N][^44][D]。
  - 既存の SAML 接続 1,800 件 [A-114] を接続ごとの entityID に移すと、顧客側の再設定が 1 回発生する [D]。移行の方式（並行運用の期間、通知、セルフサービス）は ADR-004 と DL-31 で決め、完了率と所要期間を PoC とパイロットで確かめる（TC-021-07）[D]。

### 2.6 OAuth client_id（Q5）

- **D21-22** client_id は D21-09 と同じ規則で基盤が払い出す [D]。
  - 登録者が値を選ぶこと、値を再利用すること、テナント名・製品名・ベンダー名・環境名を埋め込むことは禁止する [N][^6][D]。
  - 環境ごとに別の client として登録する（G-141）[D]。
  - 所有テナントと所有者は client metadata に持たせ、client_id から推論させない [D]。
- **D21-23** client_id の値域は sub と分ける [D]。
  - 方式は、client 専用の発番空間にするか、区別子を構造として持たせるかのどちらかで、PoC の後に DL-71 で決める（TBD。所有者: 認証チーム、期限: G3、決め方: TC-021-05）[D]。
  - client が主体になる token では、主体類型を別の claim で示し、RS が区別できるようにする（N-5 の MUST）[D]。
  - 根拠: RFC 9068 §5 は、client credentials で client の識別子を sub に使う場合、悪意ある client が高権限の resource owner の sub を選べてしまう危険を指摘している [N][^43]。
- **D21-24** ネイティブアプリの private-use URI scheme は、`<id-domain>` を逆順にした名前にする [N][^46][D]。ベンダーの名前空間は使わない [D]。

### 2.7 名前空間（Q6）

- **D21-25** 中央の名前空間台帳（DL-71 の付表）を置く [D]。
  - 所有者は、プラットフォームのプロダクト責任者とする（K21-5）[D]。
  - 各事業ドメインには、組織名・チーム名・製品名を含まない名前空間コード（事業能力のカタログ ID）を払い出す [D][A-051]。
  - 払い出したコードは再利用しない [D]。
  - ベンダーや組織は 20 年のうちに入れ替わる。そのため、名前の所有は事業能力に結び付ける [D]。
- **D21-26** 正規名の形は次のとおりとする [D]。
  - リソース型は `<名前空間コード>/<型名>` とする [D]。
  - action と relation は、型の内側で一意にする [D]。
  - AuthZEN の Subject.type・Resource.type（N-18）、認可モデルの型名、監査の resource 型は、この値で揃える [N][^47][D]。
  - 認可エンジン固有の構文への写像は、生成ツールで持つ（ADR-011）[D]。
  - 横断型（user、tenant、group、client、workload、共有・ゲスト）は、基盤が所有する予約名前空間 `core` に置く [D]。各ドメインは type extension で拡張してよいが、既存の relation と重なる追加は拒否する [V][^29][D]（RS-17#85）。
  - RS-18反映（2026-10-15、追記のみ。本 ADR の決定は変えない）: ARC-05 §3.6 は、テナント配下の組織の木を表す `core/unit` と管理委任範囲の `core/admin_scope` を上の横断型に加える案を決裁案 K05-6 として置いた [D][^48]。採用された場合、この 2 つの型名と relation 名（containment の `parent`、予約語 `ancestor`）は本条の不可逆な名前に加わる [D]。unit・葉ノードの ID は D21-09・D21-14 の不透明 ID とし、パス・テナント・業務上の意味を含めない。主体は D21-10 の sub と型の組 `(type, id)` で運び、依存サービスのデータモデルでも `user_id` ではなく `subject_id`＋`subject_type` で持つ（ARC-15 §3.9）[D]。
- **D21-27** 名前の変更と廃止は次の規則に従う [D]。
  - データがある type・relation の削除と改名は、CI で拒否する [D]。
  - 改名は、追加 → 二重書込み → backfill → 旧参照の削除 → 旧定義の削除と墓石化、という多段の手順でだけ行う [V][^30][D]（RS-17#88）。
  - 削除した名前は再利用しない [D]。廃止は台帳上の deprecated の印で表す [D]。これは RFC 7696 §5 が IANA registry に求める扱い（N-16）を、自社の台帳に写したものである [N][^26][D]。
  - M&A で取り込んだ組織の型には、新しい名前空間コードを払い出す [D]。重複する型は改名手順で統合する [D]。
- **D21-28** 外部に出す名前は、自社所有ドメインで修飾する [D]。
  - CloudEvents の type には `<id-domain>` の reverse-DNS を前置する [N][^28][D]。
  - 第三者に公開する scope は `<名前空間コード>.<型>.<action>` の形にする [D]。
  - SPIFFE trust domain の名前は、`<id-domain>` 配下の FQDN にする（本番用と非本番用に 1 つずつ。N-19）[N][^22][^23][D]。SVID の path に、チーム名・組織名・リージョン名を含めない [D]。採否と詳細は ADR-009 で決める [D]。

### 2.8 統合・分割・M&A・売却（Q7）

- **D21-29** テナントの統合（T08）は、識別子を書き換えずに関係の付け替えで表す [D]。
  - 統合元の tid は墓石にして、再利用しない [D]（INV-1）。
  - 統合元の tid から存続 tid への alias を台帳に記録し、テナント事象（G-137）で依存サービスに通知する [D]。
  - 利用者の (iss, sub)、client_id、資源 ID、SAML 接続 ID は変えない [D]。
  - 切替の後は、統合元の tid を含む token を拒否する（tenant-lifecycle §3.1）[D]。
- **D21-30** テナントの分割（T09）では、切り出す側に新しい tid を払い出し、移る利用者の sub は変えない [D]。同じ区画の中の分割なので、iss も変わらない [D]。
- **D21-31** 他社の ID 基盤を吸収する M&A では、吸収される側の (iss, sub) を上流の連携 ID（D21-14b）として扱い、新しい sub を払い出す [D]。
  - 新しい sub への結合は、利用者の認証済み linking で行う（A-111 の重複 15% を前提にする）[D]。
  - 移行期間中は、旧識別子を token に載せる [D]。前例は OpenID 2.0 移行標準の `openid2_id` である [N][^27]（RS-11#68）。
  - 旧識別子の表現には、RFC 9493 の `sub_id`（`iss_sub` 形式、または `aliases` 形式）を使う [N][^38]。ただし、1 つの主体について複数の識別子を一緒に示すと、意図以上の情報を伝え得る [N][^38]（§6.1）。そのため送るのは、受信側がその対応をすでに知っている場合だけとする [D]。
  - 移行期間の終了日と対応表は、契約で示す（durability-charter §5.3 原則 5）[D]。
- **D21-32** 共有区画と専用 issuer の間をテナントが移るときは、iss が変わる [D]。
  - この移動は例外とし、tenant-lifecycle と ADR-028 の手順に従う [D]。
  - 旧 (iss, sub) と新 (iss, sub) の対応表を、署名した形で連携先に渡す [D]。
  - 移行期間中は、`sub_id` の `aliases` で新旧を示す [N][^38][D]。
  - passkey は RP ID が同じなので、継続して使える（D21-15）[D]。
- **D21-33** 事業を売却する場合に識別子を保てる単位は、専用 domain を持つ事業単位だけである [D][NA-021-2]。
  - その事業単位は、domain を譲渡すれば、issuer・RP ID・entityID を変えずに引き渡せる [D]。
  - `<id-domain>` を共有している区画や、区画の中の一部のテナント・利用者を売却する場合は、識別子を保てない [D]。その場合は、買い手側で D21-31 の移行方式を使う（残余リスク RR21-04）[D]。
  - どの事業単位に専用 domain を最初から持たせるかは、K21-2 で決める [D]。

### 2.9 相関識別子（Q8、相談事項 1 への回答）

- **D21-34** W3C Trace Context の trace-id は、access token・ID Token・Txn-Token のどの claim にも入れない [D]。理由は次の 5 つである [D]。
  - (a) access token は寿命の間（容量計算の仮置きで 10 分 [A-027]）、多数の要求に使い回される [D]。要求単位の trace-id を token に書いても、要求と 1 対 1 に対応しない [D]。
  - (b) Trace Context 自身が、公開 API で外部から来た trace を素直に継続すると、攻撃者が trace-id の衝突を偽造して監視データを使えなくし得ると述べている（§7.2）[N][^34]（RS-10#17）。
  - (c) traceparent と tracestate に個人識別情報や機微な情報を入れることは MUST NOT であり、これらの目的は相関だけである（§6）[N][^34]（RS-10#16）。
  - (d) 安全な網への front gate では、trace を restart（全項目の再生成）してよいとされている（§3.4、§6.1）[N][^34]。trace-id は、経路の途中で付け直され得る値である [D]。
  - (e) OpenTelemetry の Sampler が DROP を返すと、span は記録されず、event と attribute もすべて捨てられる [N][^35]（RS-10#22）。trace だけでは、全件の証跡にならない（R-128）[D]。
- **D21-35** 「共通の認証・認可を通った一貫した要求」であることの証跡は、次の連鎖で残す [D]。

| 層 | 識別子 | 意味 | 根拠 | 証跡としての強さ |
|---|---|---|---|---|
| token | (iss, jti) | token 1 個を一意に示す | jti は偶然一致の確率を無視できるように割り当てる。issuer が複数ある場合は、issuer 間の衝突も防ぐ（MUST）[N][^36]。RFC 9068 の JWT access token では必須 [N][^43]（RS-04#60） | 発行者の署名で守られる。発行台帳と照合すれば偽造を検知できる（ADR-005） |
| session | sid | ログイン session | issuer の中で一意であればよく、RP にとって内容は不透明である。IANA registry の参照先は OIDC Front-Channel Logout 1.0 §3 [N][^39][^40]。Back-Channel Logout 1.0 §2.1 にも同じ定義がある [N][^41] | 署名で守られる。全 session の失効（ADR-019）と監査を結ぶ |
| 内部取引 | txn（Txn-Token の中） | 外部からの 1 要求から始まる内部呼出しの連鎖全体 | Transaction Tokens 草案（draft-11、IESG 未提出）では txn は必須 claim である [N][^25]（RS-06#31）。下流には Txn-Token を無改変で渡す（MUST）[N][^25]（RS-06#35）。置換 token で txn を変えてはならない（MUST NOT）[N][^25]（RS-06#40）。RFC 8417 §2.2 は txn を、関連する複数の JWT の相関に使える OPTIONAL の一意識別子として定めており、SET 以外の JWT でも使える [N][^37] | Txn-Token の発行者の署名で守られる。ただし replay 耐性はない（RS-06#36）ので、各 hop の mTLS や workload ID と組み合わせる |
| 判定 | decision_id | PDP の 1 判定 | DL-71 と ADR-014・DL-77 で定義する [D] | token には載せない。PDP の応答と監査記録に載せ、sampling と独立した経路で全件記録する（R-128） |
| 観測 | trace_id | 分散トレース | W3C Trace Context [N][^34] | 権威を持たない。相関の補助だけに使い、認可にも証跡の真正性にも使わない |

  - 相談の「trace id 的な id」に最も近い役割を担うのは、内部の `txn` である [D]。流れは次のとおりである [D]。
    1. edge が外部の token を検証する。
    2. 取引文脈の発行者（ADR-009 で採否を決める TTS）が、`txn` を 1 回だけ払い出して Txn-Token に入れ、署名する。
    3. 下流の各サービスと PEP は、その署名を検証する。

    これにより、「共通基盤を経由した取引の ID」を、下流サービスと監査が検証できる [D]。
  - Txn-Token の `tctx` には tid を必須で入れ、PEP が資源側のテナントと突き合わせる [D]（RS-06 結論 13）。
  - Txn-Token の発行範囲は ADR-005 D9-3 で write・privileged・break-glass/B・FAPI 範囲に限っている。public・read-sensitive の要求では `txn` がなく、(iss, jti)・sid・decision_id・AuthZEN 要求 ID で相関する。全要求に広げるかは未決の論点 U-02（ADR-005 §2.15、reconciliation-notes）とする [D]（整合調整で追記）。
- **D21-36** Transaction Tokens は Internet-Draft である [N][^25]（RS-06#29）。そのため、`txn` 以外の claim と形式は、RFC になるまで版付きの社内 profile として固定する [D]。`txn` の名前と「一意の取引識別子」という意味は、RFC 8417 の IANA 登録で固定されている [N][^37][^39]。jti・sid・txn・decision_id の値は D21-09 と同じ不透明な乱数形式にし、時刻・ホスト名・cell 名を埋め込まない [D]。
- **D21-37** 監査イベントには、(iss, jti)、sid、txn、decision_id、trace_id の 5 つを、別々の欄として持たせる（ADR-014・DL-77・DL-71 への入力）[D]。整合調整で、ADR-005 D9-2 の grant 参照と ADR-011 D5-5 の AuthZEN 要求 ID（X-Request-ID）を加えた 7 欄（iss と jti を分けて数えると 8 欄）に揃えた（reconciliation-notes §3.2）[D]。Txn-Token の原文はログに残さない（草案の MUST NOT）[N][^25]（RS-06#41）。記録するのは txn と jti だけにする [D]。

### 2.10 付加を検討する claim（Q8、相談事項 2 への回答）

- **D21-38** token に載せる claim には、次の 4 つの規則を課す [D]。
  1. **PEP が判定に使うものだけを token に入れる** [D]。それ以外は、監査記録か属性サービスへの照会で扱う。
  2. **権限・role・group・組織階層は token に焼き込まない**（PDP で判定する）[D]。理由は 4 つある。
     - RFC 9068 §2.2.3.1 は、権限属性を載せる場合は SCIM の groups・roles・entitlements を使うよう求めている（SHOULD）。一方で、その語彙は定めていない [N][^43]。
     - 同 §6 は、client が token の内容を検査しないよう注意している（暗号化しない JWT の中身は見え得る）[N][^43]（RS-04#61）。
     - 焼き込んだ権限は寿命の間変わらず、剥奪が遅れて反映される（ADR-006）[D]。
     - PQ 署名で token が大きくなる（RS-11 結論 6）[D]。
  3. **claim 名は不可逆の識別子として扱う** [D]。IANA に登録された claim は、その定義どおりに使う [D]。基盤固有の claim は、claim registry（DL-71、DL-75）に登録した名前だけを使う [D]。
     - 外部の RP に渡す ID Token では、基盤固有の claim を `<id-domain>` を含む衝突耐性名にする（N-13）[N][^36][D]。
     - 内部 token（自社 issuer で、typ が版付きの自社 profile のもの）に限り、短い名前（`tid` など）を許す [D]。managed IdP 製品が同じ短い名前（例: Entra の `tid`）を別の意味で出し得るからである [D]。
     - 一度使った claim 名は、意味を変えず、再利用しない [D]。
  4. **個人識別情報を相関用の claim に入れない** [D]。
- **D21-39** v1 で名前と形式を固定する claim と、名前だけを予約する claim を、次のように分ける [D]。claim 名は IANA の「JSON Web Token Claims」registry（Specification Required、最終更新 2026-07-20）で確認した [N][^39]。

| 区分 | claim | 定義元（IANA registry の参照） | v1 の扱い | 将来に備える理由 |
|---|---|---|---|---|
| 主体 | `iss`, `sub` | RFC 7519、OIDC Core [N][^1] | 固定（D21-03, D21-09） | 結合キーの正本 |
| 主体の別表現 | `sub_id`（`iss_sub`, `aliases` など） | RFC 9493 §4.1 [N][^38] | 固定。SSF/CAEP/RISC の事象と、M&A・専用 issuer 間の移動での alias の表現に限る（D21-31, D21-32） | 統合・吸収のときに旧識別子を表す |
| 主体類型 | 主体類型（独自。意味は ADR-005 D9-4、名前は D21-38 の規則で DL-75 に確定。整合調整で修正） | registry に該当なし | 固定 | 非人間 ID と AI エージェントが増える（A-014）。sub から類型を推論させない |
| テナント | `tid`（独自。内部 token は短い名前、外部は衝突耐性名） | registry に該当なし [N][^39] | 固定（1 token に 1 tid） | テナント境界の多層化（R-250）。資源側のテナントは資源から導く |
| client | `client_id` | RFC 8693 §4.3 [N][^39] | 固定（D21-22） | N-5 |
| 委任 | `act`, `may_act` | RFC 8693 §4.1, §4.4 [N][^39] | 固定（principal-catalog §3.3、ADR-017、DL-74） | エージェント・support・代理人の連鎖を表す。アクセス制御に使うのは、最上位の claim と現在の actor だけ（RS-06 結論 7） |
| 認証の文脈 | `acr`, `amr`, `auth_time` | OIDC Core §2 [N][^39] | 固定 | step-up（RFC 9470）と、保証レベルの変更 |
| 鍵束縛 | `cnf` | RFC 7800 §3.1 [N][^39] | 固定（ADR-005） | DPoP/mTLS。PQ 移行の後も構造が変わらない |
| 相関 | `jti`, `sid`, `txn` | RFC 7519、OIDC Front-Channel Logout、RFC 8417 [N][^39] | 固定（D21-35） | 証跡の連鎖 |
| profile の版 | token profile の版（版の運用規則は ADR-016、名前は DL-75 に確定。整合調整で修正） | 独自 | 固定 | alg や claim の意味を変えるときの交渉（RS-11 結論 7） |
| 細粒度の同意 | `authorization_details` | RFC 9396 §9.1 [N][^39] | 予約。第三者連携と FAPI の範囲で採否を決める（ADR-020） | 取引単位の同意 |
| 状態 | `status` | IANA の参照先は draft-ietf-oauth-status-list-21（確認時点で RFC 番号は未付与）[N][^39] | 予約。RFC 発行後に ADR-006 で再評価する | 失効の配布 |
| 本人確認 | `verified_claims` | OpenID Identity Assurance Schema Definition 1.0 §5 [N][^39] | 予約。IAL2 以上の主体だけを対象に、ADR-002 で採否を決める。原典の内容は ADR-005 D9-4 の起草者が照合したが、原典ページの状態表示（Final）と Warning 節（標準ではない・draft）が矛盾しており（ADR-022 [^54]、整合調整で 2026-10-15 に再確認）、状態が確定するまで採否の判断には使わない（整合調整で修正） | 本人確認の出所・方法・時刻を運ぶ |
| 権限 | `roles`, `groups`, `entitlements` | RFC 7643 §4.1.2、RFC 9068 §2.2.3.1 [N][^39] | 原則として載せない（D21-38 の規則 2）。レガシー gateway の例外は ADR-005 で列挙する | — |
| 個人情報 | `email`, `phone_number` など | OIDC Core | access token には載せない。ID Token では表示用に限り、結合キーにしない（D21-14c） | — |

- **D21-40** W3C Verifiable Credentials Data Model 2.0（W3C Recommendation、2025-05-15）には、次の規定がある [N][^42]。
  - verifiable credential は issuer property を持たなければならない（MUST）。その値は URL か、URL の id を持つ object でなければならない（MUST）（§4.7）。
  - credentialSubject を持たなければならない（MUST）（§4.8）。
  - id は OPTIONAL である。プライバシーが重要な場合は省略してよい（§4.4）。
  - 状態（status）の仕様は、個人の追跡を可能にしてはならない（MUST NOT）（§4.10）。

  本書はこれを次の 3 点に写す [D]。
  - (a) 区画の issuer を、path なしの https URL で、自社が保有し続けられる形にしておく（D21-03）。これにより、将来は同じ URL を VC の issuer として使う選択肢が残る。
  - (b) sub は解決可能な URL にしない。VC での主体 id は、省略するか、提示先ごとに異なる値にする方針を候補とする（相関を避けるため）。
  - (c) 所属や資格のように第三者が検証したい属性は、token を最小にしておく（D21-38）。そうすれば、将来は access token の claim ではなく、利用者が保持する VC として扱う道が残る。

  VC を発行するか受け入れるかは本書の範囲外とし、§8 のトリガーで扱う [D]。

### 2.11 台帳と CI 検査

- **D21-41** 識別子台帳（DL-71 の付表）には、次の項目を記録する [D]。
  - 全識別子の種類、生成規則、所有者、配布先
  - 墓石の件数
  - 信頼区画のドメインの許可リスト（`<id-domain>`、sandbox の domain、K21-2 で認めた事業単位の domain）
- **D21-42** CI で次の 5 点を検査する [D]。
  - (a) issuer、RP ID、entityID、ACS、redirect_uri、trust domain が、許可リストにある domain の配下にあること。sandbox の domain は許可リストに載せて扱うので、違反として検出されない。
  - (b) 識別子と kid に、alg 名・製品名・リージョン名・組織名・cell 名が含まれないこと。
  - (c) 名前空間台帳に登録されていない type・claim・scope・事象 type がないこと。
  - (d) email・userName・UPN を照合キーに使うコード経路がないこと。
  - (e) 依存サービスが内部 issuer の値を保存していないこと（DL-80）。

  台帳と実際の構成の照合は、四半期ごとに行う（durability-charter §5.3）[D]。
- **D21-43** 顧客が自分のドメインを登録する機能（ドメイン検証）は、`<id-domain>` とは無関係である [D]。この機能は ADR-004 と DL-26 で扱い、次の規則に従う [D]。
  - 持続型の検証を採り、再検証の周期と取消しの手順を明示する（草案の MUST）[N][^31]（RS-14#25）。
  - 検証は利用者・テナントに結び付けて行う [D]。別の利用者による再検証を「再有効化」として扱わない [N][^31]（RS-14#27）。

### 2.12 決裁案（DEC-3 で決める点。いずれも決定済みではない）

| # | 論点 | 選択肢 | 推奨と帰結 | 決める人 |
|---|---|---|---|---|
| K21-1 | issuer の粒度（ADR-007 KD7-1 と同時に決裁） | (a) 単一の global issuer (b) 信頼区画 issuer＋cell 別鍵＋専用 issuer 枠 (c) cell・リージョン別 (d) テナント別 | (b) を推奨する。帰結として、外部 RP での cell 単位の封じ込めは失われ、RR21-01 になる。第三者 client 800 件の実装は 1 区画につき 1 issuer で済む。従業員を別区画にするかは、従業員を別の IdP 製品に置くかどうかと合わせて決める | CTO（アーキテクチャ審査会経由）＋CISO 同意 |
| K21-2 | ドメインの構成（売却の可能性への備え） | (a) 単一の `<id-domain>` (b) 全区画・全ブランドに個別の専用 domain（evo 案） (c) 単一の `<id-domain>` を基本とし、売却の可能性がある事業単位にだけ個別の domain を持たせる | (c) を推奨する。帰結: 統制の対象になる domain は 1＋(個別 domain の数)＋sandbox になる。個別 domain を持たない事業単位を売却するときは、識別子を移行する（RR21-04） | 経営会議（売却可能性の判断）＋CTO＋法務責任者＋CISO |
| K21-3 | 専用 issuer 枠の上限と提供条件 | 上限 50／150／600（A-081 の基準・成長・規制強化） | 契約で求められた場合に限って提供する。上限と原価は DL-33 で決める（TBD。所有者: 事業責任者、期限: G3） | 事業責任者＋CISO |
| K21-4 | 第三者 client への pairwise の既定 | 既定にする／しない | 既定にする（D21-14d）。帰結: 第三者は、利用者をテナントをまたいで名寄せしにくくなる | CISO＋個人情報保護責任者 |
| K21-5 | 名前空間台帳の所有者 | プラットフォームのプロダクト責任者／各ドメイン | プラットフォームのプロダクト責任者を推奨する。変更は二者承認とし、審査の待ち時間を SLO にする（G-116、DL-27） | CTO |
| K21-6 | `<id-domain>` の名称と保有法人 | — | 事業ブランドから独立した名前を、基盤を保有する法人の名義で取得する。統制は C-xxx（06_controls で採番） | 事業責任者＋法務責任者＋CISO |

---

## 3. 検討した選択肢

主論点は、issuer の粒度とドメインである。副論点（sub の形式、RP ID、相関識別子、名前空間）は §3.8 で比べる。費用の桁は A-ID と新規仮定から導いた推論 [D] であり、見積りではない。

### 3.1 案A（採用）: 識別子専用ドメイン＋信頼区画 issuer＋専用 issuer 枠＋cell 別鍵＋不透明 ID＋接続ごとの entityID＋登録制名前空間＋txn・decision_id による証跡

| 項目 | 内容 |
|---|---|
| 概要 | §2 の D21-01〜D21-43。sec 案を土台に、ops と evo の要素を取り込んだもの |
| 利点 | 製品・cell・組織・alg が変わっても識別子は変わらない。外部 RP でも標準の検証だけで区画越えを拒否できる（RS-12#5）。接続ごとの entityID で、assertion の audience がテナントと IdP の組に結び付く。nOAuth の経路（email による結合）を形式上なくせる。統合・分割・cell 間移動で (iss, sub) が変わらない |
| 欠点 | 識別子専用ドメインは利用者に見慣れないので、フィッシングと見分ける説明が要る。SAML 1,800 接続 [A-114] の entityID と metadata を自動で発行する必要がある。pairwise は sector の管理を増やす。区画の中の cell 封じ込めは第一者 SDK に依存する（RR21-01） |
| 主要リスク | `<id-domain>` そのものを失うこと（RR21-02）。AS 製品が自社 RP ID・接続ごとの entityID・credential record の export に対応しないこと（調達で検査する） |
| 費用・要員の桁 | ドメイン保有の費用と DNS 統制の工数は TBD（所有者: SRE 責任者、期限: G3。registrar の公式料金と統制手順の工数から決める）。entityID と metadata の自動発行は、認証チーム（5 FTE [A-054]）の 1〜2 FTE × 1〜2 四半期の桁と見込む（仮置き。実測で更新）。鍵スコープ検証の SDK への実装は、PEP SDK チーム（4 FTE [A-054]）の内数で、0.5〜1 FTE の桁と見込む（仮置き）。墓石は約 300 MB で、費用要因にはならない |
| 可逆性 | 不可逆（識別子）。区画・専用 issuer の追加、運用規則、符号化方式（新規の払出し分）、内部 issuer は可逆 |
| 勝つ条件 | 計画期間に製品の置換がある [A-104]、M&A がある（R-209）、顧客 IdP 連携が数千件ある [A-114]、という基準シナリオ |

### 3.2 案A′: 区画ごと・ブランドごとに専用の registrable domain を持つ（evo 案B）

| 項目 | 内容 |
|---|---|
| 概要 | 区画ごとに、自社所有で譲渡できる専用 domain を置く。issuer、RP ID、entityID のドメインは同じにする |
| 利点 | domain を譲渡すれば、issuer・RP ID・entityID を変えずに区画を売却できる [D][NA-021-2] |
| 欠点 | 統制の対象になる domain が区画の数に比例して増える。B2C を A-010 の 6 realm に分けると、最大で 8 程度になり得る。domain を 1 つ失うと、その区画全体を失う構造が複数できる |
| 主要リスク | ドメイン統制の運用点が増え、更新漏れや乗っ取りの機会が増える |
| 費用・要員の桁 | 統制の工数は domain の数に比例する（1 domain あたりの工数は TBD。案A と同じ所有者・期限）[D] |
| 可逆性 | 不可逆 |
| 勝つ条件 | 計画期間中に事業売却が現実的な確度で見込まれる場合（NA-021-2 が高い）。このため本書は全面採用ではなく、K21-2 (c) として、該当する事業単位にだけ部分的に採る |

### 3.3 案B: 会社の主ドメイン配下に置く（ops 案B の形。`https://login.<corp-domain>/<realm>`）

| 項目 | 内容 |
|---|---|
| 概要 | 会社（持株会社など）のドメインのホストを、issuer と RP ID にする |
| 利点 | 利用者に見慣れたドメインになる。新しいドメインの取得が要らない |
| 欠点 | 商号変更・M&A・売却でブランドドメインが変わると、識別子が変わる（ops 案自身が NA でブランドドメインの変更は「起きる」と置いており、それと矛盾する）。会社ドメインのゾーンと registrar を他部門と共有するので、統制の範囲が広い。path 型の issuer を使う場合は、区画ごとにホストを分けられない |
| 主要リスク | ゾーンを共有する部門の変更による乗っ取り（ATK-01、ATK-19） |
| 費用・要員の桁 | ドメインの取得費用は不要。会社ドメインのゾーン全体を識別子の統制下に置く費用が、DNS を所有する部門に生じる |
| 可逆性 | 不可逆 |
| 勝つ条件 | ユーザビリティ試験で、識別子専用ドメインが B2C のフィッシング誤認を有意に悪化させると実測され、事業側が会社ドメインを求め、会社ドメインのゾーンを識別子チームが単独で統制できる場合 |

### 3.4 案C: cell・リージョンごとの issuer

| 項目 | 内容 |
|---|---|
| 概要 | `https://jp1.…`、`https://eu1.…` のように、データ所在地を issuer で表す |
| 利点 | 所在地が `iss` から一目で分かる。鍵の封じ込めと issuer が一致する |
| 欠点 | cell 間の移動のたびに (iss, sub) が変わり、INV-2 に反する。リージョン名が識別子に入るので、所在地規制が変わる（A-063 の英国独立リージョンなど）たびに識別子が変わる。移動 1 件ごとに、外部 RP の保存データと顧客 IdP の設定の付け替えが要る |
| 主要リスク | 移動・統合の手順を誤り（ATK-19）、利用者参照を失う |
| 費用・要員の桁 | テナント移動の件数に比例する。移動 1 件ごとに、そのテナントの利用者を扱う外部 RP 全件で付け替えが発生する |
| 可逆性 | 不可逆 |
| 勝つ条件 | 法域の主権要件が、発行者そのもの（信頼の起点と公開メタデータ）を別法人・別運用に分けることを求め、しかもテナントのリージョン移動を事業として許さない場合。その場合も、名前にはリージョン名ではなく不透明なラベルを使い、D21-05 の専用 issuer 枠で提供する |

### 3.5 案D: テナントごとの issuer（ADR-007 の要求、K-8 の (a)）

| 項目 | 内容 |
|---|---|
| 概要 | テナントごとに issuer と JWKS を持つ（1 万〜2.5 万）[A-007] |
| 利点 | 外部 RP でも、標準の検証だけでテナント単位・cell 単位に鍵を封じ込められる（ADR-007）。テナント単位で信頼を切れる。送信元テナントの検証漏れ（RS-12#53）を、issuer の照合でも防げる |
| 欠点 | 統合・分割のたびに、移る利用者の (iss, sub) が変わる（K-8 の帰結）。複数テナントに所属する 2.1 万人 [A-015] は、所属の数だけ識別子を持つ。第三者 client は、テナントごとの discovery とテンプレート化した issuer の照合を実装する必要がある。この照合は、N-7 が禁じる wildcard の allowlist と運用上紛らわしい。製品がテナントごとに issuer のパスを任意に設定できるかは製品次第で、未確認である（DL-13 で確認） |
| 主要リスク | 第三者 client の誤った実装による issuer mix-up（R-173）。issuer が 4 桁を超える規模で、metadata と JWKS の配信が障害点になる |
| 費用・要員の桁 | 第三者 client の改修は 800 ×（1 − NA-021-1）＝ 560 件（基準。NA-021-1 の範囲 10〜60% では 320〜720 件）。1 件あたり 1〜5 人日（NA-021-5）とすると、基準で 560〜2,800 人日になる。統合・分割 1 件ごとに、連携先で参照の付け替えが要る（件数は NA-021-4 で TBD）。issuer と JWKS の数は、案A（3 区画＋専用枠）の約 3 桁倍（1 万 ÷ 3 ≈ 3,300 倍）になる。KMS の費用は rotation の世代数に依存するので、TBD（ADR-007 の KD7-7 で算定） |
| 可逆性 | 不可逆 |
| 勝つ条件 | 次の (a) と (b) が同時に成り立つ場合。(a) 第三者 client が少ないか、ほぼすべてが自社 SDK を使う、または複数 issuer を扱える比率（NA-021-1）が 60% 以上である。(b) 外部 RP での cell 単位・テナント単位の封じ込めが、CISO の受容条件になる。統合・分割がほとんどない（NA-021-4 が小さい）場合は、さらに有利になる（§4.4 の感度分析） |

### 3.6 案E: AS/IdP 製品の既定ドメインと既定の識別子

| 項目 | 内容 |
|---|---|
| 概要 | 製品が払い出すテナントドメイン、製品の sub の形式、製品の SAML パスをそのまま使う |
| 利点 | 初期構築の費用と時間が最も小さい |
| 欠点 | 製品を替えると、iss・RP ID・entityID がすべて変わる。passkey は再登録になる [V][^32]（RS-15#46）。A-104 の「置換 1 回以上」と両立しない。G-067 を満たせない |
| 主要リスク | 撤退不能（R-090、R-208） |
| 費用・要員の桁 | 置換時に、顧客側の再設定 2,000 件 [A-114]、client 800 件 [A-013] の設定変更、passkey の再登録（少なくとも 3.3 万人 [A-115]）が発生する |
| 可逆性 | 不可逆。しかもベンダーの都合で変わり得る |
| 勝つ条件 | 計画期間が製品の契約期間以下で、製品を置換しないと経営が決めた場合（A-104 が 0 回）。基準シナリオでは勝たない |

### 3.7 案F: 意味を持つ識別子（email、構造化 ID、時刻順 ID）と、単一の global issuer（案G）

| 案 | 概要 | 利点 | 欠点・主要リスク | 費用の桁 | 可逆性 | 勝つ条件 |
|---|---|---|---|---|---|---|
| F | sub に email や UPN を使う。`<tid>-<連番>` のようにテナントを埋め込む。時刻を先頭に置く ID を使う | 人が読める。索引の局所性が良い | email は OIDC が識別子として MUST NOT とし、再利用もされ得る [N][^1]。nOAuth の経路になる [I][^14][^16]。テナントを埋め込むと統合・分割で書換えが要る（INV-1）。時刻順の ID は作成時期を漏らす [N][^45] | 初期費用は小さいが、事故時の影響は全テナントに及ぶ | 不可逆 | ない（規範の MUST NOT に反する）。時刻順 ID は、外部に出ない内部の DB キーに限って使える |
| G | 全区画・全テナントを 1 つの issuer で発行し、鍵は cell 別にする | 外部 RP の設定は 1 つで済む。区画をまたいで移っても iss は変わらない。issuer の運用は 0.1 FTE 未満の桁 [A-054] | 従業員・B2B・B2C の鍵が 1 つの JWKS に並ぶ（Storm-0558 と同じ構造）[I][^17]。主体区分ごとに信頼アンカーを分けられない | 最小 | 不可逆（後から分けると全 RP で iss が変わる） | 主体集団が 1 つしかない場合（B2C がなく、従業員を別の IdP 製品に分ける場合） |

### 3.8 副論点の選択肢

| 論点 | 採った案 | 退けた案と、その案が勝つ条件 |
|---|---|---|
| sub の形式 | 122 bit 以上の不透明乱数。小文字の英数字。符号化は DL-71 で決める（D21-09） | UUIDv7・ULID: 外部に出ない内部キーで、索引の局所性が支配的な場合に勝つ。テナント内の連番: テナント間で利用者が移らない場合に勝つ（基準シナリオでは移る）。Crockford base32 を名乗る表記: Crockford の正準表記に合わせられる場合に限り、名乗ってよい（本書は特定の表記への準拠を主張しない） |
| sub の発行元 | 自社が払い出す（D21-11） | 製品が払い出す ID: 乗換えをしないと決めた場合だけ勝つ（R-208 と相反する） |
| RP ID | 区画の login ホスト（D21-15） | apex（sec 原案）: 区画の外に属するアプリから直接 passkey を使う必要があり、`<id-domain>` 配下のすべてのホストを基盤チームが管理できる場合に勝つ。ブランドごとの RP ID: ブランドが 5 を超え、各ブランドの origin でログインさせる必要がある場合に勝つ（利用者はブランドごとに passkey を持つ） |
| SAML entityID | 接続ごとの entityID と ACS（D21-19） | 単一の entityID＋接続ごとの ACS: 既存の 1,800 接続を移す際の顧客側の再設定の完了率が想定を大きく下回る場合（TC-021-07）に勝つ。この場合も、ACS と Audience の組でテナントへの結び付きを一部保てる |
| 名前空間 | 中央台帳のコード＋自社ドメインで修飾した外部名（D21-25〜28） | 組織名を接頭辞にする: 組織再編がない場合に勝つ。自由命名と審査: ドメインが少なく、審査の要員が十分な場合に勝つ |
| 相関識別子（相談 1） | T1: jti・sid・txn・decision_id の連鎖と、監査記録での trace_id の突合せ（D21-35） | T2: access token に trace-id を入れる。token を 1 要求で使い捨てる構成でない限り勝たない。使い捨てる構成なら、その token の識別子（jti や txn）を使えば足りる。T3: traceparent を認可の根拠にする。勝たない（外部から入力され、付け直され得る値である [N][^34]） |
| claim の量（相談 2） | 最小の固定セットと予約名（D21-38, D21-39） | 所属・role・属性を多く載せる: PDP の可用性が要件を満たせない場合（ADR-023）に限り、例外として ADR-005 に列挙する |

### 3.9 可逆性のまとめ

| 要素 | 可逆性 | 変えるときの費用の主因 |
|---|---|---|
| 区画 issuer の URL | 不可逆 | 外部 RP と第三者 client の設定、保存された (iss, sub) |
| 区画・専用 issuer の追加 | 可逆 | 既存の区画に影響しない |
| 共有区画と専用 issuer の間の移動 | 個別には不可逆（例外手順） | そのテナントの連携先への対応表の配布（D21-32） |
| 内部 issuer（cell 別） | 可逆 | 保存が禁止されているので、検証点の設定だけで済む（D21-08） |
| sub・tid の値 | 不可逆 | 依存サービス 300 の保存データ（A-050） |
| sub の符号化方式 | 新規の払出しについて可逆 | 「不透明に扱う」契約を守っていれば、利用側の作業は要らない |
| pairwise の採否 | 不可逆（非対称） | 第三者側の保存データ |
| RP ID | 不可逆 | passkey の再登録 |
| entityID・ACS | 不可逆 | 顧客 IdP 2,000 接続の再設定（A-114） |
| client_id | 不可逆 | 外部 client 800 の再登録（A-013） |
| 名前空間・claim 名 | 不可逆（追加は可逆） | 契約と SDK の版上げ |
| 鍵の cell 分割・kid | 可逆 | JWKS の更新だけで済む |
| ドメイン統制・CI 検査などの運用規則 | 可逆 | 規程の改定 |

---

## 4. 評価

### 4.1 評価軸

judge panel は、次の 6 軸を各 5 点で採点した [D]。

| 軸 | 内容 |
|---|---|
| 要求網羅 | 問いの全項目、R/G、相談事項に答えているか |
| リスク低減 | 攻撃者モデル（§1.2）に対する残余リスク |
| 規模での実現性 | 100 万人、1 万テナント、300 サービス、800 client の規模で運用できるか |
| 進化・退出 | 製品置換、M&A、売却、暗号移行に耐えるか |
| 根拠の質 | 原典の照合、強度の写し方、導出の示し方 |
| 可逆性と費用 | 誤ったときに戻す費用、導入費 |

### 4.2 judge panel の採点（3 判定者 × 3 提案 × 6 軸）

| 判定者 | 提案 | 要求網羅 | リスク低減 | 規模での実現性 | 進化・退出 | 根拠の質 | 可逆性と費用 | 合計（30 点満点） | 判定者の勝者 |
|---|---|---|---|---|---|---|---|---|---|
| J1 | sec | 5 | 5 | 4 | 3 | 5 | 4 | 26 | |
| J1 | ops | 4 | 3 | 5 | 3 | 4 | 4 | 23 | |
| J1 | evo | 5 | 4 | 4 | 5 | 4 | 4 | 26 | evo |
| J2 | sec | 5 | 5 | 4 | 4 | 4 | 4 | 26 | sec |
| J2 | ops | 4 | 3 | 5 | 4 | 3 | 4 | 23 | |
| J2 | evo | 5 | 4 | 3 | 5 | 4 | 4 | 25 | |
| J3 | sec | 5 | 5 | 4 | 4 | 4 | 4 | 26 | sec |
| J3 | ops | 4 | 3 | 4 | 3 | 3 | 4 | 21 | |
| J3 | evo | 5 | 4 | 3 | 5 | 4 | 3 | 24 | |
| 集計 | sec 78／ops 67／evo 75。票は sec 2、evo 1 | | | | | | | | **sec** |

模擬パネルの自己レビューであり、実在の CTO/CISO の判定ではない（CONVENTIONS §8）[D]。

### 4.3 判定者の要点と不一致

- **一致した点**
  - 3 名とも、sec のリスク低減を 5 とした [D]。区画 issuer と鍵-issuer 結合の組合せで、外部 RP でも区画越えを拒否できることが理由である。
  - 3 名とも、ops のリスク低減を 3 とした [D]。第三者 RP での cell 封じ込めが残余リスク R1 として残ることが理由である。
  - 3 名とも、evo の進化・退出を 5 とした [D]。区画単位で売却できることが理由である。
  - ADR-007（テナント別 issuer）との対立を同時決裁の論点にすべき点は、3 名とも ops を評価し、sec・evo の不足として挙げた [D]。本書は §1.6 と K21-1 で取り込んだ。
- **不一致 1: 進化・退出の重み**
  - J1 は sec の進化・退出を 3 とし、evo を勝者とした [D]。単一ドメインでは、区画単位の売却ができないことが理由である。
  - J2 と J3 は sec に 4 を付けた [D]。ドメインが 1 つにまとまることで、統制の運用点が最小になる利点を重く見た。
  - 本書は K21-2 (c) で折衷した。売却の可能性がある事業単位にだけ、個別の domain を持たせる [D]。この判断は、経営の判断（NA-021-2）で覆り得る（§8）。
- **不一致 2: evo の規模での実現性**
  - J1 は 4、J2 と J3 は 3 を付けた [D]。J2 と J3 は、検証のたびにテナント→cell の動的な対応表が必要になる点と、障害時の扱いが未定である点を指摘した。
  - 本書の D21-07 は、対応表を署名した静的な配布物にし、期限切れのときは fail-closed とした [D]。遅延予算は TC-021-03 で実測する。
- **不一致 3: 根拠の質**
  - J1 は sec の根拠の質を 5、J2 と J3 は 4 とした [D]。J2 は、linking の再認証規則に付けた [N] タグが過大だと指摘した。
  - 本書は D21-14c で、この規則を [D]（SP 800-63C-4 の SHALL・SHOULD からの導出）に直した [D]。
- **判定者の指摘のうち、原典で確認した結果、採らなかったもの**
  - J3 は、ops の「UUID は security capability として使ってはならない」が RFC 9562 の強度（小文字の should not）を誇張していると指摘した [D]。
  - 統合時に原典を確認したところ、RFC 9562 §8 は "MUST NOT be used as security capabilities" と大文字の MUST NOT で書いている [N][^45]。したがって、ops の写し方が正しく、この指摘は採らない [D]。

### 4.4 判定者が指摘した事実誤りと、本書での処置

| 提案 | 指摘 | 原典・台帳での確認 | 本書での処置 |
|---|---|---|---|
| sec | Crockford base32 の小文字を正準形としている | Crockford の正準表記は確認していない（未確認） | 特定の表記への準拠を主張せず、符号化方式は DL-71 の TBD にした（D21-09） |
| sec | 案C の「1〜2 桁大」、案D の「3〜4 桁増」に導出がない | — | 案D は、issuer 数の比（約 3,300 倍）と改修件数の算式で示した。KMS の費用は TBD にした（§3.5）。案C は、件数比例であることだけを書いた（§3.4） |
| sec | [^35]〜[^40]（Trace Context、VC、RFC 7519/8417/9493、SAML Metadata、OIDC §8）が独立検証を経ていない | Trace Context は RS-10#16〜#18 の検証済み主張に置き換えた。§3.4・§6.1 の restart、RFC 7519/8417/9493、VC 2.0、OIDC §8、SAML Core §8.3.6/§8.3.7 は、統合者が原典で照合した | 独立検証は残課題として残す（§残課題 4）。SAML Metadata の脚注は使っていない |
| sec | linking の再認証規則の [N] が過大である | RS-03#59: 認証済み session は SHALL、既存の連携 ID での認証は SHOULD | [D] に直した（D21-14c） |
| sec | sandbox を別ドメインにしながら、CI 規則は「全識別子が `<id-domain>` 配下」としており、自己矛盾している | — | CI は許可リスト方式にした（D21-41, D21-42） |
| ops | 加重計の誤り（A 3.65→3.70、C 3.10→3.05、D 2.50→2.65、感度分析の C 3.70→3.65） | 再計算で確認した | 本書の §4.5 では正しい値を使った |
| ops | 「顧客 IdP 側の再設定（約 1 万テナント規模）[A-007]」 | 接続数は A-114 で SAML 1,800＋OIDC 200＝2,000 である | 2,000 接続 [A-114] に直した（§1.1、§3.6） |
| ops | A-010 を「B2C は B2B と別の realm」とだけ要約している | 台帳の基準値は「6 realm・最大 12 万」 | 6 realm を区画の中の分割として扱い、売却の可能性がある単位は K21-2 で扱った（D21-04） |
| ops | NA-021-3「年 20 件」と「1 件 1〜5 人日」に根拠がない | — | 年間件数は TBD（NA-021-4）にした。人日は仮置き（NA-021-5）であると明示し、所有者と決め方を付けた |
| evo | sid の根拠が Back-Channel と Front-Channel で不統一 | IANA の参照先は Front-Channel Logout §3。Back-Channel Logout §2.1 にも同じ定義（issuer 内で一意、RP には不透明）がある | 両方を引き、IANA の参照先を正本にした（D21-35） |
| evo | 加重合計の誤り（C 315→310、E 210→225） | 再計算で確認した | §4.5 で正しい値を記した |
| evo | NA-021-2（1 domain あたり 0.05 FTE 未満）と「3 domain で 0.1〜0.3 FTE」が矛盾している | 3 × 0.05 = 0.15 未満となり、上限が合わない | ドメイン統制の工数は TBD にした（§3.1） |
| evo | WIMSE §5.8 の警告を、テナント別 issuer への反論に使っている | RS-06#27: 各テナントが同じ issuer 識別子を設定できる環境についての警告である | テナント別 issuer への反論には使わない。発行者がテナントの設定に依存しないこと（issuer を基盤が払い出すこと）の根拠に限って使う（§6.2） |

### 4.5 提案者による案の自己採点（参考。重みはレンズごとに異なる）

| 出典 | 重み | 主な結果（加重計。誤りは訂正済み） |
|---|---|---|
| sec（55 点満点） | S1 攻撃者モデル 3、S2 独立検証可能性 2、S3 標準準拠 2、S4 20 年耐久 2、S5 運用費 1、S6 移行費 1 | 案A 48、案C（cell 別）37、案B（会社ドメイン）32、案D（テナント別）31、案E（製品既定）28、案F（意味のある ID）19（全行の検算が一致） |
| ops（5 点満点） | E1 移行費 30、E2 運用 20、E3 習得容易性 15、E4 封じ込め 25、E5 規制適合 10 | 区画＋専用 issuer 4.20、単一 3.70、テナント別 3.05、cell 別 2.65 |
| evo（500 点満点） | E1 永続性 30、E2 置換・退出 20、E3 封じ込め 15、E4 M&A 15、E5 標準 10、E6 運用費 10 | 区画＋専用 domain 460、単一 405、リージョン別 310、テナント別 280、製品既定 225 |

**感度分析（ops の重みで、訂正後の値）**: E4（封じ込め）を 45、E1（移行費）を 10 にすると、区画案は 3.80、テナント別は 3.65 になる [D]。さらに NA-021-1 が 60% 以上になり、テナント別の E3 が 2 から 4 に上がると、テナント別は 3.95 になり、区画案（3.80）を逆転する [D]。これは §3.5 の「勝つ条件」の (a) と (b) が同時に成り立つ場合に当たる [D]。

---

## 5. 決定理由と棄却理由

**案A を採る理由**

1. 識別子の変更費用は、配布先の数に比例し、後から下げることはできない [D]。配布先は、2,000 接続、800 client、300 サービス、数万の passkey である。
2. 攻撃者モデルのうち、識別子の形式で防げる攻撃がある [D]。
   - nOAuth: email による結合を禁止する
   - Storm-0558 型の区画越え: 区画 issuer と鍵-issuer 結合で防ぐ
   - assertion の注入: 接続ごとの audience で防ぐ

   いずれも、最初に固定しておかないと、後から変えるには識別子の変更が要る [D]。
3. 3 名中 2 名の判定者が sec 案を勝者とし、集計でも sec 案が最高点だった（§4.2）[D]。ops 案と evo 案の長所は、次のように取り込んだ [D]。
   - ops: 専用 issuer、調達要件、内部 issuer の可逆化
   - evo: claim 表、相関の連鎖、売却単位、静的配信

**棄却仮説（traceability/rejected-hypotheses.md、DL-107 に集約する）**

| ID | 棄却した仮説 | 棄却理由 | 再評価の条件 |
|---|---|---|---|
| ADR-021/RH-01 | 会社の主ドメインを issuer・RP ID にしてよい（案B） | 商号変更・売却で識別子が変わる。ゾーンを共有するので統制の範囲が広い [D] | フィッシング誤認の実測で識別子専用ドメインが劣り、かつ会社ドメインのゾーンを単独で統制できる場合（§8 T-9） |
| ADR-021/RH-02 | issuer を cell・リージョンで分けるべきである（案C） | cell 間の移動で (iss, sub) が変わる（INV-2 違反）。リージョン名が識別子に入る [D]。issuer の完全一致の制約により、変更は全 RP の再設定になる [N][^3][^4] | 規制が発行者そのものの分離を要求し、移動を行わないと決めた場合（D21-05 の専用枠で対応する） |
| ADR-021/RH-03 | テナントごとに issuer を持つべきである（案D、ADR-007 KD7-1 の要求） | 統合・分割で (iss, sub) が変わる。第三者 client の改修が 560〜2,800 人日（基準、仮置き）。issuer は約 3 桁増える [D][A-007, A-013] | §3.5 の (a) と (b) が同時に成り立つ場合、§4.5 の逆転条件 |
| ADR-021/RH-04 | 製品の既定ドメインと識別子で足りる（案E） | 置換時に、顧客側 2,000 件の再設定と passkey の再登録が生じる [V][^32][D][A-114][A-115] | 製品を置換しないと経営が決めた場合 |
| ADR-021/RH-05 | email や構造化 ID を識別子・結合キーにしてよい（案F） | OIDC の MUST NOT [N][^1]。nOAuth の一次報告 [I][^14][^15][^16] | なし |
| ADR-021/RH-06 | 単一の issuer で鍵の検証を正しく実装すれば足りる（案G） | 共通 endpoint のもとで利用側が検証を省いた一次報告がある [I][^17]。主体区分ごとに信頼アンカーを分けられない [D] | 事業構成が主体集団 1 つになった場合 |
| ADR-021/RH-07 | access token に trace-id を入れれば「共通認可を通った証跡」になる | token は複数の要求で使い回される。trace-id は外部から入力され、偽造・付け直しがあり得て、PII は禁止され、sampling で落ちる [N][^34][^35][D] | Trace Context に、認証付きの相関の仕組みが標準化された場合 |
| ADR-021/RH-08 | 将来に備えて、所属・role・属性を token に多く載せておくべきである | 剥奪が遅れる。サイズが増える。client から中身が見え得る [N][^43][D]。claim 名は不可逆である | PDP の可用性が要件を満たせない場合（ADR-023） |
| ADR-021/RH-09 | 型名・claim 名は組織名を接頭辞にすればよい | 組織再編で、名前が実態と合わなくなる（R-209）[D] | なし |
| ADR-021/RH-10 | 製品が払い出す sub をそのまま使ってよい | 乗換えのたびに識別子の移行が要る（RS-11#68）[N][^27] | 計画期間中に乗り換えないと決めた場合 |
| ADR-021/RH-11 | sub に類型の接頭辞を付けてよい | 類型の体系を変えると、不可逆な識別子が縛られる（principal-catalog §3.2）[D] | なし |
| ADR-021/RH-12 | 全区画・全ブランドに個別の専用 domain を持たせる（evo 案の全面採用） | 統制の運用点が domain の数に比例して増える。売却の可能性がない単位では利点がない [D] | NA-021-2 が高く、売却対象が区画全体にわたると経営が判断した場合 |

---

## 6. 帰結

### 6.1 良い帰結

- AS 製品、認可エンジン、PEP SDK を置き換えても、利用者・顧客 IdP・RP・依存サービスの側で識別子の作業が生じない [D]。ただし、製品が D21-11 と D21-18 の調達要件を満たすことが条件である（TC-021-01、TC-021-04）[D]。
- テナントの統合・分割・cell 間移動で (iss, sub) が変わらず、テナント事象の alias だけで済む [D]（G-075 の前提）。
- nOAuth、issuer mix-up、他テナント宛ての assertion の注入、区画をまたぐ鍵の受理を、識別子と検証規則の組合せで拒否できる [D]（§7 の負例で確かめる）。
- 「共通の認証・認可を通った要求」の証跡を、署名で守られた識別子の連鎖から監査記録で再構成できる [D]。
- claim 名と予約名を先に固定するので、VC・status・本人確認属性の採否を後から決めても、名前の衝突が起きない [D]。

### 6.2 悪い帰結

- 識別子専用ドメインは利用者に見慣れない [D]。フィッシングと見分ける説明と、画面上のブランド表示が要る。フィッシング耐性のある認証器（ADR-002）でこれを補う [D]。
- 区画の中の cell 単位の封じ込めは、第一者の SDK・sidecar・edge の検証（D21-07）に依存する [D]。SDK を使わない外部 RP では成り立たない（RR21-01）。
- 既存の SAML 1,800 接続を移すと、顧客側の再設定が 1 回発生する [D][A-114]。
- pairwise を採ると、第三者 client の運用者は利用者を名寄せできなくなる [D]。
- 墓石の保持、名前空間の登録制、ドメイン統制は、20 年にわたる運用義務になる [D]。
- 共有区画と専用 issuer の間を移るときは iss が変わり、対応表の配布が要る（D21-32）[D]。
- 発行者の識別子は基盤が払い出し、テナントには設定させない [D]。マルチテナント基盤では、各テナントが同じ issuer 識別子を設定できると、iss が発行者を一意に示さないことがあるからである [N][^24]（RS-06#27）。

### 6.3 残余リスクと受容者案

| ID | 残余リスク | 統制 | 受容者案 |
|---|---|---|---|
| RR21-01 | 第三者 RP が標準の検証だけを行う場合、ある cell の鍵が侵害されると、同じ区画の別の cell のテナントを名乗る token を偽造され得る | cell 別の鍵、鍵年齢の上限（ADR-007）、侵害時に区画単位で鍵を即時交換する手順、専用 issuer 枠（D21-05）、第三者向けの開発者ガイドで tid の検証を義務づけること | CISO（ADR-007 KD7-1 と同時に決裁） |
| RR21-02 | `<id-domain>` の喪失・奪取（registrar の侵害、更新漏れ、商号変更後の放棄） | D21-02、KRI | CISO（技術）＋法務責任者（保有の継続） |
| RR21-03 | 製品から credential record を取り出せない場合、乗換え時に passkey の再登録が要る | D21-18 の調達要件、TC-021-04 | CTO＋プロダクト責任者 |
| RR21-04 | 個別 domain を持たない事業単位を売却する場合、識別子を保てない | D21-31 の移行方式、K21-2 | 経営会議（M&A の決定者） |
| RR21-05 | Transaction Tokens が RFC にならないか、`txn` 以外の部分が変わる | 版付きの社内 profile（D21-36）。`txn` の意味は RFC 8417 で固定されている | CTO（ADR-009 と連動） |
| RR21-06 | 内部 token の短い claim 名が、将来採用する製品の claim と衝突する | claim registry と CI（D21-38、D21-42） | CTO |
| RR21-07 | テナント→cell の対応表の配布障害による認証の拒否（fail-closed） | 署名した静的な配布、期限付きのキャッシュ、TC-021-03 | 事業責任者（BIA）＋SRE 責任者 |
| RR21-08 | 名前空間の審査が遅れ、開発を止める | 自動 lint、審査 SLO（G-116） | CTO |

### 6.4 依存サービス・連携開発者への影響

- **依存サービス（300 [A-050]）**: 次の 4 つの義務を負う。いずれも契約試験キット（DL-80）と SDK の lint で検査する [D]。
  - sub・tid・client_id・オブジェクト ID を、不透明な文字列として保存し、形式や意味を解析しない。
  - 保存キーは (区画の iss, sub) と tid だけにし、内部 issuer の値を保存しない。
  - email をキーにしない。
  - オブジェクト ID に tid を埋め込まない。
- **第三者 client（800 [A-013]）**: 次のことを開発者ガイドに書く [D]。
  - issuer は区画ごとの固定値である（基本は 1 つ）。
  - sub は pairwise である。
  - `tid` を検証し、RFC 9207 の iss を照合し、鍵-issuer 結合を検証する。
- **顧客の IdP 管理者**: entityID と ACS は、接続時に 1 回だけ設定する [D]。統合・移動ではこれらは変わらない [D]。
- **ドメインチーム**: 新しい resource type・relation・scope・claim・事象 type は、名前空間台帳に登録してから使う [D]。
- **監査**: (iss, jti)、sid、txn、decision_id、trace_id を、別々の欄として記録する（DL-71、DL-77）[D]。

### 6.5 運用・要員への影響

- 識別子台帳、名前空間台帳、DNS ゾーンの所有者は、プラットフォームチームとする（RACI-25）[D]。ドメインの登録名義は、法務と SRE が共同で所有する [D]。
- 台帳と実際の構成の照合と、ドメインの保有状態の KRI 報告を、四半期ごとに行う [D]。
- SAML 接続の entityID と metadata の発行を自動化し、顧客管理者のセルフサービスにする [D]。これは保護操作として扱い、再認証と通知を付ける（RS-14 結論 3）[D]。
- 台帳の運用の工数は TBD とする（所有者: プラットフォームのプロダクト責任者、期限: G3、決め方: 審査件数の実績 × 1 件の処理時間）[D]。

---

## 7. 検証

### 7.1 PoC で確かめる仮説と TC 案

TC-ID は 12_poc（DL-22）で採番する（本書では仮番）[D]。時間の閾値は、BIA と実測の後に DL-20 で決める [D]。

| TC 案 | 仮説 | 手順の要点 | 合否基準 |
|---|---|---|---|
| TC-021-01 | 製品を乗り換えても、issuer・sub・client_id・entityID・ACS は変わらない | 2 つの製品に同じ識別子を設定し、edge の rewrite で切り替える。自社の sub が属性として出力されることを確かめる（D21-11） | 識別子の変化 0 件。外部 RP・顧客 IdP 側の再設定 0 件 |
| TC-021-02 | 区画をまたぐ鍵は受理されない | prod-consumer の鍵で署名した token を prod-enterprise の RS に提示する。sandbox の token を本番に提示する（G-141）。区画 B の鍵で区画 A の token を作る | 標準の検証だけを行う第三者 RP の模擬でも、第一者の SDK・sidecar・edge でも、全件拒否する（G-088 の負例群に追加） |
| TC-021-03 | cell 単位の鍵スコープ検証が偽造を拒否する。対応表の配布は遅延予算に収まる | cell A の鍵で cell B のテナントの token を作って提示する。移動中に両方の鍵を受理することを確かめる。対応表の配布を止める | 第一者の検証点で全件拒否。検証の p99 遅延と、キャッシュ期限切れ時の挙動を記録する（予算は TBD。所有者: SRE 責任者、期限: G4） |
| TC-021-04 | IdP を乗り換えても passkey を使える | 製品 P1 で区画の RP ID に登録した passkey の credential record（user handle と BE/BS を含む）を P2 に移し、主要 3 系統のブラウザで認証する | 利用者の再登録 0 件（合成利用者で実施。G-073、DL-31 の移行演習） |
| TC-021-05 | client が sub を詐称できない | 高権限の利用者の sub と同じ値を、client_id として登録しようとする（RFC 9068 §5 の負例） | 登録が拒否されるか、RS が区別できる。混同 0 件 |
| TC-021-06 | 接続をまたぐ assertion と issuer mix-up は拒否される | 接続 X 宛ての SAML assertion を接続 Y の ACS に送る。RFC 9207 の iss を差し替える | 全件拒否 |
| TC-021-07 | 既存の SAML 接続を移せる | パイロット顧客で、接続ごとの entityID に移す | 完了率と所要期間を記録する（許容値は TBD。所有者: 営業・顧客成功責任者、期限: G4） |
| TC-021-08 | 不透明 ID の相互運用性と性能 | 候補の符号化方式で、主要な RP ライブラリ・DB の型・索引の性能、大文字小文字を同一視するストアでの衝突を確かめる | 閾値は TBD（DL-20）。符号化方式を決める入力にする |
| TC-021-09 | 区画の JWKS のサイズが許容範囲にある | 全 cell の鍵と PQ 鍵を併載した JWKS を作る（RS-11#42） | 上限は TBD（所有者: SRE 責任者、期限: G4） |
| TC-021-10 | 証跡の連鎖を復元できる | 外部の 1 要求について、(iss, jti) → sid → txn → decision_id を監査記録から引く。trace を sampling で DROP しても復元できるか確かめる | 復元できない要求 0 件（R-128）。復元にかかる時間は TBD（BIA に紐付ける） |
| TC-021-11 | 偽造した traceparent が判定に影響しない | 衝突させた trace-id を外部から送る | 認可判定と証跡の真正性への影響 0 件 |
| TC-021-12 | 統合・分割・cell 間移動・専用 issuer への移動で、意図しない識別子の変化がない | 最大テナント規模の縮小版で、統合、分割、cell 間移動を実施する（tenant-lifecycle の TL-1、TL-2 と同時）。専用 issuer への移動では、対応表の配布を確かめる | (iss, sub) の差分 0 件（専用 issuer への移動を除く）。統合元 tid の再利用 0 件。意図した差分を除き、認可判定の差分 0 件（G-075） |
| TC-021-13 | nOAuth が再現しない | 攻撃者テナントで被害者の email を設定し、ログインと結合を試す（S-03） | 可変属性による結合 0 件 |
| TC-021-14 | 識別子規則の違反を CI が検出する | 製品名・リージョン名・alg 名を含む issuer・kid・entityID、許可リスト外の domain、未登録の type・claim、email を照合キーにするコード、内部 iss を保存するコードを注入する | 検出率 100%（注入件数は TBD。所有者: プラットフォームチーム長、期限: G3） |
| TC-021-15 | pairwise sub は逆算・相関されない。製品をまたいで再計算できる | 2 つの第三者 client に渡した sub から、元の sub を推定する。乗換え先の製品で同じ値を再計算する | 推定できない（N-2）。再計算の不一致 0 件 |
| TC-021-16 | 名前空間の衝突・再利用を lint が拒否する | 墓石化した名前を再登録する。既存の relation と重なる extension を追加する | 全件拒否 |

### 7.2 第三者評価で確かめること

- OIDF の適合試験: issuer と discovery の完全一致（N-3）、RFC 9207 の iss、pairwise への対応 [D]
- `<id-domain>` と個別 domain の DNS・registrar 統制の外部監査: registry lock、DNSSEC、CAA、変更の二者統制 [D]
- pentest: サブドメインの乗っ取り、related origins の悪用、TC-021-02・03・06・13 と同じ型の cross-tenant 攻撃（R-273）[D]
- 鍵スコープ検証の実装レビュー（SDK・sidecar・edge）[D]
- 製品から credential record を取り出せることの実演: 独立立会人のもとで、ベンダーに実演させる [D]
- 本書で統合者が取得した原典の照合を、作成者以外が行う [D]

---

## 8. 再検討トリガーと見直し時期

| # | トリガー | 見直す対象 |
|---|---|---|
| T-1 | Transaction Tokens の RFC 化、廃止、WG での大きな変更（RS-06#29） | D21-35, D21-36 |
| T-2 | Token Status List の RFC 番号付与。OpenID Identity Assurance の調査が完了したとき | D21-39 の予約 claim |
| T-3 | WebAuthn の related origins の最低ラベル数の変更。CXP が Proposed Standard 以上になったとき | D21-15〜D21-18 |
| T-4 | 主権・所在地の規制や契約が、発行者そのものの分離を求めたとき（G-139、A-062、A-063） | D21-05 の専用枠（案C の変形の再評価） |
| T-5 | 事業売却・買収の決定、または NA-021-2 の見込みが変わったとき | K21-2、D21-31〜D21-33 |
| T-6 | 採用した AS 製品が、custom domain、sub 属性の出力、credential record の export、pairwise 秘密の持ち出しのいずれかを廃止・制限したとき | D21-11, D21-14e, D21-18（ADR-001・ADR-018 と連動） |
| T-7 | 識別子の変更が原因で、顧客・連携先に作業が 1 件でも発生したとき（durability-charter §5.3 の継続指標） | 本書全体の臨時再決裁 |
| T-8 | W3C VC の issuer・verifier としての利用要求が出たとき | D21-40 |
| T-9 | ユーザビリティ試験で、識別子専用ドメインのフィッシング誤認率が許容を超えたとき | D21-01（案B の再評価） |
| T-10 | NA-021-1 が 60% を超え、CISO が外部 RP での cell 封じ込めを受容条件にしたとき。または第三者 RP で鍵スコープに起因する偽造（RR21-01）が起きたとき | K21-1（案D の再評価。§4.5 の逆転条件） |
| T-11 | TC-021-03 で拒否漏れが出たとき。SDK を経由しない第一者サービスが相当数残るとき。対応表の配布が遅延予算を超えたとき | D21-07（issuer をさらに分けるか、鍵を区画単位に集約するかの再評価） |
| T-12 | PQ 鍵を併載した JWKS が配信・検証の上限を超えたとき（TC-021-09） | D21-07 の JWKS の構成 |
| T-13 | 専用 issuer の数が K21-3 の上限、または A-081 の高推定（600）を超えたとき | K21-3、K21-1 |
| T-14 | 既存 SAML 接続の移行の完了率が、想定を大きく下回ったとき（TC-021-07） | D21-19（単一 entityID＋接続ごとの ACS への折衷） |
| T-15 | 統合者が取得した原典の独立検証で、食い違いが見つかったとき | 該当する決定と、§4 の根拠の質の評価 |

- 識別子そのものは、定期の見直しでは変えないことを既定の結論にする [D]。
- 運用規則（D21-02、D21-07、D21-25〜D21-28、D21-38、D21-41〜D21-43）は、標準ステータス台帳の四半期更新と合わせて見直す [D]。
- 全体は、A-101 の再決裁周期（初回 3 年以内、以後 5 年以内）に合わせて見直す [D][A-101]。

---

## 8A. v1.2 で判明した論点（2026-10-15 追記）

> 本節は v1.2 の同期（2026-10-15）で追記した。2 回目の模擬連携検証（13_integration-trial/room-booking/report.md。AI が依存サービスの開発チームを演じたもので、実在の連携チームの検証ではない）を受けた v1.2 の契約・連携文書の改訂で、本書の決定を変えずに契約へ落とそうとした際に見つかった不足である。**本書の決定（D 番号）は変えていない**。各論点は決めるまで契約側の暫定で動き、決めた時点で決定として本文に加える。AI エージェント（Claude）による追記で、人による照合・模擬パネルの判定・CTO/CISO の決裁を経ていない（CONVENTIONS §8）[D]。

INT-03 §16.6 HO-V12-3 と CON-18 V12-AG-6 を受けた [D]。

| # | 出所 | 論点 | 関係する決定 | 連携側の暫定（決めるまで） | 決める人・期限（案） |
|---|---|---|---|---|---|
| V12-21-1 | INT-03 HO-V12-3（room-booking L-9） | 拠点・組織の共通の名前空間（INT-03 §9.2 の例の `org`）の所有者が決まっていない。会議室予約の模擬検証は拠点を `core/unit` で表すかドメイン型で表すかを決められず、ドメイン型を選んだ | K21-5、D21-25 | `org` は INT-03 の例のコードとして読み、自ドメインの名前空間で表す（INT-03 §4.1・§10.3 v1.2）| K21-5 の決裁者（CTO）、DL-65 の納品前 |
| V12-21-2 | CON-18 V12-AG-6 | 委任の actor としての `ai_agent` の型名（独立の core 型か、`core/workload`＋属性か）。型名は名前空間の不可逆な識別子になる | D21-38 | `core/workload`＋`principal_type`（CON-18 §5、CON-02 v0.3.1）| ADR-017 V12-17-6 と同時 |

## 9. 依存関係

| 種別 | 文書 | 依存の内容 |
|---|---|---|
| ADR | ADR-001（build/buy）、DL-13（製品評価） | 調達の必須要件: custom domain での issuer・RP ID・entityID、自社 sub の属性出力、credential record（user handle・BE/BS を含む）の export/import、pairwise の秘密とアルゴリズムの持ち出し |
| ADR | ADR-002 | フィッシング耐性、`verified_claims` の採否 |
| ADR | ADR-004（B2B federation） | 3 つ組の連携 ID、結合の規則、顧客のドメイン検証、SAML 接続の移行 |
| ADR | ADR-005（token profile） | 内部 issuer（V4）、1 token に 1 tid（V9）、claim の意味、typ、主体類型 claim の名前 |
| ADR | ADR-006 | 剥奪の反映、`status` |
| ADR | **ADR-007（鍵階層）** | **issuer の粒度（KD7-1）を本書の K21-1 と同時に決裁する。本書の案を採る場合、ADR-007 の「テナント別 issuer」の前提を見直し、D21-07 の鍵スコープ検証を鍵階層の要件に移す** |
| ADR | ADR-008 | ゾーン変更の二者統制 |
| ADR | ADR-009 | Txn-Token の採否、trust domain の命名 |
| ADR | ADR-011 | 名前空間と、エンジン固有構文への写像 |
| ADR | ADR-013・ADR-023 | issuer に cell を含めない。静的配信と global 部品の最小化 |
| ADR | ADR-014 | 監査の相関識別子の欄 |
| ADR | ADR-015・ADR-016 | alg 名を識別子に含めない。profile の版、名前の deprecation |
| ADR | ADR-017 | 主体類型、act/may_act |
| ADR | ADR-018 | 識別子を保ったままの製品退出 |
| ADR | ADR-019 | sid による全 session 失効 |
| ADR | ADR-020 | `authorization_details` の採否 |
| ADR | ADR-022 | 「識別子だけが不可逆」とする連携契約の扱い |
| ADR | ADR-028 | 統合・分割・移動、専用 issuer への移動の手順 |
| 設計文書 | DL-71（common.schema.json）、DL-75、DL-77、DL-48（主体カタログ）、DL-49（テナントライフサイクル）、DL-47（耐久性憲章 §5.3）、DL-80（契約試験キット）、DL-26 | 形式の正本、台帳、CI 検査、契約試験 |
| 統制 | 06_controls（C-xxx: ドメイン統制）、01_governance/kri.md（ドメインの保有状態） | D21-02 |
| 契約 | registrar との契約（registry lock、長期登録）、AS 製品の契約（custom domain の継続提供、export）、顧客との trust agreement（識別子と鍵の更新手順。N-7 の SHALL） | D21-02、D21-18、D21-19 |

---

## 対応表（R/G）

| ID | 種別 | 本書の箇所 | 閉じ方 | 状態 |
|---|---|---|---|---|
| G-067 | 主 | 全体、§2.12 の K21-1〜K21-6 | B | 決裁案まで（DEC-3 で決裁するまで未達） |
| G-020 | 主（全 ADR 共通） | §1〜§9（文脈、選択肢、却下案と理由、決定条件、帰結、可逆性、再検討トリガー、証拠） | A | 本書で閉じた（必須節の有無。作成者以外のレビューを待つ） |
| R-037 | 主 | D21-09, D21-14c, TC-021-13 | C | 要実測 |
| R-047 | 主 | D21-14b, D21-19, D21-20, TC-021-06 | C | 要実測 |
| R-209 | 主 | D21-01, D21-06, D21-25, D21-29〜D21-33, §3.9 | A | 本書で机上を閉じた（DEC-3 の決裁は G-067 で扱う） |
| CL-0127 | 主張台帳 | D21-09〜D21-13（根拠を付けて維持） | A | 本書で閉じた |
| CL-0125 | 主張台帳 | D21-03, D21-07（iss と鍵の結合） | A | 本書で閉じた（token 側は DL-16） |
| R-029 | 関連 | D21-10（類型は明示の claim で運ぶ） | A | 本書と DL-48 で閉じた |
| R-036, R-046 | 関連 | D21-19, D21-20, TC-021-06 | C・D | 要実測、要第三者（OIDF 適合試験） |
| R-043 | 関連 | D21-15〜D21-18 | B | 決裁案まで（同期 passkey の受入れは ADR-002） |
| R-090, R-208 | 関連 | D21-01, D21-11, D21-18, 案E の棄却 | A | 本書で机上を閉じた（実証は TC-021-01・04） |
| R-101, R-104 | 関連 | D21-06, D21-42（識別子に alg 名を含めない） | A | 本書で閉じた（PQ の実測は ADR-015） |
| R-105, R-109 | 関連 | D21-27, D21-38（名前の deprecation、claim 名の不変） | A | 本書で閉じた（版の方式は ADR-016） |
| R-118, R-128 | 関連 | D21-34〜D21-37, TC-021-10, TC-021-11 | A・C | 設計は本書で閉じた。復元は要実測 |
| R-140, G-116 | 関連 | D21-25, K21-5 | B | 決裁案まで |
| R-150, G-075 | 関連 | D21-29〜D21-32, TC-021-12 | C | 要実測 |
| R-158 | 関連 | D21-22〜D21-24 | A | 本書で閉じた |
| R-161, G-088 | 関連 | D21-03, D21-07, TC-021-02, TC-021-03 | C | 要実測 |
| R-173 | 関連 | §3.5（案D のリスク）、D21-03 | C | 要実測 |
| R-203 | 関連 | D21-18（認証器と回復は自作しない） | B | 決裁案まで（ADR-001） |
| R-250, R-283 | 関連 | D21-12, D21-14 | A・C | 設計は本書で閉じた。複数所属は要実測（ADR-005 H-10。整合調整で番号を修正） |
| G-065, G-073 | 関連 | §1.1、D21-31（L2 の教訓） | B | 決裁案まで |
| G-081 | 関連 | TC-021-02, TC-021-13 | C | 要実測 |
| G-086, G-101 | 関連 | D21-09〜D21-14d（主体類型の識別子） | A | 本書と DL-48 で閉じた |
| G-137 | 関連 | D21-29 | C | 契約の凍結待ち |
| G-139 | 関連 | D21-05, K21-3 | B | 決裁案まで（法務・コンプライアンスの判断待ち） |
| G-141 | 関連 | D21-03（sandbox を別 domain にする）, D21-22, TC-021-02 | C | 要実測 |

抽出方法: G-goal-criteria.md の対応成果物欄に本書のパスを含む行は G-067 である [D]。G-020 は全 ADR が対象である [D]。R-requirements.md の対応成果物欄に本書のパスを含む行はなかった [D]。R-037・R-047・R-209 は、deliverables.md の ADR-021 行から採った [D]。

---

## 残課題

| # | 本書で閉じないもの | 担当 | 閉じるゲート |
|---|---|---|---|
| 1 | K21-1〜K21-6 の決裁（特に、ADR-007 KD7-1 と同時に行う issuer 粒度の決裁） | CTO＋CISO（アーキテクチャ審査会）、経営会議（K21-2） | DEC-3 |
| 2 | 新規仮定 NA-021-1〜NA-021-5 の前提台帳への追加と値の確定 | 前提台帳の所有者 | G1〜G3 |
| 3 | sub・tid の符号化方式、client_id の値域を分ける方式、専用 issuer の上限、対応表の期限と遅延予算、JWKS のサイズ上限、ドメイン統制と台帳運用の工数 | 認証チーム、SRE 責任者、事業責任者、プロダクト責任者 | G3〜G4（§2 の各 TBD） |
| 4 | 統合者が取得した原典（[^2], [^10], [^34] の §3.4・§6.1, [^36]〜[^42], [^43] の §5・§6, [^44], [^45]）の、作成者以外による照合 | 引用監査の担当 | Phase 4 の検証 |
| 5 | TC-021-01〜TC-021-16 の採番と実測 | 12_poc（DL-22） | G4 |
| 6 | 第三者評価（§7.2） | CISO（DL-59・DL-30） | G5 |
| 7 | `verified_claims`（OpenID Identity Assurance）と OIDC session 関連仕様の調査ストリーム | 調査担当 | G3 |
| 8 | ドメイン統制の C-xxx と KRI の採番 | 06_controls、01_governance | G3 |
| 9 | 棄却仮説 RH-01〜RH-12 の traceability/rejected-hypotheses.md への集約 | traceability の担当 | Phase 4 |

---

## 参考文献

[^1]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §2 ID Token の sub、§5.7 Claim Stability and Uniqueness、確認日: 2026-10-03。RS-03#58, RS-14#1）
[^2]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §8 Subject Identifier Types、§8.1 Pairwise Identifier Algorithm、確認日: 2026-10-15。統合時に取得。research 未収録）
[^3]: OpenID Foundation『OpenID Connect Discovery 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-discovery-1_0.html （参照箇所: §3, §7、確認日: 2026-10-03。RS-16#17）
[^4]: M. Jones, N. Sakimura, J. Bradley『RFC 8414 OAuth 2.0 Authorization Server Metadata』2018-06. https://www.rfc-editor.org/rfc/rfc8414 （参照箇所: §3.3、確認日: 2026-10-03。RS-16#18）
[^5]: IETF (K. Meyer zu Selhausen, D. Fett)『RFC 9207: OAuth 2.0 Authorization Server Issuer Identification』2022-03. https://www.rfc-editor.org/rfc/rfc9207 （参照箇所: §2, §2.4、確認日: 2026-10-03。RS-04#71）
[^6]: IETF (T. Lodderstedt ほか)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.1, §2.6, §4.4, §4.15.1、確認日: 2026-10-03。RS-04#4, #22）
[^7]: Y. Sheffer, D. Hardt, M. Jones『RFC 8725 (BCP 225): JSON Web Token Best Current Practices』2020-02. https://www.rfc-editor.org/rfc/rfc8725.html （参照箇所: §3.8、確認日: 2026-10-03。RS-05#36）
[^8]: NIST (D. Temoshok ほか)『SP 800-63C-4 Digital Identity Guidelines: Federation and Assertions』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §2.3, §3.4, §3.6.1, §3.8.1, §4.6.2.1, §4.9、確認日: 2026-10-03。RS-03#57, #59, RS-14#2, #14, #15）
[^9]: W3C『Web Authentication: An API for accessing Public Key Credentials Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （参照箇所: §4 Relying Party Identifier、§5.11、§5.11.1、確認日: 2026-10-03。RS-03#29, RS-15#59）
[^10]: W3C『Web Authentication: An API for accessing Public Key Credentials Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （参照箇所: §5.4.3 User Account Parameters for Credential Generation（PublicKeyCredentialUserEntity の id）、確認日: 2026-10-15。統合時に取得。research 未収録）
[^11]: FIDO Alliance『Credential Exchange Format』v1.0 Proposed Standard (errata), 2026-03-09. https://fidoalliance.org/specs/cx/cxf-v1.0-ps-errata-20260309.html （参照箇所: Status of This Document、確認日: 2026-10-03。RS-03#30）
[^12]: FIDO Alliance『Download Credential Exchange Specifications』（CXP v1.0 Working Draft 2024-10-03 の掲載）. https://fidoalliance.org/download-credential-exchange-specifications/ （参照箇所: CXP の版・成熟度、確認日: 2026-10-03。RS-03#30）
[^13]: Microsoft Learn『Secure applications and APIs by validating claims』ms.date 2025-03-21. https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation （参照箇所: Validate the tenant、Validate the subject（Warning）、確認日: 2026-10-03。RS-03#64）
[^14]: Descope『nOAuth: How Microsoft OAuth Misconfiguration Can Lead to Full Account Takeover』2023-06-20. https://www.descope.com/blog/post/noauth （参照箇所: Executive summary、Disclosure timeline、確認日: 2026-10-03。RS-03#61, RS-12#42）
[^15]: Microsoft Security Response Center『Potential Risk of Privilege Escalation in Azure AD Applications』2023-06-20. https://www.microsoft.com/en-us/msrc/blog/2023/06/potential-risk-of-privilege-escalation-in-azure-ad-applications （参照箇所: 緩和策、開発者向け推奨、確認日: 2026-10-03。RS-03#62, RS-12#43）
[^16]: Semperis『nOAuth Abuse Alert: Full Account Takeover of Entra Cross-Tenant SaaS Applications』2025-06-25. https://www.semperis.com/blog/noauth-abuse-alert-full-account-takeover/ （参照箇所: Key findings、Research methodology、確認日: 2026-10-03。RS-12#44）
[^17]: Microsoft Security Response Center『Results of Major Technical Investigations for Storm-0558 Key Acquisition』2023-09-06（2024-03-12 追記）. https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition （参照箇所: Why a consumer key was able to access enterprise mail、確認日: 2026-10-03。RS-12#5）
[^18]: Dirk-jan Mollema『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: 冒頭 4 段落、Actor tokens、確認日: 2026-10-03。RS-12#53）
[^19]: OpenID Foundation『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2.6 Identifier Recycled、確認日: 2026-10-03。RS-03#66）
[^20]: P. Hunt ほか『RFC 7644 System for Cross-domain Identity Management: Protocol』Proposed Standard, 2015-09. https://www.rfc-editor.org/rfc/rfc7644 （参照箇所: §3.6、確認日: 2026-10-03。RS-14#10）
[^21]: P. Hunt ほか『RFC 7643 System for Cross-domain Identity Management: Core Schema』Proposed Standard, 2015-09. https://www.rfc-editor.org/rfc/rfc7643 （参照箇所: §3.1、確認日: 2026-10-03。RS-03#75）
[^22]: SPIFFE Project『The SPIFFE Identity and Verifiable Identity Document』standards/SPIFFE-ID.md（Stability: Stable、最終変更 2026-07-01）. https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE-ID.md （参照箇所: §2.1.1、確認日: 2026-10-03。RS-06#7）
[^23]: J. Salowey, Y. Rosomakho, H. Tschofenig / IETF『Workload Identity in a Multi System Environment (WIMSE) Architecture』draft-ietf-wimse-arch-08, 2026-07-06（WG Document、IESG 未提出）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-arch-08 （参照箇所: §3.1.1、確認日: 2026-10-03。RS-06#17）
[^24]: IETF『Workload Identity Practices』draft-ietf-wimse-workload-identity-practices-07, 2026-09-22（Internet-Draft）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-workload-identity-practices-07 （参照箇所: §5.8、確認日: 2026-10-03。RS-06#27）
[^25]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（WG Consensus: Waiting for Write-Up、IESG 未提出）. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §9.1, §9.2, §12.2, §13.1, §13.15, §15.2、確認日: 2026-10-03。RS-06#29, #31, #35, #36, #40, #41）
[^26]: R. Housley『RFC 7696 Guidelines for Cryptographic Algorithm Agility and Selecting Mandatory-to-Implement Algorithms』BCP 201, 2015-11. https://www.rfc-editor.org/rfc/rfc7696 （参照箇所: §5、確認日: 2026-10-03。RS-11#40）
[^27]: OpenID Foundation『OpenID 2.0 to OpenID Connect Migration 1.0』Final, 2015-04-16. https://openid.net/specs/openid-connect-migration-1_0.html （参照箇所: Abstract、openid2_id、確認日: 2026-10-03。RS-11#68）
[^28]: CloudEvents『CloudEvents - Version 1.0.2』（タグ ce@v1.0.2, 2022-02-06）. https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md （参照箇所: Context Attributes の id, source, type、確認日: 2026-10-03。RS-16#9, #10）
[^29]: OpenFGA『Modular Models』web 文書（版表記なし）. https://openfga.dev/docs/modeling/modular-models （参照箇所: code owners、Type extensions の制約、確認日: 2026-10-03。RS-17#85）
[^30]: AuthZed『Updating and Migrating Schema in SpiceDB』（版表記なし）. https://authzed.com/docs/spicedb/modeling/migrating-schema （参照箇所: 許される変更と拒否される変更、複数段階の移行手順、確認日: 2026-10-03。RS-17#88）
[^31]: S. Sahib ほか『Domain Control Validation using DNS』draft-ietf-dnsop-domain-verification-techniques-13, 2026-06-22（Internet-Draft、BCP 予定）. https://datatracker.ietf.org/doc/draft-ietf-dnsop-domain-verification-techniques/ （参照箇所: §3, §6.3, §9.11, §9.13、確認日: 2026-10-03。RS-14#24, #25, #27）
[^32]: Okta (Auth0)『Enable and Configure Passkey Authentication for Database Connections』Auth0 Docs. https://auth0.com/docs/authenticate/database-connections/passkeys/configure-passkey-policy （参照箇所: custom domain と RP ID の注意、確認日: 2026-10-03。RS-15#46）
[^33]: Amazon Web Services『WebAuthnConfigurationType』Amazon Cognito API Reference. https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_WebAuthnConfigurationType.html （参照箇所: RelyingPartyId、確認日: 2026-10-03。RS-15#54）
[^34]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6, §6.1, §6.2, §7.2, §8 は確認日 2026-10-03（RS-10#16〜#18）。§3.2.2.3, §3.4 は確認日 2026-10-15（統合時に取得））
[^35]: OpenTelemetry『OpenTelemetry Specification — Tracing SDK』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/trace/sdk.md （参照箇所: Sampler — SamplingResult の Decision（DROP）、確認日: 2026-10-03。RS-10#22）
[^36]: M. Jones, J. Bradley, N. Sakimura『RFC 7519 JSON Web Token (JWT)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §1.1, §4.1.7 jti, §4.2 Public Claim Names, §4.3 Private Claim Names、確認日: 2026-10-15。統合時に取得。research 未収録）
[^37]: P. Hunt ほか『RFC 8417 Security Event Token (SET)』Standards Track, 2018-07. https://www.rfc-editor.org/rfc/rfc8417 （参照箇所: §2.2 txn、確認日: 2026-10-15。統合時に取得。research 未収録）
[^38]: A. Backman, M. Scurtescu, P. Jain『RFC 9493 Subject Identifiers for Security Event Tokens』Standards Track, 2023-12. https://www.rfc-editor.org/rfc/rfc9493 （参照箇所: §3.2.3 Issuer and Subject Identifier Format, §3.2.8 Aliases Identifier Format, §4.1 sub_id, §6.1 Identifier Correlation、確認日: 2026-10-15。統合時に取得。research 未収録）
[^39]: IANA『JSON Web Token (JWT) — JSON Web Token Claims registry』Last updated 2026-07-20. https://www.iana.org/assignments/jwt/jwt.xhtml （参照箇所: 登録手続（Specification Required）と、sid, txn, jti, act, may_act, cnf, client_id, acr, amr, auth_time, authorization_details, roles, groups, entitlements, status, verified_claims, sub_id の各行、確認日: 2026-10-15。統合時に取得。research 未収録）
[^40]: OpenID Foundation『OpenID Connect Front-Channel Logout 1.0』Final. https://openid.net/specs/openid-connect-frontchannel-1_0.html （参照箇所: §1.2 Terminology（Session ID）、§3 sid、§5、確認日: 2026-10-15。統合時に取得。research 未収録）
[^41]: OpenID Foundation『OpenID Connect Back-Channel Logout 1.0 incorporating errata set 1』Final, 2023-12-15. https://openid.net/specs/openid-connect-backchannel-1_0.html （参照箇所: §2.1 の sid、§2.4 Logout Token、確認日: 2026-10-15。統合時に取得。research 未収録）
[^42]: W3C Verifiable Credentials WG『Verifiable Credentials Data Model v2.0』W3C Recommendation, 2025-05-15. https://www.w3.org/TR/vc-data-model-2.0/ （参照箇所: §4.4 Identifiers, §4.7 Issuer, §4.8 Credential Subject, §4.10 Status、確認日: 2026-10-15。統合時に取得。research 未収録）
[^43]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.2 は確認日 2026-10-03（RS-04#60, #61）。§2.2.3.1, §5, §6 は確認日 2026-10-15（統合時に再確認））
[^44]: OASIS『Assertions and Protocols for the OASIS Security Assertion Markup Language (SAML) V2.0』OASIS Standard, 2005-03-15. https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf （参照箇所: §8.3.6 Entity Identifier, §8.3.7 Persistent Identifier、確認日: 2026-10-15。統合時に PDF を取得して本文を抽出し、確認した。research 未収録）
[^45]: IETF (K. Davis, B. Peabody, P. Leach)『RFC 9562: Universally Unique IDentifiers (UUIDs)』Proposed Standard, 2024-05. https://www.rfc-editor.org/rfc/rfc9562 （参照箇所: §5.4, §5.7, §8、確認日: 2026-10-15。統合時に取得。research 未収録）
[^46]: IETF (W. Denniss, J. Bradley)『RFC 8252: OAuth 2.0 for Native Apps』BCP 212, 2017-10. https://www.rfc-editor.org/rfc/rfc8252 （参照箇所: §7.1、確認日: 2026-10-03。RS-17#8）
[^47]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §5 Information Model、確認日: 2026-10-03。RS-07#63）
[^48]: 本リポジトリ『階層を三つの関係に分けて名前の揺れを断つ』research/RS-18-hierarchy-modeling.md（deep research、2026-10-15、commit 30b3260）. research/RS-18-hierarchy-modeling.md （参照箇所: 「ID は不透明な値と型の組にし、パスは属性に追い出す」, 「補足: user_id ではなく sub、client_id、act を分ける」、確認日: 2026-10-15。独立検証記録がなく、設計の入力としてだけ参照する。RS-18 のモデル例はエンジンの検証器を実行していない（ARC-05 残課題 16））
