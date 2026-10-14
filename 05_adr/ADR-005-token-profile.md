# ADR-005 token profile（opaque/JWT 境界・寿命・sender constraint・claim profile）

> 文書ID: ADR-005 / 版: 0.1 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-03
> 可逆性: 条件付き可逆（非対称）。外部境界の opaque 化は可逆で、opaque から JWT へ寄せても内容を読まない client は壊れない。逆に、外部へ JWT を出してから opaque に戻す変更は、claim を解析する外部実装を壊すため事実上不可逆になる（§3.1 案A）。本書の決定のうち不可逆側に入るのは次の 5 点である。(1) issuer 識別子（ADR-021）、(2) `sub` の形式と非再割当の約束（ADR-021）、(3) 契約に載せる typ 名・claim 名・claim の意味（ADR-022、DL-75）、(4) 外部契約に書く opaque token の最大長（D10-2）、(5) 監査証跡に残す相関 ID の意味（ADR-014）
> DEC-3 対象: いいえ（traceability/deliverables.md の ADR 表で DEC-3 列は「—」）。依存先の ADR-001・ADR-007・ADR-013・ADR-021・ADR-022 は DEC-3 対象である
> 対応要求: R-095, R-158（本書を対応成果物に含む行）／G-087, G-020（同）。関連: R-046, R-087, R-112, R-118, R-143, R-159, R-160, R-161, R-162, R-163, R-173, R-189.1, R-189.2, R-189.4, R-189.5, R-189.6, R-206, R-239, R-240, R-249, R-250, R-251, R-259, R-270, R-283／G-024, G-062, G-068, G-072, G-088, G-089, G-106, G-115, G-138（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md, traceability/dissent-log.md, 01_governance/assumptions-register.md, 01_governance/business-impact-analysis.md, 03_threat-model/attacker-model.md, 02_requirements/operation-risk-tiers-assurance.md, research/RS-03, RS-04, RS-06, RS-09, RS-10, RS-11, RS-12, RS-13, RS-15, RS-16, RS-17（各 verification 記録を含む）, research/standards-status.md
> 作成方法: 3 つの起草レンズ（sec: セキュリティ・保証、ops: 運用性・費用・組織実現性、evo: 20 年の進化・退出）の提案と、判定者 3 名の採点をもとに、AI エージェント（Claude）が最終起草した。集計上の勝者 sec を土台にし、判定者が挙げた取り込み（graft）を反映し、判定者が指摘した事実誤りを原典で確認して修正した（§4.4）。判定者も AI エージェントであり、本書の採点と判定は模擬パネルの自己レビューで、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。research ノートにない原典（IANA JWT Claims registry、RFC 8417 §2.2、RFC 7519 §4・§4.1.7・§4.2・§4.3、OIDC Core §2・§8、W3C VC Data Model 2.0、OpenID Identity Assurance Schema Definition 1.0）は最終起草者が取得して照合した。照合ログの traceability/ への追記は要対応である（本書からは編集していない）。

**要旨（結論）**

- **境界**: OAuth client（第一者の BFF・ネイティブ・CLI、第三者・顧客自作アプリ、外部 M2M）に渡す access token と refresh token はすべて opaque にする [D]。edge は cell 内の状態ストアに RFC 7662 interface で照会し、内部向けにはサービス別 aud の RFC 9068 JWT を token exchange で発行する [D]。内部 JWT は共通 SDK・sidecar が、利用側で無効化できない検証規則 V1〜V14 で検証する [D]。BFF 経路まで opaque にする点は、状態ストアの負荷試験と停止注入（H-02・H-04）に合格することを条件とし、不合格なら BFF 経路だけ JWT（案C）に切り替える [D][A-040, A-044]。
- **寿命と保護**: 寿命は一律値を置かない [D]。token 種別×操作階層ごとに上限 U1〜U5 と下限 Lmin から導き、運用上は寿命 profile を 3 種類以内に丸める [D]。refresh token は client 種別ごとに保護する（confidential は client 認証で束縛し rotation なし、public は DPoP 鍵束縛を必須とし、鍵保護を示せない端末に限り rotation を併用）[D]。sender constraint は経路で選ぶ（内部・BFF・サーバー連携は mTLS、public client は DPoP＋nonce、privileged・FAPI 範囲は mTLS のみ）。ブラウザは BFF を必須にする [D]。
- **利用者相談（trace id と将来 claim）への回答**: trace id は access token の claim にしない [D]。token は寿命の間に多数の要求で再利用されるので要求単位の値を表せず、trace id は外部から注入・偽造できる値だからである [D][N]（RS-10#16, #17）。「共通の認証認可を通った一貫した要求」の証跡は、目的の違う 4 層の ID（token の `jti`、grant・session 参照、要求 context の `txn`、判定の `decision_id`）を監査記録で結合して残し、trace id はその相関の補助キーにとどめる [D]。将来に備えて基盤が定める claim は、所属・役割ではなく「誰が（主体種別を含む）・どの強さで・どの鍵で・誰の代理で・何を・どのテナントで・どの版で」に対応する封筒に限る [D]。W3C VC Data Model 2.0 の概念（status・evidence・termsOfUse・schema・データ最小化）は token の外の仕組みへ割り当て、「検証済み属性の出所」を表す枠だけを版付き profile に予約する [D]（D9）。

---

## 1. 文脈

### 1.1 解くべき問題

旧提案は「access token は基本的に JWT」「寿命は一律 5〜15 分」とした [D]。主張台帳は前者を否定する主張 CL-0013 を「維持」とし、一律寿命 CL-0131・CL-0236 を「要実測」とした [D]。レビューは一律値の撤回を求めた（R-087）[D]。本 ADR は次の 9 問に答える [D]。

| # | 問い | 主な R/G | 本書の節 |
|---|---|---|---|
| Q1 | 外部境界と内部境界で opaque と RFC 9068 JWT のどちらを使うか | R-095, G-087 | D1 |
| Q2 | token 種別ごとの typ 分離と、相互排他を含む検証規則 | R-161, R-162, G-088 | D2 |
| Q3 | 一律値を使わず、操作階層と A-ID から寿命を決める方法 | R-087, R-189.1, R-189.2, R-189.4, R-189.6, G-024 | D3 |
| Q4 | refresh token を rotation と sender constraint のどちらで保護するか | R-158, R-259 | D4 |
| Q5 | DPoP と mTLS の使い分け | R-163, R-239 | D5 |
| Q6 | ブラウザで BFF を必須にするか | R-163 | D6 |
| Q7 | 第三者 grant の寿命・棚卸しと、RFC 9700 準拠方針 | R-158, R-159, G-062, G-087 | D7, D8 |
| Q8（利用者相談） | 要求の一貫性の証跡として trace id 的な claim を付けるか。W3C の claim 群を踏まえ、基盤として将来に備えて定める claim は何か | R-118, R-249, R-250, R-283 | D9 |
| Q9 | 20 年の識別子永続性・暗号移行・AS 製品置換に token profile がどう備えるか | R-046, G-068, A-103, A-104 | D10, D11 |

### 1.2 制約（規範。強度は原文どおり）

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-a | public client は PKCE を使う。confidential は RECOMMENDED | MUST / RECOMMENDED | RFC 9700 §2.1.1 [N][^1]（RS-04#8, #9） |
| N-b | public client の refresh token は sender-constrained にするか rotation を使う | MUST | RFC 9700 §2.2.2 [N][^1]（RS-04#15） |
| N-c | access token は sender-constrained かつ audience-restricted にすべきである。RS は自分宛てでない token を拒否する | SHOULD / MUST | RFC 9700 §2.2.1, §2.3 [N][^1]（RS-04#14, #17） |
| N-d | JWT access token は typ を宣言し、RS は typ・iss・aud・署名・exp を検証する。AS・RS は RS256 を対応 alg に含める。resource ごとに異なる aud を使う | MUST | RFC 9068 §2.1, §4, §5 [N][^7]（RS-04#60, #61） |
| N-e | alg を allowlist で扱う。1 鍵 1 alg。鍵と issuer の結合を検証する。同じ issuer の複数種別の JWT は検証規則を互いに排他にする | MUST | RFC 8725 §3.1, §3.8, §3.12 [N][^8]（RS-04#62、RS-11#51） |
| N-f | FAPI 範囲では次を守る。RS は失効状態を検証する（shall）。query の token を受け付けない（shall not）。AS は confidential client だけを支援し、例外を除き rotation を使わない（shall not）。alg は PS256・ES256・EdDSA（Ed25519）に限る（shall） | shall / shall not | FAPI 2.0 SP §5.3.2.1, §5.3.4, §5.4 [N][^2]（RS-04#41, #45〜#47） |
| N-g | BFF は業務・機微・個人データのアプリに "strongly recommended"。ブラウザ内 OAuth client は同じ対象に "not recommended"。いずれも小文字表記で BCP 14 キーワードではない | 推奨 / 非推奨 | RFC 10017 §6.1.4.3, §6.3.4.3 [N][^13]（RS-04#73、RS-17#4） |
| N-h | DPoP は XSS 下で安全性を保証しない。攻撃者は新しいフローで自分の鍵に束縛した token を得られる | 記述 | RFC 9449 §11.4 [N][^5]、RFC 10017 §6.3.4.2.2 [N][^13]（RS-04#54, #75） |
| N-i | client は access token の内容を調べてはならない。漏えい対策として opaque への切替えを挙げる | MUST NOT | RFC 9068 §6 [N][^7]（RS-04#61） |
| N-j | JWT access token の auth_time・acr・amr は OPTIONAL で、同じ認可応答から派生する全 token で固定される | OPTIONAL | RFC 9068 §2.2.1 [N][^7] |
| N-k | traceparent・tracestate に個人識別情報や機微情報を入れてはならない。目的は trace の相関だけである | MUST NOT | W3C Trace Context §6 [N][^23]（RS-10#16） |
| N-l | Txn-Token は replay に耐性がなく、短命にしなければならない。認証資格情報としても OAuth access token としても使ってはならない | MUST / MUST NOT（draft） | draft-ietf-oauth-transaction-tokens-11 §13.1, §13.12, §13.13 [N][^21]（RS-06#36） |
| N-m | 再認証の上限: AAL2 は全体の上限を設けなければならず（SHALL）、その値は 24h 以内にすべきである（SHOULD）。無操作は 1h 以内（SHOULD）。AAL3 は全体 12h 以内（SHALL）、無操作 15 分以内（SHOULD）。適用する上限は文書化しなければならない（SHALL） | SHALL / SHOULD | SP 800-63B-4 §2.2.3, §2.3.3, §5.2 [N][^22]（RS-03#43） |
| N-n | 理解できない claim は無視しなければならない。新しい claim 名は IANA 登録か衝突耐性のある Public Name にすべきである（should）。Private Name は衝突し得るので注意して使うべきである | MUST / should | RFC 7519 §4, §4.2, §4.3 [N][^29]（§4 は RS-16#14） |

- FAPI 範囲では、RFC 9068 の RS256 MUST と FAPI の alg 制限を同時には満たせない（RS-04 §2-7）[D]。

### 1.3 前提（A-ID）

| A-ID | 値（基準） | 本 ADR での使い方 |
|---|---|---|
| A-005 | 同時アクティブ session 11.1 万 | refresh/秒、exchange/秒の分子 |
| A-006 | 有効 session 86.5 万（成長 251.6 万） | refresh token ストアと BFF session の件数 |
| A-007 | テナント 1 万 | grant 棚卸し |
| A-013 | 外部 client 800・grant 3 万（成長 2,500・12 万。範囲 client 300〜3,000） | 第三者 grant の棚卸しと一括失効の規模、外部 opaque の便益 |
| A-015 | 複数テナント所属 3% | 1 token 1 テナント |
| A-027 | access token 寿命 10 分（容量計算用の仮置き） | 感度表の基準点にのみ使い、決定値には使わない |
| A-028 | 下流 audience 6 | exchange の発行量 |
| A-030 | opaque 比率 30%・cache miss 50% | 案C の照会量 |
| A-040 | edge API ピーク 16,804/秒（成長 56,444、規制 20,057） | 状態ストアの照会量、要求 context の発行量 |
| A-042〜A-044 | refresh 185/秒、発行 1,374/秒（うち exchange 1,112）、introspection 2,521/秒（範囲 0〜8,402） | 案の比較 |
| A-050〜A-054 | 300 サービス、25 組織・60 チーム、1,500 人、プラットフォーム 24 FTE（うち SRE 6、SDK・開発者支援 4） | 統合点と要員 |
| A-063 | リージョン 4 | cell 内部品の配備数 |
| A-080・A-081 | 規制業種 25%（規制強化 65%）、高保証要求テナント 50 | FAPI 範囲と再検討トリガー |
| A-090・A-091 | 判定系 99.95〜99.99%、認証系 99.9〜99.95%（いずれも可用性帯の仮置きで、停止許容時間ではない） | 状態ストア・STS の可用性要件 |
| A-100〜A-104 | 20 年、再決裁周期、暗号移行・製品置換各 1 回以上 | 進化・退出 |
| A-110 | 独自セッション 105 サービス | BFF 移行対象 |

**新規仮定（前提台帳へ追加要）**

前提台帳は本書から編集しない [D]。

| 仮 ID | 内容 | 扱い |
|---|---|---|
| NA-01 | DPoP proof の受理窓 W | 上限計算にだけ 60 秒を使う。値は H-05 で決める（RFC 9449 は秒〜分の受理を MUST とする [N][^5]、RS-04#56） |
| NA-02 | edge 要求のうち write・privileged・break-glass/B・FAPI 範囲が占める比率 p_w | TBD（所有者 CTO、G1 の As-Is 実測）。要求 context の発行量を決める |
| NA-03 | 第三者サーバー型 client のうち end-to-end mTLS を張れる比率 | TBD（所有者 プロダクト責任者、G1） |
| NA-04 | ネイティブ端末のうち、ハードウェア保護鍵（非エクスポート）を示せる比率 | TBD（G1）。refresh rotation の併用範囲を決める |
| NA-05 | 内部 hop ごとの状態照会の倍率 k（privileged の stateful jti 照合を含む） | TBD（H-02 で実測） |
| NA-06 | AS 製品を置換するとき、既存 grant と refresh token を新製品へ移せない可能性 | ADR-001 の製品評価と TC（H-22）で判定 |
| NA-07 | 計画期間中に、利用者が提示する検証可能な属性（W3C VC、SD-JWT 系）を認可判断の入力として受け入れる要件が生じ得る | 要件化の有無は ADR-002・ADR-004 で判断。本書は枠の予約だけを行う |
| NA-08 | 本 ADR の実装に伴う要員の増分 | 状態ストア・edge 照会系は「SRE 6 FTE の内数で＋1〜2 FTE の桁」と仮置きする（根拠は cell 数 4×常時稼働部品 1 系統で弱い）[D][A-054, A-063]。BFF 参照実装・SDK・grant 棚卸しの増分は TBD。H-18 で A-054 と比べる |

### 1.4 関連 R/G

本書を対応成果物に含む行は R-095・R-158・G-087・G-020 である（R-requirements.md・G-goal-criteria.md の対応成果物欄を Grep で確認）[D]。関連する R/G と閉じ方は末尾の対応表に示す [D]。

### 1.5 関連研究

| 研究 | 使う項目 |
|---|---|
| RS-03 | #43（再認証上限）、#58（sub の一意性と非再割当） |
| RS-04 | #1〜#39（RFC 9700 採否表）、#40〜#52（FAPI 2.0）、#53〜#59（PAR・DPoP・mTLS）、#60〜#65（RFC 9068・8725・8725bis・RAR・RFC 8707）、#66（RFC 8693）、#67〜#70（introspection・失効）、#72（RFC 9470）、#73〜#75（RFC 10017）、#76〜#80（OAuth 2.1・SSF・TSL） |
| RS-06 | #31、#35、#36、#41、#42（Transaction Tokens） |
| RS-09 | #14、#15、#36（fallback、bimodal、短命資格情報の時限爆弾） |
| RS-10 | #16〜#19（Trace Context・Baggage）、§5.2（decision_id と trace_id の分離） |
| RS-11 | #8（IR 8547 ipd）、#41（RFC 9964）、#43（RFC 9864）、#51（1 鍵 1 alg）、#62・#63（PQ サイズ）、結論 7・8（alg 切替と識別子） |
| RS-12 | #5、#10、#11（Storm-0558・CSRB）、#37、#41（Salesloft Drift・Cloudflare）、#53（CVE-2025-55241）、#57（鍵削除障害）、#58（Google 2020）、#59（GitHub 2022） |
| RS-13 | #39（PSD2 RTS）、#57（device code）、#61（consent phishing） |
| RS-15 | 結論 6（従量課金の桁） |
| RS-16 | #14、#16（未知 claim の無視、crit） |
| RS-17 | #2〜#4（BFF）、#62（既存同意）、#79（gateway 迂回と署名付きヘッダ） |

### 1.6 攻撃者モデル

- FAPI 2.0 Attacker Model は A1・A1a・A2・A3a・A5 を定義し、侵害された端末・ブラウザ、AS 上の RCE、誤設定 DB からの資格情報漏えい、JWKS 配布障害を範囲外とする [N][^3]（RS-04#50）。
- 本 ADR は FAPI の範囲外も扱い、03_threat-model/attacker-model.md の類型のうち token に直接関わる ATK-02（悪意あるテナント管理者）、ATK-05（盗まれた token）、ATK-06（侵害された microservice）、ATK-08（クラウド管理者）、ATK-11（DB read 権限者）、ATK-12（リージョン障害）、ATK-15（悪意ある・侵害された第三者連携アプリ）、ATK-16（濫用される AI エージェント）、ATK-17（内部不正の開発者）、ATK-19（変更と自動化の誤り）に統制を割り当てる（§6.3）[D]。
- 優先順位は次のとおりである [D]。(1) 偽造・窃取・越境の各 token が、どこかの検査点で必ず拒否されること。(2) その拒否を第三者が負例試験で再現できること。(3) 標準の強度から外れる箇所を受容票で可視化すること。(4) 20 年の暗号移行・製品置換を外部契約に波及させないこと。

---

## 2. 決定

本節はすべて決裁前の提案である [D]。決定 ID は D1〜D13 とする。経営・事業の判断が要る点は §2.14 に決裁案としてまとめる [D]。

### D1 境界（opaque/JWT）と失効の強制点

- **D1-1** OAuth client に発行する access token と refresh token は、client の種類によらず opaque にする [D]。RFC 9068 は client が内容を調べることを MUST NOT とし、漏えい対策に opaque を挙げる [N][^7]（RS-04#61）。外部 client 約 800 にこれを技術的に強制する手段はない [D][A-013]。opaque にすれば、内部の claim・alg・形式の変更（PQ 化を含む）を外部 client の改修なしに行える [D][A-103, A-104]。
- **D1-2** 外部 opaque token は edge（cell ごとの gateway 型 PEP）だけが検証する [D]。edge は cell 内の状態ストアに RFC 7662 で照会し、状態ストアは AS から発行・失効の push を受ける [D]。introspection には認可が必要（MUST）で、cache は応答の exp を超えてはならない（MUST NOT）ので、edge は client 認証し、cache 齢を exp 以下に抑える [N][^9]（RS-04#67）。
- **D1-3** 状態ストアが失敗しても AS 本体へ迂回しない [D]。AWS は分散 fallback が障害を悪化させることが多いと述べている [V][^38]（RS-09#14）。
- **D1-4** edge は検証済みの opaque token を cell 内 STS で RFC 8693 の exchange にかけ、呼出し先 1 サービスを aud とする RFC 9068 JWT（内部 access token）に置き換える [D]。resource の指定には RFC 8707 を使う [N][^15]（RS-04#65）。共通 aud は発行しない（R-251）[D]。
- **D1-5** 外部から内部 RS へ届く経路は edge 経由だけにし、迂回経路はネットワークで遮断する [D]。edge は照会結果を未署名ヘッダで下流へ渡さない [D]。Google Cloud IAP の公式文書は、IAP が迂回されると攻撃者が未署名の ID ヘッダを偽造できるとし、署名付きヘッダの検証を全アプリ種別に求めている [V][^48]（RS-17#79）。
- **D1-6** privileged・break-glass/B・FAPI 範囲の内部 RS は、内部 token の jti を状態ストアと毎要求照合する（stateful）[D]。発行記録にない jti を持つ署名済み token は拒否し、警報を出す [D]。CSRB は、自社の token 生成方式に合わない偽造 token を検知・防止する仕組みがあれば Microsoft 単独で阻止または検知できた可能性が高いと認定した [I][^32]（RS-12#10）。同報告の Recommendation 6 は、そのための仕組みの例に stateful token・束縛 token・テナント単位の鍵スコープを挙げている [I][^32]（RS-12#11）。
- **D1-7（BFF 経路も opaque にする判断と切替条件）** 第一者 BFF の経路も opaque にする [D]。理由は次の 3 つである [D]。
  1. write・privileged の失効状態確認を edge の 1 か所で例外経路なしに満たせる。FAPI 範囲の RS は失効状態の検証が shall である [N][^2]（RS-04#45）。
  2. edge の外部検証規則が opaque の 1 系統になり、負例試験の組合せが減る。
  3. 主流量の BFF 経路の失効品質を、60 チームの BFF 実装と内部 JWT の寿命に依存させない [A-052]。

  代償として状態ストアの照会は基準 8,402/秒（16,804×cache miss 0.5）・成長 28,222/秒（56,444×0.5）になり、案C（2,521/秒）の約 3.3 倍になる [D][A-040, A-044]。内部 hop の倍率 k（NA-05）を掛けた値で H-02・H-04 を判定し、**不合格なら BFF 経路だけ案C（BFF 経路は内部 JWT、第三者・ネイティブ・高リスクは opaque）に切り替える** [D]。この切替は外部契約を変えずに行える（BFF は自社の confidential client である）[D]。

### D2 token 種別・typ・検証規則

**種別表** [D]

| 種別 | 形式・typ | 発行者 | aud | 受け入れ先 |
|---|---|---|---|---|
| 外部 access token | opaque（128 bit 以上のエントロピー、先頭に版・種別・経路識別子） | 外部 AS | 同意した resource | edge のみ |
| refresh token | opaque（保存は hash のみ） | 外部 AS | — | AS token endpoint のみ |
| 認可コード | opaque、一回限り、60 秒以下 | 外部 AS | — | AS のみ |
| 内部 access token | JWT、typ=at+jwt | 内部 issuer（外部 AS とは別の識別子、cell ごと） | 呼出し先 1 サービス | 内部 RS（共通 SDK・sidecar） |
| 要求 context（D9-3） | JWT、typ=txntoken+jwt（draft 準拠の社内 profile） | cell の TTS（edge 併設） | trust domain | 内部 RS（Txn-Token ヘッダのみ。Authorization ヘッダには置かない） |
| ID Token | JWT（OIDC。typ を要求しない） | 外部 AS | RP の client_id | RP のみ。RS では V4・V5 で拒否 |
| introspection 応答（FAPI 範囲） | JWT、typ=token-introspection+jwt | 状態ストア | edge | edge のみ |
| SET | JWT、typ=secevent+jwt | 送信元 | 受信者 | 受信 endpoint のみ |
| DPoP proof | JWT、typ=dpop+jwt | client | —（htm/htu） | AS・edge の DPoP ヘッダのみ |

- typ の根拠: at+jwt は RFC 9068 §2.1 で宣言が MUST、値は SHOULD であり、RS は `at+jwt` と `application/at+jwt` を受け付け、それ以外を拒否する（MUST）[N][^7]（RS-04#60）。token-introspection+jwt は RFC 9701 の MUST [N][^10]（RS-04#68）。secevent+jwt は SSF の MUST [N][^17]（RS-04#77）。dpop+jwt は RFC 9449 §4.3 の MUST [N][^5]（RS-04#55）。txntoken+jwt は draft-11 の MUST [N][^21]（RS-06#31）。
- ID Token は typ を持たないことがあるので、ID Token と access token の判別を nonce の有無には頼らない [D]。外部 AS と内部 issuer の識別子を分け（V4）、内部 RS は typ のない JWT を拒否する（V5）ことで、RS が ID Token を受理しない構造にする [D]。
- 128 bit 以上のエントロピーは FAPI の shall であり、本基盤では全 client に広げる [N][^2]（RS-04#47）[D]。

**検証規則 V1〜V14（共通 SDK・sidecar・edge の既定とし、利用側では無効化できない）** [D]

Storm-0558 では、開発者が「ライブラリが完全に検証する」と誤認し、issuer・scope の検証を追加していなかった [I][^33]（RS-12#5）。このため規則は既定動作にし、利用側の設定で外せないようにする [D]。

| ID | 規則 | 強度と自社判断 |
|---|---|---|
| V1 | issuer×種別ごとの alg allowlist を、検証側の版付き設定から読む。token・issuer metadata からは読まない。内部 access token の初期値は ES256 のみ | allowlist は RFC 8725 §3.1 の MUST [N][^8]（RS-11#51）。metadata を allowlist の出所にしないのは、配布元の誤設定・侵害に alg 判定を依存させないための自社判断 [D] |
| V2 | 1 鍵 1 alg 1 種別 | 1 鍵 1 alg は MUST [N][^8]（RS-11#51）。種別との結合は自社判断 [D] |
| V3 | 鍵は、設定で固定した issuer の jwks_uri だけから取る。jku・x5u は辿らない | 鍵と issuer の結合は RFC 8725 §3.8 の MUST [N][^8]。FAPI は x5u・jku を使うべきでない（should not）とする [N][^2]（RS-04#47） |
| V4 | iss を完全一致で照合する。内部 issuer は外部 AS と別にし、cell ごとに分ける | RFC 9068 §4 の MUST [N][^7]。分離は自社判断 [D] |
| V5 | typ を期待値と照合する。typ のない JWT は全種別で拒否する | at+jwt は MUST [N][^7]。全種別必須は自社判断（RFC 8725 §3.11 は RECOMMENDED [N][^8]）[D] |
| V6 | aud に自サービスが含まれることを確認する。共通 aud は発行しない | RFC 9068 §4・§5 の MUST [N][^7]。RFC 9700 の MUST [N][^1]（RS-04#17） |
| V7 | exp が現在時刻より後であることを検証する。iat・nbf は、未来方向の時刻差を許容値 S 以内なら受理し、それを超える未来の値は拒否する。S の初期値は 10 秒、上限 60 秒とし、値は R-189.2（DL-20）で決める。access token の iat が古いこと自体は拒否理由にしない（有効期間は exp で律する） | exp は MUST [N][^7]。FAPI 2.0 §5.3.2.1 の「iat/nbf が未来 0〜10 秒の JWT は受理し、未来 60 秒を超える JWT は拒否する」（shall）は AS が受け取る JWT（client assertion・request object）への規定であり [N][^2]（RS-04#42）、これを内部 RS の未来方向の許容に準用するのは自社判断 [D] |
| V8 | cnf がある token は提示者との一致を検証する。DPoP 束縛 token を Bearer として提示されたら拒否する | RFC 8705 の MUST [N][^6]、RFC 9449 §7.2 の MUST [N][^5]（RS-04#58, #59） |
| V9 | テナント claim は 1 token に 1 つ。PEP は資源から導いたテナントと突き合わせる | 自社判断 [D][A-015]（R-250, R-283）。CVE-2025-55241 では送信元テナントを検証しないレガシー API で越境が起きたと発見者が開示している [I][^34]（RS-12#53） |
| V10 | token は権限 DB にせず、封筒（D9-4）にとどめる。アクセス制御に使う act は現在の actor だけ | 自社判断 [D]（R-249）。act の扱いは RFC 8693 の MUST [N][^12]（RS-04#66） |
| V11 | query の token を受け付けない。token をログ・トレース・エラー出力に記録しない | FAPI の shall not を全 RS へ拡張する [N][^2][D]。RFC 9700 §4.9.3 の MUST [N][^1]（RS-04#33） |
| V12 | 暗号処理のうち 1 つでも失敗したら全体を拒否する。none は拒否する | RFC 8725・RFC 9068 の MUST [N][^8][^7] |
| V13 | 制約を強める変更は未知 claim の追加で表さない。typ・profile 版の変更か crit で表す | 理解できない claim は無視しなければならない（RFC 7519 §4、MUST）[N][^29]（RS-16#14）。crit の未理解は JWS を無効にする（RFC 7515 §4.1.11）[N][^30]（RS-16#16） |
| V14 | 8725bis-10 の防御的検査のうち厳しくなる側を先行採用する | draft であり規範根拠ではない [N][^20]（RS-04#63）。先行採用は自社判断 [D] |

- **相互排他**: (iss, typ, 鍵集合, aud の形式) の 4 要素を種別ごとに異ならせる [D]。RFC 8725 §3.12 の MUST に対応する [N][^8]（RS-04#62）。
- RFC 9068 §5 は、ID Token と access token の鍵を分けても鍵漏えいへの防御にはならないとする [N][^7]（RS-04#61）。このため鍵分離だけに頼らず、issuer・JWKS・typ を分ける [D]。
- 独自の JWT 検証実装は CI で検出して拒否し、例外は受容票で扱う（G-072）[D]。

### D3 寿命の決め方（一律値を置かない）

寿命 L(k,t) は、token 種別 k と操作階層 t の組ごとに U1〜U5 の最小値とし、下限 Lmin と突き合わせる [D]（R-087、G-024）。

| 記号 | 定義 | 由来 |
|---|---|---|
| U1 規範上限 | 下表 | 各出典 |
| U2 剥奪反映（JWT） | 照会しない token について L＋C(t)＋Δprop ≤ R(t)。C は edge cache の最大齢、Δprop は push の伝播時間、R は剥奪反映 SLO（R-143、DL-20） | RFC 7009 は短命化で失効後の使用時間を制限する設計を挙げる [N][^11]（RS-04#69） |
| U2' 剥奪反映（照会型） | 毎回照会する外部 opaque token は C(t)＋Δprop ≤ R(t)。L は剥奪の速さを決めず、session・grant の性質で決める | [D] |
| U3 被害窓 | 発覚前の悪用可能時間として事業が受容する E(t)（BIA・S-15・DEC-1） | [D]（BIA 待ち） |
| U4 session | refresh token と BFF session の絶対寿命・無操作は、主体の AAL の再認証上限以下。token 更新で session を延長しない | 63B-4 は access token の存在を利用者在席の証拠とみなすことを SHALL NOT とする [N][^22]（RS-03#44） |
| U5 鍵併存 | L_int＋JWKS cache 最大齢＋時刻差 ≤ 旧鍵の併存時間（R-189.4、R-189.6） | [D]。Azure AD 2021-03 の鍵誤削除障害 [I][^41]（RS-12#57） |
| Lmin(a) 容量 | refresh/秒＝S÷L_ext、exchange/秒＝S×6÷L_int、要求 context/秒＝16,804×p_w が、AS・STS・署名 QPS の容量以下 | [D][A-005, A-028, A-040, NA-02] |
| Lmin(b) 停止耐性 | AS・STS が止まってから業務が止まるまでの時間を、BIA の MTPD と比べる（H-15）。A-091 は可用性帯の仮置きであり、停止許容時間として使わない | [D][A-091] |

**規範上限（U1）**

| 対象 | 上限 | 強度 | 出典 |
|---|---|---|---|
| 認可コード | 60 秒以下（全 client に適用） | FAPI shall | [N][^2]（RS-04#42） |
| PAR request_uri | 600 秒未満 | FAPI shall | [N][^2]（RS-04#43） |
| DPoP proof | 秒〜分 | MUST | [N][^5]（RS-04#56） |
| DPoP 束縛 access token（nonce なしの配備） | 長寿命にすべきでない | SHOULD NOT | [N][^5]（RS-04#56） |
| introspection cache | exp を超えない | MUST NOT | [N][^9]（RS-04#67） |
| ブラウザ向け refresh token | 最大寿命か非活動失効を設ける。rotation で延長しない | MUST / MUST NOT | [N][^13]（RS-04#74） |
| 未使用の refresh token | 一定期間で失効 | SHOULD | [N][^1]（RS-04#38） |
| 要求 context（Txn-Token） | 短命 | MUST（draft） | [N][^21]（RS-06#36） |
| 再認証 | N-m のとおり | SHALL / SHOULD | [N][^22]（RS-03#43） |
| PSD2 RTS（支払口座へのアクセス） | 無操作 5 分以下 | 規則 Art. 4(3) | [N][^43]（RS-13#39） |

- **下限が上限を上回っても寿命は延ばさない** [D]。不足は STS・状態ストアの静的安定性と容量で補い、残る差は fail-mode（DL-19）と受容票で扱う [D]。Google SRS は、障害が短命資格情報の寿命を超えると「時限爆弾」になり得ると述べている [V][^39]（RS-09#36）。障害時だけ寿命を延ばす grace は設けない [D]。AWS は平常時と障害時で挙動が変わる bimodal 動作を避けるよう求めている [V][^40]（RS-09#15）。
- **寿命 profile は 3 種類以内** [D]。各 token の寿命は、その aud と scope で到達できる操作のうち最上位の操作階層（high-water mark、REQ-03 J6）で決め、U1〜U5 の導出結果を 3 つの profile のいずれかに丸める（短い側に丸める）[D]。API ごとの個別値は認めない [D][A-052]。60 チームが個別値を管理すると CI 検査と数値契約（DL-20）が運用できなくなるためである [D]。
- テナントは寿命を短くする設定だけができる（G-115）[D]。上限は CI で検査し、違反数を KRI にする（G-072）[D]。
- 値はすべて TBD である（所有者 CTO＋CISO、期限 G4、決め方: BIA の R(t)・E(t) と H-02・H-15 の実測から DL-20 で決裁）[D]。
- 感度（決定値ではない）は次のとおりである [D][A-005, A-028]。

| 寿命 | refresh/秒（S÷L_ext） | exchange/秒（S×6÷L_int） |
|---|---|---|
| 2 分 | 927 | 5,560 |
| 5 分 | 371 | 2,224 |
| 10 分（A-027） | 185 | 1,112 |
| 30 分 | 62 | 371 |

### D4 refresh token の保護

| client 種別 | 束縛 | rotation | 寿命 |
|---|---|---|---|
| BFF（confidential） | 非対称 client 認証（private_key_jwt／mTLS） | 使わない | U4。AS session に連動 |
| 第三者サーバー型（confidential） | 非対称 client 認証。scope と RS に結合 | 使わない | D7 |
| ネイティブ・CLI（public）でハードウェア保護鍵あり | DPoP 鍵（必須） | 使わない | U4、非活動失効 |
| ネイティブ・CLI（public）でハードウェア保護鍵を示せない | DPoP 鍵（必須） | 併用する（再利用を検知したら grant の全 token を失効） | U4、非活動失効、最大寿命 |
| ブラウザ内 client（D6-3 の例外のみ） | DPoP | 使う（rotation で寿命を延ばさない） | 最大寿命 |
| DPoP を実装できない既存ネイティブ | — | 使う | 受容票に期限を記す |
| M2M（client credentials） | 発行しない | — | — |

- 根拠: AS は client ごとのリスク評価で発行可否を決め（MUST）、発行した token を scope・RS に結合する（MUST）[N][^1]（RS-04#35, #36）。confidential の refresh token は client 認証ですでに sender-constrained であり、DPoP 鍵には束縛しない [N][^5]（RS-04#57）。FAPI は例外を除き rotation を禁じ（shall not）、confidential と sender-constrained の組合せでは rotation に利点がないとする [N][^2]（RS-04#46）。public client の refresh token は DPoP proof の鍵に束縛しなければならない（MUST）[N][^5]（RS-04#57）。
- **併用の判断**: RFC 10017 §9.2 は、WebCrypto の非エクスポート鍵が TPM で守られる保証はなく、malware による鍵の持ち出しはセッションハイジャックと同等の経路になると述べる [N][^13]（RS-04#75）。鍵と refresh token を同時に盗まれると sender constraint は効かない（RFC 9700 §4.10.1）[N][^1]（RS-04#59）。そこで、ハードウェア保護を示せない端末に限り rotation を重ね、二重使用を検知できるようにする [D][NA-04]。H-07 の誤失効率が閾値（TBD、所有者 プロダクト責任者＋CISO）を超えたら併用範囲を縮める [D]。
- rotation の再利用検知は製品ごとに意味論が異なり、AS 置換時に引き継ぐ状態になる [D][A-104]。このため rotation は既定にせず、上表の限られた範囲に限る [D]。
- 未使用 refresh token の非活動失効（SHOULD）と、password 変更・logout・CAEP session-revoked での失効を採用する [N][^1][D]。

### D5 sender constraint（DPoP と mTLS）

| 経路 × 操作階層 | 方式 |
|---|---|
| 内部 workload 間、edge から内部 RS | mTLS（workload identity）。内部 token の cnf は x5t#S256（I1）[D] |
| BFF から edge | mTLS [D] |
| 第三者サーバー型・外部 M2M（read・write） | mTLS を既定とする。CDN・WAF で TLS が終端され end-to-end mTLS を張れない相手に限り DPoP＋nonce を許す [D][NA-03] |
| privileged・FAPI 範囲を呼ぶサーバー型 | mTLS のみ [D] |
| ネイティブ・CLI | DPoP。nonce 必須、dpop_jkt でコードを束縛 [D] |
| ブラウザ内 client（D6-3 の例外） | DPoP [D] |

- privileged で mTLS に限る理由: FAPI は、A5 攻撃者が DPoP proof を再送でき、本文に署名がないため改変した要求にも proof を再利用され得るとし、緩和策に mTLS を挙げる [N][^2]（RS-04#49）。Final の Message Signing はリソース要求の署名を含まない [N][^4]（RS-04#51）。
- edge は sender constraint を `cnf` で抽象化し、introspection 応答の `cnf`（`jkt` または `x5t#S256`）と提示者の証明を照合する [N][^5][^6][D]。方式の追加・PQ 化はこの claim に閉じる [D]。
- DPoP の運用: nonce を必須にする。nonce を提供した後は nonce のない proof を受理しない（MUST NOT）[N][^5]（RS-04#56）。jti の再送検査は cell 内の共有ストアで行う。状態を共有しない複数サーバでは単回使用の検査を実現できないことがある [N][^5]（RS-04#56）。jti ストアの上限は 16,804/秒×60 秒で約 101 万件と見積もる [D][A-040, NA-01]。
- mTLS の運用: TLS 終端点では証明書ヘッダの sanitize と proxy・アプリ間の保護を必須にする（RFC 9700 §4.13 の MUST）[N][^1]（RS-04#24）。mTLS を要求する endpoint はホスト名で分ける [N][^6]（RS-04#59）。証明書を更新すると束縛 token は無効になるので、SDK は更新前に token を取り直す [N][^6][D]。
- 内部束縛 I1 の実装費用は H-16 で測る [D][A-050]。費用が過大なら mesh mTLS＋aud＋呼出し元照合（I2）に切り替える [D]。I2 は RFC 9700 §2.2.1 の SHOULD からの逸脱なので受容票（受容者案 CISO）を要する [D]。FAPI 範囲では I1 を維持する [D]。
- AS ごとに別の DPoP 鍵・証明書を使うことを SDK の既定にする（Cuckoo's Token Attack の緩和）[N][^2]（RS-04#49）[D]。

### D6 ブラウザ

- **D6-1** 「公開」以外を扱う第一者ブラウザアプリは BFF を必須にし、token をブラウザに渡さない [D]。RFC 10017 の "strongly recommended" は BCP 14 キーワードではないため、必須化は自社判断である [N][^13][D]（RS-04#73、RS-17#4）。既存の独自セッション 105 サービスは移行期限付きの受容票で扱う [D][A-110]。
- **D6-2** BFF はプラットフォームが参照実装として提供する（cookie 属性・CSRF 対策・AS session との連動を固定したもの）[D][A-052]。各チームによる BFF の自作は例外審査の対象にする [D]。BFF は confidential client として認可コード・PKCE S256・PAR を使う [D]。cookie の Secure・HttpOnly と CSRF 対策は MUST、SameSite=Strict・`__Host-Http-` prefix は SHOULD だが本基盤では必須にする [N][^13][D]（RS-17#2, #3）。CSP を XSS の第二層にする [N][^5]（RS-04#54）。
- **D6-3** 第三者のブラウザ内 public client は、低リスク scope に限り受容票付きで許す [D]。その場合は DPoP・rotation・最大寿命を必須にする [D]。FAPI は public client を範囲外とする [N][^2]（RS-04#41）。
- **D6-4** privileged の前には RFC 9470 の step-up を必須にする [D]。auth_time と acr は refresh で変わらないので、step-up のたびに新しい認可要求を出す [N][^14]（RS-04#72）[D]。
- BFF 方式では token をブラウザに置かないので、PQ 署名で JWT が大きくなっても cookie の 4096 octets 上限とは無関係になる [D]（RS-11#63）。

### D7 第三者連携アプリの grant

- **D7-1** 登録時に、発行者の確認、最小 scope、redirect URI の完全一致（MUST）[N][^1]、非対称 client 認証を審査する [D]。新規登録では client_secret を認めない [D]。
- **D7-2** 利用者本人が同意できるのは、検証済み発行者のアプリの低リスク scope に限る。それ以外はテナント管理者の同意とし、privileged 操作として扱う [D]。Microsoft は悪性アプリを無効化しても既存 access token は期限まで有効と記載している [V][^37]（RS-13#61）。opaque と状態照会の組合せなら、cache 上限 C(t) 内で既存 token も拒否できる [D]。
- **D7-3** grant 台帳を正本にする。項目は grant ID、client、発行者（publisher）、テナント、同意者の種別、scope、resource、作成日時、最終使用日時、満了日時とする [D]。
- **D7-4** 非活動失効、grant の絶対寿命（満了後は再同意）、テナント管理者による定期再承認を設ける [D]。値は scope のリスク区分ごとに TBD（所有者 CISO＋事業責任者、G4、DL-20）[D]。
- **D7-5** 棚卸しは同意ポリシーとは独立した自動統制にする [D]。Entra は同意設定を変えても既存の grant は変わらないと明記している [V][^51]（RS-17#62）。同意方針を変えたら既存 grant に再評価をかけ、再承認されなかった grant は自動で失効させる [D][A-013]。
- **D7-6** 一括失効は grant ID・client_id・publisher・テナント・scope の各単位で行えるようにし、完了時間 SLO（R-189.5、TBD）付きの手順にする [D]。結合キーとして、introspection 応答と内部 JWT に grant 参照を入れる（D9-4）[D]。Salesloft Drift では、侵害された token が遅くとも 2025-08-08 から使われ、全 token の失効は 08-20 だった [I][^35]（RS-12#37）。
- **D7-7** device authorization grant は業務 API で既定無効とする [D]。RFC 10027 は機微・高価値の資源では避けるよう述べ、実装前のリスク評価を MUST とする [N][^44]（RS-13#57）。
- **D7-8** sender constraint に未対応の既存連携は期限付き受容票で扱う [D]。GitHub 2022 では、第三者の integrator に発行された OAuth user token が窃取されて使われた [I][^36]（RS-12#59）。

### D8 RFC 9700 準拠方針

- **D8-1** RFC 9700（BCP 240、final）を準拠基準とし、「規範文×適用条件」の準拠表を DL-16 に置く（RS-04 §3.1 の 39 行が素案）[D]。MUST 行から外れる場合は「非準拠」とし、期限付き受容票を必須にする [D]。SHOULD 行から外れる場合は、理由・補完統制・受容票を記す [D]。
- **D8-2** RFC より厳しくする採否は、BCP の要求と書き分ける [D]。

| RS-04# | RFC 9700 | 本基盤 |
|---|---|---|
| #8〜#10 | PKCE: public MUST／confidential RECOMMENDED | 全 client 必須、S256 のみ [D] |
| #13 | implicit: SHOULD NOT | AS で無効化（自社判断）[D] |
| #14 | sender-constrained: SHOULD | 外部は必須。内部 I2 は逸脱として受容票 [D] |
| #17 | audience 制限: SHOULD（拒否は MUST） | サービス別 aud 必須 [D] |
| #18 | ROPC: MUST NOT | 無効化 [D] |
| #20 | 非対称 client 認証: RECOMMENDED | 新規 client で必須 [D] |
| #23 | end-to-end TLS: RECOMMENDED | 部分採用（逸脱）。#24 の MUST と再暗号化で補う [D]（R-259） |
| #30 | 二重償還時の失効: SHOULD | 採用 [D] |
| #4, #5 | 複数 AS と対話する client の RFC 9207 iss 検査 | 採用 [N][^1][D]（R-046 の一部） |

- **D8-3** RS256: 内部 issuer は ES256 で署名する [D]。SDK は RS256 の検証を実装するが、既定では無効にする [D]。RFC 9068 §2.1 の MUST を満たすかは解釈に依存するため、準拠表に記録し受容票を付ける [N][^7][D]。RSA-2048（112-bit 強度）は NIST IR 8547 の初期公開草案（ipd、未確定）で「2030 年より後は Deprecated、2035 年より後は Disallowed」とされている [N][^49]（RS-11#8）。この値は ipd であり、final で変わり得る [D]。
- **D8-4** FAPI 範囲（ADR-020）では FAPI の shall を優先する [D]。部分採用の範囲は「FAPI 準拠」と称さない（shall not の規則）[N][^2]（RS-04#48）。
- **D8-5** 次の draft は規範根拠に使わず、標準ステータス台帳で追跡する [D]。OAuth 2.1 -16（IESG 未提出）[N][^19]、8725bis -10（RFC Editor で Blocked）[N][^20]、Token Status List -21 [N][^18]、Transaction Tokens -11（IESG 未提出）[N][^21]。

### D9 claim profile と要求単位の証跡（利用者相談への回答）

**D9-1 trace id を access token の claim にしない** [D]。理由は次の 4 つである。

| # | 理由 | 根拠 |
|---|---|---|
| 1 | access token は寿命 L の間に多数の要求で再利用される。外部 opaque token も内部 token も要求単位の値を持てない。要求ごとに token を発行し直すと、exchange が 16,804/秒×6 で約 10 万/秒（A-043 の exchange 1,112/秒の約 90 倍）になり、D3 の Lmin(a) を崩す | [D][A-040, A-028, A-043] |
| 2 | trace-id は外部から注入できる。W3C Trace Context は、公開 API で外部の trace を素直に継続すると攻撃者が trace-id の衝突を偽造し監視データを使えなくできると述べる。証跡の鍵に使えば、偽造できる値に証跡の一意性を依存させる | [N][^23]（RS-10#17）[D] |
| 3 | traceparent・tracestate の目的は相関だけであり、個人識別情報・機微情報を入れてはならない（MUST NOT）。署名付きの主体情報と trace-id を同じ token に入れると、観測基盤の側で trace-id から主体を引ける対応表が生まれる | [N][^23]（RS-10#16）[D] |
| 4 | W3C Baggage は利用者を識別できるデータが入り得ることへの注意を求めている。認可の文脈を baggage で運ぶ設計は採らない | [N][^24]（RS-10#19）[D] |

**D9-2 「共通の認証認可を通った一貫した要求」の証跡は、目的の異なる 4 層の ID を監査記録で結合して残す** [D]。

| 層 | ID | 生成者・単位 | 運び方 | 何を証明するか |
|---|---|---|---|---|
| L1 token | `jti` | AS・STS。JWT 1 件ごと（外部 opaque token は AS の発行記録 ID） | 内部 JWT 内、introspection 応答 | その JWT がどの発行記録から来たか。D1-6 の偽造検知と失効連動のキー。jti は JWT 自体の一意識別子であり（RFC 7519 §4.1.7、一意性は MUST）、grant や session の識別子ではない [N][^29][^7] |
| L2 grant・session | grant 参照、session 参照（`sid`） | AS。grant・session ごと | 内部 JWT、introspection 応答 | どの同意・どのログイン session に属するか。一括失効（D7-6）と全 session 失効（R-112）の結合キー [D]。`sid` は IANA 登録済み（OIDC Front-Channel Logout）[N][^28] |
| L3 要求 context | `txn` | edge 併設の TTS。外部要求 1 件ごとに CSPRNG で生成 | 署名付き要求 context（D9-3）を Txn-Token ヘッダで運ぶ | その要求が edge の認証・認可を通過し、どの主体・テナント・内部 token 系譜に属するか。下流は改変できない |
| L4 判定 | `decision_id` | 各 PEP・PDP。判定 1 件ごと | 監査イベント（ADR-014、DL-77） | どの policy 版でどう判定したか。trace_id は相関専用の属性として持つ（RS-10 §5.2） |

- `txn` は RFC 8417 §2.2 が定義・登録した OPTIONAL の一意な取引識別子で、関連する複数の JWT を相関させるために使え、SET 以外の profile の JWT でも使える [N][^25][^28]。Transaction Tokens draft も `txn` を必須 claim として使う [N][^21]（RS-06#31）。
- 監査では (txn, jti, grant 参照, sid, decision_id, trace_id) を 1 行に記録し、trace_id は相関の補助としてだけ使う [D]。8 本の ADR で揃えた監査欄は、これに iss と AuthZEN の X-Request-ID（ADR-011 D5-5）を加えたものとする（05_adr/reconciliation-notes.md §3。整合調整で修正）[D]。edge は外部から届いた traceparent を信頼境界で再採番し、外部の値は別属性に退避する [D]（W3C Trace Context §7.2 の懸念への対策、RS-10#17）。外部の trace 状態で監査の記録・非記録が変わらないことを H-21 で確かめる [D]。
- Txn-Token 全体をログに記録してはならない（MUST NOT）[N][^21]（RS-06#41）。記録するのは txn と hash だけにする [D]。

**D9-3 要求 context の発行範囲** [D]

- write・privileged・break-glass/B・FAPI 範囲の要求では、edge が要求ごとに要求 context を発行し、内部 RS は内部 access token と一緒に検証する [D]。public と read-sensitive は発行を任意にし、L1・L2・L4 で相関する [D]。
- 形式は Transaction Tokens draft-11 に合わせ、版を固定した社内 profile にする（typ: txntoken+jwt、aud: trust domain、必須 claim: txn・sub・scope・req_wl、tctx にテナントと内部 token 系譜の jti を必須にする、rctx の IP 等の要求環境は採らない）[N][^21]（RS-06#31）[D]。draft はテナント claim を定義していないので、tctx にテナントを必須にするのは自社判断である [N][^21]（RS-06#42）[D]。
- Txn-Token は replay に耐性がなく、認証資格情報として使ってはならない（MUST NOT）[N][^21]（RS-06#36）。このため各 hop の呼出し元認証は mTLS（D5）で別に行い、要求 context を単独で信頼しない [D]。
- 発行量は 16,804×p_w/秒である [D][A-040, NA-02]。p_w が 30% なら約 5,000/秒になる（p_w は未測の例示）[D]。全要求に発行する（T4）と基準 16,804/秒・成長 56,444/秒の署名になる [D][A-040]。署名鍵は cell 内の専用鍵（ADR-007）にし、KMS の QPS を超える場合は ADR-007 の鍵階層で cell 内署名にする [D]。
- draft が RFC にならない場合や大きく変わる場合でも、社内 profile の版として凍結し、adapter で差し替える [D]。最終的な採否と委任の表現は ADR-009 と整合させる [D]。
- 要求 context の aud に置く「trust domain」は Txn-Token 草案の意味での trust domain であり、TTS を cell ごとに置くので値は cell ごとの内部値になる（草案は trust domain ごとに論理的に 1 つの TTS を MUST とする [N][^21]（RS-06#38））[D]。この値は内部 issuer と同じく可逆な内部値として扱い、ADR-021 D21-28 の SPIFFE trust domain 名（本番 1・非本番 1）とは別のものとする [D]（整合調整で修正）。
- ADR-022 D-8-3 は `txn` を証跡の主キーとする。本書の発行範囲（write 以上）では public・read-sensitive の要求に `txn` がないため、その範囲の主キーは (jti, decision_id, X-Request-ID) になる [D]。全要求に発行するか（T4、署名 16,804/秒）、主キーの範囲を write 以上に限るかは未決の論点 U2（§2.15）とする [D]（整合調整で修正）。

**D9-4 基盤が定義する claim（内部 access token と introspection 応答）**

所属情報以外に将来に向けて定めておく claim は、「誰が（主体種別）・どの強さで・どの鍵で・誰の代理で・何を・どのテナントで・どの版で・どの grant/session から」に対応するものに限る [D]。属性そのもの（所属部署、役割、資格）は載せない [D]（R-249）。

| 群 | claim | IANA 登録・定義元・強度 | 本基盤 | 将来性（なぜ今決めるか） |
|---|---|---|---|---|
| 識別 | iss, sub, aud, exp, iat, jti, client_id | RFC 9068 §2.2 で REQUIRED [N][^7] | 必須 | iss・sub の永続性は D10-1 |
| 権限 | scope, authorization_details | scope は値が aud の資源で意味を持つこと（MUST）[N][^7]。authorization_details は RFC 9396 で、JWT では audience ごとに絞った値を置くことが RECOMMENDED [N][^16]（RS-04#64）。いずれも登録済み [N][^28] | scope は粗い API 能力だけ。authorization_details は高リスク操作の取引内容（金額・対象）だけ | scope で表せない取引単位の同意（決済・エクスポート）の受け皿 [D] |
| 認証文脈 | acr, amr, auth_time | RFC 9068 §2.2.1 で OPTIONAL、認可応答ごとに固定 [N][^7]。登録済み [N][^28] | 必須（利用者主体の token） | step-up（RFC 9470）と AAL 判定（ADR-002）に使う。後から足すと 300 サービスの判定ロジックを再試験することになる [N][^14][D] |
| 鍵束縛 | cnf | RFC 8705・RFC 9449 [N][^6][^5]。登録済み（RFC 7800）[N][^28] | 束縛時は必須 | sender constraint の方式変更（PQ 化を含む）をこの claim に閉じ込める [D] |
| 委任 | act（may_act は AS 側の判断材料） | RFC 8693。アクセス制御は現在の actor だけ（MUST）[N][^12]。登録済み [N][^28] | 委任時は必須 | AI エージェント・非同期ジョブの委任表現（ADR-009、ADR-017）。「本人の操作」と「代理操作」を監査で区別する [D] |
| テナント文脈 | 作用中テナント（1 値） | 標準 claim なし。`tid`・`tenant`・`org_id` は IANA 未登録 [N][^28]。Txn-Token にもテナント claim はない [N][^21]（RS-06#42） | 必須、1 つだけ（V9）。所属一覧は入れない | 複数所属（A-015 の 3%）では、テナントを切り替えるたびに token を取り直す規則を契約に固定する（R-283）[D] |
| 主体種別 | 人間 / service account / workload / AI エージェント | 標準 claim なし | 必須（社内 claim）。sub は全種別に共通の単一名前空間から払い出し、sub の文字列から種別を推論させない（ADR-021 D21-10、02_requirements/principal-catalog.md §3.2。整合調整で修正） | ATK-16（濫用される AI エージェント）を含む非人間主体の判定と監査を、claim の追加ではなく既定項目として扱う（ADR-017）[D] |
| grant・session 参照 | grant 参照、`sid` | `sid` は登録済み [N][^28]。grant 参照は社内 claim | 必須（利用者主体・第三者 grant） | D7-6 の一括失効と D9-2 L2 の結合キー [D] |
| 版 | profile 版 | 社内 claim | 必須 | V13 の版管理。20 年で形式を変えるときの識別 [D][A-100] |
| 状態参照 | `status`（Token Status List） | draft-21 [N][^18]（RS-04#80） | 採用しない。名前だけ予約し、RFC 化で再評価 | 案E の再評価トリガー（§8）[D] |
| 検証済み属性の出所（枠のみ予約） | 派生値、出所 issuer、trust_framework、検証時刻、有効期間、状態参照 | OpenID Identity Assurance Schema Definition 1.0（2024-10-01。ページの状態表示は Final だが、同じページの Warning 節は「OIDF International Standard ではない」「draft」と述べており、状態の表記が矛盾する。2026-10-15 に整合調整で原典を再確認し、ADR-022 [^54] の指摘と一致した。状態は未確定として扱い、採否の結論には使わない）は `verified_claims` を定義し、`verification` に `trust_framework`（必須）・`time`・`evidence` を置く [N][^27]。`verified_claims` は IANA 登録済み [N][^28]。W3C VC Data Model 2.0（Recommendation、2025-05-15）[N][^26] | 版付き profile に枠だけ予約する（NA-07）。VC 本体と個人属性の原文は複写せず、認可に必要な派生値（例: 年齢要件を満たす）とその出所・検証時刻だけを入れる設計にする | 属性証明を後から受け入れるときに、claim の意味を壊さず追加できるようにする [D] |
| 載せない | groups, roles, entitlements の全量 | RFC 9068 §2.2.3.1。載せる場合は SCIM の属性を使うべき（SHOULD）[N][^7]。登録済み [N][^28] | **載せない** | 権限は PDP で評価する（R-249）。token に載せると剥奪が寿命 L まで遅れ、U2 を悪化させる [D] |
| 載せない | 氏名・メール・電話・所属部署などの識別属性 | RFC 9068 §6 は、JWT の内容は client から見えるため機微 claim の省略や opaque 化を対策に挙げる [N][^7]（RS-04#61） | **載せない**（必要なサービスは主体 API で取得） | email は再割当され得るため識別子に使わない [N][^31]（RS-03#58） |
| 載せない | trace id、要求単位の ID | D9-1 | **載せない**（txn は要求 context にだけ載せる） | — |
| 載せない | 由来する認証イベント ID（ADR-007 D7-45 の発行台帳の項目） | 社内の照合キー | **載せない**。発行台帳だけに置き、token 側は `sid`・grant 参照で台帳と結合する | ADR-007 §9.2 が本書に委ねた判断。PQ 期のサイズ予算（RS-11#63）を消費せず、`sid` で同じ結合ができる [D]（整合調整で追加） |

- **D9-5 社内 claim の命名**: IANA 未登録の社内 claim（テナント文脈、主体種別、grant 参照、profile 版、出所の枠）は、自社が管理するドメインに基づく衝突耐性のある名前（Public Name）にするか、IANA に登録する [D]。RFC 7519 §4.2 は新しい claim 名を登録するか Public Name にすべきとし（should）、Private Name は衝突し得るので注意して使うべきとする [N][^29]。20 年の間に AS 製品や外部標準の claim 名と衝突する危険を避けるためである [D][A-104]。具体名と短縮表記（PQ 化後のサイズ予算との兼ね合い）は ADR-022・DL-75 で決める [D]。
  - 整合調整による限定: 上記の Public Name 化は、外部の RP に渡す ID Token と外部に公開する応答に適用する [D]。typ が版付きの自社 profile である内部 token（内部 access token、要求 context、introspection 応答）に限り、ADR-021 D21-38 規則 3 に従って短い名前（`tid` など）を許す [D]。内部 token では typ と profile 版で意味を固定でき（V13）、受信者は共通 SDK に限られるためである [D]。名前の正本は DL-75（schema）と DL-115（claim 目録）とし、意味は本書、版の運用は ADR-016 が持つ [D]（整合調整で修正）。

**D9-6 W3C VC Data Model 2.0 との関係**

- VC は holder が提示する属性証明のデータモデルであり、OAuth access token の代わりにはならない [D]。形式は採らず、概念ごとに token の外の仕組みへ割り当てる [D]。

| VC DM 2.0 の概念 | 原典の定義 | 本基盤での対応先 | 判断 |
|---|---|---|---|
| credentialStatus（§4.10） | 状態仕様は個人の追跡を可能にしてはならない（MUST NOT）[N][^26] | 状態ストア（D1）と CAEP。Token Status List は RFC 化まで候補（D8-5） | 状態照会の経路が主体の追跡に使われないこと（照会ログの最小化）を H-23 の観点に入れる [D] |
| evidence（§5.6） | 発行根拠を表す。値は 1 つ以上のオブジェクト（MUST）[N][^26] | 身元確認・認証の根拠は IdP 側の記録（ADR-002）に置き、token には acr・amr と出所の枠だけを載せる | 根拠の本体を token に載せない [D] |
| termsOfUse（§5.5） | 1 つ以上の利用条件ポリシーを指定する（MUST）[N][^26] | 取引単位の制約は authorization_details、目的は監査の目的欄（ADR-014） | 「目的」を表す登録済み claim は確認できていないため、v1 では token に私的 claim を発行しない [D]。名前だけの予約（ADR-022 D-9-2、発行はしない）はこの判断と両立する（整合調整で修正） |
| credentialSchema（§4.11） | スキーマの参照 [N][^26] | profile 版 claim と DL-75 のスキーマ | [D] |
| validFrom / validUntil（§4.9） | 有効期間 [N][^26] | iat・nbf・exp | [D] |
| データ最小化（§8.9、非規範） | 検証者は取引に厳密に必要な情報だけを求めるよう促されている [N][^26] | D9-4 の「載せない」行 | 所属・役割を token に載せない判断の補強 [D] |
| 識別子による相関（§8.4、非規範） | VC は個人の相関に使われ得る長期識別子を含み得る [N][^26] | VC の識別子を sub・txn・grant 参照に流用しない | sub の形式（RS 別・client 別の値）は D10-1 と ADR-021 で PIA を経て決める [D] |

- 将来、本人確認や属性証明の入力として VC を受け入れる場合でも、VC の検証は IdP・オンボーディング（ADR-002、ADR-004）で閉じる [D]。access token には検証結果の要約（acr、テナント、必要なら派生値と出所の枠）だけを載せる [D]。

### D10 識別子の永続性と暗号

- **D10-1 識別子**: `iss` は自社が所有する FQDN にし、製品ベンダーのドメイン・alg・cell・製品名を含めない [D]（ADR-021）。issuer が変わると全 RS と全外部 client の検証が壊れるためである [D][A-104]。`sub` は iss の中で一意かつ再割当しない不透明な値にする [D]。OIDC Core は sub を「Issuer の中で局所的に一意で、再割当されない識別子」と定義し、RP が安定した識別子として頼れるのは iss と sub の組だけとする [N][^31]（RS-03#58）。第三者 client に pairwise な sub（client ごとに異なる sub を出して活動の相関を防ぐ方式、OIDC Core §8）を既定にするかは、ADR-021 で PIA を経て決める [N][^31][D]。
- **D10-2 opaque の最大長**: 外部契約に opaque token の最大長・文字集合・128 bit 以上のエントロピー・「client は解析しない」の 4 点だけを書く [D]。最大長（TBD、所有者 CTO、G3、DL-75）は ML-DSA-87 の JWT の計算値（約 6,789 文字）を下回らない値にする [D]（RS-11#62）。将来、外部を JWT に寄せる可逆性を実際に残すためである [D]。
- **D10-3** opaque 値の先頭に版・種別・経路識別子を置く [D]。漏えい走査と AS 置換時の dual-run に使い、client は解釈しない [D]。
- **D10-4 alg**: alg は fully-specified の識別子だけを使う [D]。RFC 9864 は JOSE の多相的な EdDSA を Deprecated にした（新規展開では置換手段を使うべき、SHOULD）[N][^42]（RS-11#43）。このため多相的な `EdDSA` は採らない [D]。Ed25519 系を将来使う場合は fully-specified の識別子に限る [D]。
- **D10-5 alg 名を識別子に埋め込まない**: alg 名を issuer URL・sub・kid・profile 名に埋め込まない [D]（RS-11 結論 8）。kid は不透明な値にする [D]。
- **D10-6 JWKS と PQ**: JWKS は複数 alg の鍵を並行公開できる構成にする [D]（RS-11 結論 7）。内部 JWT の PQ 化は ML-DSA（RFC 9964 で JOSE 識別子が確定）への移行と移行期間中の鍵の並行公開を基本とし [N][^50]（RS-11#41）、composite 署名は RFC 化を待って再評価する [D]。ML-DSA-65 の JWT は計算上約 5,031 文字、DPoP proof は約 8,222 文字になり [D]（RS-11#62）、Authorization ヘッダは HPACK の既定テーブルに入らない [D]（RS-11#63）。内部 alg を ES256 から ML-DSA-65 へ利用側の改修なしで切り替えられることを H-19 で確かめる（G-068）[D]。外部 opaque により、alg 移行の範囲は edge・共通 SDK・内部 RS に閉じる [D]。DPoP の PQ 化は ADR-015 の再検討トリガーに登録する [D]。

### D11 退出可能性（AS 製品置換）

- **D11-1** AS 製品を置換するときに既存 grant と refresh token を移せないと、約 3 万 grant（成長 12 万）の再同意が必要になり得る [D][A-013, NA-06]。そこで、grant と refresh token の export/import、またはそれができない場合の再同意計画を、ADR-001（製品選定）と ADR-018（出口戦略）の必須評価項目にする [D]。
- **D11-2** AS 置換の模擬（dual-run で旧 AS の opaque と新 AS の opaque を edge が併存処理し、grant を移行または再同意させる手順）を H-22 で試験する [D]。opaque 先頭の版・種別・経路識別子（D10-3）がこの併存処理の鍵になる [D]。
- **D11-3** H-22 で移行不能が判明し、再同意の費用が BIA で許容できない場合は、自社 token ファサード（§3.1 案G）を再評価する [D]。

### D12 費用前提

- **D12-1** 内部 STS と TTS は self-host を前提にする [D]。token exchange（基準 1,112/秒）を token 単位で課金する managed サービスに載せると、月 10 万ドル以上の桁になり得る [D]（RS-15 結論 6、[A-043]）。この前提を費用比較（DL-33）の条件に入れる [D]。
- **D12-2** 状態ストア・edge 照会系の要員増分は NA-08 の桁で仮置きし、BFF 参照実装・SDK・grant 棚卸しの増分と合わせて H-18 で A-054 と比べる [D]。金額は DL-33 で算定する（TBD、所有者 CTO、G3）[D]。

### D13 判定から追加した論点（3 提案に明示されていなかったもの）

- **D13-1 jti と grant・session の区別**: 起草案の一部は jti を「grant・session 側を識別する」と説明したが、jti は JWT 自体の一意識別子である（RFC 7519 §4.1.7）[N][^29]。一括失効と session 失効の結合キーは、jti とは別の grant 参照・sid として持つ（D9-2 L2）[D]。また、外部 opaque token は claim を持たないので、外部 token の証跡は AS の発行記録 ID か introspection 応答で表す [D]。
- **D13-2 要求 context の発行量の明示**: 外部要求すべてに要求 context を発行する設計は、基準 16,804/秒・成長 56,444/秒の署名を生む [D][A-040]。発行範囲は D9-3 で write 以上に限り、量を H-20 で判定する [D]。
- **D13-3 時刻規則の対象と方向**: FAPI の 10 秒／60 秒は AS が受け取る JWT の未来方向の規定であり、access token の iat の古さで拒否すると寿命 1 分超の内部 token がすべて失敗する [D]。V7 で対象と方向を明記した [D]。

### 2.14 決裁案（経営・事業・リスク受容の判断が要る点）

| # | 論点 | 選択肢 | 推奨 | 帰結 | 決める人 |
|---|---|---|---|---|---|
| K-1 | BFF 経路の形式 | (a) opaque（案B）／(b) 内部 JWT（案C） | (a)。ただし H-02・H-04 不合格なら (b) | (a) は照会 8,402/秒・状態ストアが Tier-0 部品になる。(b) は BFF 経路の stale allow が L_int＋C の範囲で残る | CTO（技術）＋CISO（リスク受容）。期限 G4 |
| K-2 | 剥奪反映 SLO R(t) と被害窓 E(t) | 操作階層ごとの値 | TBD（BIA から） | 寿命と cache 齢の上限が決まる | 事業責任者（BIA）＋CISO。期限 G4 |
| K-3 | 第三者サーバー型の sender constraint 既定 | (a) mTLS 既定／(b) DPoP＋nonce 既定 | (a)。NA-03 の比率が低ければ (b) にし、privileged・FAPI だけ mTLS | (a) は参入障壁、(b) は A5 攻撃者への耐性が下がる | プロダクト責任者＋CISO。期限 G1 実測後 |
| K-4 | 内部 RS256 の扱い | ES256 のみで受容票／RS256 も有効 | ES256 のみ＋受容票 | RFC 9068 §2.1 の MUST の解釈に依存する逸脱が残る | CISO。期限 G3 |
| K-5 | AS 置換時の再同意 | export/import を必須評価にする／再同意を受容 | 必須評価にする（D11-1） | 候補製品が減り得る | 事業責任者（利用者負担）＋CTO。期限 ADR-001 決裁時 |
| K-6 | 内部束縛 I1 か I2 | I1（cnf）／I2（mesh mTLS＋aud＋呼出し元照合） | I1。H-16 で費用過大なら I2＋受容票 | I2 は RFC 9700 SHOULD からの逸脱 | CTO＋CISO。期限 G4 |

### 2.15 未決の論点（整合調整で追加）

| # | 論点 | 対立している記述 | 選択肢と帰結 | 決める場 |
|---|---|---|---|---|
| U1 | issuer の粒度（外部 AS の issuer） | ADR-007 KD7-1（テナント／realm 別）と ADR-021 K21-1（信頼区画別） | 本書の V4（内部 issuer は cell ごと）はどちらでも変わらない。外部 RP 向けの mix-up 対策の規模（issuer 数）が変わる [D] | DEC-3。reconciliation-notes U-01 |
| U2 | `txn` を証跡の主キーにする範囲 | ADR-022 D-8-3（主キーは `txn`、再構成率 100%）と本書 D9-3（要求 context は write 以上に限る） | (a) 全要求に要求 context を発行（署名 16,804/秒・成長 56,444/秒、H-20 で判定）。(b) 主キーを write 以上に限り、public・read-sensitive は (jti, decision_id, X-Request-ID) で相関する（R-118 の証跡が層によって異なる）[D][A-040] | CTO＋CISO（R-118 の閉じ方）。H-20 の後。reconciliation-notes U-02 |

---

## 3. 検討した選択肢

### 3.1 主論点: opaque/JWT 境界

| 項目 | 案A 全境界 JWT＋局所検証 | **案B 外部全 opaque＋cell 内状態ストア＋内部サービス別 JWT（推奨。sec・evo）** | 案C client 種別ハイブリッド（BFF 経路は JWT、第三者・ネイティブ・高リスクは opaque。ops の推奨） | 案D 全境界 opaque＋全 RS が照会 |
|---|---|---|---|---|
| 概要 | client にも内部にも RFC 9068 JWT。失効は寿命と CAEP | D1〜D13 | BFF から業務 API は JWT。外部は edge で照会 | 内部も opaque |
| 利点 | 照会 0/秒、AS 停止に強い [D][A-044] | 外部 token は C(t) 以内に失効。外部 client が形式・alg に依存しない。privileged で偽造検知 [D] | 照会 2,521/秒（成長 8,467/秒）で案B の約 3 割。BFF 経路は状態ストア停止に強い [D][A-044] | 全経路で照会時点の失効 [D] |
| 欠点 | client が内容を読める [N][^7]。FAPI の失効確認に別手段が要る [N][^2]。PQ 化と RS256 の Deprecated 期間に外部契約の変更を強いられる（RS-11#8, #62） | 状態ストア・STS・TTS が Tier-0 部品として増える [D] | 主流量の BFF 経路の失効が寿命と BFF 実装に依存する。外部検証規則が 2 系統 [D] | 照会量 16,804×(1＋k)×miss [D][NA-05] |
| 主要リスク（攻撃者類型） | ATK-05: 盗まれた JWT が寿命まで有効。ATK-08/17: 偽造を検知できない（RS-12#10） | 状態ストア障害が判定系の可用性を下げる（ATK-12、ATK-19）。STS 侵害時の exchange 濫用（ATK-06） | 60 チームの BFF 品質が失効品質になる（ATK-19）[D][A-052] | 状態系の障害が全サービスの障害になる。Google 2020-12-14 の 47 分障害 [I][^47]（RS-12#58） |
| 費用・要員の桁 | 常時部品の追加なし。発行 1,374/秒 [D][A-043] | 照会: 基準 8,402/秒、成長 28,222/秒（×k）。exchange 1,112/秒。部品はリージョン 4×3 種（状態ストア・STS・TTS）。要員は NA-08（＋1〜2 FTE の桁＋TBD）[D][A-040, A-044, A-063] | 照会 2,521/秒。状態ストアは小さい。BFF 参照実装の運用は案B と同じ [D][A-044] | 案B の (1＋k) 倍 [D] |
| 可逆性 | 外部へ出すと不可逆寄り（外部の解析依存）[D] | 可逆（BFF 経路だけ案C へ切替可）[D] | 可逆 [D] | 可逆 [D] |
| 勝つ条件 | 外部 client がほぼ第一者だけ（A-013 の下端 300 未満）で全 client が SDK の統制下にあり、BIA が剥奪反映 ≥ 寿命を受容し、alg 移行を想定しない [D] | 第三者連携（A-013）と規制業種（A-080）があり、H-02・H-04 に合格する [D] | H-02・H-04 が不合格、または BIA が BFF 経路の stale allow を L_int の範囲で受容し、要員（H-18）が A-054 に収まらない [D] | 規制強化（A-080 の 65%）で全操作の即時失効が要り、k が小さいと実測される [D] |

| 項目 | 案E 全 JWT＋Token Status List | 案F 製品の既定に従う | 案G 自社 token ファサード（evo 案D） |
|---|---|---|---|
| 概要 | 案A の失効を TSL（draft-21）で補う | 採用製品の既定の形式・寿命・束縛 | 自社 STS が外部 handle・refresh・grant を保持し、AS 製品は背後の発行エンジンにする |
| 利点 | 問い合わせ削減 [N]（RS-04#80） | 初期費用が最小 [D] | AS 置換時に grant を自社側に残せ、再同意を避けられる可能性 [D][NA-06] |
| 欠点・リスク | draft で規範根拠にできない [N][^18]。反映が ttl に依存 | 一律寿命で R-087 に反する。置換時に 300 サービス・800 client の再試験 [D][A-050, A-013] | ADR-001 の「AS core を自作しない」原則に抵触。refresh・失効・DPoP 検証の再実装で攻撃面が増える [D] |
| 費用・要員 | 案A＋draft 追随 | 小 | 認証・IdP チーム（A-054 の 5 FTE）の倍の桁 [D][A-054] |
| 可逆性 | 可逆 | 低い | 中（導入後に外すのが難しい） |
| 勝つ条件 | RFC になり、ttl が剥奪反映 SLO を満たす [D] | 計画期間が再決裁 1 周期以内で退出を想定しない [D][A-101] | grant export/import を持つ AS 候補がなく、再同意の費用が BIA で許容できない（H-22）[D] |

### 3.2 Q8: 要求単位の証跡

| 案 | 概要 | 利点 | 欠点・リスク | 費用 | 可逆性 | 勝つ条件 |
|---|---|---|---|---|---|---|
| T1 access token に trace id | token に trace-id を入れる | 実装が単純に見える | token 再利用で要求単位にならない。要求ごとの再発行は約 10 万/秒。外部注入値に依存（D9-1）[D] | exchange 約 90 倍 | 可逆 | なし（1 要求 1 token の設計でのみ成立し、容量前提と両立しない） |
| T2 jti＋grant/session＋decision_id＋trace_id を監査だけで相関 | 署名付き要求 context なし | 追加発行なし [D] | 内部 hop 間の相関が未署名ヘッダと各サービスのログ実装に依存し、ATK-06 がヘッダを偽装すると「edge を通った要求か」を事後に証明できない [D] | 最小 | 可逆 | p_w が小さく内部の多段呼出しが少ない。または draft が失効 |
| **T3 T2＋高リスク階層だけ署名付き要求 context（推奨）** | D9-2・D9-3 | write 以上で改変できない要求単位の証跡が残る [D] | draft 依存。発行量 16,804×p_w/秒 [D] | TTS と署名鍵 | adapter で可逆 | p_w と署名容量が H-20 で合格 |
| T4 全要求に要求 context（ops 案 D-19 に相当） | T3 を全階層へ | 一様 | 発行 16,804/秒、成長 56,444/秒 [D][A-040] | 最大 | 可逆 | 規制強化で read の証跡も求められ、署名容量が確保できる |
| T5 HTTP 要求署名 | 要求本文まで署名 | 否認防止まで届く | FAPI Http Signatures は draft で、Message Signing Final はリソース要求を含まない [N][^4]（RS-04#51） | 大 | 可逆 | 標準が Final になり、否認防止が法的に要る |

### 3.3 副論点

| 論点 | 案 | 採否と条件 |
|---|---|---|
| refresh 保護 | R1 rotation を一律 | 棄却（FAPI の shall not、同時更新での誤失効 [N][^2]、AS 置換時の状態引継ぎ） |
| | R2 DPoP 束縛を一律（confidential を含む） | 棄却（RFC 9449 §5 と異なる [N][^5]） |
| | R3 sender constraint のみ（rotation 併用なし） | 棄却（鍵と token の同時窃取への補完がない [N][^1][^13]） |
| | **R4 client 種別表＋鍵保護不明の public だけ rotation 併用** | 採用（D4） |
| sender constraint | S1 外部 DPoP 既定（ops 案） | 条件付き棄却（A5 への耐性。K-3 で NA-03 が低ければ第三者の既定を DPoP＋nonce に変更） |
| | S2 mTLS のみ | 棄却（ネイティブで証明書を運用するのは難しい [D]） |
| | S3 第三者 confidential は DPoP・mTLS 任意（evo 案） | 棄却（試験組合せが倍、privileged の境界条件がない） |
| | **S4 経路×操作階層別** | 採用（D5） |
| | S5 Bearer＋短命化 | 棄却。既存連携だけ期限付き例外 |
| ブラウザ | **B1 BFF 必須＋参照実装** | 採用 |
| | B2 token-mediating backend | 棄却（ブラウザ内に access token が残る [N][^13]） |
| | B3 ブラウザ内 client＋DPoP | 第三者の低リスク scope の例外のみ |
| 寿命 | L1 一律値 | 棄却（R-087） |
| | L2 導出のみ（API 個別値を許す） | 棄却（60 チームで運用できない [A-052]） |
| | **L3 導出＋profile 3 種類以内** | 採用 |
| | L4 テナントの自由設定 | 棄却（G-115） |
| alg allowlist の出所 | V1' issuer metadata と profile から取得（evo 案） | 棄却（配布元の誤設定・侵害に alg 判定を依存させる。RFC 8725 §3.1 の趣旨を弱める）[D] |
| | **V1 検証側の版付き設定** | 採用 |
| claim | C1 属性を厚く載せる（groups/roles/所属） | 棄却（R-249、U2、RFC 9068 §6） |
| | **C2 封筒＋将来の拡張点（D9-4）** | 採用 |
| | C3 VC 形式で token を表現 | 棄却（OAuth RS の検証規則・失効と整合しない [D]） |

---

## 4. 評価

### 4.1 評価軸

判定者 3 名は 6 軸を 1〜5 点（高いほど良い）で採点した [D]。

| 軸 | 意味 |
|---|---|
| 要求網羅（requirement_coverage） | 9 問と R/G への応答 |
| リスク低減（risk_reduction） | 攻撃者類型ごとの残余リスク |
| 規模での実現性（feasibility_at_scale） | 300 サービス・60 チーム・24 FTE で運用できるか |
| 進化・退出（evolvability_exit） | 暗号移行・製品置換・識別子の永続性 |
| 根拠の質（evidence_quality） | 原典・強度の正確さ |
| 可逆性・費用（reversibility_cost） | 後戻りの費用 |

### 4.2 採点表（判定者×提案×6 軸）

| 判定者 | 提案 | 網羅 | リスク | 規模 | 進化 | 根拠 | 可逆 | 合計 | 勝者票 |
|---|---|---|---|---|---|---|---|---|---|
| 判定者 1 | sec | 5 | 5 | 3 | 4 | 5 | 3 | 25 | |
| 判定者 1 | ops | 4 | 3 | 5 | 3 | 4 | 4 | 23 | |
| 判定者 1 | evo | 5 | 4 | 4 | 5 | 3 | 4 | 25 | evo |
| 判定者 2 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | sec |
| 判定者 2 | ops | 4 | 3 | 4 | 4 | 4 | 4 | 23 | |
| 判定者 2 | evo | 4 | 4 | 3 | 5 | 3 | 4 | 23 | |
| 判定者 3 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | sec |
| 判定者 3 | ops | 4 | 3 | 4 | 3 | 3 | 4 | 21 | |
| 判定者 3 | evo | 4 | 4 | 3 | 5 | 3 | 3 | 22 | |
| **計** | sec / ops / evo | | | | | | | **73 / 67 / 70** | **sec 2・evo 1・ops 0** |

- 集計上の勝者は sec（票 2、得点 73）である [D]。合計は表の点の単純和で、重みは付けていない [D]。

### 4.3 判定者間の一致点と不一致

**一致点** [D]

- 3 名とも、sec の「規模での実現性」を 3 点とし、状態ストア照会が案C の約 3.3 倍になる点と Tier-0 部品の増加を最大の弱点に挙げた。いずれも H-02・H-04 不合格時に BFF 経路を案C（ops 型）へ切り替える条件を付けた（D1-7、§8）。
- 3 名とも、evo の「進化・退出」を 5 点とし、識別子の永続性（D10-1）、grant export の必須要件化（D11）、主体種別と検証済み属性の出所の枠（D9-4）を取り込むべきとした。
- 3 名とも、ops の寿命 profile 3 種類以内、BFF 参照実装、SDK 習得工数の実測、self-host STS の費用前提を取り込むべきとした（D3、D6-2、H-17、D12）。
- 3 名とも、sec の「privileged での stateful jti 照合」と「要求 context を write 以上に限る」を採るべきとした（D1-6、D9-3）。

**不一致** [D]

| 論点 | 判定者 1 | 判定者 2・3 | 本書の扱い |
|---|---|---|---|
| 勝者 | evo（進化・退出 5、規模 4 と評価） | sec（リスク低減と監査証跡の厚さを重視） | 票で sec を土台にし、evo の進化・退出の決定（D10・D11）を本文の決定として採った |
| evo の規模での実現性 | 4 | 3 | evo の要員見積り（＋1〜2 FTE）は根拠が弱いとの指摘が共通。NA-08 で桁として仮置きし、H-18 で判定する |
| ops の進化・退出 | 3（判定者 1・3） | 4（判定者 2） | AS 置換時の grant 移行と issuer 永続性の扱いが浅いとの指摘を、D10・D11 で補った |
| 第三者サーバー型の既定 | sec の mTLS 既定を採る | 判定者 2・3 は NA-03 が低ければ DPoP＋nonce に変える条件を付けた | K-3 の決裁案とし、条件を §8 に置いた |

### 4.4 判定者が指摘した事実誤りと本書での処置

原典（research ノートの検証済み項目、または最終起草者が取得した原典）で確認し、本書では次のとおり扱った [D]。

| 提案 | 指摘 | 確認結果 | 本書の処置 |
|---|---|---|---|
| sec | D5 表の「D6-4 の例外」は D6-3 が正しい | 指摘どおり（sec の D6-3 がブラウザ内 client の例外、D6-4 は step-up） | D5 表を「D6-3 の例外」に修正 |
| sec | N-m の AAL2「24h 以内（SHALL）」は誤読を招く | RS-03#43: 上限の設定が SHALL、24h 以内は SHOULD | N-m を書き分けた |
| sec | RS-17#79・RS-12#41・#58 の原典脚注がない | 各ノートの脚注の原典を確認 | 脚注 [^48]・[^46]・[^47] を追加 |
| sec | V7 の 60 秒規定の対象・方向の取違え | RS-04#42: FAPI §5.3.2.1 は AS が受け取る JWT の iat/nbf について「未来 0〜10 秒は受理、未来 60 秒超は拒否」 | V7 を未来方向の許容に限定し、iat の古さを拒否理由にしないと明記（D13-3） |
| sec | ATK-15 の「約 3 分」は一括失効の時間ではない | RS-12#41: Bulk API 2.0 による本体持出しの所要時間 | §6.3 で「持出しの所要時間」と明記 |
| sec | §4.1 の加重合計の誤り | 判定者 3 の再計算どおり | 自己採点表は本書に載せず、判定者の採点（§4.2）に置き換えた |
| ops | jti を「grant・session 側を識別する」と説明 | RFC 7519 §4.1.7: jti は JWT の一意識別子 | D9-2・D13-1 で区別 |
| ops | 外部 opaque token の (iss, jti) は存在しない | opaque は claim を持たない | 発行記録 ID か introspection 応答で表す（D13-1） |
| ops | FAPI 範囲で EdDSA を許す | RS-11#43: RFC 9864 が多相的 EdDSA を Deprecated | D10-4 で不採用 |
| ops | ID Token を nonce の有無で判別 | nonce は認可コードフローで任意 | D2 で issuer 分離と typ 必須で判別 |
| ops | §4.1 の加重点の誤り | 判定者 3 の再計算どおり | 自己採点表は採らない |
| evo | 内部 allowlist に EdDSA | 上と同じ | D10-4 |
| evo | 照合日 2026-10-15 が文書日付と矛盾 | 指摘どおり | 本書の照合日はすべて 2026-10-03 に統一し、最終起草者が照合した原典を明示した |
| evo | opaque 最大長 512 octets の例が「外部を JWT にできる」と矛盾 | RS-11#62: ES256 JWT は約 700 文字 | 512 の例を撤回し、ML-DSA-87 JWT の約 6,789 文字以上とした（D10-2） |
| evo | RS256 の 2030 年 deprecated は ipd | RS-11#8: IR 8547 ipd | D8-3 で ipd・未確定と明記 |
| evo | A-091 を停止許容時間として使用 | A-091 は可用性帯の仮置き | Lmin(b) は BIA の MTPD と比べると明記 |
| evo | RFC 10017 の "not recommended" の出典 | RS-17#4: §6.3.4.3 でブラウザ内 OAuth client を "not recommended"（小文字） | 記述は正しい。N-g に出典を付けた |
| evo | V1 で alg allowlist を metadata から取得 | RFC 8725 §3.1 の趣旨（呼出し側が許可集合を指定） | V1 を検証側設定に置き換え、evo 案は §3.3 で棄却 |

---

## 5. 決定理由と棄却理由

- **案B を推す理由**: 次の 4 つを外部経路に例外なく満たせ、しかも AS core の自作を伴わない唯一の案だからである [D]。(1) ATK-05・ATK-15 について既存 token を C(t) 以内に拒否する。(2) ATK-08・ATK-17 について privileged で発行記録との照合により偽造を検知する。(3) FAPI の失効状態検証（shall）。(4) 暗号移行（A-103）と製品置換（A-104）を外部契約から切り離す。

以下の棄却理由は traceability/rejected-hypotheses.md に棄却仮説として集約される [D]。

| 棄却仮説 ID（案） | 棄却した案 | 理由 |
|---|---|---|
| RH-005-A | 全境界 JWT | 外部 client の解析依存で形式を変えられなくなり、偽造 token を検知できない（RS-12#10, #11）。悪性 client を無効化しても既存 token が期限まで残る [V][^37]。外部へ出した後は事実上不可逆 [D] |
| RH-005-C | client 種別ハイブリッド（条件付き棄却） | 主流量の BFF 経路で失効品質が 60 チームの実装と寿命に依存し、外部検証規則が 2 系統になる [D]。H-02・H-04 に不合格なら採用に切り替える |
| RH-005-D | 全境界 opaque（内部も照会） | 全内部呼出しが状態系に同期依存し、状態系の障害がそのまま全サービスの障害になる [D]（RS-12#58） |
| RH-005-E | 全 JWT＋Token Status List | TSL が draft である [N][^18] |
| RH-005-F | 製品の既定に従う | R-087・G-024 に反し、製品置換（A-104）のたびに全契約を作り直す [D] |
| RH-005-G | 自社 token ファサード | ADR-001 の原則に抵触し、要員が倍の桁で増える [D]。代わりに grant export/import を必須評価にする（D11） |
| RH-005-T1 | access token に trace id | D9-1 の 4 理由 |
| RH-005-T2 | 監査相関だけ（要求 context なし） | ATK-06 に対して要求の真正性を事後に証明できない [D] |
| RH-005-T4 | 全要求に要求 context | read で発行量（基準 16,804/秒）に見合う便益の根拠がない [D] |
| RH-005-T5 | HTTP 要求署名 | Final の標準がない [N][^4] |
| RH-005-R1 | rotation を一律 | FAPI の shall not と誤失効 [N][^2] |
| RH-005-S1 | 外部 DPoP 既定 | A5 攻撃者への耐性（RS-04#49）。ただし K-3 の条件で再採用し得る |
| RH-005-V1' | alg allowlist を metadata から取得 | 配布元の誤設定・侵害に alg 判定を依存させる [D] |
| RH-005-EdDSA | 多相的 EdDSA の採用 | RFC 9864 で Deprecated [N][^42] |
| RH-005-C1 | 属性を厚く載せる | 剥奪の遅れと情報漏えい（RFC 9068 §6）[N][^7]、R-249 |
| RH-005-C3 | VC 形式の token | VC は holder 提示型の属性証明であり、RS の検証規則と失効モデルに置き換えられない [D] |

---

## 6. 帰結

### 6.1 良い帰結

- 外部 client は token の形式・alg・claim に依存しなくなり、PQ 移行（ADR-015）と AS 置換を外部契約に波及させずに行える [D]。
- 検証規則が SDK の既定動作になり、ベンダー交代があっても契約試験で品質を機械的に判定できる [D][A-052]。
- write 以上の要求は (txn, jti, grant 参照, sid, decision_id) で「edge の認証認可を通った要求」として事後に再構成できる [D]。
- 主体種別・検証済み属性の出所の枠を予約したので、AI エージェントや属性証明の受入れを claim の意味を壊さずに追加できる [D]。

### 6.2 悪い帰結

- 状態ストア・STS・TTS が Tier-0 部品として増え、判定系の可用性帯（A-090）を共有する [D]。
- 第三者には mTLS 既定の参入障壁が生じる（NA-03 未測）[D]。
- ネイティブでは DPoP と rotation の併用で SDK が扱う状態の組合せが増える [D]。
- 要求 context の draft 依存が残る [D]。
- 内部 JWT の RS256 逸脱を記録・維持する作業が生じる [D]。

### 6.3 残余リスクと受容者案

| 攻撃者類型 | 統制 | 証拠 | 残余リスク | 受容者案 |
|---|---|---|---|---|
| ATK-05 盗まれた token | opaque＋照会、sender constraint、BFF | H-01・H-05 の負例 | C(t) の間の stale allow。鍵と token を同時に盗まれた場合 | CISO（R(t) は事業責任者） |
| ATK-06 侵害 microservice | サービス別 aud、cnf、要求 context、mTLS | H-16・H-20 | 侵害サービス宛ての token の範囲内での濫用。Txn-Token の replay（draft が認める） | CISO |
| ATK-08/17 鍵の不正使用・偽造 | privileged の stateful 照合、鍵の分離 | H-09 | read・write の内部 token は U2 の範囲で偽造を検知できない | CISO |
| ATK-02 悪意あるテナント管理者 | 1 token 1 テナント、資源由来テナントとの照合 | H-10 | PEP の照合漏れ（R-250 の多層化に依存） | CISO |
| ATK-15 悪性第三者アプリ | 台帳・一括失効・同意制限 | H-08 | 一括失効の完了までに行われる大量取得。Cloudflare の事案では、Bulk API 2.0 による本体の持出しが約 3 分で終わった [I][^46]（RS-12#41） | 事業責任者＋CISO |
| ATK-16 濫用される AI エージェント | 主体種別 claim、act、要求 context | H-01（主体種別の負例） | 正規の委任範囲内での濫用（ADR-017 で扱う） | CISO |
| ATK-12/19 障害・変更の誤り | 静的安定性、grace なし、CI 検査、寿命 profile 3 種類 | H-04・H-15 | 状態ストア停止中の write・privileged の fail-closed | 事業責任者（BIA） |
| 範囲外（端末侵害） | DPoP＋rotation 併用、CSP | — | 端末上での正規 proof の生成 | CISO |
| 退出（AS 置換） | grant export/import の必須評価 | H-22 | grant を移せない場合の再同意の利用者負担 | 事業責任者 |

### 6.4 依存サービス・連携開発者への影響

- 業務サービスの義務は 4 つに限る [D]。SDK・sidecar による検証、aud の登録、token をログに残さないこと、契約試験の合格である。独自の JWT 検証は CI で拒否する [D]。
- write 以上を扱うサービスは、要求 context を無改変で下流へ渡す（draft の MUST）[N][^21]（RS-06#35）[D]。
- 業務サービスが受け取る token は内部 JWT（at+jwt）と Txn-Token の 2 種類に限られる [D]。
- 第三者は、opaque を解析しないこと、opaque の最大長、sender constraint（既定 mTLS、例外 DPoP＋nonce）、grant の満了・再承認に対応する必要がある [D]。sandbox と SDK で支援する [D]。
- 独自セッションの 105 サービスは BFF 参照実装へ移行する [D][A-110]。

### 6.5 運用・要員

- 状態ストア・STS・TTS・BFF 参照実装・SDK・準拠表・grant 棚卸しはプラットフォームチームが所有する [D][A-054]。増分は NA-08 の桁で仮置きし H-18 で測る [D]。
- KRI: 寿命上限の違反数、Bearer 例外の残数、期限切れ grant の未失効数、要求 context の欠落率（write 以上）、独自 JWT 検証の検出数 [D]。
- runbook: 一括失効、状態ストア停止、署名鍵の緊急失効（ADR-007）、AS dual-run 切替 [D]。

---

## 7. 検証

### 7.1 PoC の仮説と TC 案（TC-ID は 12_poc で採番する）

| H | 仮説 | 合否基準 | 判定が覆る先 |
|---|---|---|---|
| H-01 | 負例が全件拒否される。audience 混同、typ 混同（ID Token・introspection 応答・SET・Txn-Token を access token として提示）、typ なし JWT、alg 混同、mix-up、PKCE downgrade、query token、DPoP の Bearer 提示、盗まれた refresh token の別鍵使用（G-088、R-173） | 拒否率 100%（規則であり推定値ではない） | — |
| H-02 | 状態ストアが基準 8,402/秒・成長 28,222/秒（×k、NA-05）で p99 遅延 TBD 以内、判定系可用性帯 A-090 を満たす | p99 は TBD（所有者 CTO、G4、BIA から） | 不合格なら BFF 経路を案C へ（K-1） |
| H-04 | 状態ストア・STS の停止を注入したとき、read の継続と write・privileged の fail-closed が設計どおりに動き、AS 本体への迂回が起きない | DL-19 に一致 | 不合格なら案C へ |
| H-05 | DPoP の受理窓 W と時刻差による拒否率、nonce 再試行率 | TBD（NA-01） | — |
| H-07 | rotation 併用時の正規 client の誤失効率 | TBD（プロダクト責任者＋CISO） | 超過なら併用範囲を縮める |
| H-08 | grant・client・publisher・テナント単位の一括失効の完了時間 | R-189.5（TBD） | — |
| H-09 | 発行記録にない jti を持つ偽造 token を privileged で検知・拒否する | 100% | — |
| H-10 | 複数所属主体によるテナント取違え・越境が拒否される（R-283） | 100% | — |
| H-15 | AS・STS 停止から業務停止までの時間と MTPD の比較 | BIA の MTPD | — |
| H-16 | I1（cnf 検証）の実装費用と遅延 | TBD（CTO） | 過大なら I2＋受容票 |
| H-17 | 新しいサービスが SDK と契約試験キットだけで検証の適合に達するまでの工数（ops TC案-05-06） | TBD（DL-27） | 過大なら SDK を簡素化 |
| H-18 | 要員の増分（状態ストア・BFF 参照実装・SDK・grant 棚卸し）が A-054 の内数に収まる。状態ストアは NA-08 の＋1〜2 FTE の桁と比べる | A-054 | 不合格なら要求 context を privileged・FAPI に縮め、それでも不合格なら案C |
| H-19 | 内部 alg を ES256 から ML-DSA-65 へ利用側の改修なしで切り替えられ、ヘッダ上限・HPACK の範囲で動く（G-068） | 改修 0 件、到達不可 0 件 | 不合格なら内部形式の進化可能性の前提を見直す |
| H-20 | 要求 context: 発行量 16,804×p_w/秒で署名・検証の遅延が TBD 以内。下流での改変・剥ぎ取りを検知できる。監査で (txn, jti, grant 参照, sid, decision_id) から要求を再構成できる | 再構成率 100%、遅延 TBD | 不合格なら T3 を privileged・FAPI に縮める。極端な場合は T2 |
| H-21 | 外部の traceparent を偽造・衝突させても、監査の相関と記録の有無が変わらない | 影響 0 件 | — |
| H-22 | AS 製品置換を模擬し、opaque の dual-run と grant 移行または再同意の手順が成り立つ（evo TC-005-10） | 移行率・利用者影響は TBD（事業責任者） | 移行不能かつ再同意不可なら案G を再評価 |
| H-23 | 状態照会のログ・経路から主体の追跡ができない（VC DM 2.0 §4.10 の趣旨の準用） | 照会ログに主体と利用先の対応が残らない | — |
| H-24 | 寿命 profile 3 種類で、全 API の寿命が U1〜U5 を満たす | 違反 0 件 | 満たせない API があれば profile を追加する前に API の階層分割を検討 |

### 7.2 第三者評価で確かめること

- OIDF の FAPI 2.0 Security Profile Final・Message Signing Final の適合試験を、採用版で mTLS 構成と DPoP 構成の両方について自前で実行し、E7 として保存する（適合試験の提供は告知済み [N][^45]、RS-04#52）（G-089）[D]。
- pentest の範囲に、edge 迂回、状態ストアへの token scanning、STS による exchange の濫用、要求 context の replay・付け替え、BFF の CSRF、主体種別の偽装を含める [D]。
- RFC 9700 準拠表の空欄 0 件と、逸脱行ごとの受容票を、独立の確認者が検証する（G-087）[D]。

---

## 8. 再検討トリガーと見直し時期

- **定期見直し**: G3・G4 の各ゲート、標準ステータス台帳の四半期更新、再決裁の周期（A-101）で見直す [D]。
- **実測値の逸脱**:
  - H-02・H-04 が不合格なら、BFF 経路を案C に切り替える。費用と tail latency の差が決定的なら勝者は ops 型に近い構成になる [D]。
  - H-18 で要員が A-054 に収まらなければ、要求 context を privileged・FAPI に限定し、それでも収まらなければ案C を採る [D]。
  - H-20 で p_w または署名容量が不合格なら、T3 を privileged・FAPI に絞る [D]。
  - H-16 で費用が過大なら I2 に切り替え、受容票を作る [D]。
  - H-07 が閾値超過なら、rotation 併用をやめる（FAPI の論理に合わせる）[D]。
  - H-22 で grant を移せず再同意の費用が BIA で許容できなければ、案G を再評価する [D]。
  - H-19 で ML-DSA 化が利用側の改修 0 件で済まなければ、内部形式の進化可能性の前提を見直す [D]。
- **前提の変化**:
  - NA-03（end-to-end mTLS を張れる第三者の比率）が低ければ、第三者の既定を DPoP＋nonce に変え、mTLS は privileged・FAPI だけに限る（K-3）[D]。
  - A-013 の実態が下端（client 300 未満）でほぼ第一者だけなら、外部 opaque の便益が下がり、案A・案C の勝利条件に近づく [D]。grant が上端（10 万）を超えた場合も見直す [D]。
  - BIA と事業責任者が BFF 経路の stale allow を L_int の範囲で受容すると決裁した場合は、BFF も opaque にする根拠が弱まる [D]。
  - NA-07（VC 受入れ）が要件として確定した場合は、D9-4 の出所の枠を具体化する [D]。
- **標準の状態変化**:
  - Transaction Tokens が IESG 提出・RFC 発行、または `txn`・`tctx`・typ の意味が変わったとき（社内 profile を改版）。draft が失効した場合は T2 への後退を判断し直す [D]。
  - Token Status List の RFC 化（案E を再評価）、8725bis の RFC 化（V14 を正式化）、OAuth 2.1 の RFC 化、FAPI Http Signatures の Final 化（T5 を再評価）、CAEP Interoperability Profile の Final 化、JOSE composite 署名の RFC 化、NIST IR 8547 の final 化 [D]。
  - RFC 9068 errata 8802（iss の扱い）の判定（RS-04#60）、または RS256 MUST の解釈（K-4）が監査で非準拠と判定された場合は、内部 issuer の alg 方針を見直す [D]。
- **製品の健全性**: 採用 AS が opaque 状態の push、DPoP nonce、dpop_jkt、RFC 9701、grant export のいずれかの提供をやめた場合、または OIDF 認定を更新しない場合 [D]。
- **規制変更**: 規制業種比率が A-080 の規制強化シナリオへ移り全操作で即時失効が求められた場合は、案D と T4 を再評価する [D]。決済・医療の規則で無操作・再認証の上限が変わった場合、PQC 移行期限が前倒しされた場合も見直す [D]。
- **事故**: 自社または公表事案で、bearer token の大量窃取や署名鍵による偽造 token が発覚した場合 [D]。

---

## 9. 依存関係

| 依存先 | 内容 |
|---|---|
| ADR-001 | AS 製品の必須機能（PAR、DPoP nonce・dpop_jkt、mTLS、RFC 9207/9068/7662/9701/7009/8693/8707/9396、opaque 状態の外部 push、SSF 送信、grant・refresh token の export/import） |
| ADR-002 | acr・amr の値域と AAL・IAL の対応、step-up、検証済み属性の受入れ |
| ADR-004 | 属性証明・VC の受入れ（オンボーディング） |
| ADR-006 | CAEP 受信と剥奪反映 SLO（R-143）、U2 の R(t) |
| ADR-007 | 内部 issuer・要求 context の鍵、cell 別鍵、JWKS の併存時間 |
| ADR-009 | exchange の可否、act、Txn-Token の採否（D9-3 と整合させる） |
| ADR-013 / ADR-023 / DL-19 | 状態ストアの配置、fail-mode と静的安定性 |
| ADR-014 / DL-77 | 監査スキーマ（txn・jti・grant 参照・sid・decision_id・trace_id） |
| ADR-015 | PQ 移行の順序とサイズ、DPoP の PQ 化 |
| ADR-016 | profile 版と破壊的変更 |
| ADR-017 | 主体種別 claim、AI エージェント |
| ADR-018 | 出口戦略（grant 移行） |
| ADR-020 | FAPI 範囲 |
| ADR-021 / ADR-022 / DL-75 | issuer 識別子、sub の形式（pairwise）、claim 名・意味・スキーマ |
| DL-16 | RFC 9700 準拠表と検証規則の詳細 |
| DL-20 | 寿命・時刻差・cache 齢の数値契約 |
| DL-33 | 費用比較（self-host STS の前提） |
| 11_contracts | 第三者向け規約（opaque 最大長、sender constraint、一括失効への協力） |

---

## 対応表（R/G）

閉じ方は CONVENTIONS §6（A 机上／B 組織決定／C 実測／D 第三者）。状態は「本書で閉じた」「決裁案まで」「要実測」「要第三者」のいずれか [D]。

| ID | 本書の節 | 閉じ方 | 状態 |
|---|---|---|---|
| **R-095**（本書を対応成果物とする） | D1、§3.1 | A | 本書で閉じた（方針）。BFF 経路は H-02・H-04 で要実測 |
| **R-158**（同） | D4、D7、D8 | C | 要実測（H-01・H-07）。準拠表本体は DL-16 |
| **G-087**（同） | D1、D8、§2.14 | B | 決裁案まで（準拠表は DL-16、FAPI 採否は ADR-020） |
| **G-020**（同） | 本書の構成（文脈・選択肢・棄却・決定・帰結・可逆性・再検討トリガー・証拠） | A | 本書で閉じた（ADR-005 分） |
| R-046 | D8-2（RFC 9207）、D10-1 | D | 要第三者（DL-16・適合試験） |
| R-087 | D3 | B | 決裁案まで（値は G4、K-2） |
| R-112 | D9-2 L2（sid） | C | 要実測（ADR-006） |
| R-118 | D9-2 | A | 本書で閉じた（ADR-014 と整合を要す） |
| R-143 | D3 U2、D1-2 | C | 要実測（ADR-006） |
| R-159 | D8 | A | 本書で閉じた（方針。準拠表は DL-16） |
| R-160 / R-240 / R-270 | D8-4（ADR-020 へ） | B | 決裁案まで（ADR-020） |
| R-161 | D2 V1〜V14 | C | 要実測（H-01） |
| R-162 | D2 の相互排他 | C | 要実測（H-01） |
| R-163 | D5、D6 | C | 要実測（H-05） |
| R-173 | H-01 | C | 要実測 |
| R-189.1 / R-189.2 / R-189.4 / R-189.6 | D3（U2、U5、V7） | C | 要実測（値は DL-20） |
| R-189.5 | D7-6、H-08 | C | 要実測 |
| R-206 / R-251 | D1-4（サービス別 aud、共通 aud 禁止） | C | 要実測（ADR-009） |
| R-239 / R-259 | D4、D5、D8-2 | A | 本書で閉じた（方針） |
| R-249 | V10、D9-4 | A | 本書で閉じた |
| R-250 / R-283 | V9、D9-4 テナント文脈、H-10 | C | 要実測 |
| G-024 | D3（一律値なし、TBD に所有者） | B/C | 決裁案まで（値は G4） |
| G-062 | D7 | C | 要実測（H-08） |
| G-068 | D10-6、H-19 | C | 要実測 |
| G-072 | D2（独自検証の CI 拒否）、D3 の CI 検査 | C | 要実測 |
| G-088 | D2、H-01 | C | 要実測 |
| G-089 | §7.2 | D | 要第三者 |
| G-106 | D3、D1-2 | B | 決裁案まで（DL-20） |
| G-115 | D3 のテナント設定 | A | 本書で閉じた |
| G-138 | D9-4、D10-2（DL-75 への入力） | A | 決裁案まで（DL-75・DL-64 で行列化） |

---

## 残課題

| 残課題 | 担当（案） | 閉じるゲート |
|---|---|---|
| 寿命・cache 齢・時刻差・jti ストア・grant 寿命の数値（TBD） | CTO＋CISO、事業責任者（BIA） | G4（DL-20） |
| H-02・H-04 による BFF 経路の形式の確定（K-1） | CTO＋CISO | G4 |
| NA-01〜NA-08 の前提台帳への追加と値の確定 | 前提台帳の所有者 | G1〜G4 |
| RFC 9700 準拠表（DL-16）の作成と独立確認 | プラットフォームチーム、独立確認者 | G3 |
| 社内 claim の具体名と Public Name の名前空間（D9-5） | ADR-022・DL-75 の所有者 | G3 |
| sub の pairwise 既定の採否（D10-1） | ADR-021（DEC-3） | G3 |
| grant export/import の製品評価（D11-1） | ADR-001（DEC-3） | G3 |
| 要員増分と費用の金額（NA-08、DL-33） | CTO | G3〜G4 |
| 最終起草者が新たに照合した原典（IANA JWT Claims registry、RFC 8417、RFC 7519、OIDC Core §8、VC DM 2.0、OpenID IDA）の照合ログを traceability/ に追記し、作成者以外が検証する | 照合ログの所有者 | G3 |
| OIDF 適合試験と pentest（§7.2） | CISO、独立評価者 | G5 |
| 判定者採点は模擬パネルの自己レビューであり、実在の CTO/CISO の決裁は未達 | CTO・CISO | G3 |

---

## 参考文献

[^1]: IETF (T. Lodderstedt, J. Bradley, A. Labunets, D. Fett)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.1.1, §2.1.2, §2.2.1, §2.2.2, §2.3, §2.4, §2.5, §4.3.2, §4.9.3, §4.10.1, §4.13, §4.14.2、確認日: 2026-10-03）RS-04#1〜#39
[^2]: OpenID Foundation FAPI WG『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: Introduction, §5.2, §5.3.2.1, §5.3.2.2, §5.3.4, §5.4, §6.2, §6.3、確認日: 2026-10-03）RS-04#41〜#49
[^3]: OpenID Foundation FAPI WG『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5, §6, §8、確認日: 2026-10-03）RS-04#50
[^4]: OpenID Foundation FAPI WG『FAPI 2.0 Message Signing』Final, 2025-09-25. https://openid.net/specs/fapi-message-signing-2_0-final.html （参照箇所: Introduction, §5、確認日: 2026-10-03）RS-04#51
[^5]: IETF (D. Fett ほか)『RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)』2023-09. https://www.rfc-editor.org/rfc/rfc9449 （参照箇所: §2, §4.3, §5, §6, §7.2, §10, §11.1〜§11.4、確認日: 2026-10-03）RS-04#54〜#58
[^6]: IETF (B. Campbell ほか)『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3, §6.3, §6.5、確認日: 2026-10-03）RS-04#59
[^7]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §2.2, §2.2.1, §2.2.2, §2.2.3, §2.2.3.1, §4, §5, §6、確認日: 2026-10-03）RS-04#60, #61
[^8]: IETF (Y. Sheffer, D. Hardt, M. Jones)『RFC 8725: JSON Web Token Best Current Practices』BCP 225, 2020-02. https://www.rfc-editor.org/rfc/rfc8725 （参照箇所: §3.1, §3.8, §3.11, §3.12、確認日: 2026-10-03）RS-04#62、RS-11#51
[^9]: IETF (J. Richer, Ed.)『RFC 7662: OAuth 2.0 Token Introspection』2015-10. https://www.rfc-editor.org/rfc/rfc7662 （参照箇所: §2.1, §4、確認日: 2026-10-03）RS-04#67
[^10]: IETF (T. Lodderstedt, V. Dzhuvinov)『RFC 9701: JSON Web Token (JWT) Response for OAuth Token Introspection』2025-01. https://www.rfc-editor.org/rfc/rfc9701 （参照箇所: §5, §8.1、確認日: 2026-10-03）RS-04#68
[^11]: IETF (T. Lodderstedt, Ed. ほか)『RFC 7009: OAuth 2.0 Token Revocation』2013-08. https://www.rfc-editor.org/rfc/rfc7009 （参照箇所: §2, §3 Implementation Note、確認日: 2026-10-03）RS-04#69
[^12]: IETF (M. Jones ほか)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1, §4.1, §4.4、確認日: 2026-10-03）RS-04#66
[^13]: IETF (A. Parecki, P. De Ryck, D. Waite)『RFC 10017: OAuth 2.0 for Browser-Based Applications』BCP 212, 2026-08. https://www.rfc-editor.org/rfc/rfc10017 （参照箇所: §6.1.3, §6.1.4.3, §6.3.2.3, §6.3.4.2.2, §6.3.4.3, §9.2、確認日: 2026-10-03）RS-04#73〜#75、RS-17#2〜#4
[^14]: IETF (V. Bertocci, B. Campbell)『RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §3, §6.1、確認日: 2026-10-03）RS-04#72
[^15]: IETF (B. Campbell, J. Bradley, H. Tschofenig)『RFC 8707: Resource Indicators for OAuth 2.0』2020-02. https://www.rfc-editor.org/rfc/rfc8707 （参照箇所: §2、確認日: 2026-10-03）RS-04#65
[^16]: IETF (T. Lodderstedt, J. Richer, B. Campbell)『RFC 9396: OAuth 2.0 Rich Authorization Requests』2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §5, §9, §12、確認日: 2026-10-03）RS-04#64
[^17]: OpenID Foundation『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: §4.1.1, §4.1.5、確認日: 2026-10-03）RS-04#77
[^18]: IETF OAuth WG (T. Looker ほか)『Token Status List』draft-ietf-oauth-status-list-21, 2026-06-21（Internet-Draft、状態: draft、RFC Ed Queue）. https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/ （参照箇所: rev 21、Abstract, §1.1、確認日: 2026-10-03）RS-04#80
[^19]: IETF Datatracker『draft-ietf-oauth-v2-1』. https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ （参照箇所: rev 16、WG Document、I-D Exists、状態: draft、確認日: 2026-10-03）RS-04#76
[^20]: IETF Datatracker『draft-ietf-oauth-rfc8725bis』. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: rev 10、RFC Ed Queue、RFC Editor 状態 Blocked、状態: draft、確認日: 2026-10-03）RS-04#63
[^21]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、WG Consensus: Waiting for Write-Up、IESG 未提出、状態: draft）. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §6, §9.1, §9.2, §12.2, §13.1, §13.2, §13.12, §13.13, §15.2、確認日: 2026-10-03）RS-06#31, #35, #36, #41, #42
[^22]: NIST『SP 800-63B-4 Digital Identity Guidelines: Authentication and Authenticator Management』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.2.3, §2.3.3, §5.1, §5.2、確認日: 2026-10-03）RS-03#43, #44
[^23]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6, §6.1, §6.2, §7.2, §8、確認日: 2026-10-03）RS-10#16〜#18
[^24]: W3C『Propagation format for distributed context: Baggage』W3C Candidate Recommendation Snapshot, 2024-05-30（状態: CR）. https://www.w3.org/TR/baggage/ （参照箇所: Security Considerations, Privacy Considerations、確認日: 2026-10-03）RS-10#19
[^25]: IETF (P. Hunt, Ed., M. Jones, W. Denniss, M. Ansari)『RFC 8417: Security Event Token (SET)』Proposed Standard, 2018-07. https://www.rfc-editor.org/rfc/rfc8417 （参照箇所: §2.2 "txn"（OPTIONAL、関連する JWT の相関、SET 以外の profile でも使用可）、確認日: 2026-10-03。research ノート未収録のため最終起草者が原典を照合）
[^26]: W3C Verifiable Credentials WG『Verifiable Credentials Data Model v2.0』W3C Recommendation, 2025-05-15. https://www.w3.org/TR/vc-data-model-2.0/ （参照箇所: §4.9 Validity Period, §4.10 Status（"Credential status specifications MUST NOT enable tracking of individuals"）, §4.11 Data Schemas, §5.5 Terms of Use, §5.6 Evidence, §8.4 Identifier-Based Correlation（非規範）, §8.9 The Principle of Data Minimization（非規範）、確認日: 2026-10-03。research ノート未収録のため最終起草者が原典を照合）
[^27]: OpenID Foundation eKYC & IDA WG『OpenID Identity Assurance Schema Definition 1.0』Final, 2024-10-01. https://openid.net/specs/openid-ida-verified-claims-1_0-final.html （参照箇所: §5.2 verified_claims, §5.4.2 verification（trust_framework, time, evidence）、確認日: 2026-10-03。research ノート未収録のため最終起草者が原典を照合）
[^28]: IANA『JSON Web Token (JWT) — JSON Web Token Claims』registry. https://www.iana.org/assignments/jwt/jwt.xhtml （参照箇所: txn（RFC 8417 §2.2）, sid（OIDC Front-Channel Logout §3）, act・may_act・client_id・scope（RFC 8693）, cnf（RFC 7800）, authorization_details（RFC 9396）, acr・amr・auth_time（OIDC Core）, roles・groups・entitlements（RFC 7643, RFC 9068）, jti（RFC 7519）, verified_claims（OpenID IDA）の登録行。tid・tenant・org_id・aal・ial が未登録であること、確認日: 2026-10-03。research ノート未収録のため最終起草者が原典を照合）
[^29]: IETF (M. Jones, J. Bradley, N. Sakimura)『RFC 7519: JSON Web Token (JWT)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §4, §4.1.7, §4.2, §4.3、確認日: 2026-10-03。§4 は RS-16#14、§4.1.7・§4.2・§4.3 は最終起草者が原典を照合）
[^30]: IETF (M. Jones, J. Bradley, N. Sakimura)『RFC 7515: JSON Web Signature (JWS)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7515 （参照箇所: §4.1.11 "crit"、確認日: 2026-10-03）RS-16#16
[^31]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §2（sub: "locally unique and never reassigned"）, §5.7, §8（public／pairwise）、確認日: 2026-10-03。§2・§5.7 は RS-03#58、§8 は最終起草者が原典を照合）
[^32]: Cyber Safety Review Board『Review of the Summer 2023 Microsoft Exchange Online Intrusion』2024-03-20. https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf （参照箇所: p.17, p.20–21 Recommendation 6、確認日: 2026-10-03）RS-12#10, #11
[^33]: Microsoft Security Response Center『Results of Major Technical Investigations for Storm-0558 Key Acquisition』2023-09-06（2024-03-12 追記）. https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition （参照箇所: 「Why a consumer key was able to access enterprise mail」、確認日: 2026-10-03）RS-12#5
[^34]: Dirk-jan Mollema『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: 「The fatal flaw leading to cross-tenant compromise」、確認日: 2026-10-03）RS-12#53
[^35]: Google Threat Intelligence Group『Widespread Data Theft Targets Salesforce Instances via Salesloft Drift』2025-08-26（08-28 追記）. https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift （参照箇所: Update 段落、Overview、確認日: 2026-10-03）RS-12#37
[^36]: GitHub『Security alert: Attack campaign involving stolen OAuth user tokens issued to two third-party integrators』2022-04-15. https://github.blog/news-insights/company-news/security-alert-stolen-oauth-user-tokens/ （参照箇所: 冒頭、確認日: 2026-10-03）RS-12#59
[^37]: Microsoft Learn『Protect against consent phishing』ms.date 2023-12-11. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/protect-against-consent-phishing （参照箇所: Mitigating consent phishing attacks、確認日: 2026-10-03）RS-13#61
[^38]: Amazon Web Services『Avoiding fallback in distributed systems』Amazon Builders' Library（Wayback 2024-08-16 取得版）. https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ （参照箇所: Distributed fallback、確認日: 2026-10-03）RS-09#14
[^39]: Google『Building Secure and Reliable Systems』Chapter 9, 2020. https://google.github.io/building-secure-and-reliable-systems/raw/ch09.html （参照箇所: Time 節、確認日: 2026-10-03）RS-09#36
[^40]: Amazon Web Services『REL11-BP05 Use static stability to prevent bimodal behavior』Well-Architected Reliability Pillar. https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_withstand_component_failures_static_stability.html （参照箇所: 冒頭定義、確認日: 2026-10-03）RS-09#15
[^41]: Microsoft Azure『RCA - Authentication errors across multiple Microsoft services (LN01-P8Z)』2021-03（Wayback 2021-04-02 取得版）. https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ （参照箇所: Root Cause and Mitigation、確認日: 2026-10-03）RS-12#57
[^42]: M.B. Jones, O. Steele『RFC 9864: Fully-Specified Algorithms for JOSE and COSE』Standards Track, 2025-10. https://www.rfc-editor.org/rfc/rfc9864 （参照箇所: Abstract, §4.1.2, §4.2.2, §4.4、確認日: 2026-10-03）RS-11#43
[^43]: European Commission『Commission Delegated Regulation (EU) 2018/389』OJ L 69, 2018-03-13. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 （参照箇所: Art. 4(3)、確認日: 2026-10-03）RS-13#39
[^44]: IETF (P. Kasselman, D. Fett, F. Skokan)『RFC 10027: Best Current Practice for Security of Cross-Device Flows』BCP 247, 2026-08. https://www.rfc-editor.org/rfc/rfc10027 （参照箇所: §2, §6.2.1.5、確認日: 2026-10-03）RS-13#57
[^45]: OpenID Foundation『FAPI 2.0 Security Profile and FAPI 2.0 Message Signing: Final Conformance Tests and Certifications Now Available』2025-07-09. https://openid.net/fapi2-0-final-conformance-tests-available/ （参照箇所: 本文、確認日: 2026-10-03）RS-04#52
[^46]: Cloudflare『The impact of the Salesloft Drift breach on Cloudflare and our customers』2025-09-02. https://blog.cloudflare.com/response-to-salesloft-drift-incident/ （参照箇所: 冒頭 2 段落、Timeline（2025-08-09〜08-17、08-23）、Exposure analysis（104 API tokens）、確認日: 2026-10-03）RS-12#41
[^47]: Google Cloud『Google Cloud Infrastructure Components Incident #20013（2020-12-14 User ID Service）』. https://status.cloud.google.com/incident/zall/20013 （参照箇所: ISSUE SUMMARY、ROOT CAUSE、DETAILED DESCRIPTION OF IMPACT、確認日: 2026-10-03）RS-12#58
[^48]: Google Cloud『Securing your app with signed headers』Identity-Aware Proxy 文書, 2026-09-30 更新. https://docs.cloud.google.com/iap/docs/signed-headers-howto （参照箇所: 冒頭（secondary security）, Verifying the JWT header / payload、確認日: 2026-10-03）RS-17#79
[^49]: NIST『IR 8547 ipd Transition to Post-Quantum Cryptography Standards』Initial Public Draft, 2024-11-12（状態: ipd）. https://csrc.nist.gov/pubs/ir/8547/ipd （参照箇所: §4.1.1 Table 2、確認日: 2026-10-03）RS-11#8
[^50]: M. Prorock, O. Steele『RFC 9964: ML-DSA for JOSE and COSE』Standards Track, 2026-05. https://www.rfc-editor.org/rfc/rfc9964 （参照箇所: §3, §5 Table 1、確認日: 2026-10-03）RS-11#41
[^51]: Microsoft『Configure how users consent to applications』Microsoft Entra ID, Microsoft Learn, ms.date 2025-06-15. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent （参照箇所: 既存の同意に関する注記、確認日: 2026-10-03）RS-17#62
