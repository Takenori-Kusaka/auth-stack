# 12_poc/data — 生データの所在

- git には各実行の要約（`run.json`・`eval.json`）、`SHA256SUMS`、`index.json`、凍結 manifest だけを版管理する。
- 生データ（jsonl・log・sqlite 等、約 3.8 GB）は作業端末に保持し、git 管理外とする。改変検知は各実行ディレクトリの `SHA256SUMS` で行う。
- 第三者による再現（Gate 4）では、生データ一式をハッシュ付きで別途提出する。
