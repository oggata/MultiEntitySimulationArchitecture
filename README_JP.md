# MESA (Multi-Entity Simulation Architecture)

AI搭載の住民が現実的な行動、相互作用、意思決定プロセスで日常生活を送る仮想都市を作成する3D自律エージェントシミュレーションです。

![画面](./images/Walk-sim.gif)

##  自律エージェント

AI駆動の意思決定: 各エージェントはOpenAI、Gemini API、OllamaなどのAPIを使用して、性格と現在の状況に基づいて現実的な決定を行います
独自の性格: エージェントは社交性、エネルギーレベル、ルーティン嗜好、好奇心、共感力などの明確な特徴を持っています
メモリシステム: 将来の決定に影響を与える短期および長期メモリシステム
関係性ダイナミクス: エージェントは相互作用を通じてお互いとの関係を構築します
日常ルーティン: 各エージェントは朝、午後、夕方、夜の異なる活動を含む個別化された日常スケジュールに従います
コミュニケーションシステム: エージェントはお互いに電話をかけたりメールを送ったりして、社会的相互作用を強化できます

## 本体の準備

###　Macの場合
1.mesa-1.0.0-arm64.dmgをダウンロード
https://github.com/oggata/MultiEntitySimulationArchitecture/blob/main/install/mesa-1.0.0-arm64.dmg
2.dmgファイルからインストール
![画面](./images/install.png)
3.起動

###　Windowsやその他（ブラウザで実行します）
1.ファイルをダウンロード
2.npmをインストール
   ```bash
   npm install
   ```
3.ローカルのhttpサーバーを起動
   ```bash
   python3 -m http.server
   ```
4.ブラウザを開いて `http://localhost:8000` に移動

###　簡単な起動（外部URLをブラウザで起動します）
下記のURLへアクセスしてください。(※ OllamaでのAgent実行はできません。)

https://oggata.github.io/MultiEntitySimulationArchitecture/


## 関連ツールの準備

###　Ollamaのインストール
MESAはOllamaに対応しており、ローカル環境で実行が可能です。
1.ollamaをダウンロード
```bash
https://ollama.com
```
2.
```bash
$ ollama pull llama3.2
$ ollama run llama3.2
```
###　セグメンテーションマップの作成
航空写真から簡易的なセグメンテーションマップを作成できます。

1.GoogleColabに下記のPythonを読み込みます。
https://github.com/oggata/MultiEntitySimulationArchitecture/blob/main/example/colab_3d_city_map.py

2.地図データをインポートして実行を行います
![画面](./images/Segment-1.png)

3.セグメンテーションデータ(.json)が作成されるため、src/json/配下に配置することで、MESAから読み込むことが可能です。
![画面](./images/Segment-2.png)
![画面](./images/Segment-3.png)


###　動画ファイルへ出力
エージェントの行動は動画ファイルへ出力を行います。

![画面](./images/Walk-gif.gif)


## コミュニティ

最新の開発状況を把握し、アイデアを共有し、他のユーザーとつながるためにコミュニティに参加してください：

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/TdENtAnuuX)


