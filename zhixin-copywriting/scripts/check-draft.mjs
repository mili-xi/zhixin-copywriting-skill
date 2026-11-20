import { readFileSync } from 'node:fs';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const readText = (file) => readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function checkDraft(brief, markdown) {
  const errors = [];
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) {
    errors.push('简报必须是 JSON 对象。');
    brief = {};
  }
  if (typeof brief.jobId !== 'string'
    || !/^[a-z0-9][a-z0-9-]{0,63}$/i.test(brief.jobId)
    || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(brief.jobId)) {
    errors.push('jobId 须为 1–64 位字母、数字或连字符，以字母或数字开头，不用 Windows 保留设备名。');
  }
  for (const field of ['product', 'audience', 'goal']) {
    if (!nonempty(brief[field])) errors.push(`简报缺少 ${field}。`);
  }
  if (!Array.isArray(brief.facts) || brief.facts.length === 0
    || brief.facts.some((fact) => !nonempty(fact?.claim) || !nonempty(fact?.source))) {
    errors.push('facts 至少含一条资料，每条都要有 claim 和 source。');
  }
  if (brief.demo !== undefined && typeof brief.demo !== 'boolean') {
    errors.push('demo 只能是 true 或 false。');
  }

  const [heading, separator, ...lines] = markdown.split(/\r?\n/);
  const title = heading.startsWith('# ') ? heading.slice(2).trim() : '';
  const body = lines.join('\n').trim();
  const titleLength = Array.from(title).length;
  const bodyLength = Array.from(body).length;
  if (titleLength < 1 || titleLength > 200) errors.push('首行须为 # 标题，标题 1–200 字符。');
  if (separator === undefined || separator.trim() !== '' || bodyLength < 1 || bodyLength > 20000) {
    errors.push('标题后空一行，正文须为 1–20,000 字符。');
  }

  const imageCount = (body.match(/!\[/g) || []).length;
  const assets = (body.match(/!\[[^\]\r\n]+\]\(asset:[A-Za-z0-9_-]{1,120}\)/g) || []).length;
  if (imageCount > 5 || assets !== imageCount) {
    errors.push('最多 5 张图，图片格式为 ![替代文字](asset:资产ID)。');
  }
  if (/<\s*\/?\s*[a-zA-Z][^>]*>/.test(body)) {
    errors.push('正文含 HTML 标签或尖括号自动链接，请使用标准 Markdown 文本链接。');
  }
  return { errors, titleLength, bodyLength, imageCount, demo: brief.demo === true };
}

const [briefPath, articlePath, ...extra] = process.argv.slice(2);
if (!briefPath || !articlePath || extra.length) {
  console.error('用法：node check-draft.mjs <brief.json> <article.md>');
  process.exitCode = 2;
} else {
  try {
    const report = checkDraft(JSON.parse(readText(briefPath)), readText(articlePath));
    if (report.errors.length) {
      for (const error of report.errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`格式粗检通过：标题 ${report.titleLength} 字符，正文 ${report.bodyLength} 字符，图片引用 ${report.imageCount} 张。`);
      if (report.demo) console.log('这是虚构样例，只限本地演练。');
      console.log('仍需核对事实、授权和平台要求；本检查未调用外部服务。');
    }
  } catch (error) {
    console.error(error instanceof SyntaxError ? '简报不是有效的 JSON。' : '读取简报或文稿失败，请检查本地路径及权限。');
    process.exitCode = 1;
  }
}
