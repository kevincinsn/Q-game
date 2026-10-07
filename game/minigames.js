// ==========================================
// HUNTR/X 益智小遊戲:翻翻記憶卡、跟著唱、舞台拼圖、數學淨化小妖怪
// 依賴 game.js 的 AudioManager(語音/音效)與 playerName
// ==========================================

const MiniGames = (() => {
    const IMG = (name) => 'assets/' + name;
    const CAST = {
        rumi: { name: '魯米', img: 'rumi2.png' },
        zoey: { name: '柔伊', img: 'zoey.png' },
        mira: { name: '米拉', img: 'mira.png' },
        tiger: { name: '老虎朋友', img: 'tiger.png' },
        bird: { name: '小鳥朋友', img: 'bird.png' },
        red: { name: '紅色小妖怪', img: 'demon_red.png' },
        pink: { name: '粉紅小妖怪', img: 'demon_pink.png' },
        cat: { name: '藍貓小妖怪', img: 'cat_blue.png' }
    };

    let area, titleEl, statusEl, cleanup = null;

    // ---------- 共用 ----------
    function rand(n) { return Math.floor(Math.random() * n); }
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = rand(i + 1);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function say(text) { if (typeof AudioManager !== 'undefined') AudioManager.speak(text); }
    function sfx(type) { if (typeof AudioManager !== 'undefined') AudioManager.playSound(type); }
    function tone(freq, ms) {
        if (typeof audioCtx === 'undefined' || !audioCtx) return;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        o.connect(g); g.connect(audioCtx.destination);
        const t = audioCtx.currentTime;
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + ms / 1000);
        o.start(t); o.stop(t + ms / 1000);
    }
    function best(key, value, lowerIsBetter) {
        // 最佳紀錄存在這台裝置(讀寫失敗就當沒有紀錄)
        const k = 'huntrxBest_' + key;
        let old = null;
        try { old = JSON.parse(localStorage.getItem(k)); } catch (e) { old = null; }
        if (value === undefined) return old;
        const better = old === null || (lowerIsBetter ? value < old : value > old);
        if (typeof QRoom !== 'undefined') QRoom.report(key, value);
        if (better) { try { localStorage.setItem(k, JSON.stringify(value)); } catch (e) {} }
        return better;
    }
    function who() { return (typeof playerName !== 'undefined' && playerName) ? playerName : '小英雄'; }

    function open(title) {
        if (cleanup) { cleanup(); cleanup = null; }
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('mini-screen').classList.remove('hidden');
        titleEl.textContent = title;
        statusEl.textContent = '';
        area.innerHTML = '';
        if (typeof AudioManager !== 'undefined') AudioManager.init();
    }

    function backToMenu() {
        if (cleanup) { cleanup(); cleanup = null; }
        document.getElementById('mini-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    }

    function finishPanel(lines, again) {
        const p = el('div', 'mini-finish');
        p.appendChild(el('h2', '', lines[0]));
        lines.slice(1).forEach(t => p.appendChild(el('p', '', t)));
        const row = el('div', 'mini-row');
        const b1 = el('button', '', '再玩一次');
        b1.addEventListener('click', again);
        const b2 = el('button', 'secondary-btn', '回遊戲選單');
        b2.addEventListener('click', backToMenu);
        row.appendChild(b1); row.appendChild(b2);
        p.appendChild(row);
        area.appendChild(p);
    }

    function levelPicker(text, options, onPick) {
        const box = el('div', 'mini-intro');
        box.appendChild(el('p', '', text));
        const row = el('div', 'mini-row');
        options.forEach(([label, value]) => {
            const b = el('button', '', label);
            b.addEventListener('click', () => onPick(value));
            row.appendChild(b);
        });
        box.appendChild(row);
        area.appendChild(box);
    }

    // ---------- 1. 翻翻記憶卡 ----------
    function memory() {
        open('翻翻記憶卡');
        levelPicker('把一樣的角色配成一對!', [['簡單 6 對', 6], ['挑戰 8 對', 8]], startMemory);
        say('翻翻記憶卡!把一樣的角色找出來配成一對喔!');
    }

    function startMemory(pairs) {
        area.innerHTML = '';
        const keys = Object.keys(CAST).slice(0, pairs);
        const deck = shuffle(keys.concat(keys));
        const grid = el('div', 'mem-grid');
        grid.style.gridTemplateColumns = `repeat(4, 1fr)`;
        let first = null, lock = false, moves = 0, found = 0;
        const update = () => { statusEl.textContent = `翻牌 ${moves} 次 · 配對 ${found}/${pairs}`; };
        update();
        deck.forEach(key => {
            const card = el('button', 'mem-card');
            card.setAttribute('aria-label', '卡片');
            card.innerHTML = `<span class="mem-back">?</span><img class="mem-face" src="${IMG(CAST[key].img)}" alt="${CAST[key].name}">`;
            card.addEventListener('click', () => {
                if (lock || card.classList.contains('open')) return;
                card.classList.add('open');
                tone(660, 120);
                if (!first) { first = card; first.dataset.key = key; return; }
                moves++;
                if (first.dataset.key === key) {
                    found++;
                    card.classList.add('done'); first.classList.add('done');
                    first = null;
                    sfx('coin');
                    update();
                    if (found === pairs) {
                        const isBest = best('memory' + pairs, moves, true);
                        say(`好厲害!你用 ${moves} 次就全部配對完成了!`);
                        sfx('win');
                        setTimeout(() => finishPanel(['🎉 全部配對成功!', `翻牌 ${moves} 次` + (isBest ? '(新紀錄!)' : `(最佳 ${best('memory' + pairs)} 次)`)], () => startMemory(pairs)), 500);
                    }
                } else {
                    lock = true;
                    const a = first; first = null;
                    update();
                    setTimeout(() => { a.classList.remove('open'); card.classList.remove('open'); lock = false; }, 800);
                }
            });
            grid.appendChild(card);
        });
        area.appendChild(grid);
    }

    // ---------- 2. 跟著唱(記憶順序) ----------
    function simon() {
        open('跟著 HUNTR/X 唱');
        levelPicker('看誰在唱歌,記住順序再照著按!', [['開始', 1]], startSimon);
        say('跟著我們唱!記住誰先唱,再照著順序按喔!');
    }

    function startSimon() {
        area.innerHTML = '';
        const pads = [
            { key: 'rumi', freq: 523 },
            { key: 'zoey', freq: 659 },
            { key: 'mira', freq: 784 },
            { key: 'tiger', freq: 1047 }
        ];
        const grid = el('div', 'simon-grid');
        const btns = pads.map((p, i) => {
            const b = el('button', 'simon-pad');
            b.innerHTML = `<img src="${IMG(CAST[p.key].img)}" alt=""><span>${CAST[p.key].name}</span>`;
            b.addEventListener('click', () => press(i));
            grid.appendChild(b);
            return b;
        });
        area.appendChild(grid);

        let seq = [], pos = 0, listening = false, timers = [];
        const later = (fn, ms) => timers.push(setTimeout(fn, ms));
        cleanup = () => timers.forEach(clearTimeout);

        function flash(i, ms) {
            btns[i].classList.add('lit');
            tone(pads[i].freq, ms);
            later(() => btns[i].classList.remove('lit'), ms);
        }
        function nextRound() {
            seq.push(rand(4));
            pos = 0; listening = false;
            statusEl.textContent = `第 ${seq.length} 關 · 仔細聽`;
            const gap = Math.max(380, 700 - seq.length * 30);
            seq.forEach((i, k) => later(() => flash(i, gap - 120), 700 + k * gap));
            later(() => { listening = true; statusEl.textContent = `第 ${seq.length} 關 · 換你囉!`; }, 700 + seq.length * gap);
        }
        function press(i) {
            if (!listening) return;
            flash(i, 250);
            if (i !== seq[pos]) {
                listening = false;
                const score = seq.length - 1;
                const isBest = best('simon', score, false);
                sfx('lose');
                say(`差一點點!你記住了 ${score} 個音,很棒喔!`);
                later(() => finishPanel(['🎤 表演結束!', `你記住了 ${score} 個音` + (isBest ? '(新紀錄!)' : `(最佳 ${best('simon')} 個)`)], startSimon), 600);
                return;
            }
            pos++;
            if (pos === seq.length) {
                listening = false;
                statusEl.textContent = `第 ${seq.length} 關 · 唱得好!`;
                sfx('coin');
                if (seq.length % 3 === 0) say('唱得太好聽了!');
                later(nextRound, 900);
            }
        }
        nextRound();
    }

    // ---------- 3. 舞台拼圖(滑動拼圖) ----------
    function puzzle() {
        open('舞台拼圖');
        levelPicker('滑動圖塊,把 HUNTR/X 的舞台拼回來!', [['簡單 3×3', 3], ['挑戰 4×4', 4]], startPuzzle);
        say('舞台拼圖!點空格旁邊的圖塊就能把它滑過去喔!');
    }

    function startPuzzle(n) {
        area.innerHTML = '';
        const total = n * n;
        let tiles = [...Array(total).keys()]; // 最後一格(total-1)是空格
        let empty = total - 1;
        // 從完成狀態隨機滑動打亂,保證一定拼得回來
        let prev = -1;
        for (let k = 0; k < n * n * 25; k++) {
            const nb = neighbors(empty).filter(x => x !== prev);
            const pick = nb[rand(nb.length)];
            [tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]];
            prev = empty; empty = pick;
        }
        let moves = 0;
        const board = el('div', 'puz-board');
        board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        const peek = el('button', 'secondary-btn', '👀 看原圖');
        const preview = el('img', 'puz-preview');
        preview.src = IMG('group.jpg');
        preview.alt = '完成的樣子';
        preview.hidden = true;
        peek.addEventListener('click', () => { preview.hidden = !preview.hidden; });

        function neighbors(i) {
            const r = Math.floor(i / n), c = i % n, out = [];
            if (r > 0) out.push(i - n);
            if (r < n - 1) out.push(i + n);
            if (c > 0) out.push(i - 1);
            if (c < n - 1) out.push(i + 1);
            return out;
        }
        function render() {
            board.innerHTML = '';
            tiles.forEach((t, i) => {
                const b = el('button', 'puz-tile' + (t === total - 1 ? ' empty' : ''));
                if (t !== total - 1) {
                    const r = Math.floor(t / n), c = t % n;
                    b.style.backgroundImage = `url(${IMG('group.jpg')})`;
                    b.style.backgroundSize = `${n * 100}% ${n * 100}%`;
                    b.style.backgroundPosition = `${(c / (n - 1)) * 100}% ${(r / (n - 1)) * 100}%`;
                    b.setAttribute('aria-label', '圖塊 ' + (t + 1));
                    b.addEventListener('click', () => move(i));
                }
                board.appendChild(b);
            });
            statusEl.textContent = `移動 ${moves} 步`;
        }
        function move(i) {
            if (!neighbors(empty).includes(i)) return;
            [tiles[empty], tiles[i]] = [tiles[i], tiles[empty]];
            empty = i;
            moves++;
            tone(440, 60);
            render();
            if (tiles.every((t, k) => t === k)) {
                const isBest = best('puzzle' + n, moves, true);
                sfx('win');
                say(`拼好了!HUNTR/X 的舞台又亮起來了,你用了 ${moves} 步!`);
                setTimeout(() => finishPanel(['🌟 拼圖完成!', `移動 ${moves} 步` + (isBest ? '(新紀錄!)' : `(最佳 ${best('puzzle' + n)} 步)`)], () => startPuzzle(n)), 500);
            }
        }
        render();
        area.appendChild(board);
        const row = el('div', 'mini-row');
        row.appendChild(peek);
        area.appendChild(row);
        area.appendChild(preview);
    }

    // ---------- 4. 數學淨化小妖怪 ----------
    function math() {
        open('數學幫幫忙');
        levelPicker('答對題目,小妖怪就會開心地變乖喔!', [['10 以內', 10], ['20 以內', 20]], startMath);
        say('數學幫幫忙!答對題目,小妖怪就會變成好朋友喔!');
    }

    function startMath(max) {
        area.innerHTML = '';
        const demons = ['red', 'pink', 'cat'];
        const hunters = ['rumi', 'zoey', 'mira'];
        const TOTAL = 10;
        let q = 0, right = 0;

        const stage = el('div', 'math-stage');
        const hunter = el('img', 'math-hunter');
        const demon = el('img', 'math-demon');
        stage.appendChild(hunter); stage.appendChild(el('span', 'math-vs', '✨')); stage.appendChild(demon);
        const question = el('div', 'math-q');
        const choices = el('div', 'mini-row math-choices');
        area.appendChild(stage); area.appendChild(question); area.appendChild(choices);

        function make() {
            const plus = Math.random() < 0.6;
            let a, b, ans;
            if (plus) { a = rand(max) ; b = rand(max - a + 1); ans = a + b; }
            else { a = rand(max + 1); b = rand(a + 1); ans = a - b; }
            const opts = new Set([ans]);
            while (opts.size < 3) {
                const d = ans + (rand(5) - 2) * (1 + rand(2));
                if (d >= 0 && d <= max * 2 && d !== ans) opts.add(d);
            }
            return { text: `${a} ${plus ? '+' : '−'} ${b} = ?`, ans, opts: shuffle([...opts]) };
        }
        function next() {
            if (q === TOTAL) {
                const isBest = best('math' + max, right, false);
                sfx('win');
                say(`太棒了!你答對了 ${right} 題!`);
                area.innerHTML = '';
                finishPanel(['🧮 挑戰完成!', `答對 ${right} / ${TOTAL} 題` + (isBest ? '(新紀錄!)' : `(最佳 ${best('math' + max)} 題)`)], () => startMath(max));
                return;
            }
            q++;
            const h = hunters[rand(3)], d = demons[rand(3)];
            hunter.src = IMG(CAST[h].img); hunter.alt = CAST[h].name;
            demon.src = IMG(CAST[d].img); demon.alt = CAST[d].name;
            demon.classList.remove('happy');
            const p = make();
            question.textContent = p.text;
            statusEl.textContent = `第 ${q}/${TOTAL} 題 · 答對 ${right}`;
            choices.innerHTML = '';
            p.opts.forEach(v => {
                const b = el('button', 'math-choice', String(v));
                b.addEventListener('click', () => {
                    choices.querySelectorAll('button').forEach(x => { x.disabled = true; });
                    if (v === p.ans) {
                        right++;
                        b.classList.add('right');
                        demon.classList.add('happy');
                        sfx('coin');
                    } else {
                        b.classList.add('wrong');
                        choices.querySelectorAll('button').forEach(x => { if (x.textContent === String(p.ans)) x.classList.add('right'); });
                        tone(220, 200);
                    }
                    setTimeout(next, 900);
                });
                choices.appendChild(b);
            });
        }
        next();
    }

    function init() {
        area = document.getElementById('mini-area');
        titleEl = document.getElementById('mini-title');
        statusEl = document.getElementById('mini-status');
        document.getElementById('mini-back').addEventListener('click', backToMenu);
        const bind = (id, fn) => {
            const b = document.getElementById(id);
            if (b) b.addEventListener('click', () => {
                const input = document.getElementById('player-name');
                if (typeof playerName !== 'undefined' && input) playerName = input.value.trim() || '小英雄';
                fn();
            });
        };
        bind('mg-memory', memory);
        bind('mg-simon', simon);
        bind('mg-puzzle', puzzle);
        bind('mg-math', math);
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) menuBtn.addEventListener('click', () => {
            document.getElementById('end-screen').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        });
    }

    return { init, shuffle, who };
})();

if (typeof window !== 'undefined') {
    window.addEventListener('load', MiniGames.init);
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MiniGames };
}
