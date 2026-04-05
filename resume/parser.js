/**
 * Resume Markdown Parser & Renderer
 *
 * Parses a resume.md with frontmatter + sections and renders
 * it into the #resume container. Any section not in the known
 * list is rendered generically (list, table, or paragraph).
 *
 * Usage:
 *   ResumeParser.load('resume.md');           // fetch & render
 *   ResumeParser.renderFromString(mdString);  // render directly
 */

const ResumeParser = (() => {

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
          jobs.push(job);
          proj = null;
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
  
    // ── Renderer ─────────────────────────────────
  
    function render(md) {
      const [meta, body] = parseFrontmatter(md);
      const sections = parseSections(body);
      let h = '';
  
      // Header
      h += `<div class="header"><h1>${meta.name || 'Your Name'}</h1>`;
      if (meta.title) h += `<div class="htitle">${meta.title}</div>`;
      h += `<div class="contact">`;
      ['email', 'phone', 'location'].forEach(k => {
        if (meta[k]) h += `<span>${meta[k]}</span>`;
      });
      ['linkedin', 'github', 'website', 'portfolio'].forEach(k => {
        if (meta[k]) h += `<a href="https://${meta[k]}">${meta[k]}</a>`;
      });
      h += `</div></div>`;
  
      // Sections — render in order of appearance
      sections.forEach(sec => {
        const key = sec.title.toLowerCase();
  
        if (key === 'summary') {
          h += `<div class="section">
            <div class="section-title">Summary</div>
            <div class="summary">${boldify(sec.content)}</div>
          </div>`;
        }
        else if (key === 'skills') {
          const rows = parseTableRows(sec.content);
          h += `<div class="section"><div class="section-title">Technical Skills</div>
            <div class="skills-grid">`;
          rows.forEach(r => {
            h += `<div class="label">${r[0]}</div><div class="value">${r[1]}</div>`;
          });
          h += `</div></div>`;
        }
        else if (key === 'experience') {
          const jobs = parseExperience(sec.content);
          h += `<div class="section"><div class="section-title">Experience</div>`;
          jobs.forEach(j => {
            h += `<div class="job-header">
              <span class="role">${j.role}</span>
              <span class="date">${j.date}</span>
            </div>`;
            h += `<div class="company">${j.company}</div>`;
            j.projects.forEach(p => {
              h += `<div class="proj">
                <div class="proj-title">${p.title}</div>
                <div class="proj-desc">${boldify(p.desc)}</div>
              </div>`;
            });
          });
          h += `</div>`;
        }
        else if (key === 'education') {
          const rows = parseTableRows(sec.content);
          h += `<div class="section"><div class="section-title">Education</div>
            <table class="edu-table"><thead><tr>
              <th>Degree</th><th>Institution</th><th>Year</th><th>Notes</th>
            </tr></thead><tbody>`;
          rows.forEach(r => {
            h += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
              <td class="note">${r[3] || ''}</td></tr>`;
          });
          h += `</tbody></table></div>`;
        }
        else if (key === 'achievements') {
          const items = parseListItems(sec.content);
          h += `<div class="section"><div class="section-title">Achievements</div>
            <div class="ach-grid">`;
          items.forEach(a => {
            h += `<div class="ach-item">${boldify(a.text)}
              <span class="ach-year">${a.year}</span></div>`;
          });
          h += `</div></div>`;
        }
        else {
          // Generic section — auto-detect format
          h += `<div class="section"><div class="section-title">${sec.title}</div>`;
          const li = parseListItems(sec.content);
          const tr = parseTableRows(sec.content);
  
          if (li.length > 0) {
            h += `<div class="generic-list">`;
            li.forEach(i => {
              h += `<div class="g-item">${boldify(i.text)}`;
              if (i.year) h += ` <span class="g-year">${i.year}</span>`;
              h += `</div>`;
            });
            h += `</div>`;
          } else if (tr.length > 0) {
            h += `<div class="skills-grid">`;
            tr.forEach(r => {
              h += `<div class="label">${r[0]}</div>
                <div class="value">${r.slice(1).join(' · ')}</div>`;
            });
            h += `</div>`;
          } else {
            h += `<div class="generic-para">${boldify(sec.content)}</div>`;
          }
          h += `</div>`;
        }
      });
  
      document.getElementById('resume').innerHTML = h;
    }
  
    // ── Public API ───────────────────────────────
  
    function load(path) {
      fetch(path)
        .then(r => {
          if (!r.ok) throw new Error(`Could not load ${path}`);
          return r.text();
        })
        .then(render)
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
  
    return {
      load,
      renderFromString: render,
    };
  
  })();