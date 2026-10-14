# 主要クラウド/エンタープライズ基盤におけるテナント内階層（containment）・命名・ID のモデリング

調査日: 2026-10-15。一次情報（公式ドキュメント/RFC/公式 GitHub）のみ。未検証事項は「未検証」と明記。
注: cloud.google.com/... の一部ドキュメントは 2026-10 時点で docs.cloud.google.com/... へ 301 リダイレクトされる。

## Q1. Google Cloud Resource Manager（organization / folder / project）

### Takeaway
GCP は「organization → folder（任意・最大10階層）→ project」の単一親ツリーで、IAM allow/deny/組織ポリシーは上から下へ継承される。ツリーとは独立した横断次元として Tags（継承あり・IAM条件で参照可）と Labels（継承なし・ポリシー不可）を持つ。Project の移動は「親ポインタの付け替え（メタデータ操作）」であり、継承由来の権限・ポリシーは即座に入れ替わる。

### Cited Findings
- 階層の目的は2つ: Ownership（リソースのライフサイクルを直近の親に束縛。作成した社員ではなく organization に属する）と Inheritance（アクセス制御・組織ポリシーの付与点が下方へ流れる） — [About resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
- Folder は organization と project の間の「optional grouping mechanism」。folder 利用には organization が必須 — [About resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
- Folder は allow/deny/組織ポリシーの継承点。folder に付与した IAM ロールは配下の全 project/folder に継承 — [About resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
- Folder のJSON表現例: `"name": "folders/634792535758"`, `"parent": "organizations/34739118321"`, `"displayName": "Engineering"`（＝ID は数値、表示名は別属性、親は型付き相対名） — [About resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
- 制約: folder のネストは最大10階層。1つの親 folder の直下 folder は最大300。folder の display name は同一階層内で一意 — [Create folders](https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders)
- 「a folder can contain multiple folders or resources, a given folder or resource can have exactly one parent」（単一親） — [Create folders](https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders)
- Folder Admin ロールは folder の作成・編集・削除・移動、および folder 間での project 移動の権限を含む — [Create folders](https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders)
- Full resource name（IAM 互換形式）: `//cloudresourcemanager.googleapis.com/organizations/ORGANIZATION_NUMBER`、`//cloudresourcemanager.googleapis.com/folders/FOLDER_NUMBER`、`//cloudresourcemanager.googleapis.com/projects/PROJECT_ID`。他サービスは `//compute.googleapis.com/projects/PROJECT_ID/zones/ZONE/instances/INSTANCE_ID` のように「サービスドメイン + 相対パス」。なお IAP は `projects/PROJECT_NUMBER` を使うなど、サービスによって ID/番号が混在 — [Full resource names](https://docs.cloud.google.com/iam/docs/full-resource-names)
- Deny policy の attachment point は `cloudresourcemanager.googleapis.com/projects/PROJECT_ID`（REST では URL エンコード）。deny policy は allow と同様に階層継承され、上位で付与したロールを下位の特定リソースで例外的に拒否するために使える — [Deny policies](https://cloud.google.com/iam/docs/deny-overview)
- Project 移行は「metadata operation that changes the project's location in the resource hierarchy」。データ転送ではなく親リソースの更新で、ダウンタイムなし — [Migrate projects](https://cloud.google.com/resource-manager/docs/project-migration)
- 移行時に不変: project ID/番号、データ、project に直接付与した IAM ロール、課金アカウント。変化: 継承 IAM ロール（移行元 org/folder 由来は失われる）、組織ポリシー（移行先のものに置換）、継承クォータ — [Migrate projects](https://cloud.google.com/resource-manager/docs/project-migration)
- Tags: tag binding は階層で子へ継承され、子孫で同一 key の別 value をバインドして上書き可能。直接付与＋祖先からの継承の合成を「effective tags」と呼ぶ。Tags は allow/deny policy の条件・一部組織ポリシー条件で参照可能。Labels は継承されず、ポリシー非対応。tag は binding が残っている間は削除不可。key/value 長 256 文字（labels は 63） — [Tags overview](https://cloud.google.com/resource-manager/docs/tags/tags-overview)
- Tags の推奨: IAM 条件で使う tag key ごとに安全なデフォルト値を用意する — [Tags overview](https://cloud.google.com/resource-manager/docs/tags/tags-overview)

### Inferences
- GCP は「containment（親子）＝ポリシー継承経路」と「cross-cutting 属性（Tags）」を明確に分離。Tags 自体も階層継承するため、Tags は「ツリーに沿った既定値 + 局所上書き」の属性次元として機能する。
- ID は不変の数値（folder/org）またはユーザー指定の不変文字列（project ID）で、パスに親を含めない（full resource name は `folders/N` 単体）。このため移動しても名前が変わらず、親は `parent` 属性で表す。
- ノード型は型付き（organization/folder/project）で、汎用ノードではない。folder だけが再帰可能な汎用コンテナ。

### Gaps
- folder を自身の子孫配下へ移動する場合の明示的なサイクル防止記述は取得できず（論理的に不可能と推測されるが未検証）。
- folder 移動時の継承権限変化の公式記述は project 移行ページほど詳細には確認できず。

## Q2. AWS Organizations（root / OU / account）と IAM Identity Center groups

### Takeaway
AWS は organization に root が1つ、その下に OU を最大5階層ネストし、account は単一親（root か OU）に属する。SCP/RCP はパス上で評価され、SCP は「root から account までの全レベルで明示的 Allow が必要」。メンバーシップ（誰が）は IAM Identity Center groups という完全に別の仕組みで、こちらはネスト不可。

### Cited Findings
- 「OU maximum nesting in a root: Five levels of OUs deep under a root」「You can have only one root in an organization」 — [Quotas](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html)
- ポリシー付与上限: SCP は root/OU/account 毎に最大10（最低1、最後の SCP は外せない）。RCP は最大5、`RCPFullAWSAccess` が root・全 OU・全 account に自動付与され外せない。継承由来は上限にカウントしない — [Quotas](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html)
- OU は account をまとめて管理する単位。OU に付けたポリシーは配下 account が自動継承。OU の中に OU を作れる。account は OU 間で移動可能。OU 名は同じ親（OU または root）内で一意 — [Managing OUs](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_ous.html)
- SCP 評価: account で許可されるには「root から直接パス上の各 OU、account 自身まで全レベルで明示的 Allow」が必要。このため有効化時に `FullAWSAccess` が付与される。Deny は上位にあれば下位の Allow に関係なく効く — [SCP evaluation](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_inheritance_auth.html)
- `MoveAccount`: 「Moves an account from its current source parent root or OU to the specified destination parent root or OU」。management account からのみ呼べる。パラメータは AccountId・SourceParentId・DestinationParentId（＝呼び出し側が現親を明示する楽観的な付け替え） — [MoveAccount API](https://docs.aws.amazon.com/organizations/latest/APIReference/API_MoveAccount.html)
- ID 形式: account は12桁数字。root は `r-` + 4〜32 小文字英数。OU は `ou-<rootIdの部分>-<8〜32文字>`（正規表現 `^ou-[0-9a-z]{4,32}-[a-z0-9]{8,32}$`、OU ID は organization 内でのみ一意）。OU 名は 1〜128 文字、account 名は 1〜50 文字 — [OrganizationalUnit](https://docs.aws.amazon.com/organizations/latest/APIReference/API_OrganizationalUnit.html); [Account](https://docs.aws.amazon.com/organizations/latest/APIReference/API_Account.html)
- OU ARN: `^arn:aws:organizations::\d{12}:ou/o-[a-z0-9]{10,32}/ou-...`（ARN に管理アカウントID と org ID を含むが、親 OU のパスは含まない） — [OrganizationalUnit](https://docs.aws.amazon.com/organizations/latest/APIReference/API_OrganizationalUnit.html)
- OU/Account には別途「Path」属性があり、`o-.../r-.../ou-.../<12digits>/` 形式でツリー内位置を表す（ID とは分離された派生情報） — [OrganizationalUnit](https://docs.aws.amazon.com/organizations/latest/APIReference/API_OrganizationalUnit.html); [Account](https://docs.aws.amazon.com/organizations/latest/APIReference/API_Account.html)
- IAM Identity Center: 「IAM Identity Center doesn't support nested groups (A group within a group)」。groups は account やアプリへのアクセス割当に使い、メンバー追加/削除で動的に権限が増減。username は一意で主識別子 — [Users, groups, and provisioning](https://docs.aws.amazon.com/singlesignon/latest/userguide/users-groups-provisioning.html)

### Inferences
- AWS も「containment（OU ツリー）＝ガードレール継承経路」「membership（Identity Center group）＝アクセス付与主体」「権限セット割当（group × account）」を分離している。
- OU ID が root ID を埋め込む（`ou-<root>-<suffix>`）のは「どの root 配下か」をID に焼き込む設計だが、親 OU は焼き込まないため OU 内移動では ID 不変。位置情報は Path 属性として別管理。

### Gaps
- OU 自体を別の親へ移動する API の存在は確認できず（一般には OU の移動は不可で、作り直し＋account 移動が必要と認識しているが**未検証**）。
- account 移動時の SCP 即時切替の公式文言（user guide「Moving accounts」ページ）は本文取得に失敗。
- `Paths` 属性の導入時期は未確認。

## Q3. Azure（management groups / subscriptions / resource groups）と Entra ID（administrative units / groups）

### Takeaway
Azure は Entra テナントごとに単一の root management group（ID＝テナントID）を持ち、MG は最大6階層（root と subscription 階層を除く）、各 MG/subscription は単一親。RBAC スコープは型付きの文字列パス。一方 Entra の administrative unit は「管理委任スコープ」であり、ネスト不可・多重所属可・閲覧は制限しない、という containment とは別次元の構造。

### Cited Findings
- 1ディレクトリあたり最大 10,000 MG。MG ツリーは最大6階層（root レベルと subscription レベルは含まない）。「Each management group and subscription can support only one parent」。全 MG と subscription は各ディレクトリ内の単一階層に属する — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- Root MG: 既定表示名 "Tenant root group"、ID は Entra テナント ID と同値。移動・削除不可。新規 subscription は既定で root MG 配下に入る。誰も既定アクセスを持たず、Global Administrator のみ昇格可能 — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- MG の ID と display name はどちらもユーザー定義。ロール定義の assignable scope にはID を使う（表示名を使うのはよくある誤り） — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- 移動の権限要件: 移動対象の子に MG write＋roleAssignments write/delete、移動先の親と現在の親の双方に MG write（root が関わる場合は例外）。subscription Owner が現 MG からの継承の場合、Owner を持つ MG にしか移動できない（所有権喪失防止） — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- 移動の制約: カスタムロール定義（assignable scope が MG）とロール割当の経路が切れる移動はエラー。カスタムロールの assignable scope に指定できる MG は1つのみ（定義と割当の断絶を減らすため） — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- ARM は MG 階層を最大30分キャッシュするため、移動がポータルに即時反映されないことがある — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- 比較表: Resource group/Subscription/MG は「割当の配下への継承」をサポート、Service Group と Tags は非サポート。スコープ境界をまたぐリソースのグルーピングは Service Group のみサポート。Tags は first-class なグルーピングではない — [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- RBAC スコープは4レベル（MG / subscription / resource group / resource）で親子関係、下位は上位のロールを継承。形式: `/subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceSubType1}/.../{resourceName}`、MG は `/providers/Microsoft.Management/managementGroups/{managementGroupName}` — [Scope overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview)
- Administrative unit（AU）: users/groups/devices のみを含むコンテナで、ロールの権限を組織の一部に限定する。ユーザーは複数 AU に所属可能（例: "Seattle" と "Marketing"）。「Administrative units can't be nested」 — [Administrative units](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units)
- AU に group を追加しても group のメンバーはスコープに入らない（group の名前・メンバーシップは管理可、メンバー個人の属性・認証方法・パスワードは不可） — [Administrative units](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units)
- 「Administrative units apply scope only to management permissions」。スコープ外のユーザー等の閲覧は妨げない。AU 外ユーザーに割り当てたロールはテナント全体がスコープ — [Administrative units](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units)
- Entra groups: セキュリティグループは入れ子可能。入れ子は membership と Conditional Access スコープには使えるが、「Nested groups don't gain access to shared resources and applications that are assigned to the parent group」 — [How to manage groups](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups)

### Inferences
- Azure は3つの次元を明確に分けている: (1) containment＝MG/subscription/RG ツリー（ポリシー・RBAC 継承）、(2) membership＝Entra groups（入れ子の効果が機能ごとに異なる＝推移性が一様でない）、(3) administrative scope＝AU（フラット、多重所属、管理操作のみを制限）。
- MG の移動が「権限・ロール定義参照の整合性チェック」を伴う点は、階層移動が単なるポインタ更新ではなく認可グラフの再検証であることを示す。

### Gaps
- Entra の入れ子グループで「現在サポートしていない」項目一覧（M365 グループの入れ子、アプリ割当、ライセンス等）は抽出で欠落。一次ページで再確認が必要。
- AU の最大数・restricted management AU の詳細は未取得。

## Q4. Kubernetes namespaces と Hierarchical Namespace Controller (HNC)、labels

### Takeaway
コア Kubernetes の namespace はフラット（ネスト不可）で、各リソースは1 namespace のみに属する。階層化を試みた HNC は単一親ツリー＋サイクル防止 webhook を備えていたが、2025-04-17 にアーカイブ（kubernetes-retired）された。横断的分類は labels で行う設計。

### Cited Findings
- 「Namespaces cannot be nested inside one another and each Kubernetes resource can only be in one namespace」。名前は namespace 内で一意。namespace 名は RFC 1123 DNS label でなければならない（Service DNS `<service>.<namespace>.svc.cluster.local` のため）。同一 namespace 内のバージョン違い等は labels で区別せよ — [Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- HNC リポジトリ: 「archived by the owner on Apr 17, 2025. It is now read-only」、`kubernetes-retired` 組織配下。v1.1（階層クォータ、inclusive propagation）2023-06-23 リリース、v1.2 は 2023 年末予定のまま — [HNC GitHub](https://github.com/kubernetes-sigs/hierarchical-namespaces)
- HNC 概念: 子孫の集合を subtree、子のない namespace を leaf、全ツリーの集合を forest と呼ぶ。validating admission controller がサイクル（互いを親にする等）を阻止し、そのために全 namespace のインメモリビューを保持。ただし稀なコーナーケースでサイクルが形成され得ると明記 — [HNC concepts](https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/docs/user-guide/concepts.md)
- HNC は各 namespace に祖先ごとの tree label `<ancestor>.tree.hnc.x-k8s.io/depth` を付与（HNC 以外は変更不可）し、label selector で subtree を選択可能にする。subnamespace には親を指す annotation `hnc.x-k8s.io/subnamespace-of`。anchor を外せば `kubectl hns NS set --parent NEW_PARENT` で付け替え可能 — [HNC concepts](https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/docs/user-guide/concepts.md)
- HNC は RBAC や NetworkPolicy などのポリシーを親から子孫 namespace に伝播（propagation）する — [HNC GitHub](https://github.com/kubernetes-sigs/hierarchical-namespaces)

### Inferences
- HNC は「階層を label（祖先ごとの depth label）に平坦化して既存の label selector 機構で問い合わせる」という materialized ancestor（closure table 的）手法の実例。ただし外付けコントローラによる整合維持は、サイクル等の corner case を完全には防げないことを公式自ら認めている。
- アーカイブはコア側にネスト概念を入れない判断が維持されたことを示唆（理由の公式説明は未取得）。

### Gaps
- HNC アーカイブ理由の公式声明、後継（例: Capsule 等）の推奨は一次情報で未確認。

## Q5. LDAP / X.500: DN による containment と groupOfNames による membership

### Takeaway
LDAP の DIT は厳密なツリーで、DN＝RDN＋上位の DN という「位置を名前に埋め込む」方式。このため移動・改名（ModifyDN）は名前自体を変え、DN で参照している側（groupOfNames の member 等）に波及する。membership は別エントリ（groupOfNames）の DN 値属性で表す n:n 関係。

### Cited Findings
- エントリは「organized hierarchically in a tree structure known as the Directory Information Tree (DIT)」（§2.1） — [RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html)
- 「Each entry is named relative to its immediate superior」。RDN は直下兄弟内で一意。DN は「the concatenation of its RDN and its immediate superior's DN」（§2.3） — [RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html)
- どのクラスの下にどのクラスを置けるかは DIT structure rules（許可される上位-下位関係、structural object class のみ対象）と name forms（そのクラスの許容 RDN）で規定（§2.4.2, §4.1.7）。alias エントリは子を持てない（§2.6） — [RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html)
- ModifyDN 操作: `entry`, `newrdn`, `deleteoldrdn`, `newSuperior`(任意)。RDN 変更および「move a subtree of entries to a new location」に使う。対象エントリは子を持っていてもよい。newSuperior は新しい直上の親。改訂で「naming context 間の移動では失敗してよい」と明記 — [RFC 4511](https://www.rfc-editor.org/rfc/rfc4511.html)
- groupOfNames（RFC 4519 §3.5）は member 属性（DN 値）でメンバーを列挙するクラス — [RFC 4519](https://www.rfc-editor.org/rfc/rfc4519.html)（注: 抽出では見出しのみ取得。MUST が `member $ cn` である点は一般知識で、本文は**未検証**）

### Inferences
- DN を ID 兼位置として使う設計は、サブツリー移動で配下全エントリの DN が変わり、DN 参照（member, manager, ACL 等）の整合維持が課題になる。これが entryUUID（RFC 4530、本調査では未取得）のような不変 ID 併用や referential integrity プラグインが実装で必要になる背景と考えられる（**推論**）。
- 対照的に GCP/AWS/Azure は ID に親パスを含めず（Azure の RBAC スコープ文字列は MG 部分にサブスクリプションの親 MG を含まない）、移動で ID が変わらない。

### Gaps
- RFC 4519 groupOfNames 定義本文、RFC 4530 entryUUID、および DN rename の運用上の痛みを記した一次資料（例: 実装ベンダードキュメント）は今回取得できず。

## Q6. Salesforce（role hierarchy / territory / public groups）と ServiceNow（company / department / group）

### Takeaway
Salesforce は「データアクセスの上方継承用ツリー（role hierarchy）」「matrix 型の第二ツリー（territory hierarchy）」「n:n の public groups（ロールやテリトリー部分木も成員にできる）」を併存させ、階層変更のたびに共有再計算が走るコストを抱える。ServiceNow の group は parent を持ち、ロールは親→子へ、メンバーは子→親とは独立（子のメンバーは親のメンバーにならない）。

### Cited Findings
- Role hierarchy は組織図と一致させる必要はなく、各ロールは「a level of data access that a user or group of users needs」を表すべき。上位者は標準オブジェクトで部下と同じデータアクセスを継承 — [Platform Sharing Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html)
- Territory hierarchy は「best for modeling a matrix reporting structure, where someone can report to multiple managers」。role と territory を同一にすることは非推奨（不要な共有処理が発生）。両方使う場合は role＝HR報告構造、territory＝実際の営業構造 — [Platform Sharing Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html)
- Public group の成員には「Roles and Internal Subordinates」「Territories and Subordinates」「Other public groups (nesting)」等を含められる。「Group membership alone doesn't provide data access」。ネストはメンバーシップ計算により保守・性能に影響 — [Platform Sharing Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html)
- カスタムオブジェクトでは「Grant Access Using Hierarchies」をオフにして上位ロールへの継承を止められる（既定はオン） — [Platform Sharing Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html)
- role hierarchy、territory hierarchy、groups、sharing rules、ユーザーロール等の個々の変更が自動共有再計算を起こし得る。deferred sharing で一括化可能（サポートによる有効化が必要）。構造変更は四半期程度以下の頻度が目安 — [Platform Sharing Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html)
- 手動共有の共有先として Users / Roles / Roles and Internal Subordinates / Territories / Territories and Subordinates 等を選べる（＝階層の部分木を「グループ」として参照する設計） — [Manual Sharing (Classic)](https://help.salesforce.com/s/articleView?id=platform.granting_access_to_records_classic.htm&language=en_US&type=5)
- ServiceNow: 「If a group has a parent, the child group inherits the roles of the parent group. The members of the child group aren't members of the parent group.」 — [Create a user group](https://www.servicenow.com/docs/r/platform-administration/user-administration/t_CreateAGroup.html)
- ServiceNow のドメイン分離では sys_user_group のドメインを継承ロール（sys_group_has_role）と同期させる仕組みがある — [Installed with domain separation](https://www.servicenow.com/docs/r/platform-security/r_InstalledWithDomainSeparation.html?contentId=7eotq8rpuYOf5l4YGvwr1Q)

### Inferences
- Salesforce は「単一の階層では組織実態（matrix）を表せない」ため第二の階層とグループを追加した例であり、複数階層の併存は再計算コストと理解の困難さを生む。
- ServiceNow の parent group は「権限の継承方向（親→子）」と「メンバーシップの推移性（なし）」を分けて定義しており、グループ階層の意味を一つに決め打ちしない重要性を示す。

### Gaps
- Salesforce で「ユーザーは1ロールのみ」「ユーザー/アカウントは複数テリトリー所属可」を明記した一次ページは今回取得できず（**未検証**、一般知識では正しい）。
- ServiceNow の core_company / cmn_department（parent 参照による階層）の公式説明は未取得。コミュニティ情報（role は子へ継承、メンバーは親へ集約されるとの記述）は一次情報でないため不採用。

## Q7. 横断的教訓: 「どこに属すか（containment）」「誰が属すか（membership）」「誰が管理するか（admin scope）」の分離

### Takeaway
主要基盤はほぼ例外なく、containment を「単一親・深さ制限付きツリー」とし、ポリシー/権限の継承経路として使う一方、membership（n:n グループ）と管理委任スコープ（AU 等）を別エンティティに分けている。ID は親パスを含まない不変値とし、位置は parent 属性/派生パスとして別管理するのが主流（LDAP DN は反例）。

### Cited Findings
- 単一親: GCP（「exactly one parent」）[Create folders](https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders)、Azure MG（「only one parent」）[MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)、AWS（MoveAccount が単一の source parent を前提）[MoveAccount](https://docs.aws.amazon.com/organizations/latest/APIReference/API_MoveAccount.html)、HNC [HNC concepts](https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/docs/user-guide/concepts.md)、LDAP [RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html)
- 深さ制限: GCP folder 10 / 直下 300 [Create folders](https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders)、AWS OU 5 [Quotas](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html)、Azure MG 6（root・subscription 除く）[MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)、K8s namespace は 1（ネスト不可）[Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- ノード型: 3クラウドとも「型付き端点（project/account/subscription）＋汎用の再帰コンテナ（folder/OU/MG）＋唯一の root（organization/root/tenant root group）」という同型構造（各出典上記）
- Membership の分離と入れ子の扱い: AWS Identity Center はネスト不可 [IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/users-groups-provisioning.html)、Entra はネスト可だが効果は機能依存 [Entra groups](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups)、Salesforce は入れ子可だが性能コスト [Salesforce](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-sharing-architecture.html)、ServiceNow は子メンバー≠親メンバー [ServiceNow](https://www.servicenow.com/docs/r/platform-administration/user-administration/t_CreateAGroup.html)
- Admin scope の分離: Entra AU はフラット・多重所属・管理権限のみ制限 [Administrative units](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units)
- 横断属性: GCP Tags（継承あり、IAM 条件可）vs Labels（継承なし）[Tags overview](https://cloud.google.com/resource-manager/docs/tags/tags-overview)、Azure Tags は first-class grouping ではなく Service Group がスコープ横断グルーピング [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)、K8s labels [Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- 移動の意味論: GCP は直接付与ロールは保持・継承ロール/ポリシーは移動先のものに置換 [Migrate projects](https://cloud.google.com/resource-manager/docs/project-migration)、Azure は現親・新親双方の write 権限と権限喪失・ロール定義断絶のチェック、階層キャッシュ最大30分 [MG overview](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)、AWS は source/destination 明示 [MoveAccount](https://docs.aws.amazon.com/organizations/latest/APIReference/API_MoveAccount.html)、LDAP は DN が変わる [RFC 4511](https://www.rfc-editor.org/rfc/rfc4511.html)

### Inferences
- 設計指針候補: (a) containment は単一親ツリー＋明示的な深さ上限＋書き込み時のサイクル検査（HNC の教訓: 外付けでなくストア側で原子的に）、(b) ID は不変・親非依存、位置は parent_id と派生パス（AWS Paths、HNC depth labels）で表現、(c) membership は別エンティティの n:n、入れ子の推移性は明示的に定義（あるいは禁止）、(d) 管理委任スコープは containment と独立した集合（AU 型）として持てるようにする、(e) 横断属性は継承有無を区別（GCP Tags vs Labels）、(f) 移動は「直接付与は保持・継承分は再計算」を明文化し、移動元・移動先双方の権限を要求、楽観的並行制御（source parent 指定）を入れる。
- Salesforce の複数階層併存（role＋territory）は「単一ツリーに組織の全側面を押し込まない」ことの必要性と、併存時の再計算コストの両面を示す。

### Gaps
- 各基盤の階層変更イベント（監査ログ/通知）や、深さ上限の設計理由に関する公式説明は未取得。
