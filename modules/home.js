/* modules/home.js —— 首页总览（今日行动面板 · 主次布局） */
(function(){
'use strict';
App.register('home', function(container){
  // 手机端：点「快速备忘」弹出上层浮层，显示备忘列表 + 输入
  function memoListHtml(ms){
    return ms.length ? ms.map(function(m){ return '<div class="mini-item memo">'+App.esc(m.text)+'<button class="del" data-memo="'+m.id+'">✕</button></div>'; }).join('') : '<div class="placeholder">还没有备忘</div>';
  }
  function openMemoSheet(){
    var overlay = document.createElement('div');
    overlay.className = 'memo-sheet';
    overlay.innerHTML =
      '<div class="memo-sheet-box">'+
        '<div class="memo-sheet-head"><h2>📝 快速备忘</h2><button class="memo-sheet-x" aria-label="关闭">✕</button></div>'+
        '<input class="input" id="memoSheetInput" placeholder="记一条，回车保存">'+
        '<div class="memo-sheet-list">'+memoListHtml((App.data.memos||[]).slice(-10).reverse())+'</div>'+
      '</div>';
    document.body.appendChild(overlay);
    function refresh(){ var list=overlay.querySelector('.memo-sheet-list'); if(list) list.innerHTML=memoListHtml((App.data.memos||[]).slice(-10).reverse()); bindDel(); }
    function bindDel(){ overlay.querySelectorAll('[data-memo]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-memo'); App.deleteWithUndo({ apply:function(){ App.data.memos=(App.data.memos||[]).filter(function(x){ return x.id!==id; }); }, render:refresh }); }); }); }
    bindDel();
    var inp=overlay.querySelector('#memoSheetInput'); inp.focus();
    inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var v=inp.value.trim(); if(!v){ App.toast('请输入内容'); return; } App.data.memos=App.data.memos||[]; App.data.memos.push({id:'m'+Date.now(), text:v, ts:Date.now()}); App.setData(App.data); inp.value=''; refresh(); App.toast('已记录'); } });
    overlay.addEventListener('click', function(e){ if(e.target===overlay || e.target.closest('.memo-sheet-x')){ overlay.remove(); } });
  }


  // 局部刷新「今日计划」一瞥：进度条 / 数字 / 文案 / 未完成列表（不重建整个首页）
  function refreshTodayGlance(){
    var L = App.Logic, d = App.data;
    var a = L.homeActions(d, L.todayStr());
    var pct = a.today.total ? Math.round(a.today.done/a.today.total*100) : 0;
    var doneEl = container.querySelector('.hero-done');
    var totalEl = container.querySelector('.hero-total');
    var sumEl = container.querySelector('.hero-card .sum-line');
    var barEl = container.querySelector('.hero-card .prog-bar');
    var listEl = container.querySelector('.hero-list');
    if(doneEl) doneEl.textContent = a.today.done;
    if(totalEl) totalEl.textContent = ' / ' + a.today.total;
    if(sumEl) sumEl.textContent = a.today.total ? ('今日已完成 '+a.today.done+' 项') : '今天还没有计划';
    if(barEl) barEl.style.width = pct + '%';
    if(listEl) listEl.innerHTML = (a.today.open.length ? a.today.open.map(function(x){ return '<div class="mini-item"><button class="ck" data-htoggle="'+x.id+'">☐</button><span class="txt">'+App.esc(x.text)+'</span></div>'; }).join('') : '<div class="placeholder">今天还没有计划，先去添加一条。</div>');
  }

  function render(){
    var L = App.Logic, d = App.data;
    var a = L.homeActions(d, L.todayStr());
    var memos = (d.memos||[]).slice(-10).reverse();
    var now = new Date();
    var week = ['日','一','二','三','四','五','六'][now.getDay()];
    var greet = (now.getMonth()+1)+' 月 '+now.getDate()+' 日 · 周'+week;
    var pct = a.today.total ? Math.round(a.today.done/a.today.total*100) : 0;

    var workDesc = (a.work.running>0) ? ('进行中 '+a.work.running+' 个清单') : ('清单 '+a.work.ckDone+'/'+a.work.ckTotal);
    var fst = L.fitnessPlanStatus(d.fitness.plan, d.fitness.workouts, L.todayStr());
    var fitDesc = fst.planned ? (fst.kind==='strength' ? ('今日：'+fst.focus+(fst.done?' · 已练':' · 未练')) : ('今日：'+fst.focus)) : (a.fitness.didWorkout ? '今日 已打卡' : '今日 去训练');
    var studyDesc = (a.study.openGoals>0) ? ('去完成 '+a.study.openGoals+' 项') : '今日学习已清空';
    var fitBanner = '';
    if(fst.planned && fst.day){
      var fp = (fst.day.kind==='strength') ? L.fitnessDayProgress(d.fitness.workouts, L.todayStr(), fst.day) : null;
      var fbDesc = fp ? ('完成 '+fp.done+'/'+fp.total) : (fst.kind==='cardio' ? '有氧 · 羽毛球' : (fst.kind==='optional' ? '可选 · 循环/游泳' : '休息日 · 好好恢复'));
      fitBanner = '<div class="fit-today" data-goto="fitness">'+
        '<div class="ft-icon">💪</div>'+
        '<div class="ft-main">'+
          '<div class="ft-dow">今日训练 · 周'+week+' · '+App.esc(fst.focus)+'</div>'+
          '<div class="ft-focus">'+(fst.day.tag?App.esc(fst.day.tag):'')+'</div>'+
          '<div class="ft-sub">'+fbDesc+'</div>'+
          (fp?'<div class="ft-bar"><i style="width:'+(fp.total?Math.round(fp.done/fp.total*100):0)+'%"></i></div>':'')+
        '</div>'+
        '<span class="ft-go">去训练 →</span>'+
      '</div>';
    }

    container.innerHTML =
      '<div class="hello"><span>'+App.esc(greet)+'</span><button class="hello-memo" data-memo-open>📝 快速备忘</button></div>'+
      '<div class="home-top">'+
        '<div class="hero-card">'+
          '<div class="hero-head"><h2>📋 今日计划</h2><button class="go" data-goto="today">去今日计划 →</button></div>'+
          '<div class="hero-num"><span class="hero-done">'+a.today.done+'</span><span class="hero-total"> / '+a.today.total+'</span></div>'+
          '<div class="sum-line">'+(a.today.total ? '今日已完成 '+a.today.done+' 项' : '今天还没有计划')+'</div>'+
          '<div class="prog-track"><div class="prog-bar" style="width:'+pct+'%"></div></div>'+
          '<div class="hero-list" aria-live="polite">'+(a.today.open.length?a.today.open.map(function(x){return '<div class="mini-item"><button class="ck" data-htoggle="'+x.id+'">☐</button><span class="txt">'+App.esc(x.text)+'</span></div>';}).join(''):'<div class="placeholder">今天还没有计划，先去添加一条。</div>')+'</div>'+
        '</div>'+
        '<aside class="home-aside">'+
          '<div class="memo-card">'+
            '<h2>📝 快速备忘</h2>'+
            '<div class="row"><input class="input" id="memoInput" placeholder="随手记一条，回车保存"></div>'+
            (memos.length?'<div class="memo-list">'+memos.map(function(m){return '<div class="mini-item memo">'+App.esc(m.text)+'<button class="del" data-memo="'+m.id+'">✕</button></div>';}).join('')+'</div>':'')+
          '</div>'+
        '</aside>'+
      '</div>'+
      fitBanner+
      '<div class="grad-grid">'+
        '<div class="grad-card g-blue" data-goto="ledger"><div class="t">💰</div><div class="n">账本</div><div class="d">本月支出 '+L.fmtMoney(a.ledger.expense)+'</div></div>'+
        '<div class="grad-card g-red" data-goto="fitness"><div class="t">💪</div><div class="n">健身</div><div class="d">'+fitDesc+'</div></div>'+
        '<div class="grad-card g-violet" data-goto="work"><div class="t">💼</div><div class="n">工作</div><div class="d">'+workDesc+'</div></div>'+
        '<div class="grad-card g-green" data-goto="study"><div class="t">📚</div><div class="n">学习</div><div class="d">'+studyDesc+'</div></div>'+
        '<div class="grad-card g-teal" data-goto="decision"><div class="t">🧭</div><div class="n">决策</div><div class="d">待定 '+a.decision.wait+' 条</div></div>'+
        '<div class="grad-card g-orange" data-goto="settings"><div class="t">🔐</div><div class="n">数据安全</div><div class="d">主密码加密</div></div>'+
      '</div>';

    var mi = container.querySelector('#memoInput');
    if(mi){
      mi.addEventListener('keydown', function(e){
        if(e.key==='Enter'){
          var v = mi.value.trim();
          if(!v){ App.toast('请输入内容'); return; }
          App.data.memos = App.data.memos || [];
          App.data.memos.push({id:'m'+Date.now(), text:v, ts:Date.now()});
          App.setData(App.data); render();
        }
      });
    }
  }

  // 容器级事件委托：一次绑定，innerHTML 重建后依然有效
  container.addEventListener('click', function(e){
    var el;
    if((el = e.target.closest('[data-goto]'))){ App.goto(el.getAttribute('data-goto')); return; }
    if((el = e.target.closest('[data-htoggle]'))){
      var id = el.getAttribute('data-htoggle');
      var it = (App.data.today||[]).find(function(x){ return x.id===id; });
      if(it){ it.done = true; App.setData(App.data); refreshTodayGlance(); }
      return;
    }
    if((el = e.target.closest('[data-memo-open]'))){ openMemoSheet(); return; }
    if((el = e.target.closest('[data-memo]'))){
      App.deleteWithUndo({
        apply: function(){ App.data.memos = (App.data.memos||[]).filter(function(x){ return x.id!==el.getAttribute('data-memo'); }); },
        render: render
      });
      return;
    }
  });

  render();
});
})();