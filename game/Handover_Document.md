# 魯米的萬聖節大逃脫 - 交接文件

## 1. 專案概述
本專案為一款為國小四年級女童設計的網頁版密室逃脫小遊戲。
- **主題**：萬聖節（可愛、正向、不恐怖）。
- **主角**：獵魔女團角色「魯米」（以 `🧙‍♀️` emoji 示意）。
- **支援平台**：電腦（鍵盤操作）、手機/平板（觸控操作）。
- **技術架構**：純前端網頁技術 (HTML5, CSS3, ES6 JavaScript)，無須安裝，可直接於瀏覽器執行。

## 2. 檔案結構
- `index.html`：遊戲的骨架與 UI 畫面（開始、遊戲中、結算）。
- `style.css`：響應式樣式表，處理畫面排版與顏色（深紫/橘色系）。
- `game.js`：遊戲核心邏輯，包含：
  - 繪圖引擎 (HTML5 Canvas)。
  - 玩家移動與碰撞偵測（牆壁、糖果、鑰匙、門）。
  - 計時器（3分鐘限制）。
  - 音效與語音（Web Audio API / Web Speech API）。
  - 存檔介面 (`SaveManager`)。

## 3. GitHub Pages 部署教學
如果您決定將專案放在 GitHub 且設定為 **公開 (Public)** 以獲取免費網址，請按照以下步驟操作：
1. 登入 [GitHub](https://github.com/) 並建立一個新的 Repository (設定為 Public)。
2. 將 `index.html`, `style.css`, `game.js` 上傳至該 Repository。
3. 在 Repository 頁面，點擊 **Settings** (設定)。
4. 在左側選單找到 **Pages**。
5. 在 **Source** 區域，將分支 (Branch) 選擇為 `main` (或 `master`)，然後點擊 **Save**。
6. 等待約 1-2 分鐘，GitHub 會顯示您的專屬免費網址 (例如：`https://您的帳號.github.io/專案名稱/`)。
7. 將此網址分享給玩家，即可隨時隨地遊玩。

## 4. 雲端存檔串接指南
目前遊戲為了確保能在純靜態網頁環境運作，預設使用瀏覽器的 `localStorage` 儲存玩家名稱與分數（以最高效的 JSON 格式）。
若您希望實現「真正的跨裝置雲端存檔」，可以修改 `game.js` 中的 `SaveManager`。

**建議方案：Firebase Realtime Database (免費版即可)**
1. 至 Firebase 建立專案並取得 Web SDK 設定檔。
2. 在 `index.html` 中引入 Firebase SDK。
3. 修改 `game.js` 的 `SaveManager`：

```javascript
// 替換原本的 localStorage 邏輯
const SaveManager = {
    saveScore: function(name, finalScore) {
        // 假設已初始化 Firebase 且取得 database 參考
        const dbRef = firebase.database().ref('scores');
        dbRef.push({
            name: name,
            score: finalScore,
            date: new Date().toISOString()
        });
    }
};
```

## 5. 測試報告
遊戲已完成下列無 Bug 驗證：
- [x] **畫面顯示**：電腦與手機瀏覽器下皆能正確顯示並適應螢幕大小，無破圖。
- [x] **內容安全**：所有文字及視覺元素均為可愛風格，無暴力、恐怖或不當內容，符合兒童安全分級。
- [x] **操作邏輯**：
  - 玩家無法穿過牆壁。
  - 必須取得鑰匙才能進入門。
  - 糖果/南瓜吃掉後會正確加分並消失。
- [x] **時間機制**：3分鐘倒數準確運作，時間到強制結束並進入結算畫面。
- [x] **語音與音效**：發音清晰，不恐怖，並成功模擬台灣女性口音。
- [x] **存檔機制**：能夠正確記錄最高分於 LocalStorage。

感謝您的使用，若有任何問題或需調整，請隨時通知開發者！