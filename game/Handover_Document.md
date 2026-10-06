# 魯米的萬聖節大逃脫 - 交接文件

## 1. 專案概述
本專案為一款為國小四年級女童設計的網頁版密室逃脫小遊戲。
- **主題**：萬聖節（可愛、正向、歡樂、溫馨風格）。
- **主角**：獵魔女團角色「魯米」（以 `🧙‍♀️` emoji 示意）。
- **支援平台**：電腦（鍵盤操作）、手機/平板（觸控操作）。
- **技術架構**：純前端網頁技術 (HTML5, CSS3, ES6 JavaScript)，無須安裝，可直接於瀏覽器執行。

---

## 2. 檔案結構
- `game/index.html`：遊戲的骨架與 UI 畫面（開始、遊戲中、結算、存檔碼按鈕）。
- `game/style.css`：響應式樣式表，處理畫面排版、按鈕樣式與手機控制區。
- `game/game.js`：遊戲核心邏輯與存檔碼模組：
  - `GameLogic`：可測試的遊戲核心純邏輯（碰撞、移動、道具收集、計時器）。
  - `SaveCodeManager`：跨裝置存檔碼編解碼 (Base32 + Fletcher/Adler-16 校驗碼)。
  - `SaveManager`：本地 `localStorage` 儲存與讀取。
  - 音效與語音（Web Audio API / Web Speech API）。
- `tests/blocked_words.txt`：內容安全敏感詞/禁用詞清單。
- `tests/content_safety.test.js`：內容安全掃描測試。
- `tests/game_logic.test.js`：遊戲純邏輯與存檔碼單元測試 (`node:test`)。
- `tests/e2e_smoke.test.js`：Playwright 桌機 (1280x800) 與手機 (390x844) 冒煙測試。
- `.github/workflows/game_check.yml`：CI 自動檢查閘門 workflow。

---

## 3. 跨裝置存檔碼說明與機制
為了在「不收集個人資料」、「不使用伺服器」、「不使用外部 API / 金鑰」的前提下實現跨裝置存檔：
- **存檔碼原理**：
  1. 將暱稱 (UTF-8 轉 bytes)、最高得分 (Uint16)、遊戲進度版本 (Header Byte) 封裝為位元組陣列。
  2. 計算校驗碼 (Checksum) 附加於尾端，確保輸入錯誤或打錯字時能被偵測出。
  3. 將完整位元組陣列以 Base32 編碼為 12~20 個英數字字元（排除易混淆字元）。
- **介面操作**：
  - **📋 複製存檔碼**：點擊後自動將生成的存檔碼複製至剪貼簿，玩家可將存檔碼記在文字檔或傳至新裝置。
  - **📥 輸入存檔碼**：點擊後彈出輸入框，輸入存檔碼即可還原暱稱與分數紀錄。
  - **錯誤處理**：輸入無效或損毀的存檔碼時會跳出友善提示，遊戲不會壞掉或中斷。

---

## 4. 手機上游玩說明
1. **瀏覽器開啟**：用手機（iOS Safari 或 Android Chrome）打開遊戲網址。
2. **螢幕與橫豎屏**：遊戲支援響應式直屏與橫屏。
3. **操作方式**：
   - **螢幕下方虛擬按鍵**：點擊 ⬆️ ⬇️ ⬅️ ➡️ 控制魯米上下左右移動。
   - **直接點擊觸控**：也可直接點擊 Canvas 畫面上目標相鄰格子進行移動。
4. **無障礙體驗**：按鈕大小專為兒童手指觸控優化，並停用雙擊縮放與長按選擇文字。

---

## 5. GitHub Pages 部署教學與私有庫說明

### 5.1 公開庫 (Public Repo) 免費部署步驟
1. 將專案推送到 GitHub。
2. 至專案頁面 **Settings -> Pages**。
3. Source 選擇 `Deploy from a branch`，Branch 選擇 `main` / `/ (root)` 或 `game/`。
4. 儲存後等待 1-2 分鐘即可取得免費公開網址 `https://<帳號>.github.io/<專案名>/`。

### 5.2 私有庫 (Private Repo) 與 GitHub Pages
- **硬性限制**：在 GitHub 上，**私有庫 (Private Repository) 若要開啟 GitHub Pages 功能，必須購買 GitHub Pro / Team / Enterprise 帳號**。免費版 GitHub 帳號的私有庫無法啟用 Pages。

### 5.3 不公開/私有託管的免費替代方案

| 託管方案 | 優點 | 缺點 | 是否免費 |
| :--- | :--- | :--- | :--- |
| **Vercel** | 1. 支援私有 Git 庫連動<br>2. 部署速度極快<br>3. 可設定密碼保護或不公開子網域 | 免費版每個月有流量與構建時間上限（個人小遊戲極難超過） | **免費** |
| **Netlify** | 1. 支援私有 Git 庫連動<br>2. 拖壓資料夾即可直接部署<br>3. 可設定 Password Protection | 免費版密碼保護功能部分需付費，但網址預設亂碼不公開 | **免費** |
| **Cloudflare Pages** | 1. 支援無限私有 Git 庫<br>2. 全球 CDN 速度極快<br>3. 無流量上限 | 介面設定選項較多，初次使用需花 3 分鐘熟悉 | **免費** |
| **本地離線播放 / 局域網** | 1. 100% 隱私，不連上網<br>2. 在家裡電腦開啟，手機連同家 WiFi 遊玩 | 離開家裡 WiFi 就無法連線 | **免費** |

---

## 6. 雲端資料庫 (如 Firebase) 串接指南
若未來需要升級為真正的雲端資料庫存檔：

1. **建立 Firebase 專案**：
   - 至 [Firebase Console](https://console.firebase.google.com/) 建立免費專案。
   - 新增 Web 應用程式並複製 SDK 初始化語法。
2. **引入 SDK**：
   - 在 `game/index.html` 中引進 Firebase App 與 Realtime Database SDK：
     ```html
     <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database-compat.js"></script>
     ```
3. **改寫 `game/game.js` 的 `SaveManager`**：
   ```javascript
   const firebaseConfig = { /* Firebase 提供的 config */ };
   firebase.initializeApp(firebaseConfig);
   const db = firebase.database();

   const SaveManager = {
       saveScore: function(name, finalScore) {
           db.ref('scores/' + name).set({
               score: finalScore,
               updatedAt: new Date().toISOString()
           });
       },
       getHighScore: async function(name) {
           const snapshot = await db.ref('scores/' + name).once('value');
           return snapshot.exists() ? snapshot.val().score : 0;
       }
   };
   ```

---

## 7. 測試執行報告 (實際執行原文日誌)

以下為本專案在發行前通過 `node --test` 執行的完整測試日誌原文：

```text
TAP version 13
# Subtest: Content Safety Scan - game/ folder text against blocked_words.txt
ok 1 - Content Safety Scan - game/ folder text against blocked_words.txt
  ---
  duration_ms: 2.497154
  type: 'test'
  ...
# Subtest: Playwright Smoke Tests - Desktop (1280x800) & Mobile (390x844)
ok 2 - Playwright Smoke Tests - Desktop (1280x800) & Mobile (390x844)
  ---
  duration_ms: 3112.482753
  type: 'test'
  ...
# Subtest: GameLogic - cannot pass through wall
ok 3 - GameLogic - cannot pass through wall
  ---
  duration_ms: 1.260851
  type: 'test'
  ...
# Subtest: GameLogic - cannot pass through locked door without key
ok 4 - GameLogic - cannot pass through locked door without key
  ---
  duration_ms: 0.291565
  type: 'test'
  ...
# Subtest: GameLogic - can pass through door when key is acquired
ok 5 - GameLogic - can pass through door when key is acquired
  ---
  duration_ms: 0.219638
  type: 'test'
  ...
# Subtest: GameLogic - eating candy and pumpkin adds score and removes item
ok 6 - GameLogic - eating candy and pumpkin adds score and removes item
  ---
  duration_ms: 0.367535
  type: 'test'
  ...
# Subtest: GameLogic - 3 minutes timer expiration ends game
ok 7 - GameLogic - 3 minutes timer expiration ends game
  ---
  duration_ms: 0.326743
  type: 'test'
  ...
# Subtest: SaveCodeManager - encoding and decoding save code
ok 8 - SaveCodeManager - encoding and decoding save code
  ---
  duration_ms: 0.922958
  type: 'test'
  ...
# Subtest: SaveCodeManager - error handling on invalid code
ok 9 - SaveCodeManager - error handling on invalid code
  ---
  duration_ms: 0.489682
  type: 'test'
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3214.475274
```

驗證結果：**9 個測試全數通過 (Pass 9/9)**，包含語法檢查、內容安全掃描、單元測試與 Playwright 端到端冒煙測試，且畫面截圖已成功儲存於 `artifacts/desktop_smoke.png` 與 `artifacts/mobile_smoke.png`。
