// ==========================================
// Q 的專屬遊戲室:好朋友、獎盃櫃、貼紙簿
// 紀錄都存在這台裝置(localStorage);讀寫失敗時照常顯示,只是不會記住
// ==========================================

const QRoom = (() => {
    const KEY = 'qroom';
    const OWNER = 'Q';
    const IMG = (name) => 'assets/' + name;

    const BUDDIES = [
        { id: 'rumi2', name: '魯米' },
        { id: 'zoey', name: '柔伊' },
        { id: 'mira', name: '米拉' },
        { id: 'tiger', name: '老虎朋友' },
        { id: 'bird', name: '小鳥朋友' },
        { id: 'cat_blue', name: '藍貓小妖怪' }
    ];

    // 12 張貼紙:img 是角色圖,emoji 是沒有角色圖的貼紙
    const STICKERS = [
        { id: 'welcome', img: 'rumi2.png', title: '歡迎光臨', how: '第一次來遊戲室' },
        { id: 'mem6', img: 'zoey.png', title: '記憶小高手', how: '翻翻記憶卡 6 對全部配對' },
        { id: 'mem8', img: 'mira.png', title: '記憶大師', how: '翻翻記憶卡 8 對全部配對' },
        { id: 'mazeWin', img: 'tiger.png', title: '逃脫成功', how: '迷宮大逃脫成功開門' },
        { id: 'maze400', img: 'bird.png', title: '迷宮高分', how: '迷宮拿到 400 分以上' },
        { id: 'simon5', img: 'rumi.png', title: '小歌手', how: '跟著唱記住 5 個音' },
        { id: 'simon10', img: 'cat_blue.png', title: '超級歌手', how: '跟著唱記住 10 個音' },
        { id: 'puz3', img: 'demon_red.png', title: '拼圖新手', how: '拼好 3×3 舞台拼圖' },
        { id: 'puz4', img: 'demon_pink.png', title: '拼圖達人', how: '拼好 4×4 舞台拼圖' },
        { id: 'math10', emoji: '🧮', title: '數學小天才', how: '10 以內數學 10 題全對' },
        { id: 'math20', emoji: '🏅', title: '數學大天才', how: '20 以內數學 10 題全對' },
        { id: 'allGames', emoji: '🏆', title: '全能玩家', how: '5 種遊戲都玩過' },
        { id: 'sdk4', emoji: '🔢', title: '數獨新手', how: '完成 4×4 角色數獨' },
        { id: 'sdk6', emoji: '🧠', title: '數獨高手', how: '完成 6×6 數字數獨' }
    ];

    const TROPHIES = [
        { label: '🏰 迷宮最高分', key: 'maze', unit: '分' },
        { label: '🃏 記憶卡 6 對', key: 'memory6', unit: '次翻完', low: true },
        { label: '🃏 記憶卡 8 對', key: 'memory8', unit: '次翻完', low: true },
        { label: '🎤 跟著唱', key: 'simon', unit: '個音' },
        { label: '🧩 拼圖 3×3', key: 'puzzle3', unit: '步', low: true },
        { label: '🧩 拼圖 4×4', key: 'puzzle4', unit: '步', low: true },
        { label: '🧮 數學 10 以內', key: 'math10', unit: '題對' },
        { label: '🧮 數學 20 以內', key: 'math20', unit: '題對' },
        { label: '🔢 數獨 4×4', key: 'sudoku4', unit: '秒', low: true },
        { label: '🔢 數獨 6×6', key: 'sudoku6', unit: '秒', low: true }
    ];

    const GAMES = ['maze', 'memory', 'simon', 'puzzle', 'math'];

    function load() {
        let s = null;
        try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
        return Object.assign({ stickers: [], played: [], buddy: 'rumi2' }, s || {});
    }
    function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
    function getBest(key) {
        try { return JSON.parse(localStorage.getItem('huntrxBest_' + key)); } catch (e) { return null; }
    }
    function setBest(key, v) {
        const old = getBest(key);
        if (old === null || v > old) { try { localStorage.setItem('huntrxBest_' + key, JSON.stringify(v)); } catch (e) {} }
    }
    function say(text) { if (typeof AudioManager !== 'undefined') AudioManager.speak(text); }
    function buddyOf(s) { return BUDDIES.find(b => b.id === s.buddy) || BUDDIES[0]; }

    function toast(sticker) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerHTML = '';
        const pic = sticker.img ? Object.assign(document.createElement('img'), { src: IMG(sticker.img), alt: '' }) : Object.assign(document.createElement('span'), { textContent: sticker.emoji, className: 'toast-emoji' });
        const txt = document.createElement('div');
        txt.innerHTML = `<b>得到新貼紙!</b><br>${sticker.title}`;
        t.appendChild(pic); t.appendChild(txt);
        t.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
    }

    function unlock(s, id) {
        if (s.stickers.includes(id)) return false;
        s.stickers.push(id);
        const st = STICKERS.find(x => x.id === id);
        if (st) {
            toast(st);
            setTimeout(() => say(`太棒了!你得到新貼紙:${st.title}!`), 1800);
        }
        return true;
    }

    // 各遊戲結束時呼叫:key 例如 memory6 / simon / puzzle3 / math20 / maze / mazeWin
    function report(key, value) {
        const s = load();
        const game = key === 'mazeWin' ? 'maze' : key.replace(/\d+$/, '');
        if (GAMES.includes(game) && !s.played.includes(game)) s.played.push(game);
        if (key === 'maze' || key === 'mazeWin') setBest('maze', value);
        if (key === 'mazeWin') unlock(s, 'mazeWin');
        if ((key === 'maze' || key === 'mazeWin') && value >= 400) unlock(s, 'maze400');
        if (key === 'memory6') unlock(s, 'mem6');
        if (key === 'memory8') unlock(s, 'mem8');
        if (key === 'simon' && value >= 5) unlock(s, 'simon5');
        if (key === 'simon' && value >= 10) unlock(s, 'simon10');
        if (key === 'puzzle3') unlock(s, 'puz3');
        if (key === 'puzzle4') unlock(s, 'puz4');
        if (key === 'math10' && value >= 10) unlock(s, 'math10');
        if (key === 'math20' && value >= 10) unlock(s, 'math20');
        if (key === 'sudoku4') unlock(s, 'sdk4');
        if (key === 'sudoku6') unlock(s, 'sdk6');
        if (GAMES.every(g => s.played.includes(g))) unlock(s, 'allGames');
        save(s);
        if (!document.getElementById('room-screen').classList.contains('hidden')) render();
    }

    function render() {
        const s = load();
        const buddy = buddyOf(s);
        const area = document.getElementById('room-area');
        area.innerHTML = '';

        // 好朋友
        const hero = document.createElement('section');
        hero.className = 'room-hero';
        hero.innerHTML = `<img class="room-buddy" src="${IMG(buddy.id + '.png')}" alt="${buddy.name}">
            <p class="room-hello">${buddy.name}:「嗨 ${OWNER}!今天也一起玩吧!」</p>`;
        const pick = document.createElement('div');
        pick.className = 'room-pick';
        BUDDIES.forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'room-pick-btn' + (b.id === buddy.id ? ' on' : '');
            btn.setAttribute('aria-label', '選 ' + b.name + ' 當好朋友');
            btn.innerHTML = `<img src="${IMG(b.id + '.png')}" alt="">`;
            btn.addEventListener('click', () => {
                const st = load(); st.buddy = b.id; save(st);
                render();
                say(`耶!我是${b.name},我是 ${OWNER} 的好朋友!`);
            });
            pick.appendChild(btn);
        });
        hero.appendChild(el('p', 'room-sub', '換一個好朋友:'));
        hero.appendChild(pick);
        area.appendChild(hero);

        // 獎盃櫃
        const tro = document.createElement('section');
        tro.className = 'room-card';
        tro.appendChild(el('h3', '', '🏆 獎盃櫃'));
        const list = document.createElement('dl');
        list.className = 'room-trophies';
        TROPHIES.forEach(t => {
            const v = getBest(t.key);
            list.appendChild(el('dt', '', t.label));
            list.appendChild(el('dd', v === null ? 'none' : '', v === null ? '還沒玩過' : `${v} ${t.unit}`));
        });
        tro.appendChild(list);
        area.appendChild(tro);

        // 貼紙簿
        const book = document.createElement('section');
        book.className = 'room-card';
        book.appendChild(el('h3', '', `⭐ 貼紙簿 ${s.stickers.length} / ${STICKERS.length}`));
        const grid = document.createElement('div');
        grid.className = 'room-stickers';
        STICKERS.forEach(st => {
            const got = s.stickers.includes(st.id);
            const cell = document.createElement('div');
            cell.className = 'room-sticker' + (got ? ' got' : '');
            const pic = got
                ? (st.img ? `<img src="${IMG(st.img)}" alt="">` : `<span class="room-emoji">${st.emoji}</span>`)
                : '<span class="room-lock">?</span>';
            cell.innerHTML = `${pic}<b>${got ? st.title : '???'}</b><small>${st.how}</small>`;
            grid.appendChild(cell);
        });
        book.appendChild(grid);
        area.appendChild(book);
    }

    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        e.textContent = text;
        return e;
    }

    function open() {
        document.querySelectorAll('.screen').forEach(sc => sc.classList.add('hidden'));
        document.getElementById('room-screen').classList.remove('hidden');
        const input = document.getElementById('player-name');
        if (input && !input.value.trim()) input.value = OWNER;
        if (typeof playerName !== 'undefined') playerName = (input && input.value.trim()) || OWNER;
        if (typeof AudioManager !== 'undefined') AudioManager.init();
        const s = load();
        unlock(s, 'welcome');
        save(s);
        render();
        say(`歡迎回來,${OWNER}!這是你的專屬遊戲室喔!`);
    }

    function close() {
        document.getElementById('room-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    }

    function init() {
        const b = document.getElementById('room-btn');
        if (b) b.addEventListener('click', open);
        const back = document.getElementById('room-back');
        if (back) back.addEventListener('click', close);
    }

    return { init, report, open, STICKERS };
})();

if (typeof window !== 'undefined') {
    window.addEventListener('load', QRoom.init);
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QRoom };
}
