## 0.test実行

```bash
npx electron .
```

## 1. パッケージインストール

```bash
npm install --save-dev electron-builder
```

## 2. package.jsonの設定

package.jsonに以下の設定を追加します：

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac"
  },
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "YourAppName",
    "mac": {
      "category": "public.app-category.utilities",
      "target": [
        "dmg",
        "zip"
      ],
      "icon": "build/icon.icns"
    },
    "dmg": {
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ]
    },
    "files": [
      "**/*",
      "!**/*.ts",
      "!*.map"
    ]
  }
}
```

## 3. アイコンの準備（オプション）

- `build/icon.icns` にアプリアイコンを配置（512x512px以上のPNG画像から変換可能）

## 4. ビルド実行

```bash
npm run build:mac
```

