# ADR-020 FAPI 2.0 の適用範囲（必須 API 範囲・sender constraint・PAR・client 認証・RFC 9068 との衝突・適合試験・非 FAPI の最低基準）

> 文書ID: ADR-020 / 版: 0.1 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-15
> 可逆性: 可逆（非対称）。FAPI 必須範囲を狭める変更と、範囲内の方式の選択肢を増やす変更（DPoP 構成の追加など）は、連携開発者の改修なしに行える。範囲を広げる変更と、範囲内の方式を減らす変更（mTLS 以外の sender constraint の廃止、alg の削除など）は、該当する外部 client に PAR・証明書・鍵の改修を強いるため、移行期間と告知を要する（ADR-016、DL-70）。外部に写し取られて戻せないもの（issuer、client_id、claim 名）は本書では決めず、ADR-021・ADR-022 に従う
> DEC-3 対象: いいえ（traceability/deliverables.md §5 の ADR 表で DEC-3 列は「—」）。依存先の ADR-001・ADR-007・ADR-013・ADR-021・ADR-022 は DEC-3 対象である
> 対応要求: R-096, R-160, R-270（本書を対応成果物に含む行）／G-087, G-020（同）。関連: R-026, R-046, R-064, R-158, R-159, R-161, R-162, R-163, R-166, R-173, R-239, R-240, R-273／G-012, G-034, G-077, G-088, G-089（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md, traceability/dissent-log.md, 01_governance/assumptions-register.md, 02_requirements/operation-risk-tiers-assurance.md, 02_requirements/principal-catalog.md, 03_threat-model/attacker-model.md, 03_threat-model/threat-catalog.md, 06_controls/applicability.md, 05_adr/ADR-001, ADR-005, ADR-007, ADR-010, ADR-011, ADR-013, ADR-021, ADR-022, 05_adr/reconciliation-notes.md, research/RS-02, RS-04, RS-13, RS-15（各 verification 記録を含む）, research/standards-status.md
> 作成方法: AI エージェント（Claude）が起草した。research ノートにない原典（Delegated Regulation (EU) 2018/389 第 30 条・第 34 条・第 35 条の本文、OIDF の FAPI 適合試験ページ、OIDF conformance suite のリポジトリ）は起草者が 2026-10-15 に取得して確認した。原典照合ログの traceability/ への追記は要対応である（本書からは編集していない）。本書の評価は自己レビューであり、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。作成者とは別の AI エージェント（Claude）が 2026-10-15 に独立レビューを行い、起草者が取得した原典（[^13]〜[^15]、[^17]）を再取得して照合した。結果は末尾の「レビュー記録」に示す [D]。

**要旨（結論）**

- **範囲**: FAPI 2.0 Security Profile（OIDF Final）を必須とする範囲（以下 FAPI 必須範囲）を、「操作階層×呼出し元の client 種別×規制・契約」で定める [D]。対象は confidential client から呼ばれる次の 6 類である。F1 管理 API（privileged）、F2 権限付与（他主体の権限・所属の変更とテナント管理者の同意）、F3 外部サーバー型連携の write 以上とテナント全体の読取り、F4 大量データ取得（一括 export・全件検索）、F5 規制プロファイル（金融・決済・医療）の対象操作、F6 契約で FAPI 2.0 を求めたテナントの全 API である [D][A-080, A-081]。public client（ネイティブ・CLI・ブラウザ内 client）は FAPI の適用範囲外なので、F1〜F6 の scope を public client に発行しない [N][D]。
- **方式**: FAPI 必須範囲では、sender constraint を mTLS（RFC 8705 の証明書束縛）、client 認証を private_key_jwt（既定）か mTLS、認可要求を client 認証付き PAR に固定し、PKCE S256、認可コード 60 秒以下、RFC 9207 の iss、refresh token の rotation 不使用を守る [N][D]。DPoP 構成は、F3 だけを要する外部連携で end-to-end mTLS を張れない相手に限り、ADR-005 K-3 の決裁を条件に追加する [D]。外部 access token は opaque（ADR-005 D1-1）なので RFC 9068 は外部 token に適用されず、RS256 の MUST との衝突は内部 JWT の検証規則に閉じる。FAPI 必須範囲の経路では内部 JWT も ES256 だけを受理し、RFC 9068 §2.1 からの逸脱として準拠表と受容票に記録する [D]。
- **検証と最低基準**: FAPI 必須範囲を受け持つ AS は、採用版・各 deployment で OIDF conformance suite の FAPI 2.0 Security Profile Final を自社で実行して全試験に合格し、外部に「FAPI 2.0 準拠」と表示する前に OIDF 認定を取る [D]。FAPI 必須範囲の外は、RFC 9700（BCP 240）の準拠表（ADR-005 D8、DL-16）を最低基準とし、FAPI 由来の一部統制（128 bit エントロピー、query token の拒否、認可コード 60 秒以下）を全 client に広げる [D]。部分採用の範囲は「FAPI 2.0 準拠」と称さない [N][D]。

---

## 1. 文脈

### 1.1 解くべき問題

旧提案レビューは、ADR として「FAPI 2.0 を必須にする API 範囲」を分離して決めることを求め（L167）、承認条件 5 として「OAuth 2.0 Security BCP 準拠 profile と、高価値 API に対する FAPI 2.0 採否が決まっている」ことを挙げた（L243）[D][^1]。同レビューは、高価値 API では FAPI 2.0 Security Profile を基準 profile として比較すべきであるとした（L125）[D][^1]。主張台帳は旧提案の「Phase 3 で DPoP または mTLS-bound token を管理系・高リスク API に適用する」（CL-0272）を「修正」とし、適用範囲は RFC 9700 準拠表と FAPI 2.0 の採否で決めると記録している [D]。本 ADR は次の 8 問に答える [D]。

| # | 問い | 主な R/G | 本書の節 |
|---|---|---|---|
| Q1 | FAPI 2.0 を必須とする API の範囲（管理 API、権限付与、外部連携、大量データ取得、決済・医療等の規制スコープ） | R-096, R-160, R-270, G-087 | D20-01〜D20-04 |
| Q2 | 範囲内の sender constraint を DPoP と mTLS のどちらにするか | R-160, R-163, R-240 | D20-05 |
| Q3 | PAR・private_key_jwt・その他の FAPI 必須要素の固定値 | R-160, R-240 | D20-06, D20-07 |
| Q4 | RFC 9068 の RS256 MUST と FAPI の alg 制限の衝突をどう扱うか | R-158, R-161 | D20-08 |
| Q5 | conformance suite による検証と認定 | R-064, G-089 | D20-10 |
| Q6 | 非 FAPI 範囲の最低基準（RFC 9700） | R-158, R-159, G-087 | D20-11 |
| Q7 | 「FAPI 2.0 準拠」と表示してよい範囲と、範囲の判定・強制の仕組み | R-096, R-026 | D20-03, D20-12 |
| Q8 | 主要 ADR が本書に委ねた点（ADR-001 D12、ADR-005 D8-4・K-3、ADR-021 の `authorization_details`、ADR-022 D-6-5） | R-096 | D20-09, §2.14 |

### 1.2 制約（規範。強度は原文どおり）

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-a | Security Profile は金融向けに始まったが、高価値で機微な（個人その他の）データを公開する API の保護に汎用的に使えるよう設計されている。public client を同程度に保護する仕組みは知られていないとして public client を範囲外とし、AS は confidential client だけを支援しなければならない | 記述 / shall | FAPI 2.0 SP Introduction, §5.3.2.1 [N][^2]（RS-04#41） |
| N-b | AS は sender-constrained な access token だけを発行する（mTLS か DPoP）。client 認証は mTLS か private_key_jwt で行う。client assertion の aud は自 AS の issuer 識別子を文字列で受け入れる。認可コードの最大寿命は 60 秒。DPoP を使う場合は認可コードと DPoP 鍵の結合を支援する | shall | FAPI 2.0 SP §5.3.2.1 [N][^2]（RS-04#42） |
| N-c | response_type は code だけ。client 認証付きの PAR を支援し、PAR を使わない認可要求とクライアント認証のない PAR を拒否する。PKCE S256。認可応答で RFC 9207 の iss を返す。request_uri の expires_in は 600 秒未満 | shall | FAPI 2.0 SP §5.3.2.2 [N][^2]（RS-04#43） |
| N-d | RS は query parameter の access token を受け付けない。access token の validity、integrity、expiration、revocation status を検証する。sender-constrained token を支援し検証する | shall not / shall | FAPI 2.0 SP §5.3.4 [N][^2]（RS-04#45） |
| N-e | AS は例外的な状況を除き refresh token rotation を使わない。client は refresh token と rotation の両方を支援する | shall not / shall | FAPI 2.0 SP §5.3.2.1 Note 1 [N][^2]（RS-04#46） |
| N-f | JWT の alg は PS256・ES256・EdDSA（Ed25519）に限り、none は使用も受理もしない。RSA 2048 bit 以上、EC 224 bit 以上。利用者が扱わない資格情報は 128 bit 以上のエントロピー。TLS 1.2 以上と BCP 195 | shall | FAPI 2.0 SP §5.2, §5.4 [N][^2]（RS-04#47） |
| N-g | 準拠を名乗るプロファイルは mandatory な振る舞いを除去・上書きしてはならない。詳細なセキュリティ解析を経たのは認可コードフローと CIBA だけである | shall not / 記述 | FAPI 2.0 SP §5.3.2.1 NOTE 2 ほか [N][^2]（RS-04#48） |
| N-h | RS 側で要求を読める攻撃者（A5）は DPoP proof を再送でき、改変した要求にも proof を再利用され得る。緩和策の 1 つに DPoP の代わりに mTLS を検討することが挙げられている（ほかに短命 nonce、jti による再送防止、署名付きリソース要求） | 記述 | FAPI 2.0 SP §6.2, §6.3 [N][^2]（RS-04#49） |
| N-i | JWT access token の AS と RS は RS256 を対応 alg に含めなければならない | MUST | RFC 9068 §2.1 [N][^6]（RS-04#60） |
| N-j | client は access token の内容を調べてはならない | MUST NOT | RFC 9068 §6 [N][^6]（RS-04#61） |
| N-k | mTLS で束縛する RS は、mTLS を使うことを handshake 前に知っている必要がある。client 証明書を更新すると束縛された token は無効になる。TLS を中継装置で終端する場合の証明書情報の受け渡しは RFC 8705 の範囲外 | 記述 | RFC 8705 §3, §6.3, §6.5 [N][^8]（RS-04#59） |
| N-l | reverse proxy はセキュリティに関わる全ヘッダを sanitize し、proxy とアプリの間の通信路を保護しなければならない | MUST | RFC 9700 §4.13 [N][^5]（RS-04#24） |
| N-m | access token は sender-constrained にすべきである。クライアント認証には非対称暗号を使うことが RECOMMENDED | SHOULD / RECOMMENDED | RFC 9700 §2.2.1, §2.5 [N][^5]（RS-04#14, #20） |
| N-n | Final の Message Signing は PAR の JAR、JARM、introspection 応答の署名を対象とし、リソース要求の署名を含まない。各要素は別々に適合試験を選べる | 記述 | FAPI 2.0 Message Signing [N][^4]（RS-04#51） |
| N-o | 決済サービス事業者は、第 30 条第 1 項 (a) の識別のため、eIDAS 規則の適格電子シール証明書またはウェブサイト認証用の適格証明書に依拠しなければならない | shall | Delegated Regulation (EU) 2018/389 Art. 34(1) [N][^17] |

- FAPI 必須範囲で RFC 9068 の JWT access token を外部に出すと、N-f と N-i を同時には満たせない（RS-04 §2-7）[D]。本書は外部 opaque（ADR-005 D1-1）を前提に、この衝突を内部 JWT に限定して扱う（D20-08）[D]。
- N-g により、FAPI の mandatory な振る舞いを外した範囲を「FAPI 2.0 準拠」と称してはならない [N][^2]。client credentials grant は詳細解析を経たフローに含まれない [N][^2]（RS-04#48）。

### 1.3 前提（A-ID）

| A-ID | 値（基準） | 本 ADR での使い方 |
|---|---|---|
| A-007 | テナント 1 万 | F1・F2 の対象テナント数（全テナントの管理 API） |
| A-013 | 外部 client 800・grant 3 万（成長 2,500・12 万） | F3 の対象 client 数の上限、連携開発者への影響 |
| A-040 | edge API ピーク 16,804/秒 | FAPI 必須範囲の要求量の上限（比率は NA20-02） |
| A-050〜A-054 | 300 サービス、25 組織・60 チーム、プラットフォーム 24 FTE | 要員の桁 |
| A-063 | リージョン 4 | deployment 数 |
| A-072 | 基盤はカード会員データを扱わない（PCI は分離スコープ） | F5 から PCI CDE を除く |
| A-080 | 規制業種 25%（金融 10・医療 7・公共 5・決済 3%） | F5 の対象テナントの比率 |
| A-081 | 高保証要求テナント 50（範囲 10〜200、規制強化 600） | F6 の件数、ADR-001 D12 の切替条件 |
| A-100〜A-104 | 20 年、再決裁周期、暗号移行・製品置換各 1 回以上 | 再検討トリガー |

**新規仮定（前提台帳へ追加要）**

前提台帳は本書から編集しない [D]。

| 仮 ID | 内容 | 扱い |
|---|---|---|
| NA20-01 | 外部 client（A-013）のうち F3 の scope（write 以上、またはテナント全体の読取り）を要する比率 q3 | TBD（所有者 プロダクト責任者、期限 G1 の As-Is 棚卸し）。連携開発者の改修件数を決める |
| NA20-02 | edge 要求のうち FAPI 必須範囲が占める比率 p_f | TBD（所有者 CTO、G1）。ADR-005 NA-02（p_w）の内数として測る |
| NA20-03 | 適合試験の運用要員 | 「プラットフォーム 24 FTE の内数で 0.5〜1 FTE の桁」と仮置きする。根拠は、試験が AS 版上げ・構成変更ごとの自動実行と年次の手動確認に限られるという推論だけで弱い [D][A-054] |
| NA20-04 | public client（PC-19 ネイティブ・CLI）から F1・F2 の操作を行う需要 | TBD（所有者 プロダクト責任者、G1）。D20-04 の帰結（CLI 利用者の操作経路の変更）の規模を決める |
| NA20-05 | F5 の対象テナントのうち、EU の口座保有決済サービス事業者として PSD2 の専用インターフェースを本基盤で保護するテナントの有無 | TBD（所有者 法務＋事業責任者、DL-34）。D20-05 の適格証明書受入れの要否を決める |

### 1.4 関連 R/G

本書を対応成果物に含む行は R-096・R-160・R-270・G-087・G-020 である（R-requirements.md・G-goal-criteria.md の対応成果物欄を Grep で確認）[D]。関連する R/G と閉じ方は末尾の対応表に示す [D]。

### 1.5 関連研究

| 研究 | 使う項目 |
|---|---|
| RS-04 | §2-3（FAPI の範囲と public client 除外）、§2-4（プロファイル化規則）、§2-5（mTLS と DPoP）、§2-7（RS256 と FAPI alg の衝突）、#14・#20・#24（RFC 9700）、#40〜#52（FAPI 2.0 SP・AM・Message Signing・適合試験）、#53〜#59（PAR・DPoP・mTLS）、#60・#61（RFC 9068）、#64（RAR）、§5.2・§5.3（設計入力・PoC） |
| RS-02 | #33・#34（金融庁サイバー GL 2.3.1）、#37（医療 GL 第 7.0 版）、#71（PCI DSS 8.4.2）、§3.7（規制×要件の総括） |
| RS-13 | #38・#39（PSD2 RTS 第 2 条・第 4 条）、#57（device authorization grant）、#61（consent phishing） |
| RS-15 | #2（OIDF 認定料金）、#4〜#8（FAPI 2.0 認定一覧と試験構成）、#11（Keycloak の FAPI 対応記載）、#33（node-oidc-provider）、#45（Auth0 HRI の FAPI 構成） |

### 1.6 関連脅威と攻撃者

| 区分 | ID | 本書との関係 |
|---|---|---|
| 攻撃者 | ATK-01 外部攻撃者 | FAPI の A1・A2・A3a に対応（attacker-model §5）。認可要求の改ざん・注入を PAR と client 認証で抑える [D] |
| 攻撃者 | ATK-02 悪意あるテナント管理者 | FAPI の A1・A1a・A4。F1・F2 の管理 API を正規に使える立場であり、FAPI は正規利用の濫用を扱わない [D] |
| 攻撃者 | ATK-05 盗まれた token | FAPI の A5。sender constraint の主対象 [D] |
| 攻撃者 | ATK-06 侵害された microservice | FAPI の A5（受信要求を読む）。DPoP proof の再送が可能な位置にある [N][^2]（RS-04#49） |
| 攻撃者 | ATK-15 悪意ある・侵害された第三者連携アプリ | (a) は A1。(b) 正規参加者の侵害は FAPI の前提の外 [D]（attacker-model §5） |
| 攻撃者 | ATK-08・ATK-11・ATK-17・ATK-18 | FAPI Attacker Model は AS 上の RCE と誤設定 DB からの資格情報漏えいを範囲外とする [N][^3]（RS-04#50）。FAPI 準拠はこれらへの統制を示さない（ADR-001 RR-01、ADR-007 §1.2）[D] |
| 脅威 | T-006 認可コード・redirect の悪用 | PAR、PKCE S256、コード 60 秒・一回限り、iss [D] |
| 脅威 | T-007 device code phishing・consent phishing | F2 にテナント管理者の同意を含め、device grant を FAPI 必須範囲で無効にする [D] |
| 脅威 | T-014 token replay | mTLS 束縛、Bearer の拒否 [D] |
| 脅威 | T-015 audience 誤用 | サービス別 aud（ADR-005 D1-4）。FAPI の範囲外の内部経路を含む [D] |
| 脅威 | T-016 信頼ヘッダの偽装（mTLS 証明書ヘッダの注入） | TLS 終端点の sanitize（N-l）を FAPI 必須範囲の前提条件にする [D] |
| 脅威 | T-061 IdP mix-up | RFC 9207 の iss（N-c） |
| 脅威 | T-069 連携事業者に保存された token の大量窃取 | 第三者 client の token を証明書に束縛し、盗んだ token を単独で使えなくする [D] |
| 脅威 | T-079 正規資格情報による大量 export | F4。FAPI は正規の権限内の取得を防がないため、量の上限と検知（DL-52）を併用する [D] |

---

## 2. 決定

本節はすべて決裁前の提案である [D]。決定 ID は D20-01〜D20-13 とする。経営・事業の判断が要る点は §2.14 に、主要 ADR との論点は §2.15 にまとめる [D]。

### D20-01 層の定義（3 層）

| 層 | 名称 | 適用条件 | 表示 |
|---|---|---|---|
| 層 F | FAPI 2.0 必須範囲 | D20-02 の F1〜F6 に当たる操作を、confidential client が呼ぶ経路 | 「FAPI 2.0 Security Profile 準拠」（D20-10 の合格と認定の後に限る） |
| 層 H | 高保証（FAPI 由来統制） | F1〜F6 に当たるが FAPI を適用できない経路（D20-04 の例外、AS が適合試験に不合格の期間） | 「RFC 9700 準拠プロファイル＋FAPI 由来の個別統制」。FAPI 準拠と称さない |
| 層 B | 基準 | 上記以外 | 「RFC 9700 準拠プロファイル」 |

- 層 H を置くのは、FAPI が public client を範囲外とし [N][^2]（RS-04#41）、部分採用を FAPI 準拠と称することを禁じる [N][^2]（RS-04#48）ためである [D]。
- 層は client 登録（client の profile 属性）と操作の分類（DL-67 の操作登録）の組で決まり、テナント単位では決めない（F6 を除く）[D]。

### D20-02 FAPI 必須範囲（F1〜F6）

| 類 | 対象 | 操作階層（02_requirements/operation-risk-tiers-assurance.md §2） | 理由 |
|---|---|---|---|
| F1 管理 API | テナントまたは基盤の構成（認証方式、IdP 連携、OAuth client 登録、policy、認可モデル、鍵、監査設定、保持期間、所在地）を変える API | privileged (b)（/T と /P） | 1 回の不正操作が全利用者・全連携に及ぶ。旧提案も管理系を高リスク API に挙げた（CL-0272）[D] |
| F2 権限付与 | 他主体の権限・所属・認証状態・session を変える API、第三者アプリへのテナント管理者の同意（ADR-005 D7-2） | privileged (a)、+XT の管理者同意 | 権限付与は以後の全アクセスを決める。consent phishing は同意を入口にする [V][^22]（RS-13#61）[D] |
| F3 外部連携 | 第三者・顧客自作のサーバー型 client（PC-15）が、write 以上の操作、またはテナント全体を対象とする読取りを行う scope | write 以上、または read-sensitive のうちテナント全体を対象とするもの | 盗まれた連携 token による大量取得の事故がある（Salesloft Drift、T-069）[D]。ADR-005 D5・D7 が第三者に mTLS 既定と非対称 client 認証をすでに課しているので、追加の負担は PAR と固定値に限られる [D] |
| F4 大量データ取得 | 一括 export、全件検索、一括変更 | privileged (c) | 1 要求の被害が大きい（T-079）[D] |
| F5 規制プロファイル | §5 の規制プロファイルが適用されたテナントで、JP-金融・EU-PSD2 の +FIN と支払口座へのオンラインアクセス、JP-医療・US-HIPAA の要配慮情報の read-sensitive 以上 | +REG、+FIN | D20-04a のとおり、規制は FAPI を名指ししないが、API 間の認証・認可の真正性と安全な通信を求める [N][D] |
| F6 契約 | 契約で FAPI 2.0 を求めたテナント（A-081 の高保証テナントのうち該当するもの）の全 API | 全階層（public を除く） | 契約上の要求 [D][A-081] |

- privileged/P（基盤の管理面）は、OAuth の外部 client に公開しない [D]。基盤運用者の経路は ADR-029（特権・support アクセス）が定め、本書の層 F の対象にしない [D]。
- break-glass は通常の認証・認可を迂回する経路であり、本基盤の AS に依存しない（principal-catalog PC-08）ので、本書の対象外とする [D]。
- read-sensitive の一般的な読取り（自分の記録の閲覧）と public は、F5・F6 を除き層 B とする [D]。対象を広げない理由は、FAPI の固定値（PAR、mTLS）を 800 client 全体（A-013）と第一者のネイティブ・CLI に課すと、public client を範囲外とする FAPI の構造と衝突し、利用者体験と連携の参入障壁が大きくなるからである [N][^2][D][A-013]。
- 内部 workload 間の呼出し（PC-13）は FAPI の対象外である [D]。FAPI Attacker Model は内部アーキテクチャを範囲外とする [N][^3]（RS-04#50）。内部経路は ADR-005 D1（token exchange、サービス別 aud）・D5（mTLS、cnf の I1）・D1-6（FAPI 範囲の stateful jti 照合）で統制する [D]。

### D20-03 判定と強制

- **D20-03-1** 操作の F1〜F6 の該当は、操作の分類登録（DL-67 の準備完了条件、operation-risk-tiers §2.4）に「FAPI 必須」の属性として登録する [D]。未登録の操作は本番に出さない規則（J10）に従う [D]。
- **D20-03-2** scope と resource（RFC 8707）を、FAPI 必須の操作群と層 B の操作群で分ける [D]。FAPI 必須の scope は、FAPI profile で登録された client にだけ AS が発行する [D]。
- **D20-03-3** edge は introspection 応答で発行時の profile（FAPI か否か）と束縛方式を確かめ、FAPI 必須の操作に FAPI profile 以外で発行された token が来たら拒否する [D]。応答の欄名は DL-75・DL-115 で決め、新しい claim 名の規則は ADR-021 に従う [D]。
- **D20-03-4** 判定を下げる（FAPI 必須の操作を層 B で運用する）ことは、操作階層の引下げと同じく CISO の承認と受容票（DL-05）を要する（operation-risk-tiers J11）[D]。上げることは各ドメイン責任者の判断でよい [D]。

### D20-04 client 種別ごとの扱い

| client 種別 | 層 F（F1〜F6） | 理由 |
|---|---|---|
| 第一者 BFF（confidential） | 対象。FAPI client profile で登録する | ADR-005 D6-2 は BFF を confidential client とし PAR を使うと定めている [D] |
| 第三者・顧客自作のサーバー型（PC-15） | 対象 | FAPI の想定する confidential client [N][^2] |
| 外部 M2M（client credentials） | 対象。ただし client credentials grant は FAPI の詳細解析を経ていないことを準拠表に記す | [N][^2]（RS-04#48） |
| ネイティブ・CLI（PC-19、public） | F1〜F6 の scope を発行しない。例外は D20-04-1 | FAPI は public client を範囲外とする [N][^2]（RS-04#41） |
| 第三者のブラウザ内 client（public） | 発行しない（例外なし） | ADR-005 D6-3 は低リスク scope に限っている [D] |
| AI エージェント（PC-16） | 委任で動く場合は委任元の client 種別に従う。自身の資格情報で F1〜F6 を行う場合は confidential として層 F | operation-risk-tiers +AGT、REQ03-D5 [D] |
| device authorization grant | FAPI 必須範囲では無効 | RFC 10027 は機微・高価値の資源では避けるよう述べる [N][^23]（RS-13#57） |

- **D20-04-1** 顧客管理者が CLI で privileged/T を行う需要（NA20-04）には、第一者 BFF 経由の管理コンソールか、顧客側のサーバー型自動化（private_key_jwt＋mTLS の confidential client）を提供する [D]。それでも public client からの実行が必要な操作に限り、層 H（DPoP＋nonce、ハードウェア保護鍵、step-up、最大寿命）で受容票付きの期限付き例外とする [D]。
- **D20-04a 規制スコープの判定**: 調べた原典の範囲（RS-02、RS-13）では、日本・EU・米国の対象法令・ガイドラインに FAPI 2.0 を名指しで義務付ける規定は見つからなかった [D]（RS-02 §3.7、RS-13 §3.3。いずれも FAPI の有無を目的に網羅検索した調査ではなく、記載がないことを確認したにとどまる。レビューで参照節を修正）。金融庁 GL 2.3.1 は、システム間・セキュリティ境界にまたがる認証・認可の機密性・完全性・真正性の確保を「基本的な対応事項」とする [N][^18]（RS-02#34）。PSD2 RTS 第 30 条は口座保有事業者に第三者事業者が自らを識別し安全に通信できるインターフェースを求め、第 34 条は識別に eIDAS 適格証明書（電子シールまたはウェブサイト認証）への依拠を求め、第 35 条は通信セッション全体での暗号化を求める [N][^17]。医療 GL 第 7.0 版は端末とサーバでの二要素認証を求めるが、API の保護 profile は定めていない [N][^19]（RS-02#37）。以上から、F5 は「規制が名指しするから」ではなく、「規制が求める真正性・完全性を検証可能な形で示す手段」として FAPI を採る設計判断である [D]。英国の RTS（EU 離脱後の国内法化版）、英国 Open Banking の標準、米国の業界規制で FAPI を求めるものの有無は本書では確認していない（未確認。結論に使わない）[D]。

### D20-05 sender constraint

| 経路 | 方式 | 根拠 |
|---|---|---|
| 層 F の F1・F2・F4・F5・F6 | mTLS（RFC 8705、証明書束縛 access token）のみ | ADR-005 D5「privileged・FAPI 範囲を呼ぶサーバー型は mTLS のみ」と同じ [D]。FAPI は、A5 攻撃者による DPoP proof の再送と改変要求への再利用の緩和策の 1 つとして、DPoP の代わりに mTLS を検討することを挙げる [N][^2]（RS-04#49）。Final の Message Signing はリソース要求の署名を含まない [N][^4]（RS-04#51） |
| 層 F の F3 だけを要する外部連携 | mTLS を既定とする。end-to-end mTLS を張れない相手（CDN・WAF で TLS が終端される等）に限り、ADR-005 K-3 で (b) が決裁された場合に FAPI 2.0 の DPoP 構成（nonce 必須、dpop_jkt でコードを束縛）を許す | FAPI 2.0 は DPoP を sender constraint として認める [N][^2]（RS-04#42）。A5 への耐性の低下を受容票で記録する [D][NA20-01] |
| 層 H | DPoP＋nonce（public client）。鍵はハードウェア保護を必須 | ADR-005 D5・D4 [D] |
| 層 B | ADR-005 D5 の表どおり | — |

- **D20-05-1** mTLS を要求する endpoint はホスト名で分け、TLS 終端点では client 証明書ヘッダの sanitize と proxy・アプリ間の保護を必須にする [N][^5][^8][D]（RS-04#24, #59）。この 2 点が満たせない経路は層 F に置かない [D]。
- **D20-05-2** 証明書を更新すると束縛 token は無効になる [N][^8]（RS-04#59）。SDK と連携開発者向け手引き（DL-62 連携ハンドブック・DL-64 連携パターン集）は、更新前に token を取り直す手順を示す [D]。
- **D20-05-3** AS ごとに別の証明書・DPoP 鍵を使うことを client の既定にする（Cuckoo's Token Attack の緩和）[N][^2]（RS-04#49）[D]。
- **D20-05-4** NA20-05 が「有」と判定された場合（テナントが本基盤で PSD2 の専用インターフェースを保護する場合）は、F5 の該当 API で第三者事業者の eIDAS 適格証明書を client 証明書として受け入れる登録方式（tls_client_auth）を用意する [N][^17][D]。適格証明書の失効確認と信頼リストの扱いは DL-34・DL-16 で決める（TBD、所有者 CISO＋法務、期限 G3）[D]。

### D20-06 client 認証

- **D20-06-1** 層 F の client 認証は private_key_jwt（RFC 7523）を既定とし、mTLS（tls_client_auth・self_signed_tls_client_auth）を選択肢として許す [N][^2][D]。client_secret（共有秘密）は使わない [D]。
- **D20-06-2** 既定を private_key_jwt にする理由は、(1) client 認証の鍵と sender constraint の証明書を分けて更新でき、証明書更新時に client 認証が止まらない、(2) TLS 終端の構成から client 認証を独立させられる、の 2 点である [D]。OIDF の FAPI 2.0 認定一覧は、private key＋MTLS と MTLS＋MTLS をそれぞれ別の試験構成として扱っている [N][^10]（RS-15#4）。
- **D20-06-3** client assertion の aud は AS の issuer 識別子を文字列で入れ、AS は配列を受け入れない [N][^2]（RS-04#42, #44）。client assertion の alg は D20-08 の allowlist に従う [D]。
- **D20-06-4** client の鍵は jwks_uri で登録させ、AS は登録された jwks_uri だけから取得する（jku・x5u は辿らない）[D]（ADR-005 V3）。FAPI は jwks_uri を TLS でだけ提供すること（shall）と、x5u・jku を使うべきでないこと（should not）を定めており、辿らない規則は should not より厳しい自社判断である [N][^2][D]（RS-04#47）。

### D20-07 認可要求とその他の固定値

| 項目 | 層 F の値 | 根拠 |
|---|---|---|
| 認可要求 | client 認証付き PAR だけを受け付ける（client 単位で require_pushed_authorization_requests を有効にする）。PAR なしの認可要求と client 認証のない PAR は拒否する | FAPI shall [N][^2]（RS-04#43）、RFC 9126 [N][^9]（RS-04#53） |
| request_uri | 一回限り。expires_in は 600 秒未満。運用値は DL-20 で決める（TBD、所有者 CTO、期限 G4） | FAPI shall [N][^2]、RFC 9126 MUST [N][^9] |
| response_type | code のみ | FAPI shall [N][^2] |
| PKCE | S256 必須 | FAPI shall [N][^2] |
| 認可コード | 60 秒以下、一回限り | FAPI shall [N][^2] |
| 認可応答 | RFC 9207 の iss を返し、client は検査する | FAPI shall [N][^2] |
| redirect | 資格情報を含む要求に 307 を使わない（303 を使う） | FAPI shall not / should [N][^2] |
| refresh token | rotation を使わない。client 認証で束縛する | FAPI shall not [N][^2]（RS-04#46）、ADR-005 D4 |
| RS | query の token を拒否。失効状態を毎要求確認（edge の introspection、内部の stateful jti 照合） | 拒否と失効状態の検証は FAPI shall not / shall [N][^2]（RS-04#45）。検証手段を FAPI は定めておらず、毎要求の照合は自社判断 [D]（ADR-005 D1-2・D1-6） |
| CORS | 認可エンドポイントで支援しない | FAPI shall not [N][^2]（RS-04#47） |
| TLS | TLS 1.2 以上、BCP 195。新しい BCP 195 には 12 か月以内に追随する | TLS 1.2 以上と BCP 195 は FAPI shall [N][^2]（RS-04#47）。12 か月以内の追随は NOTE 2 の「期待」であり shall ではない [N][^2]（RS-04#47）。本基盤はこれを必須とし、ADR-016 の改訂周期に入れる [D] |

- **D20-07-1** Message Signing（Final）は、introspection 応答の署名（RFC 9701）だけを層 F で採る [D]。ADR-005 D2 は FAPI 範囲の introspection 応答を `token-introspection+jwt` としている [D]。Message Signing の各要素は別々に適合試験を選べる [N][^4]（RS-04#51）。
- **D20-07-2** JAR による PAR の署名と JARM は、契約で否認防止を求めた F6 のテナントに限り client 単位で有効にする [D]。リソース要求本文の否認防止には Final の標準がないので、業務層の署名と監査（ADR-014）で補う [N][^4][^11][D]（RS-04#51）。

### D20-08 RFC 9068 の RS256 要件との衝突

- **D20-08-1 外部 token**: 層 F の外部 access token は opaque であり（ADR-005 D1-1）、RFC 9068 の JWT access token ではない [D]。edge は RFC 7662 の introspection で検証する [D]。したがって外部境界では N-f と N-i は衝突しない [D]。client は token の内容を調べてはならないので（N-j）、opaque 化で外部 client が失う機能はない [N][^6][D]。
  - 整合調整（レビューで追加）: ADR-005 K-1 が (b)（案C）に決まると、第一者 BFF の経路は内部 JWT になる（ADR-005 D1-7）。案C でも「第三者・ネイティブ・高リスクは opaque」とされているので、本書は BFF が層 F の scope（F1〜F6）で受け取る access token を opaque のまま残すことを K-1 (b) の条件として求める [D]。これを満たせない場合（BFF の層 F 経路にも JWT を出す場合）は、その JWT に D20-08-2・D20-08-3 の alg 制限を適用し、RFC 9068 §2.1 からの逸脱の記録範囲を BFF 経路に広げる [D]。この条件は ADR-005 K-1 の決裁票に併記する必要がある（§2.15 P-4）[D]。
- **D20-08-2 内部 JWT**: 内部 issuer の JWT access token（RFC 9068、`at+jwt`）は ES256 で署名する（ADR-005 D8-3）[D]。層 F の操作を処理する内部 RS では、SDK の RS256 検証を有効にできないよう固定する [D]。ADR-005 K-4 の選択肢「RS256 も有効」は、層 F の経路には適用しない [D]。ADR-005 D8-3 は、SDK が RS256 の検証を実装し既定で無効にする構成について、RFC 9068 §2.1 の MUST（N-i）を満たすかは解釈に依存するとしている [D]。層 F の経路で有効化自体を不可にする本書の固定は、その解釈の幅をさらに狭めるので、準拠表（DL-16）に「FAPI 優先の逸脱（または逸脱の可能性）」として記録し、受容票（受容者案 CISO）を付ける [N][^6][D]（RS-04 §2-7、ADR-005 D8-3。レビューで ADR-005 の表現に整合）。
- **D20-08-3 層 F の alg allowlist**: ES256 を既定とし、client から受け取る JWT（client assertion、JAR の request object）に限り PS256 も受理する [D]。EdDSA は受理しない（ADR-005 D10-4 で、RFC 9864 が多相的な EdDSA を Deprecated にしたことを理由に不採用）[D]。FAPI の許す 3 方式の部分集合に絞ることが FAPI の mandatory な振る舞いの除去に当たらないことを、D20-10 の適合試験で確かめる（TC-20-01）[D]。
- **D20-08-4 ID Token**: OP は OIDC Core の MTI として RS256 に対応しなければならない [N][^12]。ADR-007 D7-61 は外部 issuer で RS256 鍵と ES256 鍵を並行公開する [D]。層 F の client は id_token_signed_response_alg を ES256 または PS256 で登録させ、RS256 の ID Token を受け取らない構成にする [D]。OP 全体の RS256 対応（層 B の client 向け）と、層 F の client への FAPI の alg 制限は、client 単位の設定で両立する [D]。
- **D20-08-5** 衝突の記録は、DL-16 の準拠表で RFC 9068 §2.1 の行と FAPI §5.4 の行を並べて書く（RS-04 §5.1 の方針）[D]。

### D20-09 構造化された許可（`authorization_details`）

- **D20-09-1** ADR-021 が予約し本書に採否を委ねた `authorization_details`（RFC 9396）は、第三者 client が F5 の +FIN 操作（支払の実行など）を行う場合に採る [D]。scope では金額・支払先などの取引単位の内容を表せず、取引ごとの同意を grant に結び付けられないからである [D]。FAPI 2.0 も、scope で表現しきれない場合に RAR を使うことを推奨している（NOTE 5）[N][^2]（RS-04#64）。
- **D20-09-2** AS は未知の type や型定義に合わない要素を処理せず invalid_authorization_details を返さなければならない（MUST）[N][^24]（RS-04#64）。完全性の保護には PAR を使う [N][^24]（RS-04#64）[D]。type の定義は契約（DL-69）で版付きで公開する [D]。
- **D20-09-3** それ以外の F1〜F6 は scope と resource で表し、`authorization_details` を使わない [D]。

### D20-10 適合試験（conformance）と認定

- **D20-10-1** 層 F を受け持つ AS は、採用版・各 deployment で OIDF conformance suite の FAPI 2.0 Security Profile Final を自社で実行し、全試験に合格することを本番投入の条件にする（ADR-001 D12-1 と同じ）[D]。必須の試験構成は、ADR-001 D12-1・TC-01-06 と ADR-005 §7.2 に合わせ、mTLS 構成（private key＋MTLS、MTLS＋MTLS）と DPoP 構成（private key＋DPoP、MTLS＋DPoP）の 4 つとする [D]。DPoP 構成を本番で有効にするかは K20-2 で別に決めるが、AS の採否判定（ADR-001 D13 の足切り）と、K20-2 が後から (b) になった場合に試験をやり直さずに済むよう、試験は常に 4 構成で行う [D]（整合調整: 起草版は DPoP 構成を有効化前の追加としていたが、ADR-001 D12-1 と食い違うため改めた）。Message Signing は、層 F で使う要素（introspection 応答の署名〔D20-07-1〕、F6 で有効にし得る JAR と JARM〔D20-07-2〕）を対象にする [D]。
- **D20-10-2** OIDF の FAPI 2.0 Final の OP 認定一覧は、MTLS＋MTLS、MTLS＋DPoP、private key＋MTLS、private key＋DPoP、OpenID Connect、Message Signing の JAR、JARM の 7 列で認定を記録している [N][^10]（RS-15#4）。認定は特定の版・deployment の記録であり、後の版の適合を示さない [D]（RS-15#8）。OIDF の FAPI OP 試験ページは、FAPI 2.0 Security Profile Final を試験対象に挙げ、client 認証の mtls と private_key_jwt、access token の証明書束縛の試験を記載し、ログイン後は誰でも使えると記している [N][^13]。同ページは HTTP Message Signatures を現時点では支援しないと記している [N][^13]。同ページに DPoP の記載はなかったが、認定一覧には DPoP 構成の列がある [N][^13][^10]。また同ページは Message Signing を Implementers Draft 1 として挙げ、Final を挙げていない（レビュー時 2026-10-15 の再取得で確認）[N][^13]。一方、認定一覧は Message Signing Final の JAR・JARM 列を持つ [N][^10]（RS-15#4）。試験ページの記載は更新が遅れている可能性があり、Message Signing Final の試験計画の有無は DL-60 で conformance suite 上で確かめる（TBD、所有者 CISO、期限 G4）[D]。
- **D20-10-3** 実行の時機は次のとおりとする [D]。(1) AS の版上げ・構成変更の前に CI で実行し、不合格なら展開しない。(2) 年 1 回、本番構成と同じ設定のステージングで手動確認する。(3) 新しい cell・deployment を開く前。ログは E7 として保存する（DL-60）[D]。conformance suite は OIDF が GitLab で公開しており、プロジェクトの表示は MIT License で、README はローカル実行の手順への案内を載せている [V][^14][^15]。CI での自前実行はこれを前提にする [D]。
- **D20-10-4** 外部（契約・営業資料・開発者文書）に「FAPI 2.0 準拠」と表示するのは、層 F を受け持つ deployment で OIDF 認定を取得した後に限る [D]。FAPI 1/FAPI 2 の自己認定料金は非会員で 1 deployment あたり 5,000 ドルで、1 回の料金で複数のプロファイルを認定できる [N][^16]（RS-15#2）。
- **D20-10-5** client 側は、プラットフォームが提供する参照 SDK・BFF 参照実装で FAPI 2.0 の client 側試験を実行する [D]。第三者の層 F の client には、OIDF の試験の自己実行を登録条件にする [D]。ADR-022 D-6-5 は OIDC の RP 適合試験の自己実行を「高リスクの連携（FAPI 範囲）では必須」としており、本書はこれを FAPI 2.0 の client 側試験に具体化する [D]。
- **D20-10-6** 適合試験は FAPI Attacker Model の範囲（A1・A1a・A2・A3a・A5）でのプロトコル実装の正しさを確かめるものであり、AS 上の RCE・DB からの漏えい・鍵管理は確かめない [N][^3][D]（RS-04#50）。これらは負例試験（G-088）、第三者 pentest（DL-59）、鍵の演習（ADR-007）で別に確かめる [D]。

### D20-11 非 FAPI 範囲（層 B）の最低基準

- **D20-11-1** 層 B の最低基準は RFC 9700（BCP 240、final）の準拠表とし、MUST 行からの逸脱は「非準拠」として期限付き受容票を必須にする（ADR-005 D8-1）[D]。
- **D20-11-2** 層 B でも次を必須にする（RFC 9700 の強度より厳しい項目は自社判断として書き分ける）[D]。

| 項目 | RFC 9700 の強度 | 層 B の扱い | 根拠 |
|---|---|---|---|
| redirect URI の完全一致 | MUST | 採用 | [N][^5]（RS-04#1） |
| PKCE | public は MUST、confidential は RECOMMENDED | 全 client で S256 必須（自社判断） | [N][^5]（RS-04#8〜#10）、ADR-005 D8-2 |
| implicit grant | SHOULD NOT | AS で無効化（自社判断） | [N][^5]（RS-04#13） |
| ROPC | MUST NOT | 無効化 | [N][^5]（RS-04#18） |
| sender constraint | SHOULD | 外部 token は必須（ADR-005 D5） | [N][^5]（RS-04#14） |
| audience 制限 | SHOULD（自分宛てでない token の拒否は MUST） | サービス別 aud 必須 | [N][^5]（RS-04#17） |
| 非対称 client 認証 | RECOMMENDED | 新規 client で必須 | [N][^5]（RS-04#20）、ADR-005 D7-1 |
| public client の refresh token | sender-constrained か rotation が MUST | ADR-005 D4 の表 | [N][^5]（RS-04#15） |
| query の access token | MUST NOT（client） | RS で拒否（FAPI の shall not を全 RS へ拡張） | [N][^5][^2]（RS-04#32, #45） |
| 認可エンドポイントの CORS | MUST NOT | 採用 | [N][^5]（RS-04#27） |
| mix-up | 複数 AS と対話する client で REQUIRED | RFC 9207 の iss を全 client に返す | [N][^5]（RS-04#4, #5） |
| 認可コードの寿命 | （規定なし） | 60 秒以下（FAPI の値を全 client に拡張） | ADR-005 D3 |
| 資格情報のエントロピー | （規定なし） | 128 bit 以上（FAPI の値を全 client に拡張） | [N][^2]（RS-04#47）、ADR-005 D2 |

- **D20-11-3** 層 B で PAR は必須にしない [D]。第一者 BFF は ADR-005 D6-2 により層 B でも PAR を使う [D]。第三者の confidential client には PAR を推奨し、層 F の scope を後から要する見込みがある client には登録時から有効にするよう手引きで勧める [D]。

### D20-12 表示と統制台帳への写像

- **D20-12-1** 「FAPI 準拠」「FAPI 相当」などの表示は層 F の認定済み deployment に限り、層 H・層 B では使わない [N][^2][D]（RS-04#48）。
- **D20-12-2** 統制台帳（DL-28）には FAPI 2.0 SP の shall/shall not を行として載せ、適用（層 F）・条件付き（層 H）・非該当（層 B）を写像する（R-026、G-012）[D]。applicability.md X-09 の「条件付き（範囲は ADR-020）」は本書の F1〜F6 を指す [D]。

### D20-13 AS 製品との関係（ADR-001 D12 との接続）

- **D20-13-1** 層 F の AS は ADR-001 D6 の self-host OSS 製品（第一候補 Red Hat build of Keycloak）を第一とし、D20-10 の適合試験に合格することを条件にする [D]。Keycloak は client policy で FAPI 2.0 Security Profile（Final）と Message Signing（Final）を支援すると公式文書に記すが、FAPI 2.0 の認定一覧には載っていない [V][^20][N][^10]（RS-15#6, #11）。
- **D20-13-2** 不合格の場合の扱いは §2.15 の論点 P-1 とする [D]。

### 2.14 決裁案（経営・事業・リスク受容の判断が要る点）

| # | 論点 | 選択肢 | 推奨 | 帰結 | 決める人 |
|---|---|---|---|---|---|
| K20-1 | FAPI 必須範囲 | (a) F1〜F6（案B）／(b) F5・F6 だけ（案C）／(c) 全 confidential client（案A） | (a) | (a) は 1 万テナントの管理 API と q3×800 の外部 client が層 F になる。(b) は管理 API と第三者連携が RFC 9700 の基準だけで残る | CTO＋CISO。プロダクト責任者の同意。期限 G2（NA20-01 の後） |
| K20-2 | F3 の DPoP 構成 | (a) mTLS のみ／(b) end-to-end mTLS を張れない相手に DPoP 構成を許す | ADR-005 K-3 の結論に従う。K-3 が (a) なら (a) | (b) は A5 攻撃者に対する耐性の低下を受容する（N-h） | プロダクト責任者＋CISO。期限 ADR-005 K-3 と同時 |
| K20-3 | public client からの F1・F2 | (a) 不可（BFF・サーバー型へ誘導）／(b) 層 H の期限付き例外 | (a)。NA20-04 で需要が大きい操作に限り (b) | (b) は FAPI 準拠と称せない経路が残る | CISO（受容票）。期限 G2 |
| K20-4 | OIDF 認定の取得 | (a) 層 F の全 deployment で取得／(b) 自前の試験ログだけ | (a)。外部表示の前提 | 料金は deployment あたり 5,000 ドル（非会員）[N][^16] | CISO。期限 G5（本番前） |
| K20-5 | 内部 JWT の RS256 逸脱（層 F の経路） | (a) ES256 固定＋受容票／(b) RS256 を有効にして FAPI の alg 制限を内部経路に適用しない | (a) | (a) は RFC 9068 §2.1 の MUST からの逸脱が残る。(b) は層 F の経路に FAPI 外の alg が入る | CISO。ADR-005 K-4 と同時（期限 G3） |

### 2.15 主要 ADR との論点

主要 ADR は本書から編集しない [D]。

| # | 論点 | 対立・不足している記述 | 選択肢と帰結 | 決める場 |
|---|---|---|---|---|
| P-1 | ADR-001 D12-2 の切替単位と本書の範囲の不一致 | ADR-001 D12-2 は、Keycloak が FAPI の適合試験に不合格なら「FAPI 範囲のテナント（基準 50）の issuer に限り」node-oidc-provider 系の AS を置くとする。本書の層 F はテナントではなく操作×client で決まり、F1〜F3 は全テナントに及ぶ。AS 製品は issuer 単位でしか分けられないため、F1〜F3 を別製品で受け持つには別 issuer が要り、issuer の新設は ADR-021 の不可逆事項（信頼区画）に当たる | (a) 不合格の期間は F1〜F4 を層 H に下げ（FAPI 準拠と称さない）、F5・F6 のうち専用 issuer（ADR-021 D21-05）を持つテナントだけ node-oidc-provider 系で層 F にする。(b) 層 F 専用の信頼区画 issuer を新設し、F1〜F6 の client をそこへ登録する（外部 client の issuer 設定が 2 系統になる）。推奨は (a)。(b) を採る場合は DEC-3 で ADR-021 の区画を追加する [D]。この論点の形は issuer の粒度（未決 U-01、reconciliation-notes §5）に依存する。U-01 が (a) テナント／realm 別になると、issuer はテナントごとに存在するので「F5・F6 のテナントの issuer だけ別製品」は issuer の新設を伴わずに行えるが、F1〜F3 は全テナントに及ぶため、別製品で受け持つには全テナントの issuer の移し替えになる。U-01 が (b) 信頼区画別なら上記のとおりである [D]（レビューで追記）。ADR-001 D12-2 の「D2 の写像により endpoint の形式を変えない」は外部から見た形式の維持であり、1 つの issuer の中で操作×client ごとに AS 製品を振り分けることを示していない [D] | CTO＋CISO。ADR-001 の T-02（足切り不合格）発生時。(b) は DEC-3（U-01 と同時） |
| P-2 | ADR-005 D5 の「FAPI 範囲は mTLS のみ」と F3 の DPoP 構成 | ADR-005 D5 は privileged・FAPI 範囲を呼ぶサーバー型を mTLS のみとし、K-3 は第三者の既定を DPoP＋nonce に変える場合も「privileged・FAPI だけ mTLS」とする。本書は F3（privileged でない外部連携の write 以上）を FAPI 必須範囲に入れたため、K-3 が (b) になると F3 の相手が mTLS を張れず層 F に入れない | 本書は「ADR-005 の FAPI 範囲 mTLS のみ」を F1・F2・F4・F5・F6 に読み、F3 は K20-2 で K-3 に連動させる提案をする。ADR-005 の文言はそのままでは F3 を含むので、ADR-005 の改版時に範囲の読み方を揃える必要がある [D] | ADR-005 K-3 と同時（プロダクト責任者＋CISO） |
| P-3 | ADR-005 K-4 の選択肢と層 F | ADR-005 K-4 は内部 RS256 を「ES256 のみで受容票／RS256 も有効」の 2 択とし、層の区別を持たない | 本書は層 F の経路では「RS256 も有効」を選べないとする（D20-08-2）。K-4 の決裁票に層 F の制約を併記する必要がある [D] | CISO（K-4 と同時、期限 G3） |
| P-4 | ADR-005 K-1（BFF 経路の形式）と層 F（レビューで追加） | ADR-005 K-1 (b)（案C）は BFF 経路を内部 JWT にする。案C の定義は「第三者・ネイティブ・高リスクは opaque」だが、第一者 BFF が層 F の scope で受け取る token の扱いを明示していない。本書 D20-08-1 は層 F の外部 access token を opaque と前提している | (a) K-1 (b) でも BFF の層 F の scope は opaque に残す（本書の推奨。D20-08-1 の前提が保たれる）。(b) BFF の層 F 経路にも JWT を出し、FAPI の alg 制限と RFC 9068 §2.1 からの逸脱の記録を BFF 経路に広げる。K-1 の決裁票に本書の条件を併記する必要がある [D] | CTO＋CISO（K-1 と同時、期限 G4） |

ADR-007・ADR-010・ADR-011・ADR-013・ADR-021・ADR-022 の決定とは矛盾しない [D]。ADR-013 の規制スコープ cell（D13-02）と F5 は独立した軸であり、F5 の判定は cell ではなくテナントの規制プロファイルと操作で行う [D]。

---

## 3. 検討した選択肢

### 3.1 主論点: FAPI 必須範囲

| 項目 | 案A 全 confidential client に FAPI | 案B（採用）操作×client×規制・契約（F1〜F6） | 案C 規制・契約テナントだけ（F5・F6） | 案D FAPI を採らず RFC 9700＋自社高保証 profile |
|---|---|---|---|---|
| 概要 | 全 OAuth API の confidential client を層 F にし、public client は BFF に寄せる | §2 のとおり | A-081 と規制プロファイルのテナントだけ層 F | FAPI 由来の統制を自社 profile として採り、FAPI 準拠を名乗らない |
| 利点 | 規則が 1 系統で、client 種別ごとの判定が要らない [D] | 1 回の不正で影響が大きい操作（管理・権限付与・大量取得・第三者連携の書込み）を、外部が検証できる profile で守る [D]。public client を範囲外とする FAPI の構造と整合する [N][^2] | 対象 client が少なく費用が最小 [D][A-081] | 適合試験・認定の費用と製品の足切りがない [D] |
| 欠点 | ネイティブ・CLI（public）を範囲外とする FAPI の構造と衝突し、第一者アプリの BFF 化か利用制限が要る [N][^2][D]。800 client 全体に PAR と mTLS を課す [D][A-013] | 判定（操作の登録と scope の分離）を維持する手間 [D]。層 H が残る [D] | 1 万テナントの管理 API と第三者連携が層 B のまま残り、旧提案の「管理系・高リスク API」（CL-0272）を外部検証できる形で覆わない [D] | 第三者が検証できる基準がなく、レビューの「FAPI 2.0 を基準 profile として比較すべき」（L125）[^1] に答えない [D]。自社 profile の形式解析がない [N][^2]（RS-04#48） |
| 主要リスク | 連携の参入障壁による連携の減少と、例外の常態化 [D] | 判定漏れ（未登録の操作が層 B で運用される）[D] | 管理 API への token replay と consent phishing の経路が残る（T-007、T-014）[D] | 自社 profile の誤り（形式解析のない独自の組合せ）[D] |
| 費用・要員の桁 | 外部 client 800〜2,500 の改修（A-013）、第一者ネイティブの BFF 化。プラットフォーム側は案B＋手引き・審査の増分 TBD [D] | 適合試験 0.5〜1 FTE（NA20-03）、認定料 5,000 ドル×deployment 数（deployment の単位は未定義。法域パーティション 3〔ADR-013 D13-02〕を単位とみなすと 1.5 万ドル、試算 cell 数 9〔ADR-013 N13-1〕を単位とみなすと 4.5 万ドルの桁）[N][^16][D][A-063]、外部 client の改修 q3×800 件（NA20-01）[D] | 案B より適合試験の対象 client が少ないが、AS 側の試験と認定の費用は同じ桁 [D] | 適合試験・認定の費用はないが、自社 profile の第三者評価（pentest）の範囲が増える。桁は TBD [D] |
| 可逆性 | 狭めるのは可逆、広げた後の外部 client の改修は戻らない [D] | 可逆（非対称）[D] | 広げるときに外部 client の改修が要る [D] | FAPI へ寄せるときに全層の再試験が要る [D] |
| 勝つ条件 | 外部 client の大半が FAPI 対応済みの金融系で、public client がない事業構成 [D] | 管理 API と第三者連携が 1 万テナントに広がる基準シナリオ（A-007, A-013）[D] | 第三者連携がほぼなく（A-013 が低値）、管理 API を BFF 経由の第一者だけが呼ぶ場合 [D] | A-081 が 0 で、規制・契約が FAPI を求めず、AS 製品がすべて FAPI の適合試験に不合格の場合 [D] |

### 3.2 副論点: sender constraint

| 項目 | S1（採用）mTLS のみ（F3 は K-3 連動） | S2 DPoP のみ | S3 client ごとに DPoP・mTLS を選択 |
|---|---|---|---|
| 概要 | 層 F は証明書束縛 | 層 F は DPoP＋nonce | FAPI が許す両方を client が選ぶ |
| 利点 | A5 攻撃者による proof の再送・改変要求への再利用を受けない [N][^2]（RS-04#49）。ADR-005 D5 と一致 | TLS 終端の構成に依存せず、CDN の背後の相手も参加できる [N][^7]（RS-04#54） | 参入障壁が最小 [D] |
| 欠点 | TLS 終端点の sanitize が前提（N-k、N-l）。証明書の更新で token が無効になる [N][^8] | A5 への耐性が下がる [N][^2]。jti の再送検査に cell 内の共有状態が要る [N][^7]（RS-04#56） | 試験の組合せが倍になり、privileged の境界で弱い方を選ばれ得る [D]（ADR-005 §3.3 の S3 の棄却理由と同じ） |
| 主要リスク | mTLS 証明書ヘッダの注入（T-016）[D] | ATK-06 による proof の再利用 [D] | 弱い構成への誘導 [D] |
| 費用・要員の桁 | client 証明書の登録・更新の運用（件数は q3×800＋BFF 数）。TBD [D] | DPoP の jti ストア（ADR-005 で約 101 万件の見積り）[D] | 両方の合計 [D] |
| 可逆性 | DPoP 構成の追加は可逆 [D] | mTLS への移行は外部 client の改修 [D] | 片方の廃止は外部 client の改修 [D] |
| 勝つ条件 | 基準シナリオ | NA-03 が極めて低く、mTLS をほぼ張れない場合 [D] | 層 F に privileged がない場合 [D] |

### 3.3 副論点: client 認証

| 項目 | C1（採用）private_key_jwt 既定＋mTLS 許容 | C2 mTLS のみ | C3 private_key_jwt のみ |
|---|---|---|---|
| 利点 | 鍵と証明書を別々に更新できる [D]。認定の試験構成に両方ある [N][^10] | 証明書 1 枚で client 認証と束縛を兼ねる [D] | 規則が 1 系統 [D] |
| 欠点 | 試験構成が 2 つ [D] | 証明書の更新で client 認証も止まり得る [N][^8][D] | PSD2 の適格証明書による識別（N-o）を client 認証で直接行えず、sender constraint 用の client 証明書と登録情報の照合で別に行う手順が要る [D]（レビューで、欠点を「使えない」から実際の追加手順に改めた） |
| 勝つ条件 | 基準シナリオ | client の大半が証明書運用に慣れた金融系 [D] | NA20-05 が「無」で、証明書運用を最小にしたい場合 [D] |

### 3.4 副論点: RFC 9068 の RS256

| 案 | 内容 | 評価 |
|---|---|---|
| R1（採用） | 外部 opaque、内部 ES256 固定＋逸脱の記録 | 衝突を内部に閉じ、外部契約に alg を出さない [D]。逸脱が残る（受容票）[D] |
| R2 | 外部に RFC 9068 JWT を出し、FAPI の issuer だけ PS256/ES256 に限る（RS-04 §2-7 の案） | ADR-005 D1-1（外部 opaque）と矛盾する。外部 RS が RS256 を処理できず RFC 9068 §2.1 から外部契約で逸脱する [N][^6][D] |
| R3 | 層 F でも RS256 を許す | FAPI §5.4 の shall に反し、FAPI 準拠と称せない [N][^2] |

---

## 4. 評価

### 4.1 評価軸

| 軸 | 内容 | 重み |
|---|---|---|
| E1 攻撃者耐性 | ATK-01・ATK-02・ATK-05・ATK-06・ATK-15 に対し、FAPI の A1〜A5 の範囲で統制が働くか | 高 |
| E2 検証可能性 | 第三者が同じ方法（適合試験）で再現できるか | 高 |
| E3 連携開発者の負担 | 外部 client（A-013）と第一者 client の改修量 | 中 |
| E4 運用・要員 | A-054 の内数に収まるか | 中 |
| E5 製品依存と退出 | 特定製品の認定に依存しないか（ADR-001、ADR-018） | 中 |
| E6 20 年の進化 | FAPI の改版・暗号移行・規制の変化に範囲の変更で追随できるか | 中 |

### 4.2 比較表（範囲の案）

| 軸 | 案A | 案B | 案C | 案D |
|---|---|---|---|---|
| E1 | ◎（ただし public client を排除した場合） | ○ 影響の大きい操作を覆う | △ 管理 API と第三者連携が残る | ○ 統制は同等にできるが形式解析がない |
| E2 | ◎ | ○ 層 F は適合試験、層 H・B は負例試験 | ○ 対象は狭い | × 適合試験がない |
| E3 | × | △ q3×800 件 | ◎ | ○ |
| E4 | △ | ○ NA20-03 | ○ | △ 自社 profile の維持 |
| E5 | △ 製品の FAPI 適合に全面依存 | ○ 不合格時は層 H に下げられる（P-1） | ○ | ◎ |
| E6 | △ 範囲が全体なので改版の影響も全体 | ○ 範囲を操作単位で動かせる | ○ | △ |

- 記号は本書の設計推論による定性比較であり、測定値ではない [D]。採点者は起草者 1 名であり、判定者パネルによる採点は行っていない [D]。

---

## 5. 決定理由と棄却理由

- **案B を推す理由**: 1 万テナントの管理 API（F1・F2）と第三者連携の書込み（F3）は、1 回の token 窃取・不正同意で多数の利用者に被害が及ぶ範囲であり、旧提案の「管理系・高リスク API」（CL-0272）と承認条件 5（R-270）が求める「高価値 API」に当たる [D]。FAPI 2.0 は金融以外の高価値・機微データの API にも使えるよう設計され [N][^2]、OIDF が適合試験を提供している [N][^21]（RS-04#52）ので、第三者が同じ方法で検証できる [D]。一方で public client を範囲外とする FAPI の構造に合わせて範囲を client 種別で切ることで、第一者のネイティブ・CLI と低リスクの読取りを層 B に残し、連携の参入障壁を必要な範囲に限る [N][^2][D]。

| 棄却 ID | 棄却した案 | 理由 | 再採用の条件 |
|---|---|---|---|
| RH-020-A | 案A 全 confidential client | public client を排除するか例外を常態化させることになり、FAPI の構造と衝突する [N][^2][D]。外部 client 800〜2,500 の改修 [D][A-013] | 外部 client の大半が金融系で FAPI 対応済み、public client がない事業構成になった場合 |
| RH-020-C | 案C 規制・契約テナントだけ | 管理 API と第三者連携の書込みが外部検証できる profile の外に残り、R-270 の「高価値 API」を覆わない [D] | NA20-01 の q3 が極めて低く、管理 API を第一者 BFF だけが呼ぶ場合 |
| RH-020-D | 案D FAPI を採らない | 第三者が再現できる適合試験がなく、自社 profile は形式解析を経ない [N][^2][D] | A-081 が 0 で、規制・契約が FAPI を求めず、AS 製品がすべて不合格の場合 |
| RH-020-S2 | DPoP のみ | A5 攻撃者による proof の再送と改変要求への再利用 [N][^2]（RS-04#49） | Message Signing にリソース要求の署名が入り Final になった場合（FAPI HTTP Signatures は draft）[N][^25] |
| RH-020-S3 | client ごとに選択 | 試験の組合せと弱い構成への誘導 [D] | 層 F から privileged が外れた場合 |
| RH-020-C2 | mTLS のみの client 認証 | 証明書更新時の停止の連鎖 [D] | — |
| RH-020-R2 | 外部 RFC 9068 JWT | ADR-005 D1-1 と矛盾 [D] | ADR-005 K-1 が (b) になると第一者 BFF の経路は内部 JWT になるが、第三者・ネイティブ・高リスクは opaque のままである（ADR-005 D1-7）。第三者・外部 M2M への再採用の条件はない。BFF の層 F 経路の扱いは P-4 による [D]（レビューで修正） |
| RH-020-R3 | 層 F で RS256 | FAPI §5.4 の shall に反する [N][^2] | — |

---

## 6. 帰結

### 6.1 良い帰結

- 層 F の範囲は、OIDF の適合試験と認定という第三者が再現できる証拠（E7）で示せる [D]。
- 層 F の token は証明書に束縛され、連携事業者から盗まれた token（T-069）や HAR 等から漏れた token（ATK-05）を単独では使えない [D]。
- 認可要求は PAR で client 認証後に受け付けるので、認可要求の改ざん・注入（T-006）の入口が狭まる [N][^9][D]（RS-04#53）。
- RS256 の衝突は内部の 1 か所（SDK の固定設定）に閉じ、外部契約に alg が出ない [D]。

### 6.2 悪い帰結

- 層 F の外部 client は、PAR、private_key_jwt、client 証明書、rotation のない refresh token に対応する必要がある [D]。件数は q3×800（NA20-01）である [D]。
- 顧客管理者の CLI による privileged/T の経路が制限される（NA20-04）[D]。
- 判定（操作の登録、scope の分離、introspection 応答の profile 照合）の維持が増える [D]。
- 内部 JWT の RS256 逸脱を記録・維持する作業が残る [D]。
- DPoP 構成を本番で使わない場合（K20-2 が (a)）も、AS の適合試験は 4 構成で回す（D20-10-1）ので、試験の実行と保守の対象が増える [D]。
- AS が適合試験に不合格の期間は、F1〜F4 が層 H に下がり、外部に FAPI 準拠と表示できない（P-1 の (a)）[D]。

### 6.3 残余リスクと受容者案

| リスク | 攻撃者・脅威 | 残る理由 | 統制・証拠 | 受容者案 |
|---|---|---|---|---|
| 正規の権限内の濫用 | ATK-02、ATK-15(b)、T-079 | FAPI は正規参加者の濫用を扱わない [N][^3] | 量の上限と検知（DL-52）、grant の棚卸し（ADR-005 D7） | 事業責任者（段1）[D] |
| AS 上の RCE・DB 漏えい | ATK-08、ATK-11、ATK-17、ATK-18 | FAPI AM の範囲外 [N][^3]（RS-04#50） | ADR-001 RR-01、ADR-007、第三者 pentest | CISO [D] |
| F3 の DPoP 構成（K20-2 が (b) の場合） | ATK-06、T-014 | A5 による proof の再送 [N][^2] | nonce 必須、jti 再送検査、短命 token | CISO（受容票、期限付き）[D] |
| 層 H の public client | ATK-14（infostealer 由来資格情報の利用者。端末常駐の能力を持つ） | 端末侵害は FAPI の範囲外 [N][^3]。DPoP は XSS 下で安全性を保証しない [N][^7]（RS-04#54） | ハードウェア保護鍵、step-up、最大寿命 | CISO（受容票、期限付き）[D] |
| mTLS 証明書ヘッダの偽装 | T-016 | TLS 終端構成の誤り | sanitize の負例試験（TC-20-05） | CTO [D] |
| リソース要求の否認防止 | — | Final の標準がない [N][^4] | 業務層の署名と監査 | 事業責任者（F5 の該当業務）[D] |
| 内部 JWT の RS256 逸脱 | — | RFC 9068 §2.1 の MUST と FAPI の shall の両立不能 | 準拠表と受容票 | CISO [D] |

### 6.4 依存サービス・連携開発者への影響

- 依存サービス（約 300、A-050）は、自サービスの操作の「FAPI 必須」属性を分類登録で申告する [D]。内部 RS の検証は共通 SDK・sidecar が行い、利用側のコード変更は層 F の経路で RS256 を有効にできなくなる点に限られる [D]。
- 第三者・顧客自作の client は、層 F の scope を要する場合、FAPI client profile での登録（jwks_uri、client 証明書、PAR、id_token の alg）と OIDF の試験の自己実行が要る [D]。プラットフォームは sandbox（ADR-022）と参照 SDK、手引き（DL-62・DL-64）で支援する [D]。
- 層 F の範囲を広げる変更は、ADR-016・DL-70 の非推奨・移行期間の規律に従って告知する [D]。

### 6.5 運用・要員への影響

- 適合試験の CI 化と年次確認は 0.5〜1 FTE の桁と仮置きする（NA20-03、A-054 の内数）[D]。
- client 証明書の登録・更新・失効と、TLS 終端点の設定レビューが運用に加わる [D]。
- 認定料は deployment あたり 5,000 ドル（非会員）である [N][^16]。会員になるかは調達（DL-30）で判断する [D]。

---

## 7. 検証

### 7.1 PoC の仮説と TC 案（TC-ID は 12_poc で採番する）

| TC 案 | 仮説・試験 | 合否基準 | 紐付け |
|---|---|---|---|
| TC-20-01 | 層 F を受け持つ AS の採用版が、FAPI 2.0 SP Final の private key＋MTLS と MTLS＋MTLS の構成、および Message Signing のうち層 F で使う要素（introspection 応答の署名、JAR、JARM）で全試験に合格する。alg を ES256・PS256 に絞った設定で不合格にならない | 全試験合格（規則であり推定値ではない）。ログを E7 で保存 | G-089、ADR-001 TC-01-06 |
| TC-20-02 | DPoP 構成（private key＋DPoP、MTLS＋DPoP）で全試験に合格する（K20-2 の結論によらず AS の採否判定で必須。ADR-001 D12-1） | 全試験合格 | G-089、ADR-001 TC-01-06、K20-2 |
| TC-20-03 | 層 F の負例が全件拒否される。PAR なしの認可要求、client 認証のない PAR、request_uri の再使用・期限切れ、認可コードの再使用・60 秒超、PKCE なし・plain、iss の不一致、RS256・EdDSA・none の client assertion、aud が配列の client assertion、client_secret による認証、query の token | 拒否率 100% | G-088、T-006 |
| TC-20-04 | 証明書束縛の負例が全件拒否される。Bearer としての提示、別の証明書での提示、証明書更新後の旧 token、FAPI profile 以外で発行された token の F1〜F6 への提示、public client による F1〜F6 の scope 要求 | 拒否率 100% | G-088、T-014、D20-03 |
| TC-20-05 | TLS 終端点で、外部から注入した client 証明書ヘッダが sanitize され、アプリに届かない | 注入の成功 0 件 | T-016、RFC 9700 §4.13 |
| TC-20-06 | refresh token が rotation されず、client 認証のない refresh 要求が拒否される | 全件 | N-e |
| TC-20-07 | 層 F の要求の追加遅延（mTLS handshake、introspection、stateful jti 照合）が数値契約の範囲に収まる | TBD（BIA と A-090 の可用性帯・DL-20 の遅延予算に紐付ける。所有者 CTO、期限 G4） | ADR-005 H-02 |
| TC-20-08 | 代表的な第三者 client（参照 SDK）で、層 F への登録から本番相当の呼出しまでの所要時間と問合せ件数を測る | TBD（所有者 プロダクト責任者、期限 G2）。NA20-01 と組み合わせて連携開発者の負担を決める | K20-1、E3 |
| TC-20-09 | 内部 RS の SDK で、層 F の経路では設定を変えても RS256 の検証を有効にできない | 有効化の成功 0 件 | D20-08-2 |

### 7.2 第三者評価で確かめること

- 採用版の OIDF 適合試験ログの独立確認と、層 F の deployment での OIDF 認定の取得（K20-4、G-089）[D]。
- 第三者 pentest（DL-59）で、層 F の判定漏れ（未登録の操作、scope の分離の誤り）と、層 H・層 B から層 F の操作に到達する経路の有無を確かめる [D]。
- 統制台帳（DL-28）の FAPI 行の写像が、層ごとの適用・非適用と一致するかを作成者以外が確かめる（G-012）[D]。

---

## 8. 再検討トリガーと見直し時期

| # | 種別 | 条件 | 見直す内容 |
|---|---|---|---|
| TR-01 | 実測 | NA20-01（q3）・NA20-04 の G1 棚卸しの結果 | K20-1、K20-3 |
| TR-02 | 実測 | ADR-005 NA-03（end-to-end mTLS を張れる第三者の比率）の結果と K-3 の決裁 | K20-2、D20-05 |
| TR-03 | 製品 | 採用版の AS が TC-20-01 に不合格（ADR-001 T-02） | P-1 |
| TR-04 | 前提 | A-081 が 200 を超える、または 0 になる。A-080 が規制強化シナリオ（規制業種 65%）に近づく | F5・F6 の範囲、K20-1 |
| TR-05 | 規制 | 対象法域の規制・監督指針が API 保護 profile として FAPI を名指しする。EU の PSR・PSD3 が採択される（RS-13#40 では未採択）。NA20-05 が「有」になる | F5、D20-05-4 |
| TR-06 | 標準 | FAPI 2.0 Security Profile・Attacker Model の改版、FAPI HTTP Signatures の Final 化、新しい BCP 195 の公表（12 か月以内の追随）、OIDF 適合試験の構成の変更 | D20-05、D20-07、D20-10 |
| TR-07 | 暗号 | NIST IR 8547 の final 化、FAPI が PQ 署名の alg を許す改版、RFC 9068 の改版（errata 8802 の処理を含む） | D20-08 |
| TR-08 | 事故 | 層 F・層 H の経路での token 濫用、または FAPI 準拠の他社実装での重大な事故の一次報告 | 範囲と方式の全体 |

- 定期の見直しは、G2（範囲の確定）、G3（RS256 逸脱の受容と K-4）、本番前（認定）、以後は年次と再決裁周期（3〜5 年、A-101）とする [D]。

---

## 9. 依存関係

| 種別 | 対象 | 関係 |
|---|---|---|
| ADR | ADR-001（build/buy） | D12（FAPI 範囲の AS と適合試験）、P-1 |
| ADR | ADR-002（IAL/AAL/FAL） | F1・F2 の step-up と認証強度（本書は token・client 側だけを決める） |
| ADR | ADR-004（B2B federation） | mix-up（RFC 9207）の RP 側 |
| ADR | ADR-005（token profile） | D1（opaque・introspection）、D4（refresh）、D5（sender constraint）、D8（RFC 9700 準拠表・RS256）、K-3・K-4、P-2・P-3 |
| ADR | ADR-006（失効・継続評価） | 層 F の失効状態確認 |
| ADR | ADR-007（鍵階層） | D7-61（外部 RS256/ES256 の並行公開）、client 証明書の CA |
| ADR | ADR-013（cell） | 規制スコープ cell と F5 は独立の軸 |
| ADR | ADR-014（監査） | 否認防止を業務層の署名と監査で補う |
| ADR | ADR-016（版・非推奨） | 範囲の拡大時の告知、BCP 195 の追随 |
| ADR | ADR-021（不可逆識別子） | issuer と専用 issuer（D21-05）、`authorization_details` の予約、P-1 の (b) |
| ADR | ADR-022（連携契約） | D-6-5（RP 適合試験の自己実行を FAPI 範囲で必須）、sandbox |
| ADR | ADR-029（特権・support） | privileged/P の経路を本書の対象外にする |
| 設計文書 | DL-16 token-profile.md | 準拠表に層 F・層 B の列、RFC 9068 §2.1 と FAPI §5.4 の並記 |
| 設計文書 | DL-60 oidf-conformance-plan.md | D20-10 の試験構成・時機・ログ |
| 設計文書 | DL-20 数値契約 | request_uri の運用値、遅延予算 |
| 設計文書 | DL-34 applicability.md | F5 の規制プロファイル判定、NA20-05 |
| 設計文書 | DL-67・DL-15 | 操作の「FAPI 必須」属性の登録と PEP の coverage 検査 |
| 設計文書 | DL-62・DL-64 | 連携開発者向けの手引き（証明書更新の手順、層 F への登録）と P-02（ネイティブ・CLI）の連携パターン |
| 設計文書 | DL-69・DL-75・DL-115 | `authorization_details` の type 定義の版付き公開（DL-69）、introspection 応答の欄名（DL-75・DL-115） |
| 設計文書 | DL-28 統制台帳 | FAPI 行の写像 |
| 契約 | 連携事業者との利用規約・連携契約 | 層 F の登録条件（証明書、PAR、試験の自己実行）、証明書更新の手順 |
| 契約 | OIDF の認定（DL-30） | 認定料と会員の要否 |
| 契約 | 金融・医療の顧客契約 | F5・F6 の対象 API と表示の範囲 |

---

## 対応表（R/G）

抽出方法: traceability/R-requirements.md と traceability/G-goal-criteria.md を `ADR-020|fapi2-applicability|FAPI|DL-12` で Grep し、対応成果物欄に本書のファイル名を含む行（R-096・R-160・R-270・G-087）と、DL-12 の全 ADR を対象とする G-020、および内容上関係する行を選んだ [D]。独立レビューで `PAR|mTLS|DPoP|sender|conformance|適合試験|RS256|consent|device` の語でも Grep し、R-239・R-173・R-273・G-034 を追加した [D]。

| ID | 内容（要約） | 閉じ方 | 本書の対応箇所 | 残課題 |
|---|---|---|---|---|
| R-096 | ADR: FAPI 2.0 必須 API 範囲 | A | D20-01〜D20-04 | 決裁前（K20-1） |
| R-160 | 高価値 API への FAPI 2.0 採否 | B | D20-02、§2.14 K20-1 | CTO＋CISO の決裁（G2）。DL-16 側の記載 |
| R-270 | 承認条件 5（Security BCP 準拠 profile と FAPI 採否） | B | D20-11（BCP）、D20-02（FAPI 採否） | ADR-005・DL-16 と合わせた決裁 |
| G-087 | RFC 9700 準拠表、opaque/JWT 境界、FAPI 採否の決定記録 | B | D20-08、D20-11、§2.14 | 準拠表の作成は DL-16。決定記録は決裁後 |
| G-020 | ADR の必須節（文脈・選択肢・却下理由・決定・帰結・可逆性・再検討トリガー・証拠） | A | §1〜§9、冒頭の可逆性 | 自動検査（DL-111）での確認 |
| R-240 | FAPI 2.0 を高価値 API の比較基準 profile とする（攻撃者モデル・PAR・mTLS/DPoP・非対称 client 認証・適合試験） | A | §1.2、§1.6、D20-05〜D20-07、D20-10 | 対応成果物は DL-16・DL-51。本書は採否側を担う |
| R-064 | OAuth/OIDC/FAPI 適合試験 | D | D20-10、TC-20-01・TC-20-02 | 実行と認定は未達（DL-60、第三者） |
| G-089 | conformance suite の実行・合格・認定 | D | D20-10、K20-4 | 未達（実行は本番前） |
| R-158 | RFC 9700 を明示準拠基準化 | C | D20-11 | 準拠表は DL-16・ADR-005。負例試験は C |
| R-159 | Security BCP 準拠 profile の文書化 | A | D20-11 | 本体は DL-16 |
| R-161・R-162 | JWT 厳格検証・種別間の相互排他 | C | D20-08（層 F の alg allowlist） | 規則の正本は ADR-005 V1〜V14。実測は G-088 |
| G-088 | 負例（audience 混同、redirect 差異、mix-up、盗まれた refresh token、DPoP replay）の拒否 | C | TC-20-03・TC-20-04 | 未達（PoC） |
| R-163 | DPoP の限界と併用策 | C | D20-05、§3.2、§6.3 | 本体は ADR-005・DL-16 |
| R-046 | FAL2 の assertion injection 対策（RP 起点、期待 IdP・audience 厳格検証） | D | D20-07（iss、PAR）、D20-10-5 | 本体は ADR-004・DL-16・DL-60 |
| R-026 | FAPI 2.0 等への明示マッピング | A | D20-12-2 | 統制台帳（DL-28）での写像は未作成 |
| G-012 | 統制枠組みの単一台帳への写像 | A | D20-12-2 | 同上 |
| R-166・G-077 | 攻撃者類型と FAPI Attacker Model の対応 | A | §1.6（attacker-model §5 を引用） | 正本は DL-51 |
| R-239 | OAuth/OIDC の RFC 9700・RFC 9068・RFC 8725・RFC 9449 を準拠基準として適用（レビューで追加） | A | D20-08、D20-11、§3.4 | 本体は DL-16・ADR-005。本書は層 F・層 B の境界と RFC 9068 §2.1 の衝突だけを担う |
| R-173 | PoC: token 誤用（audience 混同、redirect 差異、mix-up、stolen refresh token、DPoP replay）（レビューで追加） | C | TC-20-03・TC-20-04・TC-20-06 | 未達（PoC。正本は DL-22） |
| R-273・G-034 | 承認条件 8: conformance を含む独立評価の Critical/High が閉じている（レビューで追加） | D | D20-10、§7.2 | 未達（DL-60・DL-30・DL-59。第三者評価が要る） |

---

## 参考文献

[^1]: 本リポジトリ『20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md』. （参照箇所: L53, L125, L167, L243、確認日: 2026-10-15）
[^2]: OpenID Foundation FAPI WG (D. Fett, D. Tonge, J. Heenan)『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: Introduction, §5.2, §5.3.2.1, §5.3.2.2, §5.3.3, §5.3.4, §5.4, §6.2, §6.3、確認日: 2026-10-03。RS-04#41〜#49）
[^3]: OpenID Foundation FAPI WG (D. Fett)『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5, §6, §7, §8.2, §8.4、確認日: 2026-10-03。RS-04#50）
[^4]: OpenID Foundation FAPI WG (D. Tonge, D. Fett, J. Heenan)『FAPI 2.0 Message Signing』Final, 2025-09-25. https://openid.net/specs/fapi-message-signing-2_0-final.html （参照箇所: Introduction, §5、確認日: 2026-10-03。RS-04#51）
[^5]: IETF (T. Lodderstedt, J. Bradley, A. Labunets, D. Fett)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.1, §2.1.1, §2.1.2, §2.2.1, §2.2.2, §2.3, §2.4, §2.5, §2.6, §4.3.2, §4.4.2, §4.13、確認日: 2026-10-03。RS-04#1〜#39）
[^6]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §6、確認日: 2026-10-03。RS-04#60, #61）
[^7]: IETF (D. Fett ほか)『RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)』2023-09. https://www.rfc-editor.org/rfc/rfc9449 （参照箇所: §11.1〜§11.4、確認日: 2026-10-03。RS-04#54, #56）
[^8]: IETF (B. Campbell, J. Bradley, N. Sakimura, T. Lodderstedt)『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3, §6.3, §6.5、確認日: 2026-10-03。RS-04#59）
[^9]: IETF (T. Lodderstedt, B. Campbell, N. Sakimura, D. Tonge, F. Skokan)『RFC 9126: OAuth 2.0 Pushed Authorization Requests』2021-09. https://www.rfc-editor.org/rfc/rfc9126 （参照箇所: §1, §2.2, §4, §7.3、確認日: 2026-10-03。RS-04#53）
[^10]: OpenID Foundation『Certified FAPI 2.0 OP Security Profile Final & Message Signing Final』公開一覧（随時更新）. https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/ （参照箇所: 列見出し 7 列、node oidc-provider >= 9.2.0 行、他社行の有無、確認日: 2026-10-03。RS-15#4〜#6）
[^11]: OpenID Foundation『FAPI Working Group Specifications』（仕様一覧ページ）. https://openid.net/wg/fapi/specifications/ （参照箇所: Drafts 区分の FAPI 2.0 Http Signatures、確認日: 2026-10-03。RS-04#40）
[^12]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §15.1、確認日: 2026-10-03。ADR-007 [^18]、RS-11#54）
[^13]: OpenID Foundation『Conformance Testing for FAPI 2 and FAPI1 Advanced-Final OPs』認証プログラムのページ（ページ上に日付表示なし）. https://openid.net/certification/certification-fapi_op_testing/ （参照箇所: Supported FAPI specifications（FAPI 2.0 Security Profile Final と Message Signing Implementers Draft 1 を列挙）、client 認証の種別、FAPI 2 の注記（HTTP Message Signatures 非対応）、利用条件の記述（"the system is open for anyone to use"、ログインは試験データ保護のため）、確認日: 2026-10-15。research ノート外。独立レビューで同日に再取得して照合）
[^14]: OpenID Foundation『conformance-suite』GitLab プロジェクト. https://gitlab.com/openid/conformance-suite （参照箇所: プロジェクト表示のライセンス（MIT License）、Production deployment の記載、確認日: 2026-10-15）
[^15]: OpenID Foundation『conformance-suite README.md』GitLab. https://gitlab.com/openid/conformance-suite/-/raw/master/README.md （参照箇所: ローカル実行の手順への案内（wiki の Developers/Build-&-Run）、確認日: 2026-10-15）
[^16]: OpenID Foundation『Self-Certification Fees』web ページ（版表記なし）. https://openid.net/certification/fees/ （参照箇所: FAPI 1 & FAPI 2 の会員・非会員料金、deployment ごとの支払い、複数プロファイルの扱い、確認日: 2026-10-03。RS-15#2）
[^17]: 欧州委員会『Commission Delegated Regulation (EU) 2018/389 supplementing Directive (EU) 2015/2366 with regard to regulatory technical standards for strong customer authentication and common and secure open standards of communication』OJ L 69, 2018-03-13. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 （参照箇所: Art. 30(1)・(2), Art. 34(1)〜(3), Art. 35(1)、確認日: 2026-10-15。版・状態は research/standards-status.md SS-G28）
[^18]: 金融庁『金融分野におけるサイバーセキュリティに関するガイドライン』2024-10-04. https://www.fsa.go.jp/news/r6/sonota/20241004/18.pdf （参照箇所: 2.3.1、確認日: 2026-10-03。RS-02#33, #34）
[^19]: 厚生労働省大臣官房医薬産業振興・医療情報審議官『「医療情報システムの安全管理に関するガイドライン第7.0版」の策定について』産情発0629第1号、2026-06-29. https://www.mhlw.go.jp/content/10808000/001716656.pdf （参照箇所: 記（主な改定点）、確認日: 2026-10-03。RS-02#37）
[^20]: Keycloak『Securing applications and services with OpenID Connect』（26.8.0 版の文書）. https://www.keycloak.org/securing-apps/oidc-layers （参照箇所: Financial-grade API (FAPI) Support、確認日: 2026-10-03。RS-15#11）
[^21]: OpenID Foundation『FAPI 2.0 Security Profile and FAPI 2.0 Message Signing: Final Conformance Tests and Certifications Now Available』2025-07-09. https://openid.net/fapi2-0-final-conformance-tests-available/ （参照箇所: 本文、確認日: 2026-10-03。RS-04#52）
[^22]: Microsoft Learn『Protect against consent phishing』ms.date 2023-12-11. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/protect-against-consent-phishing （参照箇所: What is consent phishing?, Mitigating consent phishing attacks、確認日: 2026-10-03。RS-13#61）
[^23]: IETF『RFC 10027: Best Current Practice for Security of Cross-Device Flows』BCP 247, 2026-08. https://www.rfc-editor.org/rfc/rfc10027 （参照箇所: §2, §6.2.1.5、確認日: 2026-10-03。RS-13#57）
[^24]: IETF (T. Lodderstedt, J. Richer, B. Campbell)『RFC 9396: OAuth 2.0 Rich Authorization Requests』2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §2, §5, §9, §12、確認日: 2026-10-03。RS-04#64）
[^25]: OpenID Foundation FAPI WG (D. Tonge, D. Fett, J. Heenan)『FAPI 2.0 Http Signatures (Draft)』working copy, Published 2026-06-26. https://openid.bitbucket.io/fapi/fapi-2_0-http-signatures.html （参照箇所: 題名と Published 表示、確認日: 2026-10-03。RS-04#40）

---

## レビュー記録

> レビュー者: 作成者とは別の AI エージェント（Claude）。実施日 2026-10-15。自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。

### R.1 観点と方法

- (1) 主要 ADR（ADR-001・005・007・010・011・013・021・022）と reconciliation-notes.md との整合、(2) 脚注の主張と原典の一致（規範の強度、版・状態）、(3) R/G の網羅、(4) 選択肢が藁人形でないか、(5) 根拠のない数値・禁止表現・主張タグ、を確かめた [D]。
- research にない原典のうち、Delegated Regulation (EU) 2018/389 第 30 条・第 34 条・第 35 条 [^17]、OIDF の FAPI OP 試験ページ [^13]、conformance suite の GitLab プロジェクトと README [^14][^15] を 2026-10-15 に再取得して照合した [D]。FAPI 2.0 SP・AM・Message Signing・RFC 群は RS-04（独立検証済み）の記述と照合した [D]。

### R.2 修正一覧（16 件）

| # | 観点 | 箇所 | 指摘 | 処置 |
|---|---|---|---|---|
| RV-01 | (1) | D20-10-1、TC-20-01・TC-20-02、§6.2 | ADR-001 D12-1・TC-01-06 と ADR-005 §7.2 は FAPI 範囲の AS に mTLS 構成と DPoP 構成の両方の適合試験を課すが、起草版は DPoP 構成を「有効化前に追加」としていた。Message Signing も introspection 応答だけに絞っており、D20-07-2 で F6 に有効化し得る JAR・JARM が試験対象から漏れていた | 4 構成を常に試験し、Message Signing は層 F で使う要素（introspection 応答、JAR、JARM）を対象にした。悪い帰結に試験負担を追記 |
| RV-02 | (1) | D20-08-1、RH-020-R2、§2.15 P-4（新設） | ADR-005 K-1 (b)（案C）では第一者 BFF の経路が内部 JWT になる。起草版は「K-1 が (b) になっても外部は opaque のまま」と書き、BFF（層 F の対象）の扱いが抜けていた | K-1 (b) でも BFF の層 F の scope は opaque に残すことを条件とし、満たせない場合の扱いを書いた。決裁票への併記を P-4 とした |
| RV-03 | (1)(2) | D20-08-2 | ADR-005 D8-3 は RS256 の扱いを「RFC 9068 §2.1 の MUST を満たすかは解釈に依存する」としているが、起草版は断定的に「逸脱」としていた | ADR-005 の表現に合わせ「逸脱（または逸脱の可能性）」として記録する形に改めた |
| RV-04 | (1) | §2.15 P-1 | P-1 は信頼区画 issuer（ADR-021）を前提にしており、未決 U-01（issuer の粒度）への依存が書かれていなかった。ADR-001 D12-2 の「D2 の写像」の読み方も未記載 | U-01 の両結論での形と、D2 の写像が issuer 内の製品振り分けを示さないことを追記した |
| RV-05 | (2) | D20-05 表 | FAPI §6.3 は mTLS を「検討する」緩和策の 1 つに挙げるだけだが、起草版は「FAPI 自身が mTLS で緩和できると述べる」と強めていた | 原文の強度（緩和策の 1 つとして検討）に改めた。N-h にも他の緩和策を併記 |
| RV-06 | (2) | D20-06-4 | x5u・jku は FAPI では should not だが、強度を示さず [N] を付けていた | 強度を明記し、「辿らない」を自社判断として書き分けた |
| RV-07 | (2) | D20-07 表 TLS 行 | 新しい BCP 195 への 12 か月以内の追随は NOTE 2 の「期待」であり shall ではない | 強度を書き分けた |
| RV-08 | (2)(5) | D20-07 表 RS 行 | 失効状態の検証手段を FAPI は定めていないのに、毎要求照合を [N] だけで書いていた | 毎要求照合を [D] として分けた |
| RV-09 | (2) | D20-04a | 根拠に挙げた「RS-13 §3.5」は OWASP の節で、規制の節は §3.3 である。また RS-02・RS-13 は FAPI の有無を網羅検索した調査ではない | 参照節を直し、「記載がないことの確認にとどまる」と限定した |
| RV-10 | (2) | D20-10-2、[^13] | OIDF の試験ページを再取得したところ、Message Signing を Implementers Draft 1 としてだけ挙げていた。認定一覧は Final の列を持つ | 食い違いを明記し、Final の試験計画の有無を DL-60 で確かめる TBD（所有者 CISO、期限 G4）を置いた |
| RV-11 | (1) | D20-02、D20-05-2、§6.4、§9 | DL-46 は停止権限・凍結規程であり特権経路の文書ではない。DL-69 は契約一覧・規約であり連携開発者向けの手引きではない（deliverables.md） | 特権経路は ADR-029 だけを参照し、手引きは DL-62・DL-64 に改めた。DL-69 は type 定義の公開先として残した |
| RV-12 | (5) | §3.1 案B の費用 | 認定料の deployment 数を法域パーティション 3 だけで置いていた。deployment の単位は未定義で、ADR-013 の試算 cell 数は 9 | 1.5 万〜4.5 万ドルの幅で示し、単位が未定義であることを明記した |
| RV-13 | (4) | §3.3 C3 の欠点 | 「適格証明書による識別を client 認証に使えない」は C3 を不当に弱く見せていた（識別は sender constraint 用の証明書でも行える） | 実際に増える手順として書き直した |
| RV-14 | (2) | D20-09-1 | FAPI 2.0 NOTE 5 の RAR 推奨（RS-04#64）が根拠に使われていなかった | 規範の根拠として追記した |
| RV-15 | (1) | §6.3 の ATK-14、§3.2 の S3 参照 | ATK-14 の名称が attacker-model と異なっていた（正しくは infostealer 由来資格情報の利用者）。「RH-005 S3」は ADR-005 に存在しない ID（S3 は §3.3 の表） | 名称と参照先を直した |
| RV-16 | (3) | 冒頭の対応要求、対応表 | R-239（RFC 群の準拠基準化）、R-173（token 誤用の PoC）、R-273・G-034（承認条件 8、conformance を含む独立評価）が対応表から漏れていた | 追記し、抽出方法に追加の Grep 語を記した |

### R.3 確認して修正不要とした点

- 決定 ID の参照先（ADR-005 D1-1・D1-2・D1-4・D1-6・D2・D3・D4・D5・D6-2・D6-3・D7-1・D7-2・D8-1〜D8-4・D10-4・K-3・K-4・V3、ADR-001 D6・D12・T-02・TC-01-06、ADR-007 D7-61、ADR-013 D13-02、ADR-021 D21-05、ADR-022 D-6-5）は実在し、内容も一致した [D]。
- operation-risk-tiers の privileged (a)〜(c)・/T・/P・J10・J11・+XT・+REG・+FIN・+AGT、principal-catalog の PC-08・PC-13・PC-15・PC-16・PC-19、attacker-model §5 の FAPI 攻撃者対応、threat-catalog の T-ID は本文の用法と一致した [D]。
- Delegated Regulation (EU) 2018/389 第 34 条第 1 項（適格電子シール証明書またはウェブサイト認証用適格証明書への依拠、shall）と第 35 条第 1 項（通信セッション全体での安全な暗号化）は原文と一致した [N][^17]。conformance suite の MIT License 表示と Production deployment の記載も一致した [V][^14]。
- 前提 A-ID の値（A-007、A-013、A-040、A-054、A-063、A-072、A-080、A-081、A-101）は前提台帳と一致した [D]。禁止表現は見つからなかった [D]。
- 案A〜案D、S1〜S3、R1〜R3 は、それぞれに勝つ条件が具体的に書かれており、藁人形とは判断しなかった（C3 の欠点だけ RV-13 で直した）[D]。

### R.4 未解決事項

| # | 内容 | 扱い |
|---|---|---|
| RU-01 | P-4（ADR-005 K-1 と層 F の BFF 経路）は主要 ADR 側の決裁票に併記が要る。本書からは ADR-005 を編集していない | ADR-005 K-1 の決裁時（CTO＋CISO、G4）。reconciliation-notes への追記も要る |
| RU-02 | P-2（ADR-005 D5 の「FAPI 範囲は mTLS のみ」と F3 の DPoP 構成）は起草版から未決のまま | ADR-005 K-3 と同時 |
| RU-03 | OIDF 試験ページが Message Signing を Implementers Draft 1 としてだけ挙げる点（RV-10）。Final の試験計画を conformance suite 上で未確認 | DL-60（所有者 CISO、期限 G4） |
| RU-04 | 新規仮定 NA20-01〜NA20-05 は前提台帳に未登録 | 前提台帳の所有者へ申し送る |
| RU-05 | 起草者・レビュー者が取得した research 外の原典（[^13]〜[^15]、[^17]）の照合ログを traceability/ に追記していない | 照合ログの所有者へ申し送る（本レビューは指示外のファイルを編集していない） |
| RU-06 | 英国 RTS・英国 Open Banking 標準・米国業界規制で FAPI を求めるものの有無は未確認のまま（D20-04a） | DL-34 の法務判定で確認する |
