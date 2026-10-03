# ADR-005 token profile（opaque/JWT 境界・寿命・sender constraint）

> 文書ID: ADR-005 / 版: 0.1 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-03
> 可逆性: 可逆（条件付き・非対称）。外部境界を opaque から JWT へ移す変更は client を壊さないが、逆向きは外部の解析依存を壊し得る。不可逆側に属するのは、issuer 識別子（ADR-021）、契約に載せる typ 名・claim の意味（ADR-022、DL-75）、外部契約に書く opaque token の最大長（D10-3）である（§3.3）
> DEC-3 対象: いいえ（traceability/deliverables.md §5 の DEC-3 列は「—」。依存先の ADR-001・ADR-007・ADR-013・ADR-021・ADR-022 は DEC-3 対象）
> 対応要求: R-095, R-158（本書を対応成果物に含む行）／G-087, G-020（同）。関連: R-087, R-112, R-159, R-160, R-161, R-162, R-163, R-173, R-189.1, R-189.2, R-189.4, R-189.5, R-189.6, R-206, R-208, R-209, R-239, R-240, R-249, R-250, R-251, R-259, R-270, R-283, R-046／G-024, G-062, G-068, G-072, G-077, G-081, G-088, G-089, G-103, G-106, G-115, G-136(d), G-138（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md, traceability/dissent-log.md, 01_governance/assumptions-register.md, 01_governance/business-impact-analysis.md, 01_governance/loss-scenarios.md, 02_requirements/operation-risk-tiers-assurance.md, 02_requirements/as-is-inventory.md, 03_threat-model/attacker-model.md, research/RS-03, RS-04, RS-06, RS-09, RS-11, RS-12, RS-13, RS-15, RS-16, RS-17（各 verification 記録を含む）, research/standards-status.md
> 作成方法: 3 つの起草レンズ（sec: セキュリティ・保証、ops: 運用性・費用・組織実現性、evo: 20 年の進化・退出）の提案と、判定者 3 名の採点をもとに、AI エージェント（Claude）が最終起草した。判定者も AI エージェントであり、本書の採点と判定は模擬パネルの自己レビューで、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。

**要旨（結論）**

- OAuth client（第一者の BFF・ネイティブ・CLI、第三者・顧客自作アプリ、外部 M2M）に渡す access token と refresh token はすべて opaque にし、edge が cell 内の状態ストア（AS から発行・失効を push で受ける RFC 7662 interface）に照会する [D]。内部はサービス別 aud の RFC 9068 JWT を token exchange で発行し、共通 SDK が無効化できない検証規則（V1〜V14）で局所検証する [D]。
- 寿命は一律値を置かず、token 種別×操作階層ごとに上限（規範・剥奪反映・被害窓・session）と下限（発行容量・KMS 署名 QPS・停止耐性）から導く [D]。下限が上限を上回っても寿命は延ばさず、fail-mode で扱う [D]。値はすべて TBD（所有者・ゲート付き）である [D]。
- refresh token は client 種別ごとに保護方式を変える（confidential は client 認証で束縛し rotation なし、public は DPoP 鍵束縛を既定）[D]。sender constraint は経路で使い分け（内部・BFF・サーバー連携は mTLS、public client と TLS を手前で終端する連携は DPoP＋nonce、privileged・FAPI 範囲は mTLS のみ）、ブラウザは BFF を必須にする [D]。第三者 grant は台帳・棚卸し・client 単位の一括失効を既定にする [D]。
- 本案（判定集計の勝者 sec を土台とする案B）は、状態ストアの負荷試験（基準 8,402/秒、成長 28,222/秒）と停止注入（H-02・H-04）に不合格なら、BFF 経路を JWT にする案C（ops・evo の推奨）へ切り替える [D]。切替条件は §4.5・§8 に示す [D][A-040, A-030]。

---

## 1. 文脈

### 1.1 解くべき問題

旧提案は「一時アクセストークンは基本的に JWT」とし、寿命を一律 5〜15 分とした [D]。主張台帳は前者を否定する主張（CL-0013）を本 ADR の入力として「維持」とし、一律寿命（CL-0131、CL-0236）を「要実測」とした [D]。レビューは一律値を撤回し、リスク階層と実測で決めるよう求めた（R-087）[D]。本 ADR が答える問いは次の 7 つである [D]。

| # | 問い | 主な R/G | 主張台帳の入力 |
|---|---|---|---|
| Q1 | access token を外部境界と内部境界で opaque と JWT（RFC 9068）のどちらにするか | R-095, G-087 | CL-0013（維持）、CL-0026（維持） |
| Q2 | token 種別ごとの typ 分離と検証規則（種別間の相互排他を含む） | R-161, R-162, G-088 | CL-0126（aud の粒度）、CL-0130（claim 名の修正） |
| Q3 | 一律値を使わず、操作リスク階層と A-ID から寿命を決める方法 | R-087, R-189.1, R-189.2, R-189.6, G-024 | CL-0131, CL-0236（要実測） |
| Q4 | refresh token を rotation と sender constraint のどちらで守るか | R-158, R-239, R-259 | CL-0235（維持） |
| Q5 | DPoP と mTLS の使い分け | R-163, R-239 | — |
| Q6 | ブラウザで BFF を必須にするか | R-163 | — |
| Q7 | 第三者連携アプリの grant の寿命と棚卸し。RFC 9700 への準拠方針 | R-158, R-159, G-062 | — |

### 1.2 制約

**規範（強度は原文どおり）**

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-a | public client は PKCE を使う。confidential client は RECOMMENDED | MUST / RECOMMENDED | RFC 9700 §2.1.1 [N][^1]（RS-04#8, #9） |
| N-b | public client の refresh token は sender-constrained にするか rotation を使う。confidential client の refresh token は発行先 client だけが使えることを RFC 6749 がすでに求めている（§2.2.2 と §4.14.2 の双方に記載。起草時に原文を確認） | MUST | RFC 9700 §2.2.2, §4.14.2 [N][^1]（RS-04#15） |
| N-c | access token は sender-constrained かつ audience-restricted にすべきである。RS は自分宛てでない token を拒否する | SHOULD / MUST | RFC 9700 §2.2.1, §2.3 [N][^1]（RS-04#14, #17） |
| N-d | JWT access token の RS は typ（at+jwt または application/at+jwt）・iss・aud・署名・exp を検証する。AS と RS は RS256 を対応アルゴリズムに含める。同じ issuer が別 resource 向けに出す token には別の aud を使う | MUST | RFC 9068 §2.1, §4, §5 [N][^7]（RS-04#60, #61） |
| N-e | alg を allowlist で扱い、1 鍵 1 alg、鍵と issuer の結合を検証し、同じ issuer の複数種別の JWT は検証規則を互いに排他にする | MUST | RFC 8725 §3.1, §3.8, §3.12 [N][^8]（RS-04#62） |
| N-f | FAPI 2.0 範囲では、RS は失効状態を検証し（shall）、query の access token を受け付けず（shall not）、AS は confidential client だけを支援し、例外を除き refresh token rotation を使わない（shall not）。JWT の alg は PS256・ES256・EdDSA に限る（shall） | shall / shall not | FAPI 2.0 Security Profile §5.3.2.1, §5.3.4, §5.4 [N][^2]（RS-04#41, #45, #46, #47） |
| N-g | BFF は業務・機微・個人データのアプリに "strongly recommended"（小文字表記で BCP 14 キーワードではない） | 推奨（非 BCP 14） | RFC 10017 §6.1.4.3 [N][^13]（RS-04#73） |
| N-h | 再認証の上限: AAL2 は全体上限を設け（SHALL）24h 以内・無操作 1h 以内（SHOULD）。AAL3 は全体 12h 以内（SHALL）・無操作 15 分以内（SHOULD） | SHALL / SHOULD | SP 800-63B-4 §2.2.3, §2.3.3 [N][^27]（RS-03#43） |

- RFC 9068 の RS256 MUST と FAPI の alg 制限は、FAPI 範囲では同時に満たせない（RS-04 §2-7）[D]。
- レビューは一律値（全 token 一律の寿命）を未承認とした（R-087、G-024）[D]。

**規模・組織・可用性**

- 同時アクティブ session は 111,200（台帳 §12.2 手順 2）、有効 session は 86.5 万、edge API はピーク 16,804/秒である [A-005][A-006][A-040]。
- 外部 OAuth client は 800・有効 grant は 3 万（成長シナリオ 2,500・12 万）である [A-013]。
- 依存サービスは約 300、開発は 25 組織・60 チーム・1,500 人、プラットフォームチームは 24 FTE（認証 5、PEP SDK 4、SRE 6 ほか）である [A-050][A-052][A-053][A-054]。
- 判定系の可用性帯は 99.95〜99.99%、認証系は 99.9〜99.95% と仮置きされている [A-090][A-091]。
- BIA は、F1（login・token 発行・refresh の停止）では access token の寿命が切れた時点から F2（判定不能）と同じ影響になり得るとし、MTPD を read-sensitive 4 時間・write 2 時間・privileged（通常の管理操作）24 時間と仮置きしている（BIA NA-01、前提台帳へ追加要）[D][A-027]。
- BIA は break-glass を「基盤に依存させない。基盤に MTPD を割り当てない」とし、REQ-03 は break-glass/P を連携に依存しないローカル資格情報としている [D]（GOV-04 §2.3、REQ-03 §3.1）。
- 計画期間は 20 年で、token 署名の暗号移行（1 回以上）と AS/IdP 製品の置換（1 回以上）を前提にする [A-100][A-103][A-104]。

### 1.3 前提（A-ID）

| A-ID | 値（基準） | 本 ADR での使い方 |
|---|---|---|
| A-005 | 同時アクティブ session 111,200 | refresh/秒と exchange/秒（D3 の感度表） |
| A-006 | 有効 session 86.5 万（成長 251.6 万） | refresh token ストアと BFF session store の件数 |
| A-007 | テナント 1 万 | grant の棚卸し（平均 3 件/テナント） |
| A-012 | 本番インスタンス 1.1 万 | 内部 cnf 検証の展開対象（H-16） |
| A-013 | client 800・grant 3 万（成長 2,500・12 万） | 第三者 grant の棚卸しと一括失効の規模 |
| A-015 | 複数テナント所属 3% | 1 token 1 tid（V9） |
| A-027 | access token 寿命 10 分（容量計算用の仮置き、決定値ではない） | 感度表の基準点にだけ使う。寿命の決定値には使わない |
| A-028 | 下流 audience 6 | exchange の発行量 |
| A-030 | opaque 比率 30%・cache miss 50%（案C の構成を前提にした値） | 案ごとの introspection 量 |
| A-040 | edge API 16,804/秒（成長 56,444、規制 20,057） | 状態ストアの照会量 |
| A-042・A-043・A-044 | refresh 185/秒、token 発行 1,374/秒（うち exchange 1,112）、introspection 2,521/秒（範囲 0〜8,402） | 案の比較 |
| A-050・A-052・A-053・A-054 | 300 サービス、25 組織・60 チーム、1,500 人、24 FTE | 統合点と要員 |
| A-063 | リージョン 4 | cell 内部品の配備数 |
| A-080・A-081 | 規制業種 25%（規制強化 65%）、高保証要求テナント 50（同 600） | FAPI 範囲（ADR-020）と再検討トリガー |
| A-090・A-091 | 判定系・認証系の可用性帯 | 状態ストアと STS の可用性要件 |
| A-100〜A-104 | 20 年、再決裁 3→5 年、成長率、暗号移行・製品置換 各 1 回以上 | 進化・退出の規則（D10） |
| A-110 | 独自セッション 105 サービス | BFF への移行対象 |

### 1.4 新規仮定（前提台帳へ追加要）

前提台帳は本書から編集しない [D]。次の仮定は前提台帳への追加が要る [D]。

| 仮 ID | 内容 | 本書での扱い | 由来 |
|---|---|---|---|
| NA-005-1 | DPoP proof の受理窓 W | 上限計算にだけ 60 秒を使う。値は H-05 で決める | RFC 9449 は受理を作成後の限られた時間（秒〜分）に限ることを MUST とする [N][^5]（RS-04#56） |
| NA-005-2 | edge 呼出しのうち DPoP 束縛 token を提示する比率 | 上限計算では 100%。G1 の As-Is 実測で置き換える | sec NA-2、evo N-2 |
| NA-005-3 | edge 呼出し 1 件あたりの内部 RS 呼出し数 k | 値は置かない（案D の式にだけ使う） | 台帳に該当なし |
| NA-005-4 | 最大の第三者連携事業者が持つ grant の比率 | 値は置かない（H-08 の試験規模） | sec NA-4 |
| NA-005-5 | 本 ADR の実装に伴う要員の増分 | 値を置かない。A-054 の内数に収まるかを H-18 で測る | 判定者が sec の「FTE 1 桁以下」と evo の「FTE 1〜3」を根拠なしと指摘したため値を削除した |
| NA-005-6 | jti 1 件の保持長 | 128 byte と仮置き（容量の桁の計算だけに使う） | ops NA-005-4 |
| NA-005-7 | BFF の server-side session 1 件の保持長 | 4 KB と仮置き（同上） | ops NA-005-6 |
| NA-005-8 | privileged と break-glass/B の呼出しが edge 呼出しに占める比率 | TBD（所有者 CTO、ゲート G3）。内部 stateful 照合の負荷を決める | ops NA-005-2 |
| NA-005-9 | 第三者 client のうち登録時点で mTLS または DPoP を実装できる比率と移行速度 | TBD（所有者 プロダクト責任者、ゲート G1） | evo N-3 |
| NA-005-10 | 第三者サーバー型 client のうち end-to-end の mTLS を張れる（CDN・WAF で TLS を終端しない）比率 | TBD（所有者 プロダクト責任者、ゲート G1）。§2.12 決裁案 3 の入力 | 判定者 1 の条件 |

### 1.5 関連 R/G

本書を対応成果物に含む行は R-095、R-158、G-087、G-020 である [D]。関連する R/G と閉じ方は末尾の対応表にまとめた [D]。

### 1.6 関連研究

| 研究 | 使う項目 |
|---|---|
| RS-04 | #1〜#39（RFC 9700 採否表の素案）、#40〜#52（FAPI 2.0）、#53〜#59（PAR・DPoP・mTLS）、#60〜#65（JWT の形式と検証、8725bis、RAR、resource）、#66（token exchange）、#67〜#70（introspection・失効・refresh）、#71・#72（RFC 9207・step-up）、#73〜#75（RFC 10017）、#76〜#80（OAuth 2.1・SSF・Token Status List） |
| RS-03 | #43・#44・#48（再認証の上限、session の AAL、step-up） |
| RS-06 | #30・#31・#35（Transaction Tokens） |
| RS-09 | #8（jitter）、#10（静的安定性）、#14（fallback の害）、#15（bimodal）、#36（短命資格情報の時限爆弾）、#41・#43（break-glass の独立） |
| RS-11 | #8（IR 8547 Table 2）、#36（RFC 7696）、#41・#43・#44（ML-DSA、fully-specified、composite）、#51・#53・#54（1 鍵 1 alg、RS256 の MTI）、#56・#59・#62・#63（サイズ） |
| RS-12 | #1・#5・#10・#11（Storm-0558・CSRB）、#37・#41（Salesloft Drift）、#53・#54（CVE-2025-55241）、#57・#58（鍵削除障害・OAuth 停止）、#59・#61（GitHub/Heroku） |
| RS-13 | #39（PSD2 RTS）、#48（T1528）、#57・#59（device code）、#60・#61（consent phishing）、#63・#64・#66（DBSC） |
| RS-15 | #4〜#6・#8・#11・#45（OIDF 認定と製品の FAPI 構成） |
| RS-16 | #14・#16（未知の claim、crit） |
| RS-17 | #2〜#6（BFF・ネイティブ）、#13・#14・#17（device grant）、#18・#21（M2M、7523bis）、#24（offline_access）、#57・#58・#62・#64・#65（第三者連携）、#79・#83 と §2-14（gateway 迂回） |

### 1.7 攻撃者モデルの範囲

- FAPI 2.0 Attacker Model は A1、A1a、A2、A3a、A5 などを定義し、侵害された端末・ブラウザ、AS 上の RCE、誤設定 DB からの資格情報漏えい、JWKS の配布障害を範囲外とする [N][^3]（RS-04#50）。
- 攻撃者モデル（DL-51 §5.3）は、ATK-07・08・10・12・17・18・19 を FAPI の記号で表せない類型とし、ATK-05・06・11・14・15 の一部を範囲外の部分として整理している [D]。
- このため本 ADR は、FAPI 準拠だけでは扱えない類型に追加の統制と残余リスクの受容者案を置く（§6.3）[D]。

---

## 2. 決定

本節の決定はすべて決裁前の提案であり、決定済みではない [D]。経営・事業・法務の判断が要る点は §2.12 に決裁案として分けた [D]。本書の表で個別のタグがないセルは、同じ行の根拠・強度の列に示した区分に従う [D]。

### D1 境界（opaque/JWT）と失効の強制点

- **D1-1** OAuth client に発行する access token と refresh token はすべて opaque（参照型）にする [D]。対象は第一者の BFF・ネイティブアプリ・CLI、第三者・顧客自作アプリ、外部 M2M である [D]。RFC 9068 の JWT は OAuth client に渡さない [D]。
- **D1-2** opaque token を検証するのは edge（基盤が運用する cell ごとの API gateway 型 PEP）だけとする [D]。edge は cell 内の状態応答系（以下「状態ストア」）に RFC 7662 の interface で照会する [D]。状態ストアは AS から発行と失効を push で受け取り、AS 本体は判定の経路に入らない [D]（RS-09#14、A-044 の注記「AS 本体か分離した状態応答系か」への回答）。introspection の要求には認可が要る（MUST）ため、edge は状態ストアに対して client 認証する [N][^9]（RS-04#67）。
- **D1-3** AS が opaque token の状態を外部の状態ストアへ push できるかは製品に依存し、RS-15 では確認できていない（未確認）[D]。この機能は ADR-001 の必須評価項目にし、H-22 で確かめる [D]。製品が提供しない場合の自作費用は H-18 で要員と合わせて測る [D]。
- **D1-4** edge は検証済みの opaque token を cell 内の STS で RFC 8693 の token exchange にかけ、呼出し先サービス 1 つを aud とする RFC 9068 JWT（以下「内部 access token」）に置き換えて転送する [D]。resource の指定には RFC 8707 を使う [N][^57]（RS-04#65）。exchange の可否と act の扱いは ADR-009 で決める [D]（R-251）。
- **D1-5** trust domain 内の workload 間（P-03）は、workload identity の mTLS で client 認証して内部 access token を得る（ADR-009）[D]。
- **D1-6** 状態ストアへの照会が失敗したとき、AS 本体へ直接問い合わせる迂回は設けない [D]。AWS は分散 fallback が "often make the outage worse" と述べている [V][^45]（RS-09#14）。失敗時の挙動は操作階層ごとに DL-19 と ADR-013 で決める（D9 の表を入力にする）[D]。
- **D1-7** 外部から内部 RS への到達は edge 経由に限り、edge を迂回する経路はネットワークで遮断する [D]。edge は照会結果を未署名ヘッダで下流へ渡さない [D]。Google Cloud IAP の公式文書は、IAP を迂回されると未署名の ID ヘッダが偽造され得るとして、アプリに署名付きヘッダの検証を求めている [V][^66]（RS-17#79、RS-17 §2-14）。

D1-1 の理由は次のとおりである [D]。

| # | 理由 | 適用する client | 根拠 |
|---|---|---|---|
| 1 | RFC 9068 は client が access token の内容を調べることを MUST NOT とし、情報漏えいの対策に opaque token への切替えを挙げている（§6）。外部の client にこの遵守を技術的に強制する手段はない | 第三者・顧客自作・ネイティブ・CLI | [N][^7]（RS-04#61）、[D] |
| 2 | Microsoft は、悪性アプリを無効化しても既存の access token は期限まで有効のままだと記載している。opaque と状態ストアの組合せなら、照会の cache 上限 C(t) の範囲で既存 token も拒否できる | 第三者 | [V][^34]（RS-13#61）、[D] |
| 3 | REQ-03 §3.1 は write・privileged・break-glass で失効状態の確認を必須とし、FAPI 範囲の RS は失効状態を検証しなければならない（shall）。edge の照会 1 か所で、経路の例外なしに満たせる | 全 client（BFF を含む） | [N][^2]（RS-04#45）、[D] |
| 4 | 理由 1 は第一者 BFF には当てはまらない。BFF 経路も opaque にするのは、理由 3 に加えて、privileged の偽造 token 検知（D9）と同じ照会基盤を共有でき、edge の外部検証規則が opaque 1 系統になって負例試験の組合せが減るためである。この判断は H-02・H-04 の結果で見直す（§4.5） | BFF | [D]（判定者 3 の指摘を受けて理由を分けた） |
| 5 | 外部 client を AS の署名方式から切り離す。ML-DSA-65 で署名した JWT は約 5.0KB と計算され、cookie に入れると 4,096 octets の上限を超え cookie 全体が無視される（cookie 経路の制約）。Authorization ヘッダの経路では、nginx の既定の 1 ヘッダ 8k に ML-DSA-65 の access token は収まるが、ML-DSA-65 の DPoP proof（約 8.2KB）は HTTP/1.1 で超える。DPoP proof は client が自分の鍵で署名するため、opaque にしても DPoP 経路の PQ 化の影響は残る（H-11、ADR-015） | 全 client | [N][^29]（RS-11#56）、[V][^30]（RS-11#59）、[D]（RS-11#62, #63） |
| 6 | 外部形式を opaque に固定しておけば、後で JWT へ変えても内容を読まない client は壊れない。逆向きは client の解析依存を壊し得る | 全 client | [D] |

### D2 token 種別・typ・検証規則

**種別表** [D]

| 種別 | 形式・typ | 発行者 | 署名鍵 | aud | 受け入れ先 |
|---|---|---|---|---|---|
| 外部 access token | opaque。128 bit 以上のエントロピー。先頭に版・種別・経路識別子（D10-4） | 外部 AS | — | 同意した resource の集合 | edge のみ（状態ストアで照会） |
| refresh token | opaque。保存は hash のみ | 外部 AS | — | — | AS の token endpoint のみ |
| 認可コード | opaque。一回限り、60 秒以下 | 外部 AS | — | — | AS の token endpoint のみ |
| 内部 access token | JWT、typ=at+jwt | 内部 issuer（外部 AS と別の識別子、cell ごと） | 内部 issuer の at 専用鍵 | 呼出し先サービス 1 つ | 内部 RS（共通 SDK・sidecar 型 PEP） |
| ID Token | JWT（OIDC） | 外部 AS（OIDC issuer） | ID Token 用の鍵 | RP の client_id | RP のみ。RS では拒否 |
| introspection 応答（FAPI 範囲） | JWT、typ=token-introspection+jwt | 状態応答系 | 応答専用鍵 | edge | edge のみ |
| SET（SSF/CAEP/RISC） | JWT、typ=secevent+jwt | 送信元 | SET 専用鍵 | 受信者 | 受信 endpoint のみ |
| DPoP proof | JWT、typ=dpop+jwt | client | client の鍵（jwk ヘッダ） | —（htm/htu で束縛） | AS・edge |
| client assertion | JWT、typ=client-authentication+jwt | client | client 登録鍵 | AS の issuer 識別子だけ | AS のみ |
| レガシー gateway の署名ヘッダ | JWT、自社定義の版付き typ（名前空間は ADR-021） | gateway | gateway 専用鍵 | backend | レガシー backend のみ（RS-17#83、A-110） |
| Txn-Token（ADR-009 が採る場合） | JWT、typ=txntoken+jwt | trust domain の TTS | 専用鍵 | trust domain | 内部 RS。RFC 化まで採否保留 |

typ の根拠は次のとおりである [D]。

- at+jwt: RFC 9068 §2.1 は JWT access token が media type を typ で宣言することを MUST とし、値は "at+jwt" を SHOULD とする [N][^7]。RS は "at+jwt" または "application/at+jwt" を受け付け、それ以外を拒否しなければならない（§4、MUST）[N][^7]（RS-04#60）。本基盤は発行側で "at+jwt" を使う [D]。
- token-introspection+jwt は RFC 9701 の規定で、RS は置換攻撃を防ぐため typ を確認しなければならない（MUST）[N][^10]（RS-04#68）。
- secevent+jwt は SSF の MUST である [N][^19]（RS-04#77）。dpop+jwt は RFC 9449 §4.3 の検査項目（MUST）である [N][^5]（RS-04#55）。
- client-authentication+jwt と aud=issuer 単独は draft-ietf-oauth-rfc7523bis-11（IESG 承認済み、RFC 未発行）の SHOULD と MUST であり、本基盤は厳しくなる側として先行採用する [N][^24][^25]（RS-17#21）[D]。
- txntoken+jwt は draft-ietf-oauth-transaction-tokens-11（IESG 未提出）の MUST である [N][^26]（RS-06#31）。
- 128 bit 以上のエントロピーは FAPI の shall であり、本基盤は全 client に広げる [N][^2]（RS-04#47）[D]。
- refresh token は保存時も秘匿しなければならない（MUST）[N][^16]（RS-04#70）。GitHub は、token を元の使用可能な形式では保存していないため自社の侵害ではないと説明した [I][^42]（RS-12#59）。本基盤は opaque token を hash だけで保存する [D]。

**検証規則（V1〜V14）**

V1〜V14 は共通 SDK・sidecar・edge の既定動作にし、利用側の設定では無効化できないようにする [D]。Storm-0558 では、メール系の開発者が「ライブラリが完全に検証する」と誤認し、issuer/scope の検証を追加していなかった [I][^39]（RS-12#5）。

| ID | 規則 | 規範強度と自社判断の書き分け |
|---|---|---|
| V1 | issuer と token 種別の組ごとの alg allowlist を設定から読む（token からは読まない）。内部 access token の初期値は ES256 だけ | allowlist の指定は RFC 8725 §3.1 の MUST [N][^8]（RS-04#62）。単一 alg にするのは自社判断 [D] |
| V2 | 1 つの鍵を 1 つの alg と 1 つの token 種別だけに使う | 1 鍵 1 alg は RFC 8725 §3.1 の MUST [N][^8]（RS-11#51）。種別との 1 対 1 は自社判断 [D] |
| V3 | 鍵は、設定で固定した issuer の metadata にある jwks_uri（TLS）からだけ取る。kid はその集合の中だけで引く。jku・x5u は辿らない | 鍵と issuer の結合は RFC 8725 §3.8 の MUST [N][^8]（RS-04#62）。RFC 8725 §3.10 の SHOULD は jku・x5u を辿る場合の SSRF 対策（許可した場所との照合など）であり、辿らないことの要求ではない [N][^8]（起草時に原文を確認）。辿らないのは自社判断で、FAPI §5.4 の「x5u・jku を使うべきでない（should not）」とも整合する [N][^2]（RS-04#47）[D] |
| V4 | iss を完全一致で照合する。内部 issuer は外部 AS と別の識別子・別の鍵集合にし、cell ごとに分ける | iss の完全一致は RFC 9068 §4 の MUST [N][^7]（RS-04#60）。issuer と cell の分離は自社判断 [D]（RS-12#1, #5。鍵の範囲は ADR-007） |
| V5 | typ を種別ごとの期待値と照合する。内部 access token は "at+jwt" と "application/at+jwt" の 2 値を受け、他は拒否する。typ のない JWT は全種別で拒否する | at+jwt の 2 値受理は RFC 9068 §4 の MUST [N][^7]。RFC 8725 §3.11 の typ は RECOMMENDED であり、全種別で必須にするのは自社判断 [D]（DS-20） |
| V6 | aud に自サービスの識別子が含まれることを確認する。サービス共通の aud は発行しない | RFC 9068 §4・§5 の MUST [N][^7]（RS-04#60, #61）。自分宛てでない token の拒否は RFC 9700 の MUST [N][^1]（RS-04#17） |
| V7 | exp を検証する。iat・nbf は、未来 10 秒までを受け入れ、60 秒を超える未来は拒否する。exp の許容時刻差は R-189.2 として TBD | exp は RFC 9068 §4 の MUST で、許容時刻差は "MAY ... usually no more than a few minutes" [N][^7]。iat・nbf の 10 秒／60 秒は FAPI §5.3.2.1 の AS 一般要件（AS が受け取る JWT への shall）であり、RS への適用は自社判断の拡張 [N][^2]（RS-04#42）[D] |
| V8 | 束縛（cnf）のある token は提示者との一致を検証する。外部は x5t#S256（mTLS）か jkt（DPoP）、内部は x5t#S256（D5-3）。DPoP 束縛 token が Bearer として提示されたら拒否する | 証明書一致の検証は RFC 8705 の MUST [N][^6]（RS-04#59）。Bearer 提示の拒否は RFC 9449 §7.2 の MUST [N][^5]（RS-04#58） |
| V9 | tid は 1 token に 1 つだけ載せ、PEP は資源から導いたテナントと突き合わせる。テナントを切り替えるときは token を取り直す | 自社判断 [D][A-015]（R-283、R-250）。CVE-2025-55241 では、送信元テナントを正しく検証しないレガシー API と内部のなりすまし token の組合せでテナント越境が起きたと発見者が開示している [I][^44]（RS-12#53） |
| V10 | 権限の内容を token に載せず、主体・テナント・client・粗い scope と authorization_details・act を運ぶ封筒にとどめる。claim 名は RFC 9068 の名前（scope、client_id）に限り、製品独自の名前（scp など）を契約に入れない | 自社判断 [D]（R-249、CL-0129、CL-0130、R-208）。アクセス制御に使ってよい act は現在の actor だけ（RFC 8693 の MUST）[N][^12]（RS-04#66） |
| V11 | access token を URI の query で受け付けない。SDK は query で送らない。ログ・トレース・エラー出力に token を記録しない | RS 側の不受理は FAPI §5.3.4 の shall not（FAPI 範囲）[N][^2]（RS-04#45）で、全 RS への拡張は自社判断 [D]。RFC 9700 §4.3.2 の MUST NOT は client が query で送ることの禁止である [N][^1]（RS-04#32。起草時に原文を確認）。token の平文保存・転送の禁止は RFC 9700 §4.9.3 の MUST で、ログ非記録はその実装 [N][^1]（RS-04#33）[D] |
| V12 | JWT 内の暗号処理を 1 つでも検証できなければ全体を拒否する。none は受け付けない | RFC 8725 の MUST [N][^8]、RFC 9068 の MUST NOT・MUST [N][^7]（RS-04#60, #62） |
| V13 | 制約を強める変更は未知の claim の追加で表さず、typ または profile 版の変更、あるいは JWS Protected Header の拡張パラメータを crit に列挙する方式で表し、ADR-016 で破壊的変更として扱う | 理解できない claim は、アプリが別の要求を定めない限り無視しなければならない（RFC 7519 §4、MUST）[N][^52]（RS-16#14）。crit に列挙した拡張を理解しない受信者にとって JWS は無効になる（RFC 7515 §4.1.11）[N][^53]（RS-16#16）。方式の選択は自社判断 [D] |
| V14 | 8725bis-10 Appendix A の防御的検査のうち厳しくなる側を先行採用する。対象は、alg の大文字小文字の誤読、暗号化と署名の取り違え、JWT 形式の取り違え、kid・jku・x5u を攻撃者入力として扱うこと | draft の内容であり規範根拠ではない [N][^21][^20]（RS-04#63）。先行採用は自社判断 [D] |

- **相互排他**: 種別間の相互排他は、(iss, typ, 鍵集合, aud の形式) の 4 要素が種別ごとに異なることで実現する [D]。同じ issuer が複数種別の JWT を出す場合、検証規則を互いに排他にすることは RFC 8725 §3.12 の MUST である [N][^8]（RS-04#62）。
- **鍵分離の位置付け**: RFC 9068 §5（Security Considerations）は、ID Token と JWT access token を別の鍵で署名しても特定の鍵の漏えいへの防御にはならないとする [N][^7]。RS は公開されたどの鍵による署名も受け入れざるを得ないためである [N][^7]（RS-04#61。起草時に原文を確認）。本 ADR は鍵だけに頼らず、issuer・JWKS・typ を分け、RS 側で受理条件を固定する [D]。
- **RS256 の扱い**: D8-3 に置く [D]。

### D3 寿命の決め方（一律値を置かない）

寿命 L は token 種別 k と操作階層 t の組ごとに、上限 U1〜U5 の最小値として決め、下限 Lmin と突き合わせる [D]（R-087、R-189.1、G-024）。

| 記号 | 定義 | 適用する token | 由来 |
|---|---|---|---|
| U1 規範上限 | 下の規範上限表 | 全種別 | 規範上限表の各行の出典による |
| U2 剥奪反映 | 使用時に状態を照会しない token について、L(k,t) ＋ C(t) ＋ Δprop ≤ R(t)。C は edge の状態 cache の最大齢、Δprop は状態ストアへの push の伝播時間、R は剥奪反映 SLO（R-143、R-191、DL-20） | 内部 access token（read-sensitive・write） | [D]。RFC 7009 は self-contained token の失効後に使われ得る時間を短命化で制限する設計を挙げている [N][^11]（RS-04#69） |
| U2' 照会型 | 使用時に照会する token は、C(t) ＋ Δprop ≤ R(t)。L は剥奪の速さを決めない | 外部 opaque token、privileged の内部 token | [D] |
| U3 被害窓 | 発覚前の悪用可能時間として事業が受容する値 E(t)。BIA、損失シナリオ（S-07、S-15）、リスク選好（DEC-1）から決める | 全種別 | [D]（BIA 待ち） |
| U4 session | refresh token と BFF session の絶対寿命は主体の AAL の再認証全体上限以下、非活動失効は無操作上限以下。token の更新で session を延長しない | refresh token、BFF session | 63B-4 は access token の存在を利用者在席の証拠と解釈することを SHALL NOT とする [N][^27]（RS-03#44） |
| U5 鍵の併存 | L_int ＋ JWKS cache の最大齢（R-189.6）＋ 時刻差の上限 ≤ 旧鍵の併存時間（R-189.4、ADR-007） | 内部 access token | [D]（RS-12#57。Azure AD 2021-03-15 では署名鍵の誤削除で依存アプリが token を信頼しなくなった [I][^62]） |
| Lmin(a) 発行容量 | refresh/秒 ＝ S ÷ L_ext ≤ AS の容量、exchange/秒 ＝ S × a ÷ L_int ≤ STS の容量、かつ発行/秒 ≤ KMS/HSM の署名 QPS（ADR-007） | 外部・内部 | [D][A-005, A-028, A-043] |
| Lmin(b) 停止耐性 | AS・STS が止まってから業務 API が止まるまでの時間を BIA の MTPD と比べる（H-15） | 外部・内部 | [D][A-091]（BIA NA-01） |

- **下限が上限を上回る場合**: 寿命を延ばして解決しない [D]。不足は cell 内の STS・状態ストアの静的安定性（ADR-013、ADR-023）と発行容量の増強で埋め、残る差は fail-mode（DL-19）と受容票で扱う [D]。Google SRS は、短命資格情報の強制は障害が資格情報の寿命を超えると「時限爆弾」になり得ると述べている [V][^46]（RS-09#36）。BIA の MTPD（write 2 時間）は寿命の候補（A-027 の範囲 5〜60 分）より長いため、停止耐性は寿命ではなく可用性と静的安定性で確保する [D][A-027]。静的安定な設計では、依存先が劣化しても以前から動いていたものは動き続ける [V][^60]（RS-09#10）。
- **障害時だけ寿命を延ばすモード（grace）は設けない** [D]。AWS は平常時と障害時で挙動が変わる bimodal behavior を避けるよう求め、障害時に cache を迂回させることもその例に挙げている [V][^61]（RS-09#15）。
- **テナント設定**: テナントは寿命を短くする設定だけができる（G-115）[D]。寿命の上限は CI で検査し、違反の件数を KRI にする（G-072）[D]。
- **揺らぎ**: exp、refresh の時刻、cache TTL に揺らぎ（jitter）を入れる [D]。AWS は相関障害の低減策として、短命資格情報・秘密の有効期限をばらつかせることを挙げている [V][^51]（RS-09#8）。幅は TBD（DL-20）[D]。
- **感度（決定値ではない）**: refresh/秒は外部 token の寿命 L_ext で、exchange/秒は内部 token の寿命 L_int で決まる別の変数である [D][A-005, A-028]。

| 寿命 | refresh/秒（S ÷ L_ext） | exchange/秒（S × 6 ÷ L_int） |
|---|---|---|
| 2 分 | 927 | 5,560 |
| 5 分 | 371 | 2,224 |
| 10 分（A-027） | 185 | 1,112 |
| 30 分 | 62 | 371 |
| 60 分 | 31 | 185 |

**規範上限表（U1）**

| 対象 | 上限・規則 | 強度 | 出典 |
|---|---|---|---|
| 認可コード | 60 秒以下。本基盤は全 client に適用 [D] | FAPI shall | [N][^2]（RS-04#42） |
| PAR の request_uri | expires_in を 600 秒未満 | FAPI shall | [N][^2]（RS-04#43） |
| DPoP proof | 作成後の限られた時間（秒〜分）だけ受理 | MUST | [N][^5]（RS-04#56） |
| nonce を使わない DPoP 束縛 access token | 長寿命の token を発行しない（本基盤は nonce 必須。D5） | SHOULD NOT | [N][^5]（RS-04#56） |
| introspection 応答の cache | exp を超えて cache しない | MUST NOT | [N][^9]（RS-04#67） |
| ブラウザアプリの refresh token | 最大寿命か非活動失効のどちらかを設ける。事前に期限を定めた場合は rotation で寿命を延長しない。寿命を AS session に連動させる | MUST / MUST NOT / SHOULD | [N][^13]（RS-04#74） |
| refresh token（一般） | 一定期間使われない refresh token は失効させる | SHOULD | [N][^1]（RS-04#38） |
| 再認証（AAL2・AAL3） | N-h のとおり | SHALL / SHOULD | [N][^27]（RS-03#43） |
| EU PSD2 RTS（支払口座へのオンラインアクセス） | 無操作 5 分以下 | 規則（第 4 条 3 項） | [N][^28]（RS-13#39） |

### D4 refresh token の保護（client 種別ごと）

| client 種別 | 発行 | 束縛 | rotation | 寿命の決め方 |
|---|---|---|---|---|
| BFF（第一者、confidential） | 可 | 非対称のクライアント認証（private_key_jwt または mTLS） | 使わない | U4。AS session に連動 |
| 第三者・顧客自作のサーバー型 client（confidential） | 同意した scope に限って可 | 非対称のクライアント認証。scope と RS に結合 | 使わない | D7（非活動失効、絶対寿命、再承認） |
| ネイティブアプリ・CLI（public） | offline 利用時に限って可 | DPoP 鍵（既定） | 既定では使わない。H-07 の誤失効率が受容範囲にあり、受容票（受容者案: プロダクト責任者＋CISO）がある client 区分に限って併用 | U4、非活動失効 |
| DPoP を実装できない既存ネイティブ（移行期限付きの例外） | 可 | — | 使う（再利用を検知したら grant の全 token を失効） | 最大寿命と期限を受容票に記す |
| 第三者のブラウザ内 public client（D6-4 の例外のみ） | 受容票がある場合のみ | DPoP | 使う（寿命は延長しない） | 最大寿命、AS session に連動 |
| M2M（client credentials） | 発行しない | — | — | — |

根拠は次のとおりである [D]。

- AS は client ごとにリスク評価で refresh token の発行可否を決め（MUST）、発行した refresh token を同意済みの scope と RS に結合しなければならない（MUST）[N][^1]（RS-04#35, #36）。
- confidential client の refresh token は、RFC 6749 がすでに発行先 client だけが使えることを求めている（RFC 9700 §2.2.2 と §4.14.2 の双方に記載）[N][^1]。DPoP を使う confidential client の refresh token はクライアント認証で sender-constrained されるため、DPoP 鍵には束縛しない [N][^5]（RS-04#57）。
- FAPI は例外的な状況を除いて refresh token rotation を禁じ（shall not）、confidential client と sender-constrained token の組合せでは rotation に利点がなく、受け取り損ねが運用を損なうことを理由に挙げる [N][^2]（RS-04#46）。本基盤はこれを FAPI 範囲外の confidential client にも広げる [D]。
- DPoP proof を提示した public client の refresh token は、その鍵に束縛しなければならない（MUST）[N][^5]（RS-04#57）。これで RFC 9700 §2.2.2 の MUST を sender constraint の側で満たす [D]。
- rotation を既定にしない理由は RFC 9700 §4.14.2 の仕組みにある [D]。同節は、侵害された refresh token を攻撃者と正規 client の双方が使うと AS は侵害を知るが、どちらが提示したかは判別できず有効な refresh token を失効させ、正規 client は新しい認可を取り直すことになると述べている [N][^1]（起草時に原文を確認）。100 万人規模では再ログインと問い合わせの負荷として現れ、rotation の書込みは refresh/秒と同数発生する [D][A-001, A-042]。
- M2M に発行しないのは、RFC 6749 §4.4.3 の SHOULD NOT を本基盤で禁止に強めたものである [N][^16]（RS-17#18）[D]。
- 未使用の refresh token は非活動の上限で失効させる（RFC 9700 §4.14.2 の SHOULD を採用）[N][^1][D]。password 変更、AS での logout、CAEP session-revoked でも失効させる（同節の MAY を採用）[N][^1][D]。
- refresh token ストアの件数は基準で約 89.5 万件（A-006 の 86.5 万＋A-013 の 3 万）、成長シナリオで約 263.6 万件である [D][A-006, A-013]。

### D5 sender constraint（DPoP と mTLS の使い分け）

| 経路 | 方式 | 条件・根拠 |
|---|---|---|
| D5-1 内部の workload 間、edge から内部 RS | mTLS（workload identity）。内部 access token の cnf は x5t#S256 | ADR-009 |
| D5-2 BFF から edge | mTLS | BFF は workload identity か登録済みの client 証明書を使う [D] |
| D5-3 第三者・パートナーのサーバー型 client、外部 M2M | mTLS を既定にし、TLS が client のコードより手前（CDN・WAF など）で終端され end-to-end の mTLS を張れない環境に限り DPoP（nonce 必須）を許す | FAPI はどちらも許す [N][^2]（RS-04#44）。RS-04 結論 5 は B2B サーバー連携を mTLS とする [D]。既定の決定は §2.12 決裁案 3 |
| D5-4 privileged・FAPI 範囲の API を呼ぶサーバー型 client | mTLS のみ | 下の A5 対策 |
| D5-5 ネイティブアプリ・CLI | DPoP。サーバ nonce を必須にし、dpop_jkt で認可コードを束縛する | 鍵の保護方式は端末の OS に依存し、本書では確認していない（未確認） |
| D5-6 ブラウザ内 client（D6-4 の例外） | DPoP | D6 の制限つき |

- **内部の束縛（I1 を既定、I2 を代替）**: 内部 access token に cnf（x5t#S256）を付け、PEP が呼出し元の workload 証明書との一致を検証する（I1）[D]。300 サービス・本番 1.1 万インスタンスで mesh から peer 証明書をアプリへ渡す実装費用は未評価であり、H-16 で測る [D][A-012, A-050]。sidecar 型 PEP では peer 証明書を sidecar が保持するため照合を sidecar 内で完結できる見込みだが、未実測である [D]。H-16 で費用が過大と分かった場合は、mesh mTLS と aud・呼出し元 workload の許可リスト照合（I2）に切り替える [D]。I2 は RFC 9700 §2.2.1 の SHOULD からの逸脱であり、理由・補完統制・受容票（受容者案 CISO）を準拠表に記録する [N][^1]（RS-04#14）[D]。FAPI 範囲の経路は I2 に切り替えても I1 を維持する [D]（FAPI §5.3.2.1 は sender-constrained な access token だけの発行を求める [N][^2]（RS-04#42））。
- **DPoP**:
  - nonce を必須にする（RFC 9449 の SHOULD NOT を本基盤で強める）[D]。サーバが nonce を提供した後は、nonce のない proof を受け入れてはならない（MUST NOT）[N][^5]（RS-04#56）。
  - dpop_jkt による認可コードの束縛は RFC 9449 §10 で OPTIONAL であり、使った場合に鍵の thumbprint が一致しなければ AS は拒否しなければならない（MUST）[N][^5]（RS-04#58。起草時に原文を確認）。本基盤は public client で dpop_jkt を必須にする [D]。
  - jti による再送検査は cell 内の共有ストアで行う [D]。RFC 9449 は、状態を共有しない複数サーバの背後では単回使用の検査を実現できないことがあると明記している [N][^5]（RS-04#56）。
  - jti ストアの件数の上限は 16,804/秒 × W で、W＝60 秒なら全 cell 合計で約 101 万件、1 件 128 byte なら約 1.3 億 byte である [D][A-040, NA-005-1, NA-005-2, NA-005-6]。BFF 経路は mTLS なので実際の件数はこの上限より小さい [D]。
- **mTLS**:
  - TLS を中継装置で終端する経路では、受信要求の sanitize と proxy・アプリ間の経路保護を必須にする（RFC 9700 §4.13 の MUST）[N][^1]（RS-04#24）。終端点からアプリへ証明書情報を渡す方法は RFC 8705 の範囲外である [N][^6]（RS-04#59）。
  - mTLS を要求する endpoint はホスト名で分ける [D]。RS は mTLS を使うことを TLS handshake の前に知っている必要がある [N][^6]（RS-04#59）。
  - client 証明書を更新すると束縛された access token は無効になる [N][^6]。client SDK は証明書を更新する前に token を取り直す [D]。
- **privileged で mTLS を選ぶ理由**: FAPI は、A5 の攻撃者が DPoP proof を再送でき、本文や大半のヘッダに署名がないため改変した要求にも proof を再利用され得るとし、緩和策の 1 つに mTLS の検討を挙げる [N][^2]（RS-04#49）。Final の Message Signing はリソース要求の署名を含まない [N][^4]（RS-04#51）。
- **複数の AS と対話する client**: AS ごとに別の DPoP 鍵または証明書を使うことを SDK の既定にする [D]。FAPI は Cuckoo's Token Attack の緩和策として AS ごとの鍵と短命 token を挙げる [N][^2]（RS-04#49）。issuer を cell ごとに分ける場合、複数 cell と対話する client は mix-up 対策（REQUIRED）と RFC 9207 の iss 検査の対象になる [N][^1][^14]（RS-04#4, #71）[D]。

### D6 ブラウザ

- **D6-1** 「公開」以外の情報を扱う第一者のブラウザアプリは BFF を必須にし、ブラウザには token を渡さない [D]。新規の例外は認めず、既存の独自セッション（105 サービス）は移行期限付きの受容票で扱う [D][A-110]。根拠は RFC 10017 の "strongly recommended" と、同じ対象のブラウザ内 OAuth client を "not recommended" としていることであり、いずれも BCP 14 キーワードではないので必須化は自社判断である [N][^13]（RS-04#73、RS-17#4）[D]（DS-21）。
- **D6-2** BFF は confidential client として認可コードグラント・PKCE S256・PAR を使う [D]。cookie の Secure・HttpOnly（MUST）、CSRF 対策（MUST）を守り、SameSite=Strict・path=/・Domain 属性なし・`__Host-Http-` prefix（SHOULD）を本基盤では必須にする [N][^13]（RS-04#74、RS-17#2, #3）[D]。同じ site に他のアプリが同居する場合 SameSite=Strict だけでは CSRF を防げないため、CSRF 対策は BFF 部品の既定動作にする [N][^13]（RS-17#3）[D]。CSP は XSS への第二の防御層として RFC 9449 が挙げている [N][^5]（RS-04#54）。
- **D6-3** BFF はプラットフォームチームが部品（ライブラリと配備テンプレート）として提供する [D]。session store の上限見込みは有効 session 86.5 万 × 4 KB ≈ 3.5 GB である [D][A-006, NA-005-7]。
- **D6-4** 第三者のブラウザ内 public client は、低リスク scope（D7-2 の区分）に限り受容票付きで許し、DPoP・rotation・最大寿命を必須にする [D]。FAPI は public client を範囲外とする [N][^2]（RS-04#41）。DPoP は、攻撃者が新しいフローを始めて自分の鍵に束縛した token を得ることを防げない [N][^13]（RS-04#75）。公開情報だけを扱い認証を要しないアプリには token を発行しない [D]（evo 案 C6 の不整合を判定者 2 の指摘で修正）。
- **D6-5** privileged 操作の前には RFC 9470 の step-up を必須にする [D]。auth_time と acr は認証時点で確定し refresh では変わらないため、step-up のたびに新しい認可要求を送る [N][^15]（RS-03#48）[D]。
- **D6-6** DBSC は対応ブラウザで有効化する追加の層とし、統制として依存しない [D]。W3C の公表版は 2025-08-21 の First Public Working Draft だけである [N][^33]（RS-13#63）。

### D7 第三者連携アプリ（P-07）の grant

- **D7-1 登録審査**: 発行者の確認、最小 scope と scope ごとの理由、redirect URI の完全一致（RFC 9700 の MUST [N][^1]（RS-04#1））、非対称のクライアント認証（private_key_jwt で aud は issuer だけ、または mTLS）を審査する [D]。新規登録では client_secret を認めない [D]（RS-17#65）。
- **D7-2 同意**: 利用者本人が同意できるのは、検証済み発行者のアプリの低リスク scope だけにする [D]。それ以外はテナント管理者の同意とし、privileged/T の操作として扱う（REQ-03 §2.1）[D]。Microsoft は利用者の同意を検証済み発行者のアプリに限るよう推奨し、組込みポリシーで低影響の権限だけの同意を許している [V][^35]（RS-17#62）。発行者の検証バッジはアプリの品質を示さないとも明記しているため、審査は自社で行う [V][^67]（RS-17#64）[D]。
- **D7-3 grant 台帳**: grant ごとに client、テナント、同意者（利用者かテナント管理者か）、scope、resource、作成日時、最終使用日時、満了日時を記録する台帳を正本にする [D]。
- **D7-4 寿命**: refresh token の非活動失効、grant の絶対寿命（満了後は再同意）、テナント管理者による定期の再承認を設ける [D]。値は scope のリスク区分ごとに TBD とする（D3、DL-20）[D]。GitHub App は installation token を 1 時間、期限付き user access token を 8 時間、refresh token を 6 か月で失効させている [V][^37]（RS-17#58）が、本基盤の値の根拠にはしない [D]。
- **D7-5 棚卸しと再評価**: 棚卸しを同意ポリシーとは独立した統制にし、自動化する [D][A-013]。Microsoft Entra では同意設定の変更は今後の同意にしか影響せず、既存の grant は残る [V][^35]（RS-17#62）。このため同意方針を変えたら、再評価ジョブで既存の grant にも適用する [D]。再承認されなかった grant は自動で失効させる [D]。規模は基準で grant 3 万（1 テナント平均 3 件）、成長シナリオで 12 万である [D][A-013, A-007]。
- **D7-6 一括失効**: client_id（連携事業者）単位とテナント単位の一括失効を、完了時間 SLO（TBD、DL-20、R-189.5）付きの手順にする [D]。opaque の access token は状態ストアの照会で cache 上限 C(t) 以内に拒否される [D]（evo 案の「即時」は cache TTL を無視していたため改めた）。Salesloft Drift の事案では、侵害された OAuth token が遅くとも 2025-08-08 から使われ、Salesloft が Drift アプリの全 access token と refresh token を失効させたのは 08-20 だった [I][^40]（RS-12#37）。
- **D7-7 大量取得の検知**: 大量 export の検知は DL-52 と ADR-006 に置く [D]。Cloudflare の報告では、Bulk API 2.0 による本体の持ち出しは約 3 分だった [I][^41]（RS-12#41）。
- **D7-8 契約**: 連携事業者との契約に、token の保管方式、sender constraint への対応、侵害時の通知、一括失効への協力を入れる [D]。Heroku は事案後に RFC 8705 の mTLS と GitHub App 型の権限モデルを検討すると表明した [I][^43]（RS-12#61）。
- **D7-9 offline_access**: offline_access を要求する場合は、別の条件がない限り prompt=consent を使う（OIDC Core §11 の MUST）[N][^32]（RS-17#24）。
- **D7-10 device authorization grant**: 業務 API では既定で無効にする [D]。RFC 10027 は保護資源が機微・高価値・業務上重要なら device grant を避けるよう述べ（Avoid）、実装前のリスク評価を MUST とする [N][^18]（RS-13#57、RS-17#14）。Microsoft は device code flow を可能な限り遮断するよう推奨している [V][^36]（RS-13#59）。許可する場合は事前登録したデバイス種別と client_id に限り、監査属性を付ける [D]（RS-17#17、G-136(d)）。
- **D7-11 Bearer 例外**: sender constraint に未対応の既存連携は期限付きの受容票で扱う [D]。期限は §2.12 決裁案 7 で決める [D]。
- **D7-12 AS 移行時の再同意**: 新 AS へ移行するときは旧 AS の grant と refresh token を移送せず再同意を求め、再同意を初回の棚卸しとして扱う（as-is-inventory W5）[D]。採否は §2.12 決裁案 5 で決める [D]。

### D8 RFC 9700 準拠方針

- **D8-1** RFC 9700（BCP 240、final）を準拠基準とし、準拠表は「規範文 × 適用条件」の単位で DL-16 に置く（RS-04 §3.1 の 39 行が素案）[D]。MUST 行から外れる場合は「非準拠」とし期限付きの受容票を必須にする [D]。SHOULD 行から外れる場合は理由・補完統制・受容票を記す（RS-04 §5.1）[D]。
- **D8-2** RFC より厳しく採る行は、BCP の要求と混同しないよう「自社の採否判断」として書き分ける（RS-04 §2-2）[D]。

| RS-04# | RFC 9700 の強度 | 本基盤の採否 |
|---|---|---|
| #8〜#10 | PKCE: public は MUST、confidential は RECOMMENDED | 全 client で必須、S256 のみ [D] |
| #13 | implicit 等: SHOULD NOT | AS で無効化 [D] |
| #14 | sender-constrained・audience-restricted: SHOULD | 外部は必須。内部は I1 を既定、I2 なら逸脱として受容票 [D] |
| #17 | audience 制限: SHOULD（RS 側の拒否は MUST） | サービス別 aud を必須 [D] |
| #18 | ROPC: MUST NOT | 無効化。移行の例外は非準拠として受容票 [D] |
| #20 | 非対称クライアント認証: RECOMMENDED | 新規 client で必須 [D] |
| #5 | RFC 9207 の iss: SHOULD | 既定（iss の検査は RFC 9207 の MUST [N][^14]（RS-04#71）） |
| #22 | client_id と sub の混同: SHOULD NOT / MUST | client_id の自己指定を禁止し、sub の名前空間を分ける [D] |
| #23 | end-to-end TLS: RECOMMENDED | 部分採用（逸脱）。ingress・mesh で終端する場合は #24 の MUST と、アプリまでの mTLS による再暗号化で補う [D] |
| #30 | 認可コード二重償還時の発行済み token の失効: SHOULD | 採用 [D] |
| #32 | client が query で token を送ること: MUST NOT | SDK で送らない。RS 側の不受理は V11 [D] |
| #38 | refresh の非活動失効: SHOULD | 採用 [D] |

- **D8-3 RFC 9068 の RS256 MUST**: 内部 issuer は ES256 で署名する [D]。共通 SDK は RS256 の検証を実装するが、内部 issuer の allowlist では既定で無効にする（ops 案 V-10 を採用）[D]。RFC 9068 §2.1 の「対応アルゴリズムに RS256 を含める」MUST を、実装済みで設定により有効化できる状態で満たすと読むかには解釈の余地があるため、準拠表には「解釈に依存する行」として記録し、受容票（受容者案 CISO）を付ける [N][^7][D]。FAPI 範囲では RS256 を処理しない構成になるので、FAPI 優先の逸脱として記録する（RS-04 §2-7）[D]。外部 RP 向けの ID Token は、OIDC Core が OP に RS256 を MUST で求めるため RS256 を残し、鍵長は 3072 bit 以上にする [N][^32]（RS-11#54）[D]。
  - sec 案は RS256 を支援しない理由に NIST IR 8547 ipd を挙げていたが、同文書の Table 2 は 112-bit 強度の RSA を「2030 年より後は deprecated、2035 年より後は disallowed」とし、128-bit 以上（ES256 と RSA-3072 を含む）を「2035 年より後は disallowed」とするため、RSA-3072 の RS256 と ES256 の扱いは同じである [N][^31]（RS-11#8）。このため IR 8547 は ES256 だけにする根拠にならず、本書では根拠から外した [D]（判定者 3 の指摘）。
- **D8-4 FAPI 2.0**: 必須範囲は ADR-020 で決め、範囲内では FAPI の shall を RFC 9700 より優先する [D]。範囲外で部分的に採るものは「FAPI 準拠」と呼ばない [D]。準拠を名乗るプロファイルは mandatory な振る舞いを除去・上書きしてはならない（shall not）[N][^2]（RS-04#48）。confidential client の認可要求は範囲外でも PAR を既定にし、範囲の拡大を安くする [D]（RFC 9126 [N][^49]、RS-04#53）。
- **D8-5 draft の扱い**: 次の draft は規範根拠に使わず、標準ステータス台帳（DL-84）で追跡する [D]。例外として 7523bis の aud=issuer と typ、8725bis の防御的検査（V14）は厳しくなる側として先行採用する [D]。
  - OAuth 2.1（draft-16、WG Document、IESG 未提出）[N][^22]（RS-04#76）
  - 8725bis（draft-10、RFC Ed Queue、RFC Editor 状態 Blocked）[N][^20]（RS-04#63）
  - Token Status List（draft-21、RFC Ed Queue）[N][^23]（RS-04#80）
  - 7523bis（draft-11、IESG 承認済み、RFC 未発行）[N][^25]（RS-17#21）
  - Transaction Tokens（draft-11、IESG 未提出）[N][^26]（RS-06#30）

### D9 失効状態の確認（操作階層ごと）

| 階層（DL-09） | edge の状態照会（外部 opaque） | 内部 RS（内部 access token） | AS・状態ストア停止時（DL-19 への入力案） |
|---|---|---|---|
| public | 不要 | 不要 | 継続 |
| read-sensitive | 毎要求。cache ≤ C(read) | 局所検証＋CAEP の受信（ADR-006）。L_int(read) は U2 で制約 | 寿命の範囲で継続（寿命は延長しない）。限定 grace の採否は DL-19 |
| write | 毎要求。cache ≤ C(write) | 局所検証。L_int(write) は U2 で制約。ADR-006 が内部照会を追加し得る | fail-closed（REQ-03 §3.1 の入力案） |
| privileged | 毎要求。cache なし | 毎要求、状態ストアで jti・grant・session を照合（stateful） | fail-closed。BIA の MTPD 24 時間。侵害対応の剥奪・停止は break-glass/P 経路で代替（BIA E03） |
| break-glass/B（テナント内の業務緊急アクセス） | 毎要求。cache なし | privileged と同じ＋緊急権限の記録を照合 | DL-19・ADR-029 で決める（TBD）。BIA 票に /B の行がないため |
| break-glass/P（基盤の緊急経路） | 本 ADR の token 基盤（AS・状態ストア・STS）を使わない | REQ-03 §3.1 のローカル資格情報経路（DL-46、ADR-029）で照合 | 基盤の停止中も使える（BIA E04） |
| FAPI 範囲の RS（ADR-020） | privileged と同じ | privileged と同じ | privileged と同じ |

- sec 案は「privileged と break-glass は AS 停止中に止める」としていたが、BIA は break-glass を基盤に依存させず、REQ-03 は break-glass/P を連携に依存しないローカル資格情報とするため、break-glass/P を本 ADR の token 基盤から外した [D]（判定者 3 の指摘。ops 案 D-1.7、evo 案 D5-07 も同じ扱いに改めた）。SRS は緊急用の資格情報を SSO や federated IdP から導出してはならない（依存の少ない実装に置き換えられる場合を除く）とする [V][^46]（RS-09#41）。
- FAPI 範囲の RS は失効状態を検証しなければならない（shall）[N][^2]（RS-04#45）。BFF 経路で FAPI 範囲の API を呼ぶ場合も、edge と内部 RS の照会は privileged と同じにする [D]。
- privileged の stateful 照合で偽造 token も検知する [D]。発行記録にない jti を持つ署名済み token は拒否し、警報を出す [D]。CSRB は、自社の token 生成方式に合わない偽造 token を検知する仕組みがあれば Microsoft 単独で阻止または検知できた可能性が高いと認定した [I][^38]（RS-12#10）。CSRB の Recommendation 6 は、stateful token、束縛 token、共通の認証ライブラリ、テナント単位の鍵スコープを例示している [I][^38]（RS-12#11）。
- RFC 8693 は入力 token と出力 token を強く結び付けず、失効の伝播は一般的な性質ではないとする [N][^12]（RS-04#66）。このため内部 access token の jti を親の grant と session に結び付けて状態ストアに記録する [D]。記録件数は exchange/秒 × L_int で、基準（L_int＝10 分）では 1,112 × 600 ≈ 67 万件である [D][A-043]。

### D10 暗号・サイズ・進化と退出

- **D10-1** alg は fully-specified の IANA 識別子だけを使う [D]。RFC 9864 は JOSE の多相的な EdDSA を Deprecated にした [N][^48]（RS-11#43）。このため FAPI が許す 3 方式のうち EdDSA は採らない [D]。
- **D10-2** 内部 access token の PQ 移行の候補は ML-DSA-44（RFC 9964）とし、順序は ADR-015 が決める [N][^55]（RS-11#41）[D]。draft 段階の composite JOSE の識別子は profile にも SDK にも固定しない [N][^56]（RS-11#44）[D]。
- **D10-3** token profile の版ごとにサイズ上限を定める [D]。外部契約（DL-75 と第三者向け規約）には、client が受け付けなければならない opaque token の最大長を書く [D]。最大長は、将来 JWT へ寄せる余地を残すため ML-DSA-87 の JWT の計算値（約 6.8KB）を下回らない値とし、値は TBD とする [D]（RS-11#62）。内部 access token の計算値は ES256 で約 700 byte、ML-DSA-44 で約 3,846 byte、ML-DSA-65 で約 5,031 byte である [D]（RS-11#62）。
- **D10-4** opaque の値の先頭に、版・種別・経路識別子（issuer と cell を指す意味のない値）を置く [D]。版と種別は漏えい走査（ログ・リポジトリ）に、経路識別子は AS 置換時に edge が照会先を選ぶ dual-run（ADR-018、ADR-027）に使う [D]。client はこの値を解釈しない（D1、RFC 9068 §6）[D]。
- **D10-5** RFC 7696 §2.1 はプロトコルにアルゴリズム識別子の仕組みを含めることを MUST とする [N][^54]（RS-11#36）。JOSE ではこれを JWS の alg で満たす [D]。kid は鍵の識別子であり、kid の命名には alg 名と製品名を含めない（ADR-021）[D]（evo 案 D5-36 の「alg と kid で満たす」を判定者 2 の指摘で修正）。
- **D10-6** 信頼アンカーは自社ドメインの issuer に限り、製品固有のドメイン・claim・束縛技術を基盤の契約に入れない [D]（R-208）。

### D11 実装・組織・製品の分担

- **D11-1 業務サービスの義務**は次の 4 つに限る [D]。
  - (a) 共通検証 SDK または sidecar で内部 access token を検証する [D]。
  - (b) 自サービスの aud を登録する [D]。
  - (c) token をログに記録しない [D]。
  - (d) 契約試験キット（DL-80）の負例に合格する [D]。
  - 操作階層の登録は REQ-03 J10 と DL-67 がすでに求めており、本 ADR の追加義務ではない [D]。privileged の stateful 照合と cnf の検証は SDK・sidecar が行う [D]。
- **D11-2** edge、状態ストア、STS、BFF 部品、検証 SDK、契約試験キット、準拠表はプラットフォームチームが所有する [D][A-054]。A-054 の内数で賄えるかは H-18 で測る（NA-005-5）[D]。
- **D11-3** ベンダーの受入条件に、SDK の版を指定どおりに使っていることと契約試験キットに合格していることを入れる（11_contracts の連携契約）[D]。25 組織・60 チームの人材の入替えやベンダー交代があっても、検証規則の品質を機械的に判定できるようにするためである [D][A-052]。
- **D11-4** ADR-001 の評価軸に、PAR、DPoP（nonce と dpop_jkt）、mTLS、RFC 9207・9068・7662・9701・7009・8693・8707、SSF の送信、opaque token の状態の外部 push（D1-3）を入れる [D]。OIDF の認定は特定の版の試験記録であり、採用版で FAPI 2.0 の DPoP 構成と mTLS 構成の適合試験を自社で実行して E7 として保存する [D]（RS-15#8）。Auth0 の公式文書は FAPI 2.0 の準拠設定として mTLS の送信者制約だけを示している [V][^59]（RS-15#45）。OIDF の FAPI 2.0 Final 認定一覧でも同製品の DPoP 列の認定は確認できず、DPoP 構成の認定がないと読める [D][^58]（RS-15#5）。

### 2.12 決裁案（経営・事業・法務・CISO の決定が要る点）

いずれも決定済みではない [D]。

| # | 論点 | 選択肢 | 推奨と理由 | 帰結 | 決める人・期限 |
|---|---|---|---|---|---|
| 1 | 寿命の値（L_ext、L_int、refresh、BFF session、grant） | (a) 規範の上限をそのまま既定値にする／(b) D3 の導出で階層別に決める／(c) テナントの自由設定 | (b)。R-087 と REQ03-D6 に沿う [D] | (b) は G4 の実測まで値が決まらず、それまでは規範上限を強制上限として適用する [D] | CISO＋プロダクト責任者（値）、事業責任者（利用者影響）。G3 で案、G4 実測後に DL-20 で確定 |
| 2 | BFF 経路の token 形式 | (a) opaque＋edge 毎要求照会（案B）／(b) JWT（aud=edge）＋局所検証（案C） | (a) を暫定とし、H-02・H-04・H-03 で判定する [D] | (a) は照会量が約 3.3 倍（8,402 対 2,521/秒）。(b) は BFF 経路の失効が寿命と ADR-006 に依存する [D][A-044] | CTO＋CISO。G4（PoC 後） |
| 3 | 第三者サーバー型 client の既定の sender constraint | (a) mTLS 既定・DPoP 条件付き（D5-3）／(b) DPoP 既定・mTLS 承認制（ops 案）／(c) 経路基準（evo 案） | (a)。RS-04 結論 5 と A5 対策による。ただし NA-005-10 で end-to-end mTLS を張れない相手が大半なら (b) を再評価する [D] | (a) は相手方の PKI 運用と CDN 経由の証明書受渡しの費用を課し、参入障壁になり得る（未定量）[D] | 事業責任者（連携エコシステム）＋CISO。G3 |
| 4 | 計画している逸脱の受容 | RFC 9068 RS256 MUST の解釈（D8-3）、end-to-end TLS（#23）、内部 sender constraint（I2 に切り替えた場合） | 受容票を個別に作る [D] | 受容しなければ、RS256 の既定有効化、全区間 mTLS、I1 の強制が必要になる [D] | CISO。G3（I2 は H-16 後） |
| 5 | AS 移行時の grant の扱い | (a) 移送せず再同意（D7-12）／(b) 移送 | (a)。再同意を初回の棚卸しにできる [D] | (a) は利用者・テナント管理者・連携開発者に摩擦を生む（client 800・grant 3 万）[D][A-013] | 事業責任者＋CISO。ADR-027 と同時 |
| 6 | read-sensitive の stale allow の許容窓 R(read) | BIA と DEC-1 で決める | — | R(read) が L_int＋C(read) より短く決まれば、内部照会の追加か案D 寄りの構成が要る（§4.5）[D] | 事業責任者（BIA、DEC-1） |
| 7 | 既存 Bearer 連携の受容期限 | 期限の長さ | 期限付きで受容し、KRI で移行率を追う [D] | 期限が長いほど ATK-05 の残余が残る [D] | プロダクト責任者＋CISO。G3 |

### 2.13 TBD 一覧（G-024: 根拠のない数値は置かない）

| 指標 | 決め方 | 所有者 | ゲート |
|---|---|---|---|
| L_ext(t) 外部 access token の寿命 | min(U1, U3, U4) と Lmin。U2' は C(t) で満たす | CISO＋プロダクト責任者 | G3 で案、G4 実測後に DL-20 で確定 |
| L_int(t) 内部 access token の寿命 | min(U1, U2, U3, U5) と Lmin。privileged は U2' | CTO＋CISO | 同上 |
| refresh token の絶対寿命・非活動失効（client 種別別） | U4 と D4 | CISO＋プロダクト責任者 | G3 |
| C(t) edge の状態 cache の最大齢 | privileged・break-glass/B・FAPI 範囲は 0（規則であり推定値ではない）。read-sensitive・write は U2 と H-02・H-03 | CTO | G4 |
| JWKS cache の最大齢（R-189.6） | 緊急鍵失効の完了時間（R-189.5）から配布時間を引いた値以下、かつ U5 | CTO（ADR-007 と共同） | G4 |
| 時刻差（R-189.2） | iat・nbf は V7 の値を初期値とし、exp の許容時刻差は H-05 で決める | SRE 責任者 | G4 |
| DPoP の受理窓 W | NA-005-1、H-05 | SRE 責任者＋CISO | G4 |
| jitter の幅 | H-04・H-15 | SRE 責任者 | G4 |
| 第三者 grant の非活動失効・絶対寿命・再承認周期 | D7、scope のリスク区分ごと | CISO＋事業責任者 | G3 |
| 一括失効の完了時間（R-189.5） | H-08 | CISO | G4 |
| opaque token の最大長 | D10-3 | CTO | G3（DEC-8 の契約凍結前） |
| rotation 併用を認める誤失効率の閾値 | H-07 | プロダクト責任者＋CISO | G4 |

A-027 の 10 分は容量計算用の仮置きであり、本 ADR ではどの寿命の決定値にも使わない [D][A-027]。

---

## 3. 検討した選択肢

### 3.1 主論点: opaque/JWT 境界

起草案ごとに案の記号が異なるため、本書の記号へ揃えた（sec の B は本書の B、ops・evo の C は本書の C、ops・evo の B は本書の D）[D]。

| 項目 | 案A 全境界 JWT＋局所検証 | **案B 外部全 opaque＋cell 内状態ストア＋内部サービス別 JWT（採用）** | 案C client 種別ハイブリッド（BFF・内部は JWT、第三者・ネイティブ・高リスクは opaque） | 案D 全境界 opaque＋全 RS が照会 |
|---|---|---|---|---|
| 概要 | client にも内部にも RFC 9068 JWT。失効は寿命と CAEP | §2 の D1〜D11 | ops・evo の推奨。BFF は JWT（aud=edge）、edge と BFF で失効を強制 | 内部呼出しも opaque、各 RS が照会 |
| 利点 | introspection 0/秒、AS 停止に強い、実装が普及 [D][A-044] | 外部 token は照会時点（C(t) 以内）で失効。外部 client が内容と alg に依存しない。privileged で偽造検知 [D] | introspection 2,521/秒（成長 8,467/秒）で案B の約 3 割。BFF 経路は AS・状態ストアの停止に強い [D][A-044] | 全経路で照会時点の失効 [D] |
| 欠点 | client が内容を読める [N][^7]。FAPI の失効状態確認に別手段が要る [N][^2]。悪性 client の無効化後も既存 token が残る [V][^34] | 状態ストアと STS が Tier-0 部品として増える。edge が全外部経路の必須部品 [D] | BFF 経由（主流量）の失効が寿命と BFF 実装の品質に依存。2 系統の外部検証規則 [D] | 照会量 16,804 ×(1＋k)× miss（NA-005-3）。全内部呼出しが状態系に同期依存 [D] |
| 主要リスク | 偽造 token を検知できない（RS-12#10）。外部の解析依存で形式を変えられなくなる [D] | 状態ストアの障害が判定系（A-090）の可用性を下げる。edge・STS 侵害時の exchange 濫用 [D] | 依存チーム（25 組織、A-052）の BFF 実装品質がそのまま失効の品質になる [D] | 状態系の障害が全サービスの障害になる [D]。Google の 2020-12-14 の 47 分間の障害では Google OAuth を要する顧客向けサービスが使えなかった [I][^65]（RS-12#58） |
| 費用・要員の桁 | 常時部品は増えない。発行 1,374/秒 [D][A-043]。SDK 4 名の範囲（A-054） | 照会 基準 8,402/秒（16,804×100%×miss 50%）・成長 28,222/秒・規制 10,029/秒。設計容量の例（§12.5、G1 前）は 8,402×2.0×1.4 ≈ 23,526/秒。exchange 1,112/秒。部品はリージョン 4 × 2 種で少なくとも 8 配備。要員増分は H-18 で測る [D][A-040, A-044, A-063, A-054] | 照会 2,521/秒・成長 8,467/秒 [D][A-044]。BFF 部品の運用 | 照会が案B の (1＋k) 倍。k ≥ 9 なら 1 桁増 [D] |
| 可逆性 | 不可逆寄り（外部の JWT 依存は止められない）[D] | 可逆（JWT へ寄せても内容を読まない client は壊れない）[D] | 可逆 [D] | 可逆 [D] |
| この案が勝つ条件 | 第三者連携がなく、全 client が SDK 統制下にあり、BIA が「剥奪反映 ≥ 寿命」を受容する [D] | 第三者連携（A-013）と規制業種（A-080）があり、H-02・H-04 に合格する [D] | H-02・H-04 が不合格、または BIA が BFF 経路の stale allow を L_int の範囲で受容し、第三者連携が A-013 の下限（300 client・1 万 grant）にとどまる [D] | 規制強化シナリオ（A-080 65%、A-081 600）で全操作に即時失効が求められ、k が小さいと実測される [D] |

| 項目 | 案E 全 JWT＋Token Status List | 案F 案B の外部境界＋内部を Transaction Tokens で統一 | 案G 製品の既定に従う |
|---|---|---|---|
| 概要 | 案A の失効を Token Status List（draft-21）で補う | 内部の利用者文脈を Txn-Token で運ぶ | 採用製品の既定の形式・寿命・束縛方式を使う |
| 利点 | introspection より Issuer への問い合わせが少なく herd privacy を得られると説明されている [N][^23]（RS-04#80） | 呼出し連鎖の文脈を統一できる。草案は寿命を分単位以下、呼出しの間だけ使う（MUST）とする [N][^26]（RS-17#26） | 初期費用が最小 [D] |
| 欠点・リスク | Internet-Draft で規範根拠にできない。反映時間は ttl に依存 [N][^23] | draft-11、IESG 未提出 [N][^26]。草案改訂のたびに 60 チームの SDK を更新 [D][A-052] | 一律寿命になり R-087・G-024 に反する。形式・claim 名・束縛方式が製品に固定され、置換時に 300 サービスと 800 client の再試験が要る [D][A-050, A-013, A-104] |
| 費用の桁 | 案A＋状態リスト配信系 [D] | 案B＋草案追随の保守 [D] | 初期 0、置換ごとの移行費は A-104 の回数に比例 [D] |
| 可逆性 | 可逆 [D] | 版を固定した adapter に閉じ込めれば可逆 [D] | 低い（退出費用が時間とともに増える）[D] |
| 勝つ条件 | RFC になり、主要言語のライブラリが対応し、ttl が剥奪反映 SLO を満たす [D] | RFC 発行と複数製品の実装 [D] | 計画の時間軸が再決裁の 1 周期（A-101 の 3 年）以内で退出を想定しない [D][A-101] |

### 3.2 副論点

| 論点 | 案 | 概要 | 勝つ条件 | 採否 |
|---|---|---|---|---|
| refresh 保護 | R1 rotation を一律 | 全 client で使用ごとに rotation | DPoP を実装できない public client が大半で、FAPI 範囲がない | 棄却（FAPI の shall not、同時更新の誤失効 [N][^2]（RS-04#46）） |
| | R2 DPoP 束縛を一律 | confidential も DPoP 鍵に束縛 | 該当なし | 棄却（RFC 9449 §5 と異なる [N][^5]） |
| | R3 鍵束縛＋rotation を併用 | ネイティブで重ねる（sec 案） | 端末からの鍵の持ち出しが現実的な脅威で、H-07 の誤失効率が受容範囲 | 条件付き（D4） |
| | **R4 client 種別ごとの表** | D4 | — | 採用 |
| sender constraint | S1 DPoP のみ | 全経路 DPoP | CDN などによる TLS 終端が全経路にある | 棄却（A5 への耐性、jti の共有状態が全経路で要る（RS-04#49, #56）） |
| | S2 mTLS のみ | 全経路 mTLS | public client がない | 棄却（ネイティブで証明書を運用するのは難しい [D]） |
| | **S3 経路ごとに使い分け** | D5 | — | 採用 |
| | S4 Bearer＋短命化 | 束縛しない | public 階層だけ、または閉じた内部経路だけ | 棄却（窃取 token の使用例（RS-12#59）[I][^42]）。既存連携は期限付き例外（D7-11） |
| 内部束縛 | **I1 cnf（x5t#S256）** | D5 | mesh が peer 証明書をアプリへ確実・安価に渡せる | 既定（H-16 で確認） |
| | I2 mesh mTLS＋aud＋呼出し元照合 | ops 案 D-5.4 | H-16 で I1 の費用が過大 | 代替（逸脱の受容票が要る） |
| ブラウザ | **B1 BFF 必須** | D6 | — | 採用 |
| | B2 token-mediating backend | ブラウザに access token を渡す | BFF を置けない配信形態 | 棄却（RFC 10017 は BFF より安全性が低い構成とする [N][^13]） |
| | B3 ブラウザ内 client＋DPoP | SPA が token を保持 | 第三者の低リスク scope | 例外のみ（D6-4） |
| 寿命 | L1 一律値 | 5〜15 分など | なし | 棄却（R-087） |
| | **L2 導出** | D3 | — | 採用 |
| | L3 テナントの自由設定 | — | なし | 棄却（規範上限を超える設定が生じ得る。G-115） |
| 第三者 grant | T1 同意だけの無期限 | — | 連携が小規模で全事業者を契約で統制できる | 棄却 |
| | **T2 台帳・寿命・棚卸し・一括失効** | D7 | — | 採用 |
| | T3 インストール型だけ | 利用者委任の refresh token を廃止 | 連携の大半がサーバー間 | 一部（高リスク scope の offline 禁止として DL-16 で検討） |

### 3.3 可逆性のまとめ

- 外部境界を opaque にする決定は可逆で、BFF 必須は緩めることができる [D]。
- 内部 access token の claim の意味と typ 名は 300 サービスとの契約（DL-75、ADR-022）になり、変更には ADR-016 の版管理が要る（条件付き可逆）[D]。
- issuer 識別子は ADR-021 の不可逆識別子に属する [D]。
- 外部契約に書いた opaque token の最大長は、引き下げると client を壊し得るため不可逆側に置く [D]。

---

## 4. 評価

### 4.1 評価軸

judge panel は次の 6 軸を 1〜5 で採点した（高いほど良い）[D]。

| 軸 | 内容 |
|---|---|
| 要求網羅 | 7 つの問いと R/G への回答の網羅性 |
| リスク低減 | 攻撃者モデルと事故の型に対する統制 |
| 規模での実現性 | 300 サービス・60 チーム・100 万人規模での運用と費用 |
| 進化・退出 | 暗号移行、製品置換、標準の変化への対応 |
| 根拠の質 | 原典・強度の正確さ |
| 可逆性・費用 | 戻しやすさと費用 |

### 4.2 judge panel の採点

本採点は AI エージェントによる模擬パネルであり、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。

| 判定者 | 提案 | 要求網羅 | リスク低減 | 規模での実現性 | 進化・退出 | 根拠の質 | 可逆性・費用 | 計 | その判定者の勝者 |
|---|---|---|---|---|---|---|---|---|---|
| 判定者 1 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | evo |
| | ops | 4 | 3 | 4 | 3 | 4 | 4 | 22 | |
| | evo | 4 | 4 | 3 | 5 | 4 | 4 | 24 | |
| 判定者 2 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | sec |
| | ops | 4 | 3 | 5 | 4 | 4 | 4 | 24 | |
| | evo | 4 | 4 | 4 | 5 | 4 | 4 | 25 | |
| 判定者 3 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | ops |
| | ops | 4 | 4 | 4 | 4 | 4 | 4 | 24 | |
| | evo | 4 | 4 | 3 | 5 | 3 | 4 | 23 | |
| **合計** | sec | 15 | 15 | 9 | 12 | 12 | 9 | **72** | 1 票 |
| | ops | 12 | 10 | 13 | 11 | 12 | 12 | **70** | 1 票 |
| | evo | 12 | 12 | 10 | 15 | 11 | 12 | **72** | 1 票 |

- 票は 3 案に 1 票ずつ割れ、得点合計は sec と evo が 72 で同点である [D]。集計（票と得点の合算）は sec を勝者とした [D]。同点の解消は集計側の規則による [D]。軸別に見ると、sec は要求網羅とリスク低減の合計が最も高く（各 15）、規模での実現性と可逆性・費用が最も低い（各 9）[D]。
- 本書は sec を土台にし、判定者が挙げた graft を取り込んだ [D]。取り込んだ主な要素は次のとおりである [D]。
  - evo: 退出の仕組み（経路識別子と dual-run、opaque の最大長の契約化）、crit・profile 版による制約強化（V13）、grant 台帳、fully-specified alg と PQ の扱い。
  - ops: 業務サービスの義務の限定とベンダー受入条件（D11）、grace 禁止・短縮のみ・CI 検査（D3）、RS256 の既定無効（D8-3）、移行時の再同意（D7-12）、KRI と runbook（§6.5）、製品健全性トリガー（§8）。

### 4.3 判定者間の不一致

| 論点 | 不一致の内容 | 本書の扱い |
|---|---|---|
| 勝者 | 判定者 1 は evo（退出可能性）、判定者 2 は sec（要求網羅・リスク低減）、判定者 3 は ops（運用負荷と障害面）を選んだ [D] | 3 者の条件を §4.5 にまとめ、§7・§8 に反映した [D] |
| 判定者内の整合 | 判定者 2 は得点合計が最も高い evo（25）ではなく sec（24）を勝者とした。判定者 3 は sec と ops を同点（24）とし ops を選んだ [D] | 得点と勝者選択の根拠の差として記録する [D] |
| 規模での実現性 | sec は 3 名とも 3。ops は 4・5・4 [D] | BFF 経路の判断を決裁案 2 とし、H-02・H-04 で切り替える [D] |
| BFF 経路の opaque 化 | sec は REQ-03 §3.1 を例外なく満たすと評価、判定者 1・3 は照会量 3.3 倍と Tier-0 部品の増加を減点 [D] | 理由を分けて書き直し（D1 理由 4）、切替条件を明示した [D] |
| 内部の束縛 | sec・evo は cnf を必須、ops は付けない。判定者は ops の封じ込めが弱いと評価し、sec・evo は費用未評価と指摘 [D] | I1 を既定にし、H-16 で費用を測って I2 へ切り替える条件を置いた [D] |
| 第三者の既定 | sec は mTLS、ops は DPoP、evo は経路基準。判定者 1 は sec の参入障壁を未定量と指摘し、判定者 2・3 は ops の DPoP 既定が RS-04 結論 5 と製品認定の状況に逆らうと指摘 [D] | mTLS 既定を推奨し、事業判断として決裁案 3 にした [D] |
| ネイティブの rotation | sec は DPoP 束縛と rotation を併用。判定者 2・3 は誤失効の運用負担を指摘 [D] | DPoP 束縛を既定、rotation は H-07 と受容票による条件付きにした [D] |
| break-glass | 判定者 3 だけが、3 案とも break-glass を token 基盤に依存させている点を BIA・REQ-03 との不整合として指摘した [D] | 原典（BIA §2.3、REQ-03 §3.1）で確認し、break-glass/P を token 基盤から外した（D9）[D] |
| 事実誤りの指摘の正誤 | 判定者 1 は「confidential client の refresh token は RFC 6749 で発行先 client だけが使える」の記載箇所を §2.2.2 であって §4.14.2 ではないとした。原文では §2.2.2 と §4.14.2 の双方に同趣旨の文がある [N][^1]（起草時に確認） | 本書は双方の節を引いた [D] |
| 共通の誤り | 3 名とも、3 案が FAPI の iat/nbf 規則（AS 一般要件）を RS の shall として、RFC 9700 §4.3.2（client の送信禁止）を RS の MUST NOT として引いた点を指摘した [D] | 原典で確認し、V7・V11 で規範と自社判断を書き分けた [D] |

### 4.4 案の比較（sec レンズの重みと感度）

sec 案の 9 軸評価を検算し、本書の案の記号で再掲する [D]。採点は起草者による設計推論であり、実測ではない [D]。

| 軸（重み） | A | B | C | D | E |
|---|---|---|---|---|---|
| X1 攻撃者モデルに対する残余リスク（25） | 2 | 4 | 3 | 4 | 3 |
| X2 失効の即時性と被害窓（15） | 1 | 4 | 3 | 5 | 3 |
| X3 独立検証可能性（15） | 4 | 4 | 3 | 3 | 3 |
| X4 標準準拠（10） | 3 | 4 | 4 | 4 | 2 |
| X5 可用性・静的安定性（10） | 5 | 3 | 4 | 1 | 4 |
| X6 20 年の進化性（10） | 2 | 5 | 3 | 4 | 3 |
| X7 容量・性能（5） | 5 | 3 | 4 | 1 | 4 |
| X8 依存サービスと連携開発者の負担（5） | 4 | 3 | 4 | 3 | 3 |
| X9 費用・要員（5） | 5 | 3 | 4 | 2 | 3 |
| 加重（Σ点×重み÷5） | 59.0 | **77.0** | 67.0 | 68.0 | 61.0 |
| 可用性・費用重視の重み（X1 15、X2 10、X3 10、X4 10、X5 20、X6 10、X7 10、X8 10、X9 5） | 69.0 | **73.0** | 71.0 | 58.0 | 64.0 |

- 可用性・費用重視の重みで B の X5 が 3 から 2 に下がると、B は 69.0 になり C（71.0）が上回る [D]。X5 が下がるのは H-04 で状態ストアの可用性が届かない場合である [D]。
- ops レンズ（運用負荷・要員を重視）の自己採点では案C が 76.0 で首位、evo レンズ（置換・暗号移行を重視）の W1 でも案C が 3.70 で首位だった [D]。いずれも sec の案B は採点対象に含まれていない [D]。順位はレンズの重みに依存し、本書は重みの選択を §2.12 決裁案 2 の判断材料として示す [D]。

### 4.5 判定が覆る条件

| # | 条件 | 覆る決定 | 確かめる手段 | §8 のトリガー |
|---|---|---|---|---|
| C1 | 状態ストアが成長シナリオの照会量 × 安全係数で A-090 の帯または DL-20 の SLI に届かない。停止時の fail-mode が DL-19 どおりに動かない | 決裁案 2 を (b) 案C へ | H-02、H-04 | 実測 1 |
| C2 | BIA・DEC-1 が read-sensitive・write の剥奪反映窓を L_int＋C(t) より短く決める、または規制強化シナリオ（A-080 65%、A-081 600）が現実化する | 内部照会の追加、案D 寄りの構成 | H-03、BIA | 規制 1、前提 1 |
| C3 | BIA が BFF 経路の stale allow を L_int の範囲で受容し、第三者連携が A-013 の下限にとどまる | 決裁案 2 を (b) へ | BIA、G1 実測 | 前提 2 |
| C4 | mesh が peer 証明書をアプリへ確実・安価に渡せない | D5 の内部束縛を I2 へ（受容票 CISO） | H-16 | 実測 6 |
| C5 | 採用 AS・edge が opaque token の状態 push、RFC 9701、DPoP nonce・dpop_jkt のいずれかを支えない | D1-2 の再設計、または D5-3・D5-5 の方式変更 | H-22、ADR-001 | 製品 1・2 |
| C6 | 第三者サーバー型 client の大半が CDN・WAF で TLS を終端し end-to-end mTLS を張れない | 決裁案 3 を (b) へ | NA-005-10 | 前提 3 |
| C7 | 要員の実測が A-054 の内数（SRE 6 名で 2 系統の on-call）に収まらず、DEC-4 で追加要員が確約されない | 運用範囲の狭い案C へ寄せる | H-18 | 実測 7 |
| C8 | 2 つの AS を edge の背後で並行稼働させる演習で client・内部サービスの変更が 0 件にならない | 退出の仕組み（D10-4）の見直し | H-17 | 実測 8 |
| C9 | H-07 の誤失効率が閾値を超える、または H-05 の DPoP 拒否率・再試行率が許容外 | D4 のネイティブ行、D5 の使い分け | H-05、H-07 | 実測 4・5 |
| C10 | Token Status List が RFC になり、主要言語に成熟した実装があり、ttl が剥奪反映 SLO を満たす | 案E の再評価 | 標準ステータス台帳 | 標準 1 |
| C11 | ADR-020 が FAPI 範囲を第一者 BFF 経路の外に限り、REQ-03 §3.1 の write の失効状態確認が緩められる | 決裁案 2 を (b) へ | ADR-020、REQ-03 改訂 | 規制 2 |

---

## 5. 決定理由と棄却理由

棄却した案は traceability/rejected-hypotheses.md（DL-107）に集約する [D]。

**案B を推奨する理由** [D]

1. 案B は、第三者 token の照会時点での失効（RS-12#37 の事故の型）、FAPI RS の失効状態確認（RS-04#45）、REQ-03 §3.1 の write 以上の失効状態確認、privileged での偽造 token 検知（RS-12#10）を、経路の例外なしに満たす [D]。案A・C・E はこのいずれかを寿命か BFF 実装に委ねる [D]。
2. 外部 client を token の内容と AS の署名方式から切り離し、PQ 移行（A-103）と製品置換（A-104）の影響を自社の管理下（edge・STS・SDK）に閉じ込める [D]。
3. 案B の弱点（照会量、Tier-0 部品、要員）は §4.5 の条件で測れる形にし、不合格なら案C へ移る経路を事前に決めてある [D]。

| ID | 棄却した仮説 | 棄却理由 | 変えた設計 | 再評価の条件 |
|---|---|---|---|---|
| ADR-005/RH-01 | 一時アクセストークンは基本的に JWT（案A） | 外部 client が内容を読める、無効化後も既存 token が残る、FAPI 範囲の失効状態確認を満たさない、外部へ出した形式を戻すのが不可逆寄り [D]（RS-04#45, #61、RS-13#61） | 外部を opaque にし、JWT を内部だけにした（D1） | 案A の勝つ条件（§3.1） |
| ADR-005/RH-02 | access token の寿命は一律 5〜15 分 | レビューが未承認（R-087）。寿命の役割は種別ごとに違い（外部は被害窓 U3、内部は剥奪反映 U2）、1 つの値では表せない [D] | D3 の式と TBD 表 | なし |
| ADR-005/RH-03 | 案C（client 種別ハイブリッド）が最良 | 主流量である BFF 経由の失効と横流し防止を依存チームの BFF 実装品質に委ねる。Storm-0558 の教訓（RS-12#5）と同じ型 [D] | — | §4.5 の C1・C3・C7・C11 |
| ADR-005/RH-04 | 全経路 opaque で各 RS が照会すれば失効が最も単純（案D） | 内部の全呼出しが状態系に同期依存し、A-090 の帯と両立する見込みが示せない。照会量は (1＋k) 倍 [D][A-090] | — | §4.5 の C2 で k が小さいと実測された場合 |
| ADR-005/RH-05 | JWT に状態一覧を足せば introspection なしで失効できる（案E） | Token Status List が draft で規範根拠にできない [N][^23] | — | §4.5 の C10 |
| ADR-005/RH-06 | 内部文脈は Txn-Token で統一すべき（案F） | draft-11、IESG 未提出 [N][^26] | ADR-009 で採否 | RFC 発行と複数製品の実装 |
| ADR-005/RH-07 | 製品の既定で十分（案G） | 一律値と製品への固定が R-087・R-208 に反する [D] | D10-6 | 時間軸が 1 再決裁周期以内 |
| ADR-005/RH-08 | refresh は全 client で rotation が最も安全で簡単 | FAPI の shall not（RS-04#46）[N][^2]。rotation は事後検知で正規 client に再認可を強いる [N][^1] | D4 | DPoP を実装できない public client が大半の場合 |
| ADR-005/RH-09 | DPoP か mTLS の一方で統一できる | A5 への耐性（RS-04#49）、jti の共有状態（RS-04#56）、TLS 終端時の証明書受渡しが規定外（RS-04#59）[N][^2][^5][^6] | D5 | 経路が一様になった場合 |
| ADR-005/RH-10 | DPoP を使えば第一者 SPA に token を持たせてよい | 実行環境の乗っ取りに対して DPoP は安全性を保証せず、攻撃者は自分の鍵に束縛した token を新しいフローで得られる [N][^5][^13]（RS-04#54, #75） | D6 | DBSC 等の端末束縛が勧告となり広く提供された場合 |
| ADR-005/RH-11 | 第三者 grant は同意だけで無期限に保ってよい | 同意設定を変えても既存 grant は残り（RS-17#62）[V][^35]、長寿命の第三者 token が事故の運搬手段になった（RS-12#37, #59）[I][^40][^42] | D7 | なし |
| ADR-005/RH-12 | 障害時だけ寿命を延ばせば AS 停止に耐えられる | bimodal behavior になる [V][^61]（RS-09#15） | D3 | なし |
| ADR-005/RH-13 | edge が照会結果を未署名ヘッダで下流に渡せば内部 JWT は要らない | gateway の迂回で偽造され得る（RS-17#79、§2-14）[D] | D1-7 | なし |
| ADR-005/RH-14 | 寿命はテナント管理者が自由に設定できればよい | 規範上限と基盤の最低基準を超える設定が生じ得る（G-115、REQ03-D6 案C）[D] | D3 | なし |
| ADR-005/RH-15 | NIST IR 8547 を理由に RS256 を支援しない | IR 8547 ipd は RSA-3072 と ES256 を同じく 2035 年より後に disallowed とするため根拠にならない [N][^31]（RS-11#8） | D8-3（SDK に実装し既定無効） | なし |
| ADR-005/RH-16 | break-glass も token 基盤の stateful 照合に載せる | BIA と REQ-03 は break-glass/P を基盤に依存させない [D] | D9 | なし |
| ADR-005/RH-17 | 内部 access token に束縛は不要で、mesh mTLS と aud で足りる（I2 を既定） | ATK-06 と内部での窃取に対する封じ込めが弱く、RFC 9700 §2.2.1 の SHOULD からの逸脱になる [D][N][^1] | I1 を既定 | §4.5 の C4 |

---

## 6. 帰結

### 6.1 良い帰結

- 外部 token の失効が状態ストアへの照会時点（cache 上限 C(t) 以内）で効き、悪性クライアントの無効化や連携事業者単位の一括失効が寿命を待たずに反映される [D]。
- 内部 token を issuer・鍵・typ・aud の 4 要素で区別し、Storm-0558 型の鍵スコープの誤り（RS-12#5）と ID Token の転用を別々の機構で拒否する [D]。
- 外部 client を token の内容と AS の alg から切り離し、AS の置換（dual-run、D10-4）と内部の PQ 移行で外部 client を改修せずに済む範囲が広がる [D][A-103, A-104]。
- 業務サービスの義務が 4 つに限られ、ベンダー受入を契約試験の合否で機械的に判定できる [D]（D11）。
- V1〜V14 は機械検証できる形で、DL-80 の負例ベクタと OIDF 適合試験で第三者が再現できる [D]。

### 6.2 悪い帰結

- 状態ストアと STS が Tier-0 部品として増え、判定系の可用性（A-090）がそれらに依存する [D][A-090]。
- edge が全外部経路の必須部品になり、レガシーの直結経路（A-110）の移行費用が発生する [D][A-110]。
- 照会量は案C の約 3.3 倍になり、SRE の on-call 範囲が広がる [D][A-044, A-054]。
- 第三者サーバー型 client に mTLS を既定で求めるため、相手方の PKI 運用と CDN 経由の証明書受渡しが参入障壁になり得る（未定量、NA-005-10）[D]。
- RFC 9068 の RS256 MUST の解釈、end-to-end TLS、場合により内部 sender constraint で、準拠表に逸脱・解釈行が残る [D]（D8-3、D5）。

### 6.3 残余リスクと受容者案

| 攻撃者（DL-51） | 主な統制 | 残余リスク | 受容者案 |
|---|---|---|---|
| FAPI A1/A1a/A2/A3a（ATK-01 を含む） | redirect URI の完全一致、PKCE S256、PAR、RFC 9207、認可コード 60 秒、implicit・ROPC の無効化、AS ごとの鍵 | 正規登録の redirect URI を使ったフィッシングと consent phishing（RS-13#60, #61） | CISO |
| FAPI A5（RS 側で要求を読める攻撃者） | sender constraint、DPoP nonce と jti、privileged は mTLS、token を記録しない | DPoP 利用 client で受理窓の間に proof を再送され本文を改変される。リソース要求の署名は Final 仕様にない（RS-04#49, #51） | CISO |
| ATK-02 悪意あるテナント管理者 | 第三者アプリの基盤側審査、管理者同意を privileged/T にする、監査、テナント単位の棚卸し | テナント内での正規権限の濫用 | 顧客（責任分界は DL-26）＋CISO |
| ATK-03 侵害された一般ユーザー／ATK-14 infostealer | BFF、CSP、step-up、DBSC（任意）、異常検知（DL-52） | 端末に攻撃者が常駐している間の session 乗っ取り。RFC 9449 §11.4 [N][^5]、DBSC の非目標（RS-13#64）、Google は「ソフトウェアだけでは cookie の持ち出しを確実に防ぐ方法はない」とする [V][^47]（RS-13#66） | 事業責任者＋CISO |
| ATK-04 侵害された顧客 IdP | 発行元 IdP を示す claim（DL-75）、IdP 単位の一括失効（状態ストア）、ADR-004 の FAL 統制 | 検知前に発行された token が失効まで使われる | 顧客＋CISO（DL-26） |
| ATK-05 盗まれた token | 外部 token の sender constraint、状態ストアでの失効、内部 token の aud と cnf | token と鍵の両方を盗まれる（RFC 9700 §4.10.2 [N][^1]）。Bearer 例外の期限内 | CISO（受容票は期限付き） |
| ATK-06 侵害された microservice | サービス別 aud、workload 証明書への cnf（I1）、token の中継禁止、exchange policy（ADR-009） | 侵害中に正当に受け取った token を exchange policy の範囲で悪用される。I2 に切り替えた場合は L_int の間の横流し | CTO＋CISO（検知と kill switch は ADR-019） |
| ATK-06 の特例: edge・STS・状態ストアの侵害 | 最小構成、cell 単位、exchange の監査（act に edge を記録） | 侵害中に見えた token を exchange される | CISO |
| ATK-07 CI/CD 侵害 | 無効化できない SDK、CI の負例契約試験（DL-80）、設定変更の統制（ADR-008） | 悪性の SDK 版を配布される | CISO（ADR-008） |
| ATK-08 クラウド管理者 | token は hash だけで保存、鍵は KMS/HSM（ADR-007）、状態ストアの書込み権限を分離 | 状態ストアの改ざん（失効の取消し） | CISO（完全性の監視は ADR-014） |
| ATK-09 内部 support | token を記録しない、support tool では token を扱わない、HAR のサニタイズ（DL-52） | 利用者がアップロードした資料への session 情報の混入 | CISO |
| ATK-10 policy author | 寿命・alg allowlist・scope 対応を privileged/P の変更として二者承認、上限の CI 検査（G-072） | 承認済みの誤設定 | CTO |
| ATK-11 DB read 権限者 | refresh token と状態ストアは hash で保存、鍵を DB に置かない | grant のメタデータ（誰がどのアプリを許可したか）の漏えい | 個人情報保護責任者 |
| ATK-12 リージョン障害 | cell 内の状態ストアと STS、静的安定性、jitter、grace 禁止 | AS・状態ストア停止中、privileged は止まり、read-sensitive は寿命の範囲だけ継続する | 事業責任者（BIA） |
| ATK-15 悪意ある・侵害された第三者連携アプリ | 登録審査、同意制限、grant 台帳、client 単位の一括失効、大量取得の検知、契約 | 検知までの間の大量 export（Cloudflare の事例で本体の持ち出しは約 3 分 [I][^41]） | CISO（契約は法務） |
| 横断: 内部 issuer の鍵侵害 | cell 単位の鍵、privileged の stateful 照合 | read-sensitive と write では鍵を切り替えるまで偽造 token を検知できない | CISO（ADR-007・ADR-019） |
| 横断: 外部 RP 向け RS256 の継続 | 3072 bit、ADR-015 の移行計画 | IR 8547 ipd の期限（2035 年より後は disallowed）[N][^31] | CTO＋CISO |

### 6.4 依存サービスと連携開発者への影響

| 対象 | 影響 |
|---|---|
| 依存サービス（約 300、A-050） | 共通 SDK・sidecar で at+jwt だけを受け入れる。opaque token・ID Token・外部 issuer の token は受け入れず、introspection も呼ばない。義務は D11-1 の 4 つ。失効イベントの受信と DPoP の実装は不要 [D] |
| 第一者 Web アプリのチーム | BFF 部品を採用する。cookie と CSRF の設定は部品の既定に従う。独自セッションの 105 サービスが移行対象 [D][A-110] |
| 第一者ネイティブ・CLI のチーム | 外部ブラウザ（RFC 8252 は embedded user-agent を MUST NOT とする [N][^17]（RS-17#6））、PKCE、DPoP（nonce 再試行）、dpop_jkt に対応する [D] |
| 第三者・顧客自作アプリの開発者（client 800、A-013） | opaque token を解析しない。非対称のクライアント認証と mTLS（または条件付き DPoP）に対応する。grant の失効と再同意、一括失効への協力が要る。規約は DL-64 の P-07 に載せる [D] |
| 顧客のテナント管理者 | grant の定期再承認（平均 3 件/テナント）と一括失効の操作が増える。寿命は短くする設定だけができる [D][A-013, A-007] |

連携パターンごとの token 系インタフェースと契約の対応を次に示す（G-138 のうち token 系の行。行列の正本は DL-64）[D]。

| パターン | client 登録・discovery | token の取得・更新 | token の検証 | 失効・継続評価 | token exchange |
|---|---|---|---|---|---|
| P-01 ブラウザ→BFF→業務 API | DL-16（RFC 8414 metadata、PAR） | DL-16（認可コード＋PKCE＋PAR、private_key_jwt） | edge（基盤内）、内部は DL-75 | DL-78・DL-79（SSF/CAEP）、DL-56 | DL-74（edge が実行） |
| P-02 ネイティブ・CLI | DL-16 | DL-16（DPoP、dpop_jkt） | edge、内部は DL-75 | DL-78・DL-79 | DL-74（edge が実行） |
| P-03 サービス間 | ADR-009・DL-55 | DL-74（workload mTLS） | DL-75（共通 SDK） | DL-56 | DL-74 |
| P-07 第三者連携 | DL-16（登録審査は D7-1） | DL-16（mTLS 既定、条件付き DPoP） | edge、内部は DL-75 | DL-78・DL-79、一括失効は DL-24 | DL-74（edge が実行） |

### 6.5 運用と要員への影響

- 状態ストア・STS・edge を SRE の on-call 対象（A-054 の SRE 6 名、2 系統）に加える [D][A-054]。
- KRI の候補は次のとおりで、DL-06 に渡す [D]。
  - 状態照会・exchange の p99 と容量比、状態ストアの push 遅延（Δprop）
  - DPoP の拒否率（nonce・時刻差）と再試行率
  - 一括失効の完了時間、非活動 grant の件数、sender constraint 付き第三者 token の比率
  - 寿命上限の違反件数（CI）、300 サービスの SDK 版のばらつき、偽造 token 警報の件数
- runbook の候補は次のとおりで、DL-24 と ADR-019 に渡す [D]。
  - client の kill switch、テナントの停止、連携事業者単位の一括失効
  - 内部 issuer の鍵の緊急交換、DPoP nonce 鍵の交換
  - 状態ストアの切替と、状態ストア停止時の fail-mode の発動
- RFC 9700 と FAPI の準拠表は、標準ステータス台帳（四半期）と同じ周期で見直す [D]。

---

## 7. 検証

### 7.1 PoC で確かめる仮説と TC 案

TC-ID は DL-22 で採番する [D]。合否の数値は A-ID・BIA・DL-20 に結び付け、未定の間は TBD とする [D]。

| 仮説 | TC 案 | 合否基準 |
|---|---|---|
| H-01 V1〜V14 に反する token は全 SDK・sidecar・edge で拒否される | 負例: API A 用 token の API B への提示、redirect URI の差異、issuer mix-up、盗まれた refresh token、DPoP replay と事前生成、typ の混同（ID Token・introspection 応答・SET を access token として提示）、typ なし、alg の混同と downgrade（FAPI issuer への RS256 を含む）、別 cell・別種別の鍵、kid・jku・x5u の注入、tid の改ざん、DPoP 束縛 token の Bearer 提示、aud に token endpoint を入れた client assertion、query で渡した token、opaque token の内部への直送、未知の crit（G-088、R-173、RS-04 §5.3-1） | 全負例を拒否（G-088）。application/at+jwt の正例は受理 |
| H-02 状態ストアは成長シナリオの照会量でも判定系の遅延予算に収まる | 基準 8,402/秒と成長 28,222/秒に §12.5 の安全係数（k_u × k_g）をかけた負荷で p50/p99/p99.9 を測る | 可用性は A-090 の帯。p99/p99.9 は DL-20 の SLI（TBD、所有者 CTO、ゲート G4） |
| H-03 剥奪は階層ごとの SLO 以内に反映される | grant・session・client の失効から拒否までを、階層ごと、push と poll ごとに測る。exchange で派生した token を含める（RS-04 §5.3-7） | R(t)（TBD、BIA・DL-20） |
| H-04 AS・STS・状態ストアが停止しても階層ごとの fail-mode どおりに動く | login・refresh・exchange の停止と状態ストアの停止を注入する | DL-19 の表どおり。AS 本体への直接照会 0 件。障害時の寿命延長 0 件 |
| H-05 DPoP の運用値が許容範囲にある | nonce の更新頻度と再試行率、時刻差による拒否率、cell 内 jti ストアの整合性と実容量（上限見積り約 101 万件）（RS-04 §5.3-4） | TBD（プロダクト責任者） |
| H-06 mTLS の終端時に証明書ヘッダを偽装できない | 偽装ヘッダの注入、証明書更新後の token 無効化と再取得時間 | 偽装を全件拒否。再取得時間は TBD |
| H-07 ネイティブの rotation 併用時の誤失効率 | 同時更新と再試行を再現する（RS-04 §5.3-6）。DPoP 束縛だけの場合と比べる | 閾値は TBD（プロダクト責任者＋CISO） |
| H-08 連携事業者単位の一括失効が SLO 以内に完了する | NA-005-4 の規模で client_id の全 grant を失効させ、全 PEP で拒否されるまでの時間を測る（RS-12 §5.2-6） | R-189.5（TBD、DL-20） |
| H-09 BFF の cookie・CSRF・CSP の統制が働く | cookie 属性の検査、サブドメインからの CSRF、XSS を想定した privileged の step-up 要求 | 属性の欠落 0 件、CSRF を全件拒否、step-up なしの privileged 0 件 |
| H-10 device grant の既定無効が強制される | 許可リスト外の client_id で device grant を試す | 全件拒否（G-136(d)） |
| H-11 内部 token と DPoP proof の PQ 署名が経路を通る | ML-DSA-44・65 の JWT と DPoP proof を CDN・LB・nginx/Envoy・mesh に通す（RS-11 P-1） | 4xx と切り捨て 0 件。不可なら D10-3 の上限か方式を改める |
| H-12 alg を切り替えても RS の改修は要らない | 内部 issuer の alg 切替演習（RS-11 P-3） | RS のコード変更 0 件（G-068） |
| H-13 複数テナント所属の利用者で tenant confusion が起きない | テナント X 用 token をテナント Y の資源に提示（A-015） | 全件拒否 |
| H-14 偽造 token を検知できる | 発行記録にない jti を持つ署名済み token を privileged に送る | 全件拒否し警報が出る |
| H-15 寿命と停止耐性の関係 | 寿命 5・10・30・60 分（A-027 の範囲）で、AS・STS 停止から業務 API 停止までの時間を測る | BIA の MTPD（write 2h、read-sensitive 4h）との差を DL-20 に記録 |
| H-16 内部 cnf の展開費用 | mesh から peer 証明書をアプリ・sidecar へ渡す方式を代表言語で実装し、遅延・実装工数・失敗率を測る（A-012） | 費用の判定基準は TBD（CTO）。過大なら I2（§4.5 C4） |
| H-17 2 つの AS を edge の背後で並行稼働できる | 経路識別子（D10-4）で照会先を振り分ける演習 | 第三者 client と内部サービスの変更 0 件（A-104） |
| H-18 SDK 導入と要員 | 異なるベンダーの 3 チームが SDK を導入して契約試験に合格するまでの日数と運用工数、状態ストア・STS の運用工数を測る | A-054 の内数に収まるか（合格値 TBD、プラットフォームチーム長） |
| H-19 JWKS の鍵の追加・撤去で認証エラーが出ない | canary で鍵を追加・撤去する（RS-12#57） | U5 が成り立ち、認証エラー 0 件（R-189.4、R-189.6） |
| H-20 grant の棚卸しと再評価 | grant 12 万件で、同意方針の変更後に残る grant の検出、非活動 grant の自動失効、再評価ジョブを実行する | 検出漏れ 0 件（A-013） |
| H-21 発行負荷が KMS/HSM の署名 QPS に収まる | 寿命を変えて refresh/秒と exchange/秒を測り、KMS の quota と比べる | A-042・A-043 との誤差を記録し、Lmin(a) を確定 |
| H-22 製品が必要機能を支える | 採用候補の AS・edge で、opaque token の状態の外部 push、RFC 9701、DPoP nonce・dpop_jkt、mTLS を試す | 全機能が動作。欠ける機能は §4.5 C5 |
| H-23 テナント設定と CI 検査 | 最低基準より長い寿命の設定と、上限を超える寿命の構成変更を投入する | 全件拒否・全件検出（G-115、G-072） |

### 7.2 第三者評価で確かめること

- FAPI 範囲の AS と代表 client で、OIDF の FAPI 2.0 Security Profile Final 適合試験（DPoP 構成と mTLS 構成の両方）を採用版で実行し、ログを E7 として保存する（DL-60）[D]。OIDF は AS と client の双方向けに適合試験と認定を提供すると告知している [N][^63]（RS-04#52）。
- edge、BFF、状態ストア、STS の pentest と、consent phishing・device code の red team 演習を行う（DL-59）[D]。
- RFC 9700 準拠表を作成者以外が原文と 1 行ずつ照合し、空欄 0 件を確認する（G-087）[D]。
- これらはすべて未達であり、達成済みとは扱わない（CONVENTIONS §8）[D]。

---

## 8. 再検討トリガーと見直し時期

| 区分 | # | トリガー | 見直す内容 |
|---|---|---|---|
| 標準 | 1 | Token Status List の RFC 化 | 案E の再評価（§4.5 C10） |
| 標準 | 2 | 8725bis の RFC 化 | V1〜V14 との差分の取込み、V14 の [N] への格上げ |
| 標準 | 3 | OAuth 2.1 の RFC 化 | 準拠表の基準 |
| 標準 | 4 | 7523bis の RFC 化 | client assertion の規則を [N] に格上げ |
| 標準 | 5 | Transaction Tokens の RFC 化 | 案F、ADR-009 |
| 標準 | 6 | FAPI 2.0 HTTP Signatures の Final 化（現在は FAPI WG 一覧で Drafts に区分 [N][^50]） | privileged での DPoP の可否（D5-4） |
| 標準 | 7 | DBSC が W3C の勧告段階に進み複数ブラウザで提供される | D6-6、RH-10 |
| 標準 | 8 | 新しい BCP 195 の公表 | 12 か月以内の追随（FAPI の期待 [N][^2]） |
| 標準 | 9 | NIST IR 8547・SP 800-131A Rev.3 の final 版、composite JOSE の RFC 化 | D8-3、D10、ADR-015 |
| 標準 | 10 | RFC 9068 errata 8802（iss を OPTIONAL に改める提案、Reported）の状態変化 [N][^64]（RS-04#60） | V4、DL-75 の必須 claim |
| 製品の健全性 | 1 | 採用 AS・edge が PAR、DPoP（nonce・dpop_jkt）、mTLS、RFC 9207・9701、opaque 状態の push の支援を失う、または FAPI の DPoP 構成の認定がない（RS-15#4〜#6, #45） | D1-2、D5-3（§4.5 C5）、ADR-001 |
| 製品の健全性 | 2 | 主要構成要素の EOL・置換（A-104） | 案全体、H-17 の再実施 |
| 製品の健全性 | 3 | gateway・CDN のヘッダ上限の変更 | D10-3 |
| 実測値の逸脱 | 1 | H-02 または H-04 が不合格 | 決裁案 2 を案C へ（C1） |
| 実測値の逸脱 | 2 | H-03 が SLO を超過 | C(t)、L_int |
| 実測値の逸脱 | 3 | edge 呼出しが A-102 の成長率を上回る | 状態ストアの容量 |
| 実測値の逸脱 | 4 | H-07 が閾値を超過 | D4 のネイティブ行（C9） |
| 実測値の逸脱 | 5 | H-05 の拒否率・再試行率が許容外 | D5（C9） |
| 実測値の逸脱 | 6 | H-16 で内部 cnf の費用が過大、または I2 運用中に edge を迂回したアクセスを検知 | I1/I2 の切替（C4） |
| 実測値の逸脱 | 7 | H-18 で要員が A-054 を超え、DEC-4 で確約されない | 案C への寄せ（C7） |
| 実測値の逸脱 | 8 | H-17 が不合格 | D10-4（C8） |
| 規制 | 1 | PSD2/PSR、金融庁の監督指針、業界規制で寿命・無操作時間・token 方式が指定される、または規制強化シナリオ（A-080 65%、A-081 600）が現実化する | 規制プロファイル（DL-09 §5）、C2 |
| 規制 | 2 | ADR-020 の FAPI 範囲、または REQ-03 §3.1 の失効状態確認の要件が変わる | 決裁案 2（C11） |
| 前提 | 1 | BIA・DEC-1 で R(t) が決まる | U2、C(t)、C2 |
| 前提 | 2 | A-013 の grant が 10 万を超える、または下限（300 client・1 万 grant）にとどまる | D7 の自動化、C3 |
| 前提 | 3 | NA-005-2（DPoP 比率）が 60% を超える、NA-005-10 が判明する、A-030 が改訂される | D5、決裁案 3（C6） |
| 事故 | 1 | 鍵スコープ、第三者 token、内部 token に関する新しい一次報告 | §6.3、D7 |
| 定期 | 1 | 標準ステータス台帳の四半期確認（DL-84）、ゲート G3・G4・G6、再決裁周期（A-101: 初回 3 年以内、以後 5 年以内） | 本 ADR 全体 |

---

## 9. 依存関係

| 種別 | 対象 | 内容 |
|---|---|---|
| ADR | ADR-001 | AS・edge の必須機能（D11-4）、opaque 状態の push、OIDF 適合試験の自社実行 |
| ADR | ADR-002・DL-09 | 操作階層、AAL、再認証の上限（U4） |
| ADR | ADR-004 | mix-up 対策、FAL、発行元 IdP 単位の失効、tid の切替 |
| ADR | ADR-006・DL-56 | 状態ストアへの push、CAEP、伝播 SLO、write 以上の内部照会 |
| ADR | ADR-007 | 種別ごと・cell ごとの鍵、HSM の署名 QPS、JWKS、旧鍵の併存（U5） |
| ADR | ADR-009・DL-55 | STS、exchange policy、act、workload の mTLS、内部 cnf、Txn-Token |
| ADR | ADR-013・ADR-023・DL-19 | 階層ごとの fail-mode、cell、静的安定性 |
| ADR | ADR-015・DL-23 | alg 移行、サイズ予算 |
| ADR | ADR-016・DL-70 | token profile の版管理、V13 の破壊的変更 |
| ADR | ADR-017 | AI エージェントを外部 client として扱う場合の D1 適用 |
| ADR | ADR-018・ADR-027 | 退出、dual-run、grant の非移送 |
| ADR | ADR-019・DL-24 | 一括失効、kill switch、鍵の緊急交換 |
| ADR | ADR-020 | FAPI の適用範囲 |
| ADR | ADR-021 | issuer 識別子、kid の命名、opaque の経路識別子の名前空間 |
| ADR | ADR-022（DEC-3）・DL-75 | RFC 9068 系の契約 |
| ADR | ADR-026 | offline grant と非同期ジョブ |
| ADR | ADR-029・DL-46 | break-glass/P のローカル資格情報経路、break-glass/B の fail-mode |
| 設計文書 | DL-16（04_architecture/token-profile.md） | 準拠表と検証規則の正本 |
| 設計文書 | DL-20（07_slo/numeric-contracts.md） | §2.13 の TBD の確定先 |
| 設計文書 | DL-22（12_poc/preregistered-test-plan.md） | §7 の TC 採番 |
| 設計文書 | DL-51・DL-52 | 攻撃者モデル、大量取得の検知 |
| 設計文書 | DL-58（04_architecture/capacity-model.md） | 状態ストア・STS の設計容量 |
| 設計文書 | DL-64 | 連携パターン（P-01、P-02、P-03、P-07）と G-138 の行列 |
| 設計文書 | DL-84 | 標準ステータス台帳 |
| 契約 | DL-74・DL-75・DL-78・DL-79・DL-80 | token exchange、claims、SSF/CAEP、契約試験キット |
| 契約 | DL-26・連携事業者規約 | 責任分界、token 保管、sender constraint、侵害通知、一括失効への協力、opaque の最大長 |
| 契約 | DL-30・ベンダー契約 | AS ベンダーの必須機能、SDK 版と契約試験合格を受入条件にする |

---

## 対応表（R/G）

### 本書を対応成果物に含む行（R-requirements.md・G-goal-criteria.md から抽出）

| ID | 本書の節 | 閉じ方 | 状態 |
|---|---|---|---|
| R-095 opaque/JWT 境界 | D1、§3.1、§5 | A | 本書で閉じた（決裁前の案。決裁は §2.12 決裁案 2） |
| R-158 RFC 9700 の準拠基準化 | D4、D5、D8 | C | 決裁案まで（準拠表の本体は DL-16、実測は H-01） |
| G-087 準拠表、opaque/JWT 境界、FAPI 採否 | D1、D8（FAPI 採否は ADR-020） | B | 決裁案まで（準拠表の空欄 0 件は DL-16） |
| G-020 全 ADR の必須節 | §1〜§9（文脈、選択肢、棄却案と理由、決定と決定条件・期限、帰結、可逆性、再検討トリガー、証拠） | A | 本書で閉じた（ADR-005 分。自動検査は DL-111） |

### 関連する行

| ID | 本書の節 | 閉じ方 | 状態 |
|---|---|---|---|
| R-087 一律値の撤回 | D3、§2.13 | B | 決裁案まで（決裁案 1） |
| R-189.1 access/refresh 寿命を別値 | D3、D4 | C | 要実測（H-15、H-21） |
| R-189.2 clock skew | V7、§2.13 | C | 要実測（H-05） |
| R-189.4 旧鍵併存時間 | U5 | C | 要実測（H-19、ADR-007） |
| R-189.5 緊急失効完了時間 | D7-6、§2.13 | C | 要実測（H-08） |
| R-189.6 JWKS cache 最大齢 | §2.13、U5 | C | 要実測（H-19） |
| R-159 BCP 準拠 profile の文書化 | D8 | A | 決裁案まで（本体は DL-16） |
| R-160・R-240・R-270 FAPI 2.0 | D5-4、D8-4、D9 | B（R-240 は A） | 決裁案まで（ADR-020） |
| R-161 JWT 厳格検証 | D2 V1〜V14 | C | 要実測（H-01、DL-75） |
| R-162 相互排他 | D2（4 要素） | C | 要実測（H-01） |
| R-163 DPoP の限界と BFF 等の併用 | D5、D6 | C | 要実測（H-05、H-09） |
| R-173 token 誤用の PoC | §7 H-01 | C | 要実測（DL-22） |
| R-239・R-259 PKCE、redirect、refresh 保護、JWT 検証、DPoP、end-to-end TLS | D4、D5、D8 | A | 本書で閉じた（end-to-end TLS は逸脱として決裁案 4） |
| R-249 JWT を権限 DB にしない | V10 | A | 本書で閉じた |
| R-250 テナント境界の多層化 | V9 | A | 本書で閉じた（token 側。PEP 側は DL-15） |
| R-251・R-206 サービス別 aud と exchange | D1-4、V6 | C（R-251 は A） | 要実測（ADR-009、H-01） |
| R-283 複数所属 | V9 | C | 要実測（H-13） |
| R-046 iss・aud の厳格検証（FAL2 の部分） | V4、V6 | D | 要第三者（ADR-004、G-089） |
| R-112 全 session 失効の token 側手段 | D1-2、D7-6、D9 | C | 要実測（DL-24、ADR-019） |
| R-208・R-209 過度依存の回避、進化への互換性 | D10、D11-4 | A | 本書で閉じた（token 範囲。全体は DL-13・DL-23） |
| G-024 数値の導出鎖・一律値 0 件 | D3、§2.13 | A | 本書で閉じた（本書の数値は A-ID・規範・TBD のいずれか） |
| G-062・G-081 第三者 grant の濫用と事故型の負例 | D7、§6.3 | C | 要実測（H-08、H-20、DL-52） |
| G-068 alg 切替・PQ サイズ | D10、H-11、H-12 | C | 要実測 |
| G-072 寿命上限の CI 検査 | D3 | C | 要実測（H-23） |
| G-077 FAPI Attacker Model との対応 | §1.7、§6.3 | A | 本書で閉じた（token 範囲。正本は DL-51） |
| G-088 負例の全件拒否 | D2、H-01 | C | 要実測 |
| G-089 適合試験 | §7.2 | D | 要第三者（DL-60） |
| G-103 P-01・P-07 の負例 | H-01、H-13 | C | 要実測 |
| G-106 検証 cache と JWKS cache の最大齢 | §2.13 | C（B 併用） | 決裁案まで（DL-20 で決裁） |
| G-115 テナントは短縮のみ | D3 | C | 要実測（H-23） |
| G-136(d) device code | D7-10、H-10 | C | 要実測 |
| G-138 パターン×インタフェース×契約 | §6.4（token 系の行のみ） | A | 決裁案まで（行列の正本は DL-64） |

### 主張台帳で本書を処置先とする主張

| CL | 処置 | 本書の節 |
|---|---|---|
| CL-0013 JWT を設計要件として固定しない | 維持。外部 opaque・内部 JWT とした | D1 |
| CL-0026 外部 API の JWT と社内の JWT 解釈は同義でない | 維持。外部と内部の issuer・形式を分けた | D1、V4 |
| CL-0126 aud は service または API product 単位 | 維持。粒度はサービス単位 | V6 |
| CL-0130 scp/roles | 修正。claim 名は RFC 9068 の scope とし、roles は載せない | V10 |
| CL-0131・CL-0236 一律 5〜15 分 | 要実測。D3 の導出と TBD | D3、§2.13 |
| CL-0235 rotation 付き refresh か BFF session | 維持（修正）。client 種別ごとの表にした | D4 |

### DL-12 を含むが別の ADR を指す行（本書の対象外）

G-042、G-049、G-051、G-060、G-061、G-066、G-067、G-069、G-070、G-074、G-075、G-084、G-091、G-092、G-093、G-095、G-102、G-109、G-110、G-111、G-113、G-114、G-120、G-126、G-134、G-140 は、対応成果物欄に DL-12 を含むが、ADR-005 以外の ADR（ADR-001〜004、006〜011、013、016、018、019、021〜025、027〜029）を指す [D]。本書はこれらを閉じない [D]。このうち G-068（ADR-015）と G-102（ADR-009）は token に関わる部分を上の関連表に載せた [D]。

---

## 残課題

| # | 本書で閉じないもの | 担当 | 閉じるゲート |
|---|---|---|---|
| 1 | 寿命・cache・時刻差・grant などの値（§2.13） | CISO＋プロダクト責任者、CTO | G3 で案、G4 実測後に DL-20 |
| 2 | 決裁案 1〜7（§2.12）の決裁 | 各決める人 | G3・G4 |
| 3 | RFC 9700 準拠表の本体と作成者以外の照合（G-087） | プラットフォームチーム（DL-16） | G3 |
| 4 | 状態ストアの負荷・停止試験と案B/案C の確定（H-02〜H-04） | CTO＋SRE 責任者 | G4 |
| 5 | AS・edge 製品が opaque 状態の push と DPoP 構成を支えるかの確認（H-22、ADR-001） | CTO | G3（選定） |
| 6 | 内部 cnf の展開費用（H-16）と I1/I2 の確定 | CTO＋CISO | G4 |
| 7 | 要員が A-054 の内数に収まるか（H-18、NA-005-5） | プラットフォームチーム長 | G4（DEC-4） |
| 8 | 新規仮定 NA-005-1〜10 と BIA NA-01 の前提台帳への登録 | 前提台帳の所有者 | G1 |
| 9 | break-glass/B の fail-mode | CISO＋事業責任者 | ADR-029・DL-19 |
| 10 | OIDF 適合試験、pentest、red team（§7.2） | CISO（DEC-5） | 段階 2 |
| 11 | 第三者向け規約への opaque 最大長・sender constraint・協力義務の記載 | プロダクト責任者＋法務 | DEC-8 の契約凍結前 |
| 12 | 棄却仮説（§5）の traceability/rejected-hypotheses.md への集約 | 本書の所有者 | Phase 4 |

---

## 参考文献

[^1]: IETF (T. Lodderstedt, J. Bradley, A. Labunets, D. Fett)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.1, §2.1.1, §2.1.2, §2.2.1, §2.2.2, §2.3, §2.4, §2.5, §2.6, §4.3.2, §4.4.2, §4.9.3, §4.10.2, §4.13, §4.14.2, §4.15.1。§2.2.2・§4.3.2・§4.14.2 は本書の起草時に原文テキストを取得して確認、確認日: 2026-10-03）
[^2]: OpenID Foundation FAPI WG (D. Fett, D. Tonge, J. Heenan)『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: Introduction, §5.2, §5.3.2.1, §5.3.2.2, §5.3.3, §5.3.4, §5.4, §6.2, §6.3、確認日: 2026-10-03）
[^3]: OpenID Foundation FAPI WG (D. Fett)『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5, §6, §8.2, §8.4、確認日: 2026-10-03）
[^4]: OpenID Foundation FAPI WG (D. Tonge, D. Fett, J. Heenan)『FAPI 2.0 Message Signing』Final, 2025-09-25. https://openid.net/specs/fapi-message-signing-2_0-final.html （参照箇所: Introduction, §5、確認日: 2026-10-03）
[^5]: IETF (D. Fett, B. Campbell, J. Bradley, T. Lodderstedt, M. Jones, D. Waite)『RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)』2023-09. https://www.rfc-editor.org/rfc/rfc9449 （参照箇所: §2, §4.3, §5, §7.2, §10（dpop_jkt の使用は OPTIONAL、不一致時の拒否は MUST。本書の起草時に原文を確認）, §11.1〜§11.4, §11.7、確認日: 2026-10-03）
[^6]: IETF (B. Campbell, J. Bradley, N. Sakimura, T. Lodderstedt)『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3, §6.3, §6.5、確認日: 2026-10-03）
[^7]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §2.2, §4, §5（鍵分離が鍵漏えいの防御にならない旨、resource ごとの aud）, §6（client の内容検査の MUST NOT、opaque への切替え）。本書の起草時に §2.1・§4・§5・§6 の原文を確認、確認日: 2026-10-03）
[^8]: IETF (Y. Sheffer, D. Hardt, M. Jones)『RFC 8725: JSON Web Token Best Current Practices』BCP 225, 2020-02. https://www.rfc-editor.org/rfc/rfc8725 （参照箇所: §3.1, §3.8, §3.9, §3.10（jku・x5u を辿る場合の SSRF 対策の SHOULD。本書の起草時に原文を確認）, §3.11, §3.12、確認日: 2026-10-03）
[^9]: IETF (J. Richer, Ed.)『RFC 7662: OAuth 2.0 Token Introspection』2015-10. https://www.rfc-editor.org/rfc/rfc7662 （参照箇所: §2.1, §4、確認日: 2026-10-03）
[^10]: IETF (T. Lodderstedt, V. Dzhuvinov)『RFC 9701: JSON Web Token (JWT) Response for OAuth Token Introspection』2025-01. https://www.rfc-editor.org/rfc/rfc9701 （参照箇所: §5, §8.1, §8.2、確認日: 2026-10-03）
[^11]: IETF (T. Lodderstedt, Ed., S. Dronia, M. Scurtescu)『RFC 7009: OAuth 2.0 Token Revocation』2013-08. https://www.rfc-editor.org/rfc/rfc7009 （参照箇所: §2, §3 Implementation Note、確認日: 2026-10-03）
[^12]: IETF (M. Jones, A. Nadalin, B. Campbell, J. Bradley, C. Mortimore)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1, §4.1, §4.4、確認日: 2026-10-03）
[^13]: IETF (A. Parecki, P. De Ryck, D. Waite)『RFC 10017: OAuth 2.0 for Browser-Based Applications』BCP 212, 2026-08. https://www.rfc-editor.org/rfc/rfc10017 （参照箇所: §6, §6.1.3.1〜§6.1.3.3, §6.1.4.3, §6.3.2.3, §6.3.4.2.2, §6.3.4.3, §9.2、確認日: 2026-10-03）
[^14]: IETF (K. Meyer zu Selhausen, D. Fett)『RFC 9207: OAuth 2.0 Authorization Server Issuer Identification』2022-03. https://www.rfc-editor.org/rfc/rfc9207 （参照箇所: §2, §2.4、確認日: 2026-10-03）
[^15]: IETF (V. Bertocci, B. Campbell)『RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §3, §6.1, §9、確認日: 2026-10-03）
[^16]: IETF (D. Hardt, Ed.)『RFC 6749: The OAuth 2.0 Authorization Framework』2012-10. https://www.rfc-editor.org/rfc/rfc6749 （参照箇所: §4.4.3, §10.4、確認日: 2026-10-03）
[^17]: IETF (W. Denniss, J. Bradley)『RFC 8252: OAuth 2.0 for Native Apps』BCP 212, 2017-10. https://www.rfc-editor.org/rfc/rfc8252 （参照箇所: §4, §8.12、確認日: 2026-10-03）
[^18]: IETF (P. Kasselman, D. Fett, F. Skokan)『RFC 10027: Best Current Practice for Security of Cross-Device Flows』BCP 247, 2026-08. https://www.rfc-editor.org/rfc/rfc10027 （参照箇所: §2, §6.2.1.5、確認日: 2026-10-03）
[^19]: OpenID Foundation Shared Signals WG『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: §4.1.1, §4.1.5、確認日: 2026-10-03）
[^20]: IETF Datatracker『draft-ietf-oauth-rfc8725bis』文書状態ページ. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: rev 10、IESG 状態 RFC Ed Queue、RFC Editor 状態 Blocked、確認日: 2026-10-03）
[^21]: IETF OAuth WG (Y. Sheffer, D. Hardt, M. Jones)『JSON Web Token Best Current Practices』draft-ietf-oauth-rfc8725bis-10, 2026-08-21（Internet-Draft、状態: draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-rfc8725bis-10.txt （参照箇所: §3.1, Appendix A、確認日: 2026-10-03）
[^22]: IETF Datatracker『draft-ietf-oauth-v2-1』文書状態ページ. https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ （参照箇所: rev 16、WG Document、IESG 状態 I-D Exists、確認日: 2026-10-03）
[^23]: IETF Datatracker『draft-ietf-oauth-status-list』文書状態ページ. https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/ （参照箇所: rev 21、IESG 状態 RFC Ed Queue、RFC Editor 状態 In Progress、確認日: 2026-10-03）
[^24]: IETF (M.B. Jones, B. Campbell, C. Mortimore, F. Skokan)『Updates to OAuth 2.0 JSON Web Token (JWT) Client Authentication and Assertion-Based Authorization Grants』draft-ietf-oauth-rfc7523bis-11, 2026-04-28 投稿（Internet-Draft、状態: draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-rfc7523bis-11.txt （参照箇所: Abstract、RFC 7523 §3 項目 3 の置換文、§3.2 への追加要件、確認日: 2026-10-03）
[^25]: IETF Datatracker『draft-ietf-oauth-rfc7523bis』文書記録. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc7523bis/ （参照箇所: IESG 状態 RFC Ed Queue、2026-04-30 IESG 承認、確認日: 2026-10-03）
[^26]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、IESG 未提出、状態: draft）. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §1, §6, §9.1, §9.2, §12、確認日: 2026-10-03）
[^27]: NIST『SP 800-63B-4 Digital Identity Guidelines: Authentication and Authenticator Management』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.2.3, §2.3.3, §5.1, §5.1.2, §5.2、確認日: 2026-10-03）
[^28]: European Commission『Commission Delegated Regulation (EU) 2018/389 (RTS on strong customer authentication and common and secure open standards of communication)』OJ L 69, 2018-03-13. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 （参照箇所: Art. 4(3)、確認日: 2026-10-03）
[^29]: IETF HTTPBIS WG『Cookies: HTTP State Management Mechanism』draft-ietf-httpbis-rfc6265bis-22, 2025-12-01（Internet-Draft、RFC Editor Queue、状態: draft）. https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/ （参照箇所: §5.6 手順 5, §5.7 手順 4、確認日: 2026-10-03）
[^30]: NGINX『Module ngx_http_core_module: large_client_header_buffers』公式文書. https://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers （参照箇所: Default と本文、確認日: 2026-10-03）
[^31]: NIST『IR 8547 ipd Transition to Post-Quantum Cryptography Standards』Initial Public Draft, 2024-11-12（状態: ipd）. https://csrc.nist.gov/pubs/ir/8547/ipd （参照箇所: §4.1.1 Table 2、確認日: 2026-10-03）
[^32]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §11 Offline Access, §15.1、確認日: 2026-10-03）
[^33]: W3C Web Application Security WG『Device Bound Session Credentials』First Public Working Draft, 2025-08-21（状態: draft）. https://www.w3.org/TR/2025/WD-dbsc-1-20250821/ （参照箇所: Status of this document、確認日: 2026-10-03）
[^34]: Microsoft Learn『Protect against consent phishing』ms.date 2023-12-11. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/protect-against-consent-phishing （参照箇所: Mitigating consent phishing attacks, Best practices、確認日: 2026-10-03）
[^35]: Microsoft Learn『Configure how users consent to applications』ms.date 2025-06-15. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent （参照箇所: 冒頭、組込みポリシーの表、既存の同意に関する注記、確認日: 2026-10-03）
[^36]: Microsoft Learn『Authentication flows as a condition in Conditional Access policy』ms.date 2026-03-24. https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-authentication-flows （参照箇所: Device code flow、確認日: 2026-10-03）
[^37]: GitHub『Best practices for creating a GitHub App』GitHub Docs. https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app （参照箇所: Expire tokens、確認日: 2026-10-03）
[^38]: Cyber Safety Review Board (CISA/DHS)『Review of the Summer 2023 Microsoft Exchange Online Intrusion』2024-03-20. https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf （参照箇所: p.17（反実仮想）, p.20–21（Recommendation 6）、確認日: 2026-10-03）
[^39]: Microsoft Security Response Center『Results of Major Technical Investigations for Storm-0558 Key Acquisition』2023-09-06（2024-03-12 追記）. https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition （参照箇所: 「Why a consumer key was able to access enterprise mail」、確認日: 2026-10-03）
[^40]: Google Threat Intelligence Group『Widespread Data Theft Targets Salesforce Instances via Salesloft Drift』2025-08-26（2025-08-28 追記）. https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift （参照箇所: 冒頭の Update 段落、Overview、確認日: 2026-10-03）
[^41]: Cloudflare『The impact of the Salesloft Drift breach on Cloudflare and our customers』2025-09-02. https://blog.cloudflare.com/response-to-salesloft-drift-incident/ （参照箇所: Timeline、Exposure analysis、確認日: 2026-10-03）
[^42]: GitHub (M. Hanley)『Security alert: Attack campaign involving stolen OAuth user tokens issued to two third-party integrators』2022-04-15（2022-04-27 更新）. https://github.blog/news-insights/company-news/security-alert-stolen-oauth-user-tokens/ （参照箇所: 冒頭、確認日: 2026-10-03）
[^43]: Heroku (Salesforce)『April 2022 Incident Review』Last Updated 2022-06-14. https://www.heroku.com/blog/april-2022-incident-review/ （参照箇所: 序文（RFC 8705 への言及）、確認日: 2026-10-03）
[^44]: Dirk-jan Mollema『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: 冒頭、「Actor tokens」、「The fatal flaw leading to cross-tenant compromise」、確認日: 2026-10-03）
[^45]: Jacob Gabrielson（Amazon Web Services）『Avoiding fallback in distributed systems』Amazon Builders' Library（Wayback Machine 2024-08-16 取得版）. https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ （参照箇所: Distributed fallback、How Amazon avoids fallback、確認日: 2026-10-03）
[^46]: Google『Building Secure and Reliable Systems』Chapter 9 "Design for Recovery", 2020. https://google.github.io/building-secure-and-reliable-systems/raw/ch09.html （参照箇所: Time 節、Emergency Access 節、確認日: 2026-10-03）
[^47]: Google『Protecting cookies with Device Bound Session Credentials』2026-04-09. https://blog.google/security/protecting-cookies-with-device-bound-session-credentials/ （参照箇所: How DBSC Works、Future improvements、確認日: 2026-10-03）
[^48]: M.B. Jones, O. Steele『RFC 9864: Fully-Specified Algorithms for JOSE and COSE』2025-10. https://www.rfc-editor.org/rfc/rfc9864 （参照箇所: Abstract, §4.1.2, §4.4、確認日: 2026-10-03）
[^49]: IETF (T. Lodderstedt, B. Campbell, N. Sakimura, D. Tonge, F. Skokan)『RFC 9126: OAuth 2.0 Pushed Authorization Requests』2021-09. https://www.rfc-editor.org/rfc/rfc9126 （参照箇所: §1, §2.2, §7.2、確認日: 2026-10-03）
[^50]: OpenID Foundation『FAPI Working Group Specifications』（仕様一覧ページ）. https://openid.net/wg/fapi/specifications/ （参照箇所: Final Specifications、Drafts の各区分、確認日: 2026-10-03）
[^51]: Joe Magerramov（Amazon Web Services）『Minimizing correlated failures in distributed systems』Amazon Builders' Library（AWS Builder Center）. https://builder.aws.com/content/3Ev2H7t3l2eZa9xBXiZcAjz12JK/minimizing-correlated-failures-in-distributed-systems （参照箇所: Reducing correlated behaviors の jitter 列挙、確認日: 2026-10-03）
[^52]: M. Jones, J. Bradley, N. Sakimura『RFC 7519: JSON Web Token (JWT)』2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §4、確認日: 2026-10-03）
[^53]: M. Jones, J. Bradley, N. Sakimura『RFC 7515: JSON Web Signature (JWS)』2015-05. https://www.rfc-editor.org/rfc/rfc7515 （参照箇所: §4.1.11、確認日: 2026-10-03）
[^54]: R. Housley『RFC 7696: Guidelines for Cryptographic Algorithm Agility and Selecting Mandatory-to-Implement Algorithms』BCP 201, 2015-11. https://www.rfc-editor.org/rfc/rfc7696 （参照箇所: §2.1。本書の起草時に原文を確認、確認日: 2026-10-03）
[^55]: M. Prorock, O. Steele『RFC 9964: ML-DSA for JSON Object Signing and Encryption (JOSE) and CBOR Object Signing and Encryption (COSE)』2026-05. https://www.rfc-editor.org/rfc/rfc9964 （参照箇所: §3, §5、確認日: 2026-10-03）
[^56]: IETF JOSE WG『PQ/T Hybrid Composite Signatures for JOSE and COSE』draft-ietf-jose-pq-composite-sigs-04, 2026-09-11（Internet-Draft、WG Document、IESG 状態 I-D Exists、状態: draft）. https://datatracker.ietf.org/doc/draft-ietf-jose-pq-composite-sigs/ （参照箇所: Datatracker の状態欄、確認日: 2026-10-03）
[^57]: IETF (B. Campbell, J. Bradley, H. Tschofenig)『RFC 8707: Resource Indicators for OAuth 2.0』2020-02. https://www.rfc-editor.org/rfc/rfc8707 （参照箇所: §2、確認日: 2026-10-03）
[^58]: OpenID Foundation『Certified FAPI 2.0 OP Security Profile Final & Message Signing Final』公開一覧（随時更新）. https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/ （参照箇所: Okta / Auth0 – Highly Regulated Identity – 202527 行と添付ファイル名、Filip Skokan / node oidc-provider >= 9.2.0 行、確認日: 2026-10-03）
[^59]: Okta (Auth0)『Configure FAPI Compliance』Auth0 Docs. https://auth0.com/docs/get-started/applications/configure-fapi-compliance （参照箇所: プランの要件、選択できる準拠レベル、確認日: 2026-10-03）
[^60]: Becky Weiss, Mike Furr（Amazon Web Services）『Static stability using Availability Zones』Amazon Builders' Library. https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ （参照箇所: Static stability 節、確認日: 2026-10-03）
[^61]: Amazon Web Services『REL11-BP05 Use static stability to prevent bimodal behavior』AWS Well-Architected Framework Reliability Pillar. https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_withstand_component_failures_static_stability.html （参照箇所: 冒頭定義、Implementation guidance、確認日: 2026-10-03）
[^62]: Microsoft Azure『Azure status history: RCA - Authentication errors across multiple Microsoft services (Tracking ID LN01-P8Z)』2021-03. Wayback Machine 2021-04-02 取得版 https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ （参照箇所: Summary of Impact、Root Cause and Mitigation、確認日: 2026-10-03）
[^63]: OpenID Foundation『FAPI 2.0 Security Profile and FAPI 2.0 Message Signing: Final Conformance Tests and Certifications Now Available』2025-07-09. https://openid.net/fapi2-0-final-conformance-tests-available/ （参照箇所: 本文、確認日: 2026-10-03）
[^64]: RFC Editor『RFC Errata: RFC 9068』. https://www.rfc-editor.org/errata/rfc9068 （参照箇所: Errata ID 8802（Reported、Technical、2026-03-04 報告、§2.2）、確認日: 2026-10-03）
[^65]: Google Cloud『Google Cloud Infrastructure Components Incident #20013（2020-12-14 User ID Service）』. https://status.cloud.google.com/incident/zall/20013 （参照箇所: ISSUE SUMMARY、確認日: 2026-10-03）
[^66]: Google Cloud『Securing your app with signed headers』Identity-Aware Proxy 文書, 2026-09-30 更新. https://docs.cloud.google.com/iap/docs/signed-headers-howto （参照箇所: 冒頭（secondary security）, Verifying the JWT header / payload、確認日: 2026-10-03）
[^67]: Microsoft Learn『Publisher verification overview』Microsoft identity platform, ms.date 2024-08-13. https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview （参照箇所: 冒頭、FAQ「What does publisher verification not tell me」、確認日: 2026-10-03）
