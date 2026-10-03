# RS-07 認可エンジンと整合性（一次資料調査ノート）

> 文書ID: RS-07 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-081, R-086, R-089, R-090, R-091, R-093, R-097, R-098, R-099, R-103, R-127, R-142〜R-152, R-157, R-171, R-175, R-177, R-190, R-191, R-204, R-205, R-208
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md（§2.6〜§2.14）, traceability/seed/seed-02-cto-technical.md（§5, §11）, traceability/seed/seed-03-redteam-decision.md（§7-6, §7-14）

本書は AI エージェント（Claude）が 2026-10-03 に Web 上の原典を取得して調査・起草した。種資料（seed-01〜03）は手掛かりとしてのみ使い、本文の根拠には原典だけを引いた。原典を取得できなかった事項は §6 に「未確認」として列挙し、結論には使っていない。2026-10-03 に、作成者とは別の AI エージェント（Claude）が全 64 脚注の原典を取得して照合し、部分支持だった 11 脚注に関わる記述を修正した（版 0.2）。脚注ごとの判定と修正内容は research/verification/RS-07-verification.md に記録した。人間のレビュアによる照合はまだ実施していない。

凡例: 主張タグは CONVENTIONS §3 に従う。Zanzibar 論文・Cedar 論文のうち設計の記述は、当該ベンダーが公表した一次記述として `[V]` を付け、論文中の測定値には `[M]`（出典と測定条件を併記）を付けた。前提台帳（01_governance/assumptions-register.md）は未作成で A-ID が採番されていない。そのため規模前提（CONVENTIONS §7 の暫定値）に依存する推論は `[D]` を付け、本文中に「仮定依存（CONVENTIONS §7、A-ID 未採番）」と明記した。

---

## 1. 調査の問い

種資料由来の問い（seed-02 §5・§11-4、seed-01 R-142〜R-149、seed-03 §7-6・§7-14）:

1. 各エンジンは整合性をどこまで保証するか。new enemy 問題（剥奪後の閲覧、古い ACL の新内容への適用）にどう対処するか（seed-02 5-1、R-142、R-144）。
2. 剥奪から拒否までの最大時間を決める要素は何か。キャッシュ・レプリカ・量子化の既定値はいくつか（R-143、R-146）。
3. コンテンツ更新と relation 更新は、どの方式で因果的に結合できるか（R-145）。
4. モデル ID の固定、新旧モデルの shadow check、段階展開を公式にどう支援しているか（R-147〜R-149）。
5. 一覧・検索フィルタ（ListObjects / LookupResources / Expand / search API）の方式、上限、規模による限界はどうなっているか（seed-02 5-2、seed-03 §7-6）。
6. ReBAC と ABAC はどう合成されるか。deny の意味論、条件評価の上限、自動解析の可能性はどうか（seed-02 5-3、R-098、R-205）。
7. プロジェクトは健全か。CNCF 成熟度、メンテナ体制、事業終了・買収、ライセンスはどうか（seed-02 5-4、R-208）。
8. OpenID AuthZEN Authorization API 1.0 は Final か。その API 範囲で PEP–PDP のエンジン差替えは可能か（seed-02 5-5、seed-03 §7-14）。
9. 出口戦略として、tuple・policy の export、DSL の変換、dual-run は可能か（seed-02 5-6、R-090、R-091、R-103）。
10. managed（AVP）と self-host の違いは何か。テナント別 policy store の指針、料金、クォータはどうか（seed-02 5-7、R-151、R-152）。
11. 公開事例（Zanzibar、Airbnb Himeji、Carta）の数値とその前提は何か。自社規模（100万人・1万テナント）の要件とはどこまで比較できるか（seed-02 11-4）。

本ストリームで追加した問い:

12. AuthZEN は整合性トークンやモデル ID を標準の範囲内で運べるか。運べない場合、どの部分を標準外の自社 profile にする必要があるか。
13. 各エンジンの深さ・幅・書込み件数などの上限は何か（R-093「最大深度」）。
14. decision log（OPA）はどの条件で欠落するか（R-127 との接続）。
15. Cedar の「error になった policy は skip する」規則は、forbid ガードレールとどう干渉するか。
16. 公式文書の間で整合性の記述が食い違う箇所はあるか（PoC で確かめるべき論点の抽出）。

---

## 2. 結論サマリ（設計への含意）

1. new enemy 問題への対処はエンジンごとに大きく異なるため、R-142 の「採用 engine の実保証範囲」はエンジンごとに分けて書く必要がある [D]（RS-07#76）。Zanzibar と SpiceDB は、書込み・内容変更の時点で発行する不透明トークン（zookie / ZedToken）を内容と一緒に保存し、後続の判定に「少なくともこれより新しい」として渡す方式を公開している [V][^2][^21]。OpenFGA は同等のトークンを「検討中」とし、現時点で提供するのは HIGHER_CONSISTENCY（キャッシュを回避し primary DB を読む）だけである [V][^9][^10]。AVP は「数秒」で収束する結果整合を明記している [V][^44]。OPA の bundle も結果整合である [V][^48]。
2. 調べた公式文書には、剥奪から拒否までの上限を保証する記述が一つもない [D]。手掛かりは構成の既定値だけである（OpenFGA の Check キャッシュ TTL 10s、SpiceDB の revision 量子化 5s、AVP の「数秒」、OPA の bundle ポーリング 60〜120s）[V][^11][^26][^44][^50]。したがって R-143・R-191 の上限値は、操作階層ごとに PoC で実測して決めるしかない [D]。
3. SpiceDB の公式文書は、CockroachDB 上では fully_consistent でも read-after-write を保証しない（ノード間の時計差、既定 500ms）と明記している [V][^21]。一方、同じ公式文書群の「Read-After-Write Consistency」ページは、比較表で fully_consistent を datastore の条件なしに "Guaranteed read-after-write" と書いている [V][^22]。文書の間で前提が揃っていない [D]。datastore の選択と consistency mode は組にして ADR-010 で決め、CockroachDB の場合は PoC で確認する必要がある [D]。
4. OpenFGA の文書は「キャッシュ無効なら consistency mode に関わらず strong consistency」と書いている [V][^9]。一方で、secondary（非同期レプリカ）を構成すると既定の読取はレプリカに向かい、read-after-write 不整合があり得るとも書いている [V][^10]。文書の間で前提が揃っていないので、構成別に PoC で確認する [D]。
5. 一覧・検索フィルタは、どのエンジンでも規模によって方式を変える前提になっている [D]。OpenFGA の ListObjects は既定で 3 秒・1,000 件で打ち切る [V][^14]。公式文書は、利用者がアクセスし得る対象が少ない（約 1,000 件）うちは ListObjects で ID 一覧を取る方式を推奨している。件数がそれより多く、かつアクセスできる割合が低い場合は、変更 API から作ったローカル索引に後段の Check を組み合わせる方式を推奨している [V][^15]。SpiceDB は、LookupResources が 1 万件を超えると重いとし、CheckBulk による後段フィルタを勧め、その先は商用の Materialize を案内している [V][^25][^27]。Zanzibar では、Expand と Watch を使って利用側が検索索引を作る [V][^3]。設計では資源型ごとに方式を選び、索引の陳腐化を Check で後段補正する [D]。
6. AuthZEN Authorization API 1.0 は、2026-01-12 に OpenID Final Specification として承認が告知された [N][^55]。ただし PDP の状態管理は仕様の範囲外である [N][^52]。仕様中に整合性トークンを定義する記述は見当たらない [D]（RS-07#61）。search API のページングは原子的なスナップショットを保証しない [N][^53]。そのため標準で担保できる差替え可能性は evaluation / evaluations の層に限られる [D]。整合性トークンとモデル ID は、標準外の自社 profile として定義する必要がある [D]。
7. AuthZEN の実装状況はエンジンごとにばらつく。OpenFGA の AuthZEN エンドポイントは experimental で、ページングに対応していない [V][^17]。OpenFGA は、モデル ID の固定を標準外の独自ヘッダ（`Openfga-Authorization-Model-Id`）で行う。また、クライアントが指定した要求 ID を応答に返さない [V][^17]。後者は AuthZEN 1.0 §10.1.3 の MUST（PEP が指定した要求 ID を PDP が応答に含める）と一致しない [D]（RS-07#66）。Topaz は 2025-02-28 にネイティブ対応を告知しているが、これは Final 承認前の draft 02/03 の時点の告知である [V][^62]。Final 版（1.0）への準拠は未確認である（§6）。SpiceDB の公式サポートは公式文書で確認できなかった（§6、未確認）。AuthZEN 準拠をエンジン選定の必須条件にすると、候補が絞られるか、adapter を自作することになる [D]。
8. ReBAC と ABAC の合成方式も分かれる。OpenFGA の conditions と SpiceDB の caveats は、関係に CEL の条件を付ける [V][^16][^24]。Cedar は RBAC・ABAC・ReBAC を一つの言語で表すが、entity データは呼出側が渡す [V][^30][^34]。Cedar は評価が error になった policy を skip する [V][^34]。そのため entity が欠けると、forbid によるガードレールが働かなくなり得る [D]。schema 検証、entity の完全性検査、応答 errors の監視を必須にする [D]。
9. Cedar は、主要な性質の Lean による証明と、SMT 符号化の健全性・完全性（紙上の証明）を論文で示している [V][^31][^32]。policy の等価性・包含の自動解析（R-098）については、調べた候補の中で Cedar の根拠が最も厚い [D]。ただし論文の時点で、Lean による符号化の証明は「進行中」である [V][^32]。
10. AVP の既定クォータは、IsAuthorized が policy store あたり 200 RPS（引上げ可）、推移的な親が 100（引上げ不可）、policy store 数が 30,000/リージョン/アカウント（引上げ可）である [V][^40]。単価は単発の認可要求 1 件あたり $0.000005 である [V][^39]。AWS Prescriptive Guidance は、テナント隔離の観点でテナント別 policy store を best practice と記している [V][^43]。一方 Verified Permissions のユーザーガイドは、テナント固有の policy が不要で identity source が 1 つなら共有 store が最も効果的になりやすい、としている [V][^41]。テナント別にする場合、global policy の更新は全 store へ複製する必要がある [V][^41]。1 万テナントは既定の store 上限に収まるが、最大テナントの RPS と深いネストは個別に確認が要る（仮定依存（CONVENTIONS §7、A-ID 未採番））[D]。
11. プロジェクト健全性の状況は次のとおりである。OPA の創設メンテナは Apple に移籍したが、プロジェクトは CNCF Graduated のまま、ガバナンスとライセンスは変わらないと公式に表明している [V][^46]。OpenFGA は 2025-10-28 に CNCF Incubating に移った [V][^19]。Cedar は 2025-10-08 に CNCF Sandbox として受理された [V][^38]。Aserto は SaaS を 2025-05-31 までに終了すると告知した [V][^58]。Permify は FusionAuth に買収され、リポジトリのライセンスは AGPL-3.0 である [V][^59][^60]。単一企業への依存度を、ADR-018（出口戦略）の評価軸に入れる [D]。
12. 公開されている性能値は測定条件が揃っておらず、自社目標の根拠にはならない [D]。Zanzibar 論文は「p95 < 10ms」を Check 全体の値として述べている [M][^1]。Table 2 の Check の行では、p95 が 10ms を下回るのは Safe 要求（zookie が 10 秒より古い要求）の 9.46ms で、Recent 要求の Check は p95 60.0ms である [M][^7]。Safe 要求は Recent の約 2 桁多いので、全体の p95 は Safe の値に支配されていると読める [D]。Himeji の p99 12ms は、キャッシュ命中率約 98% を目標とする構成での値である [M][^63]。Cedar 論文の倍率は、最適化されていない OpenFGA の in-memory datastore との比較である [M][^33]。性能は自社のモデルとデータ分布で PoC 実測する [D]。
13. 関係データやポリシーを export する手段は、各エンジンにある（OpenFGA の `fga store export`、SpiceDB の ExportBulkRelationships、AVP の GetPolicy/ListPolicies、OPA の bundle）[V][^18][^28][^39][^48]。ただし `fga store export` が書き出す tuple は既定で 100 件までなので、全件 export に使えるかは未確認である [V][^18]（§6）。しかしモデル DSL をエンジン間でつなぐ標準はなく、AuthZEN も policy language を範囲外としている [N][^52]。出口戦略では、自社の正規モデル定義から各エンジンの DSL を生成し、dual-run で差分を検証する方式を前提にする [D]。

---

## 3. 調査結果

### 3.1 Google Zanzibar（USENIX ATC 2019）

- **RS-07#1** Zanzibar は 2 兆を超える ACL（relation tuple）を保存し、毎秒数百万件の認可要求を処理すると論文は述べている [M][^1]。§4 では、1,500 を超える namespace、2 兆超の tuple（約 100TB）、30 を超える拠点への完全複製、10,000 台超のサーバ、クライアント要求 1,000 万 QPS 超を挙げている [M][^7]。測定条件: Google 社内の本番。2018 年 12 月の 7 日間の標本と明記されているのは API 別のピーク QPS（Check 約 4.2M、Read 8.2M、Expand 760K、Write 25K）だけで、それ以外の値は論文執筆時点の値として述べられ、測定期間の記載はない [M][^7]。
- **RS-07#2** 論文は「p95 レイテンシ 10ms 未満、可用性 99.999% 超を 3 年間維持」と主張している [M][^1]。ここでいう可用性は、「qualified」な RPC を Safe 要求なら 5 秒、Recent 要求なら 15 秒以内に応答できた割合である。ライブトラフィックではなく、標本化した要求をプローバで再生して測り、90 日窓でクラスタ平均したものである [M][^7]。原文: "we cannot measure availability directly with live traffic"。
- **RS-07#3** Safe 要求は zookie が 10 秒より古く、大半は同一リージョン内で処理される。Recent 要求は zookie が 10 秒より新しく、しばしばリージョン間の往復が要る [V][^7]。Table 2 の Check の値は、Safe が p50 3.0ms / p95 9.46ms / p99 15.0ms、Recent が p50 2.86ms / p95 60.0ms / p99 76.3ms である。Write は p50 127.0ms / p95 233.0ms / p99 401.0ms である [M][^7]。測定条件: 2018 年 12 月の 7 日間、サーバ側で測った平均値。Safe 要求の量は Recent の約 2 桁多い [M][^7]。
- **RS-07#4** 論文は new enemy 問題を、ACL 更新の順序を無視した場合（例 A: フォルダから外した後に新文書を移す）と、古い ACL を新しい内容に適用した場合（例 B）として定義している。その防止には external consistency と、bounded staleness を伴う snapshot read の 2 性質が要るとしている [V][^2]。原文: "Zanzibar must provide two key consistency properties: external consistency and snapshot reads with bounded staleness."
- **RS-07#5** zookie プロトコルでは、内容を保存する直前に zookie なしの content-change check を最新スナップショットで評価する [V][^2][^3]。返された zookie を、クライアントが内容と一緒に自社ストレージへ原子的に書き込む [V][^2][^3]。後続の check にはその zookie を渡し、「少なくともそれと同じだけ新しい」スナップショットで評価させる [V][^2][^3]。content-change check は内容変更と同じトランザクションで評価する必要はない [V][^2]。
- **RS-07#6** external consistency は Spanner の TrueTime がタイムスタンプを付けることで成り立っている [V][^2]。各 check は単一のスナップショット時刻で評価される [V][^2]。論文は、Zanzibar が使うのは Google 社内の Spanner で、Cloud Spanner ではないと明記している [V][^7]。原文: "Zanzibar uses an instance of Spanner that runs internally to Google, not an instance of Cloud Spanner."
- **RS-07#7** zookie が付いていない要求には、out-of-zone 読取の発生確率から統計的に決めた「既定の staleness」が使われる [V][^4]。論文はこれを「純粋に性能の最適化」とし、zookie が付いていれば必ず尊重すると述べている [V][^4]。namespace 設定にも、要求ごとに単一のスナップショット時刻が使われる [V][^4]。
- **RS-07#8** 深いネストや幅の広いグループには、一部の namespace に限って Leopard 索引が使われる [V][^5]。Leopard は、オフラインで定期的に作る索引と、Watch API で更新を取り込む増分層から成る [V][^5]。1 件の tuple 変更が、数万件の Leopard 索引イベントになり得る [V][^5]。Leopard の処理量は中央値 1.56M QPS で、応答時間は中央値 150µs 未満、p99 1ms 未満である [M][^7]。
- **RS-07#9** 論文には、主体がアクセスできる対象の一覧を返す API（ListObjects 型）は記述されていない [D]（§2.4 の API は Read / Write / Watch / Check / Expand）[V][^3]。Expand は有効な userset 木を返す。論文は、これがクライアントにとって「アクセス制御付きコンテンツの効率的な検索索引を作るのに不可欠」だと述べている [V][^3]。二次索引の維持には Watch API を使う [V][^3]。
- **RS-07#10** ホットスポットへの対策として、論文は分散キャッシュ、lock table、評価時刻の 1 秒または 10 秒単位への丸め（zookie 制約の範囲内）を挙げている [V][^6]。性能隔離として、クライアントごとの CPU 上限、(object, client) ごとの同時読取数の上限、クライアント別の lock table キーを挙げている [V][^6]。論文はホットスポット対策を「低レイテンシと高可用性を追求するうえで最も重要な最前線」と位置付けている [V][^6]。
- **RS-07#11** 教訓として論文は、鮮度要件は「多くの場合緩いが常にではない」と述べ、tail latency の削減には hedging が、誤動作するクライアントへの対策には性能隔離が欠かせないと挙げている [V][^8]。関連研究の節では、Facebook の TAO が結果整合と best-effort の read-after-write であるのに対し、Zanzibar は external consistency と bounded staleness によって new enemy を防ぐと対比している [V][^8]。
- **RS-07#12** 本稿で読んだ範囲（§1〜§2.4、§3.2、§4、§5）の Zanzibar の表現手段は、relation tuple と userset rewrite（union / intersection / exclusion）だけである [V][^3]。属性条件（ABAC）を評価する仕組みの記述は確認できなかった [D]。

### 3.2 OpenFGA

- **RS-07#13** OpenFGA のクエリ（Read、Check、Expand、ListObjects、ListUsers）は、consistency に MINIMIZE_LATENCY（既定、可能ならキャッシュから応答）と HIGHER_CONSISTENCY（キャッシュを使わず DB を直接読む）のどちらかを指定できる [V][^9]。原文: "If you write a tuple and you immediately make a Check on a relation affected by that tuple using MINIMIZE_LATENCY, the tuple change might not be taken in consideration"。
- **RS-07#14** OpenFGA の文書は、Zanzibar の zookie に相当する機能を「将来のリリースで検討中」としている [V][^9]。原文: "OpenFGA is considering a similar feature in future releases."。つまり確認日時点で、内容の版と結び付けて使う整合性トークンは公式機能として提供されていない [D]。
- **RS-07#15** キャッシュは既定で無効である。文書は「キャッシュ無効時は consistency mode に関わらず全クエリが strong consistency」と書いている [V][^9]。設定リファレンス（v1.20.0 の表示）では、Check と ListObjects のキャッシュ TTL の既定は 10s である。書込みを検知してキャッシュを無効化する cache controller は既定で無効で、その TTL の既定も 10s である [V][^11]。現在、キャッシュは Check で使われ、ListObjects では「部分的に」使われる [V][^9]。
- **RS-07#16** PostgreSQL では `--datastore-secondary-uri` で読取レプリカを指定できる [V][^10]。HIGHER_CONSISTENCY の読取は primary に自動で回され、通常の読取はレプリカに向かう [V][^10]。非同期複製は "potential for read-after-write inconsistencies (replica lag)" があると明記されている [V][^10]。そのため RS-07#15 の「strong consistency」は、非同期レプリカを使わない構成でしか成り立たないと読める [D]。
- **RS-07#17** 本番運用の推奨として、文書は Check の in-memory キャッシュを有効にするよう勧めている [V][^12]。同時に、それが "will increase the staleness of OpenFGA's responses" と書いている [V][^12]。DB は OpenFGA 専用にし、同じデータセンターに置くことを推奨している [V][^12]。
- **RS-07#18** 認可モデルは不変で、書き込むたびに新しい版（ULID の ID）が作られる [V][^13]。Check・ListObjects・Write などに `authorization_model_id` を渡すことを "strongly recommend passing, especially in production" としている [V][^13]。ID を渡さなければ、最後に作られたモデルが使われる [V][^13]。新旧モデルの shadow check と段階的な rollout の考え方も記述されている [V][^13]（R-147〜R-149）。
- **RS-07#19** 主な上限の既定値は次のとおりである。解決の深さ `resolveNodeLimit` は 25、1 回の Write トランザクションの tuple 数 `maxTuplesPerWrite` は 100、モデルあたりの型定義数は 100 である [V][^11]。datastore は memory、postgres、mysql、sqlite から選ぶ。memory は再起動でデータが失われる [V][^10]。
- **RS-07#20** ListObjects は、制限時間（`listObjectsDeadline`、既定 3s）の中で見つかった結果を、最大件数（`listObjectsMaxResults`、既定 1,000）まで返す [V][^14]。ストリーミング版もある [V][^14]。したがって既定構成のままでは、一覧が欠ける（件数が過少になる）ことがあり得る [D]。
- **RS-07#21** 公式文書は検索フィルタの方式を 3 つ挙げている [V][^15]。(1) 検索してから Check する。(2) changes エンドポイントからローカル索引を作り、検索してから Check する。(3) ListObjects で ID 一覧を取ってから検索する。方式 (3) が勧められるのは、利用者がアクセスし得る対象が少なく（約 1,000）、かつ全体に占める割合も低い場合である（要約表では「3 または 2」）。件数が多く、そのうちアクセスできる割合が低い場合は方式 (2) が勧められる [V][^15]。方式 (2) では、索引にまだ反映されていない剥奪を落とすため、最後に Check を呼ぶとしている [V][^15]。
- **RS-07#22** conditions は Google CEL で書き、「一部の ABAC policy を表せる」機能と位置付けられている [V][^16]。tuple に保存できる条件 context は 32KB までである。要求時の context には個別の上限がなく、サーバ全体の要求サイズ上限 512KB（「現時点」）がかかる [V][^16]。CEL の評価コストは既定で最大 100 に制限される [V][^16]。保存済みの context は、要求時の context より優先される [V][^16]。
- **RS-07#23** AuthZEN エンドポイントは experimental で、`--experimentals=authzen` を指定して明示的に有効にする必要がある [V][^17]。原文: "The API surface may change in future releases."。store_id はパスに含まれる（`/stores/{store_id}/access/v1/…`）[V][^17]。evaluation は Check、evaluations は BatchCheck、resource search は ListObjects、subject search は ListUsers に対応する [V][^17]。ページングは「サポートしない」と明記され、contextual tuple も AuthZEN 経由では使えない [V][^17]。モデル ID の固定は、AuthZEN に標準の手段がないため、OpenFGA 独自の要求ヘッダ `Openfga-Authorization-Model-Id` で行う [V][^17]。応答には X-Request-ID ヘッダを付けるが、クライアントが指定した要求 ID は返さない [V][^17]。experimental 機能は「実験以外での有効化は推奨しない」とされている [V][^10]。
- **RS-07#24** CLI の `fga store export` で、store のモデルと tuple を store ファイル形式（YAML）に書き出せる [V][^18]。ただし書き出す tuple の数は `--max-tuples` で決まり、既定は 100 件である [V][^18]。モデル ID を省略すると最新のモデルが書き出される [V][^18]。したがって大規模な store の全件 export に既定値のまま使うことはできない [D]。
- **RS-07#25** OpenFGA は 2022-09-14 に CNCF に受理され、2025-10-28 に Incubating に移った [V][^19]。確認日時点の最新リリースは v1.21.0（2026-09-20）、ライセンスは Apache-2.0 である [V][^20]。

### 3.3 SpiceDB（AuthZed）

- **RS-07#26** consistency は 4 段階ある。`minimize_latency`、`at_least_as_fresh`（ZedToken 以降のデータを使う）、`at_exact_snapshot`、`fully_consistent` である [V][^21]。Write・Delete・Schema 系以外の API は既定で `minimize_latency` になる [V][^21]。原文: "If used exclusively, this can lead to a window of time where the New Enemy Problem can occur."
- **RS-07#27** ZedToken は、文書自身が「Zanzibar の Zookie に相当する」と説明している [V][^21]。CheckPermission、WriteRelationships、DeleteRelationships などが ZedToken を返す [V][^21]。文書は、資源の作成・削除、内容の変更、アクセスの追加・削除のたびに ZedToken を更新し、内容と一緒にアプリ DB へ保存する方式を示している（Postgres では text または varchar(1024)）[V][^21]。
- **RS-07#28** `minimize_latency` で古い snapshot が選ばれる窓は、主に `--datastore-revision-quantization-interval`（既定 5s）で決まる [V][^22][^26]。さらに `--datastore-revision-quantization-max-staleness-percent`（既定 0.1）と follower read の遅延も影響する [V][^22][^26]。`at_exact_snapshot` は GC 窓（`--datastore-gc-window`、既定 24h）を過ぎると Snapshot Expired で失敗し得る [V][^21][^26]。
- **RS-07#29** CockroachDB 上では、`fully_consistent` でも read-after-write は保証されない [V][^21]。SpiceDB が自分で評価 revision を選ぶため、ノード間の時計差（`max_offset`、既定 500ms）の影響を受けるからである [V][^21]。CockroachDB で read-after-write が必要な場合、文書は ZedToken と `at_least_as_fresh` の組合せを指示している [V][^21]。原文: "CockroachDB users: fully_consistent does not guarantee read-after-write consistency on CockroachDB." 一方「Read-After-Write Consistency」ページの比較表は、datastore の条件を付けずに fully_consistent を "Guaranteed read-after-write" としている [V][^22]。公式文書の間の食い違い（問い 16）として PoC で確認する [D]。
- **RS-07#30** CockroachDB の書込み overlap 戦略は既定が `static`（全書込みを重ねて安全を優先）である [V][^23]。`prefix` を使うと、異なる接頭辞（テナント）の書込みを並行できる [V][^23]。`insecure` は "possibly leaving you vulnerable to the New Enemy Problem" と明記されている [V][^23]。
- **RS-07#31** datastore の推奨は次のとおりである [V][^23]。CockroachDB は高スループットまたはマルチリージョンの self-host、Cloud Spanner は Google Cloud 上の self-host、PostgreSQL は単一リージョンの self-host に推奨されている。MySQL は「推奨しない」、memdb は開発・結合試験用とされている。AuthZed のマネージドサービスは CockroachDB に統一されている [V][^23]。
- **RS-07#32** caveats は CEL で書き、関係に名前付きで付ける [V][^24]。必要な context が足りないと、CheckPermission は `PERMISSIONSHIP_CONDITIONAL_PERMISSION` を返し、不足しているフィールドも返す [V][^24]。LookupResources と LookupSubjects も、結果ごとに「権限あり」か「条件付きで権限あり」を返す [V][^24]。要求の caveat context は既定で 4,096 バイトまでである [V][^26]。
- **RS-07#33** LookupResources はカーソルによるページングに対応している [V][^25]。ただし文書は "a heavy request that can cause performance problems when more than 10k results are involved" と書き、CheckBulk による後段フィルタ、それでも足りなければ Materialize の検討を勧めている [V][^25]。LookupSubjects はカーソルに対応していない [V][^25]。LookupResources の 1 要求あたりの上限は既定 1,000 件である [V][^26]。
- **RS-07#34** Materialize は AuthZed のサービスとして説明されている。Accelerated Queries は AuthZed Dedicated の利用者向けに GA、Event Streams は AuthZed Dedicated の利用者向けの早期アクセスである [V][^27]。OSS 版の SpiceDB だけで使えるという記述はない [D]。整合性の意味論（ZedToken との関係）は、取得した記述からは確認できなかった（§6）。
- **RS-07#35** 再帰の深さの上限 `--dispatch-max-depth` は既定 50、WriteRelationships 1 回の更新件数の上限は既定 1,000 である [V][^26]。
- **RS-07#36** ExportBulkRelationships は、「サーバから関係を書き出す最速の経路」で、途中から再開でき、順序はサーバが決める [V][^28]。要求には Consistency を指定できる [V][^28]。
- **RS-07#37** 確認日時点の最新リリースは v1.56.2（2026-09-11）、ライセンスは Apache-2.0 である [V][^29]。

### 3.4 Cedar（言語・検証・論文）

- **RS-07#38** Cedar は、RBAC・ABAC・ReBAC の概念を一つの言語で表すことを目指して設計されている [V][^30]。entity の親子関係は DAG（entity hierarchy）になり、policy は効果（permit / forbid）、スコープ、条件から成る [V][^30]。
- **RS-07#39** 認可判定の規則は 3 つある [V][^34]。既定は拒否（permit が一つも成立しなければ Deny）、成立した forbid は permit に優先する、評価が error になった policy は判定に関与しない（skip）。原文: "if a policy's evaluation returns error, the policy does not factor into the authorization response; it is skipped."。論文によると、forbid の優先、既定拒否、明示許可、sound slicing、validation soundness の各性質が Lean で証明されている [V][^31]。
- **RS-07#40** schema に対する policy 検証が健全なのは、要求が schema に従っている場合に限られる [V][^35]。検証で捕まえられないものとして、64 ビット整数のオーバーフロー、entity の不在、extension 関数に渡す値の誤り（strict mode で一部を防止）が明記されている [V][^35]。原文: "Request validation ... do not confirm the existence of entities."
- **RS-07#41** RS-07#39 と #40 からの推論として、forbid ガードレールが参照する entity や属性が要求に含まれていないと、その forbid は error で skip され得る [D]。その場合、ほかの permit が成立すれば許可になり得る [D]。対策は 4 つある [D]。schema 検証を必須にする、`has` によるガードを書く、entity の完全性を PEP で検査する、応答の errors を監視する（AVP の IsAuthorized は errors を返す: RS-07#50）。
- **RS-07#42** Cedar の symbolic compiler は、型の付いた policy を SMT 項に変換する [V][^32]。その符号化は、等価性・包含など標準的な解析について決定可能・健全・完全であるとされている [V][^32]。ただし論文時点の状態は「紙上で証明済み」で、Lean による証明は "underway, as of this writing" と記されている [V][^32]。
- **RS-07#43** 論文の性能評価では、中央値で見て Cedar は OpenFGA の 28.7〜35.2 倍、Rego の 42.8〜80.8 倍速かった [M][^33]。測定条件: EC2 m5.4xlarge、Cedar 3.0.1 / Rego 0.61.0 / OpenFGA commit bbb4a07。全ての policy とデータをメモリに置き、データ読込・パース・HTTP 処理を除いた `is_authorized()` の実行時間を 100,000 要求で測った [M][^33]。OpenFGA には in-memory datastore を使っており、論文の脚注は、これが「主にデバッグ用で最適化されていない」と OpenFGA 開発者から聞いたことを記している [M][^33]。
- **RS-07#44** 文書は、要求に関係する policy と entity データを決めるのはアプリケーションの責任だと述べている。原文: "your application needs to determine which policies and entity data are relevant" [V][^34]。つまり ReBAC の祖先関係を Cedar に評価させるには、呼出側が entity の階層をその都度用意する必要がある [D]。
- **RS-07#45** Rust crate の type-aware partial evaluation（`tpe`、RFC 95）と batched evaluation は v4.6.0（2025-10-06）で導入された。CHANGELOG は batched evaluation を「大規模な entity データベースに対する権限の問合せ」を可能にするものと説明している [V][^37]。最新の v4.13.0（2026-09-15）でも `tpe` は experimental feature のままで、従来の `partial-eval` も experimental feature である [V][^37]。「この主体はどの資源に対して許可されるか」の一覧に本番で使えるかは、experimental であることを前提に PoC で確かめる必要がある [D]。
- **RS-07#46** Cedar 言語の最新版は 4.5（2026-04-23、SDK 4.10.0〜4.13.0）である [V][^36]。Cedar は 2025-10-08 に CNCF Sandbox として受理された [V][^38]。論文の正式版は PACMPL Vol.8 OOPSLA1（DOI 10.1145/3649835、2024-04-29）である [V][^30]。

### 3.5 Amazon Verified Permissions（AVP）

- **RS-07#47** 単価は、単発の認可要求（IsAuthorized / IsAuthorizedWithToken）が 1 件 $0.000005 である [V][^39]。batch は 1 呼出しあたりの段階料金で、月 4,000 万件までが $0.00015、続く 6,000 万件が $0.000075、1 億件超が $0.00004 である [V][^39]。policy 管理要求は 1 件 $0.00004 である [V][^39]。価格はリージョン共通と記載されている [V][^39]。
- **RS-07#48** 主な既定クォータは次のとおりである [V][^40]。policy store 数は 30,000/リージョン/アカウント（引上げ可）。IsAuthorized は policy store あたり 200 RPS（引上げ可）、BatchIsAuthorized は 30 RPS（引上げ可）。推移的な親は principal・action・resource それぞれ 100（引上げ不可）。認可要求のサイズは 1MB（引上げ不可）。schema のサイズは 100,000 バイト。1 資源を参照する policy の合計は 200,000 バイト。identity source は policy store あたり 1（引上げ不可）。
- **RS-07#49** API リファレンスは、Verified Permissions が結果整合で、新規・変更した要素が他の操作から見えるまで「数秒かかり得る」と明記している [V][^44]。原文: "It can take a few seconds for a new or changed element to propagate through the service"。CreatePolicy の時点で schema 検証が行われ、通らない policy は保存されない [V][^44]。
- **RS-07#50** IsAuthorized では、評価に使う principal と resource の entity（属性・親）を要求の `entities` に含める [V][^45]。応答は decision（ALLOW / DENY）、determiningPolicies、errors である [V][^45]。errors には、policy が slice にない entity や属性を参照した場合などが含まれる [V][^45]。
- **RS-07#51** ユーザーガイドは、共有 policy store とテナント別 policy store を 6 つの観点で比べている [V][^41]。テナント別では、隔離が既定、クォータもテナントごと、off-boarding は store を消すだけで済む。一方、global policy は各 store に複製する必要があり、労力は "High" とされている。文書は "Neither strategy will have a large impact on your AWS bill." とも書いている [V][^41]。なお同じ文書の中で、共有 store の off-boarding の労力が表では "High"、本文では「より少ない」と書かれていて、記述が一致しない [V][^41]。
- **RS-07#52** AWS Prescriptive Guidance は "Using the Per Tenant Policy Store design pattern is a best practice for maintaining tenant isolation" と記している [V][^43]。また、テナント隔離（データの越境防止）と認可（ユーザーにテナントへのアクセス権があるか）を区別している [V][^42]。
- **RS-07#53** 1 万テナントをテナント別 store にしても、既定の 30,000/リージョン/アカウントに収まる [D]。ただし IsAuthorized は store あたり既定 200 RPS なので、最大テナント（約 10 万ユーザー）の同時利用率によっては引上げ申請が必要になる [D]（仮定依存（CONVENTIONS §7、A-ID 未採番））。推移的な親 100 は引き上げられないため、深いフォルダ階層や多段のグループネストの上限になる [D]。global ガードレール policy を 1 万 store に配ることになるので、R-149 / R-154 の段階展開と緊急 freeze を store 単位で設計する必要がある [D]。なお CreatePolicyStore はアカウント・リージョンあたり 1 RPS（引上げ不可）、CreatePolicy は store あたり 10 RPS（引上げ可）である [V][^40]。1 万 store の一括作成（DR での再構築を含む）には少なくとも約 2.8 時間かかる計算になる [D]。
- **RS-07#54** 費用の試算例: 単発 IsAuthorized を平均 1,000 RPS で 30 日続けると 2.592×10⁹ 件、$12,960/月 になる [D]（単価は RS-07#47、負荷は仮定。自社の実負荷は未測定）。平均 10,000 RPS なら $129,600/月 になる [D]。

### 3.6 Open Policy Agent（OPA）

- **RS-07#55** bundle を遠隔サーバから取得すると、OPA は「結果整合的に」policy とデータを最新に保つ [V][^48]。原文: "in an eventually consistent manner"。ポーリング間隔の既定は最小 60 秒・最大 120 秒で [V][^50]、long polling も使える [V][^48]。`persist: true` にすると、bundle サーバに届かないときも最後に有効化した bundle で起動できる [V][^48]。署名（`.signatures.json`）の検証も設定できる [V][^48]。
- **RS-07#56** decision log には decision_id、input、result、bundle のメタ情報などが記録される [V][^49]。mask 規則（op は `remove` / `upsert`。除去したパスはログの `erased` に記録される）と drop 規則で記録を絞れる [V][^49]。バッファの上限（イベント数またはバイト数）を超えると古いイベントが捨てられ、`max_decisions_per_second` を超えるとイベントが捨てられる [V][^50]。既定のバッファ種別は `size` で、バイト上限は既定で無制限、`max_decisions_per_second` には既定値がない [V][^50]。つまり欠落は、上限やレート制限を設定したときに起きる [D]。上限を設定しなければ、アップロード先の停止中はバッファが増え続ける [D]。アップロード間隔の既定は最小 300 秒・最大 600 秒である [V][^50]。原文: "OPA will drop old events from the log if this limit is exceeded."
- **RS-07#57** OPA の創設者と Styra のチームの多くは 2025-08-20 に Apple に移った [V][^46]。公式ブログは「CNCF graduated のまま、ガバナンスとライセンスに変更はない」、メンテナ一覧も所属が変わるだけと表明している [V][^46]。Styra GitHub 上の EOPA（Styra の商用ディストリビューション）、OPA Control Plane、SDK 群、Regal については、CNCF の OPA GitHub organization に含めるためのコミュニティ手続きを開始したと告知された [V][^46]。移管の完了は未確認である（§6）。CNCF での経緯は、受理 2018-03-29、Incubating 2019-04-02、Graduated 2021-01-29 である [V][^47]。
- **RS-07#58** 確認日時点の最新リリースは v1.21.1（2026-09-29）、ライセンスは Apache-2.0 である [V][^51]。
- **RS-07#59** OPA 自体は関係グラフの保存も整合性トークンも提供しない [D]（根拠: RS-07#55 のデータ配布モデル）。そのため内容に紐付く ReBAC を OPA だけで実現すると、bundle の周期の分だけデータが古くなる [D]。OPA は限定 ABAC やガードレール向き、関係判定は専用ストア向きという分担が自然である [D]。decision log は欠落し得る設計なので（RS-07#56）、R-127 の「記録率・欠損検知」を満たすには、OPA の外に独立した監査経路が要る [D]。

### 3.7 OpenID AuthZEN Authorization API 1.0

- **RS-07#60** Authorization API 1.0 は、2026-01-12 に OpenID Final Specification として承認が告知された [N][^55]。投票結果は賛成 81・反対 1・棄権 25 である [N][^55]。仕様書の発行日は 2026-01-11、Status は Final である [N][^52]。告知は "not subject to further revision" と述べている [N][^55]。これに先立ち、2024-11-15 に Implementer's Draft が承認されている [N][^57]。
- **RS-07#61** 仕様は PDP の内部を扱わない [N][^52]。原文: "The policy language, architecture, and state management aspects of a PDP are beyond the scope of this specification."。仕様の全文を検索しても、整合性トークン（zookie / ZedToken 相当）や鮮度を指定するパラメータの定義は見当たらない [D]。
- **RS-07#62** 版の扱いとして、後続の改訂は API を "MAY augment" できるが "MUST NOT modify" と規定されている [N][^52]。1.0 のエンドポイントは識別子に v1 を含めることが SHOULD である [N][^52]。
- **RS-07#63** 情報モデルでは、Subject と Resource に type と id が REQUIRED、properties は OPTIONAL である [N][^52]。Decision は真偽値の decision が REQUIRED である [N][^52]。false なら要求は "MUST NOT be permitted to go forward"、true でも context を PEP が理解できなければ PEP は拒否して "MAY" よい [N][^52]。仕様は、多くの認可システムがステートレスで、関係する属性を全て PEP が渡すことを期待している、と述べている [N][^52]。
- **RS-07#64** evaluations（boxcar）では、上位にある subject / action / resource / context が各要素の既定値になる [N][^53]。評価の意味論は `execute_all`（既定）、`deny_on_first_deny`、`permit_on_first_permit` の 3 つである [N][^53]。evaluations があるときは、上位の decision を省略することが RECOMMENDED とされている [N][^53]。
- **RS-07#65** search API は subject / resource / action の 3 種である [N][^53]。search の結果を evaluation にかけると decision は true に "SHOULD" なるが、それは保証されない [N][^53]。search は推移的に（グループ経由で）行うことが RECOMMENDED とされている [N][^53]。PDP がページングに対応するかは "MAY" である [N][^53]。原文: "Pagination does not guarantee an atomic snapshot of the result set. Consequently, if items are added or removed while paginating, results MAY be repeated or omitted between pages." [N][^53]。続きのページを要求するときは、全ての entity とパラメータを最初の要求と同一にすることが MUST である [N][^53]。
- **RS-07#66** PDP のメタデータは `/.well-known/authzen-configuration` で公開する（提供は RECOMMENDED）[N][^54]。返された `policy_decision_point` が取得に使った識別子と一致しなければ、そのデータは "MUST NOT be used" とされ、PDP の mix-up 対策になっている [N][^54]。準拠 PDP は HTTPS JSON binding を MUST で実装する [N][^54]。要求 ID を付けることは MAY で、付ける場合は HTTPS ヘッダ X-Request-ID を使うことが RECOMMENDED である [N][^54]。要求に要求 ID が付いていれば、PDP は応答に要求 ID を含めることが MUST で、PEP が指定した ID と同じ値を含めることも MUST である（応答ヘッダ X-Request-ID の使用は RECOMMENDED）[N][^54]。PEP–PDP 間の通信は保護が MUST、PDP による PEP の認証は SHOULD、OAuth 2.0 への対応は RECOMMENDED、応答への署名は PDP の MAY、DoS 対策（rate limiting など）は SHOULD である [N][^52][^54]。
- **RS-07#67** 同じ WG の COAZ Framework 1.0、COAZ-MCP Binding 1.0、Access Request and Approval Profile 1.0、Profile for Obligations 1.0 は、いずれも Working Group Draft である [N][^56]。
- **RS-07#68** 実装状況: OpenFGA は experimental で、ページングに対応していない（RS-07#23）[V][^17]。また OpenFGA は、クライアントが指定した要求 ID を応答に返さない [V][^17]。これは RS-07#66 の MUST と一致しない [D]。Aserto は 2025-02-28 に、Topaz が v0.32.54 から HTTP・gRPC の両 binding でネイティブ対応したと告知した [V][^62]。この告知は draft 02 / draft 03 を前提にしており、Final 版（2026-01-11）より前のものである [V][^62]。Final 版への準拠は未確認である（§6）。SpiceDB の公式サポートは、公式文書では確認できなかった（§6、未確認）。

### 3.8 プロジェクト健全性（公式発表）

- **RS-07#69** Aserto は 2025-04-27 の公式ブログで、SaaS の control plane を 2025-05-31 までに停止し、営利事業としても畳むと告知した [V][^58]。OSS の Topaz は、メンテナが引き続き支援する（商用支援もあり得る）としている [V][^58]。Topaz の最新リリースは v0.33.22（2026-09-28）である [V][^61]。
- **RS-07#70** FusionAuth は 2025-11-20 に Permify の買収を発表し、OSS コミュニティを維持・拡大すると表明した [V][^59]。Permify のリポジトリのライセンスは AGPL-3.0、最新リリースは v1.7.4（2026-09-10）である [V][^60]。
- **RS-07#71** CNCF での成熟度は、OPA が Graduated（2021-01-29）、OpenFGA が Incubating（2025-10-28）、Cedar が Sandbox（2025-10-08）である [V][^47][^19][^38]。
- **RS-07#72** SpiceDB（AuthZed）、Topaz（Aserto の事業終了後はメンテナ有志）、Permify（FusionAuth）は、CNCF の成熟度という外部ガバナンスの指標を持たない [D]（CNCF 所属の有無については §6 の留保を参照）。R-208 の「特定製品・少数専門家への過度依存の回避」の観点から、ADR-018 の評価軸に「主たる開発企業の継続性」と「ライセンスの義務（AGPL の網羅範囲は法務確認が必要）」を加える [D]。

### 3.9 公開されている大規模認可システムの事例

- **RS-07#73** Airbnb Himeji（2021-04-20）は Zanzibar をもとにした中央集権型の認可システムである [V][^63]。認可の検査をプレゼンテーション層からデータサービスへ移し、読取時ではなく書込み時に fan-out する方式をとった [V][^63]。構成はオーケストレーション層、シャード化・複製されたキャッシュ層（命中率約 98% を目標）、論理シャード化した DB 層の 3 層である [V][^63]。キャッシュは DB の変更イベントで無効化し、ストレージには Amazon Aurora を使う [V][^63]。スループットは 2020 年 3 月の 0 から 2021 年 3 月に毎秒 85 万 entity に増えた [M][^63]。この 1 年間を通じた値として、可用性 99.9990%、P50 1.8ms / P95 7ms / P99 12ms を挙げている [M][^63]。保存している関係は数百億件である [M][^63]。測定条件（測定点や集計方法の詳細）は記載されていない。zookie に相当する整合性トークンの記述はない [D]。
- **RS-07#74** Carta AuthZ（2021-06-11）は Zanzibar をもとにした内製システムである [V][^64]。独自の二次索引で、Check に 10ms 未満で応答する [M][^64]。索引は非同期のパイプラインで作られ、「利用者は索引の更新が伝播するのを待たなくてよい」とされている [V][^64]。一覧用の Flatten API は、trigram 索引を併用して p95 50ms である [M][^64]。記事の時点では 7 アプリ・約 130 の権限型を扱い、平均負荷は約 15 req/s だった [M][^64]。それ以前に試した JWT に権限を埋め込む方式では、token が 1MB 近くまで膨らんだと述べている [M][^64]。
- **RS-07#75** 両事例とも、キャッシュや非同期索引による鮮度の窓を受け入れている [D]。new enemy への保証範囲は公表されていない [D]。数値の測定条件も Zanzibar とは揃っていない（RS-07#73、#74、#2、#3）。そのため、自社の目標値の根拠にも、ほかの事例との比較にも使えない [D]。

### 3.10 横断比較（設計推論）

**RS-07#76 整合性保証の範囲（new enemy への対処）** [D]

| エンジン | 内容の版と結び付ける整合性トークン | 最新を強制する手段 | 既定の古さの要因（公式の既定値） | 根拠 |
|---|---|---|---|---|
| Zanzibar（論文） | zookie（content-change check で発行し、内容と原子的に保存） | content-change check は最新スナップショットで評価 | 統計的に決める既定 staleness、1s〜10s の時刻丸め | RS-07#5, #7, #10 |
| SpiceDB | ZedToken（`at_least_as_fresh`） | `fully_consistent`（CockroachDB では read-after-write 非保証） | revision 量子化 5s、最大 staleness 10%、follower read 遅延 | RS-07#26〜#29 |
| OpenFGA | 未提供（「検討中」） | HIGHER_CONSISTENCY（キャッシュ回避・primary 読取） | Check キャッシュ TTL 10s（キャッシュは既定無効）、非同期レプリカの遅延 | RS-07#13〜#16 |
| AVP（Cedar） | 未提供 | なし（policy の伝播は「数秒」） | policy の結果整合。entity の鮮度は呼出側のデータ次第 | RS-07#49, #50 |
| OPA | 未提供 | なし（bundle の結果整合） | bundle ポーリング 60〜120s | RS-07#55 |
| AuthZEN 1.0（API） | 定義なし（状態管理は範囲外） | 定義なし | — | RS-07#61 |

**RS-07#77 一覧・検索フィルタの方式** [D]

| 方式 | 提供元 | 既定の上限・注意点 | 根拠 |
|---|---|---|---|
| Expand と Watch による利用側の検索索引 | Zanzibar | 索引の鮮度は利用側の責任 | RS-07#9 |
| ListObjects（3 秒・1,000 件で打ち切り）、changes からのローカル索引と後段 Check | OpenFGA | 約 1,000 件を超え、かつアクセスできる割合が低いと方式 (2) を推奨 | RS-07#20, #21 |
| LookupResources（カーソル）、CheckBulk による後段フィルタ、Materialize（商用） | SpiceDB | 1 万件超で重い、1 要求の既定上限 1,000 | RS-07#33, #34 |
| 部分評価（experimental） | Cedar | 実験機能 | RS-07#45 |
| search API（ページングは MAY、原子性なし） | AuthZEN | 結果の再出現・欠落があり得る | RS-07#65 |
| Flatten API と trigram 索引 | Carta（内製） | p95 50ms（記事時点） | RS-07#74 |

- **RS-07#78** 件数表示やページングを使った情報漏洩（seed-03 §7-6）について、AuthZEN の search は原子的スナップショットを保証しない（RS-07#65）。OpenFGA の ListObjects は時間切れで結果が欠け得る（RS-07#20）。したがって件数（総数）は、権限で絞った後の結果からだけ算出する。総数を返さない、または上限付きの近似で返す設計を DL-17 / ADR-012 に入れる [D]。
- **RS-07#79** ReBAC と ABAC の合成方式は、次の 3 つに分かれる [D]。(a) 関係に CEL 条件を付ける方式（OpenFGA conditions、SpiceDB caveats: RS-07#22、#32）。(b) entity の階層と属性を要求ごとに渡して一つの言語で評価する方式（Cedar / AVP: RS-07#38、#44、#50）。(c) 関係の判定と ABAC ガードレールを別のエンジンに分ける方式（関係ストアと OPA または Cedar: RS-07#59）。R-205 の「typed ReBAC＋限定 ABAC」に最も近いのは (a)、または (c) で ABAC を要求 context（時刻・IP・認証強度）に限定する形である [D]。(b) を選ぶ場合は、RS-07#41 の skip-on-error 対策が前提になる [D]。
- **RS-07#80** 自社の規模（100 万人・1 万テナント・最大テナント約 10 万ユーザー・約 300 サービス）で必要な Check の QPS、ListObjects の件数分布、ネストの深さは、BIA と現行システムのログがないため算出できない [D]（仮定依存（CONVENTIONS §7、A-ID 未採番））。公開値との比較には 4 つの限界がある [D]。(1) 測定点が違う（Zanzibar はサーバ側の平均値: RS-07#3）。(2) 鮮度の区分が違う（Safe と Recent で p95 が約 6 倍違う: RS-07#3）。(3) キャッシュ命中率の前提が違う（Himeji は約 98% が目標: RS-07#73）。(4) マイクロベンチマークの範囲が違う（Cedar 論文はデータ取得を除外: RS-07#43）。そのため R-190 の数値契約は、PoC で「鮮度の要件別」に実測した値から決める [D]。

---

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| OpenID AuthZEN Authorization API | 1.0 | final（OpenID Final Specification） | 発行 2026-01-11、承認告知 2026-01-12 | 2026-10-03 | https://openid.net/specs/authorization-api-1_0.html |
| AuthZEN Authorization API 1.0 Implementer's Draft | draft 01 | Implementer's Draft（Final に置き換えられた） | 承認 2024-11-15 | 2026-10-03 | https://openid.net/authzen-authorization-api-1-0-implementers-draft-approved |
| AuthZEN COAZ Framework | 1.0 | WG draft | 未確認 | 2026-10-03 | https://openid.net/wg/authzen/specifications |
| AuthZEN COAZ-MCP Binding | 1.0 | WG draft | 未確認 | 2026-10-03 | https://openid.net/wg/authzen/specifications |
| AuthZEN Access Request and Approval Profile | 1.0 | WG draft | 未確認 | 2026-10-03 | https://openid.net/wg/authzen/specifications |
| AuthZEN Profile for Obligations | 1.0 | WG draft | 未確認 | 2026-10-03 | https://openid.net/wg/authzen/specifications |
| Zanzibar: Google's Consistent, Global Authorization System | USENIX ATC 2019 Proceedings | 査読付き論文（確定版） | 2019-07（会議 2019-07-10〜12） | 2026-10-03 | https://www.usenix.org/system/files/atc19-pang.pdf |
| Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization | PACMPL Vol.8 OOPSLA1（DOI 10.1145/3649835）／arXiv 2403.04651v2（Extended Version） | 査読付き論文（確定版）／arXiv 拡張版 | 2024-04-29／2024-03-08 | 2026-10-03 | https://doi.org/10.1145/3649835 , https://arxiv.org/abs/2403.04651 |
| Cedar 言語 | 4.5（SDK 4.10.0〜4.13.0） | 現行版 | 2026-04-23 | 2026-10-03 | https://docs.cedarpolicy.com/other/doc-history.html |
| Cedar CLI | cedar-policy-cli-v4.13.0 | release | 2026-09-15 | 2026-10-03 | https://github.com/cedar-policy/cedar/releases |
| Cedar `tpe` / `partial-eval`（Rust crate の feature） | SDK 4.13.0 時点 | experimental feature | `tpe` 導入 2025-10-06（v4.6.0） | 2026-10-03 | https://github.com/cedar-policy/cedar/blob/main/cedar-policy/CHANGELOG.md |
| OpenFGA | v1.21.0 | release（CNCF Incubating） | 2026-09-20 | 2026-10-03 | https://github.com/openfga/openfga/releases/tag/v1.21.0 |
| OpenFGA CLI（`fga`） | v0.8.1 | release（README は main、`store export` の既定 tuple 上限 100） | 2026-09-24 | 2026-10-03 | https://github.com/openfga/cli |
| OpenFGA AuthZEN エンドポイント | 版表記なし（文書の最終更新 2026-09-28） | experimental（`--experimentals=authzen`） | — | 2026-10-03 | https://openfga.dev/docs/interacting/authzen |
| SpiceDB | v1.56.2 | release（CNCF 成熟度の記載なし、§6 参照） | 2026-09-11 | 2026-10-03 | https://github.com/authzed/spicedb/releases/tag/v1.56.2 |
| Open Policy Agent | v1.21.1 | release（CNCF Graduated） | 2026-09-29 | 2026-10-03 | https://github.com/open-policy-agent/opa/releases/tag/v1.21.1 |
| Topaz | v0.33.22 | release | 2026-09-28 | 2026-10-03 | https://github.com/aserto-dev/topaz |
| Topaz の AuthZEN ネイティブ対応 | v0.32.54 以降（告知時点） | 告知は draft 02/03 前提で Final 承認前。Final 版への準拠は未確認 | 2025-02-28 | 2026-10-03 | https://www.aserto.com/blog/authzen-gartner-iam-and-native-support-in-topaz |
| Permify | v1.7.4 | release（AGPL-3.0） | 2026-09-10 | 2026-10-03 | https://github.com/Permify/permify |
| Amazon Verified Permissions 料金・クォータ | 版の表記なし（マネージドサービス） | 公開ページ（随時改定） | 記載なし | 2026-10-03 | https://aws.amazon.com/verified-permissions/pricing/ , https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html |

---

## 5. 設計への含意（ADR・設計文書への入力）と PoC 実測項目

### 5.1 ADR・設計文書への入力

| 入力先 | 入力内容 | 根拠（RS-07#） | 関連 R |
|---|---|---|---|
| ADR-010（認可エンジンとストア、整合性モデル） | エンジンの比較軸に「内容の版と結び付ける整合性トークンの有無」「最新を強制する手段」「datastore との組合せ制約（CockroachDB の注意点、非同期レプリカ）」を加え、RS-07#76 の表を採用案と却下案の根拠にする。トークンを持たないエンジンを選ぶ場合は、高リスク操作に HIGHER_CONSISTENCY 相当を必須にし、その遅延コストを PoC 値で受け入れる判断を明記する | #5, #14, #16, #26〜#31, #76 | R-097, R-142, R-144 |
| ADR-010 / DL-13（製品選定） | R-093 の 13 軸のうち「最大深度」には既定上限（OpenFGA 25、SpiceDB 50、AVP の推移的親 100 固定）を、「価格変動」には AVP 単価を、「LTS・CVE」は未調査（§6）であることを記入する | #19, #35, #47, #48 | R-093 |
| ADR-011（policy 言語と PEP–PDP API） | PEP–PDP API は AuthZEN 1.0 の evaluation / evaluations を基本にする。整合性トークン、モデル ID、テナント（store）指定は、標準外の自社 profile として `context` または `properties` で運ぶ方式を定義し、標準外であることを明記する。search API はページングが原子的でない前提で使う | #61〜#66, #68 | R-098, R-205 |
| ADR-011 / DL-17 | Cedar を採る場合は skip-on-error の対策（schema 検証の必須化、`has` ガード、entity 完全性の検査、errors の監視）を規範にする。forbid ガードレールの負例試験を PoC に入れる | #39〜#41, #50 | R-098, R-168 |
| ADR-012（PEP coverage とストレージ側防御） / DL-17 | 一覧・検索は資源型ごとに 3 方式から選ぶ。索引の陳腐化は Check で後段補正し、総数・件数表示は権限で絞った後の値に限る | #20, #21, #33, #65, #77, #78 | R-171（seed-03 §7-6） |
| ADR-013（cell 分割と fail-mode） / DL-18 | テナント別 store にした場合の global policy の複製手順と、store 単位の canary・freeze を設計する。hot spot と noisy neighbor への対策として、クライアント・オブジェクト単位の同時実行数上限（Zanzibar）、並行度上限（OpenFGA）、テナント単位のクォータ（AVP）を比べる | #10, #17, #19, #48, #51〜#53 | R-150〜R-152, R-157 |
| DL-17（認可整合性・剥奪仕様） / DL-19 | 操作 5 分類ごとに、要求する consistency mode（例: privileged / write は最新強制またはトークン、read-sensitive はトークン、public は既定）を割り当てる。剥奪から拒否までの上限は「構成値＋レプリカ遅延＋伝播」の式で表し、各項を PoC で埋める | #2, #15, #16, #28, #49, #55, #76 | R-081, R-086, R-143, R-146 |
| DL-17 / ADR-016（versioning） | モデル ID の固定（OpenFGA は本番で ID を渡すことを強く推奨）、新旧モデルの shadow check、段階展開を標準手順にする。AuthZEN の「後続版は augment のみ、modify は禁止」を、PEP–PDP 契約の互換性方針の基準にする | #18, #62 | R-147〜R-149, R-109 |
| ADR-014（監査データ） / DL-25 | decision_id と X-Request-ID（AuthZEN）を対応付ける。PDP 実装が PEP 指定の要求 ID を返すかを受入試験に入れる（OpenFGA の AuthZEN 実装は返さない）。OPA の decision log は、バッファ上限やレート制限を設定するとイベントを捨てる設計なので、監査の完全性は独立経路で担保する | #23, #56, #59, #66, #68 | R-127, R-128 |
| ADR-018（出口戦略） / DL-13 / DL-31 | export 手段（fga store export（tuple は既定 100 件まで）、ExportBulkRelationships、AVP の policy API、OPA bundle）を一覧にする。自社の正規モデルから各エンジンの DSL を生成し、dual-run で差分を記録する方式を前提にする。健全性の軸（CNCF 成熟度、主たる開発企業、ライセンス）を加える | #24, #36, #47, #57, #69〜#72 | R-090, R-091, R-103, R-177, R-208 |
| DL-20（数値契約） | R-190 / R-191 の数値は公開値から転用せず、鮮度要件別の PoC 実測値と BIA から決める | #2, #3, #43, #73〜#75, #80 | R-190, R-191, R-196 |

### 5.2 PoC で実測すべきこと（DL-22 への入力。TC-ID は未採番）

1. **stale allow の継続時間**（R-143、R-146）: 剥奪を書き込んでから、全ての PEP が拒否するまでの時間を p50 / p99 / 最大で測る。条件は OpenFGA（MINIMIZE_LATENCY と HIGHER_CONSISTENCY、キャッシュ有無、同期・非同期レプリカ）、SpiceDB（minimize_latency / at_least_as_fresh / fully_consistent、PostgreSQL と CockroachDB）、AVP（policy 変更、entity の鮮度）、OPA（bundle の通常ポーリングと long polling）。
2. **new enemy の再現**（R-171）: Zanzibar §2.2 の例 A（フォルダから外した後に文書を移動）と例 B（剥奪の後に内容を追記）を各エンジンで再現し、トークンの有無と consistency mode ごとに漏洩が起きるかを判定する。
3. **Check の tail latency**（R-190）: 自社のモデル、最大テナント（約 10 万ユーザー）、深いネスト、幅の広いグループで p50 / p99 / p99.9 を測る。「既定の鮮度」と「最新を強制」を分けて測る（Zanzibar の Safe と Recent の区分に相当）。
4. **一覧の性能と完全性**: アクセスできる対象が 1,000、10,000、100,000 件のときの ListObjects / LookupResources の遅延と、打ち切りによる欠落率を測る。索引方式（changes / Watch）との比較と、索引の遅延を Check で補正する方式を検証する。
5. **条件評価**: CEL のコスト上限（OpenFGA の既定 100）に当たる条件、context 不足時の挙動（SpiceDB の CONDITIONAL、OpenFGA の挙動は未確認）、context のサイズ上限を確認する。
6. **Cedar の skip-on-error 負例**: entity や属性が欠けたときに、forbid ガードレールが skip されて許可になる経路を試す。schema 検証と PEP 側の完全性検査で防げるかを確かめる。
7. **AuthZEN adapter による差替え演習**: 同じ PEP を 2 種類の PDP に向け、判定差、整合性トークンの受け渡し（標準外 profile）、search のページング差（OpenFGA 実装はページングなし）、PEP が指定した要求 ID が応答に返るか（AuthZEN §10.1.3 の MUST。OpenFGA 実装は返さない: RS-07#68）を記録する。
8. **export / import の往復と dual-run の差分**（R-175、R-177）: 1 つのエンジンから export したデータを、別のエンジンの DSL に変換して投入し、新旧の判定差（allow が広い方向と deny 方向）を分類して記録する。
9. **AVP のクォータと費用**: store あたりの RPS 上限での throttling の挙動、1 万 store への global policy の複製時間、テナントあたり月額の実測換算。
10. **decision log の欠落**: アップロード先を停止させ、バッファ超過やレート超過のときに失われるイベント数と、検知手段を確認する（R-127）。
11. **hot spot と noisy neighbor**: 人気のあるグループやオブジェクトへの集中、1 テナントの過負荷が他テナントの遅延に及ぼす影響を測る（R-152、R-157）。
12. **モデル変更**: モデル ID の固定、shadow check、旧版への rollback に要する時間を測る（R-147〜R-149、R-156）。

---

## 6. 調査の限界と未確認事項

- **SpiceDB の AuthZEN 対応**: 公式文書では記載を確認できなかった。GitHub Discussions の回答はあるが、Q&A は CONVENTIONS §3 で根拠にできないため使っていない（未確認）。検証時の手掛かりとして、AuthZed の GitHub organization にある移行支援リポジトリ（authzed/authzed-marketplace、OpenFGA から SpiceDB への移行用の参照文書、2026-08-19 更新）が、OpenFGA の AuthZEN 操作を「SpiceDB に対応先なし」と記載していることを確認した。これは製品の公式文書ではないため、結論には使っていない（未確認のまま）。
- **SpiceDB / Permify / Topaz の CNCF 所属**: `https://www.cncf.io/projects/<名称>/` が HTTP 404 を返すことを確認しただけである。CNCF の公式一覧で非所属を確定してはいない（未確認）。各プロジェクトのガバナンス文書（MAINTAINERS、GOVERNANCE）も未確認である。
- **OpenFGA の設定リファレンスの版**: ページは v1.20.0 と表示され、最新リリースの v1.21.0 と一致しない。v1.21.0 で既定値が変わっていないかは未確認である。
- **OpenFGA conditions の context 不足時の挙動**: Check と ListObjects で、必要な context が足りないときの応答（エラーか条件付きか）を公式文書で確認できなかった（未確認）。
- **OpenFGA の strong consistency の記述と非同期レプリカ構成の関係**: 文書の間で前提が揃っていない（RS-07#15、#16）。挙動は PoC で確認する。
- **SpiceDB の fully_consistent と CockroachDB**: Consistency ページと Datastores ページは read-after-write を保証しないとし、Read-After-Write ページの比較表は条件なしで保証するとしている（RS-07#29）。挙動は PoC で確認する。
- **OpenFGA の全件 export**: `fga store export` の tuple 上限は既定 100 件である（RS-07#24）。上限を外す指定方法（0 や大きな値を指定した場合の挙動）は README に記載がなく、未確認である。全件の取得には Read API や changes API を使う方式も比べる必要がある。
- **OPA 関連リポジトリの CNCF 移管**: 2025-08-20 の告知は手続きの開始までである。完了したかは確認していない（未確認）。
- **Cedar 論文の版**: ACM DL の正式版ページは HTTP 403 で取得できなかった。本文は arXiv の拡張版 v2（2024-03-08）を読み、刊行の書誌情報は Crossref のメタデータで確認した。正式版と拡張版で記述や数値が異なる可能性は未確認である。また論文の性能値は Cedar 3.0.1 時点のもので、現行版（言語 4.5）での再測定はしていない。
- **Lean による証明の現状**: 論文時点で符号化の Lean 証明は「進行中」だった。その後に完了したかは未確認である。
- **Zanzibar の現状**: 論文の数値は 2018 年 12 月の測定で、その後の規模や構成は未確認である。§2.3（namespace 設定言語）は精読しておらず、属性条件が本当にないかは本稿で読んだ範囲での判断にとどまる。
- **AVP**: 資源を列挙・検索する API があるか、SLA（可用性の約束値）、日本・EU・米国の各リージョンで提供されているか（データ所在地の要件に直結する）は未確認である。料金ページに価格改定の発効日の記載はなく、確認日時点の表示値を記した。
- **AuthZed Materialize の整合性の意味論**（ZedToken との関係、伝播遅延）は未確認である。
- **Permify のライセンス**: 現行は AGPL-3.0（GitHub のメタデータ）である。ライセンス変更の履歴と、自社利用で生じる義務の範囲は、法務確認が必要で未確認である。
- **Topaz の AuthZEN 対応**: 根拠は Aserto のブログ告知（2025-02-28、検証時に記事上の日付を確認）である。告知は draft 02 / draft 03 を前提にしており、AuthZEN 1.0 Final（2026-01-11）への準拠や interop 結果は確認していない（未確認）。Aserto は 2025-05-31 までに営利事業を畳んでいる（RS-07#69）ため、Final 版への追随はメンテナ有志の活動に依存する。
- **公開事例**: Himeji と Carta の記事はいずれも 2021 年のもので、現状は未確認である。Carta が予告したアーキテクチャ編（part two）は見つけられなかった。Himeji の測定条件（測定点、期間、キャッシュの効果）の詳細は記載がない。
- **未調査の候補**: Okta FGA（OpenFGA のマネージド版）、AuthZed Cloud / Dedicated の SLA と価格、Ory Keto、Oso、Permit.io、Google Cloud・Azure の同種サービス。
- **R-093 の未調査の軸**: CVE 対応の実績、LTS の方針、バックアップと復旧の手順、multi-region 構成の公式な参照構成は、本ストリームでは調べていない。
- **自社規模の数値**: BIA と現行システムのログがなく、前提台帳の A-ID も採番されていないため、必要な Check の QPS や一覧件数の分布は算出していない（RS-07#80）。
- **AuthZEN の新しい WG draft**（COAZ など）は、名称と状態だけを確認し、本文は読んでいない。
- **照合**: 2026-10-03 に作成者とは別の AI エージェントが全 64 脚注を原典で照合した（結果は 53 脚注が支持、11 脚注が部分支持、不支持と検証不能は 0）。部分支持の箇所は本版で修正済みである。記録は research/verification/RS-07-verification.md にある。検証者も AI エージェントであり、人間のレビュアによる照合は未実施である。

---

## 参考文献

[^1]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』Proceedings of the 2019 USENIX Annual Technical Conference, 2019-07. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: Abstract, §1 Introduction、確認日: 2026-10-03）
[^2]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §2.2 Consistency Model、確認日: 2026-10-03）
[^3]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §2.1 Relation Tuples, §2.4 API（2.4.1〜2.4.5）、確認日: 2026-10-03）
[^4]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §3.2.1 Evaluation Timestamp, §3.2.2 Config Consistency、確認日: 2026-10-03）
[^5]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §3.2.4 Leopard Indexing System、確認日: 2026-10-03）
[^6]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §3.2.5 Handling Hot Spots, §3.2.6 Performance Isolation、確認日: 2026-10-03）
[^7]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §4 Experience, §4.1 Requests, §4.2 Latency（Figure 4, Table 2）, §4.3 Availability, §4.4 Internals、確認日: 2026-10-03）
[^8]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §4.5 Lessons Learned, §5 Related Work（TAO との比較）、確認日: 2026-10-03）
[^9]: OpenFGA『Query Consistency Modes』web 文書（版表記なし）. https://openfga.dev/docs/interacting/consistency （参照箇所: Background, When to use higher consistency, Cache expiration, Future work、確認日: 2026-10-03）
[^10]: OpenFGA『Configuring OpenFGA』web 文書（版表記なし）. https://openfga.dev/docs/getting-started/setup-openfga/configure-openfga （参照箇所: Configuring data storage, read replicas（Synchronous vs Asynchronous Replication, Higher Consistency Mode）, Experimental features、確認日: 2026-10-03）
[^11]: OpenFGA『Configuration』（ページ表示 v1.20.0）. https://openfga.dev/docs/getting-started/setup-openfga/configuration （参照箇所: listObjectsDeadline, listObjectsMaxResults, resolveNodeLimit, maxTuplesPerWrite, maxTypesPerAuthorizationModel, check query cache TTL, cache controller、確認日: 2026-10-03）
[^12]: OpenFGA『Running OpenFGA in Production』web 文書（版表記なし）. https://openfga.dev/docs/best-practices/running-in-production （参照箇所: Cluster recommendations, Database recommendations, Concurrency limits, Maximum results、確認日: 2026-10-03）
[^13]: OpenFGA『Immutable Authorization Models』web 文書（版表記なし）. https://openfga.dev/docs/getting-started/immutable-models （参照箇所: How to target a particular model, Benefits of passing in an authorization model ID, Progressively rollout changes、確認日: 2026-10-03）
[^14]: OpenFGA『Relationship Queries: Check, Read, Expand, ListObjects and ListUsers』web 文書（版表記なし）. https://openfga.dev/docs/interacting/relationship-queries （参照箇所: ListObjects — When to use / Caveats, ListUsers — Caveats、確認日: 2026-10-03）
[^15]: OpenFGA『Search With Permissions』web 文書（版表記なし）. https://openfga.dev/docs/interacting/search-with-permissions （参照箇所: Option 1〜3, Choosing the best option、確認日: 2026-10-03）
[^16]: OpenFGA『Conditions』web 文書（版表記なし）. https://openfga.dev/docs/modeling/conditions （参照箇所: Queries with condition context, Limitations、確認日: 2026-10-03）
[^17]: OpenFGA『AuthZEN API (Experimental)』web 文書（版表記なし）. https://openfga.dev/docs/interacting/authzen （参照箇所: Enabling AuthZEN, Evaluation, Evaluations, Search 各節, Implementation Notes（Pagination, Authorization model selection extension, X-Request-ID header, Contextual Tuples）、ページ表示の最終更新 2026-09-28、確認日: 2026-10-03）
[^18]: OpenFGA『openfga/cli README』GitHub（main ブランチ、commit 80e2edf, 2026-09-28。最新リリース v0.8.1, 2026-09-24）. https://github.com/openfga/cli （参照箇所: Stores — Export Store（Parameters: --store-id, --output-file, --model-id, --max-tuples（既定 100））と Response 例、確認日: 2026-10-03。検証時に旧出典『Store File Format』https://openfga.dev/docs/modeling/store-file-format から差し替えた。旧出典にはコマンド例しかなく、書き出す内容は書かれていなかったため）
[^19]: Cloud Native Computing Foundation『OpenFGA』プロジェクトページ. https://www.cncf.io/projects/openfga/ （参照箇所: 成熟度と受理日・Incubating 移行日の記載、確認日: 2026-10-03）
[^20]: OpenFGA『Release v1.21.0』GitHub, 2026-09-20. https://github.com/openfga/openfga/releases/tag/v1.21.0 （参照箇所: リリース日、リポジトリのライセンス表示 Apache-2.0、確認日: 2026-10-03）
[^21]: AuthZed『Consistency』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/consistency （参照箇所: Defaults, Levels（Minimize Latency / At Least As Fresh / At Exact Snapshot / Fully Consistent と CockroachDB の注記）, ZedTokens, Storing ZedTokens、確認日: 2026-10-03）
[^22]: AuthZed『Read-After-Write Consistency』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/read-after-write （参照箇所: Why reads might not reflect recent writes, Approaches, Choosing an approach（比較表）、確認日: 2026-10-03）
[^23]: AuthZed『Datastores』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/datastores （参照箇所: 推奨 datastore 一覧, CockroachDB — Overlap Strategy、確認日: 2026-10-03）
[^24]: AuthZed『Caveats』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/caveats （参照箇所: 定義, CheckPermission の CONDITIONAL 応答, LookupResources / LookupSubjects、確認日: 2026-10-03）
[^25]: AuthZed『Querying Data』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/querying-data （参照箇所: LookupResources, LookupSubjects、確認日: 2026-10-03）
[^26]: AuthZed『SpiceDB Commands & Parameters』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/commands （参照箇所: spicedb serve のフラグ --dispatch-max-depth, --datastore-revision-quantization-interval, --datastore-revision-quantization-max-staleness-percent, --datastore-gc-window, --max-lookup-resources-limit, --max-caveat-context-size, --write-relationships-max-updates-per-call, --datastore-engine、確認日: 2026-10-03）
[^27]: AuthZed『What is Materialize?』Managed Materialize — Getting Started — Overview（版表記なし）. https://authzed.com/docs/materialize/getting-started/overview （参照箇所: 概要, Accelerated Queries, Event Streams、確認日: 2026-10-03。旧 URL https://authzed.com/docs/authzed/concepts/authzed-materialize からこの URL へ転送される）
[^28]: AuthZed『authzed/api: authzed/api/v1/permission_service.proto』GitHub（main ブランチ）. https://github.com/authzed/api/blob/main/authzed/api/v1/permission_service.proto （参照箇所: rpc ExportBulkRelationships / ImportBulkRelationships のコメント, message ExportBulkRelationshipsRequest、確認日: 2026-10-03）
[^29]: AuthZed『SpiceDB Release v1.56.2』GitHub, 2026-09-11. https://github.com/authzed/spicedb/releases/tag/v1.56.2 （参照箇所: リリース日、リポジトリのライセンス表示 Apache-2.0、確認日: 2026-10-03）
[^30]: J. W. Cutler et al. (Amazon Web Services ほか)『Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)』arXiv:2403.04651v2, 2024-03-08（正式版: Proceedings of the ACM on Programming Languages Vol.8 OOPSLA1, 2024-04-29, DOI 10.1145/3649835）. https://arxiv.org/abs/2403.04651 （参照箇所: Abstract, §2.2〜§2.3、確認日: 2026-10-03）
[^31]: J. W. Cutler et al.『Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)』arXiv:2403.04651v2, 2024-03-08. https://arxiv.org/abs/2403.04651 （参照箇所: §3.5 Properties, §3.6 Full Cedar、確認日: 2026-10-03）
[^32]: J. W. Cutler et al.『Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)』arXiv:2403.04651v2, 2024-03-08. https://arxiv.org/abs/2403.04651 （参照箇所: §4 Symbolic Compilation 冒頭, §4.4 Soundness and completeness、確認日: 2026-10-03）
[^33]: J. W. Cutler et al.『Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)』arXiv:2403.04651v2, 2024-03-08. https://arxiv.org/abs/2403.04651 （参照箇所: §5.2 Performance evaluation（5.2.1 Experimental setup, 5.2.2 Results）および脚注 6、確認日: 2026-10-03）
[^34]: Cedar Policy『Authorization』Cedar Policy Language Reference Guide（版表記なし）. https://docs.cedarpolicy.com/auth/authorization.html （参照箇所: 判定規則（default deny / forbid overrides permit / skip on error）, 関連 policy と entity データの決定、確認日: 2026-10-03）
[^35]: Cedar Policy『Policy validation』Cedar Policy Language Reference Guide（版表記なし）. https://docs.cedarpolicy.com/policies/validation.html （参照箇所: validation soundness, 検出されない誤り（overflow, missing entities, extension values）, strict mode、確認日: 2026-10-03）
[^36]: Cedar Policy『Document history / Cedar language version history』Cedar Policy Language Reference Guide. https://docs.cedarpolicy.com/other/doc-history.html （参照箇所: 言語版 4.5 の行（SDK 4.10.0〜4.13.0, 2026-04-23）、確認日: 2026-10-03）
[^37]: cedar-policy『cedar-policy/CHANGELOG.md』GitHub（main ブランチ、commit dddbdff, 2026-09-23。最新記載版 4.13.0, 2026-09-15）. https://github.com/cedar-policy/cedar/blob/main/cedar-policy/CHANGELOG.md （参照箇所: [4.13.0] Changed（`tpe` experimental feature）, [4.6.0] Added（RFC 95 の type-aware partial evaluation と batched evaluation を experimental flag `tpe` で実装）, [4.3.0] Added（`partial-eval` experimental feature）、確認日: 2026-10-03。検証時に旧出典『Release v4.8.0』https://github.com/cedar-policy/cedar/releases/tag/v4.8.0（2025-11-17）から差し替えた。旧出典は v4.8.0 時点の記載で、`partial-eval` を experimental とは明記していなかったため）
[^38]: Cloud Native Computing Foundation『Cedar』プロジェクトページ. https://www.cncf.io/projects/cedar/ （参照箇所: "accepted to CNCF on October 8, 2025 at the Sandbox maturity level"、確認日: 2026-10-03）
[^39]: Amazon Web Services『Amazon Verified Permissions pricing』web ページ（改定日表記なし）. https://aws.amazon.com/verified-permissions/pricing/ （参照箇所: Single / Batch Authorization Requests, Policy management requests、確認日: 2026-10-03）
[^40]: Amazon Web Services『Quotas for Amazon Verified Permissions』User Guide. https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html （参照箇所: Quotas for resources, Quotas for hierarchies, Quotas for operations per second、確認日: 2026-10-03）
[^41]: Amazon Web Services『Best practices for designing an authorization model — Multi-tenancy considerations』Verified Permissions User Guide. https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/design-authz-strategy.html#design-multi-tenancy-considerations （参照箇所: Multi-tenancy considerations, Comparing shared policy stores and per-tenant policy stores, How to choose、確認日: 2026-10-03。旧 URL https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/design-multi-tenancy-considerations.html からこの URL へ転送される）
[^42]: Amazon Web Services『Amazon Verified Permissions multi-tenant design considerations』AWS Prescriptive Guidance. https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-design-considerations.html （参照箇所: 冒頭（isolation と authorization の区別）、確認日: 2026-10-03）
[^43]: Amazon Web Services『Example 3: Multi-tenant access control with RBAC』AWS Prescriptive Guidance. https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-mt-abac-examples.html （参照箇所: 第 2 段落 "Per Tenant Policy Store design pattern is a best practice"、確認日: 2026-10-03）
[^44]: Amazon Web Services『CreatePolicy』Amazon Verified Permissions API Reference. https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_CreatePolicy.html （参照箇所: 冒頭の Note（schema 検証、eventually consistent）、確認日: 2026-10-03）
[^45]: Amazon Web Services『IsAuthorized』Amazon Verified Permissions API Reference. https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_IsAuthorized.html （参照箇所: Request Parameters（entities）, Response Elements（decision, determiningPolicies, errors）、確認日: 2026-10-03）
[^46]: Open Policy Agent『Note from Teemu, Tim, and Torin to the Open Policy Agent community』Open Policy Agent Blog（掲載者表示: Tim Hinrichs。題名上は Teemu Koponen, Tim Hinrichs, Torin Sandall の連名）, 2025-08-20. https://www.openpolicyagent.org/blog/note-from-teemu-tim-and-torin-to-the-open-policy-agent-community-2dbbfe494371 （参照箇所: 冒頭の告知, FAQ（project, maintainers, tools under the Styra GitHub）、確認日: 2026-10-03）
[^47]: Cloud Native Computing Foundation『Open Policy Agent (OPA)』プロジェクトページ. https://www.cncf.io/projects/open-policy-agent-opa/ （参照箇所: 受理・Incubating・Graduated の各日付、確認日: 2026-10-03）
[^48]: Open Policy Agent『Bundles』OPA 文書（版表記なし）. https://www.openpolicyagent.org/docs/management-bundles （参照箇所: 概要（eventually consistent）, Long Polling, Bundle Persistence, Signing、確認日: 2026-10-03）
[^49]: Open Policy Agent『Decision Logs』OPA 文書（版表記なし）. https://www.openpolicyagent.org/docs/management-decision-logs （参照箇所: イベント形式, Masking Sensitive Data, Drop Decision Logs, Rate Limiting Decision Logs、確認日: 2026-10-03）
[^50]: Open Policy Agent『Configuration』OPA 文書（版表記なし）. https://www.openpolicyagent.org/docs/configuration （参照箇所: Bundles（polling.min_delay_seconds / max_delay_seconds, persist）, Decision Logs（reporting.buffer_*、max_decisions_per_second、min/max_delay_seconds）、確認日: 2026-10-03）
[^51]: Open Policy Agent『Release v1.21.1』GitHub, 2026-09-29. https://github.com/open-policy-agent/opa/releases/tag/v1.21.1 （参照箇所: リリース日、リポジトリのライセンス表示 Apache-2.0、確認日: 2026-10-03）
[^52]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §1 Introduction, §2 Model, §4 API Version, §5 Information Model（5.1, 5.5）, §11.1〜11.2、確認日: 2026-10-03）
[^53]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §6 Access Evaluation API, §7 Access Evaluations API（7.1.1, 7.1.2.1, 7.2）, §8 Search APIs（8.1 Semantics, 8.2 Pagination, 8.4〜8.6）、確認日: 2026-10-03）
[^54]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §9 Policy Decision Point Metadata（9.2.3）, §10 Transport（10.1, 10.1.3）, §11.6 Authorization Response Integrity, §11.7 Availability & Denial of Service、確認日: 2026-10-03）
[^55]: OpenID Foundation『Authorization API 1.0 Final Specification Approved』2026-01-12. https://openid.net/authorization-api-1-0-final-specification-approved （参照箇所: 告知本文と投票結果、確認日: 2026-10-03）
[^56]: OpenID Foundation『AuthZEN – Specifications』WG ページ. https://openid.net/wg/authzen/specifications （参照箇所: Final Specifications, Working Group Drafts, Previous Versions、確認日: 2026-10-03）
[^57]: OpenID Foundation『AuthZEN Authorization API 1.0 Implementer's Draft Approved』2024-11-15. https://openid.net/authzen-authorization-api-1-0-implementers-draft-approved （参照箇所: 告知本文と投票結果、確認日: 2026-10-03）
[^58]: O. Gazitt, G. Drapers (Aserto)『The final chapter for Aserto』Aserto Blog, 2025-04-27. https://www.aserto.com/blog/the-final-chapter-for-aserto （参照箇所: SaaS control plane の停止日, 営利事業の終了, Topaz の継続、確認日: 2026-10-03）
[^59]: FusionAuth『FusionAuth Acquires Permify, Unifying AuthN + AuthZ in a Single Deploy Anywhere Platform』プレスリリース, 2025-11-20. https://fusionauth.io/blog/fusionauth-permify-pr （参照箇所: 買収の告知, OSS 維持の表明、確認日: 2026-10-03）
[^60]: Permify『Permify/permify』GitHub リポジトリ（最新リリース v1.7.4, 2026-09-10）. https://github.com/Permify/permify （参照箇所: ライセンス表示 AGPL-3.0, Releases、確認日: 2026-10-03）
[^61]: Aserto『aserto-dev/topaz』GitHub リポジトリ（最新リリース v0.33.22, 2026-09-28）. https://github.com/aserto-dev/topaz （参照箇所: Releases, ライセンス表示 Apache-2.0、確認日: 2026-10-03）
[^62]: O. Gazitt (Aserto)『AuthZEN, Gartner IAM, and native support in Topaz』Aserto Blog, 2025-02-28. https://www.aserto.com/blog/authzen-gartner-iam-and-native-support-in-topaz （参照箇所: 冒頭（draft 02 / draft 03 の公開）, Native support in Topaz（"as of Topaz 0.32.54, we support the native AuthZEN endpoints, across both the HTTP REST and gRPC bindings"）, Search requests（draft 03 の search）、確認日: 2026-10-03）
[^63]: A. Yao, D. Pawar, B. Wu, A. Parmar (Airbnb)『Himeji: A Scalable Centralized System for Authorization at Airbnb』The Airbnb Tech Blog, 2021-04-20. https://medium.com/airbnb-engineering/himeji-a-scalable-centralized-system-for-authorization-at-airbnb-341664924574 （参照箇所: The Solution, Architecture & Performance, Conclusion、確認日: 2026-10-03）
[^64]: A. Tainter (Carta)『AuthZ: Carta's highly scalable permissions system』Building Carta, 2021-06-11. https://medium.com/building-carta/authz-cartas-highly-scalable-permissions-system-782a7f2c840f （参照箇所: Experimenting with tokens, Our implementation, Our initial tests, Flatten, Version 2.0.0、確認日: 2026-10-03）
