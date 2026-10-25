/* modules/fitness.js —— 健身计划 */
(function(){
'use strict';
var WK=['日','一','二','三','四','五','六'];
var LABELS={1:'周一',2:'周二',3:'周三',4:'周四',5:'周五',6:'周六',0:'周日'};
var WV={anchor:null,page:null,active:false}; // 周视图状态
function fmtDate(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dose(it){ return (it.sets?it.sets+'组 × ':'')+App.esc(it.reps||'')+(it.weight?' × '+App.esc(it.weight):'')+(it.rest?' · 休 '+App.esc(it.rest):''); }
function wvItems(day){
  var cats=['热身','主训','核心','体态','拉伸','有氧']; var h='';
  cats.forEach(function(c){
    var list=(day.items||[]).filter(function(it){return it.category===c;});
    if(!list.length) return;
    h+='<div class="sum-line" style="margin:8px 0 2px;font-weight:600">'+c+'</div>';
    h+=list.map(function(it){ return '<div class="rec-row"><span class="cat">'+App.esc(it.name)+'</span><span class="note">'+dose(it)+'</span>'+(it.note?'<span class="note" style="opacity:.7">'+App.esc(it.note)+'</span>':'')+'</div>'; }).join('');
  });
  return h;
}
function wvCheck(day, prog){
  var cats=['热身','主训','核心','体态','拉伸','有氧']; var h='';
  cats.forEach(function(c){
    var rows=prog.rows.filter(function(r){return r.item.category===c;});
    if(!rows.length) return;
    h+='<div class="sum-line" style="margin:8px 0 2px;font-weight:600">'+c+'</div>';
    h+=rows.map(function(r){
      var idx=day.items.indexOf(r.item);
      return '<label class="check-row"><input type="checkbox" '+(r.done?'checked':'')+' data-wv-check="'+idx+'" aria-label="'+App.esc(r.item.name)+'">'+
        '<span class="ck-name" style="'+(r.done?'text-decoration:line-through;opacity:.6':'')+'">'+App.esc(r.item.name)+'</span>'+
        '<span class="ck-dose">'+dose(r.item)+'</span></label>';
    }).join('');
  });
  return h;
}
function wvToggle(day, date, idx){
  var it=day.items[idx]; if(!it) return;
  var w=App.data.fitness.workouts||[]; var found=-1;
  for(var i=0;i<w.length;i++){ if(w[i].date===date && w[i].name===it.name && w[i].plan===day.focus){ found=i; break; } }
  if(found>=0){ w.splice(found,1); }
  else { w.push({id:'w'+Date.now()+Math.random().toString(36).slice(2,6), date:date, name:it.name, sets:it.sets, reps:it.reps, weight:it.weight, category:it.category, rest:it.rest, note:it.note, plan:day.focus, ts:Date.now()}); }
  App.data.fitness.workouts=w; App.setData(App.data);
}
function weekNav(delta){
  var cur=new Date(WV.page+'T00:00:00'); cur.setDate(cur.getDate()+delta);
  var next=fmtDate(cur);
  var mon=App.Logic.fitnessWeekDate(1, WV.anchor);
  var sun=App.Logic.fitnessWeekDate(0, WV.anchor);
  if(next<mon) next=sun; else if(next>sun) next=mon;
  WV.page=next; renderWeekView();
}
function wvDayContent(dt){
  var L=App.Logic;
  var day=L.fitnessDayFor(App.data.fitness.plan, dt);
  var dow=new Date(dt+'T00:00:00').getDay();
  var content='';
  if(day){
    content='<div class="wv-head">'+LABELS[dow]+' · '+App.esc(day.focus)+(day.tag?' · '+App.esc(day.tag):'')+'</div>';
    if(day.kind==='strength'){
      var prog=L.fitnessDayProgress(App.data.fitness.workouts, dt, day);
      content+='<div class="sum-line">完成 '+prog.done+'/'+prog.total+'</div>';
      if(dt<=L.todayStr()){ content+=wvCheck(day, prog); } else { content+=wvItems(day); }
    } else { content+=wvItems(day); }
  } else { content='<div class="placeholder">休息日 · 无安排</div>'; }
  return content;
}
function renderWeekView(){
  var L=App.Logic;
  var tabs=[1,2,3,4,5,6,0].map(function(dow){
    var dt=L.fitnessWeekDate(dow, WV.anchor);
    return '<button class="wv-tab'+(dt===WV.page?' on':'')+'" data-wv-date="'+dt+'">'+LABELS[dow]+'</button>';
  }).join('');
  var v=L.fitnessPlanVersion(App.data.fitness.plan, WV.page);
  var html='<div class="wv-nav">'+tabs+'</div><div class="wv-body" id="wvBody">'+wvDayContent(WV.page)+'</div><div class="wv-ctrl"><button class="mbtn ghost" id="wvPrev">↑ 上一天</button><button class="mbtn ghost" id="wvNext">下一天 ↓</button></div>';
  App.openModal(html, { title:'本周训练 · '+(v&&v.name?v.name:''), saveText:'完成', onSave:function(close){ WV.active=false; close(); } });
  bindWeekView();
}
function bindWeekView(){
  var box=document.getElementById('modal'); if(!box) return;
  box.querySelectorAll('[data-wv-date]').forEach(function(b){ b.addEventListener('click', function(){ WV.page=b.getAttribute('data-wv-date'); renderWeekView(); }); });
  var pv=box.querySelector('#wvPrev'); if(pv) pv.addEventListener('click', function(){ weekNav(-1); });
  var nx=box.querySelector('#wvNext'); if(nx) nx.addEventListener('click', function(){ weekNav(1); });
  box.querySelectorAll('[data-wv-check]').forEach(function(cb){ cb.addEventListener('change', function(){ var day=App.Logic.fitnessDayFor(App.data.fitness.plan, WV.page); if(day) wvToggle(day, WV.page, parseInt(cb.getAttribute('data-wv-check'),10)); renderWeekView(); }); });
  var body=box.querySelector('#wvBody'); if(!body) return;
  var startY=null;
  body.addEventListener('touchstart', function(e){ startY=e.touches[0].clientY; }, {passive:true});
  body.addEventListener('touchend', function(e){
    if(startY==null) return;
    var dy=e.changedTouches[0].clientY-startY;
    var atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 2;
    var atTop = body.scrollTop <= 2;
    if(atBottom && dy < -60){ weekNav(1); } else if(atTop && dy > 60){ weekNav(-1); }
    startY=null;
  }, {passive:true});
}
function showWeek(date){ WV.anchor=date||App.Logic.todayStr(); WV.page=WV.anchor; WV.active=true; renderWeekView(); }
document.addEventListener('keydown', function(e){
  if(!WV.active) return;
  var m=document.getElementById('modal'); if(!m || m.classList.contains('hidden')) return;
  if(e.key==='ArrowUp'){ e.preventDefault(); weekNav(-1); }
  else if(e.key==='ArrowDown'){ e.preventDefault(); weekNav(1); }
});

App.register('fitness', function(container){
  var sub='plan', filter='all';
  var q='';
  var selDate=null; // 锻炼日历选中的日期；null=今天
  var calY=0, calM=0; // 日历显示的年/月
  var editDraft=null; // 编辑计划时的草稿
  var WK=['日','一','二','三','四','五','六'];

  ensureLibrary();
  ensurePlan();
  var _td=App.Logic.todayStr(); calY=Number(_td.slice(0,4)); calM=Number(_td.slice(5,7));
  container.addEventListener('click', onPlanClick);
  container.addEventListener('keydown', onPlanKey);

  function render(){
    var html = '<div class="seg2 seg2-tabs"><button data-sub="plan" class="'+(sub==='plan'?'on':'')+'">计划</button><button data-sub="records" class="'+(sub==='records'?'on':'')+'">动作库</button><button data-sub="workouts" class="'+(sub==='workouts'?'on':'')+'">训练记录</button><button data-sub="weights" class="'+(sub==='weights'?'on':'')+'">体重</button></div><div id="fitBody">'+(sub==='records'?searchBox():'')+renderBody()+'</div>';
    container.innerHTML = html;
    container.querySelectorAll('[data-sub]').forEach(function(b){ b.addEventListener('click', function(){ sub=b.getAttribute('data-sub'); render(); }); });
    bind();
  }

  function searchBox(){ return '<div class="row" style="margin-bottom:8px"><input class="input search-input" placeholder="搜索动作（名称/要点/来源）" value="'+App.esc(q)+'"></div>'; }

  function bind(){
    var body=container.querySelector('#fitBody');
    if(sub==='plan'){ bindPlan(body); }
    var si=body.querySelector('.search-input'); if(si){ var composing=false; si.addEventListener('compositionstart', function(){ composing=true; }); si.addEventListener('compositionend', function(){ composing=false; setTimeout(applySearch,0); }); si.addEventListener('input', function(){ if(composing) return; applySearch(); }); function applySearch(){ q=si.value; var pos=si.selectionStart; render(); var nsi=container.querySelector('.search-input'); if(nsi){ nsi.focus(); nsi.setSelectionRange(pos,pos); } } }
    if(sub==='records'){
      var f=body.querySelector('#fitFilter'); if(f) f.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b)return; filter=b.getAttribute('data-f'); render(); });
      body.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ editRecord(b.getAttribute('data-edit')); }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ delRecord(b.getAttribute('data-del')); }); });
      var a=body.querySelector('#btnAdd'); if(a) a.addEventListener('click', function(){ editRecord(null); });
    }
    if(sub==='workouts'){
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-del'); App.deleteWithUndo({ apply:function(){ App.data.fitness.workouts=(App.data.fitness.workouts||[]).filter(function(x){return x.id!==id;}); }, render:render }); }); });
      var a=body.querySelector('#btnAddW'); if(a) a.addEventListener('click', addWorkout);
    }
    if(sub==='weights'){
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-del'); App.deleteWithUndo({ apply:function(){ App.data.fitness.weights=(App.data.fitness.weights||[]).filter(function(x){return x.id!==id;}); }, render:render }); }); });
      var a=body.querySelector('#btnAddBw'); if(a) a.addEventListener('click', addWeight);
    }
  }

  function onPlanClick(e){
    if(sub!=='plan') return;
    var t=e.target;
    if(t.closest && t.closest('[data-open-today]')){ showWeek(App.Logic.todayStr()); return; }
    var cell = t.closest ? t.closest('.cal-cell') : null;
    if(cell){
      selDate = cell.getAttribute('data-date') || null;
      render(); return;
    }
    var row = t.closest ? t.closest('.week-row') : null;
    if(row){
      var dow=parseInt(row.getAttribute('data-day-open'),10);
      var anchor=selDate||App.Logic.todayStr();
      showWeek(App.Logic.fitnessWeekDate(dow, anchor));
      return;
    }
    if(selDate){ selDate=null; render(); }
  }

  function onPlanKey(e){
    if(sub!=='plan') return;
    if(e.key!=='Enter' && e.key!==' ') return;
    var row=e.target.closest ? e.target.closest('.week-row') : null;
    var cell=e.target.closest ? e.target.closest('.cal-cell') : null;
    if(row && row===e.target){ e.preventDefault(); row.click(); }
    else if(cell && cell===e.target){ e.preventDefault(); cell.click(); }
  }

  function ensureLibrary(){
    var lib=App.Logic.EXERCISE_LIBRARY||[];
    var recs=App.data.fitness.records||[];
    var names={}; recs.forEach(function(r){ names[r.name]=1; });
    var added=0;
    lib.forEach(function(e){
      if(!names[e.name]){
        recs.push({id:'f'+Date.now()+Math.random().toString(36).slice(2,6), name:e.name, srcType:e.srcType, source:e.source, points:e.points, note:e.note, status:'pending', ts:Date.now()});
        names[e.name]=1; added++;
      }
    });
    if(added){ App.data.fitness.records=recs; App.setData(App.data); }
  }

  function ensurePlan(){
    if(!App.data.fitness.plan){
      App.data.fitness.plan = App.Logic.buildInitialPlan(App.Logic.todayStr());
      App.setData(App.data);
    }
  }

  function currentPlanName(){
    var v=App.Logic.fitnessPlanVersion(App.data.fitness.plan, App.Logic.todayStr());
    return v && v.name ? v.name : '冬训增肌储备期';
  }

  // ===== 计划 =====
  function renderPlan(){
    var L=App.Logic;
    var today=L.todayStr();
    var dow=new Date(today+'T00:00:00').getDay();
    var day=L.fitnessDayFor(App.data.fitness.plan, today);
    var plan=L.FITNESS_PLAN;
    var anchor=selDate||today;
    var html='';
    // 今日大卡（始终显示今天）
    html+='<div class="card today-hero" data-open-today style="border:1px solid var(--accent,#3b82f6)">';
    html+='<div class="td-dow">周'+WK[dow]+' · '+App.esc(day?day.label:'')+'</div>';
    html+='<div class="td-focus">'+App.esc(day?day.focus:'休息')+'</div>';
    if(day){ html+='<div class="td-tag">'+App.esc(day.tag||'')+'</div>'; }
    if(day && day.kind==='strength'){
      var prog=L.fitnessDayProgress(App.data.fitness.workouts, today, day);
      var pct=prog.total?Math.round(prog.done/prog.total*100):0;
      html+='<div class="prog-track" style="margin:12px 0 4px"><div class="prog-bar" style="width:'+pct+'%"></div></div>';
      html+='<div class="sum-line">已完成 '+prog.done+' / '+prog.total+'</div>';
      html+='<button class="mbtn primary" id="btnCompleteAll" style="margin-top:10px">✓ 全部完成</button>';
      html+='<div style="margin-top:10px">'+checkableList(day, prog)+'</div>';
    } else if(day){
      html+='<div class="sum-line">'+(day.kind==='cardio'?'下班羽毛球，有氧/灵敏，不算力量日':'可选体能日，可练可不练，休息充分优先')+'</div>';
      if(day.items && day.items.length){ html+='<div style="margin-top:10px">'+dayItemsHtml(day)+'</div>'; }
    }
    html+='</div>';
    // 左右：本周安排 + 锻炼日历
    html+='<div class="plan-split">';
    html+='<div class="card"><h2>📅 本周安排 <span class="plan-name">'+App.esc(currentPlanName())+'</span>'+(selDate?' <span class="sum-line" style="font-size:12px;font-weight:400">（'+App.esc(selDate)+' 所在周）</span>':'')+' <button class="go" id="btnEditPlan" style="margin-left:auto">编辑计划</button></h2>'+weekRows(today, anchor)+'</div>';
    html+='<div class="card"><h2>🗓 锻炼日历 <span class="plan-name">'+App.esc(currentPlanName())+'</span></h2>'+calendarHtml(today)+'</div>';
    html+='</div>';
    html+='<div class="card tips-card"><h2>🗓 当前阶段</h2><div class="sum-line">'+App.esc(plan.stage)+'</div><div class="sum-line">'+App.esc(plan.cycle)+'</div><p class="pre">'+App.esc(plan.goal)+'</p></div>';
    html+=historyCard();
    html+=tipsCard('🍚 营养', plan.tips.nutrition);
    html+=tipsCard('😴 恢复', plan.tips.recovery);
    html+=tipsCard('📈 进阶规则', plan.tips.progress);
    html+=tipsCard('✅ 四周验收', plan.tips.accept);
    return html;
  }

  function historyCard(){
    var p=App.data.fitness.plan||{}; var h=(p.history||[]).slice().reverse();
    var items=h.map(function(x){ return '<div class="rec-row"><span class="cat">'+App.esc(x.name)+'</span><span class="note">'+App.esc(x.from)+' ~ '+App.esc(x.to||'至今')+'</span></div>'; }).join('');
    return '<div class="card tips-card"><h2>🗂 历史计划</h2>'+(items||'<div class="placeholder">暂无历史计划。</div>')+'</div>';
  }
  function doseHtml(it){
    return (it.sets?it.sets+'组 × ':'')+App.esc(it.reps||'')+(it.weight?' × '+App.esc(it.weight):'')+(it.rest?' · 休 '+App.esc(it.rest):'');
  }

  function checkableList(day, prog){
    var cats=['热身','主训','核心','体态','拉伸','有氧'];
    var html='';
    cats.forEach(function(c){
      var rows=prog.rows.filter(function(r){ return r.item.category===c; });
      if(!rows.length) return;
      html+='<div class="sum-line" style="margin:8px 0 2px;font-weight:600">'+c+'</div>';
      html+=rows.map(function(r){
        var idx=day.items.indexOf(r.item);
        return '<label class="check-row"><input type="checkbox" '+(r.done?'checked':'')+' data-item-idx="'+idx+'" aria-label="'+App.esc(r.item.name)+'">'+
          '<span class="ck-name" style="'+(r.done?'text-decoration:line-through;opacity:.6':'')+'">'+App.esc(r.item.name)+'</span>'+
          '<span class="ck-dose">'+doseHtml(r.item)+'</span></label>';
      }).join('');
    });
    return html;
  }

  function weekRows(today, anchor){
    var L=App.Logic;
    anchor=anchor||today;
    var labels={1:'周一',2:'周二',3:'周三',4:'周四',5:'周五',6:'周六',0:'周日'};
    var dows=[1,2,3,4,5,6,0];
    return dows.map(function(dow){
      var dt=L.fitnessWeekDate(dow, anchor);
      var d=L.fitnessDayFor(App.data.fitness.plan, dt);
      var isToday=(dt===today);
      var isSel=(dt===anchor);
      var cls='', prog=null;
      if(d && d.kind==='strength'){
        prog=L.fitnessDayProgress(App.data.fitness.workouts, dt, d);
        var pct=prog.total?prog.done/prog.total:0;
        if(prog.total>0 && prog.done>=prog.total) cls='wk-100';
        else if(pct>=0.8) cls='wk-80';
        else if(pct>=0.5) cls='wk-50';
        else if(pct>0) cls='wk-1';
        else cls='wk-0';
      }
      var right='';
      if(d && d.kind==='strength'){
        if(dt<=today){ right='<span class="wp">'+prog.done+'/'+prog.total+'</span>'; }
        else { right='<span class="wp">—</span>'; }
      } else if(d && d.kind==='rest'){
        if(dt<today){ cls='wk-100'; right='<span class="wp">✓</span>'; }
        else if(dt===today){ right='<span class="wt">休息</span>'; }
        else { right='<span class="wp">—</span>'; }
      } else if(d){
        if(dt<today){ right='<span class="wp">'+(L.fitnessDidWorkout(App.data.fitness.workouts, dt)?'✓':'—')+'</span>'; }
        else if(dt===today){ right='<span class="wp">'+(L.fitnessDidWorkout(App.data.fitness.workouts, dt)?'✓':'—')+'</span>'; }
        else { right='<span class="wp">—</span>'; }
      } else {
        right='<span class="wp">—</span>';
      }
      var mark = isToday ? '<span class="today-mark">今天</span>' : (isSel ? '<span class="sel-mark">选中</span>' : '');
      return '<div class="week-row '+cls+'" data-day-open="'+dow+'" tabindex="0" role="button" aria-label="'+labels[dow]+' '+(d?App.esc(d.focus):'休息')+'">'+
        '<span class="wl">'+labels[dow]+'</span>'+
        '<span class="wf" style="'+(isToday?'color:var(--accent)':'')+'">'+(d?App.esc(d.focus):'休息')+'</span>'+
        '<span class="wt">'+(d?App.esc(d.tag||''):'')+'</span>'+
        mark+right+
        '</div>';
    }).join('');
  }

  function calendarHtml(today){
    var L=App.Logic;
    var y=calY, m=calM;
    var todayY=Number(today.slice(0,4));
    var yearOpts=''; for(var yy=todayY-3; yy<=todayY+3; yy++){ yearOpts+='<option value="'+yy+'"'+(yy===y?' selected':'')+'>'+yy+'</option>'; }
    var monthOpts=''; for(var mm=1; mm<=12; mm++){ monthOpts+='<option value="'+mm+'"'+(mm===m?' selected':'')+'>'+mm+'月</option>'; }
    var title='<div class="cal-title"><select class="cal-sel" id="calYear">'+yearOpts+'</select><select class="cal-sel" id="calMonth">'+monthOpts+'</select></div>';
    var cells=L.fitnessMonthGrid(App.data.fitness.plan, App.data.fitness.workouts, y, m);
    var head='<div class="cal-head">'+['日','一','二','三','四','五','六'].map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div>';
    var body='<div class="cal-grid">'+cells.map(function(c){
      if(!c) return '<div class="cal-cell cal-empty"></div>';
      var isT=(c.date===today);
      var isS=(c.date===selDate);
      return '<div class="cal-cell '+c.cls+(isT?' cal-today':'')+(isS?' cal-selected':'')+'" data-date="'+c.date+'" role="button" tabindex="0" aria-label="'+c.date+' '+(c.focus||'')+'"><span class="n">'+c.d+'</span></div>';
    }).join('')+'</div>';
    return title+head+body;
  }

  function dayItemsHtml(day){
    var cats=['热身','主训','核心','体态','拉伸','有氧'];
    var html='';
    cats.forEach(function(c){
      var list=(day.items||[]).filter(function(it){ return it.category===c; });
      if(!list.length) return;
      html+='<div class="sum-line" style="margin:6px 0 2px;font-weight:600">'+c+'</div>';
      html+=list.map(function(it){
        return '<div class="rec-row"><span class="cat">'+App.esc(it.name)+'</span><span class="note">'+doseHtml(it)+'</span>'+(it.note?'<span class="note" style="opacity:.7">'+App.esc(it.note)+'</span>':'')+'</div>';
      }).join('');
    });
    return html;
  }

  function tipsCard(title, items){
    var h='<div class="card tips-card"><h2>'+title+'</h2>';
    (items||[]).forEach(function(t){ h+='<div class="sum-line">· '+App.esc(t)+'</div>'; });
    return h+'</div>';
  }

  function showDay(day, date){
    var L=App.Logic;
    date = date || L.todayStr();
    var canCheck = (date <= L.todayStr()) && day.kind==='strength';
    var prog = (day.kind==='strength') ? L.fitnessDayProgress(App.data.fitness.workouts, date, day) : null;
    var html='<div class="sum-line" style="margin-bottom:8px;font-weight:600">'+App.esc(day.label)+' · '+App.esc(day.focus)+(day.tag?' · '+App.esc(day.tag):'')+(prog?' · 完成 '+prog.done+'/'+prog.total:'')+'</div>';
    if(canCheck && prog){
      var isAll=(prog.total>0 && prog.done>=prog.total);
      html+='<button class="mbtn ghost" id="btnDayAll" style="margin:4px 0 8px">'+(isAll?'☐ 全不选':'☑ 全选')+'</button>';
      var cats=['热身','主训','核心','体态','拉伸','有氧'];
      cats.forEach(function(c){
        var rows=prog.rows.filter(function(r){ return r.item.category===c; });
        if(!rows.length) return;
        html+='<div class="sum-line" style="margin:8px 0 2px;font-weight:600">'+c+'</div>';
        html+=rows.map(function(r){
          var idx=day.items.indexOf(r.item);
          return '<label class="check-row"><input type="checkbox" '+(r.done?'checked':'')+' data-day-check="'+idx+'" aria-label="'+App.esc(r.item.name)+'">'+
            '<span class="ck-name" style="'+(r.done?'text-decoration:line-through;opacity:.6':'')+'">'+App.esc(r.item.name)+'</span>'+
            '<span class="ck-dose">'+doseHtml(r.item)+'</span></label>';
        }).join('');
      });
    } else {
      html+=dayItemsHtml(day);
    }
    App.openModal(html, { title:'当天训练计划', saveText:'完成', onSave:function(close){ close(); } });
    if(canCheck) bindDayModal(day, date);
  }

  function bindDayModal(day, date){
    var box=document.getElementById('modal');
    if(!box) return;
    var all=box.querySelector('#btnDayAll'); if(all) all.addEventListener('click', function(){ var pp=App.Logic.fitnessDayProgress(App.data.fitness.workouts, date, day); if(pp.total>0 && pp.done>=pp.total){ clearDay(day, date); } else { completeDay(day, date); } render(); showDay(day, date); });
    box.querySelectorAll('[data-day-check]').forEach(function(cb){
      cb.addEventListener('change', function(){
        toggleItem(day, date, parseInt(cb.getAttribute('data-day-check'),10));
        render();
        showDay(day, date);
      });
    });
  }

  function toggleItem(day, date, idx){
    var it=day.items[idx]; if(!it) return;
    var w=App.data.fitness.workouts||[];
    var found=-1;
    for(var i=0;i<w.length;i++){ if(w[i].date===date && w[i].name===it.name && w[i].plan===day.focus){ found=i; break; } }
    if(found>=0){ w.splice(found,1); }
    else { w.push({id:'w'+Date.now()+Math.random().toString(36).slice(2,6), date:date, name:it.name, sets:it.sets, reps:it.reps, weight:it.weight, category:it.category, rest:it.rest, note:it.note, plan:day.focus, ts:Date.now()}); }
    App.data.fitness.workouts=w; App.setData(App.data);
  }

  function clearDay(day, date){
    App.data.fitness.workouts=(App.data.fitness.workouts||[]).filter(function(x){ return !(x.date===date && x.plan===day.focus); });
    App.setData(App.data);
  }

  function completeDay(day, date){
    var w=App.data.fitness.workouts||[];
    (day.items||[]).forEach(function(it){
      var exists=w.some(function(x){ return x.date===date && x.name===it.name && x.plan===day.focus; });
      if(!exists) w.push({id:'w'+Date.now()+Math.random().toString(36).slice(2,6), date:date, name:it.name, sets:it.sets, reps:it.reps, weight:it.weight, category:it.category, rest:it.rest, note:it.note, plan:day.focus, ts:Date.now()});
    });
    App.data.fitness.workouts=w; App.setData(App.data);
  }

  function bindPlan(body){
    var L=App.Logic;
    var b=body.querySelector('#btnCompleteAll'); if(b) b.addEventListener('click', function(){ var d=L.fitnessDayFor(App.data.fitness.plan, L.todayStr()); if(d){ completeDay(d, L.todayStr()); render(); App.toast('今日已全部完成'); } });
    body.querySelectorAll('[data-item-idx]').forEach(function(cb){ cb.addEventListener('change', function(){ var d=L.fitnessDayFor(App.data.fitness.plan, L.todayStr()); if(d) toggleItem(d, L.todayStr(), parseInt(cb.getAttribute('data-item-idx'),10)); }); });
    var ep=body.querySelector('#btnEditPlan'); if(ep) ep.addEventListener('click', editPlan);
    var cy=body.querySelector('#calYear'); if(cy) cy.addEventListener('change', function(){ calY=parseInt(cy.value,10); selDate=null; render(); });
    var cm=body.querySelector('#calMonth'); if(cm) cm.addEventListener('change', function(){ calM=parseInt(cm.value,10); selDate=null; render(); });
  }

  // ===== 编辑计划 ===== 
  function editPlan(){
    var L=App.Logic;
    var cur=App.data.fitness.plan && App.data.fitness.plan.current ? App.data.fitness.plan.current : null;
    var name=cur&&cur.name?cur.name:'冬训增肌储备期';
    var from=cur&&cur.from?cur.from:L.todayStr();
    editDraft=JSON.parse(JSON.stringify(cur&&cur.days?cur.days:(L.FITNESS_PLAN&&L.FITNESS_PLAN.days)||[]));
    var labels={1:'周一',2:'周二',3:'周三',4:'周四',5:'周五',6:'周六',0:'周日'};
    var rows=[1,2,3,4,5,6,0].map(function(dow){
      var d=null; editDraft.forEach(function(x){ if(x.dow===dow) d=x; });
      return '<div class="ep-row"><span class="ep-label">'+labels[dow]+'</span><span class="ep-focus">'+(d?App.esc(d.focus):'休息')+'</span><span class="ep-count">'+(d&&d.items?d.items.length+' 项':'—')+'</span><button class="mbtn ghost ep-btn" data-ep-day="'+dow+'">编辑</button></div>';
    }).join('');
    App.openModal(
      '<div class="field"><label>计划名称</label><input class="input" id="epName" value="'+App.esc(name)+'"></div>'+
      '<div class="field"><label>生效日期</label><input class="input" id="epFrom" type="date" value="'+App.esc(from)+'"></div>'+
      '<div class="sum-line" style="margin:4px 0 6px;font-weight:600">每天安排（点「编辑」修改某天）</div>'+rows,
      { title:'编辑计划', saveText:'保存并生效', onSave:function(close){
        var nn=document.getElementById('epName').value.trim(); if(!nn){App.toast('请填写计划名');return;}
        var nf=document.getElementById('epFrom').value||App.Logic.todayStr();
        App.data.fitness.plan=App.Logic.applyPlanChange(App.data.fitness.plan, nn, editDraft, nf);
        App.setData(App.data); close(); render(); App.toast('计划已更新：'+nn);
      }}
    );
    bindEditPlan();
  }

  function bindEditPlan(){
    var box=document.getElementById('modal');
    if(!box) return;
    box.querySelectorAll('[data-ep-day]').forEach(function(b){ b.addEventListener('click', function(){ editDay(parseInt(b.getAttribute('data-ep-day'),10)); }); });
  }

  function editDay(dow){
    var labels={1:'周一',2:'周二',3:'周三',4:'周四',5:'周五',6:'周六',0:'周日'};
    var day=null; editDraft.forEach(function(x){ if(x.dow===dow) day=x; });
    if(!day){ day={dow:dow, label:labels[dow], focus:'训练日', kind:'strength', tag:'', items:[]}; editDraft.push(day); }
    renderDayEdit(day);
  }

  function renderDayEdit(day){
    var cats=['热身','主训','核心','体态','拉伸','有氧'];
    var list=(day.items||[]).map(function(it,idx){
      return '<div class="rec-row"><span class="cat">'+App.esc(it.name)+'</span><span class="note">'+doseHtml(it)+'</span><button class="del" data-edi="'+idx+'">✕</button></div>';
    }).join('')||'<div class="placeholder">暂无动作</div>';
    var catOpts=cats.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
    App.openModal(
      '<div class="sum-line" style="font-weight:600;margin-bottom:6px">'+App.esc(day.label)+' · '+App.esc(day.focus)+'</div>'+
      '<div style="max-height:240px;overflow:auto">'+list+'</div>'+
      '<div class="sum-line" style="margin:8px 0 4px;font-weight:600">添加动作</div>'+
      '<div class="field"><label>动作名称</label><input class="input" id="eiName"></div>'+
      '<div class="row"><div class="field"><label>类别</label><select class="input" id="eiCat">'+catOpts+'</select></div><div class="field"><label>组数</label><input class="input" id="eiSets"></div></div>'+
      '<div class="row"><div class="field"><label>次数</label><input class="input" id="eiReps" placeholder="如 8~12"></div><div class="field"><label>重量</label><input class="input" id="eiWeight" placeholder="如 哑铃"></div></div>'+
      '<div class="row"><div class="field"><label>休息</label><input class="input" id="eiRest" placeholder="如 90s"></div><div class="field"><label>备注</label><input class="input" id="eiNote"></div></div>'+
      '<button class="mbtn ghost" id="eiAdd" style="margin-top:4px">＋ 添加动作</button>',
      { title:'编辑 '+day.label, saveText:'完成', onSave:function(close){ close(); editPlan(); } }
    );
    var box=document.getElementById('modal');
    var add=box.querySelector('#eiAdd'); if(add) add.addEventListener('click', function(){
      var n=box.querySelector('#eiName').value.trim(); if(!n){App.toast('请填写动作名');return;}
      day.items=day.items||[];
      day.items.push({name:n, category:box.querySelector('#eiCat').value, sets:box.querySelector('#eiSets').value.trim(), reps:box.querySelector('#eiReps').value.trim(), weight:box.querySelector('#eiWeight').value.trim(), rest:box.querySelector('#eiRest').value.trim(), note:box.querySelector('#eiNote').value.trim()});
      renderDayEdit(day);
    });
    box.querySelectorAll('[data-edi]').forEach(function(b){ b.addEventListener('click', function(){ var i=parseInt(b.getAttribute('data-edi'),10); day.items.splice(i,1); renderDayEdit(day); }); });
  }

  // ===== 动作库 =====
  function renderRecords(){
    var recs=App.data.fitness.records||[];
    var list=(filter==='all'?recs:recs.filter(function(r){return r.status===filter;})).filter(function(r){ return !q||(r.name||'').indexOf(q)>=0||(r.source||'').indexOf(q)>=0||(r.points||'').indexOf(q)>=0; });
    var h='<div class="seg2" id="fitFilter"><button data-f="all" class="'+(filter==='all'?'on':'')+'">全部</button><button data-f="pending" class="'+(filter==='pending'?'on':'')+'">待评估</button><button data-f="added" class="'+(filter==='added'?'on':'')+'">已加入</button><button data-f="skip" class="'+(filter==='skip'?'on':'')+'">暂不加入</button></div>';
    h+=(list.length?'<div class="record-grid">'+list.map(function(r){ return '<div class="card"><h2>'+App.esc(r.name)+' <span class="badge b-'+r.status+'">'+stL(r.status)+'</span></h2>'+(r.source?'<div class="sum-line">来源：'+App.esc(r.source)+'</div>':'')+(r.points?'<p class="pre">'+App.esc(r.points)+'</p>':'')+(r.note?'<div class="sum-line">备注：'+App.esc(r.note)+'</div>':'')+'<div class="acts"><button data-edit="'+r.id+'">编辑</button><button data-del="'+r.id+'">删除</button></div></div>'; }).join('')+'</div>':'<div class="placeholder">没有匹配的动作。</div>');
    return h+'<button class="mbtn ghost" id="btnAdd">＋ 添加动作</button>';
  }

  // ===== 训练记录 =====
  function renderWorkouts(){
    var w=(App.data.fitness.workouts||[]).slice();
    var names={}; w.forEach(function(r){ names[r.name]=1; });
    var po=Object.keys(names).map(function(nm){ var p=App.Logic.progressiveOverload(w, nm); p.name=nm; return p; }).filter(function(p){ return p.delta!==null; });
    var poHtml=po.length?'<div class="card"><h2>📈 渐进超负荷</h2>'+po.map(function(p){ var up=p.delta>0; return '<div class="rec-row"><span class="cat">'+App.esc(p.name)+'</span><span class="note wk-num">'+p.previous+' → '+p.current+' kg</span><span class="amt" style="color:'+(up?'var(--success)':'var(--danger)')+'">'+(up?'+':'')+p.delta+'</span></div>'; }).join('')+'</div>':'';
    var groups={}; w.forEach(function(r){ (groups[r.date]=groups[r.date]||[]).push(r); });
    var dates=Object.keys(groups).sort(function(a,b){ return a<b?1:-1; });
    var body=dates.map(function(dt){
      var list=groups[dt];
      var day=App.Logic.fitnessDayFor(App.data.fitness.plan, dt);
      var prog=null; if(day && day.kind==='strength'){ prog=App.Logic.fitnessDayProgress(w, dt, day); }
      var head=App.esc(dt)+' 周'+WK[new Date(dt+'T00:00:00').getDay()]+(day?' · '+App.esc(day.focus):'')+(prog?' · 完成 '+prog.done+'/'+prog.total:'');
      var rows=list.map(function(r){
        return '<div class="rec-row"><span class="cat">'+App.esc(r.name)+'</span>'+(r.category?'<span class="note">'+App.esc(r.category)+'</span>':'')+'<span class="wk-dose">'+(r.sets||'-')+'×'+(r.reps||'-')+(r.weight?'×'+App.esc(r.weight)+'kg':'')+'</span><button class="del" data-del="'+r.id+'">✕</button></div>';
      }).join('');
      return '<div class="card"><h2>'+head+'</h2>'+rows+'</div>';
    }).join('');
    return poHtml+(body||'<div class="placeholder">暂无训练记录。到「计划」勾选完成项，或点下方手动添加。</div>')+'<button class="mbtn ghost" id="btnAddW">＋ 添加训练记录</button>';
  }

  // ===== 体重 =====
  function renderWeights(){
    var raw=(App.data.fitness.weights||[]).slice().sort(function(a,b){return a.date<b.date?-1:1;});
    var bw=raw;
    var last=bw[bw.length-1], first=bw[0], delta=(bw.length>1)?(Number(last.weight)-Number(first.weight)).toFixed(1):'—';
    var h='<div class="stat3"><div class="stat-item"><div class="sl">最新(kg)</div><div class="sv">'+(last?last.weight:'—')+'</div></div><div class="stat-item"><div class="sl">期间变化</div><div class="sv">'+(delta==='—'?'—':(delta>0?'+':'')+delta)+'</div></div><div class="stat-item"><div class="sl">记录次数</div><div class="sv">'+bw.length+'</div></div></div>';
    h+=svgWeightChart(App.Logic.weightSeries(App.data.fitness.weights||[]));
    h+=(bw.length?bw.map(function(r){return '<div class="rec-row"><span class="cat">'+r.weight+' kg</span><span class="note">'+App.esc(r.date)+'</span><button class="del" data-del="'+r.id+'">✕</button></div>';}).join(''):'<div class="placeholder">暂无体重记录。</div>');
    return '<div class="card">'+h+'</div><button class="mbtn ghost" id="btnAddBw">＋ 记录体重</button>';
  }

  function svgWeightChart(series){
    if(!series || series.length < 2) return '';
    var W=320, H=90, pad=8, vals=series.map(function(s){return s.weight;});
    var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), range=(mx-mn)||1;
    var pts=series.map(function(s,i){ var x=pad+(W-2*pad)*i/(series.length-1); var y=pad+(H-2*pad)*(1-(s.weight-mn)/range); return x.toFixed(1)+','+y.toFixed(1); });
    return '<div style="margin:8px 0"><svg width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="'+pts.join(' ')+'"/></svg></div>';
  }

  function renderBody(){
    if(sub==='plan') return renderPlan();
    if(sub==='records') return renderRecords();
    if(sub==='workouts') return renderWorkouts();
    if(sub==='weights') return renderWeights();
    return '';
  }

  function stL(s){ return s==='added'?'已加入':(s==='skip'?'暂不加入':'待评估'); }

  function editRecord(id){
    var arr=App.data.fitness.records||[], x=id?arr.find(function(y){return y.id===id;}):null;
    App.openModal(
      '<div class="field"><label>动作名称</label><input class="input" id="f1" value="'+(x?App.esc(x.name):'')+'" placeholder="如 泽奇深蹲"></div>'+
      '<div class="row"><div class="field"><label>来源类型</label><select class="input" id="f2"><option value="video"'+(x&&x.srcType==='video'?' selected':'')+'>视频</option><option value="book"'+(x&&x.srcType==='book'?' selected':'')+'>书本</option><option value="web"'+(x&&x.srcType==='web'?' selected':'')+'>网页</option><option value="other"'+(x&&x.srcType==='other'?' selected':'')+'>其他</option></select></div><div class="field"><label>评估</label><select class="input" id="f3"><option value="pending"'+(x&&x.status==='pending'?' selected':'')+'>待评估</option><option value="added"'+(x&&x.status==='added'?' selected':'')+'>已加入</option><option value="skip"'+(x&&x.status==='skip'?' selected':'')+'>暂不加入</option></select></div></div>'+
      '<div class="field"><label>来源（链接/书名）</label><input class="input" id="f4" value="'+(x?App.esc(x.source||''):'')+'"></div>'+
      '<div class="field"><label>要点提炼</label><textarea class="input" id="f5">'+(x?App.esc(x.points||''):'')+'</textarea></div>'+
      '<div class="field"><label>备注</label><input class="input" id="f6" value="'+(x?App.esc(x.note||''):'')+'"></div>',
      { title:x?'编辑动作':'添加动作', saveText:'保存', onSave:function(close){
        var n=document.getElementById('f1').value.trim(); if(!n){App.toast('请填写名称');return;}
        var obj={name:n,srcType:document.getElementById('f2').value,status:document.getElementById('f3').value,source:document.getElementById('f4').value.trim(),points:document.getElementById('f5').value.trim(),note:document.getElementById('f6').value.trim()};
        if(id){ Object.assign(x,obj); } else { obj.id='f'+Date.now(); obj.ts=Date.now(); arr.push(obj); }
        App.data.fitness.records=arr; App.setData(App.data); close(); render(); App.toast('已保存');
      }}
    );
  }

  function delRecord(id){ App.confirm('删除该动作？', function(){ App.data.fitness.records=(App.data.fitness.records||[]).filter(function(x){return x.id!==id;}); App.setData(App.data); render(); }); }

  function addWorkout(){
    App.openModal(
      '<div class="field"><label>日期</label><input class="input" id="f1" type="date" value="'+App.Logic.todayStr()+'"></div>'+
      '<div class="field"><label>动作 / 项目</label><input class="input" id="f2"></div>'+
      '<div class="field"><label>类别</label><select class="input" id="f7"><option value="主训" selected>主训</option><option value="热身">热身</option><option value="核心">核心</option><option value="体态">体态</option><option value="拉伸">拉伸</option><option value="有氧">有氧</option></select></div>'+
      '<div class="field"><label>组间休息</label><input class="input" id="f8" placeholder="如 90s（可空）"></div>'+
      '<div class="row"><div class="field"><label>组数</label><input class="input" id="f3" inputmode="decimal"></div><div class="field"><label>次数</label><input class="input" id="f4" inputmode="decimal"></div><div class="field"><label>重量kg</label><input class="input" id="f5" inputmode="decimal"></div></div>'+
      '<div class="field"><label>备注</label><input class="input" id="f6"></div>',
      { title:'添加训练记录', saveText:'保存', onSave:function(close){
        var n=document.getElementById('f2').value.trim(); if(!n){App.toast('请填写动作');return;}
        var w=App.data.fitness.workouts||[]; w.push({id:'w'+Date.now(),date:document.getElementById('f1').value||App.Logic.todayStr(),name:n,sets:document.getElementById('f3').value.trim(),reps:document.getElementById('f4').value.trim(),weight:document.getElementById('f5').value.trim(),category:document.getElementById('f7').value,rest:document.getElementById('f8').value.trim(),note:document.getElementById('f6').value.trim(),ts:Date.now()});
        App.data.fitness.workouts=w; App.setData(App.data); close(); render(); App.toast('已记录');
      }}
    );
  }

  function addWeight(){
    App.openModal('<div class="field"><label>日期</label><input class="input" id="f1" type="date" value="'+App.Logic.todayStr()+'"></div><div class="field"><label>体重 kg</label><input class="input" id="f2" inputmode="decimal"></div>',
      { title:'记录体重', saveText:'保存', onSave:function(close){
        var w=parseFloat(document.getElementById('f2').value); if(isNaN(w)||w<=0){App.toast('请填写有效体重');return;}
        var a=App.data.fitness.weights||[]; a.push({id:'bw'+Date.now(),date:document.getElementById('f1').value||App.Logic.todayStr(),weight:w,ts:Date.now()});
        App.data.fitness.weights=a; App.setData(App.data); close(); render(); App.toast('已记录');
      }}
    );
  }

  render();
});
})();
