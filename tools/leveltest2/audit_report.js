/* Аудит вёрстки отчёта: вставляется в консоль result.html. Нужны тестовые записи AUD* в level_test_reports (после аудита удалить).
   Возвращает список элементов, вылезающих за плашки, для всех вариантов отчёта (5 архетипов, A1, C1, короткие) в открытом и полном виде. */
window.__auditReports = async function(){
  var K = 'sb_publishable_jlcvNafksQ0WhrYCY08anw_ju194-I9', U = 'https://uuwtarchkltdmaddndgm.supabase.co';
  var qb = await (await fetch('/assets/yk-test/questions.json')).json(); var qmap = {}; qb.questions.forEach(function(q){ qmap[q.id] = q; });
  var codes = ['AUDlv0000001', 'AUDrg0000001', 'AUDrv0000001', 'AUDlg0000001', 'AUDu00000001', 'AUDc1000001', 'AUDbal000001', 'AUDexp000001'];
  var found = {};
  for (var ci = 0; ci < codes.length; ci++){
    var c = codes[ci];
    var rep = await (await fetch(U + '/rest/v1/rpc/get_public_level_report', { method: 'POST', headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_code: c }) })).json();
    for (var fi = 0; fi < 2; fi++){
      var full = fi === 1;
      if (full && rep.format !== 'deep') continue;
      if (full){ rep.answers = {}; qb.questions.slice(0, 30).forEach(function(q, j){ rep.answers[q.id] = { a: j % 2 ? (q.answer + 1) % q.options.length : -1, t: 5 }; }); }
      var w = document.getElementById('w'); w.innerHTML = '<div id="h"></div>';
      window.YKTReport.render(document.getElementById('h'), rep, { full: full, qmap: qmap });
      document.querySelectorAll('[data-t]').forEach(function(t){ t.classList.add('open'); });
      await new Promise(function(r){ setTimeout(r, 120); });
      window.__audit(c + (full ? '-full' : '')).forEach(function(x){ found[x] = 1; });
    }
  }
  return Object.keys(found);
};
