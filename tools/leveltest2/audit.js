/* Аудит вёрстки теста: вставляется в консоль страницы level-test.html (инструмент проверки, на сайте не подключается).
   window.__run(mode) проходит тест целиком кликами и собирает элементы, которые вылезают за свои плашки.
   mode: 'good' (отвечает верно, сложные задания), 'bad' (неверно, простые) или 'skip' (пропускает всё, проверка пропущенных). */
window.__audit = function(tag){
  var out = [], root = document.querySelector('.pg'); if (!root) return out;
  var de = document.documentElement;
  if (de.scrollWidth > innerWidth + 1) out.push(tag + ': PAGE ' + de.scrollWidth + '>' + innerWidth);
  var hosts = '.gcard,.card,.opt,.btn,.chip,.pill,.cd,.info,.row,.hs,.tag,.cell,.st2,.skr,.lk,.pl,.stmt,.paper,.player,.poster,.sres,.full-inv,.tgc,.ctad,.lockcta,.m,.nav,.tline,.ctas,.pbar,.perk,.rc,.sec,.warn,.idk,.fb,.hrow';
  root.querySelectorAll('*').forEach(function(e){
    if (e.closest('svg') || e.closest('.blob') || e.closest('.wave')) return;
    var cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    var cn = (e.className && e.className.baseVal !== undefined) ? e.className.baseVal : String(e.className);
    if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && cs.overflowX === 'visible')
      out.push(tag + ': TEXT .' + cn + ' "' + e.textContent.trim().slice(0, 28) + '" sw' + e.scrollWidth + '>cw' + e.clientWidth);
    var host = e.parentElement && e.parentElement.closest(hosts);
    if (host && host !== e){
      var hr = host.getBoundingClientRect();
      if (r.right > hr.right + 1.5 || r.left < hr.left - 1.5){
        if (cn.indexOf('blob') >= 0 || cn.indexOf('mtx') >= 0) return;
        out.push(tag + ': OUT .' + cn + '<' + e.tagName + '> in .' + String(host.className).split(' ').slice(0, 2).join('.') + ' ' + Math.round(r.left) + '-' + Math.round(r.right) + ' vs ' + Math.round(hr.left) + '-' + Math.round(hr.right));
      }
    }
  });
  return out;
};
window.__run = async function(mode){
  var slp = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var click = function(s){ var e = document.querySelector(s); if (e){ e.click(); return true; } return false; };
  var cls = function(){ return ((document.querySelector('.pg') || {}).className || '').replace('pg ', '').trim(); };
  var KEY = {};
  var qb = await (await fetch('assets/yk-test/questions.json')).json();
  qb.questions.forEach(function(q){ (KEY[q.prompt] = KEY[q.prompt] || []).push(q); });
  var found = {}, sigSeen = {}, screens = 0;
  function sig(){ var t = (document.querySelector('.qtext,.qq,.stmt .q,h2,.ch2') || {}).textContent || ''; return cls() + '|' + t.trim().slice(0, 40); }
  function check(){
    var s = sig(); if (sigSeen[s]) return; sigSeen[s] = 1; screens++;
    window.__audit(cls() + ' [' + s.split('|')[1].slice(0, 22) + ']').forEach(function(x){ found[x] = 1; });
  }
  function pick(){
    if (mode === 'skip') return;
    var o = [].slice.call(document.querySelectorAll('.opts .opt'));
    var text = ((document.querySelector('.qtext,.qq,.stmt .q') || {}).innerText || '').replace(/\s+/g, ' ').trim();
    var idx = Math.floor(Math.random() * o.length);
    if (mode === 'good'){
      for (var p in KEY){
        var pp = p.replace(/_{2,}/g, '').replace(/\s+/g, ' ').trim();
        if (pp && text.replace(/^«|»$/g, '').indexOf(pp.slice(0, 25)) >= 0){
          var q = KEY[p].filter(function(c){ return c.options.every(function(x){ return o.some(function(e){ return e.innerText.replace(/^[A-D]\s*/, '').trim().indexOf(x.slice(0, 10)) === 0; }); }); })[0] || KEY[p][0];
          var ans = q.options[q.answer];
          var hit = o.findIndex(function(e){ return e.innerText.replace(/^[A-D]\s*/, '').trim().indexOf(ans.slice(0, 10)) === 0; });
          if (hit >= 0) idx = hit;
          break;
        }
      }
    } else { idx = 0; }
    o[idx].click();
  }
  click('[data-act="start"]'); await slp(250);
  var g = 0;
  while (g++ < 700){
    var c = cls();
    check();
    if (c === 'v2') click('[data-act="block-go"]');
    else if (c === 'f3') click('[data-act="finish-go"]');
    else if (['q1', 'r3', 'l1'].indexOf(c) >= 0){ pick(); await slp(15); check(); click('[data-act="next"][data-main]'); }
    else if (c === 'c3'){ if (document.querySelector('[data-act="finish"]')) click('[data-act="finish"]'); else break; }
    else if (c === 's3') break;
    await slp(20);
    if (location.pathname.indexOf('result') >= 0) break;
  }
  return { screens: screens, offenders: Object.keys(found) };
};
