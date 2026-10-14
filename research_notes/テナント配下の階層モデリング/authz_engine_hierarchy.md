# 認可エンジン/モデルにおける階層・ネストグループの表現（2026-10 時点調査）

注記: 一次情報（論文・公式ドキュメント）を優先。取得できなかった・未検証の事項は各節の Gaps に明記。

## Q1. Google Zanzibar: tuple-to-userset、ネストグループ、Leopard

### Takeaway
Zanzibar は親子包含を `tuple_to_userset`（親オブジェクトを辿ってそのリレーションを継承）で、ネストグループを userset（`group#member`）の再帰評価（pointer chasing）で表現する。深い/広いネストは高コストなため、Leopard がグループ間到達可能性を GROUP2GROUP / MEMBER2GROUP に事前フラット化し、オフラインスナップショット＋増分レイヤで一貫性を補う。

### Cited Findings
- userset rewrite の3プリミティブ: `_this`（直接タプル）、`computed_userset`（同一オブジェクトの別リレーション参照。例: editor は viewer を含む）、`tuple_to_userset`（入力オブジェクトから tupleset を計算し該当タプルを取得、各タプルから userset を計算。例: 「ドキュメントの親フォルダを引き、その viewers を継承」）。union / intersection / exclusion で合成可能 — [Zanzibar paper (USENIX ATC'19)](https://www.usenix.org/system/files/atc19-pang.pdf)
- Figure 1 の namespace 例: doc の viewer = `_this ∪ computed_userset(editor) ∪ tuple_to_userset(tupleset: parent, computed_userset: viewer)`（親フォルダの viewer を継承） — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)
- Check は間接 ACL/グループのメンバーシップを再帰的に評価する「pointer chasing」。多くの ACL/グループではうまく機能するが「indirect ACLs or groups are deep or wide」の場合は高コスト（§3.2.4 で対処）。boolean 式木の葉を並行評価し、部分木の結果が確定したら他ノード評価をキャンセル — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)
- Leopard は「large and deeply nested sets」の操作を最適化するインデックスシステム。ACL データの定期スナップショットを読み、スナップショット間の変更を Watch し、非正規化等の変換を行って aclserver からの要求に応答 — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)
- Leopard インデックスは (T, s, e) タプル（T=集合種別 enum、s=集合ID, e=要素ID, いずれも64bit整数）で名前付き集合群を表現。クエリは名前付き集合の union/intersection/exclusion を評価し、要素ID順で指定件数まで返す — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)
- グループメンバーシップ用の2集合種別: `GROUP2GROUP(s)→{e}`（祖先グループ s に対し、直接/間接のサブグループ e 全て）、`MEMBER2GROUP(s)→{e}`（ユーザー s が**直接**所属する親グループ e）。U が G のメンバーか = `MEMBER2GROUP(U) ∩ GROUP2GROUP(G) ≠ ∅`。グループメンバーシップはグラフ到達可能性問題であり、group-to-group パスのフラット化で効率評価できる（データパターン次第で他の非正規化も適用可） — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)
- オフラインインデックスビルダーはタプル＋config のスナップショットから、userset rewrite を尊重しつつ ACL グラフのエッジを再帰展開して Leopard タプルを生成し、シャードを全世界に複製。Leopard サーバは新シャードを監視して入替。シャードは通常メモリから、またはメモリ＋リモートSSDから提供 — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)
- 限界と対策: オフライン生成・シャード入替のため、それ単体では「fresh and consistent snapshot」で評価できない。そこで増分レイヤがスナップショット以降の更新を (T,s,e,t,d)（t=タイムスタンプ, d=削除マーカ）で索引し、クエリ時刻以下の更新をオフラインインデックス上にマージ — [Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf)

### Inferences
- 設計上の示唆: ユーザー→直接所属グループ（MEMBER2GROUP）は非フラット、グループ→全子孫グループ（GROUP2GROUP）のみフラット化することで、ユーザー数×グループ深さの爆発を避けつつ交差判定1回で済ませる構造。テナント配下の組織階層でも「ノード間の推移閉包のみを事前計算し、ユーザー所属は直接リンクのまま」という分割が参考になる。
- 推移閉包の事前計算は「階層移動（エッジ変更）時の大量インデックス更新」と「鮮度（増分レイヤでの補正）」のトレードオフを伴う。

### Gaps
- 論文中の Leopard の具体的な性能数値（QPS、レイテンシ、1エッジ更新あたりのインデックス更新数）は今回抽出できず。未検証のため記載しない。
- Zanzibar 側の再帰深さ上限値は今回確認できず。

## Q2. OpenFGA: parent（from）、グループ、深さ上限、サイクル、ListObjects

### Takeaway
OpenFGA は `define viewer: ... or viewer from parent` 形式の tuple-to-userset で親子継承を、`[group#member]` の userset 型制約でネストグループを表現する。Check の再帰深さ既定は `resolveNodeLimit=25`。モデル上のサイクルは v1.3.2 以降エラー。ListObjects は 3s / 1000 件の既定上限で打ち切られる。

### Cited Findings
- Parent-child ガイド: folder の editor が中の document の editor になるには、document に `parent` リレーション（folder への関係）を追加し、`editor from parent` で継承する手順 — [OpenFGA: Parent-Child Objects](https://openfga.dev/docs/modeling/parent-child)
- `from` の右側（tupleset）にあるリレーションのタプル検索では OpenFGA は評価を行わず、**直接割当された具体オブジェクト（`type:id`）のみ**を考慮。tupleset 側に rewrite、wildcard（`type:*`）、userset（`type:id#rel`）があるとエラー — [OpenFGA: Parent-Child Objects](https://openfga.dev/docs/modeling/parent-child)
- Getting Started の例: `define parent: [folder, drive]` で document の親を folder か drive に型制約。タプルの "user" 欄にオブジェクト（`folder:{id}`）を書く特殊構文で object-to-object 関係を書く — [OpenFGA: Get Started with Modeling](https://openfga.dev/docs/modeling/getting-started)
- 型の洗い出し手順: 「既存のドメイン/DBモデルからオブジェクト型を特定し」Document, Folder, Organization のように具体型として列挙する手法を推奨（汎用 node 型ではなく具体ドメイン型を列挙するアプローチ） — [OpenFGA: Get Started with Modeling](https://openfga.dev/docs/modeling/getting-started)
- Object-to-object の用途例: community⊃channel⊃post/thread、account⊃transaction、building⊃door 等。関係の向きは自然言語記述に合わせて選ぶ（例: feature の user として plan を置く） — [OpenFGA: Object to Object Relationships](https://openfga.dev/docs/modeling/building-blocks/object-to-object-relationships)
- User Groups ガイド: タプルでグループ全体をオブジェクトに関係付ける（チーム共有、組織全員閲覧、block_list 等） — [OpenFGA: User Groups](https://openfga.dev/docs/modeling/user-groups)
- Multiple Restrictions: 「組織のメンバー かつ 文書の writer」のような AND 条件。owner には組織のメンバーではなく組織そのものを割り当てる — [OpenFGA: Multiple Restrictions](https://openfga.dev/docs/modeling/multiple-restrictions)
- Organization Context: マルチテナント PM システム例。ログイン中の組織コンテキストでのみアクセスを許すため contextual tuples を使用。contextual tuples は永続化されず、Check と ListObjects のみ対応、Read Changes で権限索引を作る場合は考慮が困難 — [OpenFGA: Authorization Through Organization Context](https://openfga.dev/docs/modeling/organization-context-authorization)
- サーバ設定既定値: `resolveNodeLimit=25`（Check 解決木の深さ上限）、`resolveNodeBreadthLimit=10`（同一レベル並行評価数）、`listObjectsDeadline=3s`、`listObjectsMaxResults=1000`、`listUsersDeadline=3s`、`listUsersMaxResults=1000`、`maxConditionEvaluationCost=100`。ListObjects の iterator cache は HIGHER_CONSISTENCY 時は不使用 — [OpenFGA: Configuration](https://openfga.dev/docs/getting-started/setup-openfga/configuration)
- ListObjects は「small object collections」での access-aware filtering 向け。期限内・上限件数までの結果しか返さないため、対象型のオブジェクト数が多い場合は deadline / max results を引き上げるべき — [OpenFGA: Relationship Queries](https://openfga.dev/docs/interacting/relationship-queries)
- サイクル: CVE-2023-43645 対応で、モデルにサイクルや自身を評価経路に含むリレーション定義がある場合、v1.3.2 以降は Check 等がエラーを返す（BREAKING）。また「computed relations は resolution depth quota を消費しない」改善、ネストした tuple-to-userset の Check 最適化（実験フラグ `enable-check-optimizations`）が CHANGELOG に記載 — [OpenFGA CHANGELOG](https://github.com/openfga/openfga/blob/main/CHANGELOG.md)

### Inferences
- `from parent` は1ホップごとに深さを消費するため、深いフォルダ/組織ツリー（>25段相当）では既定値に抵触しうる。テナント→部門→課…の段数を設計上制限するか設定を上げる必要がある。
- tupleset に userset を書けない制約により、「親」は必ず具体オブジェクト1件ずつのタプルで表現する（グループ経由の親指定は不可）。

### Gaps
- データ（タプル）レベルの循環（group A ∈ B ∈ A）を Check がどう扱うか（訪問済み検出で false を返すのか、深さ超過エラーか）は公式ドキュメントで確認できず。未検証。
- OpenFGA が「汎用 node 型を避け具体型を使え」と明言する一次記述は見つからず（上記は Getting Started の手順からの読み取り）。

## Q3. SpiceDB / AuthZed: arrow、深さ上限、サイクル、Materialize

### Takeaway
SpiceDB は `parent->view`（`.any()` 別名）で親継承を表現し、深さ上限は既定 50 hops（`--dispatch-max-depth`）。サイクル専用検出はなく、深さ超過エラーとして現れる（パラドックス回避・分散時のコストのため意図的）。Leopard 相当の事前計算は AuthZed Materialize（Dedicated のみ）。

### Cited Findings
- arrow の右辺は relation ではなく permission を参照することを推奨（ネスト計算が容易で可読性が高い）。`.any` は arrow の別名（`parent_folder.any(read)` ≡ `parent_folder->read`） — [AuthZed: Schema Language Reference](https://authzed.com/docs/spicedb/concepts/schema)
- arrow はサブジェクトの**オブジェクト**に作用し、サブジェクトの relation（例: `parent: group#member` の `#member`）は無視される。subject relation を許す relation 上で arrow を使う場合はコメントで明示することを推奨。理由は性能: もし arrow が subject relation を辿ると LookupSubjects 相当が必要になり CheckPermission が非常に高コストになる — [AuthZed: Schema Language Reference](https://authzed.com/docs/spicedb/concepts/schema)
- CheckPermission の各トラバース経路に最大深さを適用、既定 50 hops。超過時はエラー。`spicedb serve --dispatch-max-depth=100` で変更可。通常は既定で足り、深いフォルダ構造など正当に深い階層の場合のみ引き上げ — [AuthZed: Cyclical Relationships and Traversal Limits](https://authzed.com/docs/spicedb/modeling/recursion-and-max-depth)
- サイクル: 権限グラフはループのない tree でなければならず、SpiceDB はサイクルをサポートしない。専用のサイクル検出器はなく、最大深さに達してエラー（深いだけの非循環階層と同じエラー）。訪問済み追跡をしない理由は (1) 自己参照集合の意味論的パラドックス（exclusion と組合わさると矛盾）(2) 分散環境でのメモリ/ネットワークオーバーヘッド — [AuthZed: Cyclical Relationships and Traversal Limits](https://authzed.com/docs/spicedb/modeling/recursion-and-max-depth)
- AuthZed Materialize: Zanzibar の Leopard に着想を得た、マテリアライズドビュー的な事前計算サービス。事前計算対象の permission を設定し、リレーション書込み/スキーマ書込み時に変化を計算。Accelerated Queries（CheckPermission / CheckBulkPermissions / LookupResources / LookupSubjects の高速化、Dedicated で GA）と Event Streams（LookupPermissionSets / WatchPermissionSets で権限集合をアプリDBや検索エンジンに複製、early access）。AuthZed Dedicated のみ — [AuthZed: What is Materialize?](https://authzed.com/docs/authzed/concepts/authzed-materialize)

### Inferences
- OpenFGA(25) と SpiceDB(50) で既定深さが異なり、どちらも「階層段数＋グループネスト段数」の合計で消費される点に注意（設計時は最悪経路長で見積もる）。
- 書込み時にサイクルを防ぐ仕組みはエンジン側にないため、アプリ側（または DB 制約）で親付け替え時の循環チェックが必要。

### Gaps
- AuthZed の Google Drive / GitHub 例の具体スキーマは今回取得できず（ブログ URL は取得失敗）。
- OSS SpiceDB での Materialize 相当機能の有無は「Dedicated only」以上は未確認。

## Q4. Cedar / Amazon Verified Permissions: parents、in、memberOfTypes

### Takeaway
Cedar はエンティティの `parents` で多親（DAG）階層を表し、`in` は推移的・反射的。スキーマの membership relation（memberOfTypes）で親になれる型を制限する。意味論は DAG（非循環）を前提とする。AVP では推移的親の数が 1 エンティティあたり 100 に制限（調整不可）。

### Cited Findings
- 親エンティティを宣言することでグループを表現。グループは他グループを含められ多段階層を構成可能。User∈UserGroup だけでなく File∈Folder（フォルダのネスト）や Action のグループ化にも適用 — [Cedar: Terms & concepts](https://docs.cedarpolicy.com/overview/terminology.html)
- エンティティ UID は `Type::"id"`（例: `User::"jane"`, `UserGroup::"kevinFriends"`）。名前空間付き `PhotoFlash::Groups::Album::"vacation"` も可能だが、名前空間は論理的推論のみで構造的意味はない。`__cedar` は予約 — [Cedar: Entities](https://docs.cedarpolicy.com/policies/syntax-entity.html)
- エンティティは複数の親を持て、ネスト可能（ある Photo が複数 Album に同時所属） — [Cedar: Entities](https://docs.cedarpolicy.com/policies/syntax-entity.html)
- `in` は左辺が右辺の階層下の子孫なら true。推移的（A in B, B in C ⇒ A in C）かつ反射的（A in A）、非対称。右辺はエンティティまたはその集合 — [Cedar: Operators](https://docs.cedarpolicy.com/policies/syntax-operators.html)
- スキーマの Membership relation は「この型のエンティティの直接の親になれるエンティティ型のリスト」を指定（Cedar 形式では `entity User in [Group]`） — [Cedar: Schema overview](https://docs.cedarpolicy.com/schema/schema.html); [Cedar schema format](https://docs.cedarpolicy.com/schema/human-readable-schema.html)
- Cedar の意味論はエンティティ階層が DAG であること（祖先関係が非循環かつ推移的）を前提とする。検証(SMT)側では非循環性・推移性を量化制約として符号化しないと循環モデルによる偽陽性が出る — [Cedar paper (arXiv 2403.04651)](https://arxiv.org/pdf/2403.04651)
- AVP クォータ: Transitive parents per principal / action / resource 各 100（調整不可）。直接＋間接の親の合計で数える（例: 直接100、または直接10×各9親） — [AVP Quotas](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html)
- （参考・不一致）検索要約では AVP API の EntityItem が「最大99 transitive parents」と記載とされたが、直接確認していない。クォータ表は 100 — [AVP API EntityItem](https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_EntityItem.md); [AVP Quotas](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html)

### Inferences
- Cedar はリクエスト時に呼び出し側がエンティティ（と祖先）を渡すモデルのため、深い組織階層は「推移的親数100」に直接効く。深いテナント階層では祖先集合を属性に畳む等の工夫が必要。
- Cedar はエンジン側にリレーションストアを持たないため、階層の正規化・閉包計算は呼び出し側（アプリ/DB）の責務。

### Gaps
- Cedar ランタイム（Rust `Entities` ロード時の transitive closure 計算）が循環をエラーにするかは公式ドキュメントで確認できず（論文は DAG 前提と記述）。
- EntityItem の 99 という値は検索要約経由で未検証。

## Q5. NIST RBAC / ABAC と DB 階層パターン

### Takeaway
NIST RBAC は General（任意の半順序＝多重継承）と Limited（tree/inverted tree）のロール階層を区別する。SP 800-162 は組織所属を subject attribute として扱い、ロール爆発への対処として ABAC を位置付ける。DB 側では PostgreSQL の再帰CTE（CYCLE 句）と ltree（materialized path）が一次資料で確認できた。

### Cited Findings
- NIST RBAC 提案標準: General hierarchy は任意の半順序（多重継承）、Limited hierarchy は本質的に tree/inverted tree で、AddInheritance を単一の ascendant（または descendant）に制限 — [Proposed NIST Standard for RBAC (Ferraiolo et al., ミラー)](https://www.informatik.uni-bremen.de/agbkb/forschung/formal_methods/security/rbac.pdf)
- RBAC96: RBAC1 はロール間の半順序階層を導入。Ferraiolo-Kuhn(1992)モデルは階層を rooted tree と定義、RBAC3 は partial order を許す — [NIST CSRC RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)
- NIST RBAC 実装論文: ロール階層での多重継承は「許容されるが必須ではない」。r0 が r1 を継承するなら r0 に認可されたユーザーは r1 にも認可 — [Kuhn, RBAC/Web 実装論文 (ミラー)](https://csrc.nist.rip/staff/Kuhn/rbac-implement.pdf)
- SP 800-162: subject には name、role、organization affiliation 等の属性が割当てられる。属性は命名・定義・許容値・スキーマを持ち、attribute authority の下で管理。RBAC では「role explosion」が起こりうるのに対し ABAC は事前の明示的割当を不要にする — [NIST SP 800-162](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf)
- PostgreSQL 再帰CTE（隣接リストの推移クエリ）: 再帰部が最終的に空にならないと無限ループ。訪問済み値の配列で検出するのが標準手法で、`CYCLE id SET is_cycle USING path` 句で自動化可能。テスト時は親クエリに LIMIT を置く — [PostgreSQL: WITH Queries](https://www.postgresql.org/docs/current/queries-with.html)
- PostgreSQL ltree（materialized path）: ラベルパス型。B-tree（比較演算）、Hash（=）、GiST `gist_ltree_ops`（`@>` 祖先, `<@` 子孫, `~` lquery, `?` 等）。GiST はパスラベル集合をビットマップ署名で近似（siglen 既定8バイト、最大2024）し lossy。`lca()` で最長共通祖先 — [PostgreSQL: ltree](https://www.postgresql.org/docs/current/ltree.html)

### Inferences
- トレードオフ（一般論、一次資料未取得のため推論）: 隣接リスト＝移動O(1)・推移照会は再帰；materialized path(ltree)＝子孫照会はインデックスで高速・移動はサブツリー全行のパス書換え、かつ単一親（tree）前提；closure table＝推移照会は単純結合・移動はサブツリー×祖先の行削除/挿入、DAG も表現可；nested sets＝読み込み最速級だが挿入/移動で多数行の左右値更新。Zanzibar の GROUP2GROUP は closure table と同型の発想。
- NIST の Limited（tree）と ltree/単一親の親和性、General（DAG）と closure table / Cedar 多親の親和性が対応する。

### Gaps
- INCITS 359 本文（有償）は直接参照できず、提案標準論文（ミラー）と CSRC FAQ に依拠。
- closure table / nested sets の一次資料（Celko, Karwin 等）は今回取得せず、上記トレードオフは推論扱い。

## Q6. 型付きエンティティ vs 汎用 "node" モデリング

### Takeaway
調査した全ベンダー（OpenFGA, SpiceDB, Cedar）のドキュメント例は、folder / document / organization / group のような具体的ドメイン型を定義し、型制約（`[folder, drive]`、`memberOfTypes`）で許容される親子を制限するスタイル。汎用 node 型を推奨する一次記述は見当たらなかった。

### Cited Findings
- OpenFGA は既存のドメイン/DBモデルからオブジェクト型を洗い出して具体型として定義し、direct type restriction（例: `parent: [folder, drive]`）で親の型を制約する手順を示す — [OpenFGA: Get Started with Modeling](https://openfga.dev/docs/modeling/getting-started)
- Cedar はスキーマで entity type ごとに親になれる型を指定し、検証（validation）に用いる。Photo/Album/User/UserGroup のような具体型で例示 — [Cedar: Schema overview](https://docs.cedarpolicy.com/schema/schema.html)
- SpiceDB は arrow がサブジェクトのオブジェクト型の permission を参照するため、各 definition（型）ごとに permission を定義する構造 — [AuthZed: Schema Language Reference](https://authzed.com/docs/spicedb/concepts/schema)

### Inferences
- 汎用 node 型（例: `node#parent: [node]`）にすると型制約が無意味化し、OpenFGA/Cedar の型検証の利点（不正な親付けの拒否、ListObjects 対象型の絞り込み）を失う。一方、階層段数が可変・テナントごとに異なる場合は、具体型を段ごとに増やすと型数が増えるため、「再帰可能な具体型（例: `folder` が `folder` を親に持つ、`org_unit` が `org_unit` を親に持つ）」が各ベンダー例に共通する折衷（OpenFGA の folder→folder、Cedar の Album→Album、SpiceDB のネスト group）。

### Gaps
- 「汎用ノード型は避けるべき」とベンダーが明示的に述べた一次資料は見つからなかった。上記は例示スタイルからの推論。
