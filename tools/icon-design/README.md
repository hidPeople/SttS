# 小サイズアイコン候補の作成

`build.py`は今回の状態異常・レリックのデザイン案を再生成する制作スクリプトです。本体・編集ツールには依存させていません。Pillowが必要です。

```powershell
python tools/icon-design/build.py --output image/icon/candidates/new-version
```

既存の出力先は上書きしません。フォントは`--jp-font`・`--latin-font`で指定できます。既定はWindowsにインストールされたNoto Sans JP（Weight 750）とBahnschriftです。フォントファイル自体は配布せず、ラスタライズした文字のみPNGに含めます。

- 図形を32単位の座標系で描き、アンチエイリアス付きで状態異常32px・レリック42pxへ出力します。
- すべての文字・Lv・部位記号・♀はフォントで別レイヤーに描画します。
- `icon.png`が候補の完成画像、`artwork.png`が図形、`lettering.png`が文字レイヤーです。
- `artwork.svg`は図形の編集用です。グラデーションなどの追加ラスタ処理と文字は別レイヤーのため、最終表示の正本はPNGです。
- `lettering.json`に文字・使用フォント・サイズ・配置を記録します。
- `manifest.json`にはソースのデザイン指示と全候補の対応を保存します。
- コメント文を自然言語として自動解釈する機能はありません。指示変更時は`make_art`と各図形関数も修正します。

`index.html`をブラウザで開いて比較・選択できます。実寸／4倍、背景色、検索、カテゴリ別表示に対応します。「選択結果を保存」で`icon-selections.json`を出力できます。確認画面からゲーム用ファイルを書き換えることはありません。採用時は選んだ完成PNGを`image/icon/Status/ID.png`または`image/icon/Relic/ID.png`へコピーします。

実画像の可読性・見た目はユーザー確認とし、生成時にはID網羅・サイズ・透過・候補数を機械的に確認します。

採用済み画像の対応は`adopted-icons.json`に記録しています。各IDの候補元・採用案・本体への配置先・SHA-256を確認できます。本体は`image/icon/Status/ID.png`・`image/icon/Relic/ID.png`を自動検出し、この記録ファイルや制作ツールには依存しません。

## 右下表記・契約の紋章の修正版

```powershell
python tools/icon-design/revise.py --selections 'C:/path/to/icon-selections.json' --output image/icon/candidates/new-revision
```

`--previous`で元の比較フォルダを指定します（既定は`2026-10-02-final`）。保存された選択のうち対象外の選択は保持し、対象36種のみ再選択します。保存JSONで未選択だった対象外のアイコンは旧候補を併記します。Insert系の修正対象はA・V・Mです。元のPNGや選択ファイルは上書きしません。

- 右下文字は元A案の実際のフォントサイズの1.5倍。文字の右下座標を固定します。
- 欲情LvMAXのB案は例外として、文字幅を約26pxまで広げ、さらに縦方向を1.25倍にします。右下位置は維持します。
- Aは四角背景、Bは文字の縁取り。どちらも大きい文字より手前に重ねます。
- `badge-layer/`に右下表記を分離保存します。完成画像の`lettering.png`には大文字と前面の背景・小文字が合成されています。
- contractSigilは中空ハート、中央の小ハート、左右の翼をベクターで描き、輪郭の太さを2案比較します。
- 修正版の選択JSONは対象外の既存選択を含めて出力し、`candidateRoot`を基準に各`file`を解決できます。
