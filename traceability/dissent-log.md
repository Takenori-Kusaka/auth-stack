# 見解相違ログ（CTO/CISO レビュー側の参照・主張の補正）

> 文書ID: TRC-07（暫定。DL-106。パスは §1 参照） / 版: 0.1 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-197, R-198, R-199（DL-106 の範囲）。G-xxx は未確定（traceability/G-goal-criteria.md の確定後に追記）
> 依存文書: CONVENTIONS.md, 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md, traceability/citation-audit-review.md, traceability/seed/seed-03-redteam-decision.md, traceability/deliverables.md, 01_governance/assumptions-register.md

## 1. 本書の位置付け

- 本書は、CTO/CISO レビュー[^1]（以下「レビュー」）の参照と主張のうち、再提案で補正して受け入れるものを記録する [D]。
- 再提案はレビューの指摘を受け入れる。そのうえで、レビューが根拠とした資料も原典で確かめ、旧版の参照や強度の写し違いまでは引き継がない。seed-03 D3 が求める作業である[^2] [D]。
- 本書の記録は反論ではない。22 件のどれも、レビューの判定（本番基盤としては不承認、Phase 0 の高保証設計・実証だけ条件付き承認）と「重大な不足」の指摘を覆さない。補正の対象は、根拠とした資料、規範の強度、適用範囲、帰属である [D]。
- 照合の詳細（51 件の明細、判定、方法、未監査の範囲）は、引用監査（レビュー側）[^3]にある。本書の「照合 #n」は、同書 §4 の参照番号 n を指す [D]。
- パスについて: deliverables.md は DL-106 を traceability/disagreement-log.md（TRC-07）に割り当てている[^4]。本書は再提案プログラムの指示により traceability/dissent-log.md として作成した。統合・改名の判断は TRC-03 の管理者に委ねる [D]。

### 1.1 記録の書き方

- 各項目には ID（DS-xx）、レビュー原文の行と主張、問題、根拠となる一次資料、再提案での扱い、重要度、方向性への立場、閉じ方（CONVENTIONS §6）、持込み先（DL）、状態を書く [D]。
- 行番号は、2026-10-03 時点のレビューファイルの行である。レビューの脚注は「レビュー脚注 #n」と書き、本書の脚注と区別する [D]。
- レビュー原文の引用は照合の対象であり、主張タグを付けない。原典の記述には、原典の種別に応じて [N]・[V] を付ける。§3 の [N] 原典ではない文書（調査レポート、個人記事、ブログ、他機関の文書）の記述内容は、照合記録に基づく [D] とし、照合 #n を併記する[^5] [D]。
- 重要度: 高 = そのまま引き継ぐと再提案の要求・設計・適用範囲を誤る。中 = 方向は維持できるが、根拠の差替えや帰属・用語・範囲・強度の補正が要る。低 = 書き方や条件の明記で足りる [D]。
- 方向性への立場: 「同意」= レビューの指摘の方向に同意し、根拠や強度を補正する。「一部相違」= 性格付けや解釈の一部について、原典に基づき異なる見解を持つ [D]。

## 2. 一覧

| DS | 行 | 種類 | 重要度 | 立場 | 再提案での扱い（要旨） | 持込み先 |
|---|---|---|---|---|---|---|
| DS-01 | 7, 37, 41, 202 | 強度の写し違い（強め） | 低 | 同意 | should・Ideally を原典どおりに写す。必須化は [D] として理由を書く | DL-105, DL-28 |
| DS-02 | 15 | 二次情報・帰属・方向の逆転 | 中 | 同意 | CTO の責務は RACI で組織決定（[D]、閉じ方 B）。EY は使うなら [M] | DL-04 |
| DS-03 | 27 | 帰属 | 低 | 同意 | 個人著者の記事として帰属させ、句ごとに脚注を分ける | DL-04 |
| DS-04 | 29 | 帰属・要素の脱落 | 低 | 同意 | 長官ブログとして帰属させる。顧客への可視性を受容票の項目に加える | DL-05, DL-24, DL-39 |
| DS-05 | 29 | 用語・主体 | 中 | 同意 | リスク選好と許容度を分けて定義し、選好の定義主体を原典どおりに書く | DL-01, DL-39 |
| DS-06 | 39, 51 | 適用範囲 | 中 | 同意 | SP 800-207 を [N] とする範囲を限定し、一般利用者側は別の原典と [D] で支える | DL-48, DL-54, DL-12 |
| DS-07 | 40 | 二次情報・強度 | 低 | 同意 | CSA の原典と CCM の統制 ID で引き直す。JIT の必須化は [D] | DL-28, DL-26 |
| DS-08 | 42 | 撤回版の参照 | 高 | 同意 | SP 800-53A Rev.5 を引く | DL-07, DL-30, DL-28 |
| DS-09 | 42 | 他機関文書・適用の論理 | 中 | 同意 | SP 800-53B を引き、民間 SaaS への適用は [D] とする | DL-07, DL-30, DL-59 |
| DS-10 | 54 | 性格付けの相違 | 中 | 一部相違 | SSDF は実践の枠組み、ASVS は検証要件として分けて扱う | DL-28, DL-32, DL-84 |
| DS-11 | 54, 153 | 版ずれ | 高 | 同意 | ASVS 5.0.0 の章・要件 ID で受入基準を書く。脅威モデルの受入は自前で定める | DL-61, DL-10, DL-11, DL-30 |
| DS-12 | 58 | 文書の取り違え・退役版 | 高 | 同意 | PCI DSS v4.0.1 本体で引き、本文の取得までは未確認と明記する | DL-34, DL-28, DL-03 |
| DS-13 | 99 | 条件の省略 | 中 | 同意 | 回復の 3 条件と SHALL を原典どおりに写す | DL-08, DL-09 |
| DS-14 | 107 | 強度の写し違い（弱め） | 高 | 同意 | FAL2 では RP 起点を必須とし、IdP 起点 SAML を既定で無効にする | DL-16, DL-26, DL-12, DL-22 |
| DS-15 | 111 | 適用文脈 | 低 | 同意 | 構成条件と整合性指定を対応付けて書く | DL-17, DL-13 |
| DS-16 | 113 | 強度の写し違い（強め） | 低 | 同意 | 必須化は再提案の [D]、OpenFGA の推奨は [V] として分ける | DL-17, DL-65, DL-31 |
| DS-17 | 117 | 製品固有の指針の一般化 | 低 | 同意 | AVP は [V] の例示、共通 PDP の議論は [D] とする | DL-18 |
| DS-18 | 123 | 条件の省略 | 低 | 同意 | mix-up 対策の適用条件を写し、該当する client を列挙する | DL-16 |
| DS-19 | 53, 125 | 参照先・日付 | 低 | 同意 | Attacker Model と認証プログラムのページで引き直す | DL-84, DL-60 |
| DS-20 | 190 | 出典と強度 | 中 | 同意 | token 種別ごとに検証規則を分け、RFC 9068 §4 を加える。8725bis を監視する | DL-16, DL-75, DL-84 |
| DS-21 | 190 | 他社製品文書・根拠欠落 | 中 | 同意 | DPoP の限界は RFC 9449、BFF は RFC 10017 で引く | DL-16, DL-54 |
| DS-22 | 260–362 | 参考文献の形式 | 中 | 同意 | レビューの参考文献を転記せず、原典を §4 形式で引き直す | DL-29, DL-105, DL-83 |

重要度の内訳は、高 4 件、中 9 件、低 9 件である。立場の内訳は、同意 21 件、一部相違 1 件（DS-10）である [D]。

## 3. 各項目

### DS-01 規範強度の写し（推奨・ガイダンスを義務として記述）

- **レビュー原文**: 7 行「OWASP も脅威モデリングを…残余リスクの受容理由と検証可能性を記録するよう求めている」（レビュー脚注 #1）。37 行「NIST CSF 2.0 は…Govern、Identify、Protect、Detect、Respond、Recover を同時並行で回す」（#8, #9）。41 行「NIST SSDF は…リスクを設計・アーキテクチャで緩和することを求める」（#15–#17）。202 行「SSDF が求めるのは一度の審査ではなく…継続的工程である」（#15）。
- **問題**:
  - OWASP Threat Modeling Cheat Sheet は、コミュニティのガイダンスである。検証可能性は、Review and Validation 節の確認質問（"Can the agreed upon mitigations be tested?"）として書かれている[^6] [D]（照合 #1）。
  - CSF 2.0 は、機能の同時並行について "The Functions should be addressed concurrently." と should で書いている（§2、p.5）[^7] [N]。企業リスクと並べて扱う点も "Ideally, the CSF will be used to address cybersecurity risks alongside other risks of the enterprise" と書いている（Preface、p.iv）[^7] [N]。
  - SSDF は "secure software development practices should be integrated throughout it" と書いている（§1、p.1）[^8] [N]。PW.1 も、設計とアーキテクチャがリスクをどう緩和すべきかを決めることを推奨の形で述べている（p.11）[^8] [N]。
- **根拠となる一次資料**: NIST CSWP 29[^7]、NIST SP 800-218[^8]、OWASP Threat Modeling Cheat Sheet[^6]。
- **方向性への立場**: 同意。脅威モデリング、CSF 2.0、SSDF を採用する方向は変えない [D]。
- **再提案での扱い**: 原典の強度（should・Ideally）をそのまま写す [D]。OWASP Cheat Sheet は手法の参照に限り、[N] の根拠にしない [D]。再提案で必須とする場合は、自社の設計判断 [D] として理由を書く [D]。
- **閉じ方・持込み先**: A 机上／DL-105（主張台帳）、DL-28（統制マッピング台帳）。
- **状態**: 記録済。レビュー作成者への照会は未了。

### DS-02 CTO の責務の根拠

- **レビュー原文**: 15 行「CTO は…事業戦略を技術戦略へ変換し、可用性、変更容易性、運用能力、供給者依存、総所有コスト、人材継続性を含む技術リスクを引き受ける。現代の CTO には…独立リスク評価を行い…役割が求められる」（レビュー脚注 #2）。
- **問題**:
  - 参照先は EY-Parthenon の調査レポートで、欧州のソフトウェア企業の CTO 350 名に 2025 年 5〜6 月に CATI で行った調査である[^9] [D]（照合 #2）。
  - 原文 p.8 は "Translator of strategy, turning technology trends into clear business strategy" であり、変換の向きはレビューの「事業戦略→技術戦略」と逆である[^9] [D]。
  - 可用性から人材継続性までの列挙は原文にない[^9] [D]。
  - "Conduct independent risk assessments"（p.12）は、サイバー成熟度を高める推奨行動の一項目であり、CTO の役割の定義ではない[^9] [D]。
  - 本文に帰属（「EY の調査によれば」）がなく、一般論として読める [D]。
- **根拠となる一次資料**: CTO の責務を規範として定めた原典は、性質上ない [D]。
- **方向性への立場**: 同意。CTO が可用性・供給者依存・人材継続性を含む技術リスクを引き受けるべきだという判断には同意する。ただしこれはレビュー作成者の判断であり、出典の記述ではない [D]。
- **再提案での扱い**: CTO の責務と決裁権は、DL-04（ガバナンス規程・RACI）で組織決定として定める [D]。EY の調査を使う場合は、公開調査値 [M] として母集団・時期・方法を明記する [D]。欧州ソフトウェア企業の調査結果を、日本主体の基盤の前提へ一般化しない [D]。
- **閉じ方・持込み先**: B 組織決定／DL-04。
- **状態**: 記録済。照会は未了。

### DS-03 ISACA の帰属

- **レビュー原文**: 27 行「ISACA は、CISO の責務をセキュリティアーキテクチャ、運用、ガバナンス、リスク、コンプライアンスにまたがるものとし、リスク許容度、脅威規模、緩和費用を経営へ伝える役割を挙げている」（レビュー脚注 #3, #4）。
- **問題**:
  - 2 つの参照先は、ISACA Journal に載った個人著者の記事である（R. Putrus、2019 年 Vol.2[^10]、B. K. Ngac、2021 年 Vol.5[^11]）。ISACA の公式見解ではない [D]（照合 #3, #4）。
  - 前半（アーキテクチャから コンプライアンスまで）は Ngac の記事の導入部にあり、後半（経営への伝達）は Putrus の記事にある。2 つの脚注が文末にまとめて付いている [D]。
  - Putrus の記事は risk appetite と acceptable risk level を併記している。「リスク許容度」は後者に近い訳である[^10] [D]。
  - Ngac の記事の主題は vCISO（外部委託の CISO）で、CISO の定義は導入部の一般論である[^11] [D]。
- **根拠となる一次資料**: CISO の責務を規範として定めた原典は、性質上ない [D]。
- **方向性への立場**: 同意。CISO はリスクを経営の言葉に翻訳する責任者だという趣旨に同意する [D]。
- **再提案での扱い**: 「ISACA Journal 掲載記事（Putrus, 2019; Ngac, 2021）は」と著者に帰属させ、句ごとに脚注を分ける [D]。CISO の責務は DL-04 で組織決定として定める [D]。
- **閉じ方・持込み先**: B 組織決定／DL-04。
- **状態**: 記録済。照会は未了。

### DS-04 CISA の帰属と脱落した要素

- **レビュー原文**: 29 行「CISA は、コスト、機能、速度をセキュリティより優先する判断は CEO・取締役会が透明に所有すべきであり、CISO には影響力と資源を与えるべきだとしている」（レビュー脚注 #5–#7 の文末まとめ付け）。
- **問題**:
  - 参照先（#7）は CISA サイトのブログ記事で、著者は当時の長官 Jen Easterly、公開は 2025-01-08 である。ページには "Archived Content … may not reflect current policy or programs" の注記がある[^12] [D]（照合 #7）。CISA の公式ガイダンスでも勧告でもない [D]。
  - 原文は "Decisions to prioritize cost, features, or speed to market over security must be made transparently, with clear ownership by the Chief Executive Officer and Board and visibility by potentially impacted customers." である。レビューの要約では「影響を受け得る顧客への可視性」が落ちている[^12] [D]。
  - CISO に影響力と資源を与える主体は、原文では取締役会（"Board members … should ensure"）である[^12] [D]。
  - 段落末に 3 つの脚注がまとめて付いており、CISA の文と NACD の文のどちらにどの脚注が対応するか判別できない [D]。
- **根拠となる一次資料**: 該当なし。ブログは [N]・[I] の根拠にならない（CONVENTIONS §3）[^5] [D]。
- **方向性への立場**: 同意。セキュリティより他を優先する判断の所有者を、CISO 個人ではなく CEO・取締役会とする考え方に同意する [D]。
- **再提案での扱い**: 「CISA 長官（当時）のブログ（2025-01-08、現在アーカイブ）」と帰属させ、[N]・[I] のタグを付けない [D]。上の考え方は、再提案の設計判断として DL-05（例外・リスク受容手順）と DEC に採用する [D]。影響を受け得る顧客への可視性を、DL-05 の受容票の項目と、DL-24 の顧客通知判断の入力に加える [D]。
- **閉じ方・持込み先**: B 組織決定／DL-05, DL-24, DL-39。
- **状態**: 記録済。照会は未了。

### DS-05 リスク選好（appetite）とリスク許容度（tolerance）

- **レビュー原文**: 29 行「NACD も、取締役会がリスク許容度を定め、経営が継続評価と透明な報告を伴うリスクベースのプログラムを実行する分担を示している」（レビュー脚注 #5, #6）。
- **問題**:
  - NACD/ISA のハンドブック第 5 版の Principle Four（印刷頁 21）は "the board provides strategic oversight and works with management to define the organization's risk appetite; management executes those directives through a risk-based program, continuous assessment, and transparent reporting." と書いている[^13] [D]（照合 #5, #6）。同じ原則は "board-approved risk appetite" とも書いている[^13] [D]。
  - したがって原文では、risk appetite は取締役会が経営と協働して定義し、取締役会が承認する。レビューの「取締役会がリスク許容度を定め」は、取締役会が単独で決めるように読める [D]。
  - さらにレビューは appetite を「許容度」と訳している。CSF 2.0 は "GV.RM-02: Risk appetite and risk tolerance statements are established, communicated, and maintained" と、選好と許容度を別のものとして扱う（Appendix A）[^7] [N]（RS-01#3[^14]）。
  - #5 と #6 は同じ原典（Principle Four）の PDF 版とウェブ版である [D]。
- **根拠となる一次資料**: NIST CSWP 29 GV.RM-02[^7]。NACD/ISA のハンドブックは役割分担の参考資料として扱う[^13]。
- **方向性への立場**: 同意。取締役会が監督し、経営がリスクベースのプログラムを実行するという分担の骨子に同意する [D]。
- **再提案での扱い**: DL-01（リスク選好・許容度ステートメント）で、リスク選好（risk appetite）とリスク許容度（risk tolerance）を別の項目として定義する [D]。選好は「取締役会が経営と協働して定義し承認する」と原典どおりに書く [D]。許容度の設定主体と承認経路は、再提案の決裁事項として DEC で決める [D]。
- **閉じ方・持込み先**: B 組織決定／DL-01, DL-39。
- **状態**: 記録済。照会は未了。

### DS-06 Zero Trust 原則の適用範囲

- **レビュー原文**: 39 行「NIST SP 800-207 は、ネットワーク位置や資産所有だけで信頼せず…資源を保護対象とする」（レビュー脚注 #11, #12）。51 行（基準表）「Zero Trust: 人・端末・ワークロード・資源単位の継続的評価、制御面とデータ面の分離」（#11, #12）。
- **問題**:
  - 39 行と 51 行の要約は、SP 800-207 の Abstract、§2.1、§2.2、§3.4 で支持される[^15] [N]。
  - 一方で SP 800-207 §2.1（p.7）は、tenets を "not to anonymous public or consumer-facing business processes" には適用しないと明記している[^15] [N]。
  - 本基盤は、基準シナリオで一般利用者（B2C）27 万人を含む[^16] [A-002]。レビューの基準表は、主体を区別せずに 800-207 を基準としている [D]。
- **根拠となる一次資料**: NIST SP 800-207 §2.1（p.6–7）、§2.2（p.7）、§3.4（p.21–22）[^15]。
- **方向性への立場**: 同意。継続的評価、資源単位の保護、制御面とデータ面の分離という方向は維持する [D]。
- **再提案での扱い**: SP 800-207 を [N] の根拠にする範囲は、社内従業員・管理者・workload を中心とする [D]。B2B 顧客企業の利用者への適用は、設計判断 [D] として理由を書く [D]。一般利用者向けの継続評価（session 管理、再認証、リスクに応じた step-up）は、SP 800-63B-4 の再認証要件などの別の原典と、設計判断 [D] で根拠付ける [D]。主体ごとの適用区分は DL-48（主体カタログ）と DL-54 に記し、方式の選択は ADR として DL-12 に記録する [D]。
- **閉じ方・持込み先**: A 机上／DL-48, DL-54, DL-12。
- **状態**: 記録済。照会は未了。

### DS-07 クラウド IAM の「基本」の根拠

- **レビュー原文**: 40 行「クラウド IAM では MFA、JIT、PBAC/ABAC、ライフサイクル管理、全 IAM 変更の監視が基本であり、提供者と利用者の責任分界も明確にする必要がある」（レビュー脚注 #13, #14）。
- **問題**:
  - #13 は CSA サイトに載った外部寄稿のブログで、著者は Accedere 社の CEO である[^17] [D]（照合 #13）。CONVENTIONS §3 では二次情報を根拠に使わない[^5] [D]。
  - 同じ記事でも JIT は "Assess and adopt more modern IAM processes ... such as ... JIT access" という検討・採用の扱いで、「基本」ではない[^17] [D]。ライフサイクル管理は明示されていない [D]。
  - #14（CCM の入門ガイド）は、最小権限、職務分離、MFA、RBAC・ABAC、ID のライフサイクル、利用者の活動の監視、SSRM による責任分界を述べている。しかし JIT、PBAC、全 IAM 変更の監視の記述はない [D]（照合 #14）。
- **根拠となる一次資料**: CSA『Security Guidance v5』Domain 5（成果物ページは確認済み、本文 PDF はログインが必要で未確認）[^18]。CSA『CCM and CAIQ v4.1』の IAM ドメイン（統制本文は未確認）[^19]。
- **方向性への立場**: 同意。挙げられた要素を IAM 統制に含める方向に同意する [D]。
- **再提案での扱い**: MFA、ABAC、ライフサイクル、責任分界は、CCM v4.1 の統制 ID で引き直す（本文の取得後）[D]。特権アクセスの JIT を必須とするのは、再提案の設計判断 [D] として理由を書く [D]。原典の本文を確認するまでは「未確認」と明記し、結論に使わない [D]。
- **閉じ方・持込み先**: A 机上／DL-28, DL-26。
- **状態**: 記録済。照会は未了。

### DS-08 撤回済みの SP 800-53A Rev.4 の参照

- **レビュー原文**: 42 行「NIST 系の評価実務でも CA-2 の独立評価、CA-8 の独立侵入試験が置かれる」（レビュー脚注 #18, #19）。
- **問題**:
  - #19 は NIST SP 800-53A Rev.4（2014-12）である。CSRC 上では 2023-01-25 に撤回され、Rev.5 に置き換えられている（監査記録による）[^20] [D]（照合 #19）。
  - #19 の統制名は旧称（"INDEPENDENT PENETRATION AGENT OR TEAM"）である。Rev.5 では "Independent Penetration Testing Agent or Team" に改められている[^21] [N]。
  - 53A は評価手順書であり、高影響システムでどの統制が必須か（ベースラインの割当）は書かれていない。割当は SP 800-53B の範囲である（DS-09）[^22] [N]。
  - seed-03 D3 が、この参照を補正の例として挙げている[^2] [D]。
- **根拠となる一次資料**: NIST SP 800-53A Rev.5 の Chapter Four、CA-02(01) Control Assessments | Independent Assessors（p.162）と CA-08(01) Penetration Testing | Independent Penetration Testing Agent or Team（p.173）[^21]。研究ノートでも、Rev.5 の評価方法を確認している（RS-08#12[^23]）。
- **方向性への立場**: 同意。独立評価と独立侵入試験を求めるという結論に同意する [D]。
- **再提案での扱い**: SP 800-53A Rev.5 を引き、Rev.4 は引かない [D]。CSRC 上の現行の状態（Release 5.2.0、2025-08-27）を DL-84（標準ステータス台帳）に記録する [D]。
- **閉じ方・持込み先**: A 机上（評価の実施は D 第三者）／DL-07, DL-30, DL-28。
- **状態**: 記録済。照会は未了。

### DS-09 「高影響システムでは必要」の根拠と適用の論理

- **レビュー原文**: 42 行「高影響システムでは、実装チーム自身の説明だけでなく、独立評価者による統制評価と侵入試験が必要である」（レビュー脚注 #18, #19）。
- **問題**:
  - #18 は米国教育省の内部標準（IT Assessment, Authorization, and Monitoring (CA) Standard v5.5、2025）で、SP 800-53 Rev.5 を省内向けに実装したものである。NIST の原典ではない[^24] [D]（照合 #18）。
  - ベースラインの原典は SP 800-53B で、Table 3-4（p.23）は CA-2(1) Independent Assessors を MODERATE と HIGH に、CA-8 Penetration Testing と CA-8(1) Independent Penetration Testing Agent or Team を HIGH に割り当てている[^22] [N]。
  - これらは米国連邦の情報システム向けのベースラインである。民間の SaaS 基盤に「必要」と書くのは類推である [D]。
- **根拠となる一次資料**: NIST SP 800-53B §3 Table 3-4（p.23）[^22]。研究ノートでもベースラインの収録状況を確認している（RS-08#14[^23]）。
- **方向性への立場**: 同意。独立評価と独立侵入試験を Gate の条件にするという結論に同意する [D]。
- **再提案での扱い**: SP 800-53B を [N] として引く [D]。そのうえで、本基盤への適用は「連邦の HIGH ベースラインを参考に、独立評価と独立侵入試験を Gate 条件にする」という設計判断 [D] として書く [D]。独立評価の実施は閉じ方 D（第三者）とし、DL-07、DL-30、DL-59 に持ち込む [D]。
- **閉じ方・持込み先**: A 机上（実施は D 第三者）／DL-07, DL-30, DL-59。
- **状態**: 記録済。照会は未了。

### DS-10 SSDF の性格付け

- **レビュー原文**: 54 行（基準表）「セキュア開発｜NIST SSDF 1.1、OWASP ASVS 5.0｜要件、設計、認証、セッション、アクセス制御、暗号、API の検証可能なチェックリスト」（レビュー脚注 #15, #31, #32）。
- **問題**:
  - SSDF は §1（p.3）で "The intention of the SSDF is not to create a checklist to follow" と明記している[^8] [N]。
  - SSDF は、組織準備（PO）、ソフトウェアの保護（PS）、安全なソフトウェアの生成（PW）、脆弱性への対応（RV）の 4 群の実践を定める（§2、p.4）[^8] [N]。認証、セッション、アクセス制御、暗号、API の検証項目は列挙していない [D]（照合 #15）。
  - レビューは SSDF を ASVS と同じ「検証可能なチェックリスト」として扱っている。SSDF 自身の位置付けと異なる [D]。
  - SSDF には後継の SSDF 1.2（SP 800-218r1）が Initial Public Draft として 2025-12-17 に公開されている。2026-10-03 時点で Final は出ていない[^25] [N]。
- **根拠となる一次資料**: NIST SP 800-218 §1（p.1、p.3）、§2（p.4）[^8]。NIST CSRC の SP 800-218 のページ[^25]。
- **方向性への立場**: 一部相違。SSDF を採用することには同意する。一方、SSDF を検証チェックリストとする性格付けには、原典の記述に基づき異なる見解を持つ [D]。
- **再提案での扱い**: SSDF は開発組織の実践の枠組みとして、DL-28（統制マッピング台帳）と DL-32（継続保証計画）に task 単位（PO/PS/PW/RV）で対応付ける [D]。検証項目の基準は ASVS 5.0.0 とする（DS-11）[D]。SSDF 1.2 の状態を DL-84 で監視する [D]。
- **閉じ方・持込み先**: A 机上／DL-28, DL-32, DL-84。
- **状態**: 記録済。照会は未了。

### DS-11 ASVS の版ずれ（4.0.3 の解説で 5.0 を説明）

- **レビュー原文**: 54 行（基準表）「OWASP ASVS 5.0｜要件、設計、認証、セッション、アクセス制御、暗号、API の検証可能なチェックリスト」（レビュー脚注 #15, #31, #32）。153 行「OWASP ASVS はアーキテクチャ・脅威モデル、認証、session、アクセス制御を別領域として検証するため、この粒度を受入基準へ落とし込める」（#32）。
- **問題**:
  - #32 は OWASP Developer Guide の解説ページで、ASVS 4.0.3（286 要件、V1 Architecture, Design and Threat Modeling から V14 Configuration までの 14 章）を説明している[^26] [D]（照合 #32）。
  - #31 は ASVS のプロジェクト紹介ページで、規格の本文と章構成を載せていない [D]（照合 #31）。
  - ASVS 5.0.0 は、4.0 からの移行者向けの節（0x05）で、旧 V1 Architecture 章を削除し、要件を関連する章へ再配分したと述べている。脅威モデリングは "Documented Security Decisions" の要件に移っている[^27] [N]。
  - したがって 153 行の「アーキテクチャ・脅威モデルを別領域として検証する」は、レビューが採用する 5.0 には当てはまらない [D]。
- **根拠となる一次資料**: OWASP『Application Security Verification Standard 5.0.0』（2025-05、GitHub タグ v5.0.0）の 0x05-For-Users-Of-4.0 と章一覧[^27]。研究ノートでも ASVS 5.0.0 の性質を確認している（RS-08#1[^23]）。
- **方向性への立場**: 同意。ASVS の粒度で受入基準を作るという方向に同意し、版と章構成を補正する [D]。
- **再提案での扱い**: 受入基準は、ASVS 5.0.0 の章と要件 ID で書く（V4 API and Web Service、V6 Authentication、V7 Session Management、V8 Authorization、V9 Self-contained Tokens、V10 OAuth and OIDC、V11 Cryptography、V15 Secure Coding and Architecture など）[D]。DFD と脅威モデルの受入基準は ASVS の章に頼らず、DL-10（DFD・entry point inventory）と DL-11（脅威カタログ）で自前に定める [D]。自己評価は DL-61、第三者評価の範囲は DL-30 に持ち込む [D]。
- **閉じ方・持込み先**: A 机上（自己評価は C、第三者評価は D）／DL-61, DL-10, DL-11, DL-30。
- **状態**: 記録済。照会は未了。

### DS-12 PCI DSS の参照先（SAQ A と退役版）

- **レビュー原文**: 58 行（基準表）「監査・保証｜SOC 2 Trust Services Criteria、必要時 PCI DSS｜…決済対象時のアカウント・MFA・ログ要件」（レビュー脚注 #38, #39）。
- **問題**:
  - #39 は PCI DSS 本体ではなく、v4.0 用の Self-Assessment Questionnaire A（2022-04）である。カード決済を完全に外部委託した加盟店向けの自己評価票である[^28] [N]。
  - SAQ A は Requirement 8 のうち 8.2 と 8.3 だけを含み、8.4（MFA）と Requirement 10（ログ）を含まない。Requirement 8 の適用も "merchant webservers that host the page(s)" に限られる[^28] [N]。したがってレビューが挙げる MFA とログの要件の根拠にならない [D]。
  - 本基盤はサービスプロバイダとして扱われ得るので、加盟店向けの SAQ A とは対象者も異なる [D]。
  - PCI DSS v4.0 は 2024-12-31 に退役し、その後は v4.0.1 が唯一の有効版である[^29] [N]。v4.0.1 は限定的な改訂で、要件の追加・削除はない[^29] [N]。
  - seed-03 D3 が、この参照を補正の例として挙げている[^2] [D]。
- **根拠となる一次資料**: PCI SSC『PCI DSS: Requirements and Testing Procedures v4.0.1』（2024-06）の Requirement 8（8.2、8.3、8.4）と Requirement 10（10.2）[^30]。本文は利用許諾の手続のため取得できず、未確認である。要件文は、研究ノートが v4.0 の SAQ D for Service Providers で確認している（RS-02#71: 8.4.2 は CDE への全アクセスに MFA を求め、2025-03-31 から必須）[^31]。
- **方向性への立場**: 同意。PCI DSS を決済対象の場合に条件付きで適用するという方向に同意する [D]。
- **再提案での扱い**: PCI DSS は v4.0.1 本体の要件番号で引き、本文を取得するまで「未確認」と明記する [D]。決済関連データは分離スコープ（CONVENTIONS §7）とし、適用の可否は DL-34（法域・規制・契約適用性判定表）で判定する [D]。本文の取得には利用許諾の手続が要るので、取得するかどうかを組織の判断事項とする [D]。
- **閉じ方・持込み先**: A 机上＋B 組織決定（本文取得と適用範囲）／DL-34, DL-28, DL-03。
- **状態**: 記録済。照会は未了。

### DS-13 AAL2 のアカウント回復要件の条件

- **レビュー原文**: 99 行「NIST 800-63B-4 では、OTP の手入力はフィッシング耐性とは見なされず、AAL2 アカウント回復にも二つの異なる回復要素、既存認証器との組合せ、または再本人確認が必要になる」（レビュー脚注 #23, #41, #42）。
- **問題**:
  - SP 800-63B-4 §4.2.2.2 は、AAL2 の回復で CSP に次のいずれかを要求する（SHALL）。(a) 異なる方法で得た回復コード 2 つ、(b) 回復コード 1 つと、加入者アカウントに結び付いた単要素認証器による認証、(c) 再本人確認（アカウントが本人確認済みの場合に限る）[^32] [N]（RS-03#39[^33]）。
  - レビューの「既存認証器との組合せ」は (b) の「回復コード 1 つ」を落としている。「再本人確認」は「本人確認済みのアカウントに限る」という条件を落としている [D]。
  - OTP について、§3.2.5 は "Authenticators that involve the manual entry of an authenticator output (e.g., out-of-band and OTP authenticators) SHALL NOT be considered phishing-resistant" と書いている[^32] [N]。レビューは SHALL NOT の強度を写していない [D]。
  - 3 つの脚注は、同じ原典の別ページである [D]。
- **根拠となる一次資料**: NIST SP 800-63B-4（Final、2025-07）§3.2.5、§4.2.2.2（p.49–50）[^32]。
- **方向性への立場**: 同意。回復・認証器変更・IdP 再連携がアカウント乗っ取りの主要経路だという指摘に同意する [D]。
- **再提案での扱い**: 条件と強度（SHALL・SHALL NOT）を原典どおりに写し、脚注を 1 本（DOI）に統合する [D]。DL-08（ID ライフサイクル仕様）の回復の状態遷移に、(a)〜(c) を分岐として持たせる [D]。(c) は本人確認済みのアカウントだけに適用する [D]。
- **閉じ方・持込み先**: A 机上（回復経路の試験は C）／DL-08, DL-09。
- **状態**: 記録済。照会は未了。

### DS-14 FAL2 要件の強度（SHALL を「重要」と記述）

- **レビュー原文**: 107 行「FAL2 では assertion injection protection が必要で、RP 起点の連携や期待 IdP・audience の厳密検証が重要になる」（レビュー脚注 #43, #44）。
- **問題**:
  - SP 800-63C-4 §2.3 は、FAL2 について "the assertion SHALL be strongly protected from assertion injection attacks" "The federation transaction SHALL be initiated by the RP." と書いている。audience を単一の RP に限ることも SHALL である[^34] [N]（RS-03#49[^33]）。
  - §3.11.1 は、FAL2 以上で必要な injection 対策の一つとして、IdP 起点の federation の禁止を挙げる。外部の当事者が RP に federation の開始を促す場合は禁止の対象外である[^34] [N]（RS-03#50[^33]）。
  - §4.9 は、RP が assertion の発行者（期待する IdP）と audience を検証することを SHALL で定めている[^34] [N]。
  - レビューの「重要になる」は、原典の SHALL より弱い。他の項目と異なり、これは強度を弱める方向の写し違いである [D]。このまま引き継ぐと、B2B 顧客の IdP 起点 SAML を許す設計が FAL2 の範囲に残り得る [D]。
- **根拠となる一次資料**: NIST SP 800-63C-4（Final、2025-07）§2.3（p.6–7）、§3.11.1（p.35–36）、§4.9（p.72）[^34]。
- **方向性への立場**: 同意。指摘の方向に同意し、強度を原典どおりに強める補正を行う [D]。
- **再提案での扱い**: FAL2 を割り当てた連携では、RP 起点を必須とし、IdP 起点 SAML（unsolicited response）を既定で無効にする [D]。顧客の既存の IdP 起点 SSO は、第三者起点ログイン（RP が改めて要求を出す方式）へ置き換える方針とし、移行期間と例外の承認条件を DL-26 と ADR（DL-12）で決める [D]。顧客側で再設定が必要な場合は、移行コストに計上する（seed-03 C4）[^2] [D]。IdP 起点の assertion を拒否することを、PoC の試験ケースとして DL-22 に事前登録する [D]。
- **閉じ方・持込み先**: A 机上＋C 実測／DL-16, DL-26, DL-12, DL-22。
- **状態**: 記録済。照会は未了。

### DS-15 OpenFGA の read replica と cache の適用文脈

- **レビュー原文**: 111 行「OpenFGA 自身もキャッシュが staleness を増やすこと、read replica では古い結果があり得ること、高整合性読取を使い分けることを明記している」（レビュー脚注 #45, #40, #46）。
- **問題**:
  - キャッシュが staleness を増やすのは、Check API の in-memory caching をフラグで有効にした場合の記述である（Running OpenFGA in Production の Cluster recommendations）[^35] [V]。
  - read replica の記述は、PostgreSQL の secondary datastore を非同期レプリケーションで構成した場合の注意である（Configuring OpenFGA）。同じ箇所で、最新のデータが必要な操作に HIGHER_CONSISTENCY を使うよう述べている[^36] [V]。
  - レビューはこれらを OpenFGA 一般の性質として 1 文にまとめている。製品文書の版と確認日もない [D]。
- **根拠となる一次資料**: OpenFGA 公式文書『Running OpenFGA in Production』[^35]、『Configuring OpenFGA』[^36]（いずれも版の表示なし）。
- **方向性への立場**: 同意。似たモデルを書けることと、同等の整合性保証を得ることは別だというレビューの判断に同意し、[D] として扱う [D]。
- **再提案での扱い**: 構成条件（キャッシュの有効化、非同期 replica）と整合性指定（MINIMIZE_LATENCY・HIGHER_CONSISTENCY）を対応付けて DL-17 に書き、OpenFGA の版と確認日を付ける [D]。整合性モードの直接の原典である「Query Consistency Modes」は本監査で取得していないので、確認するまでは未確認とする [D]。
- **閉じ方・持込み先**: A 机上（整合性の実測は C）／DL-17, DL-13。
- **状態**: 記録済。照会は未了。

### DS-16 model ID の固定と shadow check の強度

- **レビュー原文**: 113 行「モデル ID 固定、shadow check、段階展開は必須であり、OpenFGA も本番で特定 model ID を pin し、新旧モデルの shadow check を推奨している」（レビュー脚注 #47）。
- **問題**:
  - OpenFGA は、本番では authorization_model_id を渡すことを "strongly recommend" とし、store ID とともに model ID を pin する運用を示している[^37] [V]。
  - shadow check と段階展開は「Progressively rollout changes」の節で、"something you should consider doing if the changes are significant. You could: Do shadow checks..." と、大きな変更の際の選択肢として挙げられている[^37] [V]。
  - レビューの「OpenFGA も…shadow check を推奨している」は、原典の条件付きの強度を強めている [D]。
- **根拠となる一次資料**: OpenFGA 公式文書『Immutable Authorization Models』[^37]。
- **方向性への立場**: 同意。model ID の固定、shadow check、段階展開を必須にするというレビューの判断に同意する [D]。
- **再提案での扱い**: model ID の固定は OpenFGA の推奨 [V] として、shadow check と段階展開の必須化は再提案の設計判断 [D] として、分けて書く [D]。必須化の理由は、共有 PDP のモデル変更が多数のテナントに及ぶことである（DL-18）[D]。
- **閉じ方・持込み先**: A 机上／DL-17, DL-65, DL-31。
- **状態**: 記録済。照会は未了。

### DS-17 AWS の AVP 設計指針の一般化

- **レビュー原文**: 117 行「AWS も shared policy store には変更失敗の影響範囲と noisy-neighbor の増大があり、テナント固有 policy には per-tenant store を推奨している」（レビュー脚注 #48, #49）。直前の文は、共通 PDP 一般の blast radius を論じている。
- **問題**:
  - 2 つの参照先は、Amazon Verified Permissions の policy store 設計モデルについての AWS Prescriptive Guidance である。117 行の要約はその範囲で正確である[^38][^39] [V]。
  - 直前の文の「共通 PDP 一般」への拡張は、この製品固有の記述から導いた推論である [D]。
  - per-tenant store の欠点（onboarding と運用の複雑化、Region・account ごとの policy store 数の quota）には触れていない [D]（照合 #49）。
- **根拠となる一次資料**: AWS Prescriptive Guidance『One shared multi-tenant policy store』[^38]、『Per-tenant policy store』[^39]。
- **方向性への立場**: 同意 [D]。
- **再提案での扱い**: AVP は [V] の例示とし、共通 PDP 一般の blast radius の議論は [D] として DL-18 で定量化する [D]。per-tenant に分割した場合の運用負荷と quota も比較軸に入れる [D]。
- **閉じ方・持込み先**: A 机上／DL-18。
- **状態**: 記録済。照会は未了。

### DS-18 RFC 9700 の issuer binding の適用条件

- **レビュー原文**: 123 行「RFC 9700 は implicit grant 等の古い運用を非推奨化し、PKCE、redirect URI 完全一致、refresh token 保護、issuer binding、asymmetric client authentication 等を具体化している」（レビュー脚注 #24）。
- **問題**:
  - RFC 9700 §2.1 は、client が 2 つ以上の認可サーバと通信する場合に mix-up 攻撃への防御を求め、その手段として RFC 9207 の iss パラメータの使用を SHOULD としている[^40] [N]（照合 #24）。
  - レビューは issuer binding を一般の要求として並べ、この条件を省いている [D]。
- **根拠となる一次資料**: RFC 9700（BCP 240、2025-01）§2.1[^40]。
- **方向性への立場**: 同意。旧提案書が RFC 9700 を準拠基準にしていないという指摘にも同意する（§4）[D]。
- **再提案での扱い**: 適用条件（複数の認可サーバとの通信）を写す [D]。本基盤は顧客の IdP を含む複数の認可サーバ・IdP と連携し得るので、条件に当たる client を DL-16 で列挙し、それらでは mix-up 対策を必須とする [D]。
- **閉じ方・持込み先**: A 机上／DL-16。
- **状態**: 記録済。照会は未了。

### DS-19 FAPI 2.0 関連の参照先と日付

- **レビュー原文**: 53 行（基準表）「高保証 API｜FAPI 2.0 Security Profile｜…攻撃者モデル…適合性試験」（レビュー脚注 #28, #29, #30）。125 行「FAPI 2.0 は 2025 年に Final となり…適合性試験も利用できる」（#28, #50, #30）。
- **問題**:
  - #29 は FAPI WG の概要・FAQ ページで、DPoP を draft-02、PAR を未発行、適合性試験の開始を 2023 年 3 月とする古い記述が残っている[^41] [D]（照合 #29）。
  - #30 は 2025-07-09 のブログ告知である。題から Message Signing も Final と読めるが、告知時点では Message Signing は public review 中だった[^42] [D]（照合 #30）。
  - Security Profile と Attacker Model の Final 承認は 2025-02-19 に告知され[^43] [N]、仕様の Published 日は 2025-02-22 である[^44] [N]。
  - 攻撃者モデルの内容は別文書『FAPI 2.0 Attacker Model』にあるが、レビューは引いていない [D]。
  - 「2025 年に Final」「適合性試験を利用できる」という主張そのものは支持される[^44][^45] [N]。
- **根拠となる一次資料**: OpenID Foundation『FAPI 2.0 Security Profile』Final[^44]、『FAPI 2.0 Attacker Model』Final[^46]、承認の告知[^43]、認証プログラムのページ（2026-07-22 更新）[^45]。
- **方向性への立場**: 同意 [D]。
- **再提案での扱い**: 攻撃者モデルは Attacker Model を別の脚注で引く [D]。適合性試験の現状は認証プログラムのページで確認し、確認日を書く [D]。Message Signing の現在の状態は本監査で確認していないので、DL-84 で確認してから引く [D]。
- **閉じ方・持込み先**: A 机上（適合試験の実施は D）／DL-84, DL-60。
- **状態**: 記録済。照会は未了。

### DS-20 JWT 検証規則の出典と強度

- **レビュー原文**: 190 行「JWT は algorithm allowlist、typ、iss、aud、有効時刻、署名鍵と issuer の結合を厳格に検証し、異なる種類の JWT で相互排他的な検証規則を持たせる。これは JWT BCP の中心要件である」（レビュー脚注 #27, #51, #26）。
- **問題**:
  - RFC 8725 では、algorithm の許可集合（§3.1）、鍵と issuer の結合（§3.8）、種類の異なる JWT の相互排他的な検証規則（§3.12）が MUST である。aud の検証（§3.9）は、同じ issuer が複数の当事者向けに発行する場合の MUST である[^47] [N]（RS-04#62[^48]）。
  - typ は "Explicit typing is RECOMMENDED for new uses of JWTs"（§3.11）で、MUST ではない[^47] [N]。
  - 有効時刻（exp・nbf）の検証は、RFC 8725 の §3.1〜§3.12 にない[^47] [N]。JWT access token については、RFC 9068 §4 が typ（at+jwt）、iss、aud、署名、exp の検証を MUST としている[^49] [N]（RS-04#60[^48]）。190 行には RFC 9068 が引かれていない [D]。
  - 「中心要件」という表現は、原典の強度の差（typ は RECOMMENDED）をならしている [D]。
  - 後継の draft-ietf-oauth-rfc8725bis-10 は Internet-Draft（2026-08-21 付、BCP を予定）で、承認されれば RFC 8725 を廃止する[^50] [N]。Datatracker では IESG 状態が RFC Ed Queue、RFC Editor 状態が Blocked である[^51] [N]（RS-04#63[^48]）。監査記録（照合 #26）は更新日を 2026-08-31 としており、版の日付との違いは DL-84 で確定させる [D]。
- **根拠となる一次資料**: RFC 8725（BCP 225、2020-02）§3.1、§3.8、§3.9、§3.11、§3.12[^47]。RFC 9068（2021-10）§4[^49]。draft-ietf-oauth-rfc8725bis-10[^50] と Datatracker の状態ページ[^51]。
- **方向性への立場**: 同意。JWT を厳格に検証し、種類ごとに検証規則を分けるという方向に同意する [D]。
- **再提案での扱い**: token の種類ごとに検証規則を分ける [D]。access token には RFC 9068 §4 の MUST を、汎用の JWT には RFC 8725 の強度（typ は RECOMMENDED）を写す [D]。本基盤で typ をすべての token 種別に必須とするなら、設計判断 [D] として書く [D]。8725bis を DL-84 で監視し、RFC になった時点で差分を取り込む [D]。
- **閉じ方・持込み先**: A 机上（検証の試験は C）／DL-16, DL-75, DL-84。
- **状態**: 記録済。照会は未了。

### DS-21 DPoP の限界と BFF の出典

- **レビュー原文**: 190 行「DPoP は token を鍵へ束縛して replay を難しくするが、侵害された実行環境や XSS を解決しないため、BFF、CSP、短命化、鍵保護と併用する」（レビュー脚注 #27, #51, #26）。
- **問題**:
  - #51 は、Google OAuth への DPoP の組込み手順を説明する Google の製品文書である[^52] [V]。DPoP 一般の性質の原典ではない [D]。
  - 同ページには、「侵害された実行環境や XSS を解決しない」「BFF・CSP・短命化・鍵保護と併用する」に当たる記述がない [D]（照合 #51）。
  - レビューは 135 行で、旧提案書が DPoP の説明に別製品の文書を引いた点を指摘している。#51 の使い方は同じ型になっている [D]。
  - BFF は、190 行のどの脚注にも根拠がない [D]。
  - RFC 9449 の「短命化」の記述は条件付きである（下記）[D]。
- **根拠となる一次資料**:
  - RFC 9449 §2 は、XSS による client 文脈での悪用を "out of scope for DPoP" としている[^53] [N]。
  - §11.4 は "If an adversary is able to run code in the client's execution context, the security of DPoP is no longer guaranteed" と述べ、CSP を第二の防御として挙げている[^53] [N]（RS-04#54[^48]）。
  - §11.2 は、nonce の仕組みを使わない配備では長寿命の DPoP 束縛 access token を発行すべきでなく（SHOULD NOT）、短寿命の token を使うよう述べている[^53] [N]。
  - RFC 10017（OAuth 2.0 for Browser-Based Applications、BCP 212、2026-08）は、業務アプリ、機微なアプリ、個人データを扱うアプリに BFF を "strongly recommended" としている。小文字の表記で、BCP 14 のキーワードではない[^54] [N]（RS-04#73、#75[^48]）。
- **方向性への立場**: 同意。DPoP だけでは足りず、BFF などと併用すべきだという指摘に同意する [D]。
- **再提案での扱い**: DPoP の限界は RFC 9449 で、BFF は RFC 10017 で引き、Google の文書は引かない [D]。「短命化」は nonce の運用との組合せで条件付きだと書く [D]。BFF の推奨は BCP 14 のキーワードではないので、再提案で必須とするなら設計判断 [D] とする [D]。
- **閉じ方・持込み先**: A 机上／DL-16, DL-54。
- **状態**: 記録済。照会は未了。

### DS-22 レビュー参考文献一覧の形式

- **レビュー原文**: 260〜362 行「## References」の番号付きリスト 1〜51。133〜137 行では、旧提案書の引用索引と一次資料の扱いを指摘している。
- **問題**:
  - レビューの参考文献は、CONVENTIONS §4 の脚注形式（発行者、題、版・日付、URL、参照箇所、確認日）を満たさない[^5] [D]。
  - 51 件すべてに確認日と参照箇所がない。38 件に検索スニペットなどの残骸がある。5 つの原典が 13 の番号に重複している。12 件が二次情報または非規範資料である[^3] [D]。
  - レビューが旧提案書に求めた基準（133〜137 行）を、レビュー側の参照にも当てるのが公平である [D]。seed-03 D4 も、参考文献の題に残った検索スニペットの断片を「調査の出所がたどれない」例に挙げている[^2] [D]。
- **根拠となる一次資料**: 該当なし（形式の補正）。引用監査（レビュー側）§1.4、§3[^3]。
- **方向性への立場**: 同意。引用の追跡可能性が保証証跡の前提だというレビューの指摘（137 行）に同意し、同じ基準をレビュー側にも当てる [D]。
- **再提案での扱い**: レビューの参考文献一覧を転記しない [D]。レビューの指摘を要求（R-xxx）として受け入れるときは、原典を引き直して CONVENTIONS §4 の形式で書く [D]。レビューの参照に依拠する主張は、主張台帳（DL-105）で原典照合の有無を示す [D]。調査の手法と AI の使用は DL-83 で開示する [D]。
- **閉じ方・持込み先**: A 机上／DL-29, DL-105, DL-83。
- **状態**: 記録済。照会は未了。

## 4. 相違がないと判断した主な点（同意の記録）

補正に偏らないよう、レビューの参照と主張のうち、照合で支持された主な点も記録する。いずれもレビューの記述をそのまま受け入れる [D]。

| 行 | レビューの主張 | 照合の結果 |
|---|---|---|
| 52, 79 | RFC 9700 は public client の PKCE、redirect URI の完全一致、refresh token の sender constraint または rotation を求め、非対称クライアント認証と end-to-end TLS を推奨する | 強度を含めて原典と一致する（§2.1、§2.1.1、§2.2.2 は MUST、§2.5、§2.6 は RECOMMENDED）[^40] [N] |
| 79, 111 | Zanzibar は consistency token で ACL 更新とコンテンツ更新の因果順序を守り、外部整合性、グローバル時刻、専用の運用基盤を組み合わせている | 論文の §2.2 と §3 で支持される [D]（照合 #40） |
| 43 | NIST のインシデント対応指針は、対応を CSF 2.0 の 6 機能に統合している | SP 800-61r3 の Executive Summary と §2.1 で支持される [D]（照合 #20） |
| 55 | OWASP API Security Top 10 の BOLA、認証不備、オブジェクト属性レベル・機能レベルの認可不備 | 2023 年版の API1・API2・API3・API5 に当たる。参照先は Top 10 本体へ差し替える [D]（照合 #33） |
| 57 | SLSA 1.2 はビルド来歴、署名、隔離されたビルド基盤、改ざん防止を扱う | v1.2 の Build Track 要件（L1〜L3）で支持される [D]（照合 #37） |
| 123 | 旧提案書は RFC 9700 を準拠基準にしていない | 旧提案書の全文を「9700」「Security BCP」で検索して 0 件だった[^55] [D] |
| 125 | FAPI 2.0 は 2025 年に Final となり、適合性試験を利用できる | 支持される。日付の書き分けは DS-19 [N][^44][^45] |
| 139 | 旧提案書が推奨自社基盤を自己評価で最高位に置いている | 旧提案書 341 行の比較表で、推奨自社基盤の柔軟性とセキュリティがともに「非常に高」と記されている。表の前置き（326 行）に「定性的な相対評価」とあるが、実装前の構想の自己評価であるというレビューの指摘は当てはまる[^55] [D] |
| 5〜9, 256 | 本番基盤としては不承認、Phase 0 から高保証 PoC までを条件付きで承認 | 本書の 22 件は、この判定を変える根拠を含まない [D] |

## 5. 運用

- **追記**: 新しい相違は末尾に DS-23 以降を採番して追加する。欠番は再利用しない。取り下げる場合は行を消さず、状態を「取下げ」とし、理由を書く [D]。
- **状態の遷移**: 記録済 → レビュー作成者へ照会済 → 合意（補正を確定）／相違継続（決裁事項へ持込み）→ 再提案へ反映済。現時点では 22 件すべてが「記録済、照会未了」である [D]。
- **照会の方法**: 本書は決裁パッケージの付属資料 K（見解相違ログ）として提出し、次回のレビューで各項目の確認を求める（seed-03 §4 の付属資料一覧）[^2] [D]。照会で合意に至らない項目は、DL-39（決裁事項詳細）の該当 DEC に論点として持ち込む [D]。
- **誠実性**: 本書の照合と記述は AI エージェント（Claude）が行い、人による 2 者照合は受けていない。2 者照合は未達であり、DL-110（残課題）で追跡する[^5] [D]。

## 参考文献

[^1]: 『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: 5〜9, 15, 27, 29, 37〜58, 79, 99, 107, 111, 113, 117, 123, 125, 133〜139, 153, 190, 202, 256, 260〜362 行、確認日: 2026-10-03）
[^2]: 計画エージェント（レッドチームレンズ）『種資料03: 決裁パッケージに対するレッドチーム分析』2026-10-03. traceability/seed/seed-03-redteam-decision.md （参照箇所: §1 C4・D3・D4, §4 付属資料一覧（K 見解相違ログ）、確認日: 2026-10-03）
[^3]: 本リポジトリ『引用監査（レビュー側）: CTO/CISO レビューの参考文献 51 件』TRC-06-R 版 0.1, 2026-10-03. traceability/citation-audit-review.md （参照箇所: §1.4, §2, §3, §4 の #1〜#51、確認日: 2026-10-03）
[^4]: 本リポジトリ『成果物計画（マスターファイル計画）』TRC-03 版 0.1, 2026-10-03. traceability/deliverables.md （参照箇所: DL-29, DL-106, §8 traceability/ のパス表、確認日: 2026-10-03）
[^5]: 本リポジトリ『執筆規約（全成果物共通）』2026-10-03. CONVENTIONS.md （参照箇所: §3, §4, §6, §7, §8、確認日: 2026-10-03）
[^6]: OWASP Cheat Sheet Series『Threat Modeling Cheat Sheet』版・日付の表示なし（随時更新）. https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html （参照箇所: Overview, Response and Mitigations, Review and Validation。照合 #1、確認日: 2026-10-03）
[^7]: NIST『The NIST Cybersecurity Framework (CSF) 2.0』CSWP 29, Final, 2024-02-26. https://doi.org/10.6028/NIST.CSWP.29 （参照箇所: Preface p.iv, §2 p.3・p.5, Appendix A GV.RM-02。照合 #9、RS-01#3、確認日: 2026-10-03）
[^8]: M. Souppaya, K. Scarfone, D. Dodson (NIST)『Secure Software Development Framework (SSDF) Version 1.1: Recommendations for Mitigating the Risk of Software Vulnerabilities』SP 800-218, Final, 2022-02. https://doi.org/10.6028/NIST.SP.800-218 （参照箇所: §1 p.1・p.3, §2 p.4, PW.1 p.11, RV.3 p.18。照合 #15・#16、確認日: 2026-10-03）
[^9]: EY-Parthenon『Five forces redefining the CTO mandate in software companies — Insights from 350 European software CTOs』2025（PDF 更新 2025-12-15）. https://www.ey.com/content/dam/ey-unified-site/ey-com/fr-fr/insights/tmt/documents/ey-five-forces-redefining-the-cto-mandate-in-software-companies-15122025.pdf （参照箇所: p.7, p.8, p.12, 調査方法。照合 #2、確認日: 2026-10-03）
[^10]: R. Putrus『The Role of the CISO and the Digital Security Landscape』ISACA Journal 2019 Vol.2, 2019-03-01. https://www.isaca.org/resources/isaca-journal/issues/2019/volume-2/the-role-of-the-ciso-and-the-digital-security-landscape （参照箇所: CISO の経営への伝達を述べた段落。照合 #3、確認日: 2026-10-03）
[^11]: B. K. Ngac『Virtual CISOs: Security Leader or Security Risk?』ISACA Journal 2021 Vol.5, 2021-08-27. https://www.isaca.org/resources/isaca-journal/issues/2021/volume-5/virtual-cisos-security-leader-or-security-risk （参照箇所: 導入部の CISO の定義。照合 #4、確認日: 2026-10-03）
[^12]: J. Easterly (CISA)『Corporate Cyber Governance: Owning Cyber Risk at the Board Level』CISA Blog, 2025-01-08（Archived Content）. https://www.cisa.gov/news-events/news/corporate-cyber-governance-owning-cyber-risk-board-level （参照箇所: アーカイブ注記, 取締役会の責任を述べた段落。照合 #7、確認日: 2026-10-03）
[^13]: NACD・Internet Security Alliance『Director's Handbook on Cyber-Risk Oversight』Fifth Edition, 2026. https://www.nacdonline.org/globalassets/public-pdfs/2026_directors-handbook-cyber-risk_accessible.pdf （参照箇所: Principle Four, 印刷頁 21（PDF p.24）。ウェブ版: https://www.nacdonline.org/all-governance/governance-resources/governance-research/director-handbooks/2026-cyber-risk-oversight/cyber-risk-handbook-principles-2026/principle-4-adopt-an-enterprise-framework-for-managing-cyber-risk/ 。照合 #5・#6、確認日: 2026-10-03）
[^14]: 本リポジトリ『RS-01 統治・リスク定量化（一次資料調査ノート）』版 0.1（draft）, 2026-10-03. research/RS-01-governance-risk.md （参照箇所: RS-01#3、確認日: 2026-10-03）
[^15]: S. Rose, O. Borchert, S. Mitchell, S. Connelly (NIST)『Zero Trust Architecture』SP 800-207, Final, 2020-08. https://doi.org/10.6028/NIST.SP.800-207 （参照箇所: Abstract, §2.1 p.6–7, §2.2 p.7, §3.4 p.21, §3.4.1 pp.21–22。照合 #11・#12、確認日: 2026-10-03）
[^16]: 本リポジトリ『前提台帳（Assumptions Register）』GOV-01 版 0.1, 2026-10-03. 01_governance/assumptions-register.md （参照箇所: A-002、確認日: 2026-10-03）
[^17]: A. Chaudhary『Identity and Access Management in Cloud Security』Cloud Security Alliance Blog, 2024-08-28. https://cloudsecurityalliance.org/blog/2024/08/28/identity-and-access-management-in-cloud-security （参照箇所: MFA, ABAC/PBAC, JIT, IAM 変更の監視を述べた段落。照合 #13、確認日: 2026-10-03）
[^18]: Cloud Security Alliance『Security Guidance for Critical Areas of Focus in Cloud Computing v5』Released 2024-07-15 / Updated 2025-08-26. https://cloudsecurityalliance.org/artifacts/security-guidance-v5 （参照箇所: Domain 5 Identity and Access Management。成果物ページのみ確認、本文 PDF は未確認。照合 #13・#34、確認日: 2026-10-03）
[^19]: Cloud Security Alliance『Cloud Controls Matrix and CAIQ v4.1』（表示上 Released 2026-01-27）. https://cloudsecurityalliance.org/artifacts/cloud-controls-matrix-v4-1 （参照箇所: 207 controls・17 domains の表示, IAM ドメイン。統制本文は未確認。照合 #14・#35、確認日: 2026-10-03）
[^20]: NIST『Assessing Security and Privacy Controls in Federal Information Systems and Organizations: Building Effective Assessment Plans』SP 800-53A Rev.4, 2014-12（2023-01-25 撤回）. https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-53ar4.pdf （参照箇所: Appendix F-CA, CA-2(1) p.F-89, CA-8(1) p.F-98。撤回の状態は監査記録による。照合 #19、確認日: 2026-10-03）
[^21]: NIST『Assessing Security and Privacy Controls in Information Systems and Organizations』SP 800-53A Rev.5, 2022-01（CSRC 上の現行 Release 5.2.0、2025-08-27）. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53Ar5.pdf （参照箇所: Chapter Four, CA-02(01) p.162, CA-08(01) p.173。照合 #19、確認日: 2026-10-03）
[^22]: NIST『Control Baselines for Information Systems and Organizations』SP 800-53B, 2020-10（2020-12-10 更新を含む。Release 5.2.0 でもベースラインは変更なし）. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53B.pdf （参照箇所: §3 Table 3-4 p.23。照合 #18、RS-08#14、確認日: 2026-10-03）
[^23]: 本リポジトリ『RS-08 PEP完全性とテナント分離（一次資料調査ノート）』版 0.1（draft）, 2026-10-03. research/RS-08-pep-completeness-tenant-isolation.md （参照箇所: RS-08#1, #12, #14、確認日: 2026-10-03）
[^24]: U.S. Department of Education『Information Technology (IT) Assessment, Authorization, and Monitoring (CA) Standard』Version 5.5, 2025. https://www.ed.gov/media/document/2025-security-assessment-and-authorization-standards-109735.pdf （参照箇所: CA-02(01), CA-08 とベースライン表。照合 #18、確認日: 2026-10-03）
[^25]: NIST CSRC『SP 800-218, Secure Software Development Framework (SSDF) Version 1.1』出版物ページ. https://csrc.nist.gov/pubs/sp/800/218/final （参照箇所: 後継の SP 800-218 Rev.1（SSDF 1.2）Initial Public Draft 2025-12-17 の表示。照合 #15、確認日: 2026-10-03）
[^26]: OWASP Developer Guide『ASVS』（版の表示なし）. https://devguide.owasp.org/en/06-verification/01-guides/03-asvs/ （参照箇所: ASVS 4.0.3 の章とレベルの説明。照合 #32、確認日: 2026-10-03）
[^27]: OWASP『Application Security Verification Standard 5.0.0』2025-05（GitHub タグ v5.0.0）. https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en （参照箇所: 0x01-Frontispiece, 0x05-For-Users-Of-4.0（V1 Architecture 章の削除と Documented Security Decisions）, 章一覧。照合 #31・#32、RS-08#1、確認日: 2026-10-03）
[^28]: PCI Security Standards Council『Payment Card Industry Data Security Standard Self-Assessment Questionnaire A and Attestation of Compliance — For use with PCI DSS Version 4.0』2022-04. https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-A.pdf （参照箇所: 収録要件の一覧, Requirement 8 の適用注記。照合 #39、確認日: 2026-10-03）
[^29]: PCI Security Standards Council『Just Published: PCI DSS v4.0.1』PCI Perspectives blog, 2024-06-11. https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1 （参照箇所: v4.0 の退役日（2024-12-31）と v4.0.1 の性格を述べた段落、確認日: 2026-10-03）
[^30]: PCI Security Standards Council『Payment Card Industry Data Security Standard: Requirements and Testing Procedures』v4.0.1, 2024-06. https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf （参照箇所: Requirement 8（8.2, 8.3, 8.4）, Requirement 10（10.2）。本文は利用許諾の手続のため未取得・未確認。照合 #39、確認日: 2026-10-03）
[^31]: 本リポジトリ『RS-02 規制・法域の適用性（一次資料調査ノート）』版 0.1（draft）, 2026-10-03. research/RS-02-regulatory-applicability.md （参照箇所: RS-02#71, 標準ステータス表の PCI DSS 行、確認日: 2026-10-03）
[^32]: NIST『Digital Identity Guidelines: Authentication and Authenticator Management』SP 800-63B-4, Final, 2025-07, DOI 10.6028/NIST.SP.800-63B-4. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63B-4.pdf （参照箇所: §3.1.4, §3.1.5, §3.2.5, §4.2.2.2 p.49–50。照合 #23・#41・#42、RS-03#39、確認日: 2026-10-03）
[^33]: 本リポジトリ『RS-03 デジタルIDライフサイクル 一次資料調査ノート』版 0.1（draft）, 2026-10-03. research/RS-03-identity-lifecycle.md （参照箇所: RS-03#39, #49, #50、確認日: 2026-10-03）
[^34]: NIST『Digital Identity Guidelines: Federation and Assertions』SP 800-63C-4, Final, 2025-07, DOI 10.6028/NIST.SP.800-63C-4. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63C-4.pdf （参照箇所: §2.3 p.6–7, §3.11.1 p.35–36, §4.9 p.72。照合 #22・#43・#44、RS-03#49・#50、確認日: 2026-10-03）
[^35]: OpenFGA『Running OpenFGA in Production』（版の表示なし）. https://openfga.dev/docs/best-practices/running-in-production （参照箇所: Cluster recommendations。照合 #45、確認日: 2026-10-03）
[^36]: OpenFGA『Configuring OpenFGA』（版の表示なし）. https://openfga.dev/docs/getting-started/setup-openfga/configure-openfga （参照箇所: Read Replicas, Consistency Preferences。照合 #46、確認日: 2026-10-03）
[^37]: OpenFGA『Immutable Authorization Models』（版の表示なし）. https://openfga.dev/docs/getting-started/immutable-models （参照箇所: How to target a particular model, Progressively rollout changes。照合 #47、確認日: 2026-10-03）
[^38]: AWS『One shared multi-tenant policy store』AWS Prescriptive Guidance（日付の表示なし）. https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-design-shared-store.html （参照箇所: 欠点と per-tenant への誘導を述べた段落。照合 #48、確認日: 2026-10-03）
[^39]: AWS『Per-tenant policy store』AWS Prescriptive Guidance（日付の表示なし）. https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-design-per-tenant-store.html （参照箇所: 利点と推奨条件を述べた段落。照合 #49、確認日: 2026-10-03）
[^40]: IETF (T. Lodderstedt, J. Bradley, A. Labunets, D. Fett)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700.html （参照箇所: §2.1, §2.1.1, §2.1.2, §2.2.2, §2.4, §2.5, §2.6。照合 #24、確認日: 2026-10-03）
[^41]: OpenID Foundation『FAPI Working Group』概要・FAQ ページ（article:modified_time 2026-08-18）. https://openid.net/wg/fapi/ （参照箇所: FAQ の DPoP・PAR・適合性試験の記述。照合 #29、確認日: 2026-10-03）
[^42]: OpenID Foundation『FAPI 2.0 Security Profile and FAPI 2.0 Message Signing: Final Conformance Tests and Certifications Now Available』Blog, 2025-07-09. https://openid.net/fapi2-0-final-conformance-tests-available/ （参照箇所: 本文と Message Signing の状態の記述。照合 #30、確認日: 2026-10-03）
[^43]: OpenID Foundation『FAPI 2.0 Security Profile and Attacker Model Final Specifications Approved』2025-02-19. https://openid.net/fapi-2-security-profile-attacker-model-final-specifications-approved/ （参照箇所: 承認日と投票結果。照合 #50、確認日: 2026-10-03）
[^44]: D. Fett, D. Tonge, J. Heenan (OpenID Foundation FAPI WG)『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: Introduction, §5.1.1, §5.3.2.1, §5.3.2.2, §6.6。照合 #28、確認日: 2026-10-03）
[^45]: OpenID Foundation『Conformance Testing for FAPI 2 and FAPI1 Advanced-Final OPs』認証プログラムのページ（article:modified_time 2026-07-22）. https://openid.net/certification/certification-fapi_op_testing/ （参照箇所: Supported FAPI specifications。照合 #30 の差替先、確認日: 2026-10-03）
[^46]: OpenID Foundation FAPI WG『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5 Security goals, §6 Attacker model, §7 Attackers, §8 Limitations。照合 #29 の差替先、確認日: 2026-10-03）
[^47]: IETF (Y. Sheffer, D. Hardt, M. Jones)『RFC 8725: JSON Web Token Best Current Practices』BCP 225, 2020-02. https://www.rfc-editor.org/rfc/rfc8725.html （参照箇所: §3.1〜§3.12（特に §3.1, §3.8, §3.9, §3.11, §3.12）。照合 #26、RS-04#62、確認日: 2026-10-03）
[^48]: 本リポジトリ『RS-04 OAuth/OIDC token profile 一次資料調査ノート』版 0.1（draft）, 2026-10-03. research/RS-04-oauth-oidc-profile.md （参照箇所: RS-04#54, #60, #62, #63, #73, #75、確認日: 2026-10-03）
[^49]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』Proposed Standard, 2021-10. https://www.rfc-editor.org/rfc/rfc9068.html （参照箇所: §4 Validating JWT Access Tokens。照合 #25、RS-04#60、確認日: 2026-10-03）
[^50]: IETF OAuth WG (Y. Sheffer, D. Hardt, M. Jones)『JSON Web Token Best Current Practices』draft-ietf-oauth-rfc8725bis-10, 2026-08-21（Internet-Draft、BCP 予定、状態: draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-rfc8725bis-10.txt （参照箇所: ヘッダ（Obsoletes: 8725）, Appendix A。RS-04#63、確認日: 2026-10-03）
[^51]: IETF Datatracker『draft-ietf-oauth-rfc8725bis』文書状態ページ. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: IESG 状態（RFC Ed Queue）, RFC Editor 状態（Blocked）。照合 #26、RS-04#63、確認日: 2026-10-03）
[^52]: Google for Developers『DPoP Adoption Guide』Authorization Resources, Last updated 2026-07-31. https://developers.google.com/identity/protocols/oauth2/resources/dpop-adoption （参照箇所: 冒頭の DPoP の説明, Google 固有の制約。照合 #51、確認日: 2026-10-03）
[^53]: IETF (D. Fett, B. Campbell, J. Bradley, T. Lodderstedt, M. Jones, D. Waite)『RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)』Standards Track, 2023-09. https://www.rfc-editor.org/rfc/rfc9449.html （参照箇所: §2, §11.2, §11.4。照合 #27・#51、RS-04#54、確認日: 2026-10-03）
[^54]: IETF (A. Parecki, P. De Ryck, D. Waite)『RFC 10017: OAuth 2.0 for Browser-Based Applications』BCP 212, 2026-08. https://www.rfc-editor.org/rfc/rfc10017.html （参照箇所: §5.1.3, §6.1（BFF の推奨）。照合 #51 の差替先、RS-04#73・#75、確認日: 2026-10-03）
[^55]: 『マルチテナントSaaS認証・認可基盤の比較調査と設計指針』（旧提案書）. マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md （参照箇所: 326〜341 行、全文の文字列検索「9700」「Security BCP」、確認日: 2026-10-03）
