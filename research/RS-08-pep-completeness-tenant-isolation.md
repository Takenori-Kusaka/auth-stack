# RS-08 PEP完全性とテナント分離（一次資料調査ノート）

> 文書ID: RS-08 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-058, R-059, R-060, R-061, R-062, R-011, R-071, R-164, R-165, R-168, R-172, R-207（主なもの。関連: R-065, R-070, R-134, R-143, R-150）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md, traceability/seed/seed-03-redteam-decision.md（seed は問いの手掛かりとしてのみ使用。本文の根拠には使っていない）

本ノートは AI エージェント（Claude）が 2026-10-03 に原典を取得・読解して作成した調査記録である。2026-10-03 に、作成者とは別の AI エージェントのセッションが全脚注の原典照合（CONVENTIONS §4）を行い、指摘箇所を修正した（版 0.2）。照合の記録は research/verification/RS-08-verification.md にある。照合者も AI エージェントであり、人間の第三者による照合は済んでいない。本ノートの記述は決裁ではない。

---

## 1. 調査の問い

seed 由来の問い:

1. 【seed-02 §6-1 / R-058, R-164】全 entry point を機械的に棚卸しする方法は何か。対象は HTTP、gRPC、GraphQL resolver、webhook、queue consumer、batch、管理コンソール、export、support tool、ETL、DB 直接接続である。規範はどこまで棚卸しを要求しているか。
2. 【seed-02 §6-2 / R-059, R-062】全入口が PEP を経由すること（enforcement coverage）を、CI と実行時で自動検証する方法は何か。既製の SAST（Semgrep / CodeQL）はどこまで使えるか。
3. 【seed-02 §6-3 / R-061】DB・ストレージ側でテナント境界を二重に守る手段は何か（PostgreSQL RLS、IAM 条件、object storage prefix）。それぞれの保証範囲と失敗モード（BYPASSRLS、FORCE、接続プール）は何か。
4. 【seed-02 §6-4、seed-03 §7 項7】非同期経路（queue、batch、長時間ジョブ）では、いつ・誰の権限で再認可すべきか。
5. 【seed-02 §6-5 / R-071, R-172】cross-tenant の負例試験・property test を CI で必須化するための規範根拠は何か。試験設計の要点は何か。
6. 【seed-03 §7 項6・項9】PEP の外に出るデータのテナント分離をどう担保するか。対象は検索インデックス、DWH、ML/RAG、バックアップ・レプリカ、ログ、export である。一覧・検索の件数やページングからの漏えいをどう防ぐか。

本ストリームで追加した問い:

7. ASVS 5.0 と NIST SP 800-53 Rev5 は、PEP 完全性をどの要件 ID・強度で表しているか。どの部分を組織判断（tailoring）に委ねているか（R-070, R-165 への入力）。
8. service mesh や gateway など強制層の既定動作（default allow / default deny）は、coverage の主張をどう左右するか。
9. RLS 自体の不具合履歴（CVE）は、DB 側 guardrail の設計にどんな制約を課すか。
10. 署名付き URL などベアラ型の持出し経路は、剥奪（R-143）とどう衝突するか。
11. R-011「テナント間漏えい許容ゼロ」を測定可能にするために、本ストリームはどんな指標を供給できるか。

---

## 2. 結論サマリ

1. 規範は PEP 完全性を二つの形で要求している。
   - 機能・データ・フィールド単位の明示許可を要求する。ASVS v5.0.0-8.2.1 と 8.2.2 は L1、8.2.3 は L2 である[N][^2]。
   - マルチテナントでの cross-tenant 統制を要求する（8.4.1、L2）[N][^2]。

   NIST SP 800-53 Rev5 の AC-25（参照モニタ）は、PEP 完全性を最も直接に表す統制である。AC-25 は「常に呼び出され、改ざんされず、完全性を保証できるほど小さい」機構を求める。ただし AC-25 は SP 800-53B の LOW・MODERATE・HIGH のどのベースラインにも含まれていない[N][^14][^15]。そのため AC-25 相当を採るかどうかは当社の tailoring 判断になる。採る場合は「完全性を保証する証拠」の作り方まで自前で定義する必要がある[D]（RS-08#1〜#20）。
2. entry point の棚卸しは、宣言と実行時観測の差分を取ることで機械化できる[D]（RS-08#21〜#27）。宣言とは OpenAPI の operation 単位 `security`、IDL、consumer 登録などである。実行時観測とは OpenTelemetry の SERVER / CONSUMER span である。ただし OpenAPI では、operation 単位で空 requirement `{}` を含めるとセキュリティが任意になり、空配列にすると top-level の宣言が外れる[N][^48]。宣言があることだけでは保護の証拠にならない[D]。
3. 既製 SAST が検出できる認可欠落の範囲は狭い。
   - CodeQL の標準クエリで Web endpoint の認可欠落と IDOR を直接扱うのは C# の 2 件だけである[V][^44][^45][^46]。どちらも precision は medium で、security-extended スイートに属する。
   - Semgrep の公式例と登録ルールも、デコレータ・属性の欠落や unscoped find の検出に留まる[V][^41][^42][^43]。

   自社の PEP SDK の呼出し規約に合わせたカスタムルールを作り、CI の必須ゲートにする必要がある[D]（RS-08#28〜#32）。
4. 実行時の coverage は、SERVER / CONSUMER span ごとに認可判断イベント（decision_id）があるかを突合して検査できる[D]。ASVS v5.0.0-16.3.2 は L3 で全認可判断のログ記録を求めている[N][^6]。このログを coverage の実行時証跡として兼用できる[D]（RS-08#34〜#35）。
5. PostgreSQL RLS は DB 側 guardrail として使える。ただし次の迂回経路がある。
   - superuser と BYPASSRLS ロールは常に RLS を迂回する[V][^18]。
   - table owner は FORCE しない限り RLS を迂回する[V][^18]。
   - 参照整合性チェックは常に RLS を迂回する[V][^18]。
   - view は既定で view owner のポリシーで評価される[V][^21]。

   AWS の PostgreSQL マルチテナント指針の例は ENABLE だけで、FORCE を含まない[V][^34]。必要条件は次の 3 つである[D]（RS-08#40〜#45）。
   - アプリ実行ロールを非 owner かつ NOBYPASSRLS にする。
   - テナント表に FORCE を付ける。
   - view に security_invoker を付ける。いずれも CI で検査する。
6. 接続プール越しのテナント文脈は、トランザクション終了で消える `SET LOCAL` か `set_config(..., true)` に限るべきである[D]。理由は次の 3 つである。
   - session 単位の `SET` は session 終了まで残る[V][^22]。
   - PgBouncer の transaction pooling では SET/RESET が非対応で、reset query も実行されない[V][^29][^30]。
   - あるロールで計画したクエリを別ロールで再利用すると RLS が誤適用される CVE が、少なくとも 3 回修正されている（CVE-2016-2193、CVE-2023-2455、CVE-2024-10976）[V][^27][^28][^71]。

   この履歴は、テナント別 DB ロールの切替え（SET ROLE）方式を避ける判断材料になる[D]（RS-08#46〜#51）。
7. AWS は tenant isolation の基本則として次の 2 点を挙げている[V][^31]。
   - 認証・認可は分離と等価ではない。
   - 分離の強制をサービス開発者に任せない。

   ただし該当の whitepaper（2020-08-01）は、確認日時点で「historical reference only」と表示されている[V][^31]。現行の SaaS Lens（2023-04-04）も「すべてのテナント資源を分離する」を設計原則に置いている[V][^32]（RS-08#52〜#56）。
8. 非同期経路では、enqueue 時の判断だけで実行すると、剥奪後に処理が実行され得る[D]。
   - ASVS v5.0.0-8.3.3（L3）は、中継サービスではなく起点主体の権限で判断することを要求する[N][^2]。
   - 8.3.2（L3）は、即時反映できない場合の代替策は情報漏えいを緩和しないと明記している[N][^2]。

   consumer 側で起点主体による再認可を行う設計を PoC で検証すべきである[D]。認可エンジンの鮮度指定（例: SpiceDB の `at_least_as_fresh`）は、指定した ZedToken の時点以上に新しいデータで計算することを保証する[V][^56]。ただし enqueue 時点の ZedToken を渡すだけでは、enqueue 後に行われた剥奪の反映は保証されない。剥奪後の実行を確実に拒否するには、`fully_consistent` を使うか、剥奪の書込み時点以降の ZedToken を使う必要がある[D]（RS-08#57〜#61）。
9. 共有検索インデックスの文書レベルセキュリティ（DLS）は、許可外文書を返さない[V][^61]。しかし Elastic 自身が次の 2 点を明記している[V][^61]。
   - 集計・語彙・件数から、許可外文書の情報を知り得る。
   - 関連度スコアの統計は許可外文書を含む。

   テナント間の境界はインデックスまたは cell の分離で担う。DLS と ACL フィルタはテナント内の細粒度制御に限定する[D]（RS-08#62〜#64）。
10. 一覧・検索で使う ListObjects 系 API は、上限件数と期限で結果を打ち切る。
    - OpenFGA の ListObjects（非ストリーミング版）は既定で 1000 件・3 秒で打ち切り、同じ呼出しでも異なる集合を返し得る[V][^59][^60]。
    - SpiceDB は、1 万件を超えると性能問題になり得ると明記している[V][^57]。

    一覧の母集合を ListObjects 系だけで決めてはならない。返却直前の post-check を必須にし、件数は許可集合から計算する[D]（RS-08#65〜#68）。
11. BigQuery の公式文書は次の 2 点を明記している[V][^63]。
    - 行レベルアクセスポリシーは、クエリ実行時間による side channel を受け得る。
    - 総行数を秘匿したい場合は分離テーブルを推奨する。

    テナント間は dataset / table で分離し、行・列ポリシーはテナント内の細粒度に限定する。これが原典と整合する[D]（RS-08#69〜#72）。
12. ML/RAG について、二つの原典がテナント間漏えいの経路を挙げている。
    - NIST AI 100-2 E2025 は、学習データの再構成・membership inference・抽出攻撃を分類している。RAG データベースの機微情報も抽出対象に挙げている[N][^69]。
    - OWASP LLM08:2025 は、共有ベクトル DB でのテナント間文脈漏えいを挙げ、permission-aware なストアと分割を求めている[N][^68]。

    複数テナントのデータで学習した共有モデルの出力には、object 単位の認可を後付けできない。そのためテナント横断学習は、R-011 の例外として経営判断の対象とする[D]（RS-08#73〜#75）。
13. バックアップ・レプリカ・ログ・export は、構造的に PEP の外にある[D]。
    - pg_dump は既定で `row_security` を off にする。そのため全行を取得するか、RLS を迂回できない実行ロールではエラーになる。行が黙って欠けることはない[V][^24][^18]。つまり、完全なバックアップを取る主体は RLS を迂回できる特権ロール（superuser、BYPASSRLS ロール、table owner など）になる[D]。
    - 署名付き URL は有効期限まで何度でも使えるベアラトークンで、SDK からは最長 7 日に設定できる[V][^37]。

    これらは「全テナント入りの特権データ経路」として棚卸しし、CP-9(d)、AU-9、ASVS V16 のログ在庫要件に紐付ける[N][^14][^6][D]（RS-08#76〜#82）。
14. Istio の AuthorizationPolicy は、ALLOW ポリシーが 1 つもない workload への要求を許可する[V][^50]。mesh を PEP coverage の根拠に数えるなら、allow-nothing を既定にし、その存在を CI で検査することが前提になる[D]（RS-08#36〜#38）。
15. R-011「テナント間漏えい許容ゼロ」は、文書でも有限回の試験でも証明できない[D]。本ストリームからは、測定可能な代替指標として次の 5 つを提案する（§5.2）[D]。
    - 棚卸し差分件数
    - PEP 未経由 handler 件数
    - RLS 無効・owner 接続件数
    - cross-tenant 負例試験の失敗件数
    - PEP 外データ経路の統制付与率

---

## 3. 調査結果

凡例:
- 強度は原文のとおり写す。
- ASVS 5.0.0 は「Verify that ...」形式の要件で、強度はレベル（L1/L2/L3）で表す（RS-08#1）。
- OWASP API Security Top 10 と OWASP Cheat Sheet は RFC 2119 の大文字キーワードを使っていない。小文字の should 等はそのまま写す。
- NIST SP 800-53 は統制カタログである。統制文は命令形で書かれ、義務の有無はベースライン選定と組織の tailoring で決まる。

### 3.1 規範の枠組み

**RS-08#1** ASVS 5.0.0 の性質[N][^1]
- ASVS 5.0.0 は、自らを「要件（must）のみを含み、推奨（should）を主たる条件として含まない」と定義している。
- レベルの構成は次のとおりである。L1 は約 20%、L2 は約 50%、L3 は残りの約 30%。L2 に適合するには、L1 と L2 を合わせた約 70% を満たす必要がある。
- 他文書から参照する際は `v<version>-<chapter>.<section>.<requirement>` 形式（例 `v5.0.0-8.2.2`）を推奨している。
> "The ASVS only contains requirements (must) and does not contain recommendations (should) as the main condition."

**RS-08#2** 認可の文書化要件[N][^2]
- ASVS v5.0.0-8.1.1（L1）は、機能レベルとデータ固有のアクセス制限規則を、認可文書に定義することを求めている。
- 8.1.2（L2）は、フィールドレベルの読み書き制限規則の定義を求めている。
- これらの文書化要件が「PEP coverage 仕様（DL-15）」の規範上の足場になる。
> "Verify that authorization documentation defines rules for restricting function-level and data-specific access based on consumer permissions and resource attributes."（8.1.1, L1）

**RS-08#3** 機能・データ・フィールド単位の明示許可[N][^2]
- v5.0.0-8.2.1（L1）は、機能レベルのアクセスを明示的な許可を持つ consumer に限定することを求める。
- 8.2.2（L1）はデータ項目単位で同じことを求め、IDOR と BOLA の緩和を目的として明示している。
- 8.2.3（L2）はフィールド単位で同じことを求め、BOPLA の緩和を目的としている。
> "Verify that the application ensures that data-specific access is restricted to consumers with explicit permissions to specific data items to mitigate insecure direct object reference (IDOR) and broken object level authorization (BOLA)."（8.2.2, L1）

**RS-08#4** 強制点の位置[N][^2]
v5.0.0-8.3.1（L1）は、認可規則を信頼できるサービス層で強制し、改ざん可能なクライアント側の制御に依存しないことを求める。
> "Verify that the application enforces authorization rules at a trusted service layer and doesn't rely on controls that an untrusted consumer could manipulate, such as client-side JavaScript."

**RS-08#5** cross-tenant 統制[N][^2]
v5.0.0-8.4.1（L2）は、マルチテナントのアプリケーションに cross-tenant 統制を求める。その目的は、consumer の操作が権限のないテナントに影響しないことを確保することである。
> "Verify that multi-tenant applications use cross-tenant controls to ensure consumer operations will never affect tenants with which they do not have permissions to interact."

**RS-08#6** 棚卸しと coverage の要件はどこにあるか[N][^2][^3][^6]
- ASVS V8（8.1.1〜8.4.2）には、entry point の棚卸しや enforcement coverage の自動検証を直接求める要件がない（当方が V8 全文で確認）。
- 棚卸し型の要件は他章にある。v5.0.0-13.1.1（L2）は通信要件の文書化、v5.0.0-16.1.1（L2）は各層のログ在庫を求める。
- したがって「全入口の棚卸し」を ASVS で受入基準化するには、V8 と V13 / V16 の組合せと、自社の追加要件が必要になる[D]。

**RS-08#7** API Security Top 10 2023 の性質[N][^12]
- OWASP API Security Top 10 2023 は、自らを「awareness document」と位置付けている。
- 2019 年版の Excessive Data Exposure と Mass Assignment を、BOPLA（API3）に統合した。
- 規範語は小文字の should であり、RFC 2119 の強度表現ではない。
> "The OWASP API Security Top 10 2023 is a forward-looking awareness document for a fast pace industry."

**RS-08#8** API1:2023（BOLA）[N][^8]
- オブジェクト ID を受け取って操作する全 endpoint は、オブジェクトレベルの認可チェックを実装すべき（should）としている。
- JWT から取り出したユーザー ID と ID パラメータを比較するだけでは不十分と明記している。
> "Every API endpoint that receives an ID of an object, and performs any action on the object, should implement object-level authorization checks."
> "Comparing the user ID of the current session (e.g. by extracting it from the JWT token) with the vulnerable ID parameter isn't a sufficient solution to solve Broken Object Level Authorization (BOLA)."

**RS-08#9** API1:2023 の予防策としての試験ゲート[N][^8]
予防策は、認可機構の脆弱性を評価する試験を書き、試験を失敗させる変更をデプロイしないことである。これは cross-tenant 負例試験を CI の必須ゲートにする根拠の一つになる（R-071, R-172）[D]。
> "Write tests to evaluate the vulnerability of the authorization mechanism. Do not deploy changes that make the tests fail."

**RS-08#10** API3:2023（BOPLA）と ASVS の対応[N][^9][^5]
- API3:2023 は、汎用シリアライザ（`to_json()` 等）の回避を予防策に挙げる。
- スキーマに基づくレスポンス検証を「extra layer of security」として挙げる。
- ASVS v5.0.0-15.3.1（L1）は、必要なフィールドのサブセットだけを返すことを求める。
- ASVS v5.0.0-15.3.3（L2）は、mass assignment 対策を求める。
> "Implement a schema-based response validation mechanism as an extra layer of security."（API3:2023）

**RS-08#11** API5:2023（BFLA）[N][^10]
- 強制機構は既定で全拒否とし、機能ごとに明示的な付与を求めるべき（should）としている。
- URL パスだけで一般用か管理用かを判断するなとしている。
- 全業務機能から呼ばれる一貫した、分析しやすい認可モジュールを持つよう求めている。
> "The enforcement mechanism(s) should deny all access by default, requiring explicit grants to specific roles for access to every function."
> "Your application should have a consistent and easy-to-analyze authorization module that is invoked from all your business functions."

**RS-08#12** AC-3 と SP 800-53A の評価方法[N][^14][^13][^16]
- NIST SP 800-53 Rev5（Release 5.2.0）の AC-3（Access Enforcement）は「承認された認可を、適用されるアクセス制御方針に従って強制する」統制である。
- discussion は、強制機構をアプリケーション層・サービス層にも配置できると述べる。
- SP 800-53A Rev5 の評価方法は EXAMINE / INTERVIEW / TEST の 3 種である。AC-3 の TEST の対象は「Mechanisms implementing access control policy」である。つまり評価では、文書だけでなく機構そのものの試験が対象になる。
> "Enforce approved authorizations for logical access to information and system resources in accordance with applicable access control policies."（AC-3）

**RS-08#13** AC-25（Reference Monitor）[N][^14]
- AC-25 は、改ざん不能（tamperproof）で、常に呼び出され（always invoked）、完全性を保証できるほど小さい参照モニタの実装を求める。
- discussion は「always invoked」の性質を、迂回を防ぐものと説明している。
- AC-25 の SP 800-53A 上の TEST 対象は「Mechanisms implementing access enforcement functions」である。
> "Implement a reference monitor for [access control policies] that is tamperproof, always invoked, and small enough to be subject to analysis and testing, the completeness of which can be assured."
> "The always invoked property prevents adversaries from bypassing the mechanism and violating the security policy."

**RS-08#14** ベースラインへの収録状況[N][^15][^70]
- SP 800-53B のベースライン（OSCAL profile、Release 5.2.0）での収録状況は次の表のとおりである。
- CSRC の SP 800-53B 出版物ページは、Release 5.2.0（2025-08-27）にベースラインの変更がないと記している[^70]。

  | 統制 | LOW | MODERATE | HIGH |
  |---|---|---|---|
  | AC-25 | なし | なし | なし |
  | AC-3 | あり | あり | あり |
  | AC-4、AC-6(1)、AC-6(9)、AC-6(10)、SC-4、CP-9(8) | なし | あり | あり |
  | AC-3(8)、AC-3(9)、AC-4(21)、SA-11(1) | なし | なし | なし |

- 表の値は、当方が OSCAL profile の include-controls を照合して得た。
- 「参照モニタとしての完全性」を求めるかどうかは、ベースライン適用だけでは決まらない。組織が tailoring で追加する判断になる[D]。

**RS-08#15** AC-4 と AC-3(9)：PEP の外へ出るデータの統制[N][^14]
- AC-4（Information Flow Enforcement）は、システム内およびシステム間の情報の流れに対する認可の強制を求める。
- discussion は、情報フロー制御を「誰がアクセスできるか」とは別の、「情報がどこへ流れられるか」の統制と定義している。
- AC-3(9)（Controlled Release）は、外部へ放出する条件を求める。条件は、受領側システムが統制を備えること、および放出の妥当性を検証することである。
- 検索インデックス・DWH・ML への複製は、AC-3 ではなく AC-4 と AC-3(9) の領域として扱うのが原典と整合する[D]。
> "Information flow control regulates where information can travel within a system and between systems (in contrast to who is allowed to access the information) and without regard to subsequent accesses to that information."

**RS-08#16** AC-3(8)、AC-6(9)、AC-6(10)[N][^14]
- AC-3(8) は、主体・客体の属性変更に伴う認可の取消しの強制を求める。
- AC-6(9) は、特権機能の実行の記録を求める。
- AC-6(10) は、非特権ユーザーによる特権機能の実行の防止を求める。
> "Enforce the revocation of access authorizations resulting from changes to the security attributes of subjects and objects based on [rules]."（AC-3(8)）

**RS-08#17** SC-4（Information in Shared System Resources）[N][^14]
- SC-4 は、共有システム資源を介した、許可されない・意図しない情報移転の防止を求める。
- discussion は、前の利用者の行為で生じた情報が後の利用者に見える状態を対象とする。一方で covert channel は対象外と明記している。
> "Prevent unauthorized and unintended information transfer via shared system resources."

**RS-08#18** SA-11(1)（Static Code Analysis）[N][^14][^15]
- SA-11(1) は、開発者に静的解析ツールの使用と結果の文書化を求める統制拡張である。
- SP 800-53B の LOW / MODERATE / HIGH のいずれにも含まれない（RS-08#14 と同じ方法で確認）。
- 認可 coverage の SAST を義務化するなら、組織の追加統制として定義する必要がある[D]。

**RS-08#19** NIST SP 800-207 の PEP 定義[N][^17]
- PEP は、主体と資源の間の接続を可能にし、監視し、終了させる構成要素と定義されている。
- PDP / PEP は、トラフィック上の自らの位置より先では追加の方針を適用できない。
- そのため「暗黙の信頼ゾーン」はできる限り小さくしなければならない（must）としている。
- PEP を通過した後に複製・集約されるデータ（検索・DWH・バックアップ）は、PEP の判定が及ばない領域にある[D]。
> "The PDP/PEP cannot apply additional policies beyond its location in the flow of traffic. To allow the PDP/PEP to be as specific as possible, the implicit trust zone must be as small as possible."（§2, p.5）

**RS-08#20** CWE による検出ルールの分類[N][^47]
- MITRE CWE 4.20 は、認可欠落を CWE-862（Missing Authorization）と定義している。
- 利用者制御キーによる認可迂回を CWE-639、利用者制御の SQL 主キーによる迂回を CWE-566 と定義している。
- 検出ルール（RS-08#28〜#32）をこの分類に紐付けると、統制台帳（DL-28）でツール間の対応を取れる[D]。

### 3.2 entry point の棚卸し

**RS-08#21** API9:2023（Improper Inventory Management）[N][^11]
- API ホストと連携サービス・データフローの棚卸しを予防策に挙げている。
- オープン標準でドキュメントを自動生成し、CI/CD に組み込むことを挙げている。
- 非本番環境で本番データを使う場合は、本番と同じ扱いにすべき（should）としている。
> "Generate documentation automatically by adopting open standards. Include the documentation build in your CI/CD pipeline."

**RS-08#22** 入口になり得る構成要素と、テナント文脈ヘッダ[N][^3][^7]
- 次の ASVS 要件は、棚卸し対象の入口を規範的に列挙する手掛かりになる。
  - v5.0.0-13.1.1（L2）: 全通信要件の文書化
  - 13.4.5（L2）: 内部 API 文書や監視 endpoint を意図なく公開しないこと
  - 4.3.2（L2）: GraphQL API を他者に使わせる意図がない限り、本番環境の GraphQL introspection を無効化すること
- v5.0.0-4.1.3（L2）は、中間層が設定する HTTP ヘッダ（例 X-User-ID）をエンドユーザーが上書きできないことを求める。テナント文脈ヘッダ（X-Tenant-ID 等）も同じ類型として扱うべきである[D]。
> "Verify that any HTTP header field used by the application and set by an intermediary layer, such as a load balancer, a web proxy, or a backend-for-frontend service, cannot be overridden by the end-user."（4.1.3）

**RS-08#23** OpenAPI の security 宣言の意味論[N][^48]
- OpenAPI Specification 3.2.1（2026-09-10）では、Operation Object の `security` が top-level の宣言を上書きする。
- 空の requirement `{}` を含めると、セキュリティが任意になる。
- 空配列にすると、top-level の宣言が外れる。
- 宣言による棚卸しを coverage の証拠にするなら、空 requirement と空配列を CI の lint で禁止・例外登録制にする必要がある[D]。
> "To make security optional, an empty security requirement ({}) can be included in the array. This definition overrides any declared top-level security. To remove a top-level security declaration, an empty array can be used."

**RS-08#24** GitHub REST API の endpoint 別 permission 宣言[V][^38][^39][^40]
- GitHub は、GitHub App と fine-grained personal access token のそれぞれについて、endpoint ごとの必要 permission の一覧を公開している。
- REST 応答では `X-Accepted-GitHub-Permissions` ヘッダで必要 permission を返す。
- ヘッダ値の書式は、カンマが AND、セミコロンが代替集合（OR）である。
> "The value of the `X-Accepted-GitHub-Permissions` header is a comma separated list of the permissions that are required to use the endpoint. Occasionally, you can choose from multiple permission sets. In these cases, multiple comma-separated lists will be separated by a semicolon."

**RS-08#25** GitHub 一覧の規模と、参照実例としての位置付け[M][V][^39][^40]
- 確認日に、両一覧ページの Markdown 本文の表行数を数えた。endpoint×permission の組は、GitHub App 版が 1,090 行、fine-grained PAT 版が 1,056 行であった[M]。
  - 測定条件: docs.github.com の article body API で本文を取得し、`` | ` `` で始まる行を計数した。生データは保存していない。
- この方式は、endpoint → 必要権限の機械可読な宣言を、公開文書と実行時応答の両方に出す参照実例である[D]。「宣言のない endpoint が 0 件」を検査する設計の参考になる[D]。
- GitHub の内部で、この宣言と実装の一致をどう検証しているかは非公開であり、未確認である。

**RS-08#26** OpenTelemetry の SpanKind[N][^49]
- OpenTelemetry Specification v1.61.0 の Trace API（Stable）は、SpanKind の SERVER と CONSUMER を「外部から開始された入来要求の処理」と定義している。
- PRODUCER と CONSUMER は、遅延実行（非同期）を表す。
- SERVER / CONSUMER span の名前と属性を集計すれば、同期・非同期の入口を実行時に列挙できる[D]。
> "Whether a span represents an outgoing call to a remote service (`CLIENT` and `PRODUCER` spans) or a processing of an incoming request initiated externally (`SERVER` and `CONSUMER` spans)."

**RS-08#27** 静的宣言と実行時観測の差分による棚卸し[D]
- 突き合わせる二つの集合は次のとおりである。
  - 静的宣言: OpenAPI / proto / GraphQL schema、ルーティング表、consumer 購読、cron / batch 定義
  - 実行時観測: SERVER / CONSUMER span
- 差分から得られる 2 種類の入口は次のとおりである。
  - 未宣言で観測された入口（shadow endpoint）
  - 宣言済みで未観測の入口（dead code、または batch や break-glass など稀にしか動かない経路）
- どちらの集合も単独では完全でない。実行時観測は稀な経路を逃し、静的宣言は未登録 handler や DB 直接接続を逃す。
- DB 直接接続（ETL、support tool、手作業 SQL）は、アプリ側の trace には現れない。DB 側の接続元ロール・監査ログによる別系統の棚卸しが要る。
- 根拠: RS-08#21、#23、#26、#40。

### 3.3 enforcement coverage の自動検証

**RS-08#28** CodeQL の C# 向け 2 クエリ[V][^44][^45]
- `cs/web/missing-function-level-access-control`（CWE-285/284/862）と `cs/web/insecure-direct-object-reference`（CWE-639）は、いずれも「Precision: medium」である。
- 収録スイートは csharp-security-extended と csharp-security-and-quality である。
- 前者は、編集・削除・管理画面などの機微操作に認可チェックがないことを検出対象とする。

**RS-08#29** 他言語の標準クエリの状況[V][D][^46]
- CodeQL の CWE coverage 一覧（確認日時点）で CWE-639 / CWE-862 に対応付く標準クエリを読んだ。そのうち Web endpoint の認可チェック欠落そのものを対象とするのは、C# の 2 件だけであった[V]。
- 他言語の対応先は CORS 設定、URL 検証、設定ファイル中の空パスワード等で、BOLA / BFLA の検出ではなかった（当方の読み取り）[D]。
- Java / Go / TypeScript / Python が中心の 300 サービスでは、標準クエリだけで認可 coverage を確保できるとは期待できない[D]。この判断は、CONVENTIONS §7 の暫定前提「約 300 マイクロサービス」に依存する（前提台帳 ID は未採番）。

**RS-08#30** Semgrep 公式文書の例[V][^41]
- Semgrep の公式文書は「Enforce authentication patterns」の例として、Flask の全ルートに認証デコレータを要求するルールを示している。
- CI/CD に組み込めば、デコレータのないルートを遮断できるとしている。
- この例が扱うのは認証（authentication）であり、object-level の認可判定の正しさは検出対象外である[D]。
> "If deployed in CI/CD pipelines, Semgrep can block undecorated routes or flag a security member for further investigation."

**RS-08#31** Semgrep 登録ルールの例[V][^42][^43]
- `missing-or-broken-authorization`（C#）は、Controller クラスに次の属性のいずれもない場合に検出する。severity は INFO、confidence は MEDIUM、CWE-862 である。
  - `[Authorize]`
  - `[Authorize(Roles = ...)]`
  - `[Authorize(Policy = ...)]`
  - `[AllowAnonymous]`
- `check-unscoped-find`（Rails）は taint モードで、`params` 等から `Model.find` への流れを IDOR（CWE-639）として検出する。修正例として `current_user.accounts.find(...)` へのスコープ付けを示している。

**RS-08#32** カスタムルールの方針[D]
- 既製ルールが検出できるのは「注釈の欠落」と「スコープなし検索」という形の問題である。テナントのスコープ付けや関係ベース判定の正しさは検証できない。
- そこで自社 PEP SDK の呼出し規約を先に定める。例は次のとおりである。
  - 全 handler が `authorize(subject, action, resource)` を経由する。
  - repository 層は tenant scope 引数を必須にする。
- その規約からの逸脱を検出するカスタムルール（Semgrep / CodeQL）を CI の必須ゲートにする方式が要る。
- ルールの検出率と誤検知率は、意図的に PEP 呼出しを除去した変異体で PoC 実測する（§5.2 M-02）。
- 根拠: RS-08#11、#28〜#31。

**RS-08#33** OWASP Authorization Cheat Sheet：全要求での検証[N][^53]
- 全要求で権限を検証することを推奨している。
- 検証の技術は、メソッドやクラスごとに個別適用するのではなく、アプリケーション全体で設定できるものであるべきとしている。
- 大多数の要求で正しく検証するだけでは不十分と明記している。
- 強度は推奨である。原文は小文字の should で書かれており、RFC 2119 の強度表現ではない。
> "Validating permissions correctly on just the majority of requests is insufficient."

**RS-08#34** ASVS v5.0.0-16.3.2：認可判断のログ[N][^6]
- 失敗した認可試行の記録を求める（L2）。
- L3 では全認可判断の記録を求め、機微データへのアクセス時の記録も含める。ただし機微データそのものは記録しない。
> "Verify that failed authorization attempts are logged. For L3, this must include logging all authorization decisions, including logging when sensitive data is accessed (without logging the sensitive data itself)."

**RS-08#35** 実行時 coverage 検査[D]
- 方式: SERVER / CONSUMER span（RS-08#26）と、PEP SDK が出す認可判断イベント（decision_id を trace_id に紐付ける）を突合する。
- 指標: 「認可判断なしで処理を完了した入口の件数」を KRI とし、目標値を 0 とする。
- この判断イベントは、ASVS L3 の 16.3.2 の記録（RS-08#34）と兼用できる。
- 意図的な公開 endpoint は、例外台帳に登録して突合から除外する。
- 根拠: RS-08#26、#34。

**RS-08#36** Istio AuthorizationPolicy の評価規則[V][^50][^51]
- 評価の順序は CUSTOM → DENY → ALLOW である。
- workload に ALLOW ポリシーが 1 つもなければ、要求を許可する。
- 「deny by default」が働くのは、ALLOW ポリシーが 1 つ以上ある workload に限られる。
- 公式文書は、allow-nothing ポリシーから始めて ALLOW を段階的に追加することを良い慣行としている。
> "If there are no ALLOW policies for the workload, allow the request."

**RS-08#37** GraphQL の認可の置き場所[V][^52]
- GraphQL Foundation の公式解説は、本番では認可ロジックを resolver ではなく業務ロジック層へ委譲するよう勧めている。
- REST 等の他 API と単一の真実源（single source of truth）を共有することで、API ごとの不整合を避けるとしている。
> "Defining authorization logic inside the resolver is fine when learning GraphQL or prototyping. However, for a production codebase, delegate authorization logic to the business logic layer."

**RS-08#38** mesh / gateway 層の位置付け[D]
- mesh / gateway 層は、サービス間呼出しや機能単位（BFLA 寄り）の粗粒度 PEP として使える。
- object-level（BOLA）の判定は、リソースを知るサービス内で行う必要がある（ASVS 8.2.2、API1）。
- mesh を coverage の根拠に数えるなら、全 workload に allow-nothing があることを CI で検査する。
- GraphQL・REST・gRPC・consumer は、同じ業務層の認可関数に収束させる。これにより、入口ごとに判定が分岐することを防ぐ。
- 根拠: RS-08#3、#8、#36、#37。

### 3.4 cross-tenant 負例試験

**RS-08#39** 試験の規範根拠と設計[N][^54][^53][D]
- OWASP WSTG v4.2 の WSTG-ATHZ-04 は、IDOR 試験の要点を次のように述べる。
  - 利用者入力がオブジェクトを直接参照する箇所を、すべて洗い出す。
  - 異なるオブジェクトを所有する 2 人以上の利用者を用いるのが最善である。
- OWASP Authorization Cheat Sheet は、認可ロジックの単体・結合試験を推奨する。同時に、それが専門の試験や pentest の代替にはならないとしている[N][^53]。
- 設計への含意として、cross-tenant property test では次の組合せを全入口に対して生成し、判定結果が拒否になることを性質として検査する[D]。
  - 2 テナント以上 × 複数ロール
  - 他テナントの実在 ID と存在しない ID
- 根拠: RS-08#9、#27。
> "The best way to test for direct object references would be by having at least two (often more) users to cover different owned objects and functions."（WSTG-ATHZ-04）

### 3.5 DB・ストレージ側の二重防御

**RS-08#40** PostgreSQL RLS の基本動作[V][^18]
- 現行版は 18 で、19 は Beta 4（2026-09-24）である。
- RLS を有効にした表にポリシーがない場合は、既定拒否になる。
- superuser と BYPASSRLS 属性を持つロールは、常に RLS を迂回する。
- table owner は通常 RLS を迂回するが、FORCE ROW LEVEL SECURITY で適用対象にできる。
- TRUNCATE や REFERENCES など表全体に作用する操作は、RLS の対象外である。
> "Superusers and roles with the BYPASSRLS attribute always bypass the row security system when accessing a table. Table owners normally bypass row security as well, though a table owner can choose to be subject to row security with ALTER TABLE ... FORCE ROW LEVEL SECURITY."

**RS-08#41** FORCE と BYPASSRLS の既定値[V][^19][^20]
- ALTER TABLE の FORCE は、既定で無効である。有効にすると owner にもポリシーが適用される。
- CREATE ROLE の既定は NOBYPASSRLS である。BYPASSRLS を付与できるのは、superuser か BYPASSRLS を持つロールに限られる。

**RS-08#42** AWS の PostgreSQL マルチテナント指針[V][^34]
- AWS Prescriptive Guidance（2021-09-30 初版、2024-04-29 更新）は、pool モデルでのテナント分離に RLS が必要と述べる。
- テナント別 DB ユーザーよりも、アプリが設定する実行時変数（例 `app.current_tenant`）との比較を推奨している。
- 掲載例は `ENABLE ROW LEVEL SECURITY` と `current_setting('app.current_tenant')` によるポリシーで、FORCE を含まない。
> "Row-level security (RLS) is required to maintain tenant data isolation in a pooled model with PostgreSQL."

**RS-08#43** AWS 指針の例だけでは足りない点と、CI 検査項目[D]
- 問題: アプリがテナント表の owner ロールで接続すると、RLS は適用されない（RS-08#40）。
- 設計:
  - マイグレーション用の owner ロールと、アプリ実行ロールを分離する。
  - テナント列を持つ全表を ENABLE かつ FORCE にする。
  - アプリ実行ロールは NOBYPASSRLS とする。
- CI で検査する項目:
  - テナント列を持ち、RLS が有効でない表、または FORCE されていない表が 0 件であること
  - BYPASSRLS / superuser でアプリ接続しているものが 0 件であること
- 根拠: RS-08#40〜#42。

**RS-08#44** RLS の評価順序と、表現上の限界[V][^18]
- ポリシー式は、利用者クエリの条件より先に評価される。例外は leakproof 関数である。
- 一意制約・主キー・外部キーなどの参照整合性チェックは、常に RLS を迂回する。そのため covert channel による漏えいに注意が要ると明記している。
- 副問合せを含むポリシーは、競合状態によって情報漏えいを生じ得ると明記している。
> "Referential integrity checks, such as unique or primary key constraints and foreign key references, always bypass row security to ensure that data integrity is maintained. Care must be taken when developing schemas and row level policies to avoid "covert channel" leaks of information through such referential integrity checks."

**RS-08#45** view と RLS[V][^21]
- 基底表に RLS がある場合、view は既定で view owner のポリシーと権限で評価される。
- `security_invoker = true` にすると、呼出し元のポリシーと権限で評価される。
- owner が作った view を経由すると、テナント境界が owner 権限で評価され得る[D]。そのため security_invoker の付与を CI で検査する対象に加える[D]。

**RS-08#46** CVE-2024-10976[V][^27]
- 内容: 副問合せ、WITH 句、security invoker view、SQL 関数から RLS 付きの表を参照した場合の不備である。あるロールで計画したクエリを別ロールで再利用すると、誤ったポリシーが適用され得た。
- 発生する状況: security definer 関数の内部、または同じクエリを複数の SET ROLE で再利用する場合である。
- 修正: 2024-11-14 に 17.1 / 16.5 / 15.9 / 14.14 / 13.17 / 12.21 で修正された。CVSS 3.0 は 4.2 である。
- 先行する同類の CVE として、CVE-2016-2193 と CVE-2023-2455 を挙げている。
> "This scenario can happen under security definer functions or when a common user and query is planned initially and then re-used across multiple SET ROLEs."

**RS-08#47** CVE-2023-2455[V][^28]
- 内容: 関数のインライン化に関わる経路で、同じ類型（ロールをまたぐ計画の再利用による RLS の誤適用）の不具合があった。
- 修正: 2023-05-11 に 15.3 / 14.8 / 13.11 / 12.15 / 11.20 で修正された。

**RS-08#48** SET と SET LOCAL のスコープ[V][^22][^23]
- `SET`（SESSION）の効果は、トランザクションが確定すると session 終了まで続く。
- `SET LOCAL` の効果は、確定・中止を問わず、現在のトランザクションの終わりまでである。
- `set_config(name, value, is_local)` は、`is_local = true` のとき現在のトランザクションだけに適用される。
- `current_setting(name)` は、設定が存在しないとエラーになる。`missing_ok = true` を渡した場合だけ NULL を返す。

**RS-08#49** PgBouncer の pooling モード[V][^29][^30]
- PgBouncer の公式文書（確認日時点の最新リリースは 1.26.0、2026-09-23）は、transaction pooling を「session ベースの機能の一部を壊す」モードと説明している。
- 機能対応表では、SET/RESET が transaction pooling で「Never」である。
- `server_reset_query`（既定 `DISCARD ALL`）は、transaction pooling では使われない。
> "When transaction pooling is used, the server_reset_query is not used, because in that mode, clients must not use any session-based features, since each transaction ends up in a different connection and thus gets a different session state."

**RS-08#50** プール越しのテナント文脈の残留と対策[D]
- 問題: session 単位の `SET app.current_tenant` と transaction pooling を組み合わせると、前のクライアントのテナント文脈が後続のトランザクションに残り得る。これは SC-4 が対象とする「前の利用者の情報が後の利用者に利用可能になる」状態の一形態である（RS-08#17）。
- 対策:
  - テナント文脈は、トランザクション内の `SET LOCAL` か `set_config(..., true)` だけで設定する。
  - ポリシーでは `current_setting` を missing_ok なしで呼び、未設定時はエラーにする（fail-closed）。
  - ただし、この fail-closed が成り立つのは、設定が「存在しない」場合に限られる（原典の記述は「設定が存在しなければエラー」である[V][^23]）。同じ session で一度 `SET LOCAL` したカスタム変数が、トランザクション終了後に「存在しない」状態へ戻るのか、空文字などの値で残るのかは、原典で確認できていない（未確認）。この点は結論に使わず、M-05 で実測する。
  - 高並行・長時間の混線試験を PoC で行う（§5.2 M-05）。
- 根拠: RS-08#17、#48、#49。

**RS-08#51** テナント別 DB ロールの切替え（SET ROLE）を避ける[D]
- 理由: SET ROLE 方式は、RS-08#46〜#47 の CVE 類型（計画の再利用と、ロールをまたぐ誤適用）にそのまま該当する。
- 代替: テナント文脈は、単一の非 owner ロールと `SET LOCAL` の文脈変数で表す。
- 運用: PostgreSQL マイナー版の追随期限を、パッチ SLA（DL-32）に含める。
- 根拠: RS-08#46〜#48。

**RS-08#52** AWS の tenant isolation の基本則と文書の位置付け[V][^31]
- AWS「SaaS Tenant Isolation Strategies」whitepaper（2020-08-01）は、tenant isolation の基本則として次を挙げる。
  - 認証・認可は分離と等価ではない。
  - 分離の強制をサービス開発者に任せない。
  - 既製の解決策がなくても、分離要件を下げてはならない。
- 確認日時点で、この文書には「historical reference only」と表示されている。
> "Authentication and authorization are not equal to isolation"
> "Isolation enforcement should not be left to service developers"

**RS-08#53** 規約依存の分離と、その隠蔽[V][^31]
- 同 whitepaper は、pool モデルで IAM を使う実行時スコープ付けを次のように説明している。
  - 共有マイクロサービスは、全テナントに及ぶ広い権限でデプロイされる。
  - 要求ごとに isolation manager からテナントスコープの資格情報を取得する。
- この方式は「合意された規約」に依存すると明記している。
- 規約の遵守を開発者に委ねないよう、共有ライブラリやラッパーで隠すことを勧めている。
> "This scoping is applied as a matter of an agreed upon convention where the microservice is expected to always acquire new credentials before accessing a tenant resource."

**RS-08#54** 現行の SaaS Lens[V][^32][^33]
- AWS Well-Architected SaaS Lens（2023-04-04）は、設計原則に「Isolate all tenant resources」を置く。
- pool モデルの難しさは、分離要件を緩める理由にならないとしている。
- SaaS SEC 2 のベストプラクティスは次の 2 点である[^33]。
  - 「Use coarse-grained constructs, application-enforced policies, or both」
  - 「Apply a combination of IAM and application-enforced policies」。IAM で表現できない資源は、アプリケーション強制のポリシーで守るとしている。
- 同じ SEC 2 の Improvement Plan は、厳格な分離が要る資源には silo モデルを使うよう挙げている。SQS についてはテナント専用キューを例示している。
> "The shared model increases the chance for cross-tenant access and, as such, it represents an area that requires you to be especially diligent about ensuring that resources are isolated."

**RS-08#55** IAM 条件による object storage の prefix 分離[V][^35][^36]
- AWS IAM では、`${aws:PrincipalTag/...}` を S3 リソース ARN やプレフィックス条件に使える。これによりプリンシパルのタグに対応するプレフィックスへアクセスを限定できる。
- セッションタグは AssumeRole 等の際に呼出し側が渡す。タグを渡すには、API 操作の権限に加えて `sts:TagSession` の許可が要る。IdP に連携したロールでは、信頼ポリシーへの `sts:TagSession` の付与が必須と明記されている。

**RS-08#56** タグ付与主体が信頼の根になる[D]
- prefix 分離は IAM 条件で二重防御化できる。その信頼の根は、セッションタグを設定する主体（isolation manager / token vending）である。
- 共有サービス自身が任意テナントのタグで AssumeRole できる構成では、侵害されたサービスが全テナントに到達し得る。
- タグは、検証済みのテナント文脈（署名検証済み token 等）からのみ導出する。タグを付与できる主体も、最小化して監査対象にする。
- 根拠: RS-08#53、#55。

### 3.6 非同期経路

**RS-08#57** 起点主体の権限による判断と、変更の即時反映[N][^2]
- ASVS v5.0.0-8.3.3（L3）は、中継サービスの権限ではなく起点主体の権限でオブジェクトへのアクセスを判断することを求める。
- v5.0.0-8.3.2（L3）は、認可の根拠となる値の変更を即時に反映することを求める。
  - 即時に反映できない場合は、もう権限のない consumer の操作を検知して警告し、元に戻す緩和策を「must」としている。
  - その代替策は情報漏えいを緩和しないと注記している。
> "Note that this alternative would not mitigate information leakage."（8.3.2）

**RS-08#58** 確認と実行の原子性[N][^5]
ASVS v5.0.0-15.4.2（L3）は、資源の状態（存在や権限）の確認と、それに依存する動作を単一の原子的操作として行うことを求める（TOCTOU 対策）。enqueue 時に認可し、後で実行する構成は、実行時に再確認しない限りこの類型に当たる[D]。

**RS-08#59** Transaction Tokens 草案[N][^55]
- 状態: draft-ietf-oauth-transaction-tokens-11 は Internet-Draft である（確認日 2026-10-03）。WG 状態は「WG Consensus: Waiting for Write-Up」、IESG 状態は「I-D Exists」、有効期限は 2027-01-31 であり、最終仕様ではない。
- 規範記述:
  - Txn-Token は短命（数分以下）であり、呼出しの想定期間だけ使わなければならない（MUST）。
  - batch やオフライン処理が絡む場合も、短命の Txn-Token になる。
  - 提示された token の期限が切れていれば、TTS は Txn-Token を発行してはならない（MUST NOT）。
  - 一方で、Txn-Token 自体の有効期間は、TTS の方針により、提示された token の期限を超えてもよい（MAY）。TTS は、割り当てる有効期間とトランザクションへの束縛が、期限超過に伴うリスクを十分に緩和するかを評価すべき（SHOULD）としている。
  - 剥奪（R-143）の観点では、MAY の部分は「上流 token の失効後も Txn-Token が有効なまま残り得る」ことを意味する[D]。
> "If a long-running process such as a batch or offline task is involved, the mechanism used to perform the external or internal invocation still results in a short-lived Txn-Token (see Section 13.1)."（§6）

**RS-08#60** SpiceDB の鮮度指定[V][^56]
- SpiceDB の公式文書（確認日時点の最新リリースは v1.56.2）は、次の鮮度指定を定義する。
  - `minimize_latency`: これだけを使うと、New Enemy Problem が起き得る時間窓が生じる。
  - `at_least_as_fresh`（ZedToken）: 指定した時点以上に新しいデータで計算することを保証する。
  - `fully_consistent`
> "at_least_as_fresh will ensure that all data used for computing the response is at least as fresh as the point-in-time specified in the ZedToken."

**RS-08#61** 非同期経路の設計案[D]
- 設計:
  - (a) enqueue 時に認可判断を行い、message に次の 3 つを付ける。
    - 起点主体
    - tenant_id
    - 判断時点の一貫性トークン（ZedToken 等）
  - (b) consumer は実行時に、起点主体で再 Check する（鮮度は `at_least_as_fresh` 以上）。
    - enqueue 時点の ZedToken による `at_least_as_fresh` は、enqueue 時点以上の鮮度しか保証しない（RS-08#60）。enqueue 後の剥奪を確実に反映させるには、`fully_consistent` を使うか、剥奪の書込みで得た ZedToken 以降を指定する。どちらにするかは、M-07 の測定結果と性能影響で決める。
  - (c) consumer は、DB 文脈（`SET LOCAL`）を message の tenant_id から設定する。payload 内の resource の tenant と照合する。
  - (d) 長時間・定期ジョブは、所有者の失効・退職・テナント停止を契機に停止する。
- 実測: 剥奪から consumer 側の拒否までの時間を PoC で測る（§5.2 M-07）。
- 根拠: RS-08#16、#57〜#60。

### 3.7 PEP の外に出るデータ：検索

**RS-08#62** Elastic の文書・フィールドレベルセキュリティ[V][^61]
- 文書レベルセキュリティ（DLS）は、文書単位の読取り API から返る文書を制限する。
- 公式文書は、次の点を注記・制限事項として明記している。
  - インデックス全体についての集計情報は、引き続き得られる。
  - 許可外文書にしかないフィールド名や語、ある語を含む許可外文書の件数を知り得る。
  - 関連度スコアの計算に使うグローバル統計には、DLS が効かない。
  - DLS が有効な場合、suggester は無視される。
  - DLS / FLS は、読取り専用の権限のアカウントで使う前提である。
> "A user whose access is restricted to specific documents in an index could still learn about field names and terms that only exist in inaccessible documents, and count how many inaccessible documents contain a given term."

**RS-08#63** テナント間は分離、テナント内は DLS[D]
- テナント間の境界を、共有インデックスと DLS だけで担保してはならない。件数・語彙・スコアを通じて、他テナントの存在情報が漏れ得るからである。
- テナント間は、インデックス（またはクラスタ / cell）を分離して担う。
- DLS と ACL フィルタは、テナント内の細粒度制御に限定する。
- 根拠: RS-08#5、#17、#62。

**RS-08#64** Microsoft Graph connectors の ACL[V][^62]
- 外部コンテンツを検索に取り込む際、item ごとに ACL（Entra のユーザー / グループ / Everyone、grant / deny）を付けて索引に複製する方式である。deny が grant に優先する。
- 外部グループの所属を item の ACL に展開しないよう求めている。展開すると、所属変更ごとに大量の item 更新が生じるためである。
- 索引時 ACL の方式は、ACL の同期遅延（剥奪の反映遅延）を伴う[D]。

**RS-08#65** OpenFGA の検索統合[V][^58]
- 公式文書は、検索と認可を統合する 3 方式と、その選択基準を示している。
  - 検索してから Batch Check する。
  - changes API から局所索引を作り、検索した後に Check する。
  - ListObjects で ID 一覧を得てから検索する。
- 局所索引方式では、索引にまだ反映されていない剥奪を除くため、返却前に Check を呼ぶ手順になっている。
- マルチテナントでは、まずテナントで絞り込む。公式文書はこれを「認可モデルのロジックの重複は理想的ではないが、妥当なトレードオフになり得る」としている。

**RS-08#66** OpenFGA ListObjects の打切りと非決定性[V][^59][^60]
- 非ストリーミングの ListObjects では、返却件数は `OPENFGA_LIST_OBJECTS_DEADLINE`（既定 3s）と `OPENFGA_LIST_OBJECTS_MAX_RESULTS`（既定 1000）の、先に達した方で打ち切られる。
- StreamedListObjects の返却件数は、`OPENFGA_LIST_OBJECTS_DEADLINE` だけで制限される。
- 結果は整列されず、同じ呼出しでも異なる集合を返し得る（確認日時点の最新リリースは v1.21.0）。
> "The objects given are not sorted, and therefore two identical calls can give a given different set of objects."

**RS-08#67** SpiceDB LookupResources の規模上の目安[V][^57]
- カーソルに対応し、一覧 endpoint の事前フィルタに使える。
- 1 万件を超えると性能問題を起こし得る重い要求であると明記している。
- その場合は、CheckBulk による事後フィルタ、または Materialize の評価を推奨している。

**RS-08#68** 一覧・検索 API の設計[D]
- 問題: 件数・ページング・総数表示は、側路になり得る（seed-03 §7 項6 の問い）。ListObjects 系を一覧の母集合とすると、上限で欠落し、非決定的になる。
- 設計:
  - 返却直前の post-check を必須にする。
  - 総件数は、テナント内かつ許可集合に対してのみ計算する。
  - 上限に達したら「不完全」を明示する。
- 大規模テナント（最大約 10 万ユーザー）での打切り頻度は PoC で実測する（§5.2 M-09）。この規模は CONVENTIONS §7 の暫定前提に依存する（前提台帳 ID は未採番）。
- 根拠: RS-08#62〜#67。

### 3.8 PEP の外に出るデータ：DWH

**RS-08#69** BigQuery の行レベルセキュリティ[V][^63]
- 公式文書（最終更新 2026-09-30）は、3 方式を次のように比較している。
  - authorized view: 細工したクエリやクエリ実行時間などの side channel を受け得る。
  - 行レベルアクセスポリシー: クエリ実行時間による side channel を受け得る。
  - 分離テーブル: 「Recommended for security」とし、総行数を秘匿すべき場合に適するとしている。
> "Separate tables: Recommended for security. Users cannot infer data without access to the table."

**RS-08#70** BigQuery の行ポリシーと他機能の相互作用[V][^64]
- copy ジョブには、コピー元に対する TRUE フィルタのアクセスが必要である。コピー元のポリシーはコピー先にも複製される。
- ポリシーのない表を、ポリシーのある表へ上書きコピーすると、コピー先のポリシーが外れる。追記を指定した場合は外れない。
- extract ジョブは、閲覧できる行だけを Cloud Storage に出力する。

**RS-08#71** 列レベルの制御[V][^65][^66][^67]
- BigQuery は policy tag による列レベルの制御を提供する。閲覧には Fine-Grained Reader ロールが要り、権限のない列を含む `SELECT *` はエラーになる。
- Snowflake の row access policy は Enterprise Edition 以上の機能であり、実行時に動的な secure view を作って適用する。制限事項として次の 2 点が明記されている。
  - 保護された view に対する CHANGES 句は使えない。
  - 外部テーブルは mapping table に使えない。
- Snowflake の列レベルセキュリティは、Dynamic Data Masking と External Tokenization からなる。

**RS-08#72** DWH / ETL の設計[D]
- DWH / ETL には、全テナントを横断して読む主体（BYPASSRLS 相当の特権）が必ず存在し、PEP の外にある。
- 設計:
  - (1) 抽出元の特権ロールを、ジョブ単位の JIT 付与にする。
  - (2) DWH ではテナント間を dataset / table で分離する。BigQuery の推奨（RS-08#69）と整合する。
  - (3) テナント内の細粒度は、行ポリシーと列マスキングで扱う。
  - (4) copy / extract / 共有の各ジョブを「持出し経路」として棚卸しし、AC-3(9) の統制対象にする。
- 根拠: RS-08#15、#41、#69〜#71。

### 3.9 PEP の外に出るデータ：ML / RAG

**RS-08#73** NIST AI 100-2 E2025 のプライバシー攻撃分類[N][^69]
- NIST AI 100-2 E2025（2025-03）は、プライバシー攻撃を次のように分類している（§2.1.2, p.7）。
  - data reconstruction
  - membership inference
  - training data extraction
  - attribute inference
  - property inference
- 生成 AI の情報抽出の標的として、学習データ中の PII、RAG データベース中の機微情報、system prompt を挙げている（§3.3.2, p.46）。
- 強度: 分類と用語を示す報告書であり、要求事項（shall）ではない。

**RS-08#74** OWASP LLM08:2025（Vector and Embedding Weaknesses）[N][^68]
- 複数のユーザー群やアプリが同じベクトル DB を共有するマルチテナント環境では、文脈が漏えいするリスクがあると指摘している。
- 予防策として、権限を認識する（permission-aware）ベクトルストアと、データセットの論理的・アクセス上の厳格な分割を挙げている。
> "Implement fine-grained access controls and permission-aware vector and embedding stores. Ensure strict logical and access partitioning of datasets in the vector database to prevent unauthorized access between different classes of users or different groups."

**RS-08#75** ML / RAG の設計[D]
- 複数テナントのデータで学習した共有モデルの出力には、行・オブジェクト単位の認可を後付けできない。PEP は、出力に何が含まれるかを判定できないからである。
- そのためテナント横断学習は、R-011 の例外として扱う。経営判断・契約・PIA の対象にするか、テナント別のモデル / アダプタに限定する。
- RAG は、リトリーバ段で PEP を通す（検索と同じ扱い、RS-08#63・#68）。ベクトルストアは、テナント間を物理的または論理的に分割する。
- 根拠: RS-08#5、#73、#74。

### 3.10 PEP の外に出るデータ：バックアップ・レプリカ・ログ・export

**RS-08#76** row_security と pg_dump[V][^18][^24][^25]
- `row_security = off` は RLS を迂回しない。ポリシーで行が絞られるクエリをエラーにする。
- pg_dump は既定で `row_security` を off にして全行の取得を保証する。権限が足りなければエラーになる。
- 公式文書は、バックアップで行が黙って欠けることを「disastrous」と表現している。
> "By default, pg_dump will set row_security to off, to ensure that all data is dumped from the table. If the user does not have sufficient privileges to bypass row security, then an error is thrown."

**RS-08#77** 論理レプリケーションと RLS[V][^26]
- 複製接続のロールが SUPERUSER も BYPASSRLS も持たない場合、publisher の RLS ポリシーが実行され得る。
- 接続文字列に `options=-crow_security=off` を指定すると、table owner が後からポリシーを追加したときに、複製はポリシーを実行せずに停止する。

**RS-08#78** バックアップ情報の保護[N][^14][^15]
- CP-9(d) は、バックアップ情報の機密性・完全性・可用性の保護を求める。
- CP-9(8) は、バックアップ情報の暗号保護を求める。CP-9(8) は MODERATE / HIGH のベースラインに含まれる。
> "Protect the confidentiality, integrity, and availability of backup information."（CP-9 d）

**RS-08#79** バックアップ・レプリカ・CDC の位置付け[D]
- バックアップ・レプリカ・CDC は、構造的に「全テナント入り、RLS 非適用」のデータ集合である。
- PEP 完全性の議論では、アプリ経路より強い統制を当てる。
  - 復元と閲覧を特権機能とする（AC-6(9)・AC-6(10)）。
  - バックアップ用の鍵を分離する。
  - テナント単位で復元・抽出するときは、対象テナントの照合を必須にする。
- 根拠: RS-08#16、#76〜#78。

**RS-08#80** ログの統制[N][^6][^4][^14]
- ASVS は次の要件を置いている。
  - v5.0.0-16.1.1（L2）: アクセス統制を含むログ在庫
  - 16.2.3（L2）: 在庫にない宛先へ出力しない
  - 16.2.5（L2）: 保護レベルに応じた記録
  - 16.4.2（L2）: 不正アクセス・改ざんからの保護
  - 16.4.3（L2）: 論理的に分離した系への送出
  - v5.0.0-14.1.2（L2）: データ保護レベルごとの要件に「ログ中の機微データへのアクセス統制」を含める
- NIST AU-9 は、監査情報と監査ツールの保護と、不正アクセス時の通報を求める。

**RS-08#81** 署名付き URL[V][^37]
- Amazon S3 の公式文書は、署名付き URL を「保持者にアクセスを与えるベアラトークン」と明記している。
- 有効期限までは複数回使える。期限は、CLI / SDK では最長 7 日に設定できる。
- 作成に使った資格情報が失効すると、署名付き URL も失効する。
> "In essence, presigned URLs are bearer tokens that grant access to those who possess them."

**RS-08#82** ログ・export の設計[D]
- ログ・decision log・trace は、テナント横断で集約されるため PEP の外にある。顧客向け監査 API（R-134）で返すときは、テナントスコープの PEP をもう一度通す。
- export と共有リンクは、PEP 判定を「発行時の 1 回」に固定するベアラ型の経路である。剥奪（R-143）後も、有効期限まで有効になり得る。
- そのため次の対策を棚卸し対象の統制とする。
  - 発行を認可イベントとして記録する。
  - TTL の上限を設ける。
  - 発行元の資格情報を短命にする。
  - export 件数を KRI にする。
- 根拠: RS-08#34、#80、#81。

---

## 4. 標準・文書ステータス表

確認日はすべて 2026-10-03。

| 名称 | 版 | 状態 | 公表日 | URL | タグ |
|---|---|---|---|---|---|
| OWASP ASVS | 5.0.0 | final（GitHub release `v5.0.0_release`） | 2025-05-30 | https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0/en | [N] |
| OWASP API Security Top 10 | 2023 | 公開済（awareness document） | 月日は原典で未確認 | https://github.com/OWASP/API-Security/tree/master/editions/2023/en | [N] |
| NIST SP 800-53 Rev. 5 | Release 5.2.0 | final | 2020-09（5.2.0 は 2025-08-27） | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final | [N] |
| NIST SP 800-53A Rev. 5 | Release 5.2.0 | final | 2022-01（5.2.0 は 2025-08-27） | https://csrc.nist.gov/pubs/sp/800/53/a/r5/final | [N] |
| NIST SP 800-53B ベースライン | Release 5.2.0（OSCAL profile 5.2.0） | final（Release 5.2.0 はベースライン変更なし） | 2020-09（2020-12-10 更新を含む。5.2.0 は 2025-08-27） | https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final | [N] |
| NIST SP 800-207 | — | final | 2020-08 | https://doi.org/10.6028/NIST.SP.800-207 | [N] |
| NIST AI 100-2 | E2025 | final（2025-06-03 付で誤記の存在と将来更新予定の注記あり） | 2025-03 | https://doi.org/10.6028/NIST.AI.100-2e2025 | [N] |
| OpenAPI Specification | 3.2.1 | published | 2026-09-10 | https://spec.openapis.org/oas/v3.2.1.html | [N] |
| OpenTelemetry Specification | v1.61.0（Trace API は Stable） | released | 2026-09-14 | https://github.com/open-telemetry/opentelemetry-specification/releases/tag/v1.61.0 | [N] |
| draft-ietf-oauth-transaction-tokens | -11 | draft（WG Consensus: Waiting for Write-Up、IESG: I-D Exists） | 2026-07（Expires 2027-01-31） | https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ | [N] |
| MITRE CWE | 4.20 | released | 2026-04-30 | https://cwe.mitre.org/ | [N] |
| OWASP Top 10 for LLM Applications | 2025 | 公開済（原稿の最終更新コミットは 2025-10-27、公表月日は未確認） | — | https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns | [N] |
| OWASP WSTG | v4.2 | released | 2020-12-03 | https://owasp.org/www-project-web-security-testing-guide/v42/ | [N] |
| OWASP Authorization Cheat Sheet | 随時更新（master） | living document | — | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | [N] |
| PostgreSQL 文書 | 18（current）。19 は Beta 4 | 現行サポート版 | 19 Beta 4 は 2026-09-24 | https://www.postgresql.org/docs/18/ | [V] |
| PgBouncer | 1.26.0 | released | 2026-09-23 | https://www.pgbouncer.org/ | [V] |
| AWS SaaS Tenant Isolation Strategies | — | historical reference only | 2020-08-01 | https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html | [V] |
| AWS Well-Architected SaaS Lens | — | 現行 | 2023-04-04（初版 2020-12-03） | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html | [V] |
| AWS Prescriptive Guidance（managed PostgreSQL for multi-tenant SaaS） | — | 現行 | 2021-09-30（更新 2024-04-29） | https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/ | [V] |
| OpenFGA | v1.21.0 | released | 2026-09-20 | https://openfga.dev/docs | [V] |
| SpiceDB | v1.56.2 | released | 2026-09-11 | https://authzed.com/docs/spicedb | [V] |
| Istio | 1.31.1（docs は latest） | released | 2026-09-21 | https://istio.io/latest/docs/ | [V] |
| BigQuery 文書（行・列レベル） | — | 現行 | 最終更新 2026-09-30 | https://cloud.google.com/bigquery/docs/row-level-security-intro | [V] |
| Snowflake 文書（row access / masking policy） | — | 現行（Enterprise Edition 以上） | ページに日付表示なし | https://docs.snowflake.com/en/user-guide/security-row-intro | [V] |
| Elastic 文書（DLS / FLS） | current | 現行 | ページに日付表示なし | https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level | [V] |
| GitHub REST API 文書（permission 一覧・ヘッダ） | docs.github.com（Free/Pro/Team） | 現行 | ページに日付表示なし | https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps | [V] |
| Semgrep 登録ルール | semgrep-rules `develop` ブランチ | 現行 | — | https://github.com/semgrep/semgrep-rules | [V] |
| CodeQL query help | latest | 現行 | — | https://codeql.github.com/codeql-query-help/ | [V] |

---

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

| 入力先 | 入力する内容 | 根拠 |
|---|---|---|
| ADR-012 PEP coverage とストレージ側防御 | 棚卸しは静的宣言と実行時観測の差分で行い、DB 直接接続は DB 側で別系統の棚卸しをする | RS-08#21〜#27 |
| ADR-012 | PEP SDK の呼出し規約と、それに対するカスタム SAST ルールを CI の必須ゲートにする（既製ルールだけには依存しない） | RS-08#28〜#33 |
| ADR-012 | 実行時 coverage は「判断イベントのない入口が 0」を KRI にし、例外台帳を設ける | RS-08#34〜#35 |
| ADR-012 | 責任分担: RLS はテナント境界、PEP は object / field 単位の判定 | RS-08#40〜#45 |
| ADR-012 | DB の必要条件: アプリロールは非 owner かつ NOBYPASSRLS、テナント表は FORCE、view は security_invoker、文脈は `SET LOCAL` のみ。いずれも CI で検査する | RS-08#40〜#51 |
| ADR-012 | object storage の prefix 分離を IAM 条件で二重化する。タグを付与する主体を最小化し監査する | RS-08#55〜#56 |
| ADR-011 policy 言語と PEP–PDP API | PEP SDK は既定拒否とし、判断イベント（decision_id）を出す。GraphQL・REST・gRPC・consumer は同じ業務層の認可関数に収束させる | RS-08#11、#35、#37〜#38 |
| ADR-009 workload identity と委任の伝搬 | 非同期の message に起点主体・tenant_id・一貫性トークンを載せ、consumer は起点主体で再認可する。Txn-Token は draft 依存として扱う | RS-08#57〜#61 |
| ADR-010 認可エンジンと整合性モデル | 一覧・検索での ListObjects 系の打切りと非決定性を、選定評価軸に加える。consumer 再認可の鮮度指定も加える | RS-08#60、#65〜#68 |
| ADR-013 cell 分割と fail-mode | テナント間の境界は、検索インデックス・DWH・ベクトルストアの分離（silo / 分割）で担う。共有ストアの DLS / 行ポリシーはテナント内の細粒度に限定する | RS-08#62〜#75 |
| ADR-014 監査データ | decision log はテナント横断データとして扱う。顧客監査 API ではテナントスコープの PEP を通す。ログ在庫（ASVS 16.1.1）を作る | RS-08#34、#80、#82 |
| ADR-006 失効と継続評価 | export・署名付き URL・長時間ジョブを、剥奪反映 SLO の対象経路に含める | RS-08#61、#81〜#82 |
| ADR-008 管理面と CI/CD | BYPASSRLS ロール・ETL 特権・バックアップ復元を特権機能として扱う（AC-6(9)(10)）。PEP 関連の CI 検査は二者レビュー対象にする | RS-08#16、#72、#79 |
| ADR-017 非人間 ID・AI エージェント | RAG はリトリーバ段で PEP を通す。テナント横断学習を R-011 の例外とし、経営判断の対象にする | RS-08#73〜#75 |
| DL-10（D10 DFD・entry point inventory） | 入口の分類（同期 / 非同期 / DB 直接 / 持出し経路）と差分レポートの様式 | RS-08#21〜#27、#72、#81 |
| DL-15（D15 PEP coverage・DB guardrail 検証仕様） | CI 検査項目: OpenAPI の空 security、PEP 未経由 handler、RLS 無効表・FORCE 未設定、BYPASSRLS 接続、allow-nothing 不在、security_invoker 未設定 | RS-08#23、#32、#36、#43、#45 |
| DL-28（D28 統制マッピング台帳） | ASVS は `v5.0.0-x.y.z` 形式で参照する。AC-25・SA-11(1)・AC-3(8)・AC-3(9)・AC-4(21) は、ベースライン外の tailoring 追加候補として記載する | RS-08#1、#14、#18 |
| DL-03（D03 資産・データ分類台帳） | 「全テナント入り」データ集合（バックアップ、レプリカ、DWH、ログ、学習データ）を独立した資産として登録する | RS-08#72、#75、#79、#82 |
| R-011 の運用定義案（Gate 0 決裁パッケージ） | §5.2 の KRI を「既知の未緩和経路 0 件」の測定手段として提示する。値と閾値は事業側が決める | RS-08#27、#35、#43、#39 |

以上はすべて設計推論である[D]。

### 5.2 PoC で実測すべきこと

TC-ID は 12_poc で採番する。以下の M 番号は本ノート内の仮番号である。合否閾値は TBD とし、所有者は Gate 4 の事前登録時に決める。

| 仮番号 | 測るもの | 測定方法の要点 | 対応 |
|---|---|---|---|
| M-01 | 棚卸し差分件数 | パイロット 2〜3 サービスで、静的宣言（OpenAPI / proto / GraphQL / ルート表 / consumer / cron）と、N 日分の SERVER / CONSUMER span の差分を取る。DB の接続元ロールは別集計する | R-058, R-164 |
| M-02 | カスタム SAST ルールの検出率・誤検知率 | PEP 呼出しを除去した変異体と、tenant scope を外した変異体を k 件ずつ埋め込み、検出数を数える | R-059, R-062 |
| M-03 | 実行時の「判断イベントのない入口」件数 | span と decision_id を突合する。例外台帳の件数も測る | R-059 |
| M-04 | RLS の性能影響 | 代表クエリの p50 / p99 / p99.9 を、RLS の有無で比べる。最大テナント規模と全テナント数（CONVENTIONS §7 の暫定値）のデータで、コールドキャッシュを含めて測る | R-061 |
| M-05 | プール越しのテナント文脈の混線 | PgBouncer の transaction pooling 上で、`SET` と `SET LOCAL` を高並行・長時間で比べ、他テナント行の取得件数を数える。同じ session で一度 `SET LOCAL` した後の、文脈未設定トランザクションでの `current_setting` の挙動（エラーか、値が残るか）も確かめる | R-061 |
| M-06 | DB ロールと表設定の監査 | RLS 無効表・FORCE 未設定表・BYPASSRLS ロール・owner 接続・security_invoker 未設定 view の件数 | R-061 |
| M-07 | 非同期経路の剥奪反映 | 剥奪から consumer 拒否までの時間分布と、剥奪後に実行されたジョブの割合 | R-143, R-061 |
| M-08 | 検索の側路 | 共有インデックスと DLS の構成で、件数・集計・語彙・スコア・suggest 経由の他テナント情報の推測可否を試す。テナント別インデックスと比較する | R-172 |
| M-09 | ListObjects 系の打切り頻度 | 大規模テナントで、上限件数・期限に達する頻度と、ページングの一貫性を測る | R-190 |
| M-10 | cross-tenant property test | 2 テナント以上 × ロールで、全入口に他テナント ID と非実在 ID を生成し、許可件数が 0 であることを確認する。PEP 変異体で試験の検出力も測る | R-071, R-172, R-168 |
| M-11 | 持出し経路の統制付与率 | export・署名付き URL・copy / extract ジョブ・バックアップ復元のうち、発行記録・TTL 上限・承認がある経路の割合を測る。最大 TTL の実態も測る | R-061, R-143 |

---

## 6. 調査の限界と未確認事項

1. 原典照合の独立性:
   - 本ノートは単一の AI エージェントが作成した。2026-10-03 に、作成者とは別の AI エージェントのセッションが全脚注を原典と照合し、指摘箇所を修正した（research/verification/RS-08-verification.md）。
   - 照合者も AI エージェントである。人間の第三者による突合は済んでいない。
2. OWASP 文書の位置付け:
   - ASVS、API Top 10、Cheat Sheet、WSTG、LLM Top 10 は OWASP のコミュニティ文書であり、ISO / RFC / NIST と同等の規範ではない。
   - 本ノートでは [N] を付けたが、強度はそれぞれの原文の表現のまま写した。API Top 10 は自ら「awareness document」としている。
3. 公表日の未確認: API Security Top 10 2023 と OWASP LLM Top 10 2025 は、公表月日を原典ページで確認できなかった。
4. AWS whitepaper の扱い:
   - AWS「SaaS Tenant Isolation Strategies」と「SaaS Architecture Fundamentals」は、確認日時点で「historical reference only」と表示されている。
   - 現行の AWS サービスの機能・推奨を反映していない可能性がある。現行文書として扱ったのは、SaaS Lens（2023-04-04）と Prescriptive Guidance（2024-04-29 更新）だけである。
5. SP 800-53B ベースラインの照合範囲: 収録状況は OSCAL profile（5.2.0）で照合した。CSRC の出版物ページで「Release 5.2.0 はベースライン変更なし」の記述を確認した[^70]。SP 800-53B の PDF 本文とプライバシーベースラインは確認していない。
6. SAST の調査範囲:
   - CodeQL と Semgrep の公開ルールだけを見た。商用 SAST（Checkmarx、Snyk、Fortify 等）や、Semgrep Pro / Code の非公開ルールは調べていない。
   - CodeQL の「C# の 2 件だけ」という判断は、確認日時点の CWE coverage 一覧を当方が読み取った結果であり、各言語のクエリパックを全数確認したものではない。
7. GitHub の内部検証: endpoint 別 permission 宣言を内部でどう検証・強制しているかは非公開で、未確認である。
8. RLS の性能と CVE の範囲:
   - RLS の性能影響について、一次資料の公開測定値は見つけていない（M-04 で実測が必要）。
   - PostgreSQL の RLS 関連 CVE は 3 件の勧告ページを読んだ（CVE-2016-2193 は照合時に勧告ページを確認した[^71]）。RLS 関連 CVE の全数は確認していない。
   - 同じ session で一度 `SET LOCAL` したカスタム変数が、トランザクション終了後にどう見えるかは原典で確認できていない（RS-08#50、M-05）。
9. 調査しなかった基盤:
   - 他の DB・DWH: Azure SQL / SQL Server の RLS、Amazon Redshift の RLS、Databricks Unity Catalog の row filter / column mask、Citus、Aurora 固有の挙動
   - 他の検索基盤: Azure AI Search と Vertex AI Search の security trimming、OpenSearch の DLS、Zanzibar 論文の Leopard indexing
   - message 基盤: Kafka / SQS / Pub/Sub の、message 単位のテナント認可の公式文書
10. 事故事例の不在: テナント間漏えいの事故（PIR / RCA）の一次報告は、本ストリームでは収集していない。[I] タグの根拠はない（RS-09 / RS-12 側で扱う想定）。
11. 確定していない規範:
    - Transaction Tokens は Internet-Draft であり、規範記述は変わり得る。
    - ASVS v5.0.0-8.3.3 の「起点主体の token を下流で使う」要件と、token exchange / Txn-Token 方式との整合は、ADR-009 で別途検討が要る。
12. 法令・契約の観点の欠落: バックアップの保存地域、削除権、データ所在地など、法令・契約の観点は扱っていない（D34 / RS の法務系ストリームで扱う）。
13. 実測の不在: §5.2 の測定項目は、いずれも未実測である。本ノートの [D] 項目は、PoC の結果によって覆り得る。

---

## 参考文献

[^1]: OWASP『Application Security Verification Standard 5.0.0 — What is the ASVS?』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x03-What-is-the-ASVS.md （参照箇所: Levels（Level 1/2/3）, "requirements (must)" の段落, Requirement identifiers の節、確認日: 2026-10-03）
[^2]: OWASP『ASVS 5.0.0 — V8 Authorization』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x17-V8-Authorization.md （参照箇所: 8.1.1, 8.1.2, 8.2.1〜8.2.3, 8.3.1〜8.3.3, 8.4.1、確認日: 2026-10-03）
[^3]: OWASP『ASVS 5.0.0 — V13 Configuration』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x22-V13-Configuration.md （参照箇所: 13.1.1, 13.2.2, 13.4.5、確認日: 2026-10-03）
[^4]: OWASP『ASVS 5.0.0 — V14 Data Protection』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x23-V14-Data-Protection.md （参照箇所: 14.1.2、確認日: 2026-10-03）
[^5]: OWASP『ASVS 5.0.0 — V15 Secure Coding and Architecture』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md （参照箇所: 15.3.1, 15.3.3, 15.4.2、確認日: 2026-10-03）
[^6]: OWASP『ASVS 5.0.0 — V16 Security Logging and Error Handling』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md （参照箇所: 16.1.1, 16.2.3, 16.2.5, 16.3.2, 16.4.2, 16.4.3、確認日: 2026-10-03）
[^7]: OWASP『ASVS 5.0.0 — V4 API and Web Service』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x13-V4-API-and-Web-Service.md （参照箇所: 4.1.3, 4.3.2、確認日: 2026-10-03）
[^8]: OWASP『API1:2023 Broken Object Level Authorization』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa1-broken-object-level-authorization.md （参照箇所: Is the API Vulnerable?, How To Prevent、確認日: 2026-10-03）
[^9]: OWASP『API3:2023 Broken Object Property Level Authorization』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa3-broken-object-property-level-authorization.md （参照箇所: Is the API Vulnerable?, How To Prevent、確認日: 2026-10-03）
[^10]: OWASP『API5:2023 Broken Function Level Authorization』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa5-broken-function-level-authorization.md （参照箇所: Is the API Vulnerable?, How To Prevent、確認日: 2026-10-03）
[^11]: OWASP『API9:2023 Improper Inventory Management』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa9-improper-inventory-management.md （参照箇所: Is the API Vulnerable?, How To Prevent、確認日: 2026-10-03）
[^12]: OWASP『API Security Top 10 2023 — Release Notes』2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0x04-release-notes.md （参照箇所: "awareness document" の段落, 統合カテゴリの箇条、確認日: 2026-10-03）
[^13]: NIST『SP 800-53 Rev. 5, Security and Privacy Controls for Information Systems and Organizations』出版物ページ, 2020-09（Release 5.2.0: 2025-08-27）. https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final （参照箇所: Date Published, Planning Note (08/27/2025)、確認日: 2026-10-03）
[^14]: NIST『Electronic (OSCAL) Version of NIST SP 800-53 Rev 5.2.0 Controls and SP 800-53A Rev 5.2.0 Assessment Procedures』version 5.2.0. https://github.com/usnistgov/oscal-content/blob/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json （参照箇所: AC-3, AC-3(8), AC-3(9), AC-4, AC-6(9), AC-6(10), AC-25, SC-4, CP-9, CP-9(8), AU-9, SA-11(1) の statement / discussion、AC-3・AC-4・AC-25 の assessment-objective と assessment-method、確認日: 2026-10-03）
[^15]: NIST『SP 800-53B Control Baselines（OSCAL profiles: LOW / MODERATE / HIGH）』version 5.2.0. https://github.com/usnistgov/oscal-content/tree/main/nist.gov/SP800-53/rev5/json （参照箇所: NIST_SP-800-53_rev5_{LOW,MODERATE,HIGH}-baseline_profile.json の include-controls、確認日: 2026-10-03）
[^16]: NIST『SP 800-53A Rev. 5, Assessing Security and Privacy Controls』出版物ページ, 2022-01（Release 5.2.0: 2025-08-27）. https://csrc.nist.gov/pubs/sp/800/53/a/r5/final （参照箇所: Date Published, Planning Note (08/27/2025)、確認日: 2026-10-03）
[^17]: NIST『SP 800-207 Zero Trust Architecture』2020-08. https://doi.org/10.6028/NIST.SP.800-207 （参照箇所: §2 p.5（implicit trust zone）, §3 p.10（PEP の定義）、確認日: 2026-10-03）
[^18]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation §5.9 Row Security Policies』18. https://www.postgresql.org/docs/18/ddl-rowsecurity.html （参照箇所: 冒頭の概説（default-deny、BYPASSRLS、table owner、FORCE）, 参照整合性と covert channel の段落, row_security とバックアップの段落, 副問合せと競合状態の例、確認日: 2026-10-03）
[^19]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — ALTER TABLE』18. https://www.postgresql.org/docs/18/sql-altertable.html （参照箇所: NO FORCE / FORCE ROW LEVEL SECURITY、確認日: 2026-10-03）
[^20]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — CREATE ROLE』18. https://www.postgresql.org/docs/18/sql-createrole.html （参照箇所: BYPASSRLS / NOBYPASSRLS、確認日: 2026-10-03）
[^21]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — CREATE VIEW』18. https://www.postgresql.org/docs/18/sql-createview.html （参照箇所: security_invoker パラメータ, Notes（row-level security と view owner）、確認日: 2026-10-03）
[^22]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — SET』18. https://www.postgresql.org/docs/18/sql-set.html （参照箇所: Description（SET / SET LOCAL の有効範囲）、確認日: 2026-10-03）
[^23]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation §9.28.1 Configuration Settings Functions』18. https://www.postgresql.org/docs/18/functions-admin.html （参照箇所: Table 9.95 current_setting, set_config、確認日: 2026-10-03）
[^24]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — pg_dump』18. https://www.postgresql.org/docs/18/app-pgdump.html （参照箇所: --enable-row-security、確認日: 2026-10-03）
[^25]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation §19.11.1 Statement Behavior』18. https://www.postgresql.org/docs/18/runtime-config-client.html （参照箇所: row_security、確認日: 2026-10-03）
[^26]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation §29.11 Security（Logical Replication）』18. https://www.postgresql.org/docs/18/logical-replication-security.html （参照箇所: 複製ロールと row security の段落、確認日: 2026-10-03）
[^27]: PostgreSQL Global Development Group『CVE-2024-10976: PostgreSQL row security below e.g. subqueries disregards user ID changes』2024-11-14. https://www.postgresql.org/support/security/CVE-2024-10976/ （参照箇所: 説明文, Version Information, CVSS 3.0、確認日: 2026-10-03）
[^28]: PostgreSQL Global Development Group『CVE-2023-2455: Row security policies disregard user ID changes after inlining』2023-05-11. https://www.postgresql.org/support/security/CVE-2023-2455/ （参照箇所: 説明文, Version Information、確認日: 2026-10-03）
[^29]: PgBouncer project『PgBouncer features』（確認日時点の最新リリース 1.26.0, 2026-09-23）. https://www.pgbouncer.org/features.html （参照箇所: Transaction pooling の説明, 機能対応表（SET/RESET）、確認日: 2026-10-03）
[^30]: PgBouncer project『PgBouncer configuration』（確認日時点の最新リリース 1.26.0）. https://www.pgbouncer.org/config.html （参照箇所: server_reset_query, server_reset_query_always、確認日: 2026-10-03）
[^31]: Amazon Web Services『SaaS Tenant Isolation Strategies: Isolating Resources in a Multi-Tenant Environment』2020-08-01（historical reference only と表示）. https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html （参照箇所: The isolation mindset, Run-time policy-based isolation with IAM, Pooled storage isolation strategies, Application-enforced pool isolation, Hiding the details of pooled isolation, Document history、確認日: 2026-10-03）
[^32]: Amazon Web Services『AWS Well-Architected Framework — SaaS Lens』2023-04-04. https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html （参照箇所: General design principles, Identity and access management（SaaS SEC 1）, Pool isolation, Preventing cross tenant access, Document revisions、確認日: 2026-10-03）
[^33]: Amazon Web Services『SaaS Lens SEC 2: How are you ensuring that tenant resources are protected from cross-tenant access?』Well-Architected Tool. https://wa.aws.amazon.com/saas.question.SEC_2.en.html （参照箇所: Best Practices, Improvement Plan、確認日: 2026-10-03）
[^34]: Amazon Web Services『AWS Prescriptive Guidance — Implementing managed PostgreSQL for multi-tenant SaaS applications on AWS』2021-09-30（更新 2024-04-29）. https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html （参照箇所: Row-level security recommendations, Best practices, Document history、確認日: 2026-10-03）
[^35]: Amazon Web Services『IAM User Guide — IAM policy elements: Variables and tags』. https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html （参照箇所: aws:PrincipalTag を Resource に用いる例、確認日: 2026-10-03）
[^36]: Amazon Web Services『IAM User Guide — Pass session tags in AWS STS』. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html （参照箇所: session tags の概要, sts:TagSession, 推移タグ、確認日: 2026-10-03）
[^37]: Amazon Web Services『Amazon S3 User Guide — Download and upload objects with presigned URLs』. https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html （参照箇所: Who can create a presigned URL, Expiration time for presigned URLs, presigned URL の機能制限の段落、確認日: 2026-10-03）
[^38]: GitHub『Troubleshooting the REST API』docs.github.com（Free/Pro/Team）. https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api （参照箇所: Resource not accessible（X-Accepted-GitHub-Permissions）、確認日: 2026-10-03）
[^39]: GitHub『Permissions required for GitHub Apps』docs.github.com（Free/Pro/Team）. https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps （参照箇所: About GitHub App permissions, 各 permission の endpoint 表、確認日: 2026-10-03）
[^40]: GitHub『Permissions required for fine-grained personal access tokens』docs.github.com（Free/Pro/Team）. https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens （参照箇所: 冒頭説明, 各 permission の endpoint 表、確認日: 2026-10-03）
[^41]: Semgrep『Rule ideas — Enforce authentication patterns』semgrep.dev docs. https://semgrep.dev/docs/writing-rules/rule-ideas （参照箇所: Enforce authentication patterns、確認日: 2026-10-03）
[^42]: Semgrep『semgrep-rules: csharp/dotnet/security/audit/missing-or-broken-authorization.yaml』develop ブランチ. https://github.com/semgrep/semgrep-rules/blob/develop/csharp/dotnet/security/audit/missing-or-broken-authorization.yaml （参照箇所: rule 全文（patterns, metadata）、確認日: 2026-10-03）
[^43]: Semgrep『semgrep-rules: ruby/rails/security/brakeman/check-unscoped-find.yaml』develop ブランチ. https://github.com/semgrep/semgrep-rules/blob/develop/ruby/rails/security/brakeman/check-unscoped-find.yaml （参照箇所: rule 全文（taint sources / sinks, message, metadata）、確認日: 2026-10-03）
[^44]: GitHub『CodeQL query help: Missing function level access control（cs/web/missing-function-level-access-control）』. https://codeql.github.com/codeql-query-help/csharp/cs-web-missing-function-level-access-control/ （参照箇所: ID / Precision / Tags / Query suites, 説明文、確認日: 2026-10-03）
[^45]: GitHub『CodeQL query help: Insecure Direct Object Reference（cs/web/insecure-direct-object-reference）』. https://codeql.github.com/codeql-query-help/csharp/cs-web-insecure-direct-object-reference/ （参照箇所: ID / Precision / Tags / Query suites, 説明文、確認日: 2026-10-03）
[^46]: GitHub『CodeQL CWE coverage』. https://codeql.github.com/codeql-query-help/full-cwe/ （参照箇所: CWE-285, CWE-639, CWE-862 の行、確認日: 2026-10-03）
[^47]: MITRE『CWE List』version 4.20, 2026-04-30. https://cwe.mitre.org/data/definitions/862.html （参照箇所: CWE-862, CWE-639, CWE-566 の Description、確認日: 2026-10-03）
[^48]: OpenAPI Initiative『OpenAPI Specification v3.2.1』2026-09-10. https://spec.openapis.org/oas/v3.2.1.html （参照箇所: §4.10 Operation Object の security フィールド, §4.30 Security Requirement Object、確認日: 2026-10-03）
[^49]: OpenTelemetry Authors『OpenTelemetry Specification — Tracing API』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/trace/api.md （参照箇所: SpanKind（Status: Stable）、確認日: 2026-10-03）
[^50]: Istio Authors『Authorization Policy（reference）』latest（確認日時点の最新リリース 1.31.1）. https://istio.io/latest/docs/reference/config/security/authorization-policy/ （参照箇所: 評価規則（CUSTOM / DENY / ALLOW）、確認日: 2026-10-03）
[^51]: Istio Authors『Security（concepts）』latest. https://istio.io/latest/docs/concepts/security/ （参照箇所: Authorization — allow-nothing, deny-all and allow-all policy、確認日: 2026-10-03）
[^52]: GraphQL Foundation『Authorization』graphql.org. https://graphql.org/learn/authorization/ （参照箇所: Delegate authorization logic to the business logic layer、確認日: 2026-10-03）
[^53]: OWASP『Authorization Cheat Sheet』master. https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html （参照箇所: Validate the Permissions on Every Request, Create Unit and Integration Test Cases for Authorization Logic、確認日: 2026-10-03）
[^54]: OWASP『Web Security Testing Guide v4.2 — WSTG-ATHZ-04 Testing for Insecure Direct Object References』v4.2, 2020-12-03. https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References （参照箇所: Test Objectives, How to Test、確認日: 2026-10-03）
[^55]: A. Tulshibagwale et al.『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, Internet-Draft, 2026-07（Expires 2027-01-31）. https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ （参照箇所: §6 Txn-Token Lifetime, §13.1 Txn-Token Replay Risks, replacement の要件、WG / IESG 状態表示、確認日: 2026-10-03）
[^56]: AuthZed『SpiceDB Concepts — Consistency』（確認日時点の最新リリース v1.56.2）. https://authzed.com/docs/spicedb/concepts/consistency （参照箇所: Levels（minimize_latency, at_least_as_fresh, at_exact_snapshot, fully_consistent）, ZedTokens、確認日: 2026-10-03）
[^57]: AuthZed『SpiceDB Concepts — Querying Data』. https://authzed.com/docs/spicedb/concepts/querying-data （参照箇所: LookupResources, LookupSubjects、確認日: 2026-10-03）
[^58]: OpenFGA Authors『Search with Permissions』openfga.dev. https://openfga.dev/docs/interacting/search-with-permissions （参照箇所: Possible options（Option 1〜3）, Choosing the best option、確認日: 2026-10-03）
[^59]: OpenFGA Authors『OpenFGA API（OpenAPI v2 定義）— ListObjects / StreamedListObjects』openfga/api main. https://github.com/openfga/api/blob/main/docs/openapiv2/apidocs.swagger.json （参照箇所: /stores/{store_id}/list-objects の description, /stores/{store_id}/streamed-list-objects の description、確認日: 2026-10-03）
[^60]: OpenFGA Authors『Configuring OpenFGA』openfga.dev（確認日時点の最新リリース v1.21.0）. https://openfga.dev/docs/getting-started/setup-openfga/configuration （参照箇所: listObjectsDeadline, listObjectsMaxResults、確認日: 2026-10-03）
[^61]: Elastic『Controlling access at the document and field level』Elastic Docs（current）. https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level （参照箇所: 冒頭 Note, Document level security limitations と Note, Field level security limitations、確認日: 2026-10-03）
[^62]: Microsoft『Create, update, and delete items added by your Microsoft Graph connector』Microsoft Learn. https://learn.microsoft.com/en-us/graph/connecting-external-content-manage-items （参照箇所: Access control list、確認日: 2026-10-03）
[^63]: Google Cloud『Introduction to BigQuery row-level security』最終更新 2026-09-30. https://cloud.google.com/bigquery/docs/row-level-security-intro （参照箇所: Comparison of authorized views, row-level security, and separate tables, side-channel の記述, Limitations、確認日: 2026-10-03）
[^64]: Google Cloud『Use row-level security with other BigQuery features』最終更新 2026-09-30. https://cloud.google.com/bigquery/docs/using-row-level-security-with-features （参照箇所: Copy jobs, Extract jobs, Time travel、確認日: 2026-10-03）
[^65]: Google Cloud『Introduction to column-level access control』最終更新 2026-09-30. https://cloud.google.com/bigquery/docs/column-level-security-intro （参照箇所: 概要, Roles used with column-level access control, Query tables、確認日: 2026-10-03）
[^66]: Snowflake『Understanding row access policies』Snowflake Documentation. https://docs.snowflake.com/en/user-guide/security-row-intro （参照箇所: Enterprise Edition Feature, Row access policies at query runtime, Limitations, data sharing の記述、確認日: 2026-10-03）
[^67]: Snowflake『Understanding Column-level Security』Snowflake Documentation. https://docs.snowflake.com/en/user-guide/security-column-intro （参照箇所: What is Column-level Security?、確認日: 2026-10-03）
[^68]: OWASP『LLM08:2025 Vector and Embedding Weaknesses』OWASP Top 10 for LLM Applications 2025. https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM08_VectorAndEmbeddingWeaknesses.md （参照箇所: Common Examples of Risks 1・2, Prevention and Mitigation Strategies 1, Example Attack Scenarios、確認日: 2026-10-03）
[^69]: NIST『AI 100-2 E2025 Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations』2025-03. https://doi.org/10.6028/NIST.AI.100-2e2025 （参照箇所: §2.1.2 p.7, §3.3.2 p.46、確認日: 2026-10-03）
[^70]: NIST『SP 800-53B, Control Baselines for Information Systems and Organizations』出版物ページ, 2020-09（includes updates as of 2020-12-10; Release 5.2.0: 2025-08-27）. https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final （参照箇所: Date Published, Planning Note (08/27/2025)「includes no changes to the baselines」、確認日: 2026-10-03。照合時に追加）
[^71]: PostgreSQL Global Development Group『CVE-2016-2193: Plan cache might use wrong role context for RLS policy』2016-03-31. https://www.postgresql.org/support/security/CVE-2016-2193/ （参照箇所: 表題, Version Information（9.5.2, 2016-03-31）、確認日: 2026-10-03。照合時に追加）
