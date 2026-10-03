# RS-12 実事故ケーススタディ（認証・認可基盤の事故一次報告の整理）

> 文書ID: RS-12 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-003, R-006, R-013, R-037, R-042, R-047, R-049〜R-057, R-110〜R-117, R-123, R-128, R-161, R-166, R-168, R-184, R-187, R-207, R-210
> 依存文書: CONVENTIONS.md、traceability/seed/seed-01-ciso-assurance.md（R-ID の出典）、traceability/seed/seed-02-cto-technical.md（§10 事故対応表・ADR 一覧）、traceability/seed/seed-03-redteam-decision.md（§1 D1 実例）

本ノートは、seed-02 §10 と seed-03 §1 が挙げた事故を、当事者の事後報告（RCA/PIR）、政府報告（CSRB）、CISA の勧告・緊急指令、当事者が委託した調査機関（Mandiant/Google Threat Intelligence Group）の報告、および発見者の一次開示で確認し直したものである。seed の記述は手掛かりとしてのみ使い、根拠には使っていない。本ノートの調査・起草には AI エージェント（Claude）を用いた。原典の取得方法（直接取得／アーカイブ経由／要約ツール経由）は §6 と参考文献に記す。

---

## 1. 調査の問い

seed（seed-02 §10、seed-03 §1 D1）由来の問い:

1. 各事故で何が起き、どの設計上・運用上の前提が破られたか。
2. 当事者が公表した根本原因と是正策は何か。根本原因が未確定のものはどれか。
3. 侵入から検知までの時間はどれだけで、検知したのは誰か（自社か、顧客・取引先・第三者か）。
4. 影響範囲（blast radius）はどこまで広がり、何がそれを広げ、何が抑えたか。
5. seed-02 §10 の「事故→対応要件・統制・ADR・KRI」対応表は、一次報告で支持されるか。
6. 共通認証基盤への単一依存は、どのような相関障害を起こしたか（seed-03 D1）。

本ストリームで追加した問い:

7. seed-02/03 の事故記述のうち、一次報告と食い違う箇所はどこか。
8. 監査ログ（既定で提供されるか、保持期間、顧客が読めるか）は、検知と根本原因の究明にどう効いたか。
9. 第三者連携・サポート窓口・ヘルプデスクの経路は、どの事故にどう関与したか。
10. 公表・訂正・顧客通知の運用について、一次報告は何を指摘しているか。
11. 各教訓のうち、既存の規範（RFC 9700、OpenID Connect Core）がすでに要求しているものはどれか。規範の外にあり、自社で判断すべきものはどれか。

---

## 2. 結論サマリ（設計への含意）

1. 署名鍵が侵害されたときの被害範囲は、鍵の寿命・鍵のスコープ・検証側の issuer/tenant 結合の三つで決まる。Storm-0558 では、2016 年作成の consumer 鍵が回転されないまま 2023 年まで有効で、しかも enterprise token として受理された [I][^1]。そのため、鍵の自動回転と鍵年齢の監視、テナントや issuer 単位での鍵のスコープ限定、全サービス共通の検証ライブラリが基盤の必須要件になる [D]（RS-12#3〜#6、#10、#11 から導出）。
2. 鍵のライフサイクル操作（回転・不要鍵の削除）それ自体も、認証基盤全体を止める障害源になる。Azure AD は 2021-03-15、使われていない鍵を定期的に削除する自動処理が「retain」指定を無視して署名鍵を削除し、依存アプリが token を信頼しなくなった [I][^29]。CSRB も、consumer MSA 系統では 2021 年に手動回転に関連する大規模なクラウド障害が起き、それを機に回転が全面停止されたと認定している（CSRB p.6）[I][^1]。鍵の追加・削除は段階展開（cell 単位の canary）と保持状態の強制検査の対象にしなければならない [D]（RS-12#4、#57 から導出）。
3. 「検証ライブラリがすべて検証してくれる」という開発者の前提が破られた事例がある [I][^4]。このため、issuer・tenant・audience の検証は利用側の実装に任せず、共通 SDK と PEP が既定で強制し、別鍵・別テナント token の負例試験を CI に常設する必要がある [D]（RS-12#5、#6、#11 から導出）。
4. 非本番・レガシー・テスト用の資産が本番相当の権限を持っていたことが、侵入の起点になった。Midnight Blizzard は MFA のない旧テストテナントのアカウントから入り、corporate 環境で高い権限を持つ旧テスト OAuth アプリを悪用した [I][^8]。全テナント・全 OAuth アプリ（app-only 権限を含む）を台帳化し、環境区分にかかわらず同じ認証要件を課すことが統制になる [D]（RS-12#15〜#18 から導出）。
5. 第三者連携が保持する長寿命の OAuth token は、複数の事故で侵害の運搬手段になった。Heroku/Travis CI 経由の GitHub token、Salesloft Drift 経由の Salesforce token、CircleCI に保管された顧客の秘密情報がその例である [I][^31][^16][^22]。基盤は、第三者 grant の寿命・scope・送信者拘束・IP 制限・一括失効・大量 export の検知を設計要件として持つ必要がある [D]（RS-12#37〜#41、#46、#47、#59〜#62 から導出）。
6. サポート窓口とヘルプデスクは、資格情報が漏えいし本人確認が迂回される経路になった。Okta では HAR ファイル内の session token が流出し、Scattered Spider はヘルプデスクを騙してパスワードと MFA を再設定させ、Cloudflare では Salesforce のサポートケース本文に API token が含まれていた [I][^10][^23][^18]。回復と要素リセットの高保証化、およびサポートへのアップロード物のサニタイズは、認証基盤の範囲に含めて設計すべきである [D]（RS-12#22〜#27、#48、#41 から導出）。
7. MFA を通過した後の session や資格情報の窃取は、MFA だけでは防げなかった。CircleCI では 2FA 済み SSO session が盗まれ、LastPass では MFA 認証後にマスターパスワードが keylogger で取得され、Okta では HAR 内の session token が再利用された [I][^22][^35][^10]。特権操作には、session の束縛（ネットワーク・端末）と step-up の再認証を要求する必要がある [D]（RS-12#22、#25、#46、#47、#64 から導出）。
8. 単一要素のパスワードと、回転されない資格情報が大量侵害の主因だった。Snowflake 顧客環境の侵害では、MFA 未設定・最長 4 年未回転の資格情報・ネットワーク許可リストなしの三点が挙げられている [I][^14]。人間には AAL2 以上を既定とし、サービス利用者にはパスワードを禁止し、侵害通知を受けたら未使用判定に頼らず全件を回転することを既定の手順とすべきである [D]（RS-12#16、#28、#33〜#36 から導出）。
9. 可変属性によるアカウント連結は、テナントを越えた乗っ取りを生んだ。nOAuth は email claim による連結、Scattered Spider は攻撃者が追加した federated IdP の自動連結を悪用した [I][^19][^23]。利用者の識別は iss+sub（Entra では tid+oid 相当）に限定し、IdP の追加や自動連結の有効化は高リスクの管理操作として二者承認の対象にすべきである [D]（RS-12#42〜#44、#49 から導出）。OIDC Core §5.7 は、iss と sub の組だけが安定した識別子だと規定している [N][^37]。
10. 内部のサービス間 token とレガシー API は、外部向けの token profile の統制から外れていた。CVE-2025-55241 では、未文書化の Actor token と、送信元テナントを検証しないレガシー Azure AD Graph API の組合せで、テナントを越えたなりすましが可能だったと発見者が報告している [I][^25]。Microsoft はこれを Critical、CVSS 10.0 と評価している [I][^26]。内部 token にも署名・テナント結合・発行ログ・失効性を要求し、レガシー API には期限付きの廃止計画を持たせる必要がある [D]（RS-12#53〜#55 から導出）。
11. 検知の多くは自社ではなく顧客・取引先・第三者が起点だった。Storm-0558 は米国務省、Okta は顧客の 1Password と BeyondTrust、CircleCI は顧客、Heroku は GitHub が最初に気付いた [I][^1][^10][^22][^32]。CSRB は、Microsoft が自社の基準に合わない偽造 token を検知する仕組みを持っていれば、自力で阻止または検知できた可能性が高いと述べている [I][^1]。監査ログを既定・無償・長期保持で顧客に開放すること、発行記録との照合（stateful token）で偽造 token を検知すること、自力検知率を KRI にすることが含意になる [D]（RS-12#2、#10、#12、#24、#47、#60 から導出）。
12. ログの保持期間が不足していたため、根本原因を特定できない事例があった。Storm-0558 の鍵窃取経路は、2024-03 の時点でも未確定である [I][^1]。CSRB は、鍵系システムのアクセスログを、鍵の使用期間に加えて失効後少なくとも 2 年保持するよう勧告している [I][^1]。鍵・管理面・発行系のログ保持期間は、ADR-014 で鍵寿命に連動させて決める必要がある [D]（RS-12#7、#8、#12 から導出）。
13. 認証基盤そのものの障害は、依存する全サービスへ同時に波及した。Google は 2020-12-14 に 47 分間、Google OAuth を要する顧客向けサービスが使えなくなった [I][^30]。Azure AD の 2021-03-15 の障害では、依存サービスの回復が翌日まで続いた [I][^29]。cell 分割、鍵メタデータ変更の段階展開、依存側の静的安定性（直近の検証可能状態での継続）と、剥奪の反映とのトレードオフを ADR-013 で明示する必要がある [D]（RS-12#57、#58 から導出）。
14. 公表と訂正の遅れは、それ自体が顧客のリスク判断を損なうと指摘されている。CSRB は、Microsoft が 2023-09-06 のブログの根本原因の記述を、公表後まもなく裏付けがないと認識し（2023 年 11 月には CSRB に誤りを認め）ながら、公表から 6 か月以上たった 2024-03-12 まで訂正しなかったことを問題視した（CSRB p.iii、p.18）[I][^1]。runbook（ADR-019）には、「分かっていること・分かっていないこと」の公表と訂正の手順を含める必要がある [D]（RS-12#7、#13 から導出）。

---

## 3. 調査結果

凡例: 各項目の引用は原典の英語原文である。CSRB 報告の頁番号は印刷頁（PDF 頁から 5 を引いた値）で示す。

### 3.1 Storm-0558（2023、CSRB 報告 2024-03-20）

**RS-12#1** Storm-0558 は 2023 年 5〜6 月に、22 組織・500 人超の Exchange Online メールボックスに、Microsoft が 2016 年に作成した鍵で署名された認証 token を使ってアクセスした（CSRB p.iii）[I][^1]。
Microsoft の初報（2023-07-11）は、2023-05-15 以降に約 25 組織のメールアカウントが影響を受けたとしていた。また、MSA（consumer）鍵と Azure AD（enterprise）鍵は別システムで発行・管理され、それぞれのシステムでのみ有効であるべきところ、token 検証の問題により consumer 鍵で Azure AD 利用者になりすませたと説明していた [I][^2]。
> "accessed the accounts using authentication tokens that were signed by a key Microsoft had created in 2016."

**RS-12#2** 最初に侵入を検知したのは被害組織の米国務省である。国務省の SOC は 2023-06-15 にメールシステムへのアクセスの異常を検知した。翌 06-16 には、MailItemsAccessed ログを分析する独自ルール（"Big Yellow Taxi"）の警報を確認し、同日 Microsoft へ連絡した（CSRB p.1）[I][^1]。このログは、上位の有償ライセンス（G5 / Purview Audit Premium）がなければ利用できなかった（CSRB p.1）[I][^1]。国務省だけで約 60,000 通のメールがダウンロードされた（CSRB p.1）[I][^1]。
> "The MailItemsAccessed log was not accessible without that "premium" service."

**RS-12#3** 2016 年の MSA 鍵は 2021 年 3 月に退役する予定だったが、consumer 鍵系統の堅牢化に伴う問題で削除が遅れていた（CSRB p.2）[I][^1]。

**RS-12#4** consumer MSA 系統には当初、署名鍵の自動回転の仕組みがなく、手動で回転していた。2021 年に手動回転に起因する大規模障害が起きた後、Microsoft は回転を全面的に停止した。そのうえで、有効な署名鍵の年齢を通知する警報も持っておらず、作りもしなかった（CSRB p.6）[I][^1]。
> "While Microsoft had paused manual key rotation, it neither had, nor created, an automated alerting system to notify the appropriate Microsoft teams about the age of active signing keys in the consumer MSA service."

**RS-12#5** consumer 鍵が enterprise メールにアクセスできたのは、次の経緯による（MSRC 2023-09-06）[I][^4]。2018 年 9 月に consumer と enterprise の共通の鍵メタデータ公開 endpoint が導入された。一方、検証用ライブラリは鍵スコープの検証を自動化するように更新されなかった。メール系システムは 2022 年に共通 endpoint を使い始めたが、開発者はライブラリが完全に検証すると誤認し、issuer/scope の検証を追加しなかった。CSRB も、共通 endpoint 内の consumer 鍵と enterprise 鍵を区別するよう SDK が十分に更新されていなかったと認定している（CSRB p.6）[I][^1]。
> "Developers in the mail system incorrectly assumed libraries performed complete validation and did not add the required issuer/scope validation."

**RS-12#6** 攻撃者は偽造 token で OWA に認証した後、OWA の GetAccessTokenForResource API に以前発行された token を提示して、新しい access token を得ていた。Microsoft はこれを設計上の欠陥とし、Azure AD または MSA がそれぞれ発行した token だけを受け付けるよう修正した [I][^3]。
> "The actor was able to obtain new access tokens by presenting one previously issued from this API due to a design flaw."

**RS-12#7** 鍵の入手経路はいまも確定していない。Microsoft は 2023-09-06 に「2021 年の crash dump から漏えいした可能性が最も高い」と公表した。しかし 2024-03-12 の追記で、該当する鍵素材を含む crash dump は見つかっていないと訂正した [I][^4]。CSRB は、crash dump からの持ち出しを示す証拠もログも Microsoft にはないと認定している（CSRB p.5）[I][^1]。Microsoft 自身も、ログ保持方針のために窃取の具体的な証拠ログがないと記している [I][^4]。
> "The blog below states that the actor access may have resulted from a crash dump in 2021, but we have not found a crash dump containing the impacted key material."

**RS-12#8** 侵害期間の起点は、Microsoft が公表した 2023-05-15 より前だった可能性がある。CSRB は、標準のログ保持期間が 30 日だったことを理由にこの点を指摘している（CSRB p.3）[I][^1]。
> "the Board heard that Microsoft's window of compromise may have started earlier than May 15, as it had published, based on standard 30-day log retention practices."

**RS-12#9** 鍵の無効化日は資料によって異なる。CSRB は 2023-06-24 に盗まれた鍵を無効化したとしている（CSRB p.3）[I][^1]。Microsoft Threat Intelligence の記録は、06-27 に OWA でこの鍵で署名された token の使用を遮断、06-29 に鍵の置換を完了、07-03 に consumer 顧客での使用を遮断、としている [I][^3]。

**RS-12#10** CSRB は反実仮想として次の三点を認定している（CSRB p.17）[I][^1]。手動回転の停止をせず、自動回転への移行を完了し、鍵年齢の警報を置いていれば、2016 年の鍵は 2023 年に有効ではなかった。consumer 鍵が enterprise データに認証できる誤りがなければ、被害は enterprise 顧客に及ばなかった。自社の token 生成方式に合わない偽造 token を検知・防止する仕組みがあれば、Microsoft 単独で阻止または検知できた可能性が高い。
> "If Microsoft had deployed alerting or prevention to detect forged tokens that do not conform to Microsoft's own token generation algorithms, this incident likely could also have been stopped or detected by Microsoft all on its own."

**RS-12#11** CSRB の Recommendation 6 は、CSP は ID・資格情報の基盤を、システム全体の侵害のリスクを大幅に下げるように設計すべきである（"should"）とし、そのための仕組みとして次の八つを挙げている（CSRB p.20–21）[I][^1]。「should」が掛かるのは設計目標であり、八つの仕組みは「These mechanisms include the following」として示された例である。CSRB は、具体的な実装は用途や状況により異なり得るとし、各 CSP が同等の手段（"or their equivalents"）を選ぶことも認めている（CSRB p.20）[I][^1]。
- stateful token（発行時に DB へ記録し、アクセス時に照合する）
- 監視付きの自動・高頻度の鍵回転（例: 月次）
- 顧客テナント単位の鍵スコープ
- 束縛 token
- 共通の認証ライブラリ
- 隔離された鍵保管（可能なら専用 HSM）
- 単一の認証イベントから派生した token の連結の顧客ログへの開示
- token 生成への独自データの注入

これは政府の審査委員会の勧告であり、規範（標準）ではない [I][^1]。
> "Tying encryption keys to customer tenancy would limit the scope of key compromise."
> "By ensuring that all CSP services use the same authentication libraries, CSPs can more effectively enforce consistent token validation behavior and authorization policy."

**RS-12#12** CSRB の Recommendation 5 は、次の二点を求めている（CSRB p.20）[I][^1]。
- ID 基盤と root 鍵素材へのアクセスをすべて記録し、継続的に分析すること。
- その保持期間を、鍵の使用期間全体に加えて失効後少なくとも 2 年とすること。高価値のログ種別は 10 年以上も適切とする。

Recommendation 10 は、CSP が CISA 主導のタスクフォースの一員として、クラウドの既定の監査ログに関する最低基準を定めて採用すべきだとしている。その基準は少なくとも、顧客のビジネスデータへのすべてのアクセス（CSP 自身のアクセスを含む）について、追加料金なしで顧客が利用できるログを生成し、CSP が既定で最低 6 か月保持することを確保するものとされる（CSRB p.22）[I][^1]。Recommendation 11 は、DPoP（束縛 token）と OpenID Shared Signals の実装を求めている（CSRB p.22）[I][^1]。
> "Retention should include all time the key was in active use and extend at least two years beyond the expiration of that key."

**RS-12#13** CSRB は Microsoft の公表運用も問題にしている（CSRB p.iii）[I][^1]。Microsoft は 2023 年 11 月に 9 月 6 日のブログの誤りを CSRB に認めながら、訂正したのは 2024-03-12 だった。

**RS-12#14** Microsoft は是正として、次の進捗を公表している [V][^5]。
- Entra ID と MSA の access token 署名鍵を、HSM と Windows の仮想化ベースセキュリティへ移行し、自動回転にしたことを 2024 年 9 月に発表した（2024 年 9 月は発表時期で、移行完了日は本文に記載がない）。
- MSA の署名サービスを Azure confidential VM へ移行した。Entra ID の署名サービスは、2025-04 時点で同じ環境へ移行中とされている。
- 2025-04 時点で、Microsoft アプリ向けの Entra ID の identity token の 90% を、一つの硬化済み identity SDK で検証している。

これらはベンダーの自己申告で、第三者による検証は本ストリームでは確認していない [V][^5]。

### 3.2 Midnight Blizzard（2024、MSRC）

**RS-12#15** Midnight Blizzard は 2023 年 11 月下旬から、password spray で旧来の非本番テストテナントのアカウントを侵害して足場を得た。そのアカウントの権限を使って、上級幹部・サイバーセキュリティ・法務などを含む Microsoft 社内メールアカウントのごく一部にアクセスし、メールと添付文書を持ち出した [I][^6]。Microsoft が攻撃を検知したのは 2024-01-12 である [I][^6]。
> "Beginning in late November 2023, the threat actor used a password spray attack to compromise a legacy non-production test tenant account and gain a foothold, ..."

**RS-12#16** 侵害されたテストテナントのアカウントには MFA が設定されていなかった [I][^8]。攻撃者は次の手順で権限を広げた [I][^8]。
1. 初期アクセスを足掛かりに、Microsoft corporate 環境で高い権限を持つ旧テスト OAuth アプリを特定して侵害した。
2. 悪意ある OAuth アプリを追加で作成し、同意を付与するための新規ユーザーを作成した。
3. 旧テスト OAuth アプリを使って、Exchange Online の full_access_as_app ロールを付与した。
> "Midnight Blizzard leveraged their initial access to identify and compromise a legacy test OAuth application that had elevated access to the Microsoft corporate environment."

**RS-12#17** 攻撃者は対象を少数のアカウントに絞り、試行回数を少なくし、住宅用プロキシ網を経由した。Microsoft は、住宅用プロキシは IP アドレスの入れ替わりが激しいため、従来型の IOC ベースの検知を実行困難（"infeasible"）にすると記している [I][^8]。Microsoft は、EWS の活動と監査ログ機能を調べることで攻撃を特定した [I][^8]。

**RS-12#18** Microsoft は、同じチームが今そのレガシーテナントを作るなら、必須のポリシーとワークフローにより MFA と能動的な保護が有効になると述べている [I][^8]。あわせて、既存の業務を妨げる場合でも、現行のセキュリティ基準を自社のレガシーシステムに直ちに適用するとしている [I][^6]。
> "If the same team were to deploy the legacy tenant today, mandatory Microsoft policy and workflows would ensure MFA and our active protections are enabled to comply with current policies and guidance, ..."

**RS-12#19** 2024-03-08 の更新で、Microsoft は次の三点を公表した [I][^7]。
- 攻撃者が社内メールから持ち出した情報を使って、一部のソースコードリポジトリと内部システムにアクセスした。
- 持ち出された秘密情報の一部は、顧客と Microsoft の間でメールに書かれて共有されていた。
- password spray の量が 2 月に最大 10 倍に増えた。
> "Some of these secrets were shared between customers and Microsoft in email, ..."

**RS-12#20** CISA は 2024-04-02 に緊急指令 ED 24-02 を発出した。影響を受けた全連邦機関には、Microsoft との間で持ち出されたメール内容の特定と影響分析を、2024-04-30 までに行うよう義務付けた（"shall"）[I][^9]。認証情報の侵害が判明または疑われる機関には、即時の是正に加えて、関連アプリケーションの資格情報のリセットと、サインイン・token 発行等のログの確認を 2024-04-30 までに行うよう義務付けた（"shall"）[I][^9]。ED 24-02 は、その後目的達成として終了（sunset）している [I][^9]。
> "This Emergency Directive requires agencies to analyze the content of exfiltrated emails, reset compromised credentials, and take additional steps to ensure authentication tools for privileged Microsoft Azure accounts are secure."

**RS-12#21** Microsoft の防御ガイダンスは、次の四点を推奨している [I][^8]。
- すべての ID・service principal の権限を監査する。
- app-only 権限を持つアプリに特に注意する。
- EWS.full_access_as_app などの権限が今も必要かを見直し、不要なら削除する。
- メールボックスへのアクセスは、アプリ向け RBAC で特定のメールボックスに限定する。

### 3.3 Okta サポートシステム侵害（2023、Okta RCA）

**RS-12#22** 2023-09-28 から 10-17 まで、攻撃者は Okta の顧客サポートシステム内で 134 顧客（全顧客の 1% 未満）に関係するファイルにアクセスした [I][^10]。その一部は session token を含む HAR ファイルで、攻撃者はこれを使って 5 顧客の正規の Okta session を乗っ取った [I][^10]。

**RS-12#23** 不正アクセスには、サポートシステムに保存されていた service account が使われた。その資格情報は、従業員が Okta 管理下のノート PC の Chrome でサインインしていた個人の Google プロファイルに保存されていた。漏えい経路として最も可能性が高いのは、個人 Google アカウントか個人端末の侵害だとされている [I][^10]。
> "The username and password of the service account had been saved into the employee's personal Google account."

**RS-12#24** 検知には時間がかかった [I][^10]。
- 最初の顧客報告は 2023-09-29（1Password）だった。
- 14 日間、Okta は不審なダウンロードをログで特定できなかった。攻撃者が Files タブから直接取得していたため、別種のログイベントが記録されていたことが原因である。
- 2023-10-13 に BeyondTrust が IOC（IP アドレス）を提供した。
- 10-16 に service account を特定し、10-17 に無効化した。
> "For a period of 14 days, while actively investigating, Okta did not identify suspicious downloads in our logs."

**RS-12#25** Okta の是正は次の四つである [I][^10]。
- service account の無効化
- Chrome Enterprise 設定による個人 Google プロファイルの使用禁止
- サポートシステムの監視強化
- 管理者 session token のネットワーク位置への束縛。ネットワークが変わると再認証を求める。これは製品機能として公開され、顧客が管理ポータルの early access で有効化するものである [I][^10]。2023-11-29 の更新は、この機能を「IP アドレスの ASN が変わると再認証を求める」ものと説明し、有効化を強く推奨している [I][^12]。
> "Okta administrators are now forced to re-authenticate if we detect a network change."

**RS-12#26** 2023-11-29 の更新（SEC 提出 8-K の Exhibit 99.2）で、Okta は次の点を公表した [I][^12]。
- 攻撃者は、全サポートシステム利用者の氏名とメールアドレスを含むレポートを取得していた。
- 顧客は、自社の Okta org と同じアカウントでサポートシステムにサインインしており、その利用者の多くは Okta の管理者である。
- 特権アカウントのパスワードや要素をリセットする前に、ヘルプデスクの本人確認（視覚的確認など）を見直すよう推奨した。
> "Okta customers sign-in to Okta's customer support system with the same accounts they use in their own Okta org."

**RS-12#27** Okta は、HAR ファイルには cookie や session token が含まれ得るため、共有前に資格情報と cookie/session token を除去するよう推奨している [I][^11]。
> "In general, Okta recommends sanitizing all credentials and cookies/session tokens within a HAR file before sharing it."

### 3.4 Cloudflare Thanksgiving 2023（Cloudflare blog 2024-02-01）

**RS-12#28** 攻撃者は、2023 年 10 月の Okta 侵害で取られた access token 1 件と service account の資格情報 3 件を使った。Cloudflare はこれらを回転していなかった [I][^13]。回転しなかったのは、未使用だと誤って判断したためである [I][^13]。
> "The one service token and three accounts were not rotated because mistakenly it was believed they were unused."

**RS-12#29** 侵入の経過は次のとおりである [I][^13]。
- 2023-11-14 から偵察を始め、11-15 に Jira/Confluence へアクセスした。
- Smartsheet の service account が Jira の管理者権限を持っていたため、11-22 に ScriptRunner 経由で Sliver（C2 フレームワーク）を導入して永続化した。
- Jira チケット 36 件と wiki 202 頁を閲覧し、120 リポジトリを閲覧した。うち 76 リポジトリは git archive 機能で Atlassian サーバー上に取得された。持ち出しは確認できなかったが、Cloudflare は持ち出されたものとして扱った。
- 未稼働のサンパウロ DC のコンソールサーバーへのアクセスを試みたが、失敗した。

**RS-12#30** 検知の経過は次のとおりである [I][^13]。
- 2023-11-23 15:58 に、攻撃者が service account を管理者グループへ追加した。
- 16:00 に自動警報が発報し、16:35 に当該アカウントを無効化した。
- 11-24 10:44 が最後の攻撃者活動である。

**RS-12#31** Cloudflare は、アクセス制御、firewall、自社 Zero Trust で強制した hardware security key によって、攻撃者の横移動が制限されたと述べている [I][^13]。これは当事者の自己評価である。Cloudflare によれば、CrowdStrike の独立評価は Cloudflare の調査を裏付け、Cloudflare が見落とした活動は見つからず、最後の攻撃者活動を 11-24 10:44 と結論した [I][^13]。ただし CrowdStrike の最終報告書は、本ストリームでは公開されたものを確認していない。

**RS-12#32** 是正（"Code Red"）として、Cloudflare は次を実施した [I][^13]。
- 本番資格情報 5,000 件超の回転
- 4,893 システムのフォレンジックトリアージ
- 全世界のネットワークの全機器の再イメージ化
- wiki にアップロードされた HAR ファイルの調査と削除

### 3.5 Snowflake 顧客環境侵害（2024、Mandiant UNC5537）

**RS-12#33** Mandiant が対応した本キャンペーンの事案は、すべて顧客資格情報の侵害に起因していた。Snowflake の企業環境の侵害に由来する証拠は見つかっていない [I][^14]。Mandiant と Snowflake は、潜在的に影響を受けた約 165 組織に通知した [I][^14]。
> "Instead, every incident Mandiant responded to associated with this campaign was traced back to compromised customer credentials."

**RS-12#34** 侵害が成功した主因として、Mandiant は三つを挙げている [I][^14]。
- MFA が設定されていなかった。
- infostealer で盗まれた資格情報が、場合によっては何年も回転されないまま有効だった。
- ネットワーク許可リストがなかった。

攻撃者が使ったアカウントの少なくとも 79.7% は、資格情報が過去に露出していた。最も古い infostealer 感染は 2020 年 11 月だった [I][^14]。
> "The affected customer instances did not require multi-factor authentication and in many cases, the credentials had not been rotated for as long as four years."

**RS-12#35** 複数の事案で、最初の infostealer 感染は、個人用途（ゲーム、海賊版ソフトの入手）にも使われていた委託先の端末で起きていた。Mandiant は、一台の委託先端末の侵害が複数組織への侵入を可能にすると指摘している [I][^14]。

**RS-12#36** Snowflake の是正方針は次のとおりである [V][^15]。
- パスワードを使う人間の利用者全員に MFA を要求する。
- サービス利用者のパスワードを禁止する。
- 2025 年 9 月〜2026 年 1 月に Snowsight での MFA を必須化する。
- 2026 年 8〜10 月を目途に、全利用者に強い認証を強制する。

日付は「Estimated date」と表記された予定値であり、確認日は 2026-10-03 である [V][^15]。
> "Snowflake is rolling out changes to require multi-factor authentication (MFA) for all human users using passwords, and disallow passwords for all service users."

### 3.6 Salesloft Drift OAuth token 窃取（2025、GTIG/Salesloft）

**RS-12#37** UNC6395 は、遅くとも 2025-08-08 から少なくとも 08-18 まで、Salesloft Drift アプリに紐付く侵害済みの OAuth token を使い、多数の企業の Salesforce インスタンスから大量のデータを export した [I][^16]。攻撃者は持ち出したデータから、AWS アクセスキー・パスワード・Snowflake 関連 token などの秘密情報を探索した。痕跡隠しのために query job を削除したが、ログは残っていた [I][^16]。Salesloft は 2025-08-20、Salesforce と協力して Drift アプリの全 access token と refresh token を失効させた [I][^16]。

**RS-12#38** GTIG は、"Drift Email" 連携の OAuth token も侵害されており、2025-08-09 に少数の Google Workspace アカウントのメールにアクセスされたことを確認した [I][^16]。そのうえで、Drift に保存または接続されたすべての認証 token を侵害済みとして扱うよう勧告した [I][^16]。
> "We now advise all Salesloft Drift customers to treat any and all authentication tokens stored in or connected to the Drift platform as potentially compromised."

**RS-12#39** Mandiant の調査によれば、侵入は次の順で進んだ [I][^17]。
1. 2025 年 3〜6 月に Salesloft の GitHub アカウントへアクセスし、リポジトリのダウンロード、guest ユーザーの追加、workflow の設定を行った。
2. Drift の AWS 環境にアクセスし、顧客連携用の OAuth token を取得した。

調査の要約では、侵入期間を 2025-03-22〜09-05 としている。手口には GitHub Personal Access Token による偵察と秘密情報の列挙が含まれ、是正として PAT と外部 collaborator によるアクセスを廃止した [I][^17]。
> "The threat actor then accessed Drift's AWS environment and obtained OAuth tokens for Drift customers' technology integrations."

**RS-12#40** GTIG は Salesforce 側の対策として、次を推奨した [I][^16]。
- Connected App の scope を最小化する（full access のような過大な scope を避ける）。
- Connected App に IP 制限を強制する。
- session timeout を設定する。
- "API Enabled" 権限をプロファイルから外し、必要な利用者にだけ付与する。

**RS-12#41** 被害者の一社である Cloudflare の報告は次のとおりである [I][^18]。
- 2025-08-09 に偵察が始まり、08-12〜17 に Salesforce のサポートケース本文が持ち出された。
- 本体の持ち出しは、Bulk API 2.0 で約 3 分だった。
- Cloudflare が通知を受けたのは 08-23 である。
- 持ち出されたケース本文から、Cloudflare API token 104 件を見つけて回転した。
> "a total of 104 API tokens were rotated."

### 3.7 nOAuth（2023 Descope、2025 Semperis）

**RS-12#42** Descope の 2023-06-20 の開示内容は次のとおりである [I][^19]。
- Azure AD の email claim は、変更可能でかつ未検証である。
- そのため、email を一意識別子として使うマルチテナントアプリや、email でアカウントを統合するアプリでは、攻撃者が自分のテナントで被害者の email を設定すれば、アカウントを完全に乗っ取れる。
- Descope はこの問題を 2023-04-11 に Microsoft へ報告した。
> "In Microsoft Azure AD, the email claim is both mutable and unverified so it should never be trusted or used as an identifier."

**RS-12#43** MSRC（2023-06-20）は、email claim を認可に決して使わないよう勧告した [I][^20]。あわせて、大半のアプリについて、ドメイン所有者が未検証の email claim を token から省く緩和策を展開した [I][^20]。
> "Microsoft recommends never using the email claim for authorization purposes."

**RS-12#44** Semperis（2025-06-25）の調査結果は次のとおりである [I][^21]。
- Entra App Gallery の 1,017 の OIDC 連携のうち、セルフサインアップ可能な 104 アプリを試験し、9 アプリ（約 9%）が nOAuth に脆弱だった。
- 脆弱なアプリの顧客にとって、この攻撃の検知は困難で、防御は不可能である（アプリ側の修正を待つしかない）。SOC II 等の認証を掲げるベンダーにも脆弱なアプリがあった。
- 2023 年 6 月以降に作成されたアプリ登録では、未検証の email claim は既定で出力されない。
> "In testing of 104 applications, we found 9 that were vulnerable to nOAuth abuse; this translates to vulnerability in roughly 9% of tested applications."

**RS-12#45** OpenID Connect Core 1.0（errata set 2）§5.7 は、次の二点を定めている [N][^37]。
- ID Token の sub と iss の組だけが、RP が利用者の安定した識別子として依拠できる claim である。
- sub は issuer 内で局所的に一意で、再割当てされてはならない（MUST）。

email claim は、issuer が異なる利用者に時期を変えて再利用してもよく（MAY）、利用者の email は時間とともに変わってもよい（MAY）とされている [N][^37]。そのため、email・phone_number・preferred_username・name などの他の claim は、ID Token と UserInfo のどちらから得たものでも、利用者の一意識別子として使ってはならない（MUST NOT）[N][^37]。
> "The sub (subject) and iss (issuer) Claims from the ID Token, used together, are the only Claims that an RP can rely upon as a stable identifier for the End-User, ..."

### 3.8 CircleCI（2023）

**RS-12#46** 侵害は次の順で進んだ [I][^22]。
- 2022-12-16、CircleCI エンジニアのノート PC にマルウェアが展開された。ウイルス対策ソフトは検知しなかった。
- マルウェアは 2FA 済みの有効な SSO session（cookie）を盗み、攻撃者は本番システムの一部へ権限を昇格した。
- 当該従業員は通常業務として本番アクセス token を生成できたため、攻撃者は 12-22 に、顧客の環境変数・token・鍵を含むデータを持ち出した。
- 持ち出されたデータは保存時に暗号化されていたが、攻撃者は実行中のプロセスから暗号鍵を抽出していた。
> "an unauthorized third party leveraged malware deployed to a CircleCI engineer's laptop in order to steal a valid, 2FA-backed SSO session."

**RS-12#47** 検知は顧客の通知が契機だった [I][^22]。
- 2022-12-29、顧客から不審な GitHub OAuth の活動の通知を受けた。
- 2023-01-04、侵入の範囲と経路を特定した。
- 是正として、本番アクセスに追加の step-up 認証を課した。
- 顧客向けには、全 OAuth token の定期的な自動回転、OAuth から GitHub App への移行、権限の短命化を計画すると表明した。
- 顧客には、長寿命の資格情報を保管する代わりに OIDC token を使うよう推奨した。

CircleCI は、事故は個人の責任ではなく、システムの失敗だと明言している [I][^22]。
> "While one employee's laptop was exploited through this sophisticated attack, a security incident is a systems failure."

### 3.9 MGM / Scattered Spider（CISA AA23-320A）

**RS-12#48** CISA/FBI の共同勧告 AA23-320A（2023-11-16 初版、2025-07-29 改訂）が記す Scattered Spider の手口は次のとおりである [I][^23]。
- 従業員を装ってヘルプデスクに機微情報を出させ、パスワードをリセットさせ、MFA を攻撃者の端末へ移させる。
- SIM swap や MFA の連続通知（push bombing）を使う。

下の引用は、勧告の Overview で「According to public reporting」として列挙された項目（出典は CrowdStrike と Malwarebytes のブログ）である [I][^23]。ただし同勧告は、2025-07-29 改訂の Technical Details で、IT ヘルプデスク担当者を電話で騙してパスワードのリセットや MFA token の移転を行わせると、勧告自身の記述としても述べている [I][^23]。SIM swap と push bombing の使用も、Overview で勧告自身の記述として書かれている [I][^23]。
> "Posed as employees to convince IT and/or helpdesk staff to provide sensitive information, reset the employee's password, and transfer the employee's MFA to a device they control on separate devices."
> "Finally, the threat actors conduct spearphising calls to convince IT help desk personnel to reset passwords and/or transfer MFA tokens"

**RS-12#49** 同勧告によれば、Scattered Spider は過去に、標的組織の SSO テナントへ federated IdP を追加し、自動のアカウント連結を有効化した [I][^23]。攻撃者は IdP を支配しているので、一致する属性値を任意に設定して任意のアカウントにサインインでき、パスワードを変更されてもログインを続けられた [I][^23]。勧告は、この手口を現在の TTP としては確認していないとも記している [I][^23]。
> "Historically, the threat actors added a federated identity provider to the targeted organization's SSO tenant and activated automatic account linking [T1484.002]."

**RS-12#50** 同勧告によれば、攻撃者は侵入後、標的組織の Slack・Microsoft Teams・Exchange Online を検索して自分たちが検知されたかを確かめ、インシデント対応の会議にも参加していた [I][^23]。Snowflake へのアクセスを探して、数千件の query で大量のデータを持ち出していた [I][^23]。

**RS-12#51** 同勧告の緩和策は次のとおりである [I][^23]。
- FIDO/WebAuthn または PKI ベースの MFA を実装する。これらは push bombing と SIM swap に耐性がある。
- 可能な範囲で、すべてのサービスにフィッシング耐性のある MFA を要求する。
> "Implement FIDO/WebAuthn authentication or Public Key Infrastructure (PKI)-based MFA."

**RS-12#52** MGM Resorts の 2023-10-05 付の 8-K によれば、影響は次のとおりである [I][^24]。
- 2023 年 9 月のサイバーセキュリティ問題が、Adjusted Property EBITDAR に約 1 億ドルの負の影響を与えると見積もった。
- 一時費用は 1,000 万ドル未満だった。
- 2019 年 3 月以前に取引した一部顧客の個人情報（氏名、連絡先、性別、生年月日、運転免許証番号）が取得された。限られた数の顧客については、社会保障番号と旅券番号も取得された。

8-K は侵入手口を記述していない [I][^24]。AA23-320A は本文で MGM の名を挙げておらず、脚注で二次資料（報道系ブログ）に言及しているだけである [I][^23]。したがって、MGM の侵入がヘルプデスク経由だったことは、一次報告では未確認である。

### 3.10 CVE-2025-55241（Entra ID Actor token）

**RS-12#53** 発見者（Dirk-jan Mollema）の一次開示によれば、この脆弱性は二つの要素の組合せだった [I][^25]。
- Microsoft がバックエンドのサービス間通信に使う、未文書化のなりすまし用 "Actor token"。
- 送信元テナントを正しく検証しなかった、レガシーの Azure AD Graph API。

この組合せにより、攻撃者は自分のテナントで取得した token で、他の任意のテナントの任意の利用者（Global Admin を含む）になりすませた。
> "Additionally, there was a critical flaw in the (legacy) Azure AD Graph API that failed to properly validate the originating tenant, allowing these tokens to be used for cross-tenant access."

**RS-12#54** 同じく発見者によれば、この仕組みには次の性質があった [I][^25]。
- Actor token の発行はログに残らない。
- Actor token を埋め込んだなりすまし token は未署名である。
- 24 時間の有効期間中は失効できない。
- Conditional Access の制約を受けない。
- Azure AD Graph には API レベルのログがなく、読み取りは痕跡を残さない。

これらは発見者の記述で、Microsoft の公式文書による裏付けは本ストリームでは確認していない。
> "There are no logs when Actor tokens are issued."

**RS-12#55** 経緯は次のとおりである [I][^25]。2025-07-14 に MSRC へ報告され、07-17 に修正が全世界の本番へ展開された。08-06 に追加の緩和策が入り、09-04 に CVE が発行された。発見者によれば、Microsoft の内部テレメトリでは悪用は検知されていない [I][^25]。MSRC はこの CVE を次のように扱っている [I][^26]。
- 影響は Elevation of Privilege、深刻度は Critical、基本値 10.0 とした。
- すでに完全に緩和済みで、利用者の対応は不要とした。
- 透明性のために CVE を発行したと説明した。

NVD は、Microsoft（CNA）が提供した弱点分類 CWE-287（不適切な認証）を掲載している [I][^27]。MSRC の評価は CVSS v3.1 基本値 10.0（Scope: Changed）で、2025-09-18 の改訂で Attack Complexity を High から Low に改めている [I][^26]。一方、NVD 自身（nvd@nist.gov）の評価は 9.8（Scope: Unchanged）で、Microsoft の評価と異なる（2026-10-03 確認）[I][^27]。
> "This vulnerability has already been fully mitigated by Microsoft. There is no action for users of this service to take."

### 3.11 Microsoft Entra / Azure AD 系の他の重大事例

**RS-12#56** MSRC（2023-03-29）は、Wiz が報告したマルチテナントアプリの認可の誤設定を公表した [I][^28]。この誤設定は Microsoft 社内の少数のアプリに影響し、外部の者が読み書きできる状態だった。Azure AD は、resource テナントに登録されていない client への access token 発行を停止し、99% 超の顧客アプリでこの機能を無効化した [I][^28]。管理者には、マルチテナントとして登録されたアプリを棚卸しし、テナント外で使う必要がなければ audience を自テナントに限定するよう求めている [I][^28]。開発者には、oid 等のセキュリティ識別子に基づく認可と、client ごとに service principal を作成する手順の導入を求めている。あわせて、正しい認可検査の一部として、access token 内の service principal を確認するよう説明している [I][^28]。
> "Azure AD has been updated to stop issuing access tokens to clients that are not registered in the resource tenants."

**RS-12#57** Azure AD の 2021-03-15 の障害（Tracking ID LN01-P8Z）は次のとおりである [I][^29]。
- 2021-03-15 19:00 UTC から 03-16 09:37 UTC まで、Azure AD に依存する Microsoft サービスと第三者アプリで認証エラーが起きた。
- 原因は、使われていない署名鍵を削除する自動処理が、cross-cloud 移行のために「retain」と指定された鍵の状態を無視して、その鍵を削除したことである。
- 公開鍵メタデータが変わると、依存アプリは削除された鍵で署名された token を信頼しなくなった。
- Azure AD 自体の緩和は 21:05 UTC に完了したが、依存サービスの回復には時間差があった。
- 2020-09-28 の Azure AD 障害も同じ種類のリスクに属し、鍵削除を Safe Deployment Process で保護する作業は第 2 段階に予定されていた。
> "This exposed a bug where the automation incorrectly ignored that “retain” state, leading it to remove that particular key."

**RS-12#58**（関連、Entra 以外） Google の 2020-12-14 の障害は次のとおりである [I][^30]。
- Google User ID Service の quota 管理の自動化により、同サービスの使用量が誤って 0 と報告された。猶予期間が切れると quota が引き下げられ、認証の参照が失敗した。
- 03:46〜04:33（US/Pacific）の 47 分間、Google OAuth を要する顧客向けサービスが使えず、認証付きトラフィックのほぼすべてに 5xx を返した。
- 警報は顧客影響から 1 分以内に担当者を呼び出した。
> "On Monday 14 December, 2020, for a duration of 47 minutes, customer-facing Google services that required Google OAuth access were unavailable."

### 3.12 GitHub OAuth token（Heroku / Travis CI、2022）

**RS-12#59** GitHub は 2022-04-12、npm の本番基盤が侵害された AWS API キーで不正アクセスされたことを検知した [I][^31]。調査の結果、Heroku と Travis CI に発行された OAuth user token が盗まれ、数十組織の private リポジトリのダウンロードに使われていたことが分かった [I][^31]。GitHub は、これらの token を元の使用可能な形式では保存していないため、GitHub 自身の侵害ではないとしている [I][^31]。攻撃者は、取得したリポジトリから他の基盤へ移るための秘密情報を探していた可能性がある [I][^31]。
> "We do not believe the attacker obtained these tokens via a compromise of GitHub or its systems, because the tokens in question are not stored by GitHub in their original, usable formats."

**RS-12#60** Heroku の調査結果は次のとおりである [I][^32]。
- 攻撃者は 2022-04-07 に Heroku のデータベースへアクセスし、保存されていた顧客の GitHub 連携 OAuth token をダウンロードした。
- 初期アクセスには、Heroku の machine account の侵害済み token が使われた。この token は、第三者連携を経由してアクセスされたとみられる、アーカイブ済みの private GitHub リポジトリから入手されていた。ただし、どの第三者連携かは確定していない。
- 攻撃者はハッシュ化・salt 付きのパスワードと、Review Apps / Heroku CI の pipeline 設定変数も取得していた。
- Heroku は 2022-05-05 に顧客のパスワードをリセットした。
> "We began investigating how the threat actor gained initial access to the environment and determined it was obtained by leveraging a compromised token for a Heroku machine account."

**RS-12#61** Heroku は再発防止として、RFC 8705 に基づく mutual TLS と OAuth の秘密鍵保護、および GitHub App モデルによる、よりモジュール化されたアクセス権限を GitHub と検討すると表明した [I][^32]。
> "As we believe RFC-8705 based mutual TLS and private key protection for OAuth, as well as full fidelity between the Heroku GitHub OAuth integration and the GitHub App model provides more modular access privileges to connected repositories, we intend to explore these paths with GitHub."

**RS-12#62** RFC 9700（BCP 240）は、token について次のように定めている [N][^36]。
- public client の refresh token は、送信者拘束するか、refresh token rotation を使わなければならない（MUST、§2.2.2）。
- refresh token は、資源所有者が同意した scope と resource server に結び付けなければならない（MUST、§4.14.2）。
- access token の権限は最小限に制限すべきで（SHOULD）、特定の resource server に audience を制限すべきである（SHOULD、§2.3）。

confidential client の refresh token は、発行先の client だけが使えることを RFC 6749 がすでに求めていると、RFC 9700 は記している [N][^36]。
> "Refresh tokens for public clients MUST be sender-constrained or use refresh token rotation as described in Section 4.14."
> "If refresh tokens are issued, those refresh tokens MUST be bound to the scope and resource servers as consented by the resource owner."

### 3.13 LastPass（2022）

**RS-12#63** 2022 年 8 月の第 1 事案では、1 件の侵害済み開発者アカウントを通じて開発環境の一部へアクセスされ、ソースコードと技術情報が持ち出された [I][^33]。第 2 事案では、第 1 事案で得た情報を使ってクラウドストレージ環境へアクセスし、顧客 vault のバックアップを複製した [I][^33]。このバックアップには、暗号化されていない website URL などのデータと、暗号化された username・password などの機微項目が含まれていた [I][^33]。

**RS-12#64** 第 2 事案の手口は次のとおりである [I][^35]。
- 攻撃者は 2022-08-12〜10-26 に、クラウドストレージ環境で偵察・列挙・持ち出しを行った。
- DevOps エンジニアの自宅 PC にある第三者製メディアソフトの脆弱性を突き、keylogger を仕込んだ。
- 当該従業員が MFA で認証した後に入力したマスターパスワードを取得し、そのエンジニアの社内 vault に入った。
- 社内 vault の共有フォルダには、AWS S3 の本番バックアップの復号鍵が保管されていた。当該エンジニアは、この鍵にアクセスできる 4 人の DevOps エンジニアの 1 人だった。
> "The threat actor was able to capture the employee's master password as it was entered, after the employee authenticated with MFA, and gain access to the DevOps engineer's LastPass corporate vault."

**RS-12#65** 警報とログは有効だったが、攻撃者が正規の資格情報を使っていたため、正当な活動と区別するのが難しかった [I][^35]。最終的には、攻撃者が Cloud IAM ロールで不正な操作を試みた際の AWS GuardDuty の警報で異常を把握した [I][^35]。是正として、本番サービスの IAM 利用者キーの回転、IP 制限、最小権限化、SAML 証明書の回転、不要な SAML 証明書の削除などを実施した [I][^35]。
> "Ultimately AWS GuardDuty Alerts informed us of anomalous behavior as the threat actor attempted to use Cloud Identity and Access Management (IAM) roles to perform unauthorized activity."

**RS-12#66** 2023-03-01 の更新は、バックアップから持ち出された情報に、システム構成データ、API 秘密情報、第三者連携の秘密情報が含まれていたとしている [I][^34]。同更新は、2022-10-26 以降は攻撃者の活動を確認していないとしている [I][^34]。

### 3.14 横断整理表（事実）

検知までの時間は、一次報告の日付から算出した概算である。検知主体の「外部」は、顧客・取引先・第三者を指す。「破られた前提」の列は、一次報告が明示した記述ではなく、各行の RS-12 項目（根拠列）から本ストリームが解釈した設計推論である [D]。

| 事故 | 何が起きたか | 破られた前提（本ストリームの解釈） | 根本原因（当事者・公的機関の認定） | 検知までの時間・検知主体 | 影響 | 根拠 |
|---|---|---|---|---|---|---|
| Storm-0558 | consumer 署名鍵で enterprise 用 token を偽造し、メールを閲覧 [I] | 古い鍵は使われない／ライブラリが issuer を検証する／自社発行でない token は存在しない [D] | 鍵回転の停止と鍵年齢警報の欠如、共通 endpoint 導入後の検証漏れ。鍵の入手経路は未確定 [I] | 2023-05-15（公表値）→ 06-15〜16（約 1 か月）。外部（国務省） [I] | 22 組織・503 個人、国務省だけで約 6 万通 [I] | RS-12#1〜#10 |
| Midnight Blizzard | テストテナント→テスト OAuth アプリ→Exchange Online の full_access_as_app ロール付与 [I] | テスト資産は本番権限を持たない／旧テナントにも現行基準が適用されている [D] | MFA のない旧テストテナント、高権限の旧テスト OAuth アプリ [I] | 2023-11 下旬 → 2024-01-12（約 6〜8 週）。自社 [I] | 幹部等のメール、後にソースコードと内部システム、顧客との秘密情報 [I] | RS-12#15〜#20 |
| Okta サポート | service account で HAR を取得し、顧客 session を乗っ取り [I] | 業務用の資格情報は管理下の保管場所にある／サポート添付は機微情報を含まない [D] | 個人 Google プロファイルへの資格情報保存、HAR 内の session token [I] | 2023-09-28 → 10-16 特定（約 18 日）。外部の報告と IOC が契機 [I] | 134 顧客のファイル、5 顧客の session、全サポート利用者の氏名・メール [I] | RS-12#22〜#27 |
| Cloudflare | Okta 経由で流出した未回転の資格情報で Atlassian に侵入 [I] | 未使用の資格情報は回転しなくてよい [D] | 回転漏れ（1 token・3 アカウント）、service account の過大な権限 [I] | 2023-11-14 → 11-23（9 日）。自社の自動警報 [I] | 社内 wiki・Jira・76 リポジトリ。顧客データには及ばない（自己申告） [I] | RS-12#28〜#32 |
| Snowflake 顧客 | infostealer 由来の資格情報で顧客インスタンスへ侵入し、データを持ち出し [I] | 顧客が MFA を設定する／資格情報は回転される [D] | MFA 未設定、最長 4 年未回転、許可リストなし [I] | 資格情報の窃取は 2020-11 から。2024-04 に Mandiant が脅威情報を受領。外部 [I] | 約 165 組織に通知 [I] | RS-12#33〜#36 |
| Salesloft Drift | 連携の OAuth token で Salesforce 等から大量 export [I] | 連携事業者が token を安全に保管する／連携 token の流出は個別事象 [D] | GitHub アカウント侵害 → Drift の AWS 環境 → 顧客 token の取得 [I] | 2025-03 侵入 → 08-08〜18 窃取 → 08-20 失効（初期侵入から約 5 か月）。検知主体は一次報告で明示なし [I] | 多数の Salesforce インスタンス、一部の Workspace メール [I] | RS-12#37〜#41 |
| nOAuth | 可変 email claim によるアカウント連結で乗っ取り [I] | email は本人に固有で不変 [D] | アプリ側の誤った識別子設計（アンチパターン） [I] | 該当なし（設計欠陥）。2023 報告後、2025 にも 9/104 が脆弱 [I] | 脆弱なアプリの全利用者 [I] | RS-12#42〜#45 |
| CircleCI | 2FA 済み SSO session の窃取 → 本番 token 生成 → 顧客秘密情報の持ち出し [I] | MFA を通過した session は正当／保存時暗号化で保護される [D] | 端末マルウェア、本番 token 生成権限、実行中プロセスからの鍵抽出 [I] | 2022-12-16 → 12-29 顧客通知 → 2023-01-04 範囲特定（約 19 日）。外部 [I] | 顧客の環境変数・token・鍵 [I] | RS-12#46〜#47 |
| Scattered Spider（MGM） | ヘルプデスクの SE、MFA の移転、IdP 追加による連結 [I] | ヘルプデスクは本人を識別できる／IdP 追加は無害な設定変更 [D] | 公的機関による MGM 個別の根本原因の認定は未確認。AA23-320A の手口と緩和策からは、ヘルプデスク経由の回復手順の弱さとフィッシング耐性のない MFA が示唆される [D] | MGM の侵入開始日は一次報告で未確認。MGM は 2023-09 に認識 [I] | MGM で約 1 億ドルの EBITDAR 影響と顧客 PII [I] | RS-12#48〜#52 |
| CVE-2025-55241 | Actor token とレガシー API の組合せで、テナントを越えて Global Admin になりすませた（発見者開示） [I] | 内部 token は外部から悪用できない／API がテナントを検証する [D] | 送信元テナントの未検証、ログなし・失効不能の内部 token（発見者開示） [I] | 報告 2025-07-14 → 修正 07-17。悪用は未検知（Microsoft テレメトリ） [I] | 潜在的には全 Entra テナント。実害は報告なし [I] | RS-12#53〜#55 |
| Azure AD 2021-03-15 | 自動処理による署名鍵削除で認証失敗 [I] | 自動処理は保持指定を守る [D] | 鍵削除自動化のバグ、鍵削除が SDP 保護の対象外 [I] | 19:00 発生 → 21:05 緩和 → 翌 09:37 回復。自社テレメトリ [I] | Azure AD に依存する多数のサービス [I] | RS-12#57 |
| GitHub/Heroku/Travis | 連携事業者の保存 OAuth token で private リポジトリを取得 [I] | 連携事業者の token 保管は安全 [D] | Heroku の machine account token の侵害、DB からの token 取得 [I] | 2022-04-07 → 04-12（5 日）。外部（GitHub） [I] | 数十組織の private リポジトリ、npm [I] | RS-12#59〜#61 |
| LastPass | 開発環境の侵害 → 自宅 PC の keylogger → 復号鍵 → バックアップの取得 [I] | MFA 後の資格情報は安全／復号鍵の保管は分離されている [D] | 自宅端末の脆弱ソフト、vault 内に置かれた復号鍵 [I] | 2022-08-12〜10-26 の活動。正確な検知日は未確認。自社の GuardDuty [I] | 顧客 vault のバックアップ（一部項目は平文） [I] | RS-12#63〜#66 |

---

## 4. 標準・文書ステータス表

確認日はいずれも 2026-10-03 である。

| 名称 | 版・識別 | 状態 | 公表日 | URL |
|---|---|---|---|---|
| CSRB "Review of the Summer 2023 Microsoft Exchange Online Intrusion" | — | final（政府報告） | 2024-03-20（PDF は 2025-03 のパスで再掲） | https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf |
| MSRC "Results of Major Technical Investigations for Storm-0558 Key Acquisition" | 2024-03-12 追記版 | 追記で訂正済み | 2023-09-06 | https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition |
| MSRC "Microsoft mitigates China-based threat actor Storm-0558..." | Revision 2023-09-06 | 更新済み | 2023-07-11 | https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email |
| MSRC Midnight Blizzard（初報） | — | final（最終 PIR は未確認） | 2024-01-19 | https://www.microsoft.com/en-us/msrc/blog/2024/01/microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard |
| MSRC Midnight Blizzard（更新） | — | final（最終 PIR は未確認） | 2024-03-08 | https://www.microsoft.com/en-us/msrc/blog/2024/03/update-on-microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard |
| Microsoft Threat Intelligence "Midnight Blizzard: Guidance for responders" | 2024-02-13 微修正 | final | 2024-01-25 | https://www.microsoft.com/en-us/security/blog/2024/01/25/midnight-blizzard-guidance-for-responders-on-nation-state-attack/ |
| Microsoft Threat Intelligence "Analysis of Storm-0558 techniques for unauthorized email access" | 2023-09-06 追記 | final | 2023-07-14 | https://www.microsoft.com/en-us/security/blog/2023/07/14/analysis-of-storm-0558-techniques-for-unauthorized-email-access/ |
| Cloudflare "The impact of the Salesloft Drift breach on Cloudflare and our customers" | — | final | 2025-09-02 | https://blog.cloudflare.com/response-to-salesloft-drift-incident/ |
| CISA ED 24-02 | — | closed（sunset、2026-01-08 表示） | 2024-04-02 | https://www.cisa.gov/news-events/directives/ed-24-02-mitigating-significant-risk-nation-state-compromise-microsoft-corporate-email-system |
| CISA/FBI AA23-320A Scattered Spider | 2025-07-29 改訂 | 現行（改訂あり） | 2023-11-16 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a |
| Okta RCA（Support Case Management System） | — | final | 2023-11-03 | https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/ |
| Okta 8-K Ex.99.2 "October Customer Support Security Incident- Update" | — | final（第三者フォレンジック報告は未公開） | 2023-11-29 | https://www.sec.gov/Archives/edgar/data/1660134/000166013423000065/okta-10312023_ex992.htm |
| Cloudflare "Thanksgiving 2023 security incident" | — | final | 2024-02-01 | https://blog.cloudflare.com/thanksgiving-2023-security-incident/ |
| Mandiant "UNC5537 Targets Snowflake Customer Instances..." | 2024-06-17 更新 | final（更新あり） | 2024-06-10（構造化データの datePublished。ページ上の表示は 2024-06-11） | https://cloud.google.com/blog/topics/threat-intelligence/unc5537-snowflake-data-theft-extortion |
| Snowflake "Planning for the deprecation of single-factor password sign-ins" | 2026-10-03 取得版 | 現行の製品文書（日付は予定値） | 不明（随時更新） | https://docs.snowflake.com/en/user-guide/security-mfa-rollout |
| GTIG "Widespread Data Theft Targets Salesforce Instances via Salesloft Drift" | 2025-08-28 追記 | final（追記あり） | 2025-08-26（構造化データの datePublished。ページ上の表示は 2025-08-27） | https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift |
| Salesloft Trust Center（Drift 更新、Mandiant 調査要約） | 2025-09-06 更新ほか | 調査終了（2025-09-30） | 2025-09-06 ほか（ページ上の表示は 2026-04-17） | https://trust.salesloft.com/ |
| Descope "nOAuth" | — | final | 2023-06-20 | https://www.descope.com/blog/post/noauth |
| MSRC "Potential Risk of Privilege Escalation in Azure AD Applications" | — | final | 2023-06-20 | https://www.microsoft.com/en-us/msrc/blog/2023/06/potential-risk-of-privilege-escalation-in-azure-ad-applications |
| Semperis "nOAuth Abuse Alert" | — | final | 2025-06-25 | https://www.semperis.com/blog/noauth-abuse-alert-full-account-takeover/ |
| CircleCI "Jan 4, 2023 security incident report" | — | final | 2023-01-13（UTC） | https://circleci.com/blog/jan-4-2023-incident-report/ |
| MGM Resorts Form 8-K（Item 2.02・7.01） | — | final（提出書類） | 2023-10-05（Date of Report） | https://www.sec.gov/Archives/edgar/data/789570/000119312523251667/d461062d8k.htm |
| CVE-2025-55241（MSRC Update Guide） | 最終改訂 2025-09-18（v1.1、Attack Complexity を High→Low） | 公開・緩和済み | 2025-09-04 | https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-55241 |
| CVE-2025-55241（NVD） | vulnStatus: Modified（lastModified 2026-06-17。NVD 自身の CVSS v3.1 は 9.8、Microsoft は 10.0） | 公開 | 2025-09-04 | https://nvd.nist.gov/vuln/detail/CVE-2025-55241 |
| Dirk-jan Mollema "One Token to rule them all" | — | final（発見者開示） | 2025-09-17 | https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ |
| MSRC "Guidance on Potential Misconfiguration of Authorization of Multi-Tenant Applications that use Azure AD" | — | final | 2023-03-29 | https://www.microsoft.com/en-us/msrc/blog/2023/03/guidance-on-potential-misconfiguration-of-authorization-of-multi-tenant-applications-that-use-azure-ad |
| Azure status history RCA LN01-P8Z | Wayback 2021-04-02 取得版（20210402023547） | 現行サイト（azure.status.microsoft）は PIR を各 5 年保持と明記しており、本件は掲載されていない。Wayback で確認 | 2021-03 | https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ |
| Google Cloud incident 20013 | 訂正追記あり | final | 2020-12 | https://status.cloud.google.com/incident/zall/20013 |
| GitHub "Security alert: Attack campaign involving stolen OAuth user tokens..." | 2022-04-27 更新 | final | 2022-04-15 | https://github.blog/news-insights/company-news/security-alert-stolen-oauth-user-tokens/ |
| Heroku "April 2022 Incident Review" | Last Updated 2022-06-14 | final | 2022-06-14（最終更新日。初出日はページに記載なし） | https://www.heroku.com/blog/april-2022-incident-review/ |
| LastPass "Notice of Security Incident" | 更新統合版 | final | 2022-12-22 | https://blog.lastpass.com/posts/notice-of-recent-security-incident |
| LastPass "Security Incident Update and Recommended Actions" | 本文照合は旧 URL の Wayback 2023-03-01 版 | final（現行 URL は本文が折りたたみ表示で直接取得不可） | 2023-03-01 | https://blog.lastpass.com/posts/security-incident-update-recommended-actions |
| LastPass "Incident 2 – Additional details of the attack" | Wayback 2023-03-05 取得版 | 現行 URL は JS 描画のため未取得 | 2023-03 | https://web.archive.org/web/20230305/https://support.lastpass.com/help/incident-2-additional-details-of-the-attack |
| Microsoft "Securing our future: April 2025 progress report on SFI" | — | final（ベンダー自己申告） | 2025-04-21 | https://www.microsoft.com/en-us/security/blog/2025/04/21/securing-our-future-april-2025-progress-report-on-microsofts-secure-future-initiative/ |
| RFC 9700 "Best Current Practice for OAuth 2.0 Security"（BCP 240） | RFC | final（BCP） | 2025-01 | https://www.rfc-editor.org/rfc/rfc9700 |
| OpenID Connect Core 1.0 incorporating errata set 2 | errata set 2 | final | 2023-12-15 | https://openid.net/specs/openid-connect-core-1_0.html |

---

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

ADR 番号は seed-02 の A01〜A19 を ADR-001〜ADR-019 と読み替えたものである。表の各行は設計推論で、導出元の RS-12 項目を併記する。

| 入力先 | 入力内容 | 導出元 | タグ |
|---|---|---|---|
| ADR-007（鍵階層と KMS/HSM） | (a) 署名鍵は監視付きの自動回転とし、最長鍵年齢を警報する。(b) 鍵は cell・テナント群・token 種別ごとにスコープを分け、JWKS に用途とスコープの情報を持たせる。(c) 鍵は隔離保管（HSM 等）し、鍵へのアクセスはすべて記録する。 | RS-12#3, #4, #10〜#12, #14 | [D] |
| ADR-007 / ADR-013（cell と fail-mode） | 鍵の追加・削除・メタデータ公開を段階展開（cell canary）し、保持状態の強制検査とロールバック時間を定義する。鍵削除の誤りを障害注入試験の対象にする。 | RS-12#57, #58 | [D] |
| ADR-005（token profile） | (a) 検証規則（iss と鍵の結合、tid、aud、typ）を共通 SDK と PEP の既定動作とし、利用側で無効化できないようにする。(b) 高リスク操作は発行記録と照合（stateful）する。(c) 第三者連携の refresh token は送信者拘束（RFC 8705/9449）または rotation を必須とし、scope と resource に結合する。 | RS-12#5, #6, #11, #59〜#62 | [D] |
| ADR-004（B2B federation・連結） | (a) 利用者識別は iss+sub（Entra は tid+oid）に限定し、email や UPN による自動連結は禁止する。(b) テナントへの IdP 追加と自動連結の有効化は、二者承認・待機時間・顧客通知付きの高リスク操作とする。(c) 外部 IdP 経由の初回連結には、所有確認（magic link 等）を課す。 | RS-12#42〜#45, #49 | [D] |
| ADR-003（回復と認証器ライフサイクル） | ヘルプデスク経由のパスワード・MFA リセットを高保証化する（視覚確認等の本人確認、待機時間、元の連絡先への通知、管理者回復の二者承認）。要素の移転を高リスクイベントとして記録・検知する。 | RS-12#26, #48, #51 | [D] |
| ADR-002（IAL/AAL/FAL） | (a) 人間の利用者は AAL2 以上を既定とし、管理者と特権操作にはフィッシング耐性のある認証器を要求する。(b) サービス利用者のパスワード認証を禁止する。(c) 非本番テナントにも同じ要件を適用する。 | RS-12#15, #16, #34, #36, #51 | [D] |
| ADR-006（失効と継続評価） | (a) 第三者連携の grant を連携事業者単位で一括失効できる手順と、完了時間の SLO を持つ。(b) 大量 export・Bulk API の異常を検知する。(c) 管理者 session をネットワーク・端末に束縛し、変化時に再認証させる。 | RS-12#25, #37, #38, #41, #46 | [D] |
| ADR-008（管理面と CI/CD） | (a) 本番アクセス token の生成権限を JIT 化・step-up 化する。(b) 開発・運用端末の業務と私用を分離し、個人ブラウザプロファイルを禁止する。(c) PAT と外部 collaborator を廃止し、CI の秘密情報を OIDC 連携に置き換える。(d) 復号鍵を個人の vault に置かない。 | RS-12#23, #39, #46, #47, #64 | [D] |
| ADR-009（workload identity と委任） | (a) 内部のサービス間 token にも署名・テナント結合・発行ログ・短寿命・失効性を要求する。(b) 未文書化の内部 token 種別の棚卸しを統制にする。 | RS-12#53〜#55 | [D] |
| ADR-014（監査データ） | (a) 鍵系・管理面・発行系のログ保持期間を、鍵の使用期間＋失効後 2 年以上に連動させる。(b) 顧客には既定・無償で 6 か月以上のアクセスログを提供する。(c) 単一の認証イベントから派生した token の連結 ID を記録する。(d) すべてのアクセス経路でイベント種別の欠けをなくす。 | RS-12#2, #8, #11, #12, #24 | [D] |
| ADR-016（versioning/deprecation） | レガシーの API・テナント・テストアプリに、期限付きの廃止計画と、現行基準の遡及適用の手順を持たせる。 | RS-12#18, #53 | [D] |
| ADR-018（出口戦略）と第三者リスク | 連携事業者（SaaS・CI・チャットボット等）に、token の保管方式、送信者拘束の対応、侵害時の通知と一括失効を契約条件として求める。 | RS-12#37〜#41, #59〜#61 | [D] |
| ADR-019（侵害時 runbook）、R-110〜R-117 | (a) 侵害通知を受けたら、未使用判定に頼らず関連する資格情報を全件回転する。(b) サポートチケット・HAR 内の秘密情報を走査して回転する。(c) 攻撃者が対応会議を傍受する前提で、帯域外の連絡手段を用意する。(d) 「分かっていること・分かっていないこと」の公表と訂正の手順を持つ。 | RS-12#13, #28, #32, #41, #50 | [D] |
| サポート・顧客管理機能（R-042、R-135） | サポートへのアップロード物（HAR 等）を自動サニタイズする。サポートシステムを本番 IdP の管理者アカウントから分離し、サポート経由の回復を禁止する。 | RS-12#22, #26, #27, #41 | [D] |
| 損失シナリオ（R-003: S-02/S-03/S-04/S-06/S-08/S-10） | S-02 の実例は Storm-0558、S-03 は Scattered Spider の IdP 追加、S-04 は Okta とヘルプデスクの事例、S-06 は Azure AD 2021 と Google 2020、S-08 は Salesloft Drift と Heroku、S-10 は Storm-0558 のログ保持不足である。損失シナリオの頻度・影響の推定に、本表の一次事実を入力する。 | RS-12#1〜#66 | [D] |

KRI 候補（R-006。K-ID は 01_governance で採番する）。いずれも上表から導いた設計推論である [D]。

1. 有効な署名鍵の最長年齢、および回転期限の超過件数。
2. 鍵メタデータ変更のうち、段階展開を経なかった件数。
3. 侵害通知を受けてから資格情報の回転が完了するまでの時間と、未回転の件数。
4. app-only 権限または高権限 scope を持つ OAuth アプリ・第三者 grant の件数（非本番テナントを含む）。
5. MFA を強制していない人間アカウントの件数と、パスワード認証のサービス利用者の件数。
6. 第三者連携 token の最大寿命と、送信者拘束された token の比率。
7. 大量 export を検知するまでの時間。
8. email など可変属性による連結の件数（目標 0）。
9. ヘルプデスク経由の要素リセット件数と、その本人確認の合格率。
10. 自力検知の比率（検知のうち自社起点の割合）。
11. ログ保持期間が要件を満たさない鍵・管理面システムの件数。

### 5.2 PoC で実測すべきこと

試験ケースの ID（TC-xxx）は 12_poc で採番する。以下はいずれも設計推論である [D]。

1. 負例試験。次の token を、全 PEP・全 SDK が拒否することを機械的に確認する。
   - 別の issuer・別の cell・別の token 種別の鍵で署名された token
   - JWKS には載っているがスコープが一致しない鍵で署名された token
   - tid を書き換えた token

   導出元は RS-12#5、#6、#53。
2. 緊急の鍵回転演習。旧鍵を失効させてから、全下流の JWKS cache が更新されるまでの最大時間（JWKS cache の最大齢を含む）と、その間の可用性を測る。導出元は RS-12#9、#57（R-113、R-184）。
3. 鍵の誤削除を注入し、影響が cell の境界に収まるか、既知の良好な状態へ戻すまでの時間を測る。導出元は RS-12#57、#58（R-150、R-156）。
4. stateful な照合の性能コスト。発行記録と照合する方式で、偽造 token の検知率・検知遅延と、p99 への影響を測る。導出元は RS-12#10、#11。
5. session と token の再利用試験。
   - 別の ASN・端末で管理者 session cookie を再利用し、再認証が要求されるか。
   - DPoP/mTLS で束縛した token を盗用して使えないか。
   - refresh token rotation で再利用を検知できるか。

   導出元は RS-12#25、#46、#62。
6. 第三者 grant の一括失効。N 件の grant を連携事業者単位で失効させ、全 PEP で拒否されるまでの時間を測る。導出元は RS-12#37。
7. 大量 export の検知。Bulk API 相当の一括取得（約 3 分の窃取を再現）を検知・遮断できるまでの時間を測る。導出元は RS-12#41。
8. nOAuth の再現。未検証の email を持つ外部テナントの利用者で連結を試み、拒否されることを確認する。導出元は RS-12#42〜#44。
9. 悪意ある IdP の追加試験。テナント管理者の権限で IdP 追加と自動連結の有効化を試み、二者承認・待機・通知が働くかを確認する。導出元は RS-12#49。
10. ヘルプデスクへのソーシャルエンジニアリング演習（red team）。要素リセットの成功率と、検知されるまでの時間を測る。導出元は RS-12#48（R-042、R-166）。
11. サポートアップロードのサニタイザ。HAR に混入させた token・cookie の検出率と、誤検知率を測る。導出元は RS-12#22、#27、#41。
12. 認証基盤の停止時の依存サービス。IdP/AS の停止中に、既存の session と検証がどれだけ継続し、剥奪の反映がどれだけ遅れるかを測る。導出元は RS-12#57、#58（R-210）。

---

## 6. 調査の限界と未確認事項

1. **取得経路の制約。** 次の資料は、通常の直接取得以外の方法で本文を得た。
   - MSRC ブログは JS で描画されるため、新しい URL（microsoft.com/en-us/msrc/blog/...）から HTML を直接取得した。
   - Okta の 8-K Exhibit 99.2 は SEC の自動取得制限のため、抽出ツール（Tavily）で本文を取得した。
   - MGM の 8-K と LastPass のブログ 2 本（[^33][^34]）は、作成時には要約モデルを介する取得ツール（WebFetch）でしか取得できなかった。独立検証（2026-10-03）で、MGM の 8-K は SEC から HTML 原文を直接取得し、[^33] は抽出ツール（Tavily）で全文を取得して、それぞれ原文と照合した。[^34] は現行 URL の本文が折りたたみ表示で抽出できないため、旧 URL の Wayback Machine 2023-03-01 版を抽出ツールで取得して原文と照合した（research/verification/RS-12-verification.md）。
   - LastPass の "Incident 2" 文書は、現行 URL が JS 描画のため取得できず、Wayback Machine の 2023-03-05 版を使った。
   - Azure AD 2021-03-15 の RCA（LN01-P8Z）は、Azure の状態履歴が PIR を各 5 年保持（現行サイトに明記）のため現行サイトから消えており、Wayback Machine の 2021-04-02 取得版（20210402023547）で確認した。
2. **発見者による一次開示の扱い。** nOAuth（Descope、Semperis）と CVE-2025-55241（Mollema）は、プラットフォーム事業者の PIR ではなく、発見者の開示である。nOAuth は MSRC が問題の存在と緩和策を公表しており、CVE-2025-55241 は MSRC と NVD が CVE を公表している。一方、Actor token の技術的性質（発行ログがない、未署名、24 時間失効不能、CA の対象外）は発見者の記述だけで、Microsoft の公式文書による確認はできていない（RS-12#54）。
3. **MGM の侵入経路は未確認。** MGM の 8-K は侵入手口を記述していない。AA23-320A は本文で MGM を挙げておらず、脚注で報道系ブログに言及しているだけである。「MGM はヘルプデスク経由で侵入された」という主張は一次報告で確認できなかったため、結論に使っていない。MGM の侵入開始日も未確認である。
4. **Storm-0558 の未確定事項。** 鍵の入手経路は未確定である（CSRB 時点、MSRC 2024-03-12 追記時点）。鍵を無効化した日付は、CSRB（06-24）と Microsoft Threat Intelligence（06-27 に遮断、06-29 に置換）で一致しない。CSRB の報告書以後に Microsoft が根本原因を確定したかは、本ストリームでは確認していない。
5. **Midnight Blizzard の最終報告は未確認。** 影響を受けたアカウント数や、ソースコードへのアクセスの範囲を示す最終 PIR は見つからなかった。CSRB は、この事案を審査範囲外としている。
6. **Salesloft Drift の未確定事項。** Mandiant が契約を受けた日は、Trust Center の記事間で 2025-08-26 と 2025-08-28 に分かれている。Trust Center の各記事のタイムスタンプは 2026-04-17 と表示されており、再掲の可能性がある。GitHub アカウントへの初期アクセスの手段と、データ窃取を誰が最初に検知したかは、一次報告に明示がない。影響組織数（「700 超の組織」等）は、GTIG の記事（2025-08-28 追記を含む）には記載がない。この数値は二次報道でのみ見たもので、一次報告では未確認のため結論に使わない。
7. **Travis CI の一次報告は未確認。** 2022 年の GitHub OAuth token 事案で、Travis CI 側の事後報告は確認していない。Heroku 側の初期侵入に関わった第三者連携も、Heroku 自身が「特定できていない」としている。
8. **当事者の自己評価。** Cloudflare の「横移動は制限された」という評価は当事者の自己評価で、CrowdStrike の最終報告書は公開されたものを確認していない。Okta の 8-K が言及する第三者フォレンジック報告も未確認である。Microsoft の SFI 進捗（HSM への移行、SDK による検証率）も、ベンダーの自己申告である。
9. **検知時間の算出。** 検知時間は、一次報告に記された日付の差から算出した概算である。「侵入開始」の定義は事故ごとに異なる（資格情報の窃取時点、初回の不正アクセス時点など）。Snowflake については、個別被害組織の侵入日・検知日は公開されていない。約 165 組織という数は通知した数で、侵害が確定した数ではない。
10. **seed 記述との差異（問い 7）。**
    - seed-02 §10 は Midnight Blizzard について「テスト OAuth app が本番で高権限」と書いている。一次報告の表現は「Microsoft corporate environment で高権限」であり、MSRC の初報は、本番システムへのアクセスの証拠はないとしている（RS-12#15、#16）。
    - seed-02 §10 は CVE-2025-55241 について「未署名・未文書化の内部 actor token」と書いている。発見者の記述では、未署名なのは Actor token を埋め込んだなりすまし token であり、Actor token そのものではない（RS-12#54）。
    - seed-02 §10 は Storm-0558 の要件に「HSM 非エクスポート」を挙げている。CSRB の勧告は「可能な場合は専用 HSM、隔離保管と最小限の鍵の取り出し」であり、非エクスポートという文言はない（RS-12#11）。
    - seed-03 の Google 2020 の記述は、一次報告と整合した（RS-12#58）。seed-03 の Azure AD 2021 の記述も概ね整合するが、一次報告が原因とするのは「使われていない鍵を定期的に削除する自動処理」であり、「署名鍵ローテーション自動処理」という表現ではない（RS-12#57）。
    - seed-03 の Atlassian 2022（883 サイトの削除）は、本ストリームの範囲外のため確認していない。
    - seed-02 の DBSC（Device Bound Session Credentials）は、本ストリームでは確認していない。
11. **範囲外とした事項。** RFC 9700 と OIDC Core 以外の規範（NIST SP 800-63B-4 の回復要件、DPoP の RFC 9449、Shared Signals 等）と事故教訓との対応付けは、標準調査のストリームに委ねる。これらは本ノートでは [N] として主張していない。
12. **本ノートの性格。** 本ノートは AI エージェントが作成した調査ノートである。作成者とは別の AI エージェントが、2026-10-03 に全脚注の原典を取得して独立検証（CONVENTIONS §4）を行い、その結果に基づいて本ノートを修正した。脚注ごとの判定と修正内容は research/verification/RS-12-verification.md に記録している。この検証も AI による照合であり、人間の専門家による確認は未実施である。

---

## 参考文献

[^1]: Cyber Safety Review Board (CISA/DHS)『Review of the Summer 2023 Microsoft Exchange Online Intrusion』2024-03-20. https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf （参照箇所: Executive Summary p.iii–iv、§1.1 p.1–2、§1.2.1 p.3、§1.2.3.1 p.5、§1.2.3.2 p.6、§2.1 p.17–18、§2.1.2 p.19–21（Recommendation 5・6）、§2.1.3–2.1.4 p.22（Recommendation 10・11）、確認日: 2026-10-03）
[^2]: Microsoft Security Response Center『Microsoft mitigates China-based threat actor Storm-0558 targeting of customer email』2023-07-11（Revision 2023-09-06）. https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email （参照箇所: 本文第 1〜2 段落、Details、確認日: 2026-10-03）
[^3]: Microsoft Threat Intelligence『Analysis of Storm-0558 techniques for unauthorized email access』2023-07-14（2023-09-06 追記）. https://www.microsoft.com/en-us/security/blog/2023/07/14/analysis-of-storm-0558-techniques-for-unauthorized-email-access/ （参照箇所: Actor techniques「Token forgery」「Identity techniques for access」、Mitigation の日付列記、確認日: 2026-10-03）
[^4]: Microsoft Security Response Center『Results of Major Technical Investigations for Storm-0558 Key Acquisition』2023-09-06（2024-03-12 追記）. https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition （参照箇所: 「March 12, 2024 update」、「Key acquisition」、「Why a consumer key was able to access enterprise mail」、確認日: 2026-10-03）
[^5]: Microsoft『Securing our future: April 2025 progress report on Microsoft's Secure Future Initiative』2025-04-21. https://www.microsoft.com/en-us/security/blog/2025/04/21/securing-our-future-april-2025-progress-report-on-microsofts-secure-future-initiative/ （参照箇所: 本文「To better protect signing keys...」段落、「1. Protect identities and secrets」、確認日: 2026-10-03）
[^6]: Microsoft Security Response Center『Microsoft Actions Following Attack by Nation State Actor Midnight Blizzard』2024-01-19. https://www.microsoft.com/en-us/msrc/blog/2024/01/microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard （参照箇所: 本文第 1〜5 段落、確認日: 2026-10-03）
[^7]: Microsoft Security Response Center『Update on Microsoft Actions Following Attack by Nation State Actor Midnight Blizzard』2024-03-08. https://www.microsoft.com/en-us/msrc/blog/2024/03/update-on-microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard （参照箇所: 本文第 3〜4 段落、確認日: 2026-10-03）
[^8]: Microsoft Threat Intelligence『Midnight Blizzard: Guidance for responders on nation-state attack』2024-01-25（2024-02-13 微修正）. https://www.microsoft.com/en-us/security/blog/2024/01/25/midnight-blizzard-guidance-for-responders-on-nation-state-attack/ （参照箇所: 冒頭段落、「Initial access through password spray」「Malicious use of OAuth applications」「Use of residential proxy infrastructure」「Defend against malicious OAuth applications」、確認日: 2026-10-03）
[^9]: CISA『ED 24-02: Mitigating the Significant Risk from Nation-State Compromise of Microsoft Corporate Email System』2024-04-02（Closed、2026-01-08 表示）. https://www.cisa.gov/news-events/directives/ed-24-02-mitigating-significant-risk-nation-state-compromise-microsoft-corporate-email-system （参照箇所: Background、Required Actions、終了告知、確認日: 2026-10-03）
[^10]: Okta Security (D. Bradbury)『Unauthorized Access to Okta's Support Case Management System: Root Cause and Remediation』2023-11-03. https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/ （参照箇所: 冒頭 3 段落、「Failure to identify file downloads...」、Investigation Timeline、Remediation 1〜4、確認日: 2026-10-03）
[^11]: Okta Security『Tracking Unauthorized Access to Okta's Support System』2023-10-20. https://sec.okta.com/articles/2023/10/tracking-unauthorized-access-oktas-support-system （参照箇所: 本文第 2〜4 段落（HAR ファイル）、確認日: 2026-10-03）
[^12]: Okta, Inc.『October Customer Support Security Incident- Update and Recommended Actions』(Form 8-K Exhibit 99.2) 2023-11-29. https://www.sec.gov/Archives/edgar/data/1660134/000166013423000065/okta-10312023_ex992.htm （参照箇所: 本文第 3〜6 段落、「How we discovered this」、「Implementing recommended best practices」、確認日: 2026-10-03。取得は抽出ツール経由）
[^13]: Cloudflare (M. Prince, J. Graham-Cumming, G. Bourzikas)『Thanksgiving 2023 security incident』2024-02-01. https://blog.cloudflare.com/thanksgiving-2023-security-incident/ （参照箇所: 冒頭 5 段落、「"Code Red" Remediation and Hardening Effort」、Timeline の 11-14〜11-24、確認日: 2026-10-03）
[^14]: Mandiant (Google Cloud)『UNC5537 Targets Snowflake Customer Instances for Data Theft and Extortion』2024-06-10（2024-06-17 更新）. https://cloud.google.com/blog/topics/threat-intelligence/unc5537-snowflake-data-theft-extortion （参照箇所: Introduction、Campaign Overview（three primary factors、79.7%、2020 年 11 月）、contractor systems 段落、Outlook and Implications、確認日: 2026-10-03）
[^15]: Snowflake『Planning for the deprecation of single-factor password sign-ins』Snowflake Documentation（2026-10-03 取得版）. https://docs.snowflake.com/en/user-guide/security-mfa-rollout （参照箇所: 冒頭段落、「Human users vs. service users」、「Enforcement timeline」表、「Phase 1」、確認日: 2026-10-03）
[^16]: Google Threat Intelligence Group (A. Larsen ほか)『Widespread Data Theft Targets Salesforce Instances via Salesloft Drift』2025-08-26（2025-08-28 追記）. https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift （参照箇所: 冒頭の Update 段落、Overview、Recommendations（Salesforce hardening）、確認日: 2026-10-03）
[^17]: Salesloft『Trust Center: Update on Mandiant Drift and Salesloft Application Investigations（2025-09-06 時点）／Summary of the Mandiant Investigation of Drift Applications』. https://trust.salesloft.com/ （参照箇所: 「What Happened」箇条、Mandiant 調査要約（侵入期間 2025-03-22〜09-05、GitHub Configurations & Security）、確認日: 2026-10-03）
[^18]: Cloudflare『The impact of the Salesloft Drift breach on Cloudflare and our customers』2025-09-02. https://blog.cloudflare.com/response-to-salesloft-drift-incident/ （参照箇所: 冒頭 2 段落、Timeline（2025-08-09〜08-17、08-23）、Exposure analysis（104 API tokens）、Recommendations、確認日: 2026-10-03）
[^19]: Descope (O. Cohen)『nOAuth: How Microsoft OAuth Misconfiguration Can Lead to Full Account Takeover』2023-06-20. https://www.descope.com/blog/post/noauth （参照箇所: Executive summary、nOAuth in action、Disclosure timeline、確認日: 2026-10-03）
[^20]: Microsoft Security Response Center『Potential Risk of Privilege Escalation in Azure AD Applications』2023-06-20. https://www.microsoft.com/en-us/msrc/blog/2023/06/potential-risk-of-privilege-escalation-in-azure-ad-applications （参照箇所: 本文冒頭〜「Customer Impact」「Guidance on Securing your Azure AD Applications」、確認日: 2026-10-03）
[^21]: Semperis『nOAuth Abuse Alert: Full Account Takeover of Entra Cross-Tenant SaaS Applications』2025-06-25. https://www.semperis.com/blog/noauth-abuse-alert-full-account-takeover/ （参照箇所: Key findings、開示経緯、Research methodology（1,017／104／9）、Detection、確認日: 2026-10-03）
[^22]: CircleCI『CircleCI Jan 4, 2023 security incident report』2023-01-13（UTC）. https://circleci.com/blog/jan-4-2023-incident-report/ （参照箇所: What happened?、How do we know this attack vector is closed、What we learned、A note on employee responsibility vs. systems safeguards、確認日: 2026-10-03）
[^23]: CISA / FBI ほか『Scattered Spider』Cybersecurity Advisory AA23-320A、2023-11-16（2025-07-29 改訂）. https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a （参照箇所: Overview（「According to public reporting」の列挙と脚注 [2][3]）、Technical Details（Reconnaissance, Resource Development, and Initial Access の 2025-07-29 追記、Execution, Persistence, and Privilege Escalation、Discovery/Exfiltration）、Mitigations、確認日: 2026-10-03）
[^24]: MGM Resorts International『Form 8-K (Item 2.02/7.01)』Date of Report 2023-10-05. https://www.sec.gov/Archives/edgar/data/789570/000119312523251667/d461062d8k.htm （参照箇所: Item 7.01 本文（2023-09-12 の声明、約 1 億ドル、1,000 万ドル未満、2019 年 3 月以前の顧客情報）、確認日: 2026-10-03。作成時は要約ツール経由、独立検証で SEC から HTML 原文を直接取得して照合）
[^25]: Dirk-jan Mollema『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: 冒頭 4 段落、「Actor tokens」、「The fatal flaw leading to cross-tenant compromise」、Disclosure timeline、確認日: 2026-10-03）
[^26]: Microsoft Security Response Center『CVE-2025-55241 Azure Entra ID Elevation of Privilege Vulnerability』Security Update Guide、2025-09-04（最終改訂 2025-09-18）. https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-55241 （参照箇所: impact、severity、baseScore、vectorString、revisions（v1.1 2025-09-18）、FAQ「Why are there no links to an update...」。MSRC Update Guide API の JSON で取得、確認日: 2026-10-03）
[^27]: NIST National Vulnerability Database『CVE-2025-55241 Detail』2025-09-04 公開. https://nvd.nist.gov/vuln/detail/CVE-2025-55241 （参照箇所: Description、CVSS v3.1（secure@microsoft.com 10.0、nvd@nist.gov 9.8）、Weakness CWE-287（source: secure@microsoft.com）、lastModified 2026-06-17。NVD API 2.0 で取得、確認日: 2026-10-03）
[^28]: Microsoft Security Response Center『Guidance on Potential Misconfiguration of Authorization of Multi-Tenant Applications that use Azure AD』2023-03-29. https://www.microsoft.com/en-us/msrc/blog/2023/03/guidance-on-potential-misconfiguration-of-authorization-of-multi-tenant-applications-that-use-azure-ad （参照箇所: 冒頭、Security Enhancements、Guidance、確認日: 2026-10-03）
[^29]: Microsoft Azure『Azure status history: RCA - Authentication errors across multiple Microsoft services (Tracking ID LN01-P8Z)』2021-03. Wayback Machine 2021-04-02 取得版 https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ （参照箇所: Summary of Impact、Root Cause and Mitigation、Next Steps（SDP 多段階対応、2020-09-28 事案への言及）、確認日: 2026-10-03。独立検証では Wayback の取得制限のため抽出ツール（Tavily）で本文を取得）
[^30]: Google Cloud『Google Cloud Infrastructure Components Incident #20013（2020-12-14 User ID Service）』. https://status.cloud.google.com/incident/zall/20013 （参照箇所: ISSUE SUMMARY、ROOT CAUSE、REMEDIATION AND PREVENTION、DETAILED DESCRIPTION OF IMPACT、確認日: 2026-10-03）
[^31]: GitHub (M. Hanley)『Security alert: Attack campaign involving stolen OAuth user tokens issued to two third-party integrators』2022-04-15（2022-04-27 更新）. https://github.blog/news-insights/company-news/security-alert-stolen-oauth-user-tokens/ （参照箇所: 冒頭、April 18/22/27 updates、npm の検知経緯、確認日: 2026-10-03）
[^32]: Heroku (Salesforce)『April 2022 Incident Review』Last Updated 2022-06-14. https://www.heroku.com/blog/april-2022-incident-review/ （参照箇所: 序文（RFC 8705 への言及）、Summary（2022-04-07、machine account、2022-05-05、pipeline config vars）、確認日: 2026-10-03）
[^33]: LastPass『Notice of Security Incident』2022-12-22（2022-08-25/09-15/11-30 更新を統合）. https://blog.lastpass.com/posts/notice-of-recent-security-incident （参照箇所: 2022-12-22 本文（第 1・第 2 事案、持ち出されたデータ）、確認日: 2026-10-03。作成時は要約ツール経由、独立検証で抽出ツール（Tavily）により全文を取得して照合）
[^34]: LastPass (K. Toubba)『Security Incident Update and Recommended Actions』2023-03-01. https://blog.lastpass.com/posts/security-incident-update-recommended-actions （参照箇所: 冒頭段落（2022-10-26 以降の活動なし）、What happened（Incident 2 Summary）、確認日: 2026-10-03。現行 URL は本文が折りたたみ表示で抽出できないため、独立検証では旧 URL の Wayback Machine 2023-03-01 版 https://web.archive.org/web/20230301230000/https://blog.lastpass.com/2023/03/security-incident-update-recommended-actions/ を抽出ツールで取得して照合）
[^35]: LastPass『Incident 2 – Additional details of the attack』2023-03（Wayback Machine 2023-03-05 版）. https://web.archive.org/web/20230305/https://support.lastpass.com/help/incident-2-additional-details-of-the-attack （参照箇所: 攻撃の経過（2022-08-12〜10-26、自宅 PC、keylogger、4 名の DevOps）、検知（GuardDuty）、是正（IAM・SAML 証明書）、確認日: 2026-10-03。取得は抽出ツール経由）
[^36]: T. Lodderstedt, J. Bradley, A. Labunets, D. Fett『RFC 9700: Best Current Practice for OAuth 2.0 Security』(BCP 240) 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.2.2、§2.3、§4.14.2、確認日: 2026-10-03）
[^37]: OpenID Foundation (N. Sakimura ほか)『OpenID Connect Core 1.0 incorporating errata set 2』2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §5.7 Claim Stability and Uniqueness、確認日: 2026-10-03）
