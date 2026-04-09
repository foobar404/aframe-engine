import chokidar from 'chokidar';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';

const generateId = () => `el-${randomBytes(3).toString('hex')}`;

const SKIP_TAGS = new Set(['html', 'head', 'body', 'meta', 'link', 'title', 'script', 'style']);

function processHtml(content) {
  return content.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)(\s(?:[^>"']|"[^"]*"|'[^']*')*)?(\/?)?>/g,
    (match, tag, attrs = '', selfClose = '') => {
      if (SKIP_TAGS.has(tag.toLowerCase())) return match;
      if (/\bid\s*=/i.test(attrs)) return match;
      return `<${tag}${attrs} id="${generateId()}"${selfClose}>`;
    }
  );
}

const recentlyWritten = new Set();

function handleFile(filePath) {
  const absPath = resolve(filePath);
  if (recentlyWritten.has(absPath)) {
    recentlyWritten.delete(absPath);
    return;
  }
  try {
    const original = readFileSync(absPath, 'utf8');
    const updated = processHtml(original);
    if (updated !== original) {
      recentlyWritten.add(absPath);
      writeFileSync(absPath, updated, 'utf8');
      console.log(`[id-gen] Updated: ${absPath}`);
    }
  } catch (err) {
    console.error(`[id-gen] Error: ${absPath}:`, err.message);
  }
}

function findHtmlFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findHtmlFiles(full, results);
    else if (entry.endsWith('.html')) results.push(full);
  }
  return results;
}

// Initial scrape
const initial = findHtmlFiles('.');
console.log(`[id-gen] Scanning ${initial.length} HTML file(s)...`);
for (const f of initial) handleFile(f);
console.log('[id-gen] Initial scan complete. Watching for changes...');

// Watch for subsequent changes
const watcher = chokidar.watch('**/*.html', {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true,
  usePolling: true,
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
});

watcher.on('change', handleFile);
