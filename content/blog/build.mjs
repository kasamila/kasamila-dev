import {languages} from './catalog.mjs';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import assert from 'node:assert/strict';
const root = dirname(fileURLToPath(import.meta.url));
const slugs = ['elevenlabs-kasamila-video-call-customer-service', 'obs-kasamila-streamlabs-avatar-livestream'];
const repo = 'https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations';
const documents = [];
assert.equal(Object.keys(languages).length, 15);
for (const [locale, t] of Object.entries(languages)) for (let i = 0; i < 2; i++) {
  assert.equal(t.steps[i].length, 5); assert.ok(t.titles[i] && t.summaries[i] && t.notes[i]);
  const slug = slugs[i], url = `https://www.kasamila.com/portal/blog/${slug}?lang=${locale}`;
  const markdown = `https://www.kasamila.com/portal/content/blog/${slug}.md?lang=${locale}`;
  const guide = repo + (i === 0 ? '/voice-platforms/README.en.md' : '/obs-streamlabs/README.en.md');
  const body = `# ${t.titles[i]}\n\n${t.summaries[i]}\n\n## ${t.labels[0]}\n\n` +
    t.steps[i].map((s, n) => `${n + 1}. ${s}`).join('\n\n') +
    '\n\n```bash\ncd examples/realtime-integrations\nnpm ci\ncp .env.example .env\n# Backend-only configuration: see linked guide\nnpm start\n```\n\n' +
    `## ${t.labels[1]}\n\n${t.notes[i]}\n\n## ${t.labels[2]}\n\n` +
    `- [kasamila-dev / SDK 2.1.0](${repo})\n- [${t.labels[2]}](${guide})\n` +
    (i === 0 ? '- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)\n' :
      '- [OBS Browser](https://github.com/obsproject/obs-browser)\n- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)\n') +
    `\n## ${t.labels[3]}\n\n- [Markdown](${markdown})\n- [HTML](${url})\n- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/${slug}?locale=${locale})\n\n` +
    Object.keys(languages).map(lang => `[${lang}](https://www.kasamila.com/portal/blog/${slug}?lang=${lang})`).join(' | ') + '\n';
  const source = `---\ntitle: ${JSON.stringify(t.titles[i])}\nsummary: ${JSON.stringify(t.summaries[i])}\nlang: ${locale}\nslug: ${slug}\n---\n\n${body}`;
  const path = resolve(root, slug, locale + '.md');
  if (process.argv.includes('--check')) assert.equal(await readFile(path, 'utf8'), source, 'Editorial source differs: ' + path);
  else {await mkdir(dirname(path), {recursive: true}); await writeFile(path, source);}
  documents.push({kind: 'blog', slug, locale, title: t.titles[i], summary: t.summaries[i], body_markdown: body, expected_revision: 0});
}
const bundleIndex = process.argv.indexOf('--bundle');
if (bundleIndex >= 0) await writeFile(resolve(process.argv[bundleIndex + 1]), JSON.stringify(documents, null, 2));
console.log(`Verified ${documents.length} articles in 15 actual locales. No CMS changes or network calls.`);
