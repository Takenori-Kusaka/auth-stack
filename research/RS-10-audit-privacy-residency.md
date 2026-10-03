# RS-10 監査・プライバシー・データ所在地（一次資料調査ノート）

> 文書ID: RS-10 / 版: 0.2 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-102, R-118〜R-128, R-134, R-193（関連: R-083, R-115, R-176, R-209）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md（§2.10, §2.11, §2.14）, traceability/seed/seed-02-cto-technical.md（§8）, traceability/seed/seed-03-redteam-decision.md（§7-9, §7-11）, research/verification/RS-10-verification.md（独立検証記録）

本書は AI エージェント（Claude）が 2026-10-03 に Web 上の原典を取得して調査・起草した。種資料（seed-01〜03）は手掛かりとしてだけ使い、本文の根拠には原典だけを引いた。原典を取得できなかった事項は §6 に「未確認」として挙げ、結論には使っていない。版 0.1 の全脚注（[^1]〜[^53]）は、作成者とは別の AI エージェント（Claude）が 2026-10-03 に原典と照合した。照合の結果と修正内容は research/verification/RS-10-verification.md に記録した。検証者も AI であり、人間のレビュアや CTO/CISO による照合ではない。版 0.2 で検証者が追加した脚注は [^54]・[^55] である。

ID の注記: 本書は作業指示に従い RS-10 として作成した。一方、traceability/deliverables.md では、本テーマが RS-11（DL-95、research/RS-11-audit-privacy-residency.md）に、RS-10 が「cell・blast radius」（DL-94）に割り当てられている。この食い違いは本書では解消できないため、§6 に残課題として記した。

凡例:
- 主張タグは CONVENTIONS §3 に従う。
- 法令、判決、監督機関のガイドライン・報告書、SDO 標準（IETF、W3C、NIST、DMTF、PCI SSC）には `[N]` を付けた。拘束力のない文書（EDPB の意見募集版ガイドライン、執行調査報告、EDPB 議長の書簡、個人情報保護委員会 Q&A、NIST ipd）には、本文で文書の性格を明記した。
- OCSF（Linux Foundation プロジェクト）と OpenTelemetry（CNCF プロジェクト）は SDO 標準ではない。ただし公開された仕様本文であるため `[N]` を付け、性格は §4 に記した。
- クラウド事業者・IdP 事業者の公式文書には `[V]` を付け、文書に表示された更新日と確認日を脚注に記した。
- 前提台帳（01_governance/assumptions-register.md）はまだ作成されておらず、A-ID が採番されていない。このため、規模前提（CONVENTIONS §7 の暫定値）に依存する推論には `[D]` を付け、本文に「仮定依存（CONVENTIONS §7、A-ID 未採番）」と書いた。

---

## 1. 調査の問い

種資料由来の問い（seed-02 §8、seed-01 §2.10・§2.11・§2.14、seed-03 §7-11）:

1. 認可 decision の監査イベントスキーマをどう定めるか。OCSF の最新版と DMTF CADF はそれぞれ何を規定しているか。decision_id と trace_id をどう分けるか（seed-02 8-1、R-118）。
2. 100% 記録すべき対象と集約してよい対象をどう分けるか。欠損をどう検知し、backpressure と監査経路停止時の挙動をどう定めるか（seed-02 8-2、R-126、R-127、R-083）。
3. 監査を trace sampling に依存させない根拠は何か。独立経路は何を満たすべきか（R-128）。
4. WORM と改ざん検知をどう組み合わせるか（Object Lock、hash chain、Merkle tree、監査用鍵の分離）（seed-02 8-3、R-123、R-176）。
5. 保持期間、保存地域、削除をどう決めるか。匿名化・仮名化と調査可能性をどう両立させるか（seed-02 8-4、R-119〜R-121、R-124）。
6. WORM 監査と削除権・データ所在地の衝突を、仮名化や crypto-shredding で調停できるか（seed-03 §7-11）。
7. 顧客向け監査 API は何を提供すべきか（R-134）。
8. 監査コストをどう見積もるか（seed-02 8-5、R-125、R-193）。

本ストリームで追加した問い:

9. 各標準の現在の状態はどうか（OCSF の最新版、CADF の改訂有無、W3C Trace Context / Baggage の段階、NIST SP 800-92 改訂の状態）。
10. 監査ログ自体は、本人のアクセス権（GDPR Art.15）の対象になるか。なるなら、スキーマに何を持たせる必要があるか。
11. 第三国からの遠隔参照（follow-the-sun の SOC、ベンダー support）は「移転」に当たるか。日本法では、外国事業者のクラウドに保存すると「外国にある第三者への提供」に当たるか。
12. 仮名化したログは、どの条件で個人データでなくなるか（CJEU の判決、GDPR 改正提案の状態）。
13. 業界規制（決済、EU 金融、NIS2、米国医療・証券）は、ログの欠損検知・改ざん防止・保持について何を明示しているか。
14. 長期保持（20 年計画）と暗号の寿命（量子計算機を含む）は、crypto-shredding の有効性をどう制約するか。
15. 日本の個人情報保護法の改正（2026 年公布）は監査設計に影響するか。

---

## 2. 結論サマリ（設計への含意）

1. 認可 decision 専用の標準イベントクラスは、確認した範囲では OCSF 1.9.0 にない [N][^2]。DMTF CADF 1.0.0 には OCSF のようなイベントクラスの仕組みがなく、policy の適用や意思決定の結果は汎用の eventType "control" で表す（"attempted resource access" 等を例示）[N][^4]。OCSF では、API Activity クラスに actor.authorizations（decision は自由文字列、policy.version は recommended）、metadata.tenant_uid、trace profile、record_integrity profile を組み合わせれば写像できる [N][^2]。CADF では eventType=control を使い、action を allow/deny/evaluate/notify のいずれかにし（SHALL）、REASON を必須にすれば表現できる [N][^4]。このため正準スキーマ（DL-77）は自社で定義し、OCSF・CADF への写像は export 層に置き、どちらにも固定しない [D]（RS-10#1〜#15 から導出）。
2. OpenTelemetry の Sampler が DROP を返すと、span は記録されず、全ての event と attribute が捨てられる [N][^10]。W3C Trace Context は、traceparent・tracestate に個人識別情報を入れることを MUST NOT としている [N][^7]。また、外部から来た sampled flag をそのまま継続すると、過負荷や課金増に悪用され得ると述べている [N][^7]。このため decision の記録は sampling 判定と独立した経路で 100% 出力する [D]。trace_id は相関キーとしてだけ持たせ、subject や tenant を baggage に載せない [D]（RS-10#16〜#22）。
3. 全件記録の下限には、PCI DSS 10.2.1.x と NIS2 実施規則 Annex 3.2.3 の列挙を使える [D]（RS-10#23, #28）。ただし NIS2 実施規則の列挙は "Where appropriate" 付きである [N][^17]。PCI DSS 10.2.1.x の列挙は、カード会員データへの個別アクセス、管理者操作、監査ログへのアクセス、無効なアクセス試行、識別・認証情報の変更と権限昇格、監査ログの初期化と開始・停止・一時停止、システムレベルのオブジェクトの作成・削除である [N][^13]。集約を検討してよいのは、低リスク read の allow decision だけである [D]。規制スコープ（カード会員データへのアクセス等）の decision は、個別記録として残す [D]（RS-10#23〜#28）。
4. 監査経路の欠損検知は、複数の規制が明示的に求めている [N][^13][^16][^17]。PCI DSS 10.7.2 は、監査ログ機構の障害を検知・警報し、速やかに対処することを求める [N][^13]。EU 金融の DORA RTS 第 12 条は「ログシステムの障害を検知する措置」を求める [N][^16]。NIS2 実施規則は、監視・ログ系の可用性を、監視対象とは独立に監視することを求める [N][^17]。設計では、producer ごとの連番と heartbeat を独立した監視系で突合する [D]。検知時の挙動は、SP 800-53 AU-5(4) の選択肢（全停止・部分停止・縮退運転）から操作階層ごとに選ぶ [N][^6][D]（RS-10#26, #29〜#34）。
5. WORM だけでは、ログ運用者自身による改ざんや、相手ごとに異なる内容を見せる行為を検出できない [D]。RFC 9162 も、相手ごとに矛盾したビューを示すログは同 RFC の監査機構を迂回でき、ログを信頼された第三者として扱う必要があると述べている [N][^22]。このため Object Lock 等の WORM に、hash chain または Merkle tree を組み合わせる（OCSF 1.9.0 の record_integrity profile が attestation と prev_event を定義している）[N][^2]。さらに、tree head を外部にアンカーする（RFC 9943・9942 の Transparency Service と receipt）[N][^23][^24][D]（RS-10#37〜#43）。
6. 主要クラウドの WORM は、保持を固定した状態（S3 Object Lock の compliance mode、Azure のロック済み time-based retention policy、GCS のロック済み Bucket Lock）では、保持期間中の削除を構造上許さない [V][^26][^27][^28]。固定前の状態は迂回・変更できる（S3 の governance mode は権限とヘッダの明示で迂回でき、Azure の未ロック policy は短縮・削除できる）[V][^26][^27]。S3 Object Lock の compliance mode では、root を含む誰も削除できず、期限前に消す唯一の方法は AWS アカウントの削除である [V][^26]。GCS Bucket Lock のロックは不可逆である [V][^28]。Azure のロック済みポリシーは保持期間を短縮できない [V][^27]。このため WORM 層には直接識別子を置かない [D]。置くのは、仮名 ID と、主体別・テナント別の鍵で暗号化した属性だけにする [D]。鍵は WORM の外で管理する [D]（RS-10#44〜#48）。
7. crypto-shredding で GDPR 上の消去義務を満たせると明言した一次資料は、今回確認できなかった（未確認、§6-5）[D]。EDPB は意見募集版のガイドラインで、暗号化された個人データも個人データであり、鍵を消しても「アルゴリズムが破られるまで」判読できなくなるだけだと述べている [N][^34]。NIST SP 800-88r2 は、対象鍵の全コピーを消去できることを Cryptographic Erase の前提にしている [N][^37]。さらに、数十年にわたり機密性が要る情報では、将来の暗号解読（量子計算機を含む）を理由に Cryptographic Erase が許容されない場合があるとしている [N][^37]。このため crypto-shredding は消去の代替とせず、残余リスクを下げる補完手段と位置付ける [D]。法的な扱いは法務・DPO の判断事項（閉じ方 B）とする [D]（RS-10#53〜#59）。
8. GDPR の消去権は、法的義務の履行に必要な範囲と、法的請求の立証・行使・防御に必要な範囲には適用されない（Art.17(3)(b)(e)）[N][^30]。前文 49 は、厳密に必要かつ比例的な範囲でのネットワーク・情報セキュリティ目的の処理を、正当な利益としている [N][^30]。一方、保存は目的に必要な期間に限られる（Art.5(1)(e)）[N][^30]。監査ログの保持に法的根拠を立てることはできるが、期間と項目の最小化、および目的達成後の削除手順が要る [D]（RS-10#49〜#52）。
9. CJEU は Pankki S 事件で、本人データの照会操作の日時と目的は、本人が Art.15(1) に基づき得られる情報であると判示した [N][^31]。照会した従業員の身元は原則として対象外だが、権利行使に不可欠な場合を除くとした [N][^31]。このため、人（support・管理者）による顧客データへのアクセスでは「目的」欄を必須にする [D]。また、主体単位で照会履歴を抽出できるようにする [D]（RS-10#60）。
10. EDPB は、第三国からの遠隔アクセスも、3 要件を満たせば移転に当たるとしている（画面表示だけの support や管理を含む）[N][^41]。個人情報保護委員会は、外国事業者のクラウドでも、事業者が個人データを取り扱わない旨の契約とアクセス制御があれば「提供」に当たらないとしている [N][^48]。ただしその場合も、外的環境の把握と、クラウド事業者の所在国名・サーバ所在国名等を本人の知り得る状態（本人の求めに応じて遅滞なく回答する場合を含む）に置くことが要る [N][^48]。このため監査データは cell のリージョンに保存する [D]。SOC やベンダー support による越境参照は移転として扱い、根拠（十分性認定、SCC 等）を DL-34 で判定する [D]（RS-10#68〜#76）。
11. EU から米国への移転には、EU-US Data Privacy Framework の十分性認定（2023-07-10）に依拠できる [N][^42]。ただし、これを維持した一般裁判所判決（T-553/23）に対し、2025-10-31 に上訴（C-703/25 P）が提起されている [N][^43]。さらに EDPB は 2026-07-31、米国最高裁判決 Trump v. Slaughter（2026-06-29）を受けて、同判決が DPF 十分性認定（Implementing Decision (EU) 2023/1795）の機能に影響するかを精査するよう欧州委員会に求めた [N][^55]。上訴の帰結と欧州委員会の対応は未確認であり（§6-7）、20 年計画では SCC への切替手順を前提に置く [D]（RS-10#74〜#76）。
12. 確認した範囲（GDPR、個人情報保護法）に、認証・認可の監査ログの保持期間を一律に定める規定はなかった [N][^30][^44]。業界基準では、PCI DSS が 12 か月以上の保持を求め、うち直近 3 か月は即時に分析できることを求める [N][^13]。DORA RTS は、保持期間を金融機関がリスク評価に基づいて定めるとしている [N][^16]。このため保持期間は、データ分類×顧客の規制の行列で定め、法務の署名（閉じ方 B）で確定する [D]（RS-10#77〜#78）。
13. 主要 IdP・クラウドの監査ログの既定保持は、確認した 3 サービスで 7〜90 日である [V][^50][^49][^51]。Microsoft Entra ID P1/P2 の audit log は 30 日、Okta の System Log は 90 日、AWS CloudTrail の event history は 90 日である [V][^50][^49][^51]。このため顧客向け監査 API では、検索 API に加えて、連続 export（stream）と、欠落を検知するための連番・watermark を提供する [D]。長期保持は顧客側の sink に委ねられるようにする [D]（RS-10#79）。
14. 監査コストは「decision 件数/日 × 1 件の圧縮後 bytes × 複製数 × 保持日数」を基本式とし、保管クラスごとの制約を加えて見積もる [D]。制約には、最小保管期間、最小課金サイズ、アーカイブ 1 オブジェクトあたり 40KB のメタデータ（S3 Glacier Flexible Retrieval・Deep Archive）がある [V][^52]。1 件あたりの bytes と圧縮率は、自社スキーマで実測する（PoC）まで決めない [D]（RS-10#80）。
15. 日本の「個人情報の保護に関する法律等の一部を改正する法律」（令和 8 年法律第 56 号）は 2026-07-17 に公布された [N][^45]。2026-10-03 時点で施行済みなのは附則の一部（第 13 条・第 16 条・第 17 条。いずれも 2026-07-17 施行）だけで、個人情報保護法本則の改正規定は未施行である [N][^45]。改正後の条文には、課徴金（第 148 条の 3）と、本人通知の例外の拡張（第 26 条第 2 項）が含まれる [N][^45]。政令・規則・ガイドラインの内容は未確認であり（§6-10）、設計では施行前の条文として追跡する [D]（RS-10#67）。

---

## 3. 調査結果

### 3.1 監査イベントスキーマ（OCSF・CADF・NIST AU-3）

- **RS-10#1** OCSF schema の最新リリースは 1.9.0（2026-08-03）である [N][^1]。その前のリリースは 1.8.0（2026-03-18）、1.7.0（2025-11-14）、1.6.0（2025-08-01）、1.5.0（2025-04-28）である [N][^1]。1.x 系は半年弱ごとに minor 版が出ているため、スキーマの版を固定した前提では 20 年の計画期間を保てない [D]。
- **RS-10#2** OCSF は 2024-11-19 に Linux Foundation のプロジェクトとなり、Apache License 2.0 で提供されている [N][^3]。OCSF は自らを「スキーマを開発するための拡張可能なフレームワークと、vendor-agnostic な core security schema を提供する open-source project」と説明している [N][^3]。SDO（IETF、ISO 等）の標準ではない [D]。
- **RS-10#3** OCSF の metadata.version（SemVer）は required である [N][^2]。原文: "Event consumers use the version to determine the available event attributes."。このため監査レコードには、自社スキーマの版と、写像先の OCSF の版を両方持たせる必要がある [D]。
- **RS-10#4** OCSF 1.9.0 の authorization オブジェクト（caption は "Authorization Result"）は、decision（recommended）と policy（optional）の 2 属性だけを持つ [N][^2]。dictionary は decision を "Decision/outcome of the authorization mechanism (e.g. Approved, Denied)" と説明し、列挙型を定義していない [N][^2]。allow/deny/not_applicable/error などの値の集合は、自社 profile で固定する必要がある [D]。
- **RS-10#5** OCSF の policy オブジェクトは、uid・name・type のうち少なくとも 1 つを必須とし、version と is_applied を recommended としている [N][^2]。原文: "Policy attributes provide traceability to the operational state of the security product at the time that the event was captured"。policy・model の revision を policy.version と policy.uid に写像すれば、判定時点の policy 状態を追跡できる [D]。
- **RS-10#6** OCSF の actor オブジェクトは、user・process・application（いずれも recommended）と、authorizations・session・idp・invoked_by（いずれも optional）を持つ [N][^2]。1.9.0 では、app_name・app_uid を廃止予定とし、application オブジェクトに置き換えた [N][^1]。
- **RS-10#7** OCSF の API Activity クラスでは、actor・api・src_endpoint が required、resources が recommended で、trace profile を含む [N][^2]。Authorize Session クラスは "privileges, groups or roles assigned to a new user session, usually at login time" を報告するものである [N][^2]。そのため、要求ごとの認可 decision は API Activity（または自社拡張クラス）に actor.authorizations を付けて表すのが近い [D]。
- **RS-10#8** OCSF の metadata は次の属性を持つ [N][^2]。
  - tenant_uid（recommended）
  - sequence（optional。"to make the exact ordering of events unambiguous" のための連番）
  - correlation_uid
  - is_truncated・untruncated_size
  - loggers（パイプラインの各 hop）
  - logged_time・processed_time
  これらは欠損検知と切り詰め検知に使える [D]。
- **RS-10#9** OCSF 1.9.0 は次を追加した [N][^1]。delegation 属性・ai_agent 属性も ai_operation profile に加えている [N][^1]。
  - delegation オブジェクト（"a durable authorization context issued by a principal to a delegate"）
  - ai_agent オブジェクト
  - record_integrity profile
  委任チェーン（act claim）とエージェント主体の監査を OCSF へ写像するときの候補になる [D]。
- **RS-10#10** DMTF CADF の本体仕様は DSP0262 1.0.0（Document Status: DMTF Standard、2014-06-19）である [N][^4]。DMTF の CADF ページが掲げる仕様は、DSP0262 1.0.0（Standard、2014-06-19）と OpenStack profile の DSP2038 1.1.0（Informational、2015-04-16）である [N][^5]。本体の 1.0.0 以降の改訂は、確認した範囲では見当たらない [N][^5]。
- **RS-10#11** CADF の必須モデル要素は OBSERVER、INITIATOR、ACTION、TARGET、OUTCOME である（§4.2 Table 3）[N][^4]。
- **RS-10#12** CADF の eventType "control" は "the application of a policy or business rule, or more generally express the outcome of a decision making process" を表す（§4.5.1）[N][^4]。control の場合、action は "allow"、"deny"、"evaluate"、"notify" のいずれか（またはその拡張）で SHALL（Annex A.3.4）である [N][^4]。REASON は "must be included" である（§4.7.1 Table 13）[N][^4]。outcome の root 値は success・failure・unknown・pending で、SHALL である（Annex A.4.5）[N][^4]。
- **RS-10#13** CADF は、各 OBSERVER が自分の層で見えたものだけを記録し、他の OBSERVER の記録と相関させるモデルを取る（§4.2.2）[N][^4]。原文: "each OBSERVER should only report the INITIATOR, TARGET, and other data as it "sees" and can classify them from within their own layer"。PEP と PDP がそれぞれ記録を出し、decision_id で相関させる設計と整合する [D]。
- **RS-10#14** CADF は監査データの完全性の方法として "Data Chaining - ensuring that audit data, once placed in the CADF Event Record, is not deleted or modified; that instead data should be appended to the record." を掲げる（§1.2.1）[N][^4]。データモデルは、形式ごとの署名機構で署名しやすいように設計するとしている（§1.2.1）[N][^4]。
- **RS-10#15** NIST SP 800-53 Rev.5 の Release 5.2.0 は、2025-08-27 に公表された patch release である [N][^53]。同版の AU-3 は、監査レコードに次を含めることを求める [N][^6]。同 AU-3(3) は、監査レコードに含める個人識別情報を、プライバシーリスク評価で特定した要素に限定することを求める [N][^6]。
  - 事象の種類、発生時刻、発生場所、発生源、結果
  - 関係する個人・主体・オブジェクトの識別情報

### 3.2 trace context・OpenTelemetry・baggage

- **RS-10#16** W3C Trace Context（Level 1）は 2021-11-23 付の W3C Recommendation である [N][^7]。§6 は "Tracing vendors MUST NOT use traceparent and tracestate fields for any personally identifiable or otherwise sensitive information." と定める [N][^7]。同じ節は、これらの field の目的を相関だけとしている（"The only purpose of these fields is to enable trace correlation."）[N][^7]。§6.2 は "Vendors MUST NOT include any personally identifiable information in the tracestate header." と定める [N][^7]。
- **RS-10#17** W3C Trace Context §7.2 は、公開 API で sampled flag 付きの trace を素直に継続すると、攻撃者に悪用され得ると述べる [N][^7]。原文: "a malicious attacker could overwhelm an application with tracing overhead, forge trace-id collisions that make monitoring data unusable, or run up your tracing bill"。外部入力の trace 状態で監査の記録・非記録が変わる設計は避けるべきである [D]。
- **RS-10#18** W3C Trace Context は、trace-id にはランダム生成値を SHOULD とし（§8）、乱数生成器が利用者を識別できる情報に依存することを MUST NOT としている（§6.1）[N][^7]。Level 2 は W3C Candidate Recommendation Draft（2024-03-28）で、random trace ID flag を追加した [N][^8]。
- **RS-10#19** W3C Baggage は Candidate Recommendation Snapshot（2024-05-30）である [N][^9]。baggage-string が list-member 64 個以下かつ 8192 bytes 以下であれば、platform は全 list-member を伝播しなければならない（MUST）[N][^9]。どちらかを超える場合は、両条件を満たすまで list-member を落としてよい（MAY）[N][^9]。つまり 64 個・8192 bytes は送信側の禁止上限ではなく、全件伝播が保証される範囲である [D]。Privacy Considerations は、baggage に利用者を識別できるデータが入り得ることを認めた上で "Systems MUST assess the risk of header abuse." と定める [N][^9]。Security Considerations は "Application owners should either ensure that no proprietary or confidential information is stored in baggage, or they should ensure that baggage isn't present in requests that cross trust-boundaries." と述べる [N][^9]。
- **RS-10#20** OpenTelemetry Specification v1.61.0 の Baggage API（Status: Stable）は "To avoid sending any name/value pairs to an untrusted process, the Baggage API MUST provide a way to remove all baggage entries from a context." と定める [N][^11]。
- **RS-10#21** OpenTelemetry の公式ドキュメント（仕様本体ではない解説文書）は、"Sensitive Baggage items can be shared with unintended resources, like third-party APIs." と警告する [N][^12]。その理由として、自動計装が多くのネットワーク要求に baggage を含めることを挙げる [N][^12]。同じ文書は、baggage は span・metric・log の attribute へ自動では付与されず、明示的に読み出して付与する必要があるとしている [N][^12]。
- **RS-10#22** OpenTelemetry の Tracing SDK 仕様（Status: Stable, except where otherwise specified）では、Sampler の決定が DROP の場合について次のように定める [N][^10]。原文: "IsRecording will be false, the Span will not be recorded and all events and attributes will be dropped."。RECORD_ONLY では "the Sampled flag MUST NOT be set" である [N][^10]。監査イベントを span event として出すと、sampling で欠落する [D]。

### 3.3 記録対象・欠損検知・時刻同期

- **RS-10#23** PCI DSS v4.0 の 10.2.1 は "Audit logs are enabled and active for all system components and cardholder data." を求める [N][^13]。10.2.1.1〜10.2.1.7 は、次を全件記録の対象として列挙する [N][^13]。
  - カード会員データへの全ての個別アクセス
  - 管理者権限を持つ個人の全操作（アプリケーション・システムアカウントの対話的利用を含む）
  - 監査ログへの全アクセス
  - 全ての無効な論理アクセス試行
  - 識別・認証情報の全変更（新規アカウント作成、権限昇格、管理者アカウントの変更・追加・削除）
  - 監査ログの初期化と、開始・停止・一時停止
  - システムレベルのオブジェクトの作成・削除
- **RS-10#24** PCI DSS v4.0 の 10.2.2 は、各監査イベントに次の項目を記録することを求める [N][^13]。
  - user identification
  - type of event
  - date and time
  - success and failure indication
  - origination of event
  - identity or name of affected data, system component, resource, or service
- **RS-10#25** PCI DSS v4.0 の 10.3.1〜10.3.4 は次を求める [N][^13]。
  - 監査ログの読取りを、業務上必要な者に限る
  - 個人による変更から保護する
  - 中央の内部ログサーバまたは変更しにくい媒体へ速やかにバックアップする
  - 監査ログに file integrity monitoring または変更検知を適用する
- **RS-10#26** PCI DSS v4.0 の 10.7.2 は "Failures of critical security control systems are detected, alerted, and addressed promptly" を求める [N][^13]。対象には "Logical access controls"、"Audit logging mechanisms"、"Audit log review mechanisms" を含む [N][^13]。適用範囲は全エンティティで、2025-03-31 までは best practice とされていた [N][^13]。10.7.3 は、障害への対応として、セキュリティ機能の復旧と、障害期間（開始から終了までの日時）の記録などを求める [N][^13]。
- **RS-10#27** PCI DSS の版の状態は次のとおりである。PCI SSC は、v4.0 を 2024-12-31 に退役させ、v4.0.1 用の SAQ を公開した [N][^14]。2026-06-03 には、v4.0.1 に対する Request for Comments（意見期限 2026-07-20）を告知した [N][^15]。v4.0.1 は 2024-06-11 に PCI SSC が公表した限定改訂で、PCI SSC は要件の追加・削除はないとしている [N][^54]。本書の要件文言は、公開されている v4.0 の SAQ D（Service Provider 用）から引いた。v4.0.1 本体との文言差（書式・誤記の修正と、一部要件の意図の明確化）は未確認である（§6）。
- **RS-10#28** 欧州委員会実施規則（EU）2024/2690（NIS2 指令の技術的要件）の対象は、Art.1 に列挙されたクラウドコンピューティングサービス、マネージドサービス等の提供者である [N][^17]。同規則は、Annex 3.2.3 で記録対象として次を挙げる（いずれも "Where appropriate"）[N][^17]。
  - 利用者の作成・変更・削除と権限の拡張
  - システム・アプリケーションへのアクセス
  - 認証関連のイベント
  - 全ての特権アクセスと管理者アカウントの操作
  - 各種ログの起動・停止・一時停止
- **RS-10#29** 同規則 Annex 3.2.5 は、ログを予め定めた期間保持してバックアップし、無権限のアクセスと変更から保護することを求める [N][^17]。Annex 3.2.6 は、時刻源の同期を求める（可能な範囲で）[N][^17]。同じく、監視・ログ系の冗長化と、その可用性を監視対象とは独立して監視することを求める [N][^17]。原文: "The availability of the monitoring and logging systems shall be monitored independent of the systems they are monitoring."。
- **RS-10#30** 欧州委員会委任規則（EU）2024/1774（DORA の ICT リスク管理 RTS）第 12 条第 2 項は、ログの手順・プロトコル・ツールに次を含めることを求める [N][^16]。
  - 記録対象イベントの特定、保持期間、ログデータの保護
  - アクセス制御と ID 管理に関するイベントの記録
  - "measures to protect logging systems and log information against tampering, deletion, and unauthorised access at rest, in transit, and, where relevant, in use"
  - "measures to detect a failure of logging systems"
  - 信頼できる参照時刻への時計同期
  同条は、保持期間を事業・情報セキュリティの目的とリスク評価の結果を考慮して定めるとしている [N][^16]。
- **RS-10#31** DORA RTS 第 23 条第 2 項は、異常検知ツールに "automated alerts based on pre-defined rules to identify anomalies affecting the completeness and integrity of the data sources or log collection" を含めることを求める [N][^16]。適用先は EU の金融機関であり、本基盤はその委託先（ICT 第三者サービス提供者）として契約で間接的に求められる可能性がある [D]。
- **RS-10#32** SP 800-53 Rev.5 の AU-5 は、監査ログ処理の障害時に、指定の担当者へ指定時間内に警報を出し、追加の措置を取ることを求める [N][^6]。AU-5(2) は、指定の障害事象に対するリアルタイム警報を求める [N][^6]。AU-5(4) は、監査ログの障害時に、全停止・部分停止・機能を限った縮退運転のいずれかを発動することを求める [N][^6]。ただし代替の監査ログ能力がある場合を除く（"unless an alternate audit logging capability exists"）[N][^6]。
- **RS-10#33** SP 800-53 Rev.5 は、監査情報の保護について次を定める [N][^6]。
  - AU-9: 監査情報と監査ツールを無権限のアクセス・変更・削除から保護し、検知時に警報する
  - AU-9(2): 監査対象とは物理的に別のシステムに保管する
  - AU-9(3): 暗号機構で完全性を保護する
  - AU-10: 否認防止
  - AU-8: UTC またはオフセット付きの時刻印
- **RS-10#34** 米国 OMB 覚書 M-21-31（2021-08-27、連邦行政機関向け）は、ログ設備とログ情報を "protected by cryptographic methods from tampering and unauthorized access" とすることを求める [N][^18]。ログ収集が有効であることを検証し、データストリームの途絶を監視する trap を置いて監視することも求める [N][^18]。Appendix C は、Identity & Credential Management ログ等の多くの区分で、保持を "12 Months Active Storage" と "18 Months Cold Data Storage" としている [N][^18]。現在も有効かどうかは未確認である（§6）。
- **RS-10#35** NIST SP 800-92 Rev.1（Cybersecurity Log Management Planning Guide）は initial public draft（2023-10-11、意見期限 2023-11-29）である [N][^19]。CSRC は 2026-10-03 時点でも "NIST is in the process of addressing public comments" と表示しており、final 版はない [N][^20]。ipd の作業項目には、次がある [N][^19]。
  - TS-3.5: 保管・転送中の各ログイベントの機密性・完全性・可用性
  - TS-3.7: ログの保管エラー・転送エラーの扱い
  - TS-3.8: active storage から cold storage への移行時期
- **RS-10#36** NIST SP 800-92（Guide to Computer Security Log Management）の final は 2006-09-13 付である [N][^21]。CSRC の log management プロジェクトページは、これを Rev.1 で置き換える予定と示している [N][^20]。設計文書は 800-92 Rev.1 を final として引用してはならない [D]。

### 3.4 改ざん検知（hash chain・Merkle tree・透明性ログ）

- **RS-10#37** RFC 9162（Certificate Transparency Version 2.0）は Experimental（2021-12）で、RFC 6962 を廃止した [N][^22]。append-only の性質は Merkle Tree で実現している [N][^22]。原文: "can be used to efficiently prove that any particular instance of the log is a superset of any particular previous instance"（§1）。consistency proof について "Merkle consistency proofs prove the append-only property of the tree." と述べる（§2.1.4）[N][^22]。
- **RS-10#38** RFC 9162 §1 は、相手ごとに矛盾したビューを見せるログは同 RFC の監査機構を迂回できるとしている [N][^22]。原文: "Therefore, it is necessary to treat each log as a trusted third party."。これを防ぐ仕組み（gossip 等）は範囲外としている [N][^22]。監査ログの運用者を監査対象に含める場合、tree head を外部の第三者に配布するか、外部にアンカーする必要がある [D]。
- **RS-10#39** RFC 9943（An Architecture for Trustworthy and Transparent Digital Supply Chains）は Proposed Standard（2026-06）である [N][^23]。同 RFC §5.1.3 は、Transparency Service が使う Verifiable Data Structure が次の 3 つのセキュリティ要件を満たすことを MUST としている（"This VDS MUST support the following security requirements"）[N][^23]。
  - Append-only: "ensuring that the Statement Sequence cannot be modified, deleted, or reordered"
  - Non-equivocation: 登録された Signed Statement の列に分岐がない
  - Replayability: 内容にアクセスできる者が、各 Signed Statement が正しく登録されたことを検査できる情報を含む
- **RS-10#40** RFC 9943 §8 は、"TSs can leverage VDSs that only retain cryptographic metadata (e.g., a hash) rather than the complete Signed Statement" と述べる [N][^23]。また、Issuer は PII を Statement に含めることを、Transparency Service のプライバシー体制と照らして慎重に検討しなければならないとしている（原文は小文字の "must carefully review" で、BCP 14 の規範語ではない）[N][^23]。透明性ログには監査レコード本体ではなくハッシュだけを登録する方式が、標準の想定内にある [D]。
- **RS-10#41** RFC 9942（COSE Receipts）は Proposed Standard（2026-06）である [N][^24]。RFC 9162 の Merkle tree（RFC9162_SHA256）について、inclusion proof と consistency proof の COSE 符号化を定める [N][^24]。外部アンカーの検証形式として使える [D]。
- **RS-10#42** OCSF 1.9.0 の record_integrity profile は、base event に attestation_list（optional）を追加し、全てのイベントクラスに暗号的 attestation を付けられるようにした [N][^2]。attestation オブジェクトの構成は次のとおりである [N][^2]。
  - fingerprint: canonical serialization に対して計算する
  - signatures: co-signature・notary・witness を含められる
  - prev_event: 直前イベントの fingerprint を参照する
  - chain_uid、authority_uid
  原文: "Because prev_event is inside the serialized content, deleting or altering an event in a chain breaks the fingerprint and signatures of the event that references it."。
- **RS-10#43** AWS CloudTrail の log file integrity validation は、ハッシュに SHA-256、署名に SHA-256 with RSA を使う [V][^25]。1 時間ごとに digest file を配信し、各 digest file は直前の digest file の署名を含む [V][^25]。これにより "assert positively that no log files were delivered to your account during a given period of time" ができるとしている [V][^25]。期間単位の chain により、ファイル削除も検知対象にする実装例である [D]。

### 3.5 WORM（主要クラウドの Object Lock 等と SEC 17a-4）

- **RS-10#44** Amazon S3 Object Lock は WORM モデルで、S3 Versioning が有効なバケットでだけ動作する [V][^26]。compliance mode の性質は次のとおりである [V][^26]。原文: "The only way to delete an object under the compliance mode before its retention date expires is to delete the associated AWS account."
  - root user を含む誰も、保持期間中のオブジェクトを上書き・削除できない
  - 保持期間を短縮できない
  - governance mode は、s3:BypassGovernanceRetention 権限とヘッダの明示指定で迂回できる
  - legal hold には期限がない
- **RS-10#45** S3 Object Lock 下での削除要求の扱いは次のとおりである [V][^26]。
  - version ID を指定した削除は 403 で拒否される
  - version ID を指定しない削除は 200 を返し、delete marker が挿入される
  AWS の文書は、Object Lock が Cohasset Associates により SEC 17a-4、CFTC、FINRA の規制環境での使用について評価されたと記す [V][^26]。これは事業者の表明であり、評価報告書の本文は未読である（§6）。
- **RS-10#46** Azure Blob の immutable storage には、time-based retention と legal hold がある [V][^27]。ロック済みの time-based retention policy は削除できず、保持期間を延長はできるが短縮はできない [V][^27]。container レベルでは、ロック後の延長は最大 5 回までである [V][^27]。保持期間は 1 日〜146,000 日である [V][^27]。SEC 17a-4(f) 等に準拠した状態にするには、policy のロックが必要とされ、未ロック状態は短期のテスト用とされる [V][^27]。version レベルの policy 変更は監査されない [V][^27]。
- **RS-10#47** Google Cloud Storage の Bucket Lock について、公式文書は "Locking a bucket's retention policy is an irreversible action." と述べる [V][^28]。ロックしたバケットは、全オブジェクトが保持期間を満たすまで削除できない [V][^28]。保持期間の上限は 3,155,760,000 秒（100 年）である [V][^28]。
- **RS-10#48** 米国 17 CFR 240.17a-4(f)(2)(i) は、ブローカー・ディーラーの電子記録システムについて、次の 2 方式のいずれかを求める [N][^29]。
  - (A) 全ての変更・削除を含む完全な時刻付き audit trail で、改変・削除された原記録を再現できるもの
  - (B) "Preserve the records exclusively in a non-rewriteable, non-erasable format"
  (ii) は、保存プロセスの完全性・正確性の自動検証を求める [N][^29]。この規則が直接適用されるのは、ブローカー・ディーラーの所定の記録である [N][^29]。WORM は唯一の手段ではなく、audit trail 方式も認められている [D]。本基盤の監査ログに直接適用されるかどうかは、DL-34 で判定する事項である [D]。

### 3.6 削除権・仮名化・crypto-shredding

- **RS-10#49** GDPR Art.17(1) は、目的に照らして不要になった場合等に、controller が個人データを不当な遅滞なく消去する義務を負うと定める [N][^30]。Art.17(3) は、処理が次のいずれかに必要な範囲では、同条 1 項・2 項を適用しないと定める [N][^30]。
  - (b) 法的義務の遵守
  - (e) "the establishment, exercise or defence of legal claims"
- **RS-10#50** GDPR Art.5(1)(e)（storage limitation）は、識別できる形での保存を、目的に必要な期間を超えないものに限る [N][^30]。Art.4(5) は、仮名化を「追加情報を分離して保管し、技術的・組織的措置の下に置くことを条件に、追加情報なしでは特定の本人に帰属できない処理」と定義する [N][^30]。前文 26 は "Personal data which have undergone pseudonymisation, which could be attributed to a natural person by the use of additional information should be considered to be information on an identifiable natural person." と述べる [N][^30]。
- **RS-10#51** GDPR 前文 49 は、厳密に必要かつ比例的な範囲でのネットワーク・情報セキュリティ確保のための処理を、"constitutes a legitimate interest of the data controller concerned" としている [N][^30]。Art.32(1)(a) は、適切な安全管理措置の例として仮名化と暗号化を挙げる [N][^30]。Art.25(1) は、設計段階から仮名化等の措置を組み込むことを求める [N][^30]。
- **RS-10#52** GDPR Art.33(1) は、監督機関への個人データ侵害の通知を、不当な遅滞なく、可能な場合は覚知から 72 時間以内に行うことを求める [N][^30]。Art.33(5) は、侵害の事実・影響・是正措置を文書化し、監督機関が遵守を検証できるようにすることを求める [N][^30]。侵害の範囲（誰のどのデータに誰がアクセスしたか）を立証する材料は、主に監査ログである [D]。
- **RS-10#53** CJEU は EDPS v SRB（C-413/23 P、2025-09-04、ECLI:EU:C:2025:645）で、次のように判示した [N][^32]。
  - 仮名化データは "must not be regarded as constituting, in all cases and for every person, personal data" である（para 86）
  - 仮名化により、controller 以外の者にとって本人が識別できない場合があり得る
  - 追加情報を持つ controller にとっては、仮名化後も個人データの性格を保つ（para 76〜77）
  事案は EU 機関に適用される規則 2018/1725 に関するものである [N][^32]。鍵や対応表を持つ本基盤の運用者にとって、仮名化した監査ログは個人データのままである [D]。
- **RS-10#54** EDPB と EDPS は Joint Opinion 2/2026（2026-02-10 採択）で、Digital Omnibus 提案（COM(2025) 836）を論評した [N][^36]。提案の内容は次のとおりである [N][^36]。
  - GDPR Art.4(1) に「他者が識別できるだけでは、全ての者にとって個人データになるわけではない」旨の項を追加する
  - Art.33 の侵害通知期限を 72 時間から 96 時間に延ばす
  両機関は、定義の変更が「targeted」な改正の範囲を超えると批判している [N][^36]。2026-10-03 時点の立法手続の状態は一次資料で確認できていない（§6）。設計は現行の GDPR を前提にする [D]。
- **RS-10#55** EDPB Guidelines 02/2025（blockchain、Version 1.1、2025-04-08 採択の意見募集版）は §4.2 で次のように述べる [N][^34]。
  - 原文: "technical impossibility cannot be invoked to justify non-compliance with GDPR requirements"
  - 原文: "encrypted personal data is still personal data and encryption does not remove the need for GDPR compliance"
  - 復号鍵を消すと、暗号化データは "at least until the algorithm is broken" 判読できなくなる
  - 鍵付き・salt 付きハッシュも個人データとみなされる。鍵や salt を消した後は、アルゴリズムが破られず、鍵が漏えいしていなければ、元データと結び付けられなくなるはずである
  - 個人データを鎖上に置く必要がある場合は、存在証明（ポインタ、commitment、鍵付きハッシュ）だけを鎖上に置き、データ本体を鎖外に置く方がよい
  §4.3 は、削除を設計に織り込んでいない場合、鎖全体の削除が必要になり得るとしている [N][^34]。append-only の監査チェーンにも同じ構造の問題がある [D]。
- **RS-10#56** NIST SP 800-88 Rev.2（Guidelines for Media Sanitization、2025-09、Rev.1 を置換）は、Cryptographic Erase（CE）を「データを暗号化した鍵を消去すること、または鍵へのアクセスを防ぐこと」に基づく消去と説明する（§3.2）[N][^37]。cloud 等の論理ストレージでは、CE が唯一の現実的な purge 手段になり得るとしている（§3）[N][^37]。CE の前提として、平文の機微データが一度も保存されていないことを挙げる（§3.2.2、ISO/IEC 27040 を引用）[N][^37]。
- **RS-10#57** SP 800-88r2 §3.2.2 は、数十年にわたり機密性が要る情報では、将来の暗号の弱点の発見や計算能力の向上（量子計算を含む）で鍵の回復が可能になり得るとしている [N][^37]。原文: "For such situations, CE may not be an acceptable sanitization technique."。バックアップ・エスクローされた媒体では、鍵の保管場所と管理に高い確信がない限り、CE を信頼すべきでない（should not）とする [N][^37]。§3.2.3 は、ISO/IEC 27040 を引いて "all copies of the target cryptographic keys must be able to be sanitized" と述べる [N][^37]。§3.2.5 は、CE を実施した証跡に含める項目（鍵のエスクロー・注入の有無、エラー時の扱い等）を列挙する [N][^37]。
- **RS-10#58** AWS KMS の鍵削除は不可逆で、削除後はその鍵で暗号化したデータを復号できない [V][^38]。ただし AWS は例外として、multi-Region replica key と、imported key material を使う非対称鍵・HMAC 鍵を挙げている [V][^38]。7〜30 日（既定 30 日）の待機期間を必須とし、実際の待機は指定より最大 24 時間長くなり得る [V][^38]。鍵削除の予約は、暗号化済みの data key に直ちには影響しない場合がある [V][^38]。CloudHSM key store の場合、"AWS KMS does not delete the key material from cluster backups." である [V][^38]。crypto-shredding の完了時刻は「削除操作の時刻」ではなく「待機期間・キャッシュ・バックアップを含めた全コピーが消えた時刻」で定義する必要がある [D]。crypto-shredding に使う鍵では、上記の例外に当たる鍵種別（multi-Region replica、imported key material）を避けるか、全 replica・鍵材料の原本の消去を手順に含める必要がある [D]。
- **RS-10#59** EDPB は消去権の協調執行（CEF 2025）報告書を 2026-02-10 に採択した（報告書表紙の "Adopted on 10 February 2026"。公表のプレスリリースは 2026-02-18）[N][^33]。報告書の §4.2.6 はバックアップについて次のように述べる [N][^33]。
  - バックアップの改変・削除が常に望ましいとは限らない
  - その場合も "organisations should have appropriate procedures to keep track of erasure requests and comply with them on restored systems" とすべきである
  - controller への推奨は "Verify that erasure has been carried out and be able to demonstrate such erasure." である
  §4.2.7 は、消去の代わりに「匿名化」を行う controller の一部が、実際には単純な仮名化や部分マスキングしか施しておらず、消去要件を満たしていないと指摘する [N][^33]。本報告書は執行調査の集約であり、推奨に法的拘束力はない [D]。
- **RS-10#60** CJEU は Pankki S（C-579/21、2023-06-22）で、本人の個人データに対する照会操作について、その日時と目的に関する情報は、本人が Art.15(1) に基づき controller から得る権利のある情報であると判示した [N][^31]。照会を行った従業員の身元は原則として対象外とした [N][^31]。ただし、本人が権利を実効的に行使するために不可欠で、従業員の権利と自由を考慮した場合は例外とした [N][^31]。事案は、銀行の内部監査部門による照会のログである [N][^31]。
- **RS-10#61** 米国カリフォルニア州民法 1798.105(d) は、消費者の削除請求に応じなくてよい場合を列挙する [N][^39]。その中に、"Help to ensure security and integrity to the extent the use of the consumer's personal information is reasonably necessary and proportionate for those purposes."（(d)(2)）と、法的義務の遵守がある [N][^39]。
- **RS-10#62** 米国 HIPAA の 45 CFR 164.312(b)（Standard: Audit controls）は、電子保護医療情報を含む・使う情報システムの活動を記録・検査する仕組みの実装を求める [N][^40]。164.316(b)(2)(i) は、同条 (b)(1) で求める文書を、作成日または最終有効日のいずれか遅い方から 6 年間保持することを求める [N][^40]。この 6 年は方針・手順等の文書についての規定であり、監査ログ自体の保持期間を定めたものかどうかは本書では判断していない（§6）。

### 3.7 日本の個人情報保護法

- **RS-10#63** 個人情報保護法第 23 条は、個人情報取扱事業者に、個人データの漏えい・滅失・毀損の防止その他の安全管理のために必要かつ適切な措置を講じることを義務付ける（講じなければならない）[N][^44]。第 22 条は、利用する必要がなくなった個人データを遅滞なく消去するよう努めなければならないと定める（努力義務）[N][^44]。保持期間を一律に定める規定は、確認した条文にはなかった [N][^44]。
- **RS-10#64** 個人情報保護委員会のガイドライン（通則編、令和 8 年 6 月一部改正）10（別添）「組織的安全管理措置」は、次の 2 つを講じなければならない措置として挙げる（p.171）[N][^46]。
  - (2) 個人データの取扱いに係る規律に従った運用: 整備した規律に従って個人データを取り扱わなければならない。運用の状況を確認するため「利用状況等を記録することも重要である」
  - (3) 個人データの取扱状況を確認する手段の整備: 原文「個人データの取扱状況を確認するための手段を整備しなければならない」
  (2) の手法の例示は、次の項目について「システムログその他の個人データの取扱いに係る記録の整備や業務日誌の作成等を通じて、個人データの取扱いの検証を可能とすること」を挙げる（p.173）[N][^46]。
  - 個人情報データベース等の利用・出力状況、削除・廃棄の状況
  - 担当者の情報システムの利用状況（ログイン実績、アクセスログ等）
- **RS-10#65** 同ガイドライン 10（別添）「外的環境の把握」は、外国で個人データを取り扱う場合、当該外国の制度等を把握した上で安全管理措置を講じなければならないとする（p.182）[N][^46]。
- **RS-10#66** 個人情報保護法第 35 条第 5 項は、本人が保有個人データの利用停止等を請求できる場合を定める [N][^44]。利用する必要がなくなった場合、第 26 条第 1 項の事態が生じた場合、本人の権利または正当な利益が害されるおそれがある場合である [N][^44]。同条第 6 項ただし書は、多額の費用を要する場合等で、代替措置をとるときは例外とする [N][^44]。ガイドライン（通則編）3-8-5-1 は、請求が認められないと考えられる事例として次を挙げる（p.140）[N][^46]。原文:「インターネット上で匿名の投稿を行った者が、発信者情報開示請求による発信者の特定やその後の損害賠償請求を免れるため、プロバイダに対してその保有する接続認証ログ等の利用停止等を請求する場合」。
- **RS-10#67** 第 26 条は、個人の権利利益を害するおそれが大きい漏えい等が生じたときに、委員会への報告と本人への通知を義務付ける [N][^44]。ガイドライン（通則編）は報告期限を次のとおり示す [N][^46]。
  - 速報（3-5-3-3）:「速やか」の目安は概ね 3〜5 日以内（p.64）
  - 確報（3-5-3-4）: 30 日以内。規則第 7 条第 3 号の事態（不正の目的によるおそれがあるもの）は 60 日以内
  令和 8 年法律第 56 号は 2026-07-17 に公布された [N][^45]。同法附則第 1 条によると、施行は「公布の日から起算して二年を超えない範囲内において政令で定める日」である [N][^45]。ただし、附則第 13 条・第 16 条は公布の日（2026-07-17）に、附則第 17 条は令和 8 年法律第 46 号の公布の日とこの法律の公布の日のいずれか遅い日（2026-07-17）に施行され、同条第 3 号の規定（第 125 条、第 163 条第 2 項・第 3 項、第 176 条〜第 185 条等の改正規定）は公布の日から起算して 6 月を経過した日（e-Gov の表示は 2027-01-17）に施行される [N][^45]。同法を反映した未施行版の条文には、次が含まれる [N][^45]。
  - 第 26 条第 2 項ただし書: 本人への通知が行われなくても本人の権利利益の保護に欠けるおそれが少ない場合を加える
  - 第 148 条の 3: 課徴金納付命令
- **RS-10#68** 第 28 条は、外国にある第三者への個人データの提供には、次のいずれかを要すると定める [N][^44]。
  - 本人の同意
  - 提供先が基準に適合する体制を整備していること
  - 提供先が我が国と同等の水準と認められる国にあること
  ガイドライン（外国第三者提供編、令和 7 年 12 月一部改正）は、同等の水準の国として EU（平成 31 年告示第 1 号の国。英国を除く）と英国を挙げる [N][^47]。基準適合体制を根拠に提供した場合は、第 28 条第 3 項に基づき、提供先による相当措置の継続的な実施を確保する措置が必要とする [N][^47]。
- **RS-10#69** 個人情報保護委員会の Q&A（A7-53、A12-3）は、クラウドの扱いについて次のように述べる [N][^48]。
  - クラウド事業者が個人データを取り扱わないこととなっている場合（契約条項で取り扱わない旨を定め、適切にアクセス制御している場合等）は「提供」に当たらない
  - 外国の事業者が外国に設置したサーバでも同様である
  A12-4 は、サーバが国内にあっても、外国の事業者が保存データを取り扱っている場合は外国にある第三者への提供に当たるとする [N][^48]。原文:「当該サーバを運営する外国にある事業者が、当該サーバに保存された個人データを取り扱っている場合には、サーバが国内にある場合であっても、外国にある第三者への提供（法第28条第１項）に該当します。」。ただし、その外国事業者が日本国内で個人データを取り扱い、日本国内で個人情報データベース等を事業の用に供していると認められる場合は該当しないとしている [N][^48]。A10-25 は、外国事業者のクラウドを使う場合、クラウド事業者の所在国名とサーバ所在国名を明らかにし、講じた措置を本人の知り得る状態に置く必要があるとする [N][^48]。

### 3.8 越境移転（EU・英国・米国）

- **RS-10#70** GDPR Chapter V は次を定める [N][^30]。
  - Art.44: 第三国への移転は、同章の条件を満たす場合に限る（onward transfer を含む）
  - Art.46: 十分性認定がない場合は、標準契約条項（SCC）等の適切な保護措置と、執行可能な権利・救済を要する
  - Art.49: 特定の状況での例外
  GDPR 自体は、EU 域内への保存（localization）を一般に義務付けてはいない（確認した条文の範囲）[N][^30]。
- **RS-10#71** EDPB Guidelines 05/2021（Version 2.0、2023-02-14 採択）は、移転に当たる 3 つの累積要件を示す [N][^41]。
  - 輸出者が GDPR の適用を受ける
  - 輸出者が送信その他の方法で輸入者に個人データを利用可能にする
  - 輸入者が第三国にいる
- **RS-10#72** 同ガイドライン §2.2 は、遠隔アクセスとクラウド保存について次のように述べる [N][^41]。原文: "remote access from a third country (even if it takes place only by means of displaying personal data on a screen, for example in support situations, troubleshooting or for administration purposes) and/or storage in a cloud situated outside the EEA offered by a service provider, is also considered to be a transfer, provided that the three criteria ... are met"。Example 11 は、第三国の processor が support 目的で EU 内のデータに遠隔アクセスする場合を移転としている [N][^41]。
- **RS-10#73** 同ガイドラインは次も指摘する [N][^41]。
  - 移転に当たらない場合でも、EU 域外での処理は、第三国の法令の衝突や過度な政府アクセスによりリスクが高まり得る。これは安全管理措置で考慮すべきである
  - EU 内の processor でも、第三国の法令の適用を受ける場合には、政府アクセス要求を通じて移転が生じ得る
- **RS-10#74** 欧州委員会の十分性認定のページには、次が掲載されている [N][^42]。
  - 日本: 2023-04-04 に第 1 回見直しの報告
  - 英国: GDPR に基づく十分性認定の更新（2025-12-19）
  - 米国: EU-US Data Privacy Framework（2023-07-10 採択。DPF 参加組織が対象）
- **RS-10#75** 米国について EU 側の十分性認定は DPF 参加組織に限られる [N][^42]。DPF を根拠とするのは、取引先が DPF に参加している場合に限られる [D]。
- **RS-10#76** 2025-10-31 に Philippe Latombe が上訴（C-703/25 P）を提起した [N][^43]。対象は、DPF 十分性認定（Commission Implementing Decision (EU) 2023/1795）に対する取消請求を退けた一般裁判所判決（T-553/23、2025-09-03）である [N][^43]。上訴人は、原判決の取消しと DPF 十分性認定の取消しを求めている [N][^43]。2026-10-03 時点の判決の有無は未確認である（§6）。
  別の動きとして、EDPB 議長は 2026-07-31 付の書簡で欧州委員会に次を伝えた [N][^55]。
  - 米国最高裁は 2026-06-29 の Trump v. Slaughter 判決で Humphrey's Executor 判決を覆し、FTC 委員を含む行政官が大統領の罷免権に服すると判断した（書簡の記載による。判決本文は未読）
  - DPF 十分性認定は FTC の独立性（委員は所定の理由でしか罷免されないこと）に言及している（同決定 §58〜60）
  - 同判決が Implementing Decision (EU) 2023/1795 の機能に影響するかを精査するよう求める
  この書簡は十分性認定を無効としたものではない [D]。ただし、DPF に依拠する移転の継続性リスクを示す一次資料である [D]。

### 3.9 保持期間の根拠

- **RS-10#77** PCI DSS v4.0 の 10.5.1 は "Retain audit log history for at least 12 months, with at least the most recent three months immediately available for analysis." を求める [N][^13]。
- **RS-10#78** DORA RTS 第 12 条は、保持期間を、事業・情報セキュリティの目的、記録の理由、ICT リスク評価の結果を考慮して金融機関が定めるとしている [N][^16]。NIS2 実施規則 Annex 3.2.5 は「予め定めた期間（predefined period）」の保持を求め、具体的な日数は定めていない [N][^17]。確認した資料が示す保持期間の数値は次のとおりである。
  - PCI DSS: 12 か月（うち 3 か月は即時に分析可能）[N][^13]
  - OMB M-21-31（連邦機関向け）: active 12 か月＋cold 18 か月 [N][^18]
  - HIPAA の文書保持: 6 年 [N][^40]
  - SEC 17a-4: 記録種別ごとの期間（本書では未調査）[N][^29]
  どれを適用するかは顧客の業種と契約で変わる [D]。

### 3.10 顧客向け監査 API と既定保持（参照事例）

- **RS-10#79** 主要サービスの監査ログの既定保持は次のとおりである。
  - Microsoft Entra ID: audit log と sign-in log は Free で 7 日、P1・P2 で 30 日。より長く保持するには、Azure Monitor 経由で storage 等へ送る。Microsoft Graph activity log は、archive・連携しない限り保持されない [V][^50]
  - Okta: "Events are retained by Okta for 90 days." [V][^49]
  - AWS CloudTrail: event history は、リージョンごとに過去 90 日の management event の "viewable, searchable, downloadable, and immutable record" である。data event を含まない。継続的な記録には trail または event data store の作成を求める [V][^51]
  いずれも、長期保持は利用者が export 先で行う前提である [D]。

### 3.11 コスト見積りに効く制約

- **RS-10#80** Amazon S3 の保管クラスには次の制約がある [V][^52]。
  - Standard-IA・One Zone-IA・Glacier Instant Retrieval: 最小課金サイズ 128KB
  - 最小保管期間: Standard-IA 30 日、Glacier Instant Retrieval・Flexible Retrieval 90 日、Deep Archive 180 日
  - Glacier Flexible Retrieval・Deep Archive: アーカイブ 1 オブジェクトあたり 40KB の追加メタデータ（32KB はアーカイブ料金、8KB は Standard 料金）。復元してからでないと読めない
  小さな監査イベントを 1 件 1 オブジェクトで保管すると、これらの固定費が支配的になる [D]。イベントはバッチにまとめてから WORM 層に書く必要がある [D]。Azure の immutable storage には追加の容量課金はなく、不変データは可変データと同じ料金である [V][^27]。version レベルの WORM では versioning により保管量が増え得る [V][^27]。policy の作成・ロック・延長には transaction の料金がかかる [V][^27]。

---

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| OCSF schema（Linux Foundation プロジェクト、SDO 外） | 1.9.0 | release（最新） | 2026-08-03 | 2026-10-03 | https://github.com/ocsf/ocsf-schema/releases/tag/1.9.0 |
| DMTF DSP0262 CADF Data Format and Interface Definitions | 1.0.0 | DMTF Standard（以後の本体改訂は確認できず） | 2014-06-19 | 2026-10-03 | https://www.dmtf.org/sites/default/files/standards/documents/DSP0262_1.0.0.pdf |
| DMTF DSP2038 CADF OpenStack Profile | 1.1.0 | DMTF Informational（本文は未読） | 2015-04-16（DMTF 標準ページの表示） | 2026-10-03 | https://www.dmtf.org/standards/cadf |
| W3C Trace Context | Level 1 | W3C Recommendation | 2021-11-23 | 2026-10-03 | https://www.w3.org/TR/trace-context/ |
| W3C Trace Context Level 2 | Level 2 | Candidate Recommendation Draft | 2024-03-28 | 2026-10-03 | https://www.w3.org/TR/trace-context-2/ |
| W3C Baggage | — | Candidate Recommendation Snapshot | 2024-05-30 | 2026-10-03 | https://www.w3.org/TR/baggage/ |
| OpenTelemetry Specification（CNCF プロジェクト、SDO 外） | v1.61.0 | release。Tracing SDK は "Stable, except where otherwise specified"、Baggage API は Stable | 2026-09-14 | 2026-10-03 | https://github.com/open-telemetry/opentelemetry-specification/releases/tag/v1.61.0 |
| NIST SP 800-92 | 初版 | final（Rev.1 で置換予定） | 2006-09-13 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/92/final |
| NIST SP 800-92 Rev.1 | ipd | ipd（意見期限 2023-11-29。CSRC 表示は "addressing public comments"） | 2023-10-11 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/92/r1/ipd |
| NIST SP 800-53 Rev.5 | Release 5.2.0 | final（NIST の表記は minor release／patch release） | 2025-08-27 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final |
| NIST SP 800-88 Rev.2 | Rev.2 | final（Rev.1 を置換） | 2025-09 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/88/r2/final |
| OMB M-21-31 | — | 発出済み（現在も有効かは未確認） | 2021-08-27 | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2021/08/M-21-31-Improving-the-Federal-Governments-Investigative-and-Remediation-Capabilities-Related-to-Cybersecurity-Incidents.pdf |
| RFC 9162 Certificate Transparency 2.0 | — | Experimental（RFC 6962 を廃止） | 2021-12 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9162 |
| RFC 9943 SCITT Architecture | — | Proposed Standard | 2026-06 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9943 |
| RFC 9942 COSE Receipts | — | Proposed Standard | 2026-06 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9942 |
| PCI DSS | v4.0.1 | 現行（本体は未取得。限定改訂で要件の追加・削除なし。v4.0 は 2024-12-31 退役。v4.0.1 への RFC 2026-06-03〜07-20） | 2024-06-11（PCI SSC の告知） | 2026-10-03 | https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1 |
| PCI DSS v4.0 SAQ D for Service Providers（要件文言の出典） | v4.0 | 退役版 v4.0 の SAQ | 2022-04 | 2026-10-03 | https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf |
| 17 CFR 240.17a-4 | eCFR（同条の最終改正 2024-08-02。eCFR は up to date as of 2026-10-01） | 現行規則 | — | 2026-10-03 | https://www.ecfr.gov/current/title-17/chapter-II/part-240/section-240.17a-4 |
| 45 CFR Part 164（HIPAA Security Rule） | eCFR（§164.312・§164.316 の版は 2016-12-30。eCFR は up to date as of 2026-10-01） | 現行規則（改正提案の状態は未確認） | — | 2026-10-03 | https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164 |
| Cal. Civ. Code 1798.105（CCPA） | Prop.24 による改正 | 現行（2023-01-01 運用開始） | 2020-12-16 発効 | 2026-10-03 | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.105 |
| GDPR（Regulation (EU) 2016/679） | OJ L 119 | 現行（2018-05-25 適用） | 2016-04-27 採択、2016-05-04 官報掲載 | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2016/679/oj |
| Digital Omnibus 提案（GDPR 改正を含む） | COM(2025) 836 | 提案（立法手続の状態は未確認） | 2025-11（EDPB-EDPS 意見の記載による） | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_edps_jointopinion_202602_digitalomnibus_en.pdf |
| EDPB Guidelines 05/2021（Art.3 と Chapter V） | Version 2.0 | final（意見募集後に採択） | 2023-02-14 | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf |
| EDPB Guidelines 01/2025（pseudonymisation） | 意見募集版 | 意見募集（2025-01-17〜03-14）。final 版は未確認 | 2025-01-16 採択（意見募集版） | 2026-10-03 | https://www.edpb.europa.eu/public-consultations/guidelines-012025-on-pseudonymisation_en |
| EDPB Guidelines 02/2025（blockchain） | Version 1.1 | 意見募集版（期限 2025-06-09）。final 版は未確認 | 2025-04-08 | 2026-10-03 | https://www.edpb.europa.eu/system/files/2025-04/edpb_guidelines_202502_blockchain_en.pdf |
| EDPB CEF 2025 報告書（right to erasure） | — | 採択（執行調査報告、非拘束） | 2026-02-10 採択（公表 2026-02-18） | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_cef-report_2025_right-to-erasure_en.pdf |
| EDPB-EDPS Joint Opinion 2/2026 | — | 採択 | 2026-02-10 | 2026-10-03 | https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_edps_jointopinion_202602_digitalomnibus_en.pdf |
| CJEU C-579/21 Pankki S | 判決 | 確定判決（先決裁定） | 2023-06-22 | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62021CJ0579 |
| CJEU C-413/23 P EDPS v SRB | 判決 | 確定判決（上訴審） | 2025-09-04 | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62023CJ0413 |
| EU-US DPF 十分性認定（Implementing Decision (EU) 2023/1795） | — | 有効。上訴 C-703/25 P が係属（判決の有無は未確認）。EDPB が 2026-07-31 に Trump v. Slaughter の影響精査を欧州委員会に要請 | 2023-07-10 | 2026-10-03 | https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en |
| 上訴 C-703/25 P（Latombe v Commission） | OJ C/2025/6610 | 提起済み | 2025-10-31 提起、2025-12-22 官報掲載 | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62025CN0703 |
| DORA RTS（Delegated Regulation (EU) 2024/1774） | OJ L 2024/1774 | 現行 | 2024-06-25（官報） | 2026-10-03 | https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj |
| NIS2 実施規則（Implementing Regulation (EU) 2024/2690） | OJ L 2024/2690 | 現行 | 2024-10-18（官報） | 2026-10-03 | https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj |
| 個人情報保護法（平成 15 年法律第 57 号） | 2026-10-01 施行版 | 現行 | — | 2026-10-03 | https://laws.e-gov.go.jp/law/415AC0000000057 |
| 個人情報の保護に関する法律等の一部を改正する法律（令和 8 年法律第 56 号） | — | 公布済み。本則の改正規定は未施行（2 年以内に政令で定める日。附則第 1 条第 3 号の規定は 2027-01-17 施行と表示）。附則第 13 条・第 16 条・第 17 条だけ 2026-07-17 施行 | 2026-07-17 公布 | 2026-10-03 | https://laws.e-gov.go.jp/api/2/law_revisions/415AC0000000057 |
| 個人情報保護法ガイドライン（通則編） | 令和 8 年 6 月一部改正 | 現行 | 2026-06 | 2026-10-03 | https://www.ppc.go.jp/files/pdf/260614_guidelines01.pdf |
| 個人情報保護法ガイドライン（外国にある第三者への提供編） | 令和 7 年 12 月一部改正 | 現行 | 2025-12 | 2026-10-03 | https://www.ppc.go.jp/files/pdf/251212_guidelines02.pdf |
| 個人情報保護委員会 Q&A | Web 版（項目ごとに更新日あり） | 現行（監督機関の解釈。法令ではない） | 項目別 | 2026-10-03 | https://www.ppc.go.jp/personalinfo/faq/APPI_QA/ |
| EDPB 書簡（US Supreme Court judgment Trump v. Slaughter） | — | 送付済み（議長名の書簡。非拘束） | 2026-07-31 | 2026-10-03 | https://www.edpb.europa.eu/system/files/2026-08/edpb_letter_20260731_us_supremecourt_judgment_trump_v_slaughter_en.pdf |

---

## 5. 設計への含意（ADR・設計文書への入力）と PoC 実測項目

### 5.1 ADR・設計文書への入力

| 入力先 | 入力内容 | 根拠 | 閉じ方 |
|---|---|---|---|
| ADR-014（監査データ）／DL-77（監査イベントスキーマ） | 正準スキーマを自社で定義する。必須項目は次のとおり。decision_id、trace_id（相関専用）、tenant、actor chain（委任・エージェントを含む）、resource、action、decision（列挙を自社 profile で固定）、reason、policy/model revision、PDP のノード・cell、producer 連番、スキーマ版。人によるアクセスには目的欄を必須にする。OCSF 1.9.0（API Activity＋actor.authorizations）と CADF（control）への写像を export 層で提供し、写像は版付きで管理する [D] | RS-10#1〜#15, #60 | A |
| ADR-014／DL-25（監査ログ設計・PIA） | 全件記録の下限を、PCI DSS 10.2.1.x・NIS2 実施規則 Annex 3.2.3 の列挙に揃える。集約を検討してよいのは低リスク read の allow だけとし、集約時も件数・期間・代表 decision_id を残す。監査レコード中の個人識別情報は、PIA で特定した要素に限る（AU-3(3)）[D] | RS-10#15, #23〜#28 | A（PIA の承認は B） |
| ADR-014／DL-25 | WORM と削除権の調停方式は次の 3 層とする（仮定依存なし）[D]。(1) WORM 層: 仮名 ID と、主体別・テナント別の鍵で暗号化した属性、およびハッシュだけを置く。(2) 対応表・鍵層: WORM の外に置き、削除可能にする。(3) 透明性ログ: tree head の外部アンカーにはハッシュだけを登録する。crypto-shredding は消去の代替と主張しない。法的評価を法務・DPO の判断に回す [D] | RS-10#44〜#59 | B（法務）＋C（実測） |
| ADR-013（cell 分割と fail-mode） | 監査 sink の停止を fail-mode matrix の障害種別に含める [D]。操作階層ごとに AU-5(4) の選択肢（全停止・部分停止・縮退）と代替経路（ローカル spool の上限・時間）を定める。privileged・break-glass は、監査できなければ拒否を初期値にする候補とする [D] | RS-10#26, #29〜#32 | C |
| ADR-007（鍵階層と KMS/HSM） | 監査署名鍵を token 署名鍵と分離する [D]。crypto-shredding 用の鍵階層（テナント KEK→主体 DEK 等）と、全コピー（KMS の待機期間、キャッシュ、HSM バックアップ）の消去手順を定める。鍵粒度と鍵数の上限を、規模前提から試算する（仮定依存: CONVENTIONS §7、A-ID 未採番）[D] | RS-10#56〜#58 | A＋C |
| ADR-015（crypto agility と PQC） | hash chain と署名のアルゴリズム識別子を、レコードごとに持たせる（OCSF の fingerprint・digital_signature は algorithm・serialization を持つ）[D]。20 年保持では、再アンカーと再署名の手順を定める。量子計算機の影響を考え、長期保持データの機密性を CE だけに頼らない [D] | RS-10#42, #57 | A |
| ADR-016（versioning） | 監査スキーマの版（自社）と写像先の OCSF の版を分けて持つ。OCSF の minor 更新を追随する手順と、非推奨属性の移行（例: app_name→application）を定める [D] | RS-10#1, #3, #6 | A |
| ADR-018（出口戦略） | 監査ログを OCSF・CADF の開かれた形式で全件 export でき、検証用の chain・receipt も一緒に渡せることを契約条項にする [D] | RS-10#10, #41〜#42 | A＋B |
| ADR-019（侵害時 runbook）／DL-24 | 監査基盤の侵害・停止時の手順を定める。legal hold の設定・解除の権限と二者承認、障害期間の記録（PCI DSS 10.7.3）、通知期限（GDPR 72 時間、個人情報保護法の速報 3〜5 日・確報 30／60 日）に間に合う証拠抽出手順を含める [D] | RS-10#26, #44〜#47, #52, #67 | A＋C |
| ADR-011・ADR-012（PEP–PDP API、PEP coverage） | PDP の応答に decision_id を含め、PEP の監査レコードと PDP の監査レコードを decision_id で突合する（CADF の observer モデル）[D]。突合できない応答を coverage 欠落の KRI 候補にする [D] | RS-10#13 | C |
| ADR-009・ADR-017（委任、AI エージェント） | actor chain を OCSF の delegation・ai_agent に写像できる形で記録する [D] | RS-10#9 | A |
| DL-26（顧客管理機能）／R-134 | 顧客向け監査 API で次を提供する。検索、テナント単位の連続 export（stream）、producer 連番・watermark による欠落検知、レコードの検証情報（chain・receipt）、主体単位の照会履歴（日時・目的）の抽出。既定保持は顧客契約で定め、長期保持は顧客側 sink を前提にする [D] | RS-10#60, #79 | A |
| DL-34（法域・規制適用性判定表）／RS-16 | 次の適用を判定する。PCI DSS 10、DORA RTS 第 12・23 条（金融顧客の委託先として）、NIS2 実施規則（cloud・MSP に当たるか）、HIPAA 164.312(b)、SEC 17a-4（broker-dealer 顧客）、GDPR Chapter V（遠隔参照を含む）、個人情報保護法第 28 条・外的環境の把握 [D] | RS-10#23〜#34, #48, #62, #68〜#76 | B |
| DL-20（数値契約）／R-193 | 監査の SLI 候補は次のとおり。全件記録対象の記録率、欠損の検知時間、WORM への転送遅延、アンカー間隔、保持期間、検索 SLO、主体単位抽出の所要時間、時刻同期の精度。値は PoC と BIA で決め、仮置きしない [D] | RS-10#23〜#36 | B＋C |

### 5.2 PoC で実測すべきこと（TC-ID 未採番）

1. **1 件あたりの bytes と圧縮率** — 自社の正準スキーマと OCSF 写像それぞれで、decision イベントの bytes を p50・p99 で測る。圧縮後の bytes、1 日あたり件数（テナント規模別）も測る。これがコスト式の入力になる（R-125）。
2. **sampling からの独立性** — Sampler を DROP（または 1%）にした状態で、全件記録対象の記録率が 100% であることを確かめる（R-128）。
3. **欠損検知時間** — producer・collector・sink の各段で、イベントの欠落・重複・順序逆転を故意に注入する。連番の突合で検知するまでの時間と、検知漏れの率を測る（R-127）。
4. **sink 停止時の挙動** — WORM sink・SIEM を停止し、次を測る（R-126、R-083、R-176）。
   - ローカル spool が尽きるまでの時間
   - fail-mode（拒否・縮退）が発動するまでの時間
   - 復旧後の再送で欠落がないこと
5. **WORM 転送遅延とアンカー** — イベント発生から Object Lock 済みになるまでの遅延を測る。tree head を外部にアンカーする間隔と、検証のコスト（inclusion proof・consistency proof の生成・検証時間）を測る。
6. **改ざん検知の試験** — 運用者権限を持つ攻撃者を想定し、次の操作がそれぞれ検知されることを確かめる（R-176）。
   - 1 件の改変、1 件の削除、末尾の切り捨て
   - 相手ごとに異なる tree head を示すこと
7. **crypto-shredding の完了時間** — 主体またはテナントの鍵を消してから、全コピー（レプリカ、キャッシュ、バックアップ、KMS の待機期間）で復号できなくなるまでの時間を測る。鍵数と KMS 費用の上限も測る（R-124）。
8. **主体単位の抽出** — 特定の利用者について照会履歴（日時・目的）を全保持期間から抽出する所要時間を測る。DSAR（GDPR Art.15）と個人情報保護法の開示請求の期限に間に合うかを見る。
9. **時刻同期の精度** — cell 間・リージョン間で、監査時刻の差の上限を測る。

---

## 6. 調査の限界と未確認事項

1. **PCI DSS v4.0.1 本体の文言** — PCI SSC の document library は利用許諾への同意を求めるため、v4.0.1 本体を取得しなかった。要件文言は、公開されている v4.0 の SAQ D（Service Provider 用）から引いた。v4.0.1 での文言差は未確認である。v4.0.1 の公表日（2024-06-11）と、要件の追加・削除がない限定改訂であることは、検証時に PCI SSC 自身の告知 [^54] で確認した。
2. **Cohasset Associates の評価報告書** — AWS・Azure・Google の WORM 機能について、SEC 17a-4 等への適合評価の報告書本文は読んでいない。各社の適合の記述は、事業者の表明としてだけ扱った。
3. **SEC 17a-4 の適用範囲** — 本書は (f)(2) と (f)(3) だけを確認した。(b) 等の記録種別ごとの保持期間と、本基盤のログが対象記録に当たるかは調べていない。
4. **EDPB ガイドラインの final 版** — Guidelines 01/2025（仮名化）[^35] と 02/2025（blockchain）[^34] の final 版の有無は確認できなかった。01/2025 は本文を読んでおらず、状態だけを記した。EDPB は匿名化のガイドラインを作成中としているが、公表は未確認である。
5. **crypto-shredding の法的評価** — 主体の鍵を消したことで GDPR Art.17 の「消去」を満たすと明言した監督機関・裁判所の一次資料は見つからなかった。結論 7 はこの未確認を前提にしている。
6. **Digital Omnibus 提案の立法状態** — COM(2025) 836 の 2026-10-03 時点の立法状態は、一次資料（EUR-Lex の手続ファイル、理事会・議会の公式発表）で確認していない。二次情報には Council 側で定義変更が削除されたとの報道があるが、根拠には使っていない。
7. **C-703/25 P の帰結と DPF の見直し** — 2026-10-03 時点で判決・法務官意見が出ているかは未確認である（二次情報は係属中とするが、根拠には使っていない）。EDPB の 2026-07-31 付書簡 [^55] に対する欧州委員会の対応も未確認である。
8. **英国の扱い** — UK GDPR と Data (Use and Access) Act 2025 による移転・保持規律の変更、ICO のガイダンスは調べていない。EU から英国への十分性認定の更新（2025-12-19）は、欧州委員会のページの記載だけで確認した。
9. **米国の扱い** — CCPA 以外の州法、FTC 法 5 条の執行例、HIPAA Security Rule の改正提案の状態、FedRAMP・連邦調達のデータ所在地要件は調べていない。OMB M-21-31 が現在も有効か（後続の覚書による改廃の有無）も未確認である。
10. **日本の改正法とガイドライン** — 令和 8 年法律第 56 号の政令・委員会規則・ガイドラインの改正内容と全面施行日は未確認である。e-Gov の施行日欄は「2 年を超えない範囲内において政令で定める日」の仮置き日付（2028-07-16）である。2026-07-17 施行の附則第 13 条・第 16 条・第 17 条と、6 月経過日施行の附則第 1 条第 3 号の規定は、検証時に e-Gov の改正履歴（附則第 1 条）で確認した。成立日（種資料は 2026-07-10 と記載）も一次資料で確認していない。
11. **業界別ガイドライン（日本）** — FISC 安全対策基準（有償）、金融庁ガイドライン、医療情報システム安全管理ガイドライン、JIS Q 27017/27018 のログ規定は調べていない。ISO/IEC 27001・27002・27040 の本文（有償）も読んでいない。SP 800-88r2 が ISO/IEC 27040 を引く部分だけを、SP 800-88r2 経由で記した。
12. **ASD/CISA ほかの共同文書** — 「Best practices for event logging and threat detection」（2024-08-21）は、公開ページで作成機関と日付だけを確認した。PDF 本文は取得できず、内容は使っていない。
13. **OCSF の網羅性** — OCSF 1.9.0 は、IAM カテゴリの全クラスと Application カテゴリの API Activity を確認した。他のカテゴリ・拡張（platform extension）に認可 decision 用のクラスがないことまでは網羅確認していない。OpenTelemetry の semantic conventions に、セキュリティ・監査用の規約があるかも調べていない。
14. **CADF の付随文書** — DSP2038（OpenStack profile 1.1.0）の本文は読んでいない。公表日（2015-04-16、Informational）は DMTF の標準ページの表示で確認した。
15. **単価** — 保管・取込・検索の単価は変動が大きく、収集していない。コストは式と制約だけを示し、金額は PoC と見積り時点の公式料金表で算出する。
16. **ID の食い違い** — traceability/deliverables.md は、本テーマを RS-11（DL-95）に割り当てている。本書は作業指示に従い RS-10 とした。どちらかへの統一が必要である（本書では deliverables.md を編集していない）。
17. **検証の状態** — 版 0.1 の全脚注について、作成者以外の AI エージェントが 2026-10-03 に原典との突合を行った（research/verification/RS-10-verification.md）。人間のレビュアによる突合は未実施である。

---

## 参考文献

[^1]: Open Cybersecurity Schema Framework『ocsf-schema Release 1.9.0（release notes、および GitHub releases 一覧）』2026-08-03. https://github.com/ocsf/ocsf-schema/releases/tag/1.9.0 （参照箇所: Added — Profiles（record_integrity、ai_operation の delegation）、Objects（delegation、ai_agent、attestation、prev_event）、Improved — Objects（actor の application 追加と app_name/app_uid の廃止予定）、および releases 一覧の 1.5.0〜1.9.0 の公表日、確認日: 2026-10-03）
[^2]: Open Cybersecurity Schema Framework『ocsf-schema（tag 1.9.0 のスキーマ定義）』2026-08-03. https://github.com/ocsf/ocsf-schema/tree/1.9.0 （参照箇所: objects/authorization.json、objects/policy.json、objects/actor.json、objects/metadata.json、objects/attestation.json、objects/prev_event.json、objects/trace.json、events/application/api_activity.json、events/iam/authorize_session.json、profiles/trace.json、profiles/record_integrity.json、dictionary.json（authorizations、decision、sequence）、確認日: 2026-10-03）
[^3]: Open Cybersecurity Schema Framework『OCSF（プロジェクトサイト）』. https://ocsf.io/ （参照箇所: Linux Foundation への移管（2024-11-19）、Apache License 2.0、プロジェクトの説明、確認日: 2026-10-03）
[^4]: DMTF『DSP0262 Cloud Auditing Data Federation (CADF) - Data Format and Interface Definitions Specification』Version 1.0.0, 2014-06-19. https://www.dmtf.org/sites/default/files/standards/documents/DSP0262_1.0.0.pdf （参照箇所: §1.2.1、§4.2 Table 3、§4.2.2、§4.5.1、§4.7.1 Table 13、§4.7.6、Annex A.3.4、A.4.5、確認日: 2026-10-03）
[^5]: DMTF『CADF - Cloud Auditing Data Federation（標準ページ）』. https://www.dmtf.org/standards/cadf （参照箇所: 仕様一覧（DSP0262 1.0.0 Standard 2014-06-19、DSP2038 1.1.0 Informational 2015-04-16、DSP2038 1.0.0 2014-09-16、DSP2028 1.0.0a 2012-06-27）、確認日: 2026-10-03）
[^6]: NIST『Electronic (OSCAL) Version of NIST SP 800-53 Rev 5.2.0 Controls』Release 5.2.0（catalog last-modified 2026-05-11）. https://github.com/usnistgov/oscal-content/blob/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json （参照箇所: AU-3、AU-3(3)、AU-5、AU-5(2)、AU-5(4)、AU-8、AU-9、AU-9(2)、AU-9(3)、AU-10、AU-11、AU-12、確認日: 2026-10-03）
[^7]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6 Privacy Considerations、§6.1、§6.2、§7.1、§7.2、§8、確認日: 2026-10-03）
[^8]: W3C『Trace Context Level 2』W3C Candidate Recommendation Draft, 2024-03-28. https://www.w3.org/TR/trace-context-2/ （参照箇所: Status of This Document、random trace ID flag、確認日: 2026-10-03）
[^9]: W3C『Propagation format for distributed context: Baggage』W3C Candidate Recommendation Snapshot, 2024-05-30. https://www.w3.org/TR/baggage/ （参照箇所: Limits（64 list-members・8192 bytes 以下の MUST 伝播と超過時の MAY drop）、Security Considerations、Privacy Considerations、確認日: 2026-10-03）
[^10]: OpenTelemetry『OpenTelemetry Specification — Tracing SDK』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/trace/sdk.md （参照箇所: Status 行、Sampler — ShouldSample — SamplingResult の Decision（DROP、RECORD_ONLY、RECORD_AND_SAMPLE）、確認日: 2026-10-03）
[^11]: OpenTelemetry『OpenTelemetry Specification — Baggage API』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/baggage/api.md （参照箇所: Status: Stable、Clear Baggage in the Context（"To avoid sending any name/value pairs to an untrusted process..."）、確認日: 2026-10-03）
[^12]: OpenTelemetry『Baggage（Concepts — Signals）』OpenTelemetry Documentation. https://opentelemetry.io/docs/concepts/signals/baggage/ （参照箇所: Baggage security considerations、What are Baggage attributes の説明、確認日: 2026-10-03）
[^13]: PCI Security Standards Council『Payment Card Industry Data Security Standard Self-Assessment Questionnaire D for Service Providers and Attestation of Compliance — For use with PCI DSS Version 4.0』2022-04. https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf （参照箇所: Requirement 10.2.1、10.2.1.1〜10.2.1.7、10.2.2、10.3.1〜10.3.4、10.5.1、10.6.1、10.7.2、10.7.3 と各 Applicability Notes、確認日: 2026-10-03）
[^14]: PCI Security Standards Council『PCI Security Standards Council Bulletin: SAQs for PCI DSS v4.0.1 Now Available』2024-10-15. https://www.pcisecuritystandards.org/wp-content/uploads/2024/10/SAQs_for_PCI_DSS_v4.0.1_Bulletin.pdf （参照箇所: v4.0.1 用 SAQ の公開と、PCI DSS v4.0 の 2024-12-31 退役の記載、確認日: 2026-10-03）
[^15]: PCI Security Standards Council『PCI Perspectives Blog — topic: PCI DSS』. https://blog.pcisecuritystandards.org/topic/pci-dss （参照箇所: 2026-06-03 "Request for Comments: PCI Data Security Standard (PCI DSS) v4.0.1"（意見期限 2026-07-20）、確認日: 2026-10-03）
[^16]: European Commission『Commission Delegated Regulation (EU) 2024/1774 of 13 March 2024 supplementing Regulation (EU) 2022/2554 ... (ICT risk management framework RTS)』OJ L 2024/1774, 2024-06-25. https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj （参照箇所: Article 12（Logging）第 1 項・第 2 項 (a)〜(f) と保持期間の決定、Article 23 第 2 項、確認日: 2026-10-03）
[^17]: European Commission『Commission Implementing Regulation (EU) 2024/2690 of 17 October 2024 laying down rules for the application of Directive (EU) 2022/2555 ...』OJ L 2024/2690, 2024-10-18. https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj （参照箇所: Article 1、Annex 3.2.1〜3.2.7（Monitoring and logging）、確認日: 2026-10-03）
[^18]: Office of Management and Budget『M-21-31 Improving the Federal Government's Investigative and Remediation Capabilities Related to Cybersecurity Incidents』2021-08-27. https://www.whitehouse.gov/wp-content/uploads/2021/08/M-21-31-Improving-the-Federal-Governments-Investigative-and-Remediation-Capabilities-Related-to-Cybersecurity-Incidents.pdf （参照箇所: p.6 "Protecting and Validating Log Information"、Appendix B 定義（Active storage、Cold data storage）、Appendix C Table 5（Identity & Credential Management 等の Retention Period）、確認日: 2026-10-03）
[^19]: NIST『SP 800-92 Rev. 1 (Initial Public Draft) Cybersecurity Log Management Planning Guide』2023-10-11. https://csrc.nist.gov/pubs/sp/800/92/r1/ipd （PDF: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-92r1.ipd.pdf ）（参照箇所: 出版ページの状態・意見期限、本文 TS-3.5〜TS-3.8、確認日: 2026-10-03）
[^20]: NIST CSRC『Log Management（Project）』. https://csrc.nist.gov/projects/log-management （参照箇所: "NIST is in the process of addressing public comments on Draft Special Publication (SP) 800-92 Revision 1"、出版物一覧、確認日: 2026-10-03）
[^21]: NIST『SP 800-92 Guide to Computer Security Log Management』Final, 2006-09-13. https://csrc.nist.gov/pubs/sp/800/92/final （参照箇所: 出版ページの状態と日付、確認日: 2026-10-03）
[^22]: B. Laurie, E. Messeri, R. Stradling『RFC 9162: Certificate Transparency Version 2.0』IETF, Experimental, 2021-12. https://www.rfc-editor.org/rfc/rfc9162 （参照箇所: Abstract、§1、§2.1.3、§2.1.4、Obsoletes: 6962、確認日: 2026-10-03）
[^23]: IETF SCITT WG『RFC 9943: An Architecture for Trustworthy and Transparent Digital Supply Chains』Proposed Standard, 2026-06. https://www.rfc-editor.org/rfc/rfc9943 （参照箇所: §5.1.3 Verifiable Data Structure（Append-only、Non-equivocation、Replayability）、§8 Privacy Considerations、確認日: 2026-10-03）
[^24]: IETF COSE WG『RFC 9942: CBOR Object Signing and Encryption (COSE) Receipts』Proposed Standard, 2026-06. https://www.rfc-editor.org/rfc/rfc9942 （参照箇所: Abstract、§5 RFC9162_SHA256（§5.2 Inclusion Proof、§5.3 Consistency Proof）、確認日: 2026-10-03）
[^25]: Amazon Web Services『Validating CloudTrail log file integrity（AWS CloudTrail User Guide）』. https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html （参照箇所: Why use it?、How it works、確認日: 2026-10-03）
[^26]: Amazon Web Services『Locking objects with Object Lock（Amazon S3 User Guide）』. https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html （参照箇所: 冒頭 Note（Cohasset 評価）、Retention modes、Legal holds、How deletes work with S3 Object Lock、確認日: 2026-10-03）
[^27]: Microsoft『Immutable storage for blob data overview（Azure Storage）』ms.date 2026-08-18. https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview （参照箇所: Regulatory compliance、Time-based retention policies（Retention interval、Locked versus unlocked policies、Retention policy audit logging）、Pricing、確認日: 2026-10-03）
[^28]: Google Cloud『Bucket Lock（Cloud Storage documentation）』Last updated 2026-09-30. https://docs.cloud.google.com/storage/docs/bucket-lock （参照箇所: Overview、Retention policy locks、最大保持期間、確認日: 2026-10-03）
[^29]: U.S. Securities and Exchange Commission『17 CFR 240.17a-4 Records to be preserved by certain exchange members, brokers and dealers』eCFR（同条の最終改正 2024-08-02。eCFR の表示は up to date as of 2026-10-01）. https://www.ecfr.gov/current/title-17/chapter-II/part-240/section-240.17a-4 （参照箇所: (f)(2)(i)(A)(B)、(f)(2)(ii)〜(v)、(f)(3)(iii)、確認日: 2026-10-03）
[^30]: European Parliament and Council『Regulation (EU) 2016/679 (General Data Protection Regulation)』OJ L 119, 2016-05-04. https://eur-lex.europa.eu/eli/reg/2016/679/oj （参照箇所: Recital 26、Recital 49、Art.4(5)、Art.5(1)(e)、Art.17、Art.25(1)、Art.32(1)、Art.33(1)(5)、Art.44、Art.46、Art.49、Art.99(2)、確認日: 2026-10-03）
[^31]: Court of Justice of the European Union『Judgment of the Court (First Chamber) of 22 June 2023, J.M. v Apulaisrahoitustarkastaja (Pankki S), Case C-579/21』. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62021CJ0579 （参照箇所: 主文 2・3、確認日: 2026-10-03）
[^32]: Court of Justice of the European Union『Judgment of the Court (First Chamber) of 4 September 2025, EDPS v SRB (Concept of personal data), Case C-413/23 P, ECLI:EU:C:2025:645』. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62023CJ0413 （参照箇所: paras 76〜77、85〜86、確認日: 2026-10-03）
[^33]: European Data Protection Board『2025 Coordinated Enforcement Action: Implementation of the right to erasure by controllers』Adopted 2026-02-10（公表のプレスリリースは 2026-02-18）. https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_cef-report_2025_right-to-erasure_en.pdf （参照箇所: 表紙 "Adopted on 10 February 2026"、§4.2.6 Issue 6（back-ups）pp.20〜21、§4.2.7 Issue 7（anonymisation）pp.21〜22、確認日: 2026-10-03）
[^34]: European Data Protection Board『Guidelines 02/2025 on processing of personal data through blockchain technologies』Version 1.1, Adopted 2025-04-08（version for public consultation）. https://www.edpb.europa.eu/system/files/2025-04/edpb_guidelines_202502_blockchain_en.pdf （参照箇所: §4.2（Encryption、Hashing、Cryptographic commitments）pp.12〜13、§4.3（storage limitation）p.14、確認日: 2026-10-03）
[^35]: European Data Protection Board『Guidelines 01/2025 on Pseudonymisation（public consultation page）』2025-01. https://www.edpb.europa.eu/public-consultations/guidelines-012025-on-pseudonymisation_en （旧 URL https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-012025-pseudonymisation_en から転送）（参照箇所: 意見募集期間（2025-01-17〜2025-03-14、"Closed for feedback"）と文書の掲載状態のみ。本文は未読、確認日: 2026-10-03）
[^36]: EDPB and EDPS『EDPB-EDPS Joint Opinion 2/2026 on the Proposal for a Regulation as regards the simplification of the digital legislative framework (Digital Omnibus)』Adopted 2026-02-10. https://www.edpb.europa.eu/system/files/documents/2026-02/edpb_edps_jointopinion_202602_digitalomnibus_en.pdf （参照箇所: §3.1 Changes to the definition of personal data（paras 11〜21）、Art.33 の通知期限 96 時間への変更に関する節、確認日: 2026-10-03）
[^37]: NIST『SP 800-88 Rev. 2 Guidelines for Media Sanitization』Final, 2025-09. https://csrc.nist.gov/pubs/sp/800/88/r2/final （PDF: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-88r2.pdf ）（参照箇所: §3（logical purge と cloud storage）、§3.2、§3.2.1〜§3.2.5 pp.11〜16、確認日: 2026-10-03）
[^38]: Amazon Web Services『Delete an AWS KMS key（AWS KMS Developer Guide）』. https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html （参照箇所: 冒頭（例外: multi-Region replica keys、imported key material の非対称鍵・HMAC 鍵）、About the waiting period、Deleting KMS keys from an AWS CloudHSM key store、確認日: 2026-10-03）
[^39]: State of California『Civil Code §1798.105（California Consumer Privacy Act）』Amended by Proposition 24（effective 2020-12-16, operative 2023-01-01）. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.105 （参照箇所: subdivision (d)(2) と法的義務の遵守の号、確認日: 2026-10-03）
[^40]: U.S. Department of Health and Human Services『45 CFR Part 164 Subpart C — Security Standards for the Protection of Electronic Protected Health Information』eCFR（§164.312・§164.316 の版は 2016-12-30。eCFR の表示は up to date as of 2026-10-01）. https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164 （参照箇所: §164.312(b)、§164.316(b)(2)(i)、確認日: 2026-10-03）
[^41]: European Data Protection Board『Guidelines 05/2021 on the Interplay between the application of Article 3 and the provisions on international transfers as per Chapter V of the GDPR』Version 2.0, Adopted 2023-02-14. https://www.edpb.europa.eu/system/files/documents/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf （参照箇所: Executive summary、§2（three cumulative criteria）、§2.2、Example 11、§3（third country legislation のリスク）、確認日: 2026-10-03）
[^42]: European Commission『Adequacy decisions — How the EU determines if a non-EU country has an adequate level of data protection』. https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en （参照箇所: Japan、United Kingdom（2025-12-19 renewal）、United States（EU-US Data Privacy Framework, 2023-07-10）の各項、確認日: 2026-10-03）
[^43]: Court of Justice of the European Union『Appeal brought on 31 October 2025 by Philippe Latombe against the judgment of the General Court ... in Case T-553/23 (Case C-703/25 P)』OJ C/2025/6610, 2025-12-22. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62025CN0703 （参照箇所: Parties、Form of order sought、確認日: 2026-10-03）
[^44]: 日本国『個人情報の保護に関する法律（平成十五年法律第五十七号）』e-Gov 法令検索（改正履歴 ID 415AC0000000057_20261001_507AC0000000070、2026-10-01 施行版）. https://laws.e-gov.go.jp/law/415AC0000000057 （参照箇所: 第 22 条、第 23 条、第 26 条、第 28 条、第 35 条、確認日: 2026-10-03）
[^45]: 日本国『個人情報の保護に関する法律（令和八年法律第五十六号による改正を反映した未施行版、および改正履歴一覧）』e-Gov 法令 API（改正履歴 ID 415AC0000000057_20280716_508AC0000000056、415AC0000000057_20270117_508AC0000000056）. https://laws.e-gov.go.jp/api/2/law_revisions/415AC0000000057 （参照箇所: 改正法令名・公布日 2026-07-17・施行日欄（施行日 2026-07-17・2027-01-17・2028-07-16 の 3 件の改正履歴）、未施行版に収録された同法附則第 1 条（施行期日）、未施行版の第 26 条第 2 項・第 28 条・第 148 条の 3、確認日: 2026-10-03）
[^46]: 個人情報保護委員会『個人情報の保護に関する法律についてのガイドライン（通則編）』平成 28 年 11 月（令和 8 年 6 月一部改正）. https://www.ppc.go.jp/files/pdf/260614_guidelines01.pdf （参照箇所: 3-5-3-3 速報 p.64、3-5-3-4 確報 p.66、3-8-5-1 利用停止等の要件の事例 pp.139〜140、10（別添）組織的安全管理措置 (2)・(3) pp.171〜173、10（別添）外的環境の把握 p.182、確認日: 2026-10-03）
[^47]: 個人情報保護委員会『個人情報の保護に関する法律についてのガイドライン（外国にある第三者への提供編）』平成 28 年 11 月（令和 7 年 12 月一部改正）. https://www.ppc.go.jp/files/pdf/251212_guidelines02.pdf （参照箇所: 3（我が国と同等の水準にあると認められる外国: EU 及び英国）、法第 28 条第 3 項の措置の節、確認日: 2026-10-03）
[^48]: 個人情報保護委員会『「個人情報の保護に関する法律についてのガイドライン」に関するＱ＆Ａ』Web 版. https://www.ppc.go.jp/personalinfo/faq/APPI_QA/ （参照箇所: A6-22（令和 5 年 12 月更新）、A7-53、A10-25、A12-3（令和 3 年 9 月更新）、A12-4（令和 3 年 9 月更新）、確認日: 2026-10-03）
[^49]: Okta『System Log filters and search（Okta Help Center）』. https://help.okta.com/en-us/content/topics/reports/syslog-filters.htm （参照箇所: Note "Events are retained by Okta for 90 days."、確認日: 2026-10-03）
[^50]: Microsoft『Microsoft Entra data retention』ms.date 2026-01-06. https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention （参照箇所: How long does Microsoft Entra ID store the data? — Activity reports 表と注記、確認日: 2026-10-03）
[^51]: Amazon Web Services『Working with CloudTrail event history（AWS CloudTrail User Guide）』. https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html （参照箇所: 冒頭、Limitations of Event history、確認日: 2026-10-03）
[^52]: Amazon Web Services『Understanding and managing Amazon S3 storage classes（Amazon S3 User Guide）』. https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html （参照箇所: Comparing the Amazon S3 storage classes の表と脚注 *・**、確認日: 2026-10-03）
[^53]: NIST『SP 800-53 Rev. 5 Security and Privacy Controls for Information Systems and Organizations（出版ページ）』September 2020（includes updates as of Dec. 10, 2020）, Release 5.2.0. https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final （参照箇所: Release 5.2.0（2025-08-27）の告知と変更概要、確認日: 2026-10-03）
[^54]: PCI Security Standards Council『Just Published: PCI DSS v4.0.1（PCI Perspectives Blog）』2024-06-11. https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1 （参照箇所: 冒頭段落（limited revision、"There are no additional or deleted requirements in this revision."）、FAQ（v4.0 の 2024-12-31 退役）、確認日: 2026-10-03。版 0.2 で検証者が追加）
[^55]: European Data Protection Board『EDPB Letter to the European Commission on US Supreme Court judgment Trump v. Slaughter』2026-07-31. https://www.edpb.europa.eu/system/files/2026-08/edpb_letter_20260731_us_supremecourt_judgment_trump_v_slaughter_en.pdf （参照箇所: 本文全体（2026-06-29 判決の要旨、Art.45(2)(b) の独立監督機関要件、Implementing Decision (EU) 2023/1795 §58〜60 への言及、欧州委員会への精査要請）、確認日: 2026-10-03。版 0.2 で検証者が追加）
