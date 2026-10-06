const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Content Safety Scan - game/ folder text against blocked_words.txt', (t) => {
    const blockedWordsPath = path.join(__dirname, 'blocked_words.txt');
    assert.strictEqual(fs.existsSync(blockedWordsPath), true, 'blocked_words.txt must exist');

    const blockedWords = fs.readFileSync(blockedWordsPath, 'utf8')
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0);

    assert.ok(blockedWords.length >= 10, 'Must have at least 10 blocked words');

    const gameDir = path.join(__dirname, '..', 'game');
    const filesToScan = [];

    function scanDir(dir) {
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (/\.(html|css|js|md|txt|json)$/i.test(file)) {
                filesToScan.push(fullPath);
            }
        }
    }

    scanDir(gameDir);

    const violations = [];

    for (const filePath of filesToScan) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(path.join(__dirname, '..'), filePath);

        for (const word of blockedWords) {
            if (content.includes(word)) {
                violations.push({
                    file: relativePath,
                    word: word
                });
            }
        }
    }

    assert.strictEqual(
        violations.length,
        0,
        `Content safety scan failed! Found blocked words:\n${JSON.stringify(violations, null, 2)}`
    );
});
