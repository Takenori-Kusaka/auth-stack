# 階層を三つの関係に分けて名前の揺れを断つ

tenant_id の下で「組織 id・プロジェクト id・グループ id」が乱立し上下関係が曖昧になる原因は、**「どこに属すか（containment）」「誰が属すか（membership）」「誰が管理するか（管理委任範囲）」という性質の異なる三つの関係を、一つの「組織」概念や一本の木に押し込んでいること**にある。GCP・AWS・Azure・Google Workspace・GitHub はいずれもこの三つを別の実体に分けている。containment は**単一親・深さ上限付きの木**（GCP folder 10 階層、AWS OU 5 階層、Azure MG 6 階層）とし、ポリシー継承の経路にだけ使う。n:n の所属はネスト制限付きのグループで表し、管理委任は Entra の administrative unit のようなフラットで多重所属できる集合で表す。本基盤への推奨は次のとおりである。基盤所有の `core` に、根 `core/tenant`、再帰可能な汎用コンテナ `core/unit`（単一親）、n:n の `core/group`、委任範囲 `core/admin_scope` の 4 型を置く。「プロジェクト」「ワークスペース」のような業務上の意味を持つ節点は、ドメインの型付き葉ノードとして `parent` で木にぶら下げる。ID は ADR-021 の不透明 ID とし、型は `(type, id)` の組で別に運ぶ。パスは派生属性に分け、ID にも token にも入れない。token には `sub`・`tid`・`client_id`・主体類型・`act` だけを載せ、階層は PDP が評価する。こうすれば組織再編は「親ポインタ 1 本の付け替え」になり、M&A は tid の alias と部分木の移植になる。この設計は既存の ADR-010（D-12, D-28）、ADR-011（D1-4, D9-1）、ADR-021（D21-09〜D21-14, D21-26〜D21-30）の決定とそのまま噛み合い、新しい不可逆識別子を増やさない。ただし、組織木を資源の継承経路に入れると、現行の解決深度の設計値 8（authorization-model §3.4）を超える。この点は祖先閉包の事前計算で解く必要があり、本稿の提案のうち最も重い追加決裁事項になる。

## 主要基盤は三つの関係を別々の実体に分けている

調べた基盤はほぼ例外なく、containment を単一親の木にしている。GCP は「a given folder or resource can have exactly one parent」と明記し、folder のネストは最大 10 階層、1 つの親 folder の直下は最大 300 と定める ([Create folders](https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders))。AWS は OU を root の下に **最大 5 階層**まで ([Quotas](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html))、Azure は management group を **最大 6 階層**まで（root と subscription の階層を除く）許し、「Each management group and subscription can support only one parent」とする ([MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview))。Kubernetes の namespace はそもそもネストできない ([Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/))。三つのクラウドは構造も同じで、根が一つあり、再帰できる汎用コンテナ（folder・OU・MG）が続き、末端に型付きの節点（project・account・subscription）が付く。この木の役割は、GCP の言葉で言えば Ownership（ライフサイクルを直近の親に束縛する）と Inheritance（ポリシーを下へ流す）の二つに限られる ([About resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy))。

所属（membership）は、どの基盤でも木とは別の実体で表されている。AWS では、誰がアクセスするかを IAM Identity Center の group が表し、この group は OU の木と無関係で、しかもネストできない ([IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/users-groups-provisioning.html))。Google Workspace では、ユーザーが属する OU は 1 つだけで、そこから設定を継承する。そのうえで configuration group と access group が、OU に関係なく横から例外を当てる ([Google Workspace](https://knowledge.workspace.google.com/admin/users/advanced/how-the-organizational-structure-works))。管理委任は第三の次元である。Entra の administrative unit はネストできず、ユーザーが複数の AU に属せる。効くのは管理権限の範囲だけで、閲覧は制限しない ([Administrative units](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units))。管理委任を containment と同じ木で表すと、「人事上の所属」と「誰がその人のパスワードをリセットできるか」が同じ形に縛られる。Entra はこれを避けるため、委任範囲を別の実体にしている。

一本の木に組織の実態をすべて表させようとした例が Salesforce である。role hierarchy だけではマトリクス型の報告関係を表せず、territory hierarchy という第二の木と public group を足した。その結果、階層やグループを変えるたびに共有の再計算が走り、構造の変更は四半期に一度程度に抑えるよう推奨されている ([Platform Sharing Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html))。ここから得られる教訓は、木を増やすのでもなく、すべてを一本の木に押し込むのでもなく、木は一本にとどめて残りを所属と委任範囲の集合に逃がすことである。グループ階層の意味も一つに決め打ちしないほうがよい。ServiceNow では、親グループのロールは子へ継承されるが、子のメンバーは親のメンバーにならない ([ServiceNow](https://www.servicenow.com/docs/r/platform-administration/user-administration/t_CreateAGroup.html))。Entra でも、入れ子のグループは親グループに割り当てたアプリへのアクセスを得ない ([Entra groups](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups))。「ネストしたら何が推移するか」は relation ごとに明示して決める必要がある。

| 関係 | 形 | 用途 | 前例 | 本基盤の型（提案） |
|---|---|---|---|---|
| containment（どこに属すか） | 単一親の木、深さ上限あり | ライフサイクル、ポリシーと権限の下方継承 | GCP folder、AWS OU、Azure MG、Workspace OU | `core/tenant`（根）、`core/unit`（再帰コンテナ）、ドメインの葉ノード |
| membership（誰が属すか） | n:n、ネストは予算内で可 | 権限付与の主体集合 | Identity Center group（ネスト不可）、Entra group、GitHub team | `core/group` |
| 管理委任範囲（誰が管理するか） | フラット、多重所属 | 管理操作の範囲だけを限定する | Entra administrative unit | `core/admin_scope`（新設） |
| 横断属性 | キーと値。継承の有無を宣言する | 分類と条件 | GCP Tags（継承あり）と Labels（継承なし）([Tags overview](https://cloud.google.com/resource-manager/docs/tags/tags-overview)) | 正本ストアの属性。条件で使う場合は型付き relation に写す（authorization-model §3.5） |

## 汎用コンテナ一つと型付きの葉で、命名の揺れを止める

「組織 id」「プロジェクト id」「グループ id」がばらつくのは、節点の種類ごとに別のテーブル・別の ID 列・別の親参照列を作るからである。そこで逆に `node` という汎用型一つにすべてを寄せると、今度は型制約が働かなくなる。OpenFGA の `parent: [folder, drive]` も、Cedar の `memberOfTypes` も、許される親子の組合せを型で検証する仕組みである ([OpenFGA: Get Started](https://openfga.dev/docs/modeling/getting-started); [Cedar: Schema](https://docs.cedarpolicy.com/schema/schema.html))。汎用 node にすると「プロジェクトの下に会社を置く」誤りを書込み時に拒否できなくなる。ListObjects で対象を型で絞ることもできなくなる。調べた範囲では OpenFGA・SpiceDB・Cedar の例はすべて具体的なドメイン型を使っていた。ただし、汎用 node を避けよとベンダーが明言した一次記述は見つからなかった。これは例示の書き方から読み取った推論である。

両者の折衷は、クラウドの三社と認可エンジンの例に共通している。**深さが可変の部分だけを、再帰できる一つの汎用コンテナ型で表し、意味のある節点は型付きにする**というやり方である。GCP では folder だけが再帰し、project は型付きの末端である。OpenFGA では folder→folder、Cedar では Album→Album がこれに当たる。本基盤では、テナントごとに段数も呼び名も違う「事業部・部・課・子会社・支社」を、すべて `core/unit` で表す。違いは `kind` という表示属性（`division`、`department`、`subsidiary` など）で持つ。この属性はテナントが自由に定義できる語彙とし、認可の判断には使わない。一方、「プロジェクト」「ワークスペース」「案件」のように固有の permission と生存期間を持つ節点は、ドメイン型（`proj/project` など）として作り、`parent: [core/unit, core/tenant]` で木にぶら下げる。こうすると API とデータモデルの上では、「組織 id」「プロジェクト id」という列が消えて、すべて `parent: {type, id}` という一つの形になる。上下関係は `parent` だけが表すので、曖昧さがなくなる。

名前の揺れにはもう一つ原因がある。同じ語が製品の中で別の意味を持つことである。Atlassian では admin の organization と、Jira Service Management の顧客グルーピングとしての organizations が別の概念になっている ([Atlassian Support](https://support.atlassian.com/jira-service-management-cloud/docs/group-customers-into-organizations))。本基盤では「organization」という語を型名に使わないことを勧める。tenant の別名なのか、unit の一種なのかが読み手ごとに揺れるからである。顧客に見せる呼称は `kind` の表示名で決めればよい。型名は ADR-021 D21-26 の `<名前空間コード>/<型名>` に従い、組織名もチーム名も含めない ([ADR-021](../05_adr/ADR-021-irreversible-identifiers.md))。

### 型の一覧（提案）

| 型 | 所有 | 主な relation | 親（`parent` の直接型） | 制約 |
|---|---|---|---|---|
| `core/tenant` | 基盤 | `member`, `external_member`, `admin`, `security_admin`, `role_manager`（既存） | なし（根） | 1 token に 1 tid（ADR-005 V9） |
| `core/unit` | 基盤（新設） | `parent`, `admin`, `member`, `admin_scope` | `core/unit`, `core/tenant` | 単一親、深さ ≤ 5（案）、直下の子は上限を宣言、`kind` は表示属性 |
| `core/group` | 基盤（既存） | `member`（`core/user`, `core/group#member`）, `owner_unit` | なし（木に入れない） | ネストは深度予算 3 以内。`owner_unit` は分割時の帰属を決めるための relation で、継承には使わない |
| `core/admin_scope` | 基盤（新設） | `delegate`（`core/user`, `core/group#member`） | なし（ネスト不可） | 管理操作の permission にだけ効き、閲覧には効かない（Entra AU と同じ意味論） |
| `core/user`, `core/workload`, `core/client` | 基盤（既存） | 主体 | — | sub は単一の名前空間（ADR-021 D21-10） |
| `proj/project` などの葉 | ドメイン | `parent`, `owner`, `member` など | `core/unit`, `core/tenant` | 型ごとに許す親を宣言する |
| `files/folder` などの資源コンテナ | ドメイン | `parent` | 同じ型、または葉ノード | 既存の §8.2 のとおり |

`core/unit` と `core/admin_scope` は `core` の追加になるので、基盤の変更審査（二者承認）を通す必要がある（authorization-model §3.1）。現行の §8.3 は `org/unit` をドメイン型として例示しているが、これは `core/unit` に昇格させることを勧める。組織の木はほぼすべてのドメインが参照する横断構造であり、ドメインごとに意味がばらつくのを防ぐというのが core 型を基盤が所有する理由そのものだからである。

### relation 名の規約（提案。authorization-model §3.3 X-2・X-7 への追補）

| 規約 | 内容 | 理由 |
|---|---|---|
| R-1 | containment の辺は、どの型でも `parent` という名前にし、単一値に限る。現行の §8.3〜8.5 の `unit`、`project` のように containment を別名で書いている箇所は `parent` に揃える | 上下関係を名前だけで機械的に判別できる。X-7「再帰は `parent` に限る」とも一致する |
| R-2 | containment でない参照（担当部署、所管ユニットなど）は役割を表す名詞にし、`parent` の名前を使わない。例: `owning_unit`, `care_team` | 継承経路と単なる関連を混同しない |
| R-3 | 直接所属は `member`、管理者は `admin`、委任範囲は `admin_scope`、委任先は `delegate` とする | 既存の `core/tenant` の語彙に揃える |
| R-4 | permission は動詞にする（`view`, `manage`, `manage_membership`, `move`）。継承を伴う permission は「直接 relation の和 ∪ `parent->同名 permission`」の形に限る | SpiceDB は arrow の右辺に permission を置くことを推奨している ([AuthZed: Schema](https://authzed.com/docs/spicedb/concepts/schema)) |
| R-5 | 推移の有無は permission の定義で明示する。たとえば `member` は親へ推移させない（ServiceNow 型）、`admin` は子へ推移させる、のように決める | ネストの効果を一様に決め打ちしない |
| R-6 | 事前計算した祖先は `ancestor` という名前の複数値 relation にし、書けるのは階層サービスだけとする（次節） | 生成物と手書きの tuple を区別する |

## 木を保ち、循環を断ち、深さを予算に収める

認可エンジンは循環を守ってくれない。SpiceDB は権限グラフがループのない木であることを前提にしており、専用の循環検出器を持たない。循環は、最大深さ（既定 50 hops）に達したエラーとしてしか現れない ([AuthZed: Recursion and max depth](https://authzed.com/docs/spicedb/modeling/recursion-and-max-depth))。OpenFGA は v1.3.2 以降、**モデル上の**循環をエラーにする ([OpenFGA CHANGELOG](https://github.com/openfga/openfga/blob/main/CHANGELOG.md))。しかし、データ（tuple）上の循環をどう扱うかは公式文書で確認できなかった。Cedar の意味論も DAG であることを前提にしている ([Cedar paper](https://arxiv.org/pdf/2403.04651))。Kubernetes の HNC は admission webhook で循環を阻止していたが、稀なコーナーケースでは循環が形成され得ると自ら明記しており、その後リポジトリはアーカイブされた ([HNC concepts](https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/docs/user-guide/concepts.md))。したがって、循環を防ぐ責任は、正本ストアを持つ階層サービスが負うしかない。移動の要求では、移動先がその節点自身の部分木に含まれていないこと、移動後の深さが上限以内であることを、親の付け替えと同じトランザクションの中で検査する。正本には隣接リスト（`parent_id`）と closure table を併せて持つ。閉包表があれば部分木の判定は 1 回の結合で済む。定期的な照合では PostgreSQL 再帰 CTE の `CYCLE` 句を使って循環を検出できる ([PostgreSQL: WITH Queries](https://www.postgresql.org/docs/current/queries-with.html))。この照合は authorization-model の K-4（差分照合）の対象に含める。

containment は木にとどめ、DAG を許すのは `core/group` のネストだけにする。理由は二つある。一つは、複数の親を許すと「移動」の意味が決まらないことである（どの親から外すのか）。もう一つは、ポリシーの継承が菱形の継承になり、deny と継承の解決順が複雑になることである。NIST RBAC も、tree/inverted tree の Limited hierarchy と、任意の半順序の General hierarchy を区別している ([Proposed NIST RBAC](https://www.informatik.uni-bremen.de/agbkb/forschung/formal_methods/security/rbac.pdf))。containment は Limited 側に、group は General 側に置くのが自然である。マトリクス組織（一人が二つの部署に属する）は、木を増やして表すのではなく、group と admin_scope の多重所属で表す。

深さの上限は、エンジンの上限ではなく、最悪の経路長で見積もる必要がある。OpenFGA の Check の解決深度の既定は `resolveNodeLimit=25` ([OpenFGA: Configuration](https://openfga.dev/docs/getting-started/setup-openfga/configuration))、SpiceDB は 50 hops である。どちらも「階層の段数＋グループのネスト段数」の合計を消費する。現行の設計値 8 は「フォルダ 5＋グループ 3」で組まれており、組織木を含めていない（authorization-model §3.4）。ファイルが `parent->` を素朴に辿ってフォルダ 5 段、プロジェクト、unit 5 段、テナントへ至り、そこにグループ 3 段が加わると、15 前後になる。これはエンジンの既定値の内側ではあるが、設計値を大きく超える。ここで選べる方法は三つある。(a) unit 木からの継承を管理系の permission（`manage`）に限り、閲覧系は葉ノードの直接付与で表す。(b) 次節の祖先閉包を事前計算し、unit の部分を 1 hop に畳む。(c) 設計値そのものを引き上げる。本稿は (a) と (b) を併用することを推奨する。unit の深さ上限は AWS（5）と Azure（6）の実績に倣って 5 を初期案とし、TC-ARC05-08 で深さ 8・10・25 の tail latency を実測してから確定するのがよい。

## ID は不透明な値と型の組にし、パスは属性に追い出す

位置を名前に埋め込んだ代表例が LDAP である。DN は「RDN＋上位の DN」で構成されるので、ModifyDN でサブツリーを移すと配下すべての DN が変わり、DN を参照している member や ACL に影響が及ぶ ([RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html); [RFC 4511](https://www.rfc-editor.org/rfc/rfc4511.html))。クラウドはこれを避けている。GCP の folder は `folders/634792535758` のように数値の ID だけで識別され、親は `parent` 属性、表示名は `displayName` という別の属性に置かれる ([About resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy))。AWS の OU ID も親 OU を含まず、ツリー内の位置は別の `Path` 属性で表される ([OrganizationalUnit](https://docs.aws.amazon.com/organizations/latest/APIReference/API_OrganizationalUnit.html))。名前を認可のキーに使う危険は、Auth0 が具体的に警告している。`org_name` は改名されると長寿命 token の中で古い名前のまま残り、しかも名前は再利用され得るので、旧名を持つ token が別の新しい org へのアクセスを与えかねない。そのため Auth0 は ID での検証を推奨している ([Auth0 Docs](https://auth0.com/docs/manage-users/organizations/configure-organizations/use-org-name-authentication-api))。Keycloak 26.6 の organization groups は、`/Engineering/Backend` のような org 相対のパスを claim に出力する ([Keycloak Blog](https://www.keycloak.org/2026/04/org-groups))。しかしこの値は移動によって変わるので、認可のキーには向かない。

本基盤の ID 規則は、既存の ADR を unit に当てはめるだけで決まる。値は ADR-021 D21-09/D21-14 に従い、122 bit 以上の CSPRNG で生成する。符号化は小文字の base32（26 文字）か UUIDv4 で、どちらにするかは DL-71 で決める。テナント・時刻・連番・業務上の意味を含めない。tuple の資源 ID にテナント ID を埋め込まない（ADR-010 D-12）([ADR-010](../05_adr/ADR-010-authz-engine-store-consistency.md))。ユーザーの言う「種別付き ID」は、**ID 文字列に接頭辞を付けることではなく、`(type, id)` の組で運ぶこと**と解釈すべきである。principal-catalog §3.2 は、sub の文字列から主体類型を推論させないこと、つまり接頭辞を付けないことを定めている。AuthZEN も Subject と Resource に `type` と `id` を REQUIRED としている（ADR-021 N-18）。表記形式は OpenFGA の `type:id` に倣い、ログや画面では `core/unit:7m2qk4w9x0c3v8b1n5h6j2r4tz` と書けばよい。

| 項目 | 形式例 | 可逆性 | 備考 |
|---|---|---|---|
| unit の参照 | `{"type":"core/unit","id":"7m2qk4w9x0c3v8b1n5h6j2r4tz"}` | 不可逆 | 移動・改名・テナント統合を経ても変えない。墓石化し、再利用しない（D21-13） |
| プロジェクトの参照 | `{"type":"proj/project","id":"q8d1z0..."}` | 不可逆 | ドメインが払い出す（D21-14） |
| 親 | `parent: {"type":"core/unit","id":"..."}` | 可変 | 単一値。移動は楽観的並行制御で行い、現在の親を明示させる（AWS `MoveAccount` の SourceParentId と同じ考え方 ([MoveAccount](https://docs.aws.amazon.com/organizations/latest/APIReference/API_MoveAccount.html))） |
| 祖先列（派生） | `ancestors: ["<tenant>", "<u1>", "<u2>"]`（ID の列） | 派生 | 正本の closure table から生成する。検索と一覧（ADR-025 の L3 索引）に使う。token と認可キーには使わない |
| 表示パス（派生） | `"本社 / 開発本部 / 基盤部"` | 派生・可変 | 表示専用。ltree などで索引化してよいが、単一親の木が前提になる ([PostgreSQL: ltree](https://www.postgresql.org/docs/current/ltree.html)) |
| `kind`・表示名・slug | `"department"`, `"基盤部"` | 可変 | 名前は同じ親の下で一意にするだけ（GCP・AWS と同じ）。認可には使わない |

## token には tid だけを載せ、階層は PDP で評価する

各社は、所属の全量を token に載せない方向に収束している。Entra の groups claim は JWT で 200、SAML で 150 を超えると overage claim に置き換わり、アプリは Graph でメンバーシップを照会し直す必要がある ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference))。Okta も groups claim の件数上限を 1〜100 にしている ([Okta Developer](https://developer.okta.com/docs/guides/customize-tokens-static/main))。WorkOS は「Your access token is a snapshot, not a live query」と述べている ([WorkOS Blog](https://workos.com/blog/access-token-claims-authorization))。B2B の CIAM 製品の多くは、選択中の org の ID を一つだけ載せ（Auth0 の `org_id`、WorkOS の `org_id`）、org を切り替えるときは token を取り直させる ([Auth0 Docs](https://auth0.com/docs/manage-users/organizations/using-tokens); [WorkOS Docs](https://workos.com/docs/authkit/sessions))。本基盤では、その「選択中の org」に当たるのが `tid` である。tid は 1 token に 1 つで、切り替えるときは token を取り直す（ADR-005 V9）。

テナントの下の unit やプロジェクトの選択は、token に載せないことを勧める。ADR-021 D21-38 は、PEP が判定に使うものだけを token に入れ、権限・role・group・組織階層は焼き込まないと定めている ([ADR-021](../05_adr/ADR-021-irreversible-identifiers.md))。ADR-011 D9-1 も token を「封筒」にとどめると定めている ([ADR-011](../05_adr/ADR-011-policy-language-pep-pdp-api.md))。「いまどのワークスペースを見ているか」は UI の文脈なので、BFF のセッション状態か要求のパラメータで運べばよい。PDP は、要求された資源の `parent` 連鎖を正本から評価する。こうすれば、選択中の unit が改名・移動・削除されても token が古くなることはない。OpenFGA は、ログイン中の組織に限ってアクセスを許すパターンに contextual tuples を使う例を示している。ただし contextual tuples は永続化されず、Check と ListObjects でしか使えないという制約がある ([OpenFGA: Organization Context](https://openfga.dev/docs/modeling/organization-context-authorization))。将来、製品の要件として「選択中の unit を session に束縛する」必要が出てきた場合も、claim 名は DL-75 の claim registry で予約するにとどめる。PDP は値をそのまま信じず、所属を検証する。この二点は守るべきである。

性能の面では、深い木を Check のたびに辿らないための事前計算が要る。Zanzibar の Leopard は、グループ間の推移閉包（GROUP2GROUP）だけをフラット化し、ユーザーから直接所属するグループへの対応（MEMBER2GROUP）はフラット化せずに残す。そうして「`MEMBER2GROUP(U) ∩ GROUP2GROUP(G) ≠ ∅`」という 1 回の交差で所属を判定する。鮮度の問題は、オフラインのスナップショットに増分レイヤを重ねて補っている ([Zanzibar paper](https://www.usenix.org/system/files/atc19-pang.pdf))。AuthZed にも同じ発想の Materialize があるが、提供は AuthZed Dedicated に限られる ([AuthZed Materialize](https://authzed.com/docs/authzed/concepts/authzed-materialize))。これを本基盤に移すには、階層サービスが正本の closure table から、各葉ノードに `ancestor: [core/unit]` の tuple を書けばよい。そうすれば permission は `ancestor->admin` の 1 hop で済み、木の深さに依存しなくなる。人から直接所属への対応は、Leopard と同じく直接リンクのまま残す。代償は移動のときに表れる。unit を一つ動かすと、部分木の大きさ×祖先数ぶりの tuple を書き換えることになり、OpenFGA の `maxTuplesPerWrite` 既定 100 を超えれば bulk レーン行きで、原子性もなくなる（authorization-model §3.4）。そのため、旧祖先の削除を先に同期で確定させ、新祖先の追加を後から outbox で反映させる。これは authorization-model の K-1（剥奪先行）と同じ順序規則で、こうしておけば中間の状態は必ず deny 側に倒れる。

### モデル例（擬似表記と各エンジンへの写像。いずれも検証器は未通過）

CAM の擬似表記（authorization-model §8.1 の記法）では次のようになる。

```text
type core/unit
  relations
    parent:       [core/unit, core/tenant]                 # 単一値。書込み時に循環と深さを検査する
    admin:        [core/user, core/group#member]
    member:       [core/user, core/group#member]           # 親へ推移しない（R-5）
    admin_scope:  [core/admin_scope]
  permissions
    manage             = admin | parent->manage            # 管理は下へ継承する
    view               = member | manage
    manage_membership  = manage | admin_scope->delegate    # 委任範囲は管理操作にだけ効く

type core/admin_scope                                      # ネスト不可（parent を持たない）
  relations
    delegate:     [core/user, core/group#member]

type proj/project
  relations
    parent:       [core/unit, core/tenant]
    ancestor:     [core/unit, core/tenant]                 # 階層サービスだけが書く閉包（R-6、X-8）
    owner:        [core/user]
    member:       [core/user, core/group#member, core/role#assignee] | owner
  permissions
    view   = member | ancestor->manage                     # 1 hop。深さに依存しない
    admin  = owner | ancestor->manage
```

OpenFGA DSL（型名の `/` の可否と識別子規則は生成器と PoC で確認する）では次のようになる。

```text
model
  schema 1.1
type core/tenant
  relations
    define admin: [core/user]
    define member: [core/user]
    define manage: admin
type core/unit
  relations
    define parent: [core/unit, core/tenant]
    define admin: [core/user, core/group#member]
    define member: [core/user, core/group#member]
    define admin_scope: [core/admin_scope]
    define manage: admin or manage from parent
    define view: member or manage
    define manage_membership: manage or delegate from admin_scope
type core/admin_scope
  relations
    define delegate: [core/user, core/group#member]
```

OpenFGA では、`from` の左側（tupleset）に書けるのは直接割り当てた具体的なオブジェクトだけである ([OpenFGA: Parent-Child](https://openfga.dev/docs/modeling/parent-child))。したがって `parent` と `ancestor` は、必ず 1 件ずつの `type:id` tuple で書く必要がある。

SpiceDB schema では次のようになる。

```text
definition core/unit {
  relation parent: core/unit | core/tenant
  relation admin: core/user | core/group#member
  relation member: core/user | core/group#member
  relation admin_scope: core/admin_scope
  permission manage = admin + parent->manage
  permission view = member + manage
  permission manage_membership = manage + admin_scope->delegate
}
```

SpiceDB の arrow は subject の relation（`#member`）を無視してオブジェクトに作用する ([AuthZed: Schema](https://authzed.com/docs/spicedb/concepts/schema))。そのため `parent` と `admin_scope` には userset を許さない。

Cedar のスキーマ（v1 の本番評価には使わない。ADR-011 D2-8、D1-4。G 段の比較や監査の写像の参考にとどめる）では次のようになる。

```text
namespace Core {
  entity Tenant;
  entity Unit in [Unit, Tenant] { kind: String, display_name: String };
  entity Group in [Group];
  entity User in [Group];
  entity AdminScope;
}
```

Cedar の `in` は複数の親を許し、推移的かつ反射的である ([Cedar: Operators](https://docs.cedarpolicy.com/policies/syntax-operators.html))。AVP では推移的な親の数が 1 エンティティあたり 100 に制限され、この上限は調整できない ([AVP Quotas](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html))。Cedar で単一親を保証するには、書込み側の検査に頼るしかない。

## 再編は親の付け替え、M&A は alias と部分木の移植で吸収する

ID がパスを含まなければ、組織再編は「親ポインタの付け替え」というメタデータ操作になる。GCP の project 移行がまさにこれで、データの移送も停止時間もない。移行の前後で project ID、直接付与した IAM ロール、課金は変わらず、継承由来のロールと組織ポリシーだけが移動先のものに置き換わる ([Migrate projects](https://cloud.google.com/resource-manager/docs/project-migration))。Azure はさらに慎重である。移動する子に対する write 権限に加えて、**現在の親と移動先の親の両方**に対する write 権限を要求し、カスタムロールの定義と割当ての経路が切れる移動はエラーにする。また階層を最大 30 分キャッシュするので、移動がすぐには反映されないことがある ([MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview))。本基盤の `move` 操作には、次を定めることを勧める。移動元と移動先の両方の `manage` を要求する。現在の親を指定させる楽観的並行制御を入れる。循環と深さを同じトランザクションで検査する。「直接付与は保持し、継承分は再評価する」ことを契約に明記する。外部付与のある部分木への出入りを write＋XT として扱う（ADR-024 D24-13）。旧親の削除と新親の追加は 1 回の書込み要求にまとめる（authorization-model K-1、例 A の手順）。

M&A とテナントの統合・分割について、ベンダーは「テナントを合併する」機能を一級の機能として提供していない。Entra は multi-tenant organization と cross-tenant synchronization でテナントを連邦化する。参加できるのは 1 テナントにつき 1 つの MTO までで、active テナントは 100 が上限である ([Microsoft Learn: MTO](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/multi-tenant-organization-overview))。Okta は Org2Org による hub-and-spoke で連邦化する ([Okta Help](https://help.okta.com/oie/en-us/content/topics/architecture/ma/ma-okta-to-okta.htm))。GitHub は org を単位に enterprise の間で移管できるが、EMU は対象外である ([GitHub Docs](https://docs.github.com/enterprise-cloud@latest/admin/managing-accounts-and-repositories/managing-organizations-in-your-enterprise/adding-organizations-to-your-enterprise))。テナントを二つに分割する公式の手順は、調べたどのベンダーでも見つからなかった。この点は今回の調査の空白として明示しておく。本基盤は、すでに識別子を書き換えない方式を決めている。統合では統合元の tid を墓石にして存続 tid への alias を置き（ADR-021 D21-29）、分割では切り出す側に新しい tid を払い出し、移る利用者の sub は変えない（D21-30）。分割の前には、分割元と分割先をまたぐ tuple を全件列挙し、削除するか期限付きの越境付与に変換して、残りを 0 件にする（ADR-028 D28-40）([ADR-028](../05_adr/ADR-028-tenant-lifecycle-operations.md))。

ここで unit の木を導入すると、統合も分割も「部分木」を単位に考えられるようになる。統合では、吸収される側のテナントの根の直下を、存続テナントの一つの unit の下に接ぎ木する。分割では、一つの unit の部分木を新しいテナントの根の下へ切り出す。この操作を安全に行うには、部分木にとって外側にある参照を列挙できる必要がある。木の外にあるグループや委任範囲の帰属が曖昧だと、D28-40 の全件列挙が漏れる。そのため `core/group` と `core/admin_scope` に、継承には使わない帰属用の relation `owner_unit` を持たせることを提案する。こうすれば、分割の境界をまたぐ参照を closure table の結合だけで洗い出せる。GitHub が「org は削除するより追加するほうがずっと容易」と述べ、org を少数に保つよう推奨しているのも同じ問題の裏返しである ([GitHub Docs](https://docs.github.com/enterprise-cloud@latest/admin/concepts/enterprise-best-practices/organize-work))。テナントのような重い境界は少なく保ち、組織の変化は軽い unit の木で吸収するほうが、20 年という計画期間では安く済む。

## 補足: user_id ではなく sub、client_id、act を分ける

この論点について、本基盤はすでに答えを出している。ADR-021 D21-10 は、sub を利用者・service account・エージェント・client の service principal に共通の単一名前空間から払い出し、類型は別の claim で運ぶと定めている。sub はテナントに属さず、複数テナントへの所属があっても、統合・分割があっても変わらない ([ADR-021](../05_adr/ADR-021-irreversible-identifiers.md))。したがって、データモデルと API で `user_id` という名前を使い続けることは勧めない。この名前は人間の主体を暗に前提にしてしまい、エージェントや workload が主体になった時点で、`user_id` と `service_id` が並ぶという、本稿の主題と同じ命名の揺れを主体の側で再現してしまう。列名は `subject_id`（値は sub）にし、`subject_type` を別の列に持つのがよい。これは AuthZEN の Subject `{type, id}` と同じ形である。Entra の `oid`/`sub` はテナントごとに意図的に変わる ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)) が、本基盤はテナントから独立した sub を選んでいる。複数テナントに所属する 3%（A-015）が、その根拠である。

`client_id` は「どのソフトウェアが要求しているか」を表し、主体とは別の軸である。ADR-021 D21-23 は client_id の値域を sub と分けると定めている。その根拠は、RFC 9068 §5 が指摘する危険、つまり client credentials で client の識別子を sub に使うと、悪意ある client が高権限の resource owner の sub を選べてしまうことにある。`act` は代理を表す。RFC 8693 に従い、アクセス制御に使ってよいのは top-level の claim と現在の actor だけである（ADR-005 V10、ADR-011 D9-2）。主体の側でも「誰か（sub と主体類型）」「何を通じてか（client_id）」「誰の代わりにか（act）」を一つの ID に押し込まないことは、組織の側で containment・membership・委任範囲を分けることと同じ設計原理である。

## Conclusion

「組織 id とプロジェクト id のどちらを使うべきか」という問いの立て方自体が、症状である。木が表すのは「どこに属すか」だけであり、所属と管理委任は別の集合として持つ。この線を引けば、ID の列は `parent: {type, id}` 一つに収束し、組織の呼び名の多様さは `kind` という表示属性に閉じ込められる。本基盤ではこの整理が既存の ADR とほとんど衝突しない。新たに決裁が要る点は四つに絞られる。`core/unit` と `core/admin_scope` を core に追加するか。containment の relation 名を `parent` に統一し、§8.3〜8.5 の例を書き換えるか。祖先閉包（`ancestor`）を階層サービスが書く方式を採り、解決深度の設計値 8 を守るか。unit の深さ上限を 5 から始めるか。

見落とされやすいのは、事前計算と剥奪の整合性が表裏一体であることである。祖先閉包は Check を速くするが、組織再編のたびに大量の tuple を非原子的に書き換えることになるので、剥奪先行の順序規則と差分照合がなければ、一時的に許可が残る窓を自ら作り込んでしまう。組織の木の設計は、データモデルの問題である以上に、整合性の契約の問題でもある。テナントの分割手順はどのベンダーにも前例がない。そのため、`owner_unit` による帰属の明示と部分木単位の列挙が本当に機能するかは、PoC で実際に分割をやってみるまで確かめられない。
