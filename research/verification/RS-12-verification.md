# RS-12 独立検証記録（脚注の原典照合）

> 文書ID: RS-12-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-003, R-006, R-013, R-037, R-042, R-047, R-049〜R-057, R-110〜R-117（RS-12 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-12-incident-casebook.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-12 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-12 版 0.1 の全脚注 [^1]〜[^37]（37 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果 RS-12#1〜#66、§3.14 横断整理表、§4 ステータス表、§6 の原典に関する記述） |
| 取得（直接） | 34 件は curl で原文を直接取得した。HTML はテキスト化し、CSRB 報告（PDF）は pdftotext で抽出して頁ごとに分け、印刷頁（PDF 頁 − 5）を付けて全文検索した。SEC の 2 文書（[^12][^24]）は、連絡先を示す User-Agent を付けて EDGAR から原文を取得した。CVE は MSRC Update Guide API と NVD API 2.0 の JSON を取得した |
| 取得（抽出ツール） | [^29]（Azure RCA、Wayback）は Wayback が HTTP 429 を返したため、抽出ツール（Tavily extract）で本文を取得した。[^33]（LastPass 2022-12-22）は現行サイトが HTTP 403 を返したため、Tavily で全文を取得した。[^34]（LastPass 2023-03-01）は現行 URL の本文が折りたたみ表示で抽出できなかったため、旧 URL の Wayback 2023-03-01 23:00 版を Tavily で取得して照合した |
| 要約ツール | WebFetch は小型モデルによる要約を返すため、照合の根拠には使っていない。[^34] で 1 回使ったが、その結果は Tavily で取得した原文で照合し直した |
| 補助確認 | Okta 8-K の提出日は EDGAR の filing index（Filing Date 2023-11-29）で確認した。Azure の状態履歴の保持期間は、現行サイト azure.status.microsoft の記載（"each retained for 5 years"）で確認した。Google Cloud ブログの公表日は、ページ内の構造化データ（datePublished）で確認した。seed-02 §10・seed-03 §1 の記述は、RS-12 §6.10 の差異の記述を確かめるためにのみ読んだ |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・用語・規範強度のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | RFC 9700（[^36]）の MUST/SHOULD と OIDC Core（[^37]）の MUST/MAY/MUST NOT を本文と 1 文ずつ照合した。CSRB 勧告の should と、CISA ED 24-02 の shall も同じく照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 28 | 下表の「支持」 |
| 部分支持 | 9 | [^1], [^5], [^8], [^9], [^23], [^24], [^27], [^28], [^29] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

脚注の付いていない記述のうち、原典の内容に関わるもの 1 件が不支持だった。§6.6 は「GTIG の追記にある『700 超の組織』」と書いていたが、GTIG の記事（2025-08-28 追記を含む）にこの数値はない（§4 の修正 M-16）。

## 3. 脚注ごとの判定

| 脚注 | 原典 | 取得 | 主な対象主張 | 判定 | 所見 |
|---|---|---|---|---|---|
| [^1] | CSRB 報告（2024-03-20） | 直接（PDF） | §2-1,2,11,12,14、RS-12#1〜#5、#7〜#13 | 部分支持 | 事実関係と頁番号（p.iii、p.1、p.2、p.3、p.5、p.6、p.17、p.20–22）は全て一致した。印刷頁＝PDF 頁−5 も正しい。ずれは 3 点。(1) RS-12#11 は八つの仕組みを「should で挙げている」としていたが、should が掛かるのは「システム全体の侵害リスクを大幅に下げるよう設計する」という目標で、八つは "These mechanisms include the following" による例示である（"or their equivalents" も許容）。(2) RS-12#12 の Recommendation 10 は、CSP が CISA 主導のタスクフォースで最低基準を定めて採用すべきという勧告で、その基準の内容が 6 か月保持等である。(3) §2-14 の「誤りと認識した記述を 6 か月以上訂正しなかった」について、CSRB の「6 か月以上」は公表（2023-09-06）からの期間である（p.18）。誤りを CSRB に認めたのは 2023 年 11 月（p.iii） |
| [^2] | MSRC 初報（2023-07-11、Revision 2023-09-06） | 直接 | RS-12#1 | 支持 | 2023-05-15 以降・約 25 組織、MSA と Azure AD の鍵は別系統で各系統でのみ有効であるべき、token 検証の問題による Azure AD 利用者のなりすまし、の全てが本文にある。Revision History（07-11、07-13、09-06）も一致 |
| [^3] | Microsoft TI 技術分析（2023-07-14、09-06 追記） | 直接 | RS-12#6、#9 | 支持 | GetAccessTokenForResource の "design flaw" と修正内容、06-27 遮断、06-29 置換完了、07-03 consumer での遮断が本文どおり |
| [^4] | MSRC 鍵入手調査（2023-09-06、2024-03-12 追記） | 直接 | RS-12#5、#7、§2-3 | 支持 | 2018 年 9 月の共通メタデータ endpoint、ライブラリ未更新、2022 年のメール系の移行、"incorrectly assumed libraries performed complete validation"、2024-03-12 追記の crash dump 訂正、ログ保持方針による証拠欠如、が全て本文どおり |
| [^5] | Microsoft SFI 2025-04 進捗報告（2025-04-21） | 直接 | RS-12#14 | 部分支持 | 原文は "in September 2024 we announced that we have moved ... signing keys to HSMs and virtualization-based security, with automatic rotation"。2024 年 9 月は発表時期で、移行の実施時期ではない。Entra ID 署名サービスの confidential VM 移行は「移行中」。90% の SDK 検証率は一致 |
| [^6] | MSRC Midnight Blizzard 初報（2024-01-19） | 直接 | RS-12#15、#18 | 支持 | 2023 年 11 月下旬の password spray、旧非本番テストテナント、幹部・セキュリティ・法務のメール、2024-01-12 検知、レガシーシステムへの現行基準の即時適用、が本文どおり |
| [^7] | MSRC Midnight Blizzard 更新（2024-03-08） | 直接 | RS-12#19 | 支持 | ソースコードリポジトリと内部システムへのアクセス、顧客とのメール内の秘密情報、2 月の password spray 最大 10 倍、が本文どおり |
| [^8] | Microsoft TI 対応ガイダンス（2024-01-25、02-13 微修正） | 直接 | RS-12#16、#17、#18、#21、§2-4 | 部分支持 | MFA なしのテストテナント、OAuth アプリ悪用の 3 段階、EWS と監査ログによる特定、防御策 4 点は本文どおり。RS-12#17 の「従来型 IOC による検知は不十分だった」は、原文 "makes traditional indicators of compromise (IOC)-based detection infeasible due to the high changeover rate of IP addresses" より弱い表現だった |
| [^9] | CISA ED 24-02（2024-04-02、Closed） | 直接 | RS-12#20 | 部分支持 | shall、2024-04-30 期限、終了告知（2026-01-08 表示、"sunset this ED and all required actions"）は一致。ただし、資格情報のリセットとサインイン・token 発行ログの確認は「認証情報の侵害が判明・疑われる機関」に対する要求で、全対象機関に課されたのはメール内容の特定と影響分析である。0.1 は三つを一律に全対象機関の義務としていた |
| [^10] | Okta RCA（2023-11-03） | 直接 | RS-12#22〜#25、§2-6,7,11 | 支持 | 09-28〜10-17、134 顧客（1% 未満）、5 顧客の session 乗っ取り、個人 Google プロファイル、14 日間の検知漏れ、タイムライン、是正 4 点が本文どおり。RS-12#25 の session 束縛は「顧客が early access で有効化する製品機能」である点を補記した |
| [^11] | Okta 初報（2023-10-20） | 直接 | RS-12#27 | 支持 | HAR に cookie・session token が含まれ得ること、共有前のサニタイズ推奨（引用文）が本文どおり |
| [^12] | Okta 8-K Ex.99.2（2023-11-29） | 直接（EDGAR） | RS-12#26 | 支持 | 全サポート利用者の氏名・メールを含むレポート、同じアカウントでのサインイン、多くが管理者、ヘルプデスクの視覚的確認の推奨が本文どおり。提出日は filing index で 2023-11-29（Items 2.02/7.01/9.01） |
| [^13] | Cloudflare Thanksgiving 2023（2024-02-01） | 直接 | RS-12#28〜#32 | 支持 | 1 token・3 アカウントの未回転と理由、11-14 偵察開始、11-15 侵入、11-22 Sliver、36 チケット・202 頁・120/76 リポジトリ、サンパウロ、15:58/16:00/16:35/10:44、5,000 超・4,893・全機器再イメージ・HAR 削除が本文どおり。RS-12#31 の CrowdStrike の位置付けを原文（"did not bring to light any activities that we had missed"）に合わせて補正した |
| [^14] | Mandiant UNC5537（2024-06-10、06-17 更新） | 直接 | RS-12#33〜#35、§2-8 | 支持 | 全事案が顧客資格情報に起因、約 165 組織、三つの主因、79.7%、2020 年 11 月、委託先端末、"as long as four years" が本文どおり。ページ表示は "June 11, 2024"、構造化データの datePublished は 2024-06-10（タイムゾーン差とみられる。§4 に併記） |
| [^15] | Snowflake MFA 移行文書（2026-10-03 取得） | 直接 | RS-12#36 | 支持 | 人間利用者の MFA 必須、サービス利用者のパスワード禁止、"Estimated date" 表（2025-09〜2026-01 Snowsight、2026-08〜10 全利用者）が一致。[V] として妥当 |
| [^16] | GTIG Salesloft Drift（2025-08-26、08-28 追記） | 直接 | RS-12#37、#38、#40、§2-5 | 支持 | 08-08〜08-18、秘密情報の探索、query job 削除とログ残存、08-20 失効、08-09 の Drift Email、全 token を侵害扱い、Salesforce 硬化策 4 点が本文どおり。ページ表示は "August 27, 2025"、datePublished は 2025-08-26。§6.6 の「700 超の組織」は本記事にない（M-16） |
| [^17] | Salesloft Trust Center | 直接 | RS-12#39 | 支持 | 2025 年 3〜6 月の GitHub アクセス、Drift の AWS 環境からの OAuth token 取得、侵入期間 2025-03-22〜09-05、PAT と外部 collaborator の廃止、Mandiant 契約日の記事間不一致（08-26／08-28）、調査終了 09-30、各記事の表示 2026-04-17 が一致 |
| [^18] | Cloudflare Salesloft Drift（2025-09-02） | 直接 | RS-12#41、§2-6 | 支持 | 08-09 偵察、08-12〜17 持ち出し、Bulk API 2.0 で "just over three minutes"、08-23 通知、104 API tokens が本文どおり |
| [^19] | Descope nOAuth（2023-06-20） | 直接 | RS-12#42 | 支持 | email claim が可変かつ未検証、email を識別子にする・検証なしで統合するアプリの乗っ取り、2023-04-11 報告が本文どおり |
| [^20] | MSRC nOAuth 対応（2023-06-20） | 直接 | RS-12#43 | 支持 | "never using the email claim for authorization"、未検証ドメインの claim を大半のアプリで省く緩和が本文どおり |
| [^21] | Semperis nOAuth（2025-06-25） | 直接 | RS-12#44 | 支持 | 1,017／104／9（約 9%）、SOC II 等の認証、2023 年 6 月以降の既定が本文どおり。「検知・防御する手段がほぼない」を原文（"difficult ... to detect and impossible ... to defend against"）に合わせて言い換えた |
| [^22] | CircleCI 事故報告（2023-01-13 UTC） | 直接 | RS-12#46、#47、§2-5,7,11 | 支持 | 12-16 端末侵害、AV 未検知、2FA 済み SSO session、12-22 持ち出し、実行中プロセスからの鍵抽出、12-29 顧客通知、01-04 範囲特定、step-up、GitHub App 移行、OIDC 推奨、"a security incident is a systems failure" が本文どおり。公表時刻は 2023-01-12 22:00 PST＝01-13 UTC |
| [^23] | CISA/FBI AA23-320A（2023-11-16、2025-07-29 改訂） | 直接 | RS-12#48〜#51、§2-6,9 | 部分支持 | RS-12#48 の引用文は Overview で "According to public reporting, Scattered Spider threat actors have:[2]" として列挙された項目で、出典は CrowdStrike と Malwarebytes のブログである。0.1 はこの帰属を書いていなかった。ただし 2025-07-29 改訂の Technical Details は、IT ヘルプデスクを騙したパスワードリセットと MFA token の移転を勧告自身の記述として述べており、主張の核心は支持される。#49〜#51 は本文どおり（"it has not been identified as a current TTP" を含む） |
| [^24] | MGM 8-K（Date of Report 2023-10-05） | 直接（EDGAR） | RS-12#52 | 部分支持 | 約 1 億ドル、1,000 万ドル未満、2019 年 3 月以前の顧客情報、手口の記述なしは本文どおり。脚注の項目表示「Item 7.01/8.01」は誤りで、実際は Item 2.02 と 7.01。限られた顧客の社会保障番号・旅券番号の記載を補った |
| [^25] | Mollema 発見者開示（2025-09-17） | 直接 | RS-12#53〜#55、§2-10 | 支持 | 二つの構成要素、Global Admin を含むなりすまし、ログなし・未署名のなりすまし token・24 時間失効不能・CA 対象外・Azure AD Graph の API ログなし、07-14／07-17／08-06／09-04、Microsoft テレメトリで悪用未検知が本文どおり |
| [^26] | MSRC Update Guide（CVE-2025-55241） | 直接（API JSON） | RS-12#55、§2-10 | 支持 | Elevation of Privilege、Critical、baseScore 10.0、customerActionRequired false、FAQ の文言、releaseDate 2025-09-04、latestRevisionDate 2025-09-18 が一致。2025-09-18 の v1.1 は Attack Complexity を High→Low に改めた改訂である（補記） |
| [^27] | NVD（CVE-2025-55241） | 直接（API JSON） | RS-12#55 | 部分支持 | CWE-287 の source は secure@microsoft.com で、NVD 自身の分類ではない。0.1 は「NVD は…と分類している」としていた。NVD 自身（nvd@nist.gov）の CVSS v3.1 評価は 9.8（S:U）で、Microsoft の 10.0（S:C）と異なるが、0.1 はこれを書いていなかった。vulnStatus Modified、lastModified 2026-06-17 |
| [^28] | MSRC マルチテナント認可（2023-03-29） | 直接 | RS-12#56 | 部分支持 | Wiz の報告、社内の少数アプリ、外部からの読み書き、未登録 client への token 発行停止、99% 超は本文どおり。「不要なマルチテナント audience の制限」は開発者ではなく管理者向けの指針であり、帰属がずれていた |
| [^29] | Azure RCA LN01-P8Z（Wayback） | 抽出ツール | RS-12#57、§2-2,13 | 部分支持 | 19:00 UTC〜翌 09:37 UTC、"retain" を無視した自動削除、メタデータ変更による不信、21:05 UTC 緩和、SDP 第 2 段階、2020-09-28 事案は本文どおり。脚注の「Wayback 2021-04-01 版」は誤りで、20210401000000 の URL は 2021-04-02 02:35:47 の取得版（20210402023547）へ転送される。§2-2 の「鍵回転の自動化」は、原文では「使われていない鍵を定期的に削除する自動処理」（"removes keys that are no longer in use"）である |
| [^30] | Google Cloud incident 20013 | 直接 | RS-12#58、§2-13 | 支持 | quota 自動化で使用量 0、猶予期間の満了、03:46〜04:33 US/Pacific の 47 分、認証付きトラフィックのほぼ全てで 5xx、"paged Google Engineers at 03:48 within one minute of customer impact"、訂正追記の存在が本文どおり |
| [^31] | GitHub セキュリティアラート（2022-04-15、04-27 更新） | 直接 | RS-12#59、§2-5,11 | 支持 | 04-12 の npm 検知（AWS API キー）、Heroku と Travis CI の OAuth user token、数十組織、元の使用可能な形式で保存していない、秘密情報の探索の可能性が本文どおり |
| [^32] | Heroku April 2022 Incident Review | 直接 | RS-12#60、#61 | 支持 | 04-07 の DB アクセス、machine account token、アーカイブ済みリポジトリ、第三者連携は未確定、ハッシュ化パスワードと pipeline 設定変数、05-05 のリセット、RFC 8705 への言及が本文どおり。ページの日付は "Last Updated: June 14, 2022" で、脚注と §4 にその旨を書いた |
| [^33] | LastPass Notice（2022-12-22 統合版） | 抽出ツール | RS-12#63 | 支持 | 開発者アカウント 1 件、ソースコードと技術情報、第 1 事案の情報による第 2 事案、vault バックアップの平文の URL と暗号化された username・password が本文どおり |
| [^34] | LastPass Update（2023-03-01） | 抽出ツール（Wayback 2023-03-01 版） | RS-12#66 | 支持 | "The data accessed from those backups included system configuration data, API secrets, third-party integration secrets, and encrypted and unencrypted LastPass customer data." と "have not seen any threat-actor activity since October 26, 2022" を原文で確認した |
| [^35] | LastPass Incident 2 詳細（Wayback 2023-03-05） | 直接（Wayback） | RS-12#64、#65、§2-7 | 支持 | 08-12〜10-26、自宅 PC の第三者製メディアソフト、keylogger、MFA 後のマスターパスワード取得、4 人の DevOps エンジニアの 1 人、GuardDuty、IAM キー回転・IP 制限・最小権限・SAML 証明書の回転と削除が本文どおり |
| [^36] | RFC 9700（BCP 240、2025-01） | 直接 | RS-12#62 | 支持 | §2.2.2 "Refresh tokens for public clients MUST be sender-constrained or use refresh token rotation"、§4.14.2 "MUST be bound to the scope and resource servers"、§2.3 の 2 つの SHOULD、RFC 6749 による confidential client の制約が、強度を含めて原文どおり |
| [^37] | OIDC Core 1.0 errata set 2（2023-12-15） | 直接 | RS-12#45、§2-9 | 支持 | §5.7 の iss+sub、sub の "MUST be locally unique and never reassigned"、email の再利用 MAY が原文どおり。同節の "MUST NOT be used as unique identifiers"（email・phone_number・preferred_username・name）が抜けていたため補った |

## 4. RS-12 への修正内容

| ID | 箇所 | 修正前（要旨） | 修正後（要旨） | 根拠 |
|---|---|---|---|---|
| M-01 | §2-2 | 「鍵回転の自動化それ自体も障害源」 | 「鍵のライフサイクル操作（回転・不要鍵の削除）」とし、Azure AD の原因を「使われていない鍵を定期削除する自動処理」と明記した。CSRB が認定した 2021 年の手動回転関連の大規模障害（CSRB p.6）を追記した | [^29], [^1] |
| M-02 | §2-14 | 誤りと認識した記述を 6 か月以上訂正せず | 公表から 6 か月以上（2023 年 11 月に誤りを認めた後も 2024-03-12 まで）訂正しなかった、とした（CSRB p.iii、p.18） | [^1] |
| M-03 | RS-12#11 | 八つを「should」で挙げている | should は設計目標に掛かり、八つは例示（同等手段も可）であると明記した | [^1] |
| M-04 | RS-12#12 | Rec 10 は 6 か月保持等を求める | CISA 主導のタスクフォースで最低基準を定めて採用するという勧告構造を明記した | [^1] |
| M-05 | RS-12#14 | 2024 年 9 月に移行した | 2024 年 9 月に移行済みと発表した（実施日は本文に記載なし）。Entra ID 署名サービスは移行中であることを追記した | [^5] |
| M-06 | RS-12#17 | IOC による検知は不十分だった | IOC ベースの検知を実行困難（"infeasible"）にする、とした | [^8] |
| M-07 | RS-12#20 | 三つの措置を全対象機関に一律に義務付け | 全影響機関の義務（内容特定・影響分析）と、侵害が判明・疑われる機関の義務（資格情報リセット・ログ確認）を分けた | [^9] |
| M-08 | RS-12#25 | session 束縛を是正として記載 | 顧客が early access で有効化する製品機能であること、2023-11-29 更新の ASN 変化時の再認証の説明を補記した | [^10], [^12] |
| M-09 | RS-12#31 | CrowdStrike の独立調査が裏付けたとされる | Cloudflare の記述として、CrowdStrike が見落としを見つけず最終活動を 11-24 10:44 と結論した、とした | [^13] |
| M-10 | RS-12#44 | 検知・防御する手段がほぼない | 検知は困難、防御は不可能（アプリ側の修正待ち）とした | [^21] |
| M-11 | RS-12#45 | sub の MUST と email の MAY のみ | email 等を一意識別子として使ってはならない（MUST NOT）を追記した | [^37] |
| M-12 | RS-12#48 | 勧告の手口として引用 | 引用文が "According to public reporting" の列挙（ブログ出典）であることを明記し、2025 改訂の勧告自身の記述（ヘルプデスクによるリセット・MFA 移転）の引用を追加した | [^23] |
| M-13 | RS-12#52、[^24] | Item 7.01/8.01 | Item 2.02/7.01 に訂正した。社会保障番号・旅券番号の記載を補った。取得経路を「SEC から原文を直接取得して照合」に更新した | [^24] |
| M-14 | RS-12#55、[^26]、[^27]、§4 | NVD は CWE-287 と分類 | CWE-287 は Microsoft（CNA）提供と明記した。NVD 自身の評価 9.8（S:U）と Microsoft の 10.0（S:C）の違い、MSRC v1.1 の改訂内容を追記した | [^26], [^27] |
| M-15 | RS-12#56 | 開発者に audience 制限を要求 | audience 制限は管理者向け、oid 認可と service principal 作成は開発者向けに分けた | [^28] |
| M-16 | §6.6 | GTIG の追記にある「700 超の組織」 | GTIG 記事にこの数値はなく、二次報道でのみ見た未確認の数値として結論から外すと明記した | [^16] |
| M-17 | [^29]、§4、§6.1 | Wayback 2021-04-01 版 | 2021-04-02 取得版（20210402023547）に訂正し、URL を取得版に固定した。現行サイトの「5 年保持」の記載を確認したことを §4 に書いた | [^29] |
| M-18 | §3.14 横断整理表 | 「破られた前提」列を [I] | 一次報告の記述ではなく本ストリームの解釈なので [D] に改め、列名と表の説明に明記した。Midnight Blizzard の「全メールボックス権限」を「full_access_as_app ロール付与」に改めた。Scattered Spider（MGM）の根本原因欄を「MGM 個別の認定は未確認、勧告からの示唆」[D] に改めた | [^8], [^23], [^24] |
| M-19 | [^32]、§4 | 2022-06-14 | 最終更新日（Last Updated）であると明記した | [^32] |
| M-20 | [^33]、[^34]、§6.1、§4 | 要約ツール経由で未照合 | 抽出ツール・Wayback で原文を取得して照合済みと更新した。[^34] には照合に使った Wayback URL を併記した | [^33], [^34] |
| M-21 | §4 | Mandiant 2024-06-10、GTIG 2025-08-26 | 構造化データの datePublished であり、ページ表示（06-11、08-27）と 1 日ずれることを併記した | [^14], [^16] |
| M-22 | §6.10 | seed-03 の Azure AD 2021 の記述は一次報告と整合 | 概ね整合するが、一次報告の原因は「不要鍵の定期削除の自動処理」で「ローテーション自動処理」ではないと補った | [^29] |
| M-23 | §6.12、冒頭メタ情報 | 作成者以外による検証は未実施（版 0.1） | 独立検証を実施し本記録に記録したこと、検証も AI によるものであることを明記し、版を 0.2 に上げた | — |

§2（結論サマリ）は、M-01・M-02 を除き、修正後の §3 と整合することを確認した。§2-6 のヘルプデスクの記述は、M-12 で確認した勧告自身の記述（2025 改訂）で支持される。§2-10 の「Microsoft は Critical、CVSS 10.0 と評価」は、評価主体を Microsoft としているので修正不要とした。

## 5. 二次情報だけを根拠にしている主張の確認

| 主張 | 状況 | 処置 |
|---|---|---|
| MGM の侵入がヘルプデスク経由だったこと | 0.1 の時点で「一次報告では未確認」とされ、結論に使われていなかった。AA23-320A の MGM への言及は脚注 [2][3] の Malwarebytes ブログだけで、8-K に手口の記述がないことを再確認した | 未確認のまま維持した。横断表の根本原因欄も [D] の示唆に改めた（M-18） |
| Salesloft Drift の影響組織数（700 超） | 二次報道のみ。GTIG の記事に記載がない | 未確認と明記し、結論から外した（M-16） |
| Scattered Spider の手口の一部（RS-12#48 の引用文） | 勧告が "According to public reporting" としてブログを出典に挙げていた | 勧告自身の記述（2025 改訂の Technical Details）を併記して支持を補強した（M-12） |
| Actor token の技術的性質（RS-12#54） | 発見者の一次開示のみで、Microsoft の公式文書による裏付けはない | 0.1 の記載どおり「発見者の記述」と明示したまま維持した。発見者の開示は [I] の一次報告に当たるが、プラットフォーム事業者による確認ではない |

## 6. 検証不能・残課題

- 検証不能の脚注はない。
- CrowdStrike の Cloudflare 向け最終報告書と、Okta の 8-K が言及する第三者フォレンジック報告は、公開されたものを見つけられなかった。RS-12 はこれらに依拠していない。
- [^29]・[^33]・[^34] は抽出ツール（Tavily）経由の取得である。Tavily は要約ではなく本文の抽出を返すが、Wayback（[^29]、[^34]）は取得時点の保存版であり、現行の当事者サイトからは直接取得できていない。
- Salesloft Trust Center（[^17]）は各記事のタイムスタンプが 2026-04-17 と表示され、初出日を直接確かめられない。RS-12 §6.6 の記載どおり、記事本文の日付（2025-09-06 時点の更新等）を使っている。
- 本検証は AI による照合である。人間の専門家による照合と、CTO/CISO による受容は未実施である。
