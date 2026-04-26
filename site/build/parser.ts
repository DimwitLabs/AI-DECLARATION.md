import { marked, Tokens } from 'marked';

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_[\]()]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\wÀ-￿-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderInline(text: string): string {
  return marked.parseInline(text) as string;
}

function parseLevelItem(text: string): { level: string; desc: string } | null {
  const match = text.match(/^`(none|hint|assist|pair|copilot|auto)`[:\s]+(.+)/is);
  return match ? { level: match[1].toLowerCase(), desc: match[2].trim() } : null;
}

function parseProcessItem(text: string): { process: string; desc: string } | null {
  const match = text.match(/^`(design|implementation|testing|documentation|review|deployment)`[:\s]+(.+)/is);
  return match ? { process: match[1].toLowerCase(), desc: match[2].trim() } : null;
}

function parseBadgeItem(raw: string): { src: string; alt: string; copyText: string } | null {
  const linked = raw.match(/\[!\[([^\]]+)\]\(([^)]+)\)\]\(([^)]+)\)/);
  if (linked) {
    return { alt: linked[1], src: linked[2], copyText: `[![${linked[1]}](${linked[2]})](${linked[3]})` };
  }
  const img = raw.match(/!\[([^\]]+)\]\(([^)]+)\)/);
  if (img) {
    return { alt: img[1], src: img[2], copyText: `![${img[1]}](${img[2]})` };
  }
  return null;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildHeroNav(sections: Array<{ id: string; label: string }>): string {
  const lines: string[] = [];
  sections.forEach(({ id, label }, idx) => {
    if (idx > 0) lines.push('      <span class="hero-nav-sep">·</span>');
    lines.push(`      <a href="#${id}">${label}</a>`);
    if (idx === 2 && sections.length > 3) {
      lines.push('      <span class="hero-nav-break"></span>');
    }
  });
  return lines.join('\n');
}

export function parseMarkdown(markdown: string): string {
  const content = markdown.replace(/^---[\s\S]*?---\n?/, '');
  const tokens = marked.lexer(content);

  const parts: string[] = [];
  const sections: Array<{ id: string; label: string }> = [];
  let title = '';
  let sectionParts: string[] = [];
  let currentSectionId = '';
  let inFaq = false;
  let inExamples = false;
  let inBadges = false;
  let lastH4Lower = '';
  let inExampleGroup = false;
  let faqItems: Array<{ question: string; answer: string }> = [];
  let pendingFaqQuestion = '';
  let skipBadge = false;

  function flushFaq() {
    if (!faqItems.length) return;
    sectionParts.push('    <div class="faq-list">');
    for (const { question, answer } of faqItems) {
      sectionParts.push('      <details open>');
      sectionParts.push(`        <summary>${question}</summary>`);
      sectionParts.push(`        <div class="faq-answer">${answer}</div>`);
      sectionParts.push('      </details>');
    }
    sectionParts.push('    </div>');
    faqItems = [];
  }

  function flushSection() {
    if (!currentSectionId) return;
    if (inFaq) flushFaq();
    if (inExampleGroup) {
      sectionParts.push('    </div>');
      inExampleGroup = false;
    }
    parts.push(`  <section class="doc-section" id="${currentSectionId}">`);
    parts.push(...sectionParts);
    parts.push('  </section>');
    parts.push('');
    sectionParts = [];
  }

  function startSection(id: string, label: string) {
    flushSection();
    currentSectionId = id;
    inFaq = id === 'faq';
    inExamples = id === 'examples';
    inBadges = id === 'badges';
    lastH4Lower = '';
    pendingFaqQuestion = '';
    sections.push({ id, label });
    sectionParts.push(`    <h2>${label}</h2>`);
  }

  for (const token of tokens) {
    if (token.type === 'space') continue;

    if (token.type === 'heading') {
      const t = token as Tokens.Heading;

      if (t.depth === 1) {
        title = t.text.replace(/\[.*$/, '').trim();
        skipBadge = true;
        continue;
      }

      skipBadge = false;

      if (t.depth === 3 && inFaq) {
        pendingFaqQuestion = t.text;
        continue;
      }

      if (t.depth === 2 || t.depth === 3) {
        startSection(slug(t.text), t.text);
        continue;
      }

      if (t.depth === 4) {
        lastH4Lower = t.text.toLowerCase();
        if (inExamples) {
          if (inExampleGroup) sectionParts.push('    </div>');
          sectionParts.push('    <div class="example-group">');
          sectionParts.push(`      <p class="example-hed">${renderInline(t.text)}</p>`);
          inExampleGroup = true;
        } else {
          sectionParts.push(`      <p class="example-hed">${renderInline(t.text)}</p>`);
        }
        continue;
      }
    }

    if (skipBadge) {
      skipBadge = false;
      if (token.type === 'paragraph') {
        const raw = (token as Tokens.Paragraph).raw.trim();
        if (raw.startsWith('[![') || raw.startsWith('![')) continue;
      }
    }

    if (token.type === 'paragraph') {
      const t = token as Tokens.Paragraph;
      if (inFaq && pendingFaqQuestion) {
        faqItems.push({ question: pendingFaqQuestion, answer: renderInline(t.text) });
        pendingFaqQuestion = '';
        continue;
      }
      sectionParts.push(`    <p>${renderInline(t.text)}</p>`);
      continue;
    }

    if (token.type === 'blockquote') {
      const inner = (token as Tokens.Blockquote).tokens
        .filter((t) => t.type === 'paragraph')
        .map((t) => renderInline((t as Tokens.Paragraph).text))
        .join(' ');
      sectionParts.push(`    <blockquote>${inner}</blockquote>`);
      continue;
    }

    if (token.type === 'code') {
      const t = token as Tokens.Code;
      sectionParts.push(`    <pre>${escapeHtml(t.text)}</pre>`);
      continue;
    }

    if (token.type === 'list') {
      const t = token as Tokens.List;

      if (inBadges) {
        sectionParts.push('    <ul class="badge-list">');
        for (const item of t.items) {
          const badge = parseBadgeItem(item.raw.trim().replace(/^[-*+]\s+/, ''));
          if (badge) {
            sectionParts.push('      <li>');
            sectionParts.push(`        <img src="${badge.src}" alt="${badge.alt}">`);
            sectionParts.push(`        <button class="copy-btn" data-copy="${escapeAttr(badge.copyText)}">Copy</button>`);
            sectionParts.push('      </li>');
          }
        }
        sectionParts.push('    </ul>');
        continue;
      }

      const firstText = t.items[0]?.text ?? '';
      const isLevelList = parseLevelItem(firstText) !== null
        || lastH4Lower.includes('level')
        || lastH4Lower.includes('단계');
      const isProcessList = parseProcessItem(firstText) !== null
        || lastH4Lower.includes('process')
        || lastH4Lower.includes('과정');

      if (isLevelList) {
        sectionParts.push('    <ul class="level-list">');
        for (const item of t.items) {
          const parsed = parseLevelItem(item.text);
          if (parsed) {
            sectionParts.push(`      <li><span class="ltag ltag-${parsed.level}">${parsed.level}</span><span class="level-desc">${renderInline(parsed.desc)}</span></li>`);
          }
        }
        sectionParts.push('    </ul>');
        continue;
      }

      if (isProcessList) {
        sectionParts.push('    <ul class="proc-list">');
        for (const item of t.items) {
          const parsed = parseProcessItem(item.text);
          if (parsed) {
            sectionParts.push(`      <li><span class="ptag">${parsed.process}</span><span class="proc-desc">${renderInline(parsed.desc)}</span></li>`);
          }
        }
        sectionParts.push('    </ul>');
        continue;
      }

      sectionParts.push('    <ul>');
      for (const item of t.items) {
        sectionParts.push(`      <li>${renderInline(item.text)}</li>`);
      }
      sectionParts.push('    </ul>');
      continue;
    }
  }

  flushSection();

  const hero = `  <section id="hero">
    <div class="hero-title"><span class="hero-hex">䷼</span><h1>${title}</h1></div>
    <div class="hero-nav">
${buildHeroNav(sections)}
    </div>
  </section>`;

  return [hero, '', ...parts].join('\n');
}
