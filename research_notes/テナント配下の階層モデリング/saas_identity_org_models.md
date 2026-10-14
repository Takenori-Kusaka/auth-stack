# SaaS identity/collaboration プラットフォームの org / sub-org / team / group モデルとトークン claim

調査日: 2026-10-15。一次情報（ベンダ公式 docs / RFC）を優先。「[未検証]」は本調査で一次ソースの本文を確認できなかった記述。

## Q1. GitHub: enterprise → organization → team、継承、EMU、org 移管

### Takeaway
GitHub は「enterprise（課金・ポリシー境界）→ organization（可視性・メンバー境界）→ team（権限付与単位、単一親の木構造）」の3層。team はネストでき、子は親の権限を継承する（下方継承）。enterprise teams は組織横断だがネスト不可。org は enterprise 間で移管できるが、EMU enterprise は対象外。

### Cited Findings
- 「A parent team can have multiple child teams, while each child team only has one parent team. You cannot nest secret teams.」— 単一親の木構造、secret team はネスト不可 — [GitHub Docs: About organization teams](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)
- 「Child teams inherit the parent's access permissions」、親が @mention されると子チームメンバーにも通知。各 nested team は独自の URL を持つ — [同上](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)
- Team は visible / secret、組織外の人はチームを一切見られない。GHEC では IdP group と team sync で自動加除可能 — [同上](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)
- Enterprise teams: enterprise 単位で管理し、複数 org にまたがるユーザを含められる。上限は enterprise あたり 2,500 チーム、1チーム 5,000 ユーザ、1チームの割当先 org 最大 1,000。未サポート: nested teams、secret teams、CODEOWNER、team maintainers 等。mention 形式は `@octo-org/ent:platform-sre` — [GitHub Docs: Teams in an enterprise](https://docs.github.com/enterprise-cloud@latest/admin/concepts/enterprise-fundamentals/teams-in-an-enterprise)
- GitHub は「enterprise account または複数 org に関わる用途には enterprise teams を推奨」、org teams は単一 org スコープ用途向け — [同上](https://docs.github.com/enterprise-cloud@latest/admin/concepts/enterprise-fundamentals/teams-in-an-enterprise)
- Enterprise team に org アクセスを与えると、メンバーは招待なしで直接その org に追加される。EMU なら enterprise team を IdP group と SCIM で同期可能 — [GitHub Docs: Creating enterprise teams](https://docs.github.com/enterprise-cloud@latest/admin/managing-accounts-and-repositories/managing-users-in-your-enterprise/create-enterprise-teams)
- Org 作成は慎重に: 「It's always easier to add organizations than to remove them」、@-mention は同一 org 内のみ、少数の org から始めることを推奨 — [GitHub Docs: Best practices for organizing work in your enterprise](https://docs.github.com/enterprise-cloud@latest/admin/concepts/enterprise-best-practices/organize-work)
- 「minimize the number of organizations」。完全に隔離が必要なら別 org が安全。enterprise メンバーは enterprise 内の全 org の名前と存在を常に見られる — [GitHub Blog: Best practices for organizations and teams using GHEC](https://github.blog/enterprise-software/devops/best-practices-for-organizations-and-teams-using-github-enterprise-cloud)
- Org 移管（M&A/再編）: enterprise owner は両 enterprise の owner であれば enterprise 間で org を移管できる。ただし EMU enterprise との間、および trial 中の enterprise では不可。billed apps は事前削除が必要。データレジデンシー（GHE.com）との間は移管不可で GitHub Enterprise Importer による移行が必要 — [GitHub Docs: Adding organizations to your enterprise](https://docs.github.com/enterprise-cloud@latest/admin/managing-accounts-and-repositories/managing-organizations-in-your-enterprise/adding-organizations-to-your-enterprise)
- セルフサービスの enterprise 間 org 移管は 2022-11-01 にリリース — [GitHub Changelog](https://github.blog/changelog/2022-11-01-transfer-organizations-between-ghec-enterprise-accounts)
- EMU: ユーザ名は `@IDP-USERNAME_SHORTCODE` 形式（例 `mona-cat_octo`）で、IdP が提供する識別子を正規化して生成。setup user は `SHORTCODE_admin` — [GitHub Docs: Username considerations](https://docs.github.com/enterprise-cloud@latest/admin/managing-iam/iam-configuration-reference/username-considerations-for-external-authentication)
- EMU でユーザが IdP 側で解除されるとアカウントは無効化され、ユーザ名は元ユーザ名のハッシュ（+shortcode）に変更される — [GitHub Docs: Configuring SCIM provisioning for EMU](https://docs.github.com/enterprise-cloud@latest/admin/managing-iam/provisioning-user-accounts-with-scim/configuring-scim-provisioning-for-users)
- IdP/テナント移行時: 認証を無効化→メンバー suspend、SCIM identity と SCIM 由来 IdP group を削除→新 IdP から再プロビジョニング。正規化した SCIM `userName` と既存 GitHub ユーザ名（`_shortcode` 前部分）を突合して既存アカウントに再リンク — [GitHub Docs: Migrating your enterprise to a new IdP or tenant](https://docs.github.com/enterprise-cloud@latest/admin/managing-iam/reconfiguring-iam-for-enterprise-managed-users/migrating-your-enterprise-to-a-new-identity-provider-or-tenant)

### Inferences
- GitHub は「単一親の木（team）」＋「組織横断のフラット集合（enterprise team）」を併存させており、階層と横断グルーピングを別概念に分けている。
- EMU のテナント移行は「ユーザ名（正規化済み外部 ID）による再リンク」に依存しており、外部 ID の安定性が M&A/IdP 切替の要。

### Gaps
- nested team の最大深さの公式上限は本調査で確認できず [未検証]。
- GitHub は org/team 情報を OIDC トークンに載せる IdP ではない（GitHub Actions OIDC の `repository_owner` 等は対象外として未調査）。

## Q2. Atlassian: organization, sites (cloudId), groups, teams

### Takeaway
Atlassian は「organization（管理境界、Organization ID）→ site/app（cloudId）」の2層で、権限用の groups と、協働用の teams（通常 / Official / group・SCIM・HRIS 同期）を分けている。

### Cited Findings
- Cloud ID は各 Atlassian Cloud site（instance）の一意 ID で、`api.atlassian.com` の API リクエストに必要。Organization ID は「複数 Cloud site/製品のグルーピング」を指し別物。Org ID を使うと 404 になる — [Atlassian Support: Manage API tokens for service accounts](https://support.atlassian.com/user-management/docs/manage-api-tokens-for-service-accounts)
- Cloud ID は `/_edge/tenant_info` エンドポイント、または admin.atlassian.com の URL の `/s/` 以降で確認できる — [Atlassian Support: How to find your Cloud ID](https://support.atlassian.com/jira/kb/retrieve-my-atlassian-sites-cloud-id)
- Organizations REST API には Orgs / Directory / Users / Groups / Domains / Events / Policies / Workspaces のリソース群がある — [Atlassian Developer: Organizations REST API](https://developer.atlassian.com/cloud/admin/organization/rest)
- Team の種類: 誰でも作れる「Teams」（open / closed membership）と、org admin のみ作成・管理できる「Official teams」（青いチェックマーク）。Teams は同一 organization 内のアカウントにのみ可視 — [Atlassian Support: What is an Atlassian team?](https://support.atlassian.com/platform-experiences/docs/what-is-an-atlassian-team)
- group に接続された team は group とメンバー同期し、group 外の人は追加不可。SCIM/HRIS 同期 team は外部ディレクトリでのみ変更可能 — [Atlassian Support: Create and manage an Atlassian team](https://support.atlassian.com/platform-experiences/docs/start-an-atlassian-team)
- Atlassian 自身が「レポートライン（HRIS 同期）を表す team」と「権限付与用の group 同期 team」を team type で区別することを提案 — [Atlassian Support: What are team types?](https://support.atlassian.com/platform-experiences/docs/what-are-team-types)
- 注意: Jira Service Management の「organizations」は顧客のグルーピングで、Atlassian organization とは別概念 — [Atlassian Support: Group customers into organizations](https://support.atlassian.com/jira-service-management-cloud/docs/group-customers-into-organizations)
- データレジデンシーは app 単位で設定、project/user 単位では不可 — [Atlassian Support: Understand data residency](https://support.atlassian.com/security-and-access-policies/docs/understand-data-residency)

### Inferences
- 「組織図（reporting line）」と「アクセス制御用グループ」を同じ entity で兼用せず、type で区別する設計は参考になる。
- 同じ "organization" という語が製品内で異なる意味を持つ（admin org vs JSM customer org）ため、命名衝突に注意。

### Gaps
- Atlassian の groups がネストできるか、group 数上限、OAuth トークンに org/group claim を載せるかは本調査で一次確認できず [未検証]（Atlassian の 3LO トークンは accessible-resources API で cloudId を引く方式という理解だが本調査未確認）。

## Q3. Microsoft Entra: tenant (tid)、groups（ネスト、overage）、administrative units、multi-tenant organization

### Takeaway
Entra はテナント（tid）を最上位境界とし、テナント内は group（ネスト可）と administrative unit（ネスト不可、管理委任スコープ）に分離。トークンの groups claim は JWT 200 / SAML 150 を超えると overage claim に置き換わり Graph 照会が必要。M&A/複数テナント統合は「テナントを統合せず」multi-tenant organization + cross-tenant sync で B2B ユーザを同期するのが公式パターン。

### Cited Findings
- groups claim のオブジェクト ID 数は HTTP ヘッダサイズ制限のため制限される。上限超過（SAML 150、JWT 200）では groups claim を省き、Graph でメンバーシップを取得すべきことを示す overage claim（`_claim_names` / `_claim_sources`）を入れる — [Microsoft Learn: ID token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- `oid` と `sub` はテナントごとに意図的に変わる（テナント横断追跡防止）。ゲスト（他テナントでホームされたユーザ）は「新規ユーザとして扱う」べき、`idp` claim でテナント横断の相関を取ってはいけない — [同上](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- トークンに出る group 数（200 JWT / 150 SAML）は nested groups を含む。`groupMembershipClaims` に `ApplicationGroup` を設定するとアプリに割り当てた group のみに絞れ、`cloud_displayname` で表示名を出せる — [Microsoft Learn: Configure optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims)
- group フィルタリングはユーザの所属が 1,000 group 以下（直接＋推移）の場合のみ機能、超過時はフィルタされず overage。Conditional Access の評価は 4,096 group まで。SharePoint では 2,047 セキュリティグループまで。group のネストは可能で、group membership claims にはユーザが所属する nested groups が含まれる — [Microsoft Learn: Service limits and restrictions](https://learn.microsoft.com/en-us/entra/identity/users/directory-service-limits-restrictions)
- 「group information in the token is current only when you receive the token」（staleness）。`groups` はグループ ID 配列、`wids` は割り当てられた Entra ロール（テンプレート ID）配列 — [Microsoft Learn: Configure group claims and app roles in tokens](https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles)
- Administrative unit (AU): users/groups/devices のみを含むコンテナで、ロールの管理スコープを限定。「Administrative units can't be nested」。ユーザは複数 AU に所属可。group を AU に入れても group のメンバーは管理スコープに入らない。AU は管理権限のスコープのみで閲覧は制限しない。半自律の suborganization を AU で表す案を公式に例示 — [Microsoft Learn: Administrative units](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units)
- Multi-tenant organization (MTO): 1テナントは1つの MTO にのみ参加可。CSP と顧客テナント間では不可。active owner tenant が最低1つ必要。active tenant 上限 100（サポート申請で引き上げ可）。最後の owner が抜けると MTO 削除 — [Microsoft Learn: What is a multitenant organization](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/multi-tenant-organization-overview)
- Cross-tenant synchronization: B2B collaboration ユーザと group をテナント間で作成・更新・削除する一方向同期。target 側で inbound 許可が必要 — [Microsoft Learn: What is cross-tenant synchronization](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview)
- Cross-tenant sync は内部属性 `alternativeSecurityIdentifier` で source の内部ユーザと target の B2B ユーザを一意に突合し、既存 B2B ユーザを更新して1人1アカウントを維持。ただし target 側の内部ユーザ（member/guest）とは突合できない — [同上](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview)
- トポロジ: hub-and-spoke、mesh、just-in-time（connected organizations / entitlement management、JV 向け）。買収後に被買収側ユーザを Contoso テナントへ B2B として provision する例。既定で `UserType` は external member — [Microsoft Learn: Collaborating production tenants guidance](https://learn.microsoft.com/en-us/entra/architecture/tenant-estate-collaborating)
- ドメインは1テナントにのみ関連付けられる（テナント間メールボックス移行の文脈）— [Microsoft Learn: Cross-tenant mailbox migration](https://learn.microsoft.com/en-us/microsoft-365/migration/cross-tenant-mailbox-migration?view=o365-worldwide)

### Inferences
- Entra は「テナント=セキュリティ・ID 名前空間境界」を固定し、テナントのマージを製品機能として提供せず、同期（複製）で連邦化する。ID（oid）はテナントごとに異なるため、統合時は ID 再マッピングが前提。
- 階層は「委任用の AU（フラット）」と「メンバーシップ用の group（ネスト可、ただしトークン上は展開されフラット化）」に分離。

### Gaps
- `tid`, `hasgroups`, `wids` の詳細定義は同 claims reference に記載あるが、本調査では抜粋全文を確認していない [部分未検証]。
- 同一テナントへの完全統合（tenant-to-tenant migration）の Microsoft 公式手順は本調査では未確認（サードパーティツール依存との理解 [未検証]）。

## Q4. Okta / Auth0 / WorkOS / Keycloak / Zitadel の org モデルと claim

### Takeaway
CIAM/B2B 系は概ね「フラットな organization + membership（ユーザは複数 org 可）」で、トークンには「選択中の1 org」だけを載せ（`org_id` 等）、切替時はトークン再発行。org 自体のネストは提供せず、内部階層は group（Keycloak 26.6 の organization groups）や project grant（Zitadel）で表す。Okta は Org を最上位とし、M&A は hub-and-spoke（Org2Org）で連邦化。

### Cited Findings
**Auth0 Organizations**
- connection model: isolated users（1ユーザ1 org）と shared users（1 identity で複数 org を移動）。member に role を割当可。Org ごとの custom domain は未サポート（別 domain が必要なら別テナント）、ROPC / Device flow / WS-Fed とは非互換 — [Auth0 Docs: Understand How Auth0 Organizations Work](https://auth0.com/docs/manage-users/organizations/organizations-overview)
- ID/access トークンは既定で `org_id` のみ。テナント設定で org 名を許可すると `org_id` と `org_name` の両方。「In general, using organization IDs is the preferred method for validating tokens」— [Auth0 Docs: Work with Tokens and Organizations](https://auth0.com/docs/manage-users/organizations/using-tokens)
- `org_name` のリスク: 名称変更で長寿命トークンの `org_name` が現名と不一致になる。名称は再利用されうるため、旧名の残るトークンが新しい別 org へのアクセスを与える危険 — [Auth0 Docs: Use Organization Names in Authentication API](https://auth0.com/docs/manage-users/organizations/configure-organizations/use-org-name-authentication-api)
- org 切替には別 `org_id` の新トークンが必要 — [Auth0 Blog: Multi-Tenant SaaS Apps with Auth0 Organizations Part One](https://auth0.com/blog/multi-tenant-saas-apps-with-auth0-organizations-part-one)（ベンダブログ）
- Auth0 Organizations のネスト（親子 org）は公式 docs 上に記載が見当たらない（本調査範囲）。

**WorkOS**
- access token claims: `sub`, `sid`, `iss`, `org_id`（サインイン時に選択した org）, `role`, `permissions`, `exp`。refresh token で `organization_id` を指定すると、その membership に対応する `org_id`/`role`/`permissions` の新 access token を取得 — [WorkOS Docs: Sessions](https://workos.com/docs/authkit/sessions)
- `org_id` のないトークンは org membership を持たないユーザ。M2M では `org_id` から Get organization で `external_id`/`metadata` を引いてマッピングを永続化し、識別子変更時に更新 — [WorkOS Docs: Access token claims](https://workos.com/docs/authkit/connect/token-claims)
- 「Your access token is a snapshot, not a live query」: role/entitlement/feature flag の claim は同じ staleness を共有。org 切替時にサーバ側キャッシュ判断を無効化しない不具合が典型 — [WorkOS Blog](https://workos.com/blog/access-token-claims-authorization)（ベンダブログ）
- organization membership で org を「workspace」としてモデル化 — [WorkOS Docs: Users and Organizations](https://workos.com/docs/authkit/users-organizations)

**Keycloak**
- Organizations（2024-06 発表、当初 technology preview）。`organization` scope を要求するとトークンに `"organization": { "orga": {} }` 形式の claim。`organization` は realm の組み込み optional client scope — [Keycloak Blog: Announcement Keycloak Organizations](https://www.keycloak.org/2024/06/announcement-keycloak-organizations)
- Keycloak 26.6.0（2026-04）で Organization Groups: org ごとに独立した group 階層、realm 内で同一パスが別 org に存在可能。IdP mapper で外部 claim から org group に自動割当 — [Keycloak 26.6.0 release notes](https://www.keycloak.org/2026/04/keycloak-2660-released)
- Organization Group Membership mapper により `{"organization": {"acme-corp": {"id": "...", "groups": ["/Engineering/Backend"]}}}` のように org 相対パスで出力。`scope=organization:org-a organization:org-b` で複数 org 指定可。org groups は Keycloak authorization policies では使えない。Admin REST `/admin/realms/{realm}/organizations/{orgId}/groups` で move を含む操作可 — [Keycloak Blog: Organization Groups](https://www.keycloak.org/2026/04/org-groups)
- realm groups: メンバーは group の attributes と role mapping を継承 — [Keycloak Server Admin Guide](https://www.keycloak.org/docs/latest/server_admin/index.html)
- 最新 upgrading guide に「group name が nested group path と混同されないようにする」変更の記述あり（full path を使う group policy は概ね影響なし）— [Keycloak Upgrading Guide](https://www.keycloak.org/docs/latest/upgrading/index.html)（抜粋のみ確認）

**Zitadel**
- 階層: Instance（仮想テナント、完全データ分離）→ Organization → Project（application と role を束ねる）。Project Grant で他 org にプロジェクトを委譲 — [Zitadel Docs: Organizations](https://zitadel.com/docs/concepts/structure/organizations)
- ユーザ名は org 内で一意、verified domain ごとに追加 login name を生成。`urn:zitadel:iam:org:id:{id}` scope で org コンテキストを指定、ユーザが選択はできない — [同上](https://zitadel.com/docs/concepts/structure/organizations)
- `urn:zitadel:iam:org:id:{id}` 要求時は当該 org のメンバーであることを強制し `urn:zitadel:iam:user:resourceowner` claim を出す — [Zitadel Docs: Scopes](https://zitadel.com/docs/apis/openidoauth/scopes)
- role claim `urn:zitadel:iam:org:project:{projectid}:roles` は role ごとに付与元 org の `id` と primary domain を含む（どの org でその role を持つか判別可）。旧形式 `urn:zitadel:iam:org:project:roles` より新形式推奨 — [Zitadel Docs: Claims](https://zitadel.com/docs/apis/openidoauth/claims); [Retrieve User Roles](https://zitadel.com/docs/guides/integrate/retrieve-user-roles)

**Okta**
- groups claim の上限: allowlist / dynamic allowlist で `limit` は 1–100（Authorization Code / PKCE フローでは任意数可）。org authorization server では groups claim は ID token のみ（access token 不可）— [Okta Developer: Static allowlist](https://developer.okta.com/docs/guides/customize-tokens-static/main); [Dynamic allowlist](https://developer.okta.com/docs/guides/customize-tokens-dynamic/main)
- M&A: hub-and-spoke。被買収側 Okta org（spoke）を親（hub）と Org2Org app で連携し、spoke のユーザ・group を hub に provision、リアルタイム profile sync（push/pull）。hub に spoke ごとの group を作成 — [Okta Help: Integrate with a company that uses Okta](https://help.okta.com/oie/en-us/content/topics/architecture/ma/ma-okta-to-okta.htm)
- Org2Org provisioning の OAuth 2.0 auto-rotation（2025 EA）。Realms にドメイン制限を追加（ユーザ集団の境界）— [Okta Identity Engine release notes 2025](https://developer.okta.com/docs/release-notes/2025-okta-identity-engine)

### Inferences
- 業界の収束点: 「トークンには active org の不変 ID 1つ＋その org での role/permission」、名前やフルメンバーシップは載せない。org 切替＝トークン再発行。
- 名前（slug/path）は可変・再利用可能なので認可キーにしない（Auth0 の明示的警告）。Keycloak の group path も move で変わる点に同様のリスク。

### Gaps
- Okta「Organizations」という B2B 製品名の機能（Okta Customer Identity の org 相当）は本調査で一次確認できず [未検証]。Okta Realms の詳細も未調査。
- Keycloak Organizations の GA 版（26.0 で supported 化と記憶）は本調査で一次確認せず [未検証]。Keycloak の org 自体のネスト可否も一次確認できず（不可と理解 [未検証]）。

## Q5. SCIM 2.0 Group と Enterprise User 拡張

### Takeaway
SCIM Group は `displayName` と `members`（User/Group 参照）のみで parent 属性はなく、ネストは「members に Group を含める」形で service provider 任意サポート。組織属性は Enterprise User 拡張の単なる文字列（organization/division/department）と manager 参照のみで階層構造は表現しない。

### Cited Findings
- Group: `displayName`（REQUIRED）と多値 `members`。members の sub-attribute は immutable、`value` は SCIM リソースの `id`、`$ref` は User または Group の URI。「The intention of the "Group" type is to allow the service provider to support nested groups.」— [RFC 7643 §4.2](https://datatracker.ietf.org/doc/html/rfc7643)
- Enterprise User 拡張 `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`: employeeNumber, costCenter, organization, division, department（いずれも名前文字列）、manager（参照）— [RFC 7643 §4.3](https://datatracker.ietf.org/doc/html/rfc7643)

### Inferences
- SCIM で組織階層を厳密に運ぶ標準手段はない。department は名称文字列なので改名で変化し ID として使えない。階層を同期したいならカスタム拡張か、ネスト Group（SP 依存）が必要。

### Gaps
- RFC 7644 の nested group PATCH 挙動や User の `groups` 属性（readOnly、直接/間接の `type`）は本調査で本文再確認せず [未検証]。

## Q6. Slack Enterprise Grid と Google Workspace（OU vs groups）

### Takeaway
Slack は「org（Enterprise）→ 無制限の workspaces」で、channel と user group が org 横断と workspace ローカルの2レベル。Google は「OU=ポリシー用の単一親ツリー（ユーザは1 OU のみ）」と「group=横断メンバーシップ（configuration/access group で OU 設定を上書き）」を明確に分離。

### Cited Findings
- Enterprise Grid は org コンテナ内に無制限の workspaces を接続し、workspace は事業部・部署・子会社単位で作られることが多い — [Slack: An introduction to Slack Enterprise Grid](https://slack.com/resources/why-use-slack/slack-enterprise-grid)
- multi-workspace channel（#general 以外）、org-wide channel は全 workspace に追加 — [Slack Help: Add a channel to multiple workspaces](https://slack.com/help/articles/115001399587-Add-a-channel-to-multiple-workspaces-in-your-Enterprise-organization)
- org-level user groups は複数 workspace へのメンバー provision に使え、workspace-level user groups は他 workspace から参照不可 — [Slack Help: Manage user groups](https://slack.com/help/articles/115004952926-Manage-user-groups-from-the-admin-dashboard)
- 既存 workspace の Enterprise org への移行（M&A 的統合）: 移行中一時利用不可、URL は org のサインインへリダイレクト、Workspace Primary Owner は Org Primary Owner に再割当、Slack Connect チャネルは org-wide multi-workspace channel 化 — [Slack Help: Migrate workspaces to an Enterprise organization](https://slack.com/help/articles/115002532808-Migrate-workspaces-to-an-Enterprise-organization)
- Google: 「A user or device belongs to only one organizational unit and inherits that organizational unit's settings.」親の変更は継承中の子に伝播、カスタム設定は維持。例外は configuration group（設定）と access group（サービス可否）で OU に関係なく適用 — [Google Workspace: How the organizational structure works](https://knowledge.workspace.google.com/admin/users/advanced/how-the-organizational-structure-works)
- OU 設定は Override / Inherit を選択、反映は最大24時間 — [Google Workspace Learning Center: Change service settings](https://support.google.com/a/users/answer/2655363?hl=en)
- 「A user's group settings always override their organizational unit's settings」、複数 group の場合は優先度最上位の group 設定 — Google 公式ドキュメント引用を含むコミュニティスレッド（[Google Workspace Admin Community](https://support.google.com/a/thread/229996036)）[二次的、要一次確認]

### Inferences
- Google のパターン（ポリシー継承は単一親ツリー、例外は優先度付きグループ）は「階層＝デフォルト継承」「グループ＝横断例外」の分離の典型。

### Gaps
- Google の OU 数上限・深さ上限、Slack の workspace 間ユーザ移動や org 分割手順は未確認。

## Q7. トークン claim の課題（サイズ・staleness）と推奨、reorg/M&A・ID 安定性パターン

### Takeaway
各社共通: トークンはスナップショットでありメンバーシップ全量は載せない（上限 Entra 200/150、Okta 100）。推奨は「不変 ID のみ」「active org 1つ」「アプリ割当 group にフィルタ」「超過時はAPI照会」「名前で認可しない」。M&A は統合よりも連邦化/同期（Entra MTO+cross-tenant sync、Okta hub-and-spoke Org2Org、GitHub org 移管）が主流で、ID はテナントごとに異なる前提で外部 ID で再リンクする。

### Cited Findings
- サイズ: Entra 200 JWT / 150 SAML（nested 含む）超過で overage — [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims); Okta groups claim limit 1–100 — [Okta Developer](https://developer.okta.com/docs/guides/customize-tokens-static/main)
- フィルタ: Entra `ApplicationGroup` でアプリ割当 group のみ — [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims)
- staleness: Entra「current only when you receive the token」— [Microsoft Learn](https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles); WorkOS「snapshot, not a live query」、API 照会結果を user×org でキャッシュし期限で反映 — [WorkOS Docs](https://workos.com/docs/authkit/connect/token-claims)
- 名前非推奨: Auth0 `org_name` 改名・再利用リスク、ID 検証推奨 — [Auth0 Docs](https://auth0.com/docs/manage-users/organizations/configure-organizations/use-org-name-authentication-api)
- テナント別 ID: Entra `oid`/`sub` はテナント間で変わる — [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- M&A: Entra MTO（≤100 テナント、1テナント1 MTO）+ cross-tenant sync（`alternativeSecurityIdentifier` 突合）— [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/multi-tenant-organization-overview); Okta hub-and-spoke — [Okta Help](https://help.okta.com/oie/en-us/content/topics/architecture/ma/ma-okta-to-okta.htm); GitHub enterprise 間 org 移管（EMU 除外）— [GitHub Docs](https://docs.github.com/enterprise-cloud@latest/admin/managing-accounts-and-repositories/managing-organizations-in-your-enterprise/adding-organizations-to-your-enterprise); Slack workspace→org 移行 — [Slack Help](https://slack.com/help/articles/115002532808-Migrate-workspaces-to-an-Enterprise-organization)
- Reorg（ノード移動）: Keycloak org groups は REST で move 可能、パスは org 相対 — [Keycloak Blog](https://www.keycloak.org/2026/04/org-groups); Google OU は移動するとその OU の継承設定に従う（単一所属）— [Google Workspace](https://knowledge.workspace.google.com/admin/users/advanced/how-the-organizational-structure-works)

### Inferences
- path（`/Engineering/Backend`）を claim に載せる方式は reorg で値が変わるため、認可キーには不変 ID を使い path は表示/補助用に留めるのが安全。
- 「tenant の merge」を一級機能として提供するベンダは見当たらず、いずれも移管（GitHub org 単位）か同期（Entra/Okta）。split も同様に「org 単位で別 enterprise/テナントへ移す」粒度が前提となっている。

### Gaps
- テナント split（1テナントを2つに分割）の公式手順はどのベンダでも本調査では見つからなかった。
- Entra で group を AU 間/テナント間で移した際の objectId 安定性の明文は未確認 [未検証]。
