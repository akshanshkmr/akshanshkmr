/**
 * Resume Markdown Parser & Multi-Template Renderer
 *
 * Parses resume.md (frontmatter + sections) and renders
 * into #resume using one of: classic, sidebar, bold.
 *
 * Usage:
 *   ResumeParser.load('resume.md');
 *   ResumeParser.renderFromString(mdString);
 *   ResumeParser.setTemplate('sidebar');
 *   ResumeParser.setImageOverride(dataUrl);  // from file upload
 */

const ResumeParser = (() => {

    let currentTemplate = 'classic';
    let parsedMeta = {};
    let parsedSections = [];
    let imageOverride = null;   // data URL from toolbar upload
  
    // ── Helpers ──────────────────────────────────
  
    function parseFrontmatter(md) {
      const m = md.match(/^---\n([\s\S]*?)\n---/);
      if (!m) return [{}, md];
      const meta = {};
      m[1].split('\n').forEach(l => {
        const i = l.indexOf(':');
        if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
      });
      return [meta, md.slice(m[0].length).trim()];
    }
  
    function parseSections(body) {
      const out = []; let cur = null;
      body.split('\n').forEach(l => {
        if (/^# /.test(l)) {
          cur = { title: l.slice(2), lines: [] };
          out.push(cur);
        } else if (cur) {
          cur.lines.push(l);
        }
      });
      return out.map(s => ({ ...s, content: s.lines.join('\n').trim() }));
    }
  
    function parseTableRows(text) {
      return text.split('\n')
        .filter(l => l.startsWith('|'))
        .map(l => {
          const cols = l.split('|').map(c => c.trim()).filter(Boolean);
          return cols.length >= 2 ? cols : null;
        })
        .filter(Boolean);
    }
  
    function parseExperience(text) {
      const jobs = []; let job = null, proj = null;
      text.split('\n').forEach(l => {
        if (/^## /.test(l)) {
          const p = l.slice(3).split('|').map(s => s.trim());
          job = { role: p[0], company: p[1] || '', date: p[2] || '', projects: [] };
          jobs.push(job); proj = null;
        } else if (/^### /.test(l) && job) {
          proj = { title: l.slice(4), desc: [] };
          job.projects.push(proj);
        } else if (proj && l.trim()) {
          proj.desc.push(l.trim());
        }
      });
      jobs.forEach(j => j.projects.forEach(p => { p.desc = p.desc.join(' '); }));
      return jobs;
    }
  
    function parseListItems(text) {
      return text.split('\n')
        .filter(l => l.startsWith('- '))
        .map(l => {
          const p = l.slice(2).split('|').map(s => s.trim());
          return { text: p[0], year: p[1] || '' };
        });
    }
  
    function boldify(str) {
      return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
  
    function getInitials(name) {
      return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }
  
    // ── Avatar ───────────────────────────────────
  
    function getImageSrc(meta) {
      return imageOverride || meta.image || null;
    }
  
    function avatarHTML(meta, sizeClass) {
      const src = getImageSrc(meta);
      if (src) {
        return `<img class="avatar ${sizeClass || ''}" src="${src}" alt="Photo">`;
      }
      const ini = getInitials(meta.name);
      if (ini) {
        return `<div class="avatar-placeholder ${sizeClass || ''}">${ini}</div>`;
      }
      return '';
    }
  
    function hasAvatar(meta) {
      return !!(getImageSrc(meta) || getInitials(meta.name));
    }
  
    // ── Shared Renderers ─────────────────────────
  
    function renderContact(meta) {
      let h = '';
      ['email', 'phone', 'location'].forEach(k => {
        if (meta[k]) h += `<span>${meta[k]}</span>`;
      });
      ['linkedin', 'github', 'website', 'portfolio'].forEach(k => {
        if (meta[k]) h += `<a href="https://${meta[k]}">${meta[k]}</a>`;
      });
      return h;
    }
  
    function renderSkills(c) {
      const r = parseTableRows(c);
      let h = '<div class="skills-grid">';
      r.forEach(r => { h += `<div class="label">${r[0]}</div><div class="value">${r[1]}</div>`; });
      return h + '</div>';
    }
  
    function renderExp(c) {
      const jobs = parseExperience(c); let h = '';
      jobs.forEach(j => {
        h += `<div class="job-header"><span class="role">${j.role}</span><span class="date">${j.date}</span></div>`;
        h += `<div class="company">${j.company}</div>`;
        j.projects.forEach(p => {
          h += `<div class="proj"><div class="proj-title">${p.title}</div><div class="proj-desc">${boldify(p.desc)}</div></div>`;
        });
      });
      return h;
    }
  
    function renderEdu(c) {
      const r = parseTableRows(c);
      let h = '<table class="edu-table"><thead><tr><th>Degree</th><th>Institution</th><th>Year</th><th>Notes</th></tr></thead><tbody>';
      r.forEach(r => {
        h += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="note">${r[3] || ''}</td></tr>`;
      });
      return h + '</tbody></table>';
    }
  
    function renderAch(c) {
      const items = parseListItems(c);
      let h = '<div class="ach-grid">';
      items.forEach(a => {
        h += `<div class="ach-item">${boldify(a.text)} <span class="ach-year">${a.year}</span></div>`;
      });
      return h + '</div>';
    }
  
    function renderGeneric(c) {
      const li = parseListItems(c), tr = parseTableRows(c);
      if (li.length) {
        let h = '<div class="generic-list">';
        li.forEach(i => {
          h += `<div class="g-item">${boldify(i.text)}${i.year ? ` <span class="g-year">${i.year}</span>` : ''}</div>`;
        });
        return h + '</div>';
      }
      if (tr.length) {
        let h = '<div class="skills-grid">';
        tr.forEach(r => {
          h += `<div class="label">${r[0]}</div><div class="value">${r.slice(1).join(' · ')}</div>`;
        });
        return h + '</div>';
      }
      return `<div class="generic-para">${boldify(c)}</div>`;
    }
  
    const ST = t => `<div class="section-title">${t}</div>`;
  
    function renderSections(sections, exclude) {
      const skip = (exclude || []).map(s => s.toLowerCase());
      let h = '';
      sections.forEach(sec => {
        const k = sec.title.toLowerCase();
        if (skip.includes(k)) return;
  
        if (k === 'summary')      h += `<div class="section">${ST('Summary')}<div class="summary">${boldify(sec.content)}</div></div>`;
        else if (k === 'skills')  h += `<div class="section">${ST('Technical Skills')}${renderSkills(sec.content)}</div>`;
        else if (k === 'experience') h += `<div class="section">${ST('Experience')}${renderExp(sec.content)}</div>`;
        else if (k === 'education')  h += `<div class="section">${ST('Education')}${renderEdu(sec.content)}</div>`;
        else if (k === 'achievements') h += `<div class="section">${ST('Achievements')}${renderAch(sec.content)}</div>`;
        else h += `<div class="section">${ST(sec.title)}${renderGeneric(sec.content)}</div>`;
      });
      return h;
    }
  
    // ── Template: Classic ────────────────────────
  
    function renderClassic(meta, sections) {
      const img = hasAvatar(meta);
      let h = `<div class="header ${img ? '' : 'no-img'}">`;
      if (img) h += avatarHTML(meta, '');
      h += `<div class="header-text"><h1>${meta.name || ''}</h1>`;
      if (meta.title) h += `<div class="htitle">${meta.title}</div>`;
      h += `<div class="contact">${renderContact(meta)}</div></div></div>`;
      h += renderSections(sections);
      return h;
    }
  
    // ── Template: Sidebar ────────────────────────
  
    function renderSidebar(meta, sections) {
      const skillsSec = sections.find(s => s.title.toLowerCase() === 'skills');
      const eduSec = sections.find(s => s.title.toLowerCase() === 'education');
  
      let sb = '<div class="sidebar">';
      sb += `<div class="sb-avatar">${avatarHTML(meta, 'avatar-lg')}</div>`;
      sb += `<h1>${meta.name || ''}</h1>`;
      if (meta.title) sb += `<div class="htitle">${meta.title}</div>`;
  
      sb += '<div class="sb-section"><div class="sb-title">Contact</div>';
      ['email', 'phone', 'location'].forEach(k => {
        if (meta[k]) sb += `<div class="sb-item">${meta[k]}</div>`;
      });
      ['linkedin', 'github'].forEach(k => {
        if (meta[k]) sb += `<div class="sb-item"><a href="https://${meta[k]}">${meta[k].replace(/.*\//, '')}</a></div>`;
      });
      sb += '</div>';
  
      if (skillsSec) {
        sb += '<div class="sb-section"><div class="sb-title">Skills</div>';
        parseTableRows(skillsSec.content).forEach(r => {
          sb += `<div class="sb-item"><div class="sb-item-label">${r[0]}</div><div class="sb-item-value">${r[1]}</div></div>`;
        });
        sb += '</div>';
      }
  
      if (eduSec) {
        sb += '<div class="sb-section"><div class="sb-title">Education</div>';
        parseTableRows(eduSec.content).forEach(r => {
          sb += `<div class="sb-item"><div class="sb-item-label">${r[0]}</div><div class="sb-item-value">${r[1]} · ${r[2]}</div></div>`;
        });
        sb += '</div>';
      }
      sb += '</div>';
  
      let main = `<div class="main">${renderSections(sections, ['skills', 'education'])}</div>`;
      return sb + main;
    }
  
    // ── Template: Bold ───────────────────────────
  
    function renderBold(meta, sections) {
      const img = hasAvatar(meta);
      let h = `<div class="bold-header ${img ? '' : 'no-img'}">`;
      if (img) h += avatarHTML(meta, 'avatar-lg');
      h += `<div><h1>${meta.name || ''}</h1>`;
      if (meta.title) h += `<div class="htitle">${meta.title}</div>`;
      h += `<div class="contact">${renderContact(meta)}</div></div></div>`;
      h += `<div class="bold-body">${renderSections(sections)}</div>`;
      return h;
    }
  
    // ── Render Dispatch ──────────────────────────
  
    const renderers = { classic: renderClassic, sidebar: renderSidebar, bold: renderBold };
  
    function renderToDOM() {
      const wrapper = document.getElementById('wrapper');
      const el = document.getElementById('resume');
      if (!wrapper || !el) return;
  
      wrapper.className = `t-${currentTemplate}`;
      const fn = renderers[currentTemplate] || renderClassic;
      el.innerHTML = fn(parsedMeta, parsedSections);
    }
  
    function parse(md) {
      const [meta, body] = parseFrontmatter(md);
      parsedMeta = meta;
      parsedSections = parseSections(body);
      renderToDOM();
    }
  
    // ── Public API ───────────────────────────────
  
    function load(path) {
      fetch(path)
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(parse)
        .catch(() => {
          document.getElementById('resume').innerHTML =
            `<div class="status">
              <p><strong>Could not load ${path}</strong></p>
              <p style="margin-top:8px;font-size:12px;color:var(--light);">
                Make sure the file is in the same directory as index.html
              </p>
            </div>`;
        });
    }
  
    function setTemplate(tpl) {
      if (renderers[tpl]) { currentTemplate = tpl; renderToDOM(); }
    }
  
    function setImageOverride(dataUrl) {
      imageOverride = dataUrl;
      renderToDOM();
    }
  
    return {
      load,
      renderFromString: parse,
      setTemplate,
      setImageOverride,
      getTemplate: () => currentTemplate,
    };
  
  })();