import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const skill = new URL('../zhixin-copywriting/', import.meta.url);
const checker = fileURLToPath(new URL('scripts/check-draft.mjs', skill));
const example = (name) => fileURLToPath(new URL(`templates/${name}`, skill));
const brief = {
  jobId: 'test-draft',
  product: '示例商品',
  audience: '目标读者',
  goal: '帮助读者做选择',
  facts: [{ claim: '颜色为白色。', source: '说明书第 1 页' }],
};

function runChecker(...args) {
  const result = spawnSync(process.execPath, [checker, ...args], { encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}

function checkText(inputBrief, markdown) {
  const workspace = mkdtempSync(join(tmpdir(), 'zhixin-copywriting-test-'));
  try {
    const briefPath = join(workspace, 'brief.json');
    const articlePath = join(workspace, 'article.md');
    writeFileSync(briefPath, JSON.stringify(inputBrief), 'utf8');
    writeFileSync(articlePath, markdown, 'utf8');
    return runChecker(briefPath, articlePath);
  } finally {
    rmSync(workspace, { recursive: true });
  }
}

test('the bundled demo passes with a local-only reminder', () => {
  const result = runChecker(example('brief.example.json'), example('article.example.md'));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /只限本地演练/);
});

test('wrong argument count produces a usage error', () => {
  assert.equal(runChecker().status, 2);
});

test('missing fact sources and reserved Windows names are rejected', () => {
  const result = checkText(
    { ...brief, jobId: 'CON', facts: [{ claim: '未经核实的主张' }] },
    '# 标题\n\n正文。',
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /jobId/);
  assert.match(result.stderr, /source/);
});

test('Unicode character limits agree with the article import schema', () => {
  const title = '🚀'.repeat(200);
  const body = '𠮷'.repeat(20000);
  const atLimit = checkText(brief, `# ${title}\r\n\r\n${body}`);
  assert.equal(atLimit.status, 0, atLimit.stderr);
  assert.match(atLimit.stdout, /标题 200 字符，正文 20000 字符/);

  const extraTitle = checkText(brief, `# ${title}字\n\n正文。`);
  assert.equal(extraTitle.status, 1);
  assert.match(extraTitle.stderr, /标题 1–200/);
  const extraBody = checkText(brief, `# 标题\n\n${body}字`);
  assert.equal(extraBody.status, 1);
  assert.match(extraBody.stderr, /正文须为 1–20,000/);
});

test('Markdown assets and ordinary text links are allowed', () => {
  const result = checkText(brief, '# 标题\n\n![工作桌](asset:desk-1)\n\n[来源](https://example.com)');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /图片引用 1 张/);
});

test('external image URLs and more than five asset images are rejected', () => {
  for (const body of [
    '![图片](https://example.com/desk.png)',
    '![图片](asset:desk-1)\n'.repeat(6),
  ]) {
    const result = checkText(brief, `# 标题\n\n${body}`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /最多 5 张图/);
  }
});

test('raw HTML is rejected even for tags unrelated to images', () => {
  const result = checkText(brief, '# 标题\n\n<div>正文</div>');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTML/);
});
