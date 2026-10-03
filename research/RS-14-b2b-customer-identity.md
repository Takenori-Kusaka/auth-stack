# RS-14 B2B 顧客向け ID 機能（顧客 SSO・domain verification・SCIM・委任管理・顧客監査 API・テナント越境）

> 文書ID: RS-14 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-013, R-129, R-130, R-131, R-132, R-133, R-134, R-135（主）／R-036, R-037, R-038, R-039, R-040, R-044, R-047, R-048, R-065, R-166, R-172（従）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md, traceability/seed/seed-03-redteam-decision.md
> 注記1: 種資料（seed-01〜03）は問いの手掛かりとしてのみ使い、本文の根拠には使っていない。根拠はすべて末尾の原典脚注である。
> 注記2: 本ノートの調査・起草には AI エージェント（Claude）を用いた。原典は 2026-10-03 に取得し、規範文の強度（MUST/SHOULD/SHALL/MAY）は原文から写した。
> 注記3: traceability/deliverables.md（同日作成）は RS-14 を「build/buy・製品・出口」（DL-98）に割り当てているが、本ノートは作業指示どおり RS-14 を「B2B 顧客向け ID 機能」として作成した。ID の整合は §6 の未解決事項に記載する。
> 注記4: 版 0.2 は作成者以外による独立検証（全脚注の原典照合、2026-10-03）の結果を反映した。判定と修正内容は research/verification/RS-14-verification.md に記録した。

## 1. 調査の問い

種資料由来の問い（括弧内は対応 R-ID または種資料の箇所）:

1. B2B SaaS の顧客管理者機能は、なぜ主要攻撃面になるのか。どの管理操作が攻撃者の到達点になったか（R-135、seed-03 §7）。
2. 顧客企業の SSO（SAML/OIDC）の onboarding・offboarding で、どの信頼条件（trust agreement の条項）を定め、何を検証すべきか（R-129、R-130、seed-02 1-5）。
3. domain verification（DNS TXT）の方式と、ドメインの失効・移転時の再検証をどう設計するか（R-131、seed-02 1-7）。
4. SCIM による provisioning／deprovisioning の競合・遅延と、JIT provisioning との衝突をどう扱うか（R-040、R-132、seed-02 1-7）。
5. delegated admin（顧客管理者・パートナー管理者）の権限境界をどう切るか（R-133）。
6. 顧客向け監査ログ API で何を、どの保持期間・遅延で提供すべきか（R-134）。
7. 顧客 IdP が侵害されたときの責任分界をどう契約条項にするか（R-013）。
8. ゲスト・外部共有・組織間連携など、テナントを越える正当な共有をどうモデル化するか（seed-03 §7 の 8）。

本調査で追加した問い:

9. 顧客が設定できるセキュリティ機能の業界ベースライン（CSA SSCF）は何を要求し、本基盤のセキュリティ方針とどこで衝突するか。
10. email・userName などの可変・再利用可能な識別子は B2B でどう悪用されたか。何を不変の結合キーにすべきか。
11. 企業向け相互運用プロファイル（IPSIE）、SCIM events、Shared Signals の標準化状態はどこまで進み、20 年計画の採否判断に何が使えるか。
12. SaaS 事業者自身（support・運用要員）による顧客テナントへのアクセスを、顧客にどう見せ、どう統制するか。

## 2. 結論サマリ

1. 顧客管理者の権限で実行できる「外部 IdP の追加」「自動 account linking の有効化」「MFA のリセット」は、テナント内の他利用者へのなりすましに直結し、実際の攻撃で使われた [I][^5][^6]。
2. OIDC Core は iss と sub の組だけを安定識別子とし、email・preferred_username を一意識別子に使うことを MUST NOT としている [N][^1]。Microsoft は tid と oid の組を結合キーに使うよう推奨している [V][^3]。email は再割当てされ得る [N][^1]。email などの claim は顧客テナント管理者が値を制御できる場合がある [V][^3]。SCIM の userName は削除後に再利用され得る [N][^8][^10]。したがって、結合キーは発行者と subject の組に限り、email・preferred_username・userName を結合や認可に使わない設計にすべきである [D]（RS-14#1〜#3, #10 から）。
3. IdP の追加・変更・証明書更新・linking 規則の変更は「保護操作」として、実行時の phishing-resistant 再認証、通知、監査記録を課すべきである [D]（RS-14#6〜#8, #44 から）。同種の統制は Microsoft Entra の protected actions と Okta の推奨事項に見られる [V][^25][^6]。
4. 顧客 IdP は信頼の起点であり、IdP への攻撃は依存する RP に波及する [N][^2]。SP 800-63C-4 の FAL3 は RP 側で追加認証を要求し、侵害された IdP への対策と位置付けている [N][^2]。顧客管理者操作など高リスク操作に限って FAL3 相当を適用する選択肢を ADR-002 で比較すべきである [D]（RS-14#16, #60 から）。
5. SP 800-63C-4 は trust agreement に定めるべき条項（対象母集団、xAL、provisioning model、shared signaling のトリガと受信側の期待挙動、redress、データ保持）を SHALL で列挙している [N][^2]。これを顧客契約とオンボーディング様式の骨格に写せる [D]（RS-14#11〜#13 から）。
6. DNS による domain verification は、IETF の BCP 草案（未 RFC）が one-off 型と persistent 型を区別し、persistent 型では再検証頻度の明示を MUST としている [N][^15]。主要 SaaS の扱いは定期再確認する方式（Atlassian）と、検証後に TXT を削除してよいとする方式（Google Workspace、GitHub）に分かれる [V][^16][^17][^18]。
7. SCIM 2.0 では楽観的排他制御（ETag／If-Match）が MAY であり、マルチテナントの方式も規定外である [N][^8]。競合解決規則とテナント結合は本基盤側で定義する必要がある [D]（RS-14#31〜#33 から）。
8. 企業向け SCIM プロファイル草案（IPSIE AL SCIM Draft 00）は、無効化の伝播と失効を 5 分以内（SHOULD）、無効化時の全アクセス手段（session、refresh token、PAT、SSH 鍵ほか）の失効を MUST としている [N][^10]。ただし草案であり、数値契約の根拠としては暫定扱いにとどめる [D]（RS-14#36, #37 から）。
9. 顧客向け監査ログの最低線は、SSCF が保持 7 日・配信 24 時間以内、CSRB と CISA が無償で 6 か月保持であり、差が大きい [N][^12][I][^32][N][^33]。CSRB は事業者自身によるアクセスもログ対象に含めるよう勧告している [I][^32]。
10. SSCF は SAML の IdP-initiated フロー対応を必須（must）とする [N][^12]。一方、SAML の unsolicited response は InResponseTo を持てない [N][^11]。SP 800-63C-4 は FAL2 で、assertion injection 攻撃からの強い保護と、RP による federation transaction の開始を SHALL としている（§2.3）[N][^2]。同 §3.11.1 は IdP-initiated の禁止を対策例に挙げ、IdP などの外部当事者が RP に federation の開始を促す方式はこの禁止に含まれないとしている [N][^2]。このため IdP-initiated の採否と代替方式を ADR-004 で明示する必要がある [D]（RS-14#18〜#20 から）。
11. 主要製品のテナント越境モデルは、ゲストアカウント型、アカウントを作らない相互信頼型、同期型、共有チャネル型に分かれる [V][^41][^36][^22][^43]。いずれも resource 側に受入を制御する設定がある [V][^36][^44]。相互信頼型と同期型は resource 側での明示的な有効化が必要で、相互信頼型は既定で無効である [V][^36][^22]。一方、Entra のゲスト招待型（B2B collaboration）は既定で全外部 Entra 組織に対して有効である [V][^36]。
12. Microsoft の責任共有モデルは SaaS でも「Identities and users」を顧客責任としている [V][^39]。一方、GDPR は処理者との契約に役務終了後の削除・返却と監査への協力を定めるよう求め（第 28 条第 3 項）、処理者に侵害の通知義務を課す（第 33 条第 2 項）[N][^23]。DORA は金融機関に、ICT 第三者事業者との契約へインシデント時の支援、終了権、出口戦略を含めるよう求める（第 30 条）[N][^24]。個人情報保護法は委託元に委託先の監督を義務付け（第 25 条）、委託先が委託元に通知した場合を報告義務の例外とする（第 26 条第 1 項ただし書）[N][^40]。顧客契約は「顧客 IdP の運用と一次対応は顧客」「検知・通知・封じ込め支援・証跡提供は事業者」と分ける案になる [D]（RS-14#60〜#66 から）。
13. 事業者の support 経路そのものが顧客テナント侵害の経路になった事例がある（support 系に保存された HAR ファイル内の session token を使い 5 社の session が乗っ取られた）[I][^30]。事業者アクセスの統制と顧客への開示を設計対象に含める必要がある [D]（RS-14#48, #51, #53 から）。

## 3. 調査結果

### 3.1 識別子と account linking

**RS-14#1** OIDC Core は、RP が利用者の安定識別子として依拠できるのは iss と sub の組だけであり、email・phone_number・preferred_username・name を一意識別子に使うことを MUST NOT としている [N][^1]。発行者が同じ email 値を時期を変えて別の利用者に再割当てすること（MAY）と、利用者の email が変わること（MAY）も明示しており、email claim の一意性に依拠することを MUST NOT としている（§5.1）[N][^1]。
> "Therefore, other Claims such as email, phone_number, preferred_username, and name MUST NOT be used as unique identifiers for the End-User"（§5.7）

**RS-14#2** SP 800-63C-4 は、federated identifier を発行者と subject の複合とする理由として IdP 間の subject 衝突を挙げ、RP は発行 IdP を考慮せずに subject を処理してはならないとしている [N][^2]。この箇所は SHALL 文ではなく、"imperative" という表現である [N][^2]。
> "it is imperative that an RP never process the subject identifier without accounting for the IdP that issued the subject identifier."（§3.4）

**RS-14#3** Microsoft は、email・preferred_username・unique_name を保存や認可判定に使わないよう警告している [V][^3]。理由として、これらは一意でなく、テナント管理者や利用者が値を制御できる場合がある点を挙げ、tid と oid の組を結合キーに使うよう推奨している [V][^3]。さらに、token の tid がデータ保存先テナントの ID と一致することを常に確認し、あるテナントのデータを別テナントから参照させないよう求めている [V][^3]。
> "These claims aren't unique and can be controllable by tenant administrators or sometimes users, which make them unsuitable for authorization decisions."

**RS-14#4** SP 800-63C-4 は account linking について、すべての linking 機能に認証済み session を要求すること（SHALL）、既存の federated identifier による認証を経ること（SHOULD）、除去された federated identifier からのアクセスを拒否すること（SHALL）を定めている（§3.8.1）[N][^2]。federated identifier を持たない既存情報との account resolution では、要求属性が利用者を一意に解決できることを確認し（SHALL）、別人の federated identifier と結び付けない設計にすること（SHALL）を求めている（§3.8.2）[N][^2]。
> "the RP SHALL require an authenticated session with the subscriber account for all linking functions."（§3.8.1）

**RS-14#5** Okta の外部 IdP 連携で自動 linking（AUTO）を選ぶと、IdP から渡された username（email）と既存利用者の username の一致で結合される [V][^4]。Okta は自動 linking の対象から管理者を除外するフィルタ（Auto-link filters の Exclude admins、Early Access と表示）を提供している [V][^4]。また、既存利用者の linking が済んだら自動 linking の無効化を検討するよう、セキュリティ上のベストプラクティスとして勧めている [V][^4]。B2B・マルチテナント用途では username を正規表現（email suffix 等）で制限する設定を選ぶよう案内している [V][^4]。
> "For security best practices, consider disabling account linking after all existing users from the external IdP have signed in to your Okta org."

**RS-14#6** CISA 等の共同勧告 AA23-320A によると、Scattered Spider は過去に標的組織の SSO テナントへ federated IdP を追加し、自動 account linking を有効化していた（MITRE T1484.002）[I][^5]。同勧告は、IT help desk への電話によるパスワード・MFA のリセット誘導も記している [I][^5]。なお同勧告は、IdP 追加と自動 linking の手口について、現在も使われている可能性はあるが現行の TTP としては確認されていないと付記している [I][^5]。
> "Historically, the threat actors added a federated identity provider to the targeted organization's SSO tenant and activated automatic account linking [T1484.002]."

**RS-14#7** Okta の Defensive Cyber Operations の報告（2023-08-31）によると、複数の顧客で service desk が高権限利用者の全 MFA をリセットするよう誘導された [I][^6]。攻撃者は奪取した Super Administrator 権限で 2 つ目の IdP を「impersonation app」として構成し、source 側 IdP の username を target 側の実在利用者に一致させてなりすました [I][^6]。
> "manipulated the username parameter for targeted users in the second 'source' Identity Provider to match a real user in the compromised 'target' Identity Provider."

**RS-14#8** 同報告（改訂 1.2、2024-03-08 版）は予防策として、phishing-resistant 認証の強制、機微な管理操作時に再認証を強制する Protected Actions、管理者の常時特権の排除と高権限ロールへの JIT 昇格時の二者承認、最小権限のカスタム管理ロール、管理アプリへの ASN／IP session binding を挙げている [V][^6]。検知手段として、IdP 作成イベント（system.idp.lifecycle.create）と全 factor リセットの監視を挙げている [V][^6]。このうち Protected Actions と ASN／IP session binding の推奨は、初版（2023-09-01 公開）ではなく改訂 1.2（2024-03-08）で追加されたと同報告の Change Log に記されている [V][^6]。

**RS-14#9** OpenID RISC 1.0 は「identifier-recycled」イベントを定義しており、subject の識別子（email または phone）が再利用され、別の利用者のものになったことを通知できる [N][^7]。
> "Identifier Recycled signals that the identifier specified in the subject was recycled and now it belongs to a new user."（§2.6）

**RS-14#10** SCIM では、削除済み User と同じ userName での新規作成を 409 で拒否すべきでない（SHOULD NOT）とされている [N][^8]。IPSIE AL SCIM 草案も、削除後に同じ username の利用者を作成できることを MUST としている [N][^10]。よって userName は時間をまたいで一意とは限らない [D]（RS-14#10 の両原典から）。
> "a CREATE request for a User resource with the same userName as the previously deleted resource SHOULD NOT fail with a 409 error due to userName conflict."（RFC 7644 §3.6）

### 3.2 顧客 IdP との federation（onboarding・信頼条件）

**RS-14#11** SP 800-63C-4 は、すべての federation transaction が trust agreement に従うこと、trust agreement が対象となる利用者の母集団を定義すること、期待・許容する IAL/AAL/FAL を定めること、redress の仕組みを定めること、データ保持方針を宣言することを、いずれも SHALL としている [N][^2]。企業内のように所有者が同一でも trust agreement の確立は必要で、その場合は内部手続でよいとしている [N][^2]。
> "All federation transactions SHALL be governed by the terms of one or more trust agreements between the applicable parties."（§3.5）

**RS-14#12** 事前確立型の trust agreement では、IdP が RP に提供できる属性、属性の出所、identity API、IdP が assertion を発行できる母集団、RP が要求できる属性とその目的、RP の provisioning model、属性開示を判断する authorized party、提供・要求する xAL を定めることが SHALL である [N][^2]。shared signaling を使う場合は、送信トリガ、トリガごとの signal、signal の内容、受信側の期待挙動も SHALL である [N][^2]。trust agreement は定期的に見直す（SHALL）[N][^2]。
> "The trust agreement SHALL be reviewed periodically to ensure that it is still fit for purpose"（§4.3.1）

**RS-14#13** SP 800-63C-4 は、企業利用では属性開示の authorized party は組織であり、組織が全利用者に代わって判断し、その判断を allowlist で表すことを想定している [N][^2]。§9.5 の例（informative）は、IdP と RP の pairwise な合意、SCIM による事前 provisioning、FAL2 の back-channel、IdP 側でアカウントが終了したときの即時連携を組み合わせた企業向け SSO を示している [N][^2]。
> "For enterprise scenarios, the authorized party is expected to be the organization."（§3.3.2）

**RS-14#14** RP が IdP の allowlist を持つ場合、IdP を FQDN・暗号鍵などで一意に識別すること（SHALL）、wildcard の domain 識別子を使わないこと（SHALL NOT）、できるだけ具体的にすること（SHOULD）が求められる [N][^2]。
> "An allowlist entry for an IdP SHALL NOT use a wildcard domain identifier."（§4.6.2.1）

**RS-14#15** 識別子と鍵の更新手順は trust agreement で定め、認証された保護チャネルで実行すること（SHALL）、共通鍵を使う場合は federation 参加者の組ごとに一意にすること（SHALL）が求められる [N][^2]。顧客管理者による SAML 署名証明書の差替えは、この「鍵更新」に当たる [D]（RS-14#15 から）。
> "The allowable update process for any identifiers and cryptographic keys SHALL be defined by the trust agreement and SHALL be executed using an authenticated protected channel"（§3.6.1）

**RS-14#16** FAL3 は、RP が assertion に加えて利用者による認証器の保持を確認すること（SHALL）を要求し、侵害された IdP への対策と位置付けられている [N][^2]。FAL3 では trust agreement の事前確立と、CSP・IdP・RP の識別子の手動確立が SHALL である [N][^2]。RP が管理する bound authenticator を追加・削除したときは、RP が利用者に out-of-band で通知すること（SHALL）と、shared signaling で IdP に通知すること（SHOULD）が求められる（§3.16）[N][^2]。利用者持込みの認証器を結び付ける binding ceremony の session は 5 分以内に timeout させること（SHALL）が求められる（§3.16.2）[N][^2]。
> "FAL3 also protects against the possibility of a compromised IdP by requiring additional authentication by the subscriber at the RP."（§2.4）

**RS-14#17** federation proxy（上流に対しては RP、下流に対しては IdP として振る舞う構成）には、それぞれの役割について IdP・RP の全規範要求が適用される（SHALL）[N][^2]。共通認証基盤が顧客 IdP と約 300 のマイクロサービスの間に立つ構成はこれに当たる [D]（RS-14#17、CONVENTIONS §7 の暫定前提から）。
> "all normative requirements that apply to IdPs and RPs SHALL apply to proxies in their respective roles on each side."（§3.3.3）

**RS-14#18** assertion injection 対策は全 FAL で推奨、FAL2 以上で必須である [N][^2]。具体策として、RP からの nonce、back-channel での RP 認証、RP が federation transaction を開始して状態を追跡する方法が挙げられている [N][^2]。§3.11.1 はさらに、一般的なベストプラクティスの例として IdP-initiated の federation 処理の禁止を挙げている [N][^2]。ただし、IdP や federation authority などの外部当事者が RP に federation の開始を促し、RP が自ら federation transaction を始めて応答を待つ処理は、この禁止に含まれないと明記している [N][^2]。FAL2 の要件（§2.3）は、assertion を injection 攻撃から強く保護すること（SHALL）と、federation transaction を RP が開始すること（SHALL）を定めている [N][^2]。
> "Protection from assertion injection attacks is recommended at all FALs and required at FAL2 and above."（§3.11.1）
> "The federation transaction SHALL be initiated by the RP."（§2.3）

**RS-14#19** SAML 2.0 Web Browser SSO Profile は、IdP が事前の AuthnRequest なしに unsolicited な Response を送ること（MAY）を認める一方、その Response は InResponseTo 属性を持ってはならない（MUST NOT）としている [N][^11]。POST binding では assertion に署名し（MUST）、SP が bearer assertion の再利用を防ぐ（MUST）ことが求められる [N][^11]。
> "An unsolicited <Response> MUST NOT contain an InResponseTo attribute"（§4.1.5）

**RS-14#20** CSA SSCF は SAML または OIDC による federated authentication への対応を要求し、SAML を使う場合は IdP-initiated と SP-initiated の両フローに対応すること（must）としている [N][^12]。RS-14#18・#19 と合わせると、SSCF に適合させるには、IdP-initiated の受信口を残しつつ assertion injection 対策をどう満たすかを設計で示す必要がある [D]（RS-14#18〜#20 から）。
> "If SAML is used, then SSO support for SAML must include IdP-initiated and SP-initiated flows."（IAM-SaaS-04）

**RS-14#21** SSCF は、federated authentication を有効にした利用者について他のログイン方式を無効化できること（must）と、特定の利用者をこの強制から除外できること（must）を求めている [N][^12]。実装ガイドは、除外対象として break-glass アカウントを想定している [N][^12]。
> "The SaaS platform must be able to disable specific users from this enforcement."（IAM-SaaS-05）

**RS-14#22** Google Workspace は、1 組織に最大 1,000 の SSO profile を作成でき、組織部門やグループ単位で割り当てられる [V][^13]。SAML profile ごとに IdP 証明書を 2 枚まで登録でき、証明書の rotation に使える [V][^13]。SSO 設定の案内は、super admin の SSO が必要な場合は legacy SSO profile を構成する選択肢がある、と述べている [V][^13]。Google の「Super administrator SSO」の文書は、super admin の SSO は legacy SSO profile を使う場合に一部の条件でだけ対応し、新しい SSO profile では対応しないと明記している [V][^53]。同文書は、super admin に SSO を許すと IdP 侵害時に第三者が Admin console と組織アカウントのあらゆる面にアクセスできるリスクがあるとしている [V][^53]。
> "Single sign-on for super administrators is only supported if you use the legacy SSO profile, and only in some cases (see below). It's not supported by the newer SSO profiles."（Super administrator SSO）
> "You can upload up to two certificates, giving you the option to rotate certificates when necessary."

**RS-14#23** IPSIE SL1 OpenID Connect Profile（Draft 00、2025-04-18）は、OP に対して client の事前登録、DPoP による sender-constrained access token、ID token の audience を単一文字列にすることを要求している（shall）[N][^14]。RP には RFC 9207 による iss パラメータの検査（shall）を要求している [N][^14]。同草案は IPSIE WG の作業中文書である [N][^14]。
> "shall check the iss parameter in the authorization response according to [RFC9207] to prevent mix-up attacks;"

### 3.3 domain verification と失効時の再検証

**RS-14#24** IETF DNSOP の草案（draft-ietf-dnsop-domain-verification-techniques-13、BCP 予定、未 RFC）は、検証を one-off 型と persistent 型に分けている [N][^15]。persistent 型での record の存続は、DNS 管理者が消し忘れたか、新しいドメイン所有者が公開済み token を再投入したことしか示さない、と述べている [N][^15]。
> "Persistent validation is only appropriate for applications where the Application Service Provider keeps the validation bound to a specific User account, rather than treating the mere continued presence of the token in the DNS as proof of control."（§3）

**RS-14#25** 同草案は、persistent 型の検証では record 削除による取消手順と再検証頻度を明確に示すこと（MUST）、ドメイン所有者の変更を監視して新しい token で再確認を求めること（MAY）を定めている [N][^15]。
> "For persistent validations, Application Service Providers MUST provide clear instructions for how to perform revocations through the removal of a Validation Record, including details on the frequency at which re-validation is performed."（§6.3）

**RS-14#26** 同草案は、検証側が信頼できる DNSSEC 検証リゾルバを使うこと（MUST）を求めている [N][^15]。AD bit が立たない応答では、地理的に分散した複数リゾルバでの照合（SHOULD）を求め、persistent 型は期待値が公開されているため DNS spoofing で取消を回避されやすいと指摘している（§9.7）[N][^15]。Public Suffix List の ICANN division に属する public suffix（例: co.uk）の所有者検証は許可しないこと（SHOULD NOT）としている（§9.9）[N][^15]。
> "Application Service Providers MUST use a trusted DNSSEC validating resolver to verify Validation Records they have requested to be deployed."（§9.7）

**RS-14#27** 同草案は、ドメインの新しい所有者が旧 record を再投入する危険（§9.11）を挙げている [N][^15]。さらに、検証が利用者に結び付いていない場合、別の利用者による再検証を「再有効化」として扱うと、旧所有者の資源へのアクセスを新所有者に与え得る（§9.13）と述べている [N][^15]。
> "Application Service Providers need to take care that re-validation of a domain by a different User is not necessarily treated as "reactivation""（§9.13）

**RS-14#28** Atlassian は、検証成功後も DNS の TXT record を定期的に確認し、record が消えたり壊れたりした場合は期限付きで修正を求めるメールを送り、修正がなければ検証状態を失わせる [V][^16]。
> "After verification is successful, we'll periodically check your DNS host for the txt record."

**RS-14#29** Google Workspace は、所有者確認が済めば TXT record を削除してよいと案内している [V][^17]。GitHub も、Verified 表示後に TXT を削除してよいと案内している（任意）[V][^18]。両文書とも、検証後の定期的な再確認には言及していない [V][^17][^18]。
> "Once verified, the TXT record can be safely removed."（Google Workspace）

**RS-14#30** Microsoft Entra ID では、1 つのドメイン名は 1 つのディレクトリでしか検証できない [V][^19]。external admin takeover では、DNS TXT による所有権の証明に成功すると、ドメインが unmanaged ディレクトリから管理者のディレクトリへ移される [V][^20]。このとき利用者、サブスクリプション、ライセンス割当ても移り、unmanaged 組織は forceTakeover による takeover 成功の 10 日後に削除される [V][^20]。ドメイン検証が利用者集団への管理権限に直結する例である [D]（RS-14#30 から）。
> "When you verify ownership of the domain name, Microsoft Entra ID removes the domain name from the unmanaged organization and moves it to your existing organization."

### 3.4 SCIM provisioning・競合・deprovisioning

**RS-14#31** SCIM では、作成要求が既存資源と衝突した場合（例: userName の重複）、service provider は scimType「uniqueness」付きの 409 を返すこと（MUST）とされる（§3.3）[N][^8]。SCIM の client と service provider は transport 層の保護を必須とし（MUST）、service provider は TLS 1.2 に対応すること（MUST）とされる（§7.2）[N][^8]。弱い認証または無認証で発行された token を使うべきでない（SHOULD NOT）とされる（§2）[N][^8]。
> "the service provider MUST return HTTP status code 409 (Conflict) with a "scimType" error code of "uniqueness""（RFC 7644 §3.3）

**RS-14#32** SCIM の資源の versioning（ETag）は service provider の任意（MAY）で、client が If-Match を付けるのも任意（MAY）である [N][^8]。版が一致しない場合の応答として 409 と 412 が定義されている [N][^8]。したがって、ETag を送らない IdP からの更新競合は後勝ちになり得る [D]（RS-14#32 から）。
> "Service providers MAY support weak ETags as the preferred mechanism for performing conditional retrievals and ensuring that clients do not inadvertently overwrite each other's changes"（§3.14）

**RS-14#33** SCIM のマルチテナンシーは OPTIONAL で、方式は規定されていない [N][^8]。client が tenant を明示する方式（URL prefix、sub-domain、HTTP header）を使う場合、service provider はテナント越えを防ぐ（または許す）アクセス制御を置くべき（should、小文字）とされ、暗黙の tenant と明示した tenant が食い違う場合の優先順位も考慮すべきとされている [N][^8]。externalId は provisioning client が発行し、service provider は provisioning domain に閉じた値として解釈すること（MUST）とされ、一意性は client 側が担う前提である [N][^9]。複数テナントでは externalId の一意性は当該テナント内に限られる [N][^8]。
> "Multi-tenancy is OPTIONAL. The SCIM protocol does not define a scheme for multi-tenancy."（RFC 7644 §6）

**RS-14#34** User の active 属性の最終的な意味は service provider が決める [N][^9]。典型例は「true ならログイン可、false なら停止」である [N][^9]。active=false で何を止めるか（session、token、API 鍵、委任ジョブ）は本基盤側で定義する必要がある [D]（RS-14#34 から）。
> "The definitive meaning of this attribute is determined by the service provider."（RFC 7643 §4.1.1）

**RS-14#35** RFC 9967（2026-05、Proposed Standard）は、SCIM の変更を Security Event Token で非同期に通知する方式を定め、RFC 7643/7644 を更新した [N][^21]。発行者と直接通信していない場合、受信側は SET の署名を JWS で検証すること（MUST）とされる [N][^21]。受信側は SET の受信を確認応答する前に、自身の復旧要件を満たすよう event を永続化すること（MUST）とされ、非同期要求の結果 URI は保護すること（MUST）とされる [N][^21]。
> "Event Receivers MUST ensure events are persisted directly or indirectly to meet local recovery needs before acknowledging the SET Events were received."（§5）

**RS-14#36** IPSIE AL SCIM 2.0 Profile（Draft 00、2026-09-08）は、OAuth 2.0 client_credentials と JWT client 認証の使用（MUST）を求めている [N][^10]。また、access token を「scim」scope に限定すること（MUST）、IdP 管理の User・Group をアプリ側で変更することの禁止、テナントごとに少なくとも 25 req/s を受け付けること（MUST）を求めている [N][^10]。SCIM 資源を作成・削除・変更する要求をすべて監査記録すること（SHALL）も求めている [N][^10]。
> "The Application MUST support at least 25 SCIM requests per second. This requirement is per-tenant for multi-tenant (B2B SaaS, etc.) applications."（§4.3）

**RS-14#37** 同草案の AL1（User Deprovisioning）は、IdP が無効化を 5 分以内に伝播すること（SHOULD）、アプリが受信後 5 分以内にアクセスを失効させること（SHOULD）を求めている [N][^10]。さらに、無効化時に web session、API token、refresh token、PAT、SSH 鍵、端末認証資格情報を含む全アクセス手段を無効化すること（MUST）を求めている [N][^10]。
> "When a user account is deactivated, all access mechanisms and authorizations associated with that account MUST also be deactivated."（§5.1）

**RS-14#38** SP 800-63C-4 は、provisioning API を利用者主導の trust agreement では提供しないこと（SHALL NOT）を求めている [N][^2]。加えて、利用者アカウントの状態変化を IdP が RP に通知すること（SHALL）、通知を受けた RP が federated identifier の結合を外すこと（SHALL）、不要になったとき・trust agreement 終了時に IdP が RP の provisioning API へのアクセスを取り消すこと（SHALL）を求めている（§4.6.5）[N][^2]。provisioning API へのアクセスは利用者の認証を意味しないと明記している（§4.6.5）[N][^2]。JIT provisioning だけで IdP から終了通知がない場合、RP には到達不能なアカウントがたまり攻撃対象になり得るとし、最終アクセスからの期間による終了（MAY）と終了前の事前通知（SHALL）を挙げている（§4.6.7）[N][^2]。終了理由が不審・不正な活動の場合は、trust agreement に定めがあれば理由を含めて RP に通知すること（SHALL）を求めている（§4.6.4）[N][^2]。
> "When receiving such a signal, the RP SHALL remove the binding of the federated identifier from the account."（§4.6.5）

**RS-14#39** Microsoft Entra のテナント間同期は source から target への push 型で、同期間隔は 40 分に固定されている [V][^22]。target 側で手動でサインインを止めても、source 側で当該利用者に変更が検出されると再有効化される [V][^22]。同期関係を切断しても、それまで同期されていた外部利用者には変更が加えられない [V][^22]。Microsoft はこの機能を、プライバシー上の理由から同一組織内での利用を意図したものとし、組織をまたぐと追加のコンプライアンス責任が生じ得ること、同期での利用者同意の取得を支援しないことを記している [V][^22]。
> "No changes are made to the external users previously managed by cross-tenant synchronization if the relationship is severed"

**RS-14#40** SSCF は provisioning と deprovisioning の自動化と、その programmatic アクセスを制限する仕組みを求めている（must、実装例として SCIM）[N][^12]。あわせて、session の programmatic かつ real-time の失効、entitlement 変更の即時反映、session 失効を伴うアカウントの一時停止を求めている（いずれも must）[N][^12]。
> "Invalidation of the user session must have the capability to revoke user and application sessions (all device and UI sessions) in real-time."（IAM-SaaS-15）

### 3.5 顧客組織の offboarding（解約・連携終了）

**RS-14#41** SP 800-63C-4 は、RP 側アカウントの終了時に federated identifier、bound authenticator、属性、身元情報をすべて除去すること（SHALL）を求めている [N][^2]。規制・法令・方針による制約がある場合を除き、利用者属性を保存領域から除去すること（SHALL）も求めている [N][^2]。監査ログ・アクセスログに federated identifier を残す例を示している [N][^2]。
> "Termination SHALL include the removal of all federated identifiers, bound authenticators, attributes, and identity information associated with the account"（§3.8）

**RS-14#42** GDPR 第 28 条第 3 項は、処理者との契約に、役務終了後に管理者の選択で個人データを削除または返却すること（(g)）を定めるよう求めている [N][^23]。管理者または委任された監査人による監査・検査を許容し協力すること（(h)）も定めるよう求めている [N][^23]。
> "at the choice of the controller, deletes or returns all the personal data to the controller after the end of the provision of services relating to processing"（Art. 28(3)(g)）

**RS-14#43** DORA 第 30 条は、金融機関と ICT 第三者事業者の契約に、終了権と最低通知期間（第 2 項 (h)）を含めるよう求めている [N][^24]。重要・重大な機能を支える ICT 役務では、移行期間を伴う出口戦略（第 3 項 (f)）を含めるよう求めている [N][^24]。同規則は 2025-01-17 から適用されている [N][^24]。
> "exit strategies, in particular the establishment of a mandatory adequate transition period"（Art. 30(3)(f)）

### 3.6 delegated admin と顧客管理者の攻撃面

**RS-14#44** Microsoft Entra の protected actions は、権限に Conditional Access policy を割り当て、ログイン時ではなく操作の実行時に強制する [V][^25]。対象には Conditional Access policy の管理、テナント間アクセス設定の管理、一部ディレクトリオブジェクトの完全削除、named location の管理が含まれる [V][^25]。
> "Because the policy enforcement occurs at the time the user attempts to perform the protected action and not during user sign-in or rule activation, users are prompted only when needed."

**RS-14#45** Microsoft Entra の administrative unit は、ロールの権限範囲を組織の一部に限定する [V][^26]。administrative unit は入れ子にできず、グループを administrative unit に入れても管理範囲に入るのはグループ自体でメンバーは入らない [V][^26]。administrative unit のメンバーでない利用者にロールを割り当てると、範囲はテナント全体になる、と記されている [V][^26]。また Entra では、ゲスト利用者のアクセスを最も制限する設定にしても、ゲストを管理者ロールに追加できる [V][^27]。
> "Guest users can still be added to administrator roles regardless of this permission setting."（Default user permissions）

**RS-14#46** Microsoft のパートナー向け GDAP は、顧客ワークロードへの粒度の細かい期限付きアクセスをパートナーに与える仕組みである [V][^28]。顧客が最小権限のアクセスを明示的に付与することが前提である [V][^28]。
> "Customers must explicitly grant the least-privileged access to their partners."

**RS-14#47** Google Workspace の domain-wide delegation は、利用者の同意を経ずにアプリに利用者データへのアクセスを許す機能である [V][^29]。OAuth scope ではなりすませる利用者を限定できない [V][^29]。Google は、代替手段がない場合に限って使うこと、scope を絞ること、service account 鍵の作成・アップロードを制限することを推奨している [V][^29]。
> "Although OAuth scopes don't restrict which users the service account can impersonate, they restrict the types of user data that the service account can access."

**RS-14#48** Okta の根本原因報告（2023-11-03）によると、2023-09-28〜10-17 に攻撃者が Okta の顧客 support 系システム内の、134 社に関連するファイルに不正アクセスした [I][^30]。そのうち HAR ファイルに含まれた session token で 5 社の正規 session が乗っ取られた [I][^30]。不正アクセスには support 系に保存された service account が使われ、その username と password は従業員の個人 Google アカウントに保存されていた [I][^30]。Okta は、資格情報が露出した経路として最も可能性が高いのは従業員の個人 Google アカウントまたは個人端末の侵害である、としている（断定はしていない）[I][^30]。是正策には、Okta 管理者の session token をネットワーク位置に束縛することが含まれる [I][^30]。
> "Some of these files were HAR files that contained session tokens which could in turn be used for session hijacking attacks."

**RS-14#49** Microsoft の報告（2024-01-25）によると、Midnight Blizzard は MFA が無効な旧来の非本番テストテナントのアカウントを password spray で侵害した [I][^31]。そのうえで旧来のテスト用 OAuth アプリを使い、悪性 OAuth アプリに Exchange Online の full_access_as_app ロールを付与させた [I][^31]。
> "Midnight Blizzard utilized password spray attacks that successfully compromised a legacy, non-production test tenant account that did not have multifactor authentication (MFA) enabled."

**RS-14#50** SSCF は顧客管理者向けの統制として、次を求めている（いずれも must）[N][^12]。
- 顧客データを閲覧・変更できず、設定変更もできない読取専用の「Security Auditing」ロール（IAM-SaaS-10）
- 読取と書込、管理操作を分けた OAuth scope（IAM-SaaS-18）
- 利用者が接続できる第三者連携を管理者が制御する仕組み（IAM-SaaS-19）
- 管理者以外による招待をロール単位で制限する仕組み（IAM-SaaS-21）
- 連携の作成者を検証して表示する仕組み（IPY-SaaS-02）
> "It must not enable viewing or modifying customer data or making changes to any configurations."（IAM-SaaS-10）

### 3.7 顧客向け監査ログ API

**RS-14#51** SSCF の LOG 領域は次を求めている（いずれも must）[N][^12]。
- 人と NHI の双方について、サインイン成否、全設定変更、連携作成、API 鍵の作成・削除・変更、refresh token による access token 生成、user impersonation、アカウントと権限の作成・変更、MFA の各段階、一括エクスポートを記録する（LOG-SaaS-01）
- 各記録に、impersonation の実行者 ID（顧客側か SaaS 事業者側かを問わない）、IP、変更元（API/UI/App）、対象資源、非機微な session 識別子を含める（LOG-SaaS-02）
> "Impersonation user ID, whether from a customer or SaaS provider"（LOG-SaaS-02）

**RS-14#52** SSCF は、ログの push または pull による programmatic 配信（LOG-SaaS-03）、最低 7 日の保持（LOG-SaaS-04）、遅くとも 24 時間以内の配信（LOG-SaaS-05）、形式とイベント種別の文書化（LOG-SaaS-06）を求めている（いずれも must）[N][^12]。ログが可変なら不変化する管理手段を提供すること（LOG-SaaS-07）も求めている [N][^12]。実装ガイドは、ログイン等の重要ログを 30 日以上提供することを推奨している [N][^12]。
> "Logs must be made available to the customer for a minimum of 7 days."（LOG-SaaS-04）

**RS-14#53** 米国 CSRB の報告（2024-03-20）は、クラウド事業者が既定の監査ログの最低基準を定めて採用するよう勧告している（勧告 10）[I][^32]。その基準は、事業者自身のアクセスを含む顧客業務データへの全アクセスのログを、追加料金なしで顧客に提供し、既定で 6 か月以上保持することを最低限とする [I][^32]。勧告 4 は、セキュリティ関連ログを有料オプションとする慣行をやめるよう求めている [I][^32]。
> "all access (including access by the CSP itself) to customer business data in the cloud produces logs that are available to the customer without additional charges, with a minimum default retention of six months by the CSP."（Recommendation 10）

**RS-14#54** CISA の Product Security Bad Practices（v2.0、2025-01-17）は、重要インフラまたは国家重要機能（NCF）に使われる製品を対象とする bad practice 10 の推奨行動として、クラウド・SaaS 事業者がログを少なくとも 6 か月、追加料金なしで保持して顧客に提供すべき（should）としている [N][^33]。この文書は自主的（voluntary）な政府指針であり、拘束力はない [N][^33]。同文書の bad practice 9 は、重要インフラ・NCF に使われる IT 製品のうち、管理者アカウントの MFA を既定で有効にしない製品を「dangerous」としている（2028-01-01 より前にサポート終了を告知した製品を除く）[N][^33]。
> "For cloud service providers and SaaS products, software manufacturers should retain such logs for a set timeframe (at least 6 months) at no additional charge and make those logs available to customers."

**RS-14#55** GitHub Enterprise Cloud の enterprise 監査ログは直近 180 日のイベントを保持し、Git イベントは 7 日保持する [V][^34]。Audit log API と外部システムへのストリーミングを提供している [V][^34]。Slack の Audit Logs API は Enterprise プランだけで使え、auditlogs:read scope を要求するアプリは Enterprise 組織の Owner がインストールする必要があり、API は読取専用である [V][^35]。
> "The audit log lists events triggered by activities that affect your enterprise within the last 180 days. The audit log retains Git events for seven days."（GitHub）

**RS-14#56** Microsoft Entra の監査ログは、テナント間アクセス設定の変更を CrossTenantAccessSettings カテゴリで記録している [V][^36]。
> "To audit changes to your cross-tenant access settings, use the category of CrossTenantAccessSettings to filter all activity"

### 3.8 顧客が設定できるセキュリティ機能（CSA SSCF）

**RS-14#57** CSA SSCF は、SaaS 事業者が顧客に提供する、顧客が設定・利用できるセキュリティ統制の基準線である [N][^12]。版は v1.0.0（2025-09-24）と v1.0.1（2026-04-09、SSCF-CAIQ と実装ガイドを追加）がある [N][^12]。CCC・DSP・IAM・IPY・LOG・SEF の 6 領域で、統制数は機械可読版の計数で 36（IAM 21、LOG 7、CCC 4、IPY 2、DSP 1、SEF 1）である [N][^12]。統制仕様は必須要件、実装ガイドは推奨とされ、認証制度は今後の予定である [N][^12]。
> "A certification framework for evaluating controls against the SSCF standard is on the project roadmap and is expected to be released at a later date."（§1.4）

**RS-14#58** SSCF の責任共有モデルでは、事業者が統制を実装して顧客に提供し、顧客がそれを適切に使い設定する [N][^12]。利用者アカウントとアクセスの管理、および提供されたセキュリティ設定の正しい構成は、顧客の責任と明記されている（§1.9）[N][^12]。
> "Within the context of the SSCF, the SaaS provider is responsible for implementing the security controls highlighted in this standard and making them available to SaaS customers."（§1.9）

**RS-14#59** SSCF は次も求めている（いずれも must）[N][^12]。
- 顧客ネットワーク外からのログイン制限（少なくとも 2 種類のルールセットを持ち、利用者グループごとに適用できること、IAM-SaaS-03）
- MFA の強制設定（IAM-SaaS-12）
- 匿名アクセスと管理されていない外部利用者（ゲスト）を全体で無効にする仕組み（IAM-SaaS-13、IAM-SaaS-14）
- 全セキュリティ設定の programmatic な照会（CCC-SaaS-01）
- セキュリティ連絡先の設定（SEF-SaaS-01）

実装ガイドは、SMS など脆弱な MFA 方式を許さず、phishing-resistant な方式に対応することを推奨している [N][^12]。

### 3.9 顧客 IdP 侵害時の責任分界

**RS-14#60** SP 800-63C-4 の脅威の節（informative）は、IdP への攻撃が依存する RP に波及し、横展開し得ると述べている [N][^2]。対策として、RP が悪性・侵害アカウントを識別できる独立した監視・脅威評価能力を保つ必要を挙げている [N][^2]。
> "In federated systems, successful attacks on the IdP can propagate through to the RPs that rely on that IdP for identity and security information."（§6.1）

**RS-14#61** SP 800-63C-4 は、RP が自らの管理下の事項（RP 側アカウント、bound authenticator、RP の allowlist など）について利用者に redress の手段を提供すること（SHALL）、IdP・CSP の管理下の事項についてはそれらへの redress を開始する手段を提供すること（SHALL）を求めている（§3.5.3）[N][^2]。shared signaling の全用途を trust agreement に記載すること（SHALL）も求め、記載内容は送信イベント、含める情報、受信時の期待処理である（§4.8）[N][^2]。signal には対象アカウントの特定に必要な範囲を超える個人情報を含めないこと（SHALL NOT）とされる（§4.8）[N][^2]。
> "All uses of shared signaling SHALL be documented in the trust agreement"（§4.8）

**RS-14#62** OpenID Shared Signals Framework 1.0、CAEP 1.0、RISC 1.0 は 2025-08-29 付で公開され、OpenID Foundation が 2025-09-16 に Final Specification として承認を公表した [N][^37][^38][^7][^51]。SSF は、マルチテナント事業者の顧客テナントやテナント内の組織単位も signal の主体に含め、complex subject の「tenant」メンバーを定義している [N][^37]。CAEP は session 失効、資格情報変更、保証レベル変更などのイベントを定義している [N][^38]。
> "These include human or robotic principals, devices, customer tenants in a multi-tenanted service, organizational units within a tenant"（SSF §2）

**RS-14#63** Microsoft の責任共有モデル（2026-08-24 版）は、SaaS でも「Customer data」「Configurations and settings」「Identities and users」を顧客責任としている [V][^39]。導入形態を問わず、アカウントとアクセス管理（RBAC、MFA、Conditional Access）は顧客が保持する責任としている [V][^39]。同文書は、これがガバナンス上の説明であり法的結論ではなく、契約条件を変更しないと注記している [V][^39]。
> "For all cloud deployment types, you own your data and identities."

**RS-14#64** GDPR 第 33 条第 2 項は、処理者が個人データ侵害を認知した後、遅滞なく管理者に通知すること（shall）を定めている [N][^23]。
> "The processor shall notify the controller without undue delay after becoming aware of a personal data breach."

**RS-14#65** 個人情報保護法第 25 条は、個人データの取扱いを委託する事業者に、委託先への必要かつ適切な監督を義務付けている [N][^40]。第 26 条第 1 項ただし書は、委託を受けた事業者が規則に従って委託元に事態を通知した場合、個人情報保護委員会への報告義務の例外となることを定めている [N][^40]。e-Gov の改正履歴によると、「個人情報の保護に関する法律等の一部を改正する法律」（令和 8 年法律第 56 号）は 2026-07-17 に公布され、同日施行分のほか 2027-01-17 と 2028-07-16 に施行される未施行分がある（確認日 2026-10-03）[N][^55]。両施行日の改正後条文でも第 25 条と第 26 条第 1 項の文言は変わらず、第 26 条第 2 項ただし書（本人通知の例外）は 2028-07-16 施行分で変更される [N][^55]。
> 「委託を受けた者に対する必要かつ適切な監督を行わなければならない。」（第 25 条）

**RS-14#66** DORA 第 30 条第 1 項は、金融機関と ICT 第三者事業者の権利義務を明確に配分し、書面で定めることを求めている [N][^24]。第 2 項 (f) は、ICT インシデント時の支援を追加費用なし、または事前に定めた費用で提供する義務を、契約要素に含めるよう求めている [N][^24]。
> "The rights and obligations of the financial entity and of the ICT third-party service provider shall be clearly allocated and set out in writing."（Art. 30(1)）

### 3.10 ゲスト・外部共有・テナント越境の ID

**RS-14#67** Microsoft Entra External ID は、従業員用の workforce テナントでの B2B collaboration と、消費者・企業顧客向けアプリ用の external テナント構成を分けている [V][^41]。B2B collaboration では、ゲストのユーザーオブジェクトを従業員と同じディレクトリに作り、ゲストは自組織の IdP で認証する [V][^41]。
> "A user object is created for business guests in the same directory that you use for your employees."

**RS-14#68** B2B direct connect は双方の組織が相互に有効化したときだけ成立し、利用者は自組織で認証して resource 側組織から token を受け取る [V][^41]。ゲストとしてディレクトリに追加されない点が B2B collaboration と異なる [V][^41]。対象は Teams の共有チャネルに限られ、拡張の予定はないとされている [V][^22]。
> "Unlike B2B collaboration, B2B direct connect users aren't added as guests to your workforce directory."

**RS-14#69** Microsoft Entra のテナント間アクセス設定の既定値では、他の Entra 組織との B2B collaboration は有効、B2B direct connect は遮断、外部組織の MFA と端末の claim は信頼しない [V][^36]。inbound の trust 設定を有効にすると、外部組織で満たされた MFA・準拠端末の claim を自組織の Conditional Access で受け入れる [V][^36]。招待の自動受諾（同意画面と招待メールの抑止）は、home 側の outbound と resource 側の inbound の両方で設定した場合だけ有効になる [V][^36]。
> "By default, B2B collaboration with other Microsoft Entra organizations is enabled, and B2B direct connect is blocked."

**RS-14#70** Microsoft Entra の tenant restrictions v2 は、管理下の端末・ネットワークで自組織の利用者が使える外部アカウントを制限する [V][^42]。認証時の遮断（authentication plane）と、匿名アクセスや token 持込みの遮断（data plane）を区別している [V][^42]。data plane protection は同文書で preview と表示されている（確認日 2026-10-03）[V][^42]。プロキシによる header 挿入では authentication plane の保護だけになる [V][^42]。
> "If you're using a corporate proxy for header injection, options include only authentication plane protection."

**RS-14#71** Slack Connect では、チャネルを作成した組織がそのチャネルを所有し、所有組織だけが一部の管理操作を行える [V][^43]。他組織が追加したアプリは、その組織の利用者しかチャネルから外せない [V][^43]。Enterprise の Org Owner と Org Admin は、取引先組織ごとに招待の承認・受諾設定を適用できる [V][^44]。
> "Your organization owns any channels created in your workspace or Enterprise organization."

**RS-14#72** Google Workspace の Drive 共有の trust rules では、外部組織を共有先に指定する場合、visitor・guest 共有を除き、その組織が domain 検証済みの Google Workspace アカウントを持つことが条件である [V][^45]。allowlist からドメインを外すと、そのドメインの利用者は共有ファイルへのアクセスを失い、通知はされない [V][^52]。
> "When a domain is removed, users in that domain lose access to any shared files."

**RS-14#73** GitHub Enterprise Managed Users では、IdP が利用者アカウントを provisioning し、username・プロフィール・組織所属・リポジトリアクセスを IdP 側で管理する [V][^46]。managed user は公開コンテンツを作れず、enterprise 外と協働できない [V][^46]。OIDC SSO を使う enterprise では、IdP の Conditional Access Policy でアクセスを検証する [V][^46]。enterprise 内では、所属していない組織のリポジトリに collaborator として追加でき、internal リポジトリへのアクセスを制限する guest collaborator ロールもある [V][^47]。
> "Managed user accounts cannot create public content or collaborate outside your enterprise."

**RS-14#74** Okta Org2Org は、source org から target org へ利用者の認証と（任意で）provisioning を行う連携で、source 側に設置する [V][^48]。hub-and-spoke 構成（spoke が source、hub が target）に使われる [V][^48]。provisioning の接続保護には API token より OAuth 2.0 が安全で権限を細かくできると Okta は案内しており、Org2Org では SAML assertion の暗号化に対応していない [V][^48]。
> "The OAuth 2.0 approach is more secure and provides greater granularity of permissions than using the API token method."

**RS-14#75** CVE-2025-55241 は Microsoft が CNA として 2025-09-04 に公開した Azure Entra ID の権限昇格脆弱性で、CVSS v3.1 基本値 10.0（CRITICAL）、CWE-287（不適切な認証）とされている [V][^49]。CVE レコードには攻撃手順の記載がなく、テナント越えの成立機序は本調査で原典から確認できていない（§6 参照）[V][^49]。MSRC の Security Update Guide は、Microsoft が既に完全に緩和しており利用者の対応は不要とし、一般公開（Publicly Disclosed）と悪用（Exploited）をいずれも「No」と表示している（確認日 2026-10-03）[V][^56]。同ガイドの改訂 1.1（2025-09-18）は、CVSS の Attack Complexity を High から Low に変更したと記している [V][^56]。

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL | タグ・脚注 |
|---|---|---|---|---|---|---|
| OpenID Connect Core 1.0 | incorporating errata set 2 | final | 2023-12-15 | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html | [N][^1] |
| NIST SP 800-63C-4 Federation and Assertions | Revision 4 | final | 2025-07（CSRC 上の公表 2025-07-31） | 2026-10-03 | https://pages.nist.gov/800-63-4/sp800-63c.html | [N][^2] |
| RFC 7643 SCIM Core Schema | — | Proposed Standard（RFC 9865・9967 により更新） | 2015-09 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7643 | [N][^9] |
| RFC 7644 SCIM Protocol | — | Proposed Standard（RFC 9865・9967 により更新） | 2015-09 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7644 | [N][^8] |
| RFC 9865 SCIM Cursor-Based Pagination | — | Proposed Standard | 2025-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9865 | [N][^50] |
| RFC 9967 SCIM Profile for SETs | — | Proposed Standard | 2026-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9967 | [N][^21] |
| draft-ietf-dnsop-domain-verification-techniques | -13 | draft（I-D Exists、BCP 予定、WG 状態は Waiting for WG Chair Go-Ahead、改訂要の注記あり） | 2026-06-22（失効 2026-12-24） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-dnsop-domain-verification-techniques/ | [N][^15] |
| OpenID Shared Signals Framework 1.0 | 1.0 | final | 2025-08-29（承認公表 2025-09-16） | 2026-10-03 | https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html | [N][^37][^51] |
| OpenID CAEP 1.0 | 1.0 | final | 2025-08-29（承認公表 2025-09-16） | 2026-10-03 | https://openid.net/specs/openid-caep-1_0-final.html | [N][^38][^51] |
| OpenID RISC Profile 1.0 | 1.0 | final | 2025-08-29（承認公表 2025-09-16） | 2026-10-03 | https://openid.net/specs/openid-risc-1_0-final.html | [N][^7][^51] |
| IPSIE AL SCIM 2.0 Profile | Draft 00 | draft（WG 文書、Informational。IPSIE WG の Specifications ページは Implementer's Drafts・Final ともに「None yet」と表示） | 2026-09-08 | 2026-10-03 | https://openid.net/specs/ipsie-al-scim-profile-1_0.html | [N][^10][^54] |
| IPSIE SL1 OpenID Connect Profile | Draft 00（openid.net 掲載版、表示上の失効日 2025-10-20）、editor's draft は 2026-09-29 付で更新中 | draft（WG 文書、Informational。IPSIE WG の Specifications ページは Implementer's Drafts・Final ともに「None yet」と表示） | 2025-04-18 | 2026-10-03 | https://openid.net/specs/ipsie-openid-connect-sl1-profile-1_0.html | [N][^14][^54] |
| SAML V2.0 Profiles | saml-profiles-2.0-os | OASIS Standard（final） | 2005-03-15 | 2026-10-03 | http://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf | [N][^11] |
| CSA SaaS Security Capability Framework（SSCF） | v1.0.1（v1.0.0 は 2025-09-24） | 公開版（拘束力なし、認証制度は未整備） | 2026-04-09 | 2026-10-03 | https://cloudsecurityalliance.org/artifacts/saas-security-capability-framework-sscf | [N][^12] |
| CISA Product Security Bad Practices | Version 2.0 | 政府指針（拘束力なし） | 2025-01-17 | 2026-10-03 | https://www.cisa.gov/resources-tools/resources/product-security-bad-practices | [N][^33] |
| CSRB Review of the Summer 2023 MEO Intrusion | — | 政府報告（確定） | 2024-03-20 | 2026-10-03 | https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf | [I][^32] |
| CISA AA23-320A Scattered Spider | 2025-07-29 更新版 | 公的勧告 | 2023-11-16（初版） | 2026-10-03 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a | [I][^5] |
| GDPR（Regulation (EU) 2016/679） | EUR-Lex 現行版 | 適用中（第 99 条第 2 項により 2018-05-25 適用開始） | 2016-04-27 | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng | [N][^23] |
| DORA（Regulation (EU) 2022/2554） | OJ L 333, 27.12.2022 | 適用中（2025-01-17 適用開始） | 2022-12-14 | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554 | [N][^24] |
| 個人情報の保護に関する法律（平成 15 年法律第 57 号） | e-Gov 現行版（令和 7 年法律第 70 号による改正、2026-10-01 施行まで反映） | 施行中。令和 8 年法律第 56 号（2026-07-17 公布）は段階施行で、2027-01-17 施行分と 2028-07-16 施行分が未施行。第 25 条・第 26 条第 1 項の文言は未施行分の施行後も同一 | 2003-05-30 | 2026-10-03 | https://laws.e-gov.go.jp/law/415AC0000000057 | [N][^40][^55] |

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

| 入力先 | 入力内容（いずれも [D]） | 導出元 |
|---|---|---|
| ADR-004（B2B federation、account linking、domain 検証、SCIM） | 結合キーは（テナント ID、IdP 識別子［OIDC issuer／SAML entityID］、subject）の 3 つ組に固定する [D]。email・userName・externalId による自動 linking は既定で禁止する [D]。linking には既存の federated identifier による認証済み session を要求し、テナント管理者を自動 linking の対象から除く [D]。 | RS-14#1〜#7, #10 |
| ADR-004 | IdP の allowlist はテナントごとに持ち、wildcard を禁止する [D]。RP 起点（SP-initiated）を既定とする [D]。IdP-initiated SAML は、①既定で無効にし SSCF IAM-SaaS-04 の未適合を例外として記録するか、②受信した unsolicited response を session 確立に使わず SP-initiated へやり直させるか、を比較する（どちらも SSCF 適合性の判定は未了）[D]。②は、SP 800-63C-4 §3.11.1 が IdP-initiated 禁止の対象外とする「外部当事者が RP に federation の開始を促す」処理に相当し、FAL2 の RP 開始要件（§2.3）とも整合させやすい [D]。 | RS-14#14, #18〜#20 |
| ADR-004 | domain verification は persistent 型とし、テナントと検証した管理者に束縛する [D]。定期再検証（頻度は TBD:所有者 CISO）、DNSSEC 検証リゾルバと複数経路での照合、ICANN public suffix の拒否を行う [D]。別テナントによる再検証は「再有効化」として扱わない [D]。検証が切れた場合は猶予期間の後、ドメインに基づく機能（home realm discovery の振分け、自動参加、ドメイン一致の JIT）を止め、既存利用者は即時に止めない [D]。 | RS-14#24〜#30 |
| ADR-004 | ドメイン検証で得る権限は「当該ドメインの新規利用者の振分けと JIT の範囲」に限る [D]。他テナントに存在する同ドメインの既存アカウントを自動で移管しない（Entra の external takeover のような移管は、通知と移管元の同意手続なしには行わない）[D]。 | RS-14#30 |
| ADR-004 | SCIM: テナントは HTTP header や path ではなく SCIM client の資格情報から導く [D]。client 認証は OAuth client_credentials と private_key_jwt、scope は scim のみとする [D]。ETag と If-Match に対応し、IdP が If-Match を送らない場合の後勝ちを前提に、IdP が管理する属性はアプリ側で変更不可とする [D]。JIT と SCIM を同時に有効にする場合の重複生成規則（SCIM 管理下の利用者に一致したら JIT は作成しない）を定める [D]。userName を削除後に再利用するときは、新しい内部 ID を割り当てる [D]。 | RS-14#10, #31〜#36 |
| ADR-006（失効と継続評価） | SCIM の無効化と SSF の account-disabled／session-revoked を受信したら、web session、refresh token、PAT、API 鍵、SSH 鍵、委任ジョブをまとめて失効させる [D]。目標時間は IPSIE 草案の 5 分を候補値とするが、数値契約は PoC 実測後に決める [D]。RISC identifier-recycled を受信したら、該当識別子による linking と招待を凍結する [D]。 | RS-14#9, #37, #38, #62 |
| ADR-002（主体×操作の保証レベル） | 顧客管理者（主体類型 R-029）の IdP 設定、linking 規則、SCIM 資格情報、委任付与の操作を最高リスク階層に置く [D]。顧客 IdP の侵害に備え、RP 側で bound authenticator を確認する FAL3 相当の要件を、これらの操作に限って適用する案を比較する [D]。 | RS-14#6〜#8, #16, #60 |
| ADR-008（管理面の保護） | 保護操作（IdP の追加・変更・証明書更新、linking 規則、ドメイン、SCIM 資格情報、管理者ロール付与、監査ログ設定、外部共有の既定値）について、実行時の phishing-resistant 再認証、全テナント管理者とセキュリティ連絡先への即時通知、監査イベントを必須とする [D]。二者承認と発効遅延の要否は事業側と決める（TBD:所有者 事業責任者）[D]。 | RS-14#6〜#8, #15, #44, #50 |
| ADR-008 | 事業者要員（support・SRE）の顧客テナントアクセスは JIT とし、利用者 impersonation は顧客監査ログに事業者側の実行者 ID 付きで出す [D]。support に添付される HAR などの資格情報を含むファイルは、受領時に無害化する [D]。管理 session はネットワーク位置または端末に束縛する [D]。 | RS-14#48, #51, #53 |
| ADR-010／ADR-011（認可モデル） | テナント越境は「resource 側テナントが所有する資源への、外部主体（home テナント、subject）への明示的な付与」としてモデル化し、home 側の outbound と resource 側の inbound の双方の許可を要件にする [D]。相互信頼型（アカウントを作らない方式）は既定で無効にする [D]。外部主体・ゲストは既定で管理者ロールを持てない（Entra の既定とは異なる方針）[D]。共有先組織を信頼リストから外したら付与を一括で失効させる [D]。 | RS-14#45, #67〜#72 |
| ADR-012（PEP coverage） | 全 PEP で token のテナント ID と資源の所有テナントの一致を検査し、越境は ADR-010 の明示付与の辺がある場合だけ許す [D]。cross-tenant property test（R-172）の不変条件にする [D]。 | RS-14#3, #67〜#69 |
| ADR-014（監査データ）／DL-25 | 顧客監査 API は SSCF LOG-SaaS-01/02 のイベントとフィールドを最低線にし、事業者自身のアクセスも含める [D]。既定の保持は無償で 6 か月を候補とする（SSCF の 7 日は最低線にすぎない）[D]。配信は pull と push の両方、遅延の目標は 24 時間より短くする（数値は TBD）[D]。改ざん防止策を備え、形式を版管理する [D]。 | RS-14#51〜#56 |
| ADR-018（出口）／offboarding | 顧客組織の解約・連携終了時に、SCIM 資格情報の失効、federated identifier の除去、属性の削除または返却（顧客の選択）、監査ログの引渡し、移行期間を手順化する [D]。 | RS-14#38, #41〜#43 |
| ADR-019（侵害時 runbook） | 「顧客 IdP 侵害」runbook には、テナント単位の IdP 信頼の一時停止（break-glass アカウントへの切替、SSCF IAM-SaaS-05 の除外利用者を使う）、テナント内全 session と token の失効、顧客セキュリティ連絡先への通知、証跡の保全、SSF による signal 送信を含める [D]。 | RS-14#21, #60〜#62 |
| DL-11（脅威カタログ） | 脅威候補として、不正な IdP の追加、email 一致による自動 linking 乗っ取り、help desk 経由の MFA リセット、ドメインの再登録・再投入、SCIM 資格情報の窃取、domain-wide delegation 型の過大なアプリ権限、support 経路での session 窃取、ゲストの管理者昇格、非本番テナントからの OAuth アプリ悪用を登録する [D]。 | RS-14#6, #7, #27, #45, #47〜#49 |
| DL-26（顧客管理機能設計・責任分界条項案） | 下記 5.2 の条項案と、オンボーディング様式（trust agreement の SHALL 項目を埋める様式）を入力する [D]。 | RS-14#11〜#13, #60〜#66 |
| DL-34／RS-16 | GDPR 第 28・33 条、DORA 第 30 条、個人情報保護法第 25・26 条の適用判定と、通知期限・費用負担・監査受入の具体化を法務に依頼する [D]。 | RS-14#42, #43, #64〜#66 |

### 5.2 顧客との責任分界の契約条項案（採否は法務決定、閉じ方 B）

以下は原典から導いた起案用の骨子であり、法的助言ではない [D]（RS-14#11〜#13, #60〜#66 から）。

1. 顧客の責任: 顧客 IdP の運用（認証器、MFA、help desk の本人確認、IdP 管理者アカウント、IdP 側の署名鍵）と、顧客 IdP が侵害された場合の一次対応 [D]。
2. 事業者の責任: trust agreement 記載事項（対象母集団、許容 xAL、linking 規則、IdP allowlist）の技術的な強制、顧客 IdP 由来の異常の検知、通知、封じ込めの支援、証跡の提供 [D]。
3. 双方向の通知: 顧客は IdP 侵害の疑い・確定を、事業者は検知した異常と自らの侵害を、期限内に通知する（期限は TBD、事業者が処理者・委託先に当たる場合は GDPR 第 33 条第 2 項と個人情報保護法第 26 条の義務と整合させる）[D]。
4. 緊急停止権: 事業者が顧客の同意を待たずにテナントの IdP 信頼を一時停止し、全 session を失効できる条件、事後通知、復旧手順 [D]。
5. 証跡: 監査ログの保持期間、提供方式、費用（無償 6 か月案）、事業者要員のアクセスを開示すること [D]。
6. インシデント支援の費用: 金融顧客には DORA 第 30 条第 2 項 (f) に沿い、追加費用なしまたは事前に定めた費用で提供する [D]。
7. 監査受入: GDPR 第 28 条第 3 項 (h) と DORA 第 30 条に沿った監査・検査の受入、および委託元の監督（個人情報保護法第 25 条）に必要な情報の提供 [D]。
8. 出口: 解約時のデータの返却・削除の選択、移行期間、federation と SCIM の連携解除手順 [D]。
9. 責任の限定: 顧客 IdP に起因する不正アクセスと、事業者の統制不備（linking 規則違反、保護操作の欠落など）に起因する不正アクセスとで責任を分け、区分基準と上限は法務が決める [D]。
10. signal の取扱い: 送受信する SSF/CAEP/RISC イベント、含める情報、受信時の処理を明記する（SP 800-63C-4 §4.8 の記載要件）[D]。

### 5.3 PoC で実測すべきこと（閉じ方 C、TC-ID は 12_poc で採番）

| 測定項目 | 目的・合否基準の考え方 | 関連 |
|---|---|---|
| SCIM 無効化から全アクセス手段の失効までの時間（p50/p99、IdP 製品別） | IPSIE 草案の 5 分（SHOULD）を参照値に、数値契約 SLI 候補を得る [D]。Entra のテナント間同期のような 40 分周期の経路も別途測る [D] | RS-14#37, #39; R-044 |
| SCIM 競合（同一資源への同時 PATCH、If-Match の有無、JIT と SCIM の同時到着） | 重複アカウントの生成数 0、上書き消失の検出率を測る [D] | RS-14#31〜#34; R-040 |
| 自動 linking 乗っ取りの再現（2 つ目の IdP を追加し email を一致させる） | 本基盤で linking が成立しないこと、IdP 追加が保護操作として止まり通知されることを確認する（負例試験）[D] | RS-14#5〜#7 |
| ドメイン失効シナリオ（TXT 削除、ドメイン移転、旧 token の再投入） | 検知までの時間、再投入の拒否、ドメインに基づく機能の停止を確認する [D] | RS-14#24〜#29; R-131 |
| IdP-initiated SAML の unsolicited response 注入 | 選んだ方式（無効化または SP-initiated へのやり直し）で注入が成立しないことを確認する [D] | RS-14#18〜#20 |
| SAML 署名証明書の 2 枚並行での切替 | 切替時のログイン失敗率と、切替が保護操作として記録・通知されることを確認する [D] | RS-14#15, #22; R-038 |
| 顧客 IdP 停止と侵害の演習 | break-glass 経路でのテナント管理、IdP 信頼の一時停止から全 session 失効までの時間を測る [D] | RS-14#21, #60; R-039 |
| 顧客監査 API | イベント発生から取得可能になるまでの遅延、欠損率、6 か月保持時のコスト（テナント数・イベント量は CONVENTIONS §7 の暫定前提に依存し、A-ID は未採番）を測る [D] | RS-14#51〜#54; R-125 |
| cross-tenant property test（ゲスト・外部主体・共有の取消） | 明示付与のない越境 0 件、信頼リストからの除外後の残存アクセス 0 件を確認する [D] | RS-14#67〜#72; R-172 |
| SSF/CAEP 受信から失効までの時間 | 顧客 IdP 由来の session-revoked／account-disabled の反映時間を測る [D] | RS-14#62 |

## 6. 調査の限界と未確認事項

本節は調査過程の記録であり、主張タグの対象外である。

- **ID の重複**: traceability/deliverables.md は RS-14 を「build/buy・製品・出口」（DL-98）に割り当て、federation・linking・provisioning を RS-02（DL-86）に割り当てている。本ノートは作業指示に従い RS-14 を B2B 顧客向け ID として作成した。RS-02 と主題が重なる（OIDC Core、SAML、linking、SCIM）。台帳側での採番整理と重複項目の統合が必要である（未解決）。
- **CVE-2025-55241**: CVE レコードからは CVSS・CWE・公表日しか確認できない。MSRC の Security Update Guide（API で取得）も、緩和済み・利用者対応不要・悪用なしの表示と CVSS 改訂の記録だけで、機序の記載はない（RS-14#75）。テナントを越えたなりすましの機序（actor token、レガシー API）は研究者ブログ等の二次情報にしかなく、未確認であり、本ノートの結論には使っていない。
- **GitHub と Google の再検証**: GitHub と Google Workspace が検証後に定期的な再確認をしているかは、公式文書に記載がなく未確認である。記載がないことは、再確認をしていないことを意味しない。
- **Slack**: slack.com のヘルプが 429 応答で一部取得できず、Enterprise Grid の SSO・SCIM・ドメイン claim の公式文書は未確認である。Audit Logs API のデータ保持期間は取得した文書に記載がなく、未確認である。独立検証では、slack.com のヘルプ記事（脚注 43・44）が地域に応じて日本語版（/intl/ja-jp/）へ転送され、英語版の原文は取得できなかった。主張は同一記事の日本語版で照合した。
- **IPSIE**: IPSIE WG の Specifications ページ（脚注 54）は Implementer's Drafts と Final Specifications をいずれも「None yet」と表示している（確認日 2026-10-03）。AL SCIM Profile（Draft 00）と SL1 OIDC Profile（Draft 00）は WG の草案であり、数値（5 分、25 req/s）は変わり得る。AL SCIM Draft 00 の §4.1 は、JWT client 認証（RFC 7523 §2.2）の使用を MUST とする一方、token endpoint への client 認証に HTTP Basic を MUST とし、本文での client_assertion の送信を禁じている。両者の関係は草案内で整理されていないため、§5.1 の client 認証方式（private_key_jwt）は草案の改訂を確認してから確定する。
- **IETF の domain verification 草案**: 未 RFC で、datatracker に「Revised I-D Needed」の注記がある。MUST・SHOULD の強度は今後変わり得る。
- **GDAP**: 関係の最大期間、Global Administrator の可否、自動延長の制約などの詳細は、取得した導入ページに記載がなく未確認である。
- **Google Workspace の super admin と SSO**: 版 0.1 では推定としていたが、独立検証で Google の「Super administrator SSO」の文書（脚注 53）に、新しい SSO profile は super admin の SSO に対応しないとの直接の記述があることを確認した（RS-14#22）。
- **Okta**: カスタム管理ロールと resource set、Protected Actions の製品文書そのものは取得しておらず、Okta Security の推奨事項（RS-14#8）から存在を確認したにとどまる。
- **Microsoft の multi-tenant アプリの同意**（他テナントのアプリへの管理者同意）の統制は、本調査では原典を読んでいない（Midnight Blizzard の事例のみ）。
- **法令**: 英国 GDPR、米国州法、NIS2 は確認していない。GDPR の適用開始日（第 99 条第 2 項、2018-05-25）は独立検証で EUR-Lex の原文から確認した。個人情報保護法の令和 8 年改正（令和 8 年法律第 56 号）は e-Gov の改正履歴で公布日と施行日を確認し、本ノートが引く第 25 条・第 26 条第 1 項の文言が変わらないことだけを照合した（RS-14#65）。同改正のその他の条項の影響は確認していない。法域判定は RS-16・DL-34 に委ねる。ISO/IEC 27017 は有償のため確認していない。
- **SSCF**: SSCF-CAIQ の質問票と OSCAL 版は統制の照合にだけ使い、全項目の精読はしていない。SSCF の各統制が CCM v4.1 のどの統制に対応するかは確認していない（RS-15 の範囲）。
- **実測**: 本ノートには自前の実測値がない。§5.3 の項目はすべて未実測である。
- **契約条項案（§5.2）**: 法務の確認を経ていない起案骨子であり、採否と文言は組織決定（閉じ方 B）である。

## 参考文献

[^1]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §2 sub の定義、§5.1 email、§5.7 Claim Stability and Uniqueness、確認日: 2026-10-03）
[^2]: NIST (D. Temoshok ほか)『SP 800-63C-4 Digital Identity Guidelines: Federation and Assertions』Final, 2025-07（CSRC 公表 2025-07-31, DOI 10.6028/NIST.SP.800-63c-4）. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §2.3, §2.4, §3.3.2, §3.3.3, §3.4, §3.5, §3.5.3, §3.6, §3.6.1, §3.8, §3.8.1, §3.8.2, §3.11.1, §3.11.3, §3.16, §3.16.2, §4.3.1, §4.6.2.1, §4.6.3〜§4.6.7, §4.8, §6.1（informative）, §9.5（informative）、確認日: 2026-10-03）
[^3]: Microsoft『Secure applications and APIs by validating claims』ms.date 2025-03-21, updated 2026-06-15. https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation （参照箇所: Validate the tenant, Validate the subject（Warning）、確認日: 2026-10-03）
[^4]: Okta『Enterprise identity provider（Okta-to-Okta）』Okta Developer, 版の記載なし. https://developer.okta.com/docs/guides/add-an-external-idp/oktatookta/main （参照箇所: Account link、Auto-link filters、Exclude admins、Filter（B2B・マルチテナント）、確認日: 2026-10-03）
[^5]: CISA, FBI ほか『Scattered Spider（AA23-320A）』初版 2023-11-16, 更新 2025-07-29. https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a （参照箇所: Execution, Persistence, and Privilege Escalation、Impersonation（T1656）、確認日: 2026-10-03）
[^6]: Okta Defensive Cyber Operations『Cross-Tenant Impersonation: Prevention and Detection』2023-08-31（Change Log: 1.0 2023-09-01 公開、1.1 2023-09-09、1.2 2024-03-08 で Protected Actions と ASN/IP Session Binding の推奨を追加）. https://sec.okta.com/articles/2023/08/cross-tenant-impersonation-prevention-and-detection （参照箇所: 攻撃の記述、Prevention、Detection、Change Log、確認日: 2026-10-03）
[^7]: OpenID Foundation (M. Scurtescu ほか)『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2.6 Identifier Recycled、§2 のイベント種別一覧、確認日: 2026-10-03）
[^8]: P. Hunt ほか『RFC 7644 System for Cross-domain Identity Management: Protocol』Proposed Standard, 2015-09. https://www.rfc-editor.org/rfc/rfc7644 （参照箇所: §2, §3.3, §3.6, §3.12 Table 8, §3.14, §6, §6.1, §6.2, §7.2、確認日: 2026-10-03）
[^9]: P. Hunt ほか『RFC 7643 System for Cross-domain Identity Management: Core Schema』Proposed Standard, 2015-09. https://www.rfc-editor.org/rfc/rfc7643 （参照箇所: §3.1 externalId, §4.1.1 userName・active、確認日: 2026-10-03）
[^10]: OpenID Foundation IPSIE WG (J. Schreiber, D. Zollner)『IPSIE AL SCIM 2.0 Profile Draft 00』2026-09-08. https://openid.net/specs/ipsie-al-scim-profile-1_0.html （参照箇所: §4.1, §4.2, §4.3, §5.1, §5.2, §8, §10、確認日: 2026-10-03）
[^11]: OASIS『Profiles for the OASIS Security Assertion Markup Language (SAML) V2.0』OASIS Standard, 2005-03-15. http://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf （参照箇所: §4.1.4.5, §4.1.5、確認日: 2026-10-03）
[^12]: Cloud Security Alliance『SaaS Security Capability Framework (SSCF)』v1.0.1, 2026-04-09（配布 bundle: SSCF Introduction, SSCFv1.0.1 Spreadsheet, SSCF-simple.json）. https://cloudsecurityalliance.org/artifacts/saas-security-capability-framework-sscf （参照箇所: Introduction §1.1, §1.4, §1.6.1, §1.6.3, §1.9, §1.10, §2.1〜§2.6、統制 CCC-SaaS-01, IAM-SaaS-03〜05, 09〜21, IPY-SaaS-02, LOG-SaaS-01〜07, SEF-SaaS-01 と Implementation Guidelines、確認日: 2026-10-03）
[^13]: Google『Setting up SSO』Google Workspace Admin Help, 版の記載なし. https://support.google.com/a/answer/12032922?hl=en （2026-10-03 時点で https://knowledge.workspace.google.com/admin/apps/setting-up-sso へ転送される。参照箇所: Create a SAML SSO profile、Decide which users should use SSO、冒頭の legacy SSO profile の記述、確認日: 2026-10-03）
[^14]: OpenID Foundation IPSIE WG (A. Parecki)『IPSIE SL1 OpenID Connect Profile 1.0 Draft 00』2025-04-18. https://openid.net/specs/ipsie-openid-connect-sl1-profile-1_0.html （参照箇所: OpenID Provider と Relying Party の要件（Note 1〜3 を含む）。editor's draft（https://openid.github.io/ipsie-openid-sl1/draft-openid-ipsie-sl1-profile.html、2026-09-29 付）は存在確認のみ、確認日: 2026-10-03）
[^15]: S. Sahib ほか『Domain Control Validation using DNS（draft-ietf-dnsop-domain-verification-techniques-13）』Internet-Draft, 2026-06-22. https://datatracker.ietf.org/doc/draft-ietf-dnsop-domain-verification-techniques/ （参照箇所: §3, §4.1, §6.3, §9.7, §9.9, §9.10, §9.11, §9.13、datatracker の状態表示、確認日: 2026-10-03）
[^16]: Atlassian『Verify a domain to manage accounts』Atlassian Support, 版の記載なし. https://support.atlassian.com/user-management/docs/verify-a-domain-to-manage-accounts/ （参照箇所: DNS TXT による検証、検証後の定期確認と検証状態の喪失、確認日: 2026-10-03）
[^17]: Google『Verify your domain with a TXT record』Google Workspace Help, 版の記載なし. https://knowledge.workspace.google.com/admin/domains/verify-your-domain-with-a-txt-record?hl=en （参照箇所: TXT record の削除可否、確認日: 2026-10-03）
[^18]: GitHub『Verifying or approving a domain for your enterprise』GitHub Enterprise Cloud Docs, 版の記載なし. https://docs.github.com/en/enterprise-cloud@latest/admin/configuring-settings/configuring-user-applications-for-your-enterprise/verifying-or-approving-a-domain-for-your-enterprise （参照箇所: TXT record の追加と任意削除、確認日: 2026-10-03）
[^19]: Microsoft『Add your custom domain - Microsoft Entra』ms.date 2026-06-18. https://learn.microsoft.com/en-us/entra/fundamentals/add-custom-domain （参照箇所: Common verification issues、確認日: 2026-10-03）
[^20]: Microsoft『Admin takeover of an unmanaged directory』ms.date 2026-06-18, updated 2026-06-19. https://learn.microsoft.com/en-us/entra/identity/users/domains-admin-takeover （参照箇所: Decide how you want to take over、External admin takeover、forceTakeover の注記、確認日: 2026-10-03）
[^21]: P. Hunt ほか『RFC 9967 System for Cross-Domain Identity Management (SCIM) Profile for Security Event Tokens (SETs)』Proposed Standard, 2026-05. https://www.rfc-editor.org/rfc/rfc9967 （参照箇所: Abstract, §1, §5、確認日: 2026-10-03）
[^22]: Microsoft『What is cross-tenant synchronization in Microsoft Entra ID?』ms.date 2026-05-29, updated 2026-07-02. https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview （参照箇所: Who should use、Properties、FAQ（Synchronization frequency, Attributes, Structure, B2B direct connect, Deprovisioning）、確認日: 2026-10-03）
[^23]: European Parliament and Council『Regulation (EU) 2016/679 (General Data Protection Regulation)』EUR-Lex 現行版. https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng （参照箇所: Art. 28(3)(e)〜(h), Art. 33(1)〜(2), Art. 99(2)、確認日: 2026-10-03）
[^24]: European Parliament and Council『Regulation (EU) 2022/2554 (Digital Operational Resilience Act)』2022-12-14, OJ L 333, 27.12.2022. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554 （参照箇所: Art. 30(1), 30(2)(f)(h), 30(3)(f), Art. 64、確認日: 2026-10-03）
[^25]: Microsoft『What are protected actions in Microsoft Entra ID?』ms.date 2025-11-03, updated 2026-02-19. https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/protected-actions-overview （参照箇所: 冒頭, Why use protected actions?, What permissions can be used、確認日: 2026-10-03）
[^26]: Microsoft『Administrative units in Microsoft Entra ID』ms.date 2024-10-29, updated 2026-02-19. https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/administrative-units （参照箇所: 冒頭, Constraints, Groups、確認日: 2026-10-03）
[^27]: Microsoft『Default user permissions - Microsoft Entra』ms.date 2026-06-18, updated 2026-06-23. https://learn.microsoft.com/en-us/entra/fundamentals/users-default-permissions （参照箇所: Member and guest users, Restrict guest users' default permissions、確認日: 2026-10-03）
[^28]: Microsoft『Granular delegated admin privileges (GDAP) introduction』Partner Center, ms.date 2026-04-28, updated 2026-05-27. https://learn.microsoft.com/en-us/partner-center/customers/gdap-introduction （参照箇所: What is GDAP in Partner Center?、確認日: 2026-10-03）
[^29]: Google『Domain-wide delegation best practices』Google Workspace Admin Help, 版の記載なし. https://support.google.com/a/answer/14437356?hl=en （2026-10-03 時点で https://knowledge.workspace.google.com/admin/apps/domain-wide-delegation-best-practices へ転送される。参照箇所: 冒頭, Avoid using domain-wide delegation, Restrict service account key creation and upload、確認日: 2026-10-03）
[^30]: Okta Security『Unauthorized Access to Okta's Support Case Management System: Root Cause and Remediation』2023-11-03. https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/ （参照箇所: 影響範囲、根本原因、是正策、確認日: 2026-10-03）
[^31]: Microsoft Threat Intelligence『Midnight Blizzard: Guidance for responders on nation-state attack』Microsoft Security Blog, 2024-01-25. https://www.microsoft.com/en-us/security/blog/2024/01/25/midnight-blizzard-guidance-for-responders-on-nation-state-attack/ （参照箇所: 初期侵入と OAuth アプリ悪用の記述、確認日: 2026-10-03）
[^32]: Cyber Safety Review Board『Review of the Summer 2023 Microsoft Exchange Online Intrusion』2024-03-20. https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf （参照箇所: Recommendation 4, §2.1.3 Audit Logging Norms（Recommendation 10）, 推奨事項の要約、確認日: 2026-10-03）
[^33]: CISA, FBI『Product Security Bad Practices』Version 2.0, 2025-01-17. https://www.cisa.gov/resources-tools/resources/product-security-bad-practices （参照箇所: MFA に関する bad practice、10) evidence of intrusion の bad practice、確認日: 2026-10-03）
[^34]: GitHub『About the audit log for your enterprise』GitHub Enterprise Cloud Docs, 版の記載なし. https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/about-the-audit-log-for-your-enterprise （参照箇所: 保持期間、Audit log API、streaming、確認日: 2026-10-03）
[^35]: Slack『Audit Logs API』Slack Developer Docs, 版の記載なし. https://docs.slack.dev/admins/audit-logs-api/ （参照箇所: 冒頭の提供プラン、auditlogs:read のインストール条件、read only の記述、確認日: 2026-10-03）
[^36]: Microsoft『Cross-tenant access overview - Microsoft Entra External ID』ms.date 2025-03-28, updated 2026-03-27. https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview （参照箇所: Manage external access with inbound and outbound settings, Default settings, Automatic redemption setting, Protect cross-tenant access administrative actions, Identify changes to cross-tenant access settings、確認日: 2026-10-03）
[^37]: OpenID Foundation (A. Tulshibagwale ほか)『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: §2 Subject Principals, §3.3 Complex Subject Members、確認日: 2026-10-03）
[^38]: OpenID Foundation (T. Cappalli, A. Tulshibagwale)『OpenID Continuous Access Evaluation Profile 1.0』Final, 2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: Abstract, §3.1〜§3.8 のイベント種別、確認日: 2026-10-03）
[^39]: Microsoft『Shared responsibility in the cloud』Microsoft Learn, ms.date 2026-08-24. https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility （参照箇所: Note, Division of responsibility, Responsibility matrix, Responsibilities you always retain、確認日: 2026-10-03）
[^40]: 日本国『個人情報の保護に関する法律（平成十五年法律第五十七号）』e-Gov 法令検索（法令 API v2、改正反映: 令和 7 年法律第 70 号、2026-10-01 施行分まで）. https://laws.e-gov.go.jp/law/415AC0000000057 （参照箇所: 第 25 条、第 26 条第 1 項・第 2 項、確認日: 2026-10-03）
[^41]: Microsoft『Microsoft Entra External ID Overview』ms.date 2026-04-24, updated 2026-06-15. https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview （参照箇所: Collaborate with business guests, What are workforce and external tenants?, B2B direct connect、確認日: 2026-10-03）
[^42]: Microsoft『Configure Tenant Restrictions（tenant restrictions v2）』ms.date 2026-03-20, updated 2026-06-11. https://learn.microsoft.com/en-us/entra/external-id/tenant-restrictions-v2 （参照箇所: authentication plane／data plane protection の説明, proxy による header 挿入の制約、確認日: 2026-10-03）
[^43]: Slack『Slack Connect guide: Work with external organizations』Slack Help Center, 版の記載なし. https://slack.com/help/articles/115004151203-Slack-Connect-guide--Work-with-external-organizations （参照箇所: Channel ownership, Apps の扱い。独立検証では地域転送により同一記事の日本語版（/intl/ja-jp/、「チャンネルのオーナーの権限」「アプリとワークフローの使用」）で照合、確認日: 2026-10-03）
[^44]: Slack『Manage Slack Connect channel approval settings and invitation requests』Slack Help Center, 版の記載なし. https://slack.com/help/articles/115005912706 （参照箇所: Manage approval settings per organization（Enterprise plans）。独立検証では地域転送により同一記事の日本語版（/intl/ja-jp/、「オーガナイゼーションごとに承認設定を管理する」）で照合、確認日: 2026-10-03）
[^45]: Google『Create and manage trust rules for Drive sharing』Google Workspace Admin Help, 版の記載なし. https://knowledge.workspace.google.com/admin/security/create-and-manage-trust-rules-for-drive-sharing （参照箇所: External organization の条件, 条件の種類、確認日: 2026-10-03）
[^46]: GitHub『About Enterprise Managed Users』GitHub Enterprise Cloud Docs, 版の記載なし. https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/about-enterprise-managed-users （参照箇所: IdP による provisioning と管理、managed user の制約、partner IdP、OIDC と CAP、確認日: 2026-10-03）
[^47]: GitHub『Abilities and restrictions of managed user accounts』GitHub Enterprise Cloud Docs, 版の記載なし. https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/abilities-and-restrictions-of-managed-user-accounts （参照箇所: enterprise 外との協働の制限、repository collaborator、guest collaborator ロール、確認日: 2026-10-03）
[^48]: Okta『Integrate Okta Org2Org with Okta』Okta Help Center, 版の記載なし. https://help.okta.com/en-us/content/topics/provisioning/org2org/org2org-integrate.htm （参照箇所: 概要、hub-and-spoke、provisioning の接続方式、SAML assertion 暗号化の非対応、確認日: 2026-10-03）
[^49]: Microsoft（CNA）『CVE-2025-55241 Azure Entra ID Elevation of Privilege Vulnerability』CVE Record, 公表 2025-09-04, 更新 2026-02-26. https://www.cve.org/CVERecord?id=CVE-2025-55241 （参照箇所: CNA container の title・metrics（CVSS 3.1）・problemTypes（CWE-287）。CVE Services API の JSON で取得、確認日: 2026-10-03）
[^50]: IETF『RFC 9865 Cursor-Based Pagination of System of Cross-domain Identity Management (SCIM) Resources』Proposed Standard, 2025-10. https://www.rfc-editor.org/rfc/rfc9865 （参照箇所: RFC Editor のメタデータ（status、updates: RFC 7643・7644）、確認日: 2026-10-03）
[^51]: OpenID Foundation『PRESS RELEASE: OpenID Foundation finalizes global standards for real-time identity security』2025-09-16. https://openid.net/press-release-openid-foundation-finalizes-global-standards-for-real-time-identity-security （参照箇所: 本文冒頭（3 仕様の Final 承認）、確認日: 2026-10-03）
[^52]: Google『Allow external sharing with only trusted domains』Google Workspace Admin Help, 版の記載なし. https://knowledge.workspace.google.com/admin/domains/allow-external-sharing-with-only-trusted-domains （参照箇所: Remove a domain from your allowlist、確認日: 2026-10-03）
[^53]: Google『Super administrator SSO』Google Workspace Help, 版の記載なし. https://knowledge.workspace.google.com/admin/apps/super-administrator-sso （参照箇所: 冒頭（legacy SSO profile でのみ対応、新しい SSO profile は非対応）、IdP 侵害時のリスクの記述、When super admins can sign in with SSO、確認日: 2026-10-03）
[^54]: OpenID Foundation『IPSIE Working Group - Specifications』. https://openid.net/wg/ipsie/specifications/ （参照箇所: Final Specifications「None yet」、Implementer's Drafts「None yet」、Drafts、確認日: 2026-10-03）
[^55]: デジタル庁 e-Gov 法令検索『個人情報の保護に関する法律 改正履歴』法令 API v2（law_revisions）. https://laws.e-gov.go.jp/api/2/law_revisions/415AC0000000057 （参照箇所: 令和 8 年法律第 56 号の公布日 2026-07-17・施行日 2026-07-17／2027-01-17／2028-07-16 と施行状態、および改正後条文（law_data の 415AC0000000057_20270117_508AC0000000056 と 415AC0000000057_20280716_508AC0000000056）の第 25 条・第 26 条、確認日: 2026-10-03）
[^56]: Microsoft Security Response Center『CVE-2025-55241 Azure Entra ID Elevation of Privilege Vulnerability』Security Update Guide, 公表 2025-09-04, 改訂 1.1 2025-09-18. https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-55241 （参照箇所: FAQ（緩和済み・利用者対応不要）、Exploitability（Publicly Disclosed / Exploited）、Revisions。MSRC の公開 API（api.msrc.microsoft.com/sug/v2.0）の JSON で取得、確認日: 2026-10-03）
