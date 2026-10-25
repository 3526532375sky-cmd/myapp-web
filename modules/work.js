/* modules/work.js —— 工作计划 */
(function(){
'use strict';
var sub = 'sops';
App.register('work', function(container){
  var q = '';
  var runningSop = null, runStart = null;
  var SUBS = ['sops','logs','checklists'];
  function render(){
    var tabs = container.querySelector('.seg2-tabs');
    var strip = container.querySelector('.pager-strip');
    if(!tabs){
      container.innerHTML = '<div class="seg2 seg2-tabs"><button data-sub="sops">SOP</button><button data-sub="logs">相关记录</button><button data-sub="checklists">清单</button></div>';
      tabs = container.querySelector('.seg2-tabs');
      tabs.addEventListener('click', function(e){ var b=e.target.closest('button[data-sub]'); if(b){ switchSub(b.getAttribute('data-sub')); } });
      var viewport = document.createElement('div'); viewport.className = 'pager-viewport';
      strip = document.createElement('div'); strip.className = 'pager-strip';
      strip.setAttribute('data-total', SUBS.length);
      strip.setAttribute('data-idx', SUBS.indexOf(sub));
      strip.style.width = (SUBS.length * 100) + '%';
      SUBS.forEach(function(s){ var p=document.createElement('div'); p.className='pager-page'; p.setAttribute('data-page', s); strip.appendChild(p); });
      viewport.appendChild(strip);
      tabs.after(viewport);
    }
    tabs.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sub')===sub); });
    renderAllPages();
    positionStrip(false);
    bindAll();
  }
  function renderAllPages(){
    SUBS.forEach(function(s){
      var pg = container.querySelector('[data-page="'+s+'"]'); if(!pg) return;
      var html = '';
      if(s==='sops') html = searchBox() + renderSops();
      else if(s==='logs') html = searchBox() + renderLogs();
      else html = renderChecklists();
      pg.innerHTML = html;
    });
  }
  function positionStrip(animate){
    var strip = container.querySelector('.pager-strip'); if(!strip) return;
    var total = parseInt(strip.getAttribute('data-total') || '1', 10);
    var idx = SUBS.indexOf(sub); if(idx<0) idx=0;
    strip.setAttribute('data-idx', idx);
    strip.style.transition = animate ? 'transform .18s cubic-bezier(.22,.61,.36,1)' : 'none';
    strip.style.transform = 'translateX(' + (-idx*(100/total)) + '%)';
  }
  function switchSub(s){
    sub = s;
    container.querySelectorAll('.seg2-tabs button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sub')===sub); });
    positionStrip(true);
  }

  function searchBox(){ return '<div class="row" style="margin-bottom:8px"><input class="input search-input" placeholder="搜索当前列表" value="'+App.esc(q)+'"></div>'; }
  function bindAll(){
    var pg = function(s){ return container.querySelector('[data-page="'+s+'"]'); };
    ['sops','logs'].forEach(function(s){
      var body = pg(s); if(!body) return;
      var si = body.querySelector('.search-input');
      if(si){ var composing=false; si.addEventListener('compositionstart', function(){ composing=true; }); si.addEventListener('compositionend', function(){ composing=false; setTimeout(applySearch,0); }); si.addEventListener('input', function(){ if(composing) return; applySearch(); }); function applySearch(){ q=si.value; var pos=si.selectionStart; render(); var nsi=container.querySelector('[data-page="'+s+'"] .search-input'); if(nsi){ nsi.focus(); nsi.setSelectionRange(pos,pos); } } }
    });
    var body = pg('sops');
    if(body){
      body.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ editSop(b.getAttribute('data-edit')); }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ delSop(b.getAttribute('data-del')); }); });
      body.querySelectorAll('[data-run]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-run'); var sop=(App.data.work.sops||[]).find(function(x){return x.id===id;}); if(sop){ runningSop=sop; runStart=Date.now(); render(); } }); });
      var fb=body.querySelector('#btnFinishRun'); if(fb) fb.addEventListener('click', finishRun);
      var cb=body.querySelector('#btnCancelRun'); if(cb) cb.addEventListener('click', function(){ runningSop=null; runStart=null; render(); });
      var a=body.querySelector('#btnAddSop'); if(a) a.addEventListener('click', function(){ editSop(null); });
    }
    body = pg('logs');
    if(body){
      body.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ editLog(b.getAttribute('data-edit')); }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ delLog(b.getAttribute('data-del')); }); });
      var a=body.querySelector('#btnAddLog'); if(a) a.addEventListener('click', function(){ editLog(null); });
    }
    body = pg('checklists');
    if(body){
      body.querySelectorAll('[data-ck]').forEach(function(b){ b.addEventListener('click', function(){ toggleItem(b.getAttribute('data-ck'), b.getAttribute('data-i')); }); });
      body.querySelectorAll('[data-item-del]').forEach(function(b){ b.addEventListener('click', function(){ delItem(b.getAttribute('data-item-del'), b.getAttribute('data-i')); }); });
      body.querySelectorAll('[data-add-item]').forEach(function(b){ b.addEventListener('click', function(){ addItem(b.getAttribute('data-add-item')); }); });
      body.querySelectorAll('[data-item-input]').forEach(function(inp){ inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ addItem(inp.getAttribute('data-item-input')); } }); });
      body.querySelectorAll('[data-ck-del]').forEach(function(b){ b.addEventListener('click', function(){ delChecklist(b.getAttribute('data-ck-del')); }); });
      body.querySelectorAll('[data-run-toggle]').forEach(function(b){ b.addEventListener('click', function(){ var c=App.data.work.checklists.find(function(x){return x.id===b.getAttribute('data-run-toggle');}); if(c){ c.running=!c.running; App.setData(App.data); render(); } }); });
      var a=body.querySelector('#btnAddCk'); if(a) a.addEventListener('click', addChecklist);
    }
  }

  // SOP
  function renderSops(){
    var s = (App.data.work.sops||[]).filter(function(x){ return !q||(x.title||'').indexOf(q)>=0||(x.content||'').indexOf(q)>=0||(x.tag||'').indexOf(q)>=0; });
    var runHtml = runningSop ? '<div class="card" style="border-color:var(--accent)"><h2>▶ 执行中：'+App.esc(runningSop.title)+'</h2><div class="sum-line">已用时 '+elapsed()+'</div><p class="pre">'+App.esc(runningSop.content)+'</p><div class="acts"><button id="btnFinishRun">完成并记录</button><button id="btnCancelRun">取消</button></div></div>' : '';
    var h = s.map(function(x){ return '<div class="card"><h2>📌 '+App.esc(x.title)+(x.tag?' <small>'+App.esc(x.tag)+'</small>':'')+'</h2><p class="pre">'+App.esc(x.content)+'</p><div class="acts"><button data-run="'+x.id+'">开始执行</button><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>'; }).join('');
    return runHtml+(h||'<div class="placeholder">暂无 SOP，点下方添加。</div>')+'<button class="mbtn ghost" id="btnAddSop">＋ 添加 SOP</button>';
  }
  function editSop(id){
    var s = App.data.work.sops||[], x = id ? s.find(function(y){return y.id===id;}) : null;
    App.openModal(
      '<div class="field"><label>标题</label><input class="input" id="sopTitle" value="'+(x?App.esc(x.title):'')+'"></div>'+
      '<div class="field"><label>步骤 / 要点</label><textarea class="input" id="sopContent">'+(x?App.esc(x.content):'')+'</textarea></div>'+
      '<div class="field"><label>标签</label><input class="input" id="sopTag" value="'+(x?App.esc(x.tag||''):'')+'"></div>',
      { title:x?'编辑 SOP':'添加 SOP', saveText:'保存', onSave:function(close){
        var t=document.getElementById('sopTitle').value.trim(); if(!t){App.toast('请填写标题');return;}
        if(id){ Object.assign(x,{title:t,content:document.getElementById('sopContent').value,tag:document.getElementById('sopTag').value.trim()}); }
        else{ s.push({id:'s'+Date.now(),title:t,content:document.getElementById('sopContent').value,tag:document.getElementById('sopTag').value.trim(),ts:Date.now()}); }
        App.data.work.sops=s; App.setData(App.data); close(); render(); App.toast('已保存');
      }}
    );
  }
  function delSop(id){ App.confirm('删除该 SOP？', function(){ App.data.work.sops=(App.data.work.sops||[]).filter(function(x){return x.id!==id;}); App.setData(App.data); render(); }); }

  // 记录
  function renderLogs(){
    var l = (App.data.work.logs||[]).slice().sort(function(a,b){ return a.date<b.date?1:-1; }).filter(function(x){ return !q||(x.content||'').indexOf(q)>=0; });
    var h = l.map(function(x){ var sn = sopName(x.refSop); return '<div class="card"><div class="sum-line">'+App.esc(x.date)+(sn?' · 关联：'+App.esc(sn):'')+'</div><p class="pre">'+App.esc(x.content)+'</p><div class="acts"><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>'; }).join('');
    return (h||'<div class="placeholder">暂无记录。</div>')+'<button class="mbtn ghost" id="btnAddLog">＋ 添加记录</button>';
  }
  function elapsed(){ if(!runStart) return '0:00'; var t=Math.floor((Date.now()-runStart)/1000); return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2); }
  function finishRun(){
    var sop=runningSop; if(!sop) return;
    App.openModal('<div class="field"><label>执行记录（问题/经验/结果）</label><textarea class="input" id="runContent"></textarea></div>',
      { title:'完成 '+sop.title, saveText:'完成并保存', onSave:function(close){
        var c=document.getElementById('runContent').value.trim();
        var l=App.data.work.logs||[]; l.push({id:'l'+Date.now(), date:App.Logic.todayStr(), refSop:sop.id, content:c||('完成 SOP：'+sop.title), ts:Date.now()});
        App.data.work.logs=l; runningSop=null; runStart=null; App.setData(App.data); close(); render(); App.toast('已记录');
      }});
  }
  function sopName(id){ var s=(App.data.work.sops||[]).find(function(x){return x.id===id;}); return s?s.title:''; }
  function editLog(id){
    var l=App.data.work.logs||[], x=id?l.find(function(y){return y.id===id;}):null;
    var opts='<option value="">（不关联）</option>'+(App.data.work.sops||[]).map(function(s){return '<option value="'+s.id+'"'+(x&&x.refSop===s.id?' selected':'')+'>'+App.esc(s.title)+'</option>';}).join('');
    App.openModal(
      '<div class="field"><label>日期</label><input class="input" id="logDate" type="date" value="'+(x?x.date:App.Logic.todayStr())+'"></div>'+
      '<div class="field"><label>关联 SOP</label><select class="input" id="logRef">'+opts+'</select></div>'+
      '<div class="field"><label>内容</label><textarea class="input" id="logContent">'+(x?App.esc(x.content):'')+'</textarea></div>',
      { title:x?'编辑记录':'添加记录', saveText:'保存', onSave:function(close){
        var c=document.getElementById('logContent').value.trim(); if(!c){App.toast('请填写内容');return;}
        var obj={date:document.getElementById('logDate').value||App.Logic.todayStr(), refSop:document.getElementById('logRef').value, content:c};
        if(id){ Object.assign(x,obj); } else { obj.id='l'+Date.now(); obj.ts=Date.now(); l.push(obj); }
        App.data.work.logs=l; App.setData(App.data); close(); render(); App.toast('已保存');
      }}
    );
  }
  function delLog(id){ App.confirm('删除该记录？', function(){ App.data.work.logs=(App.data.work.logs||[]).filter(function(x){return x.id!==id;}); App.setData(App.data); render(); }); }

  // 清单
  function renderChecklists(){
    var c = App.data.work.checklists || [];
    var h = c.map(function(ck){
      var p = App.Logic.checklistProgress(ck);
      var items = (ck.items||[]).map(function(it,i){
        return '<div class="ck-item"><button class="ckbox" data-ck="'+ck.id+'" data-i="'+i+'">'+(it.done?'☑':'☐')+'</button><span class="cktxt'+(it.done?' done':'')+'">'+App.esc(it.t)+'</span><button class="del" data-item-del="'+ck.id+'" data-i="'+i+'">✕</button></div>';
      }).join('');
      return '<div class="card"><h2>'+App.esc(ck.title)+' <span class="sum-line">'+p.done+'/'+p.total+'</span></h2>'+items+
        '<div class="row" style="margin-top:8px"><input class="input" data-item-input="'+ck.id+'" placeholder="添加一项，回车确认"></div>'+
        '<div class="acts"><button data-run-toggle="'+ck.id+'">'+(ck.running?'结束清单':'开始清单')+'</button><button class="del" data-ck-del="'+ck.id+'">删除清单</button></div></div>';
    }).join('');
    return (h||'<div class="placeholder">暂无清单。</div>')+'<button class="mbtn ghost" id="btnAddCk">＋ 新建清单</button>';
  }
  function toggleItem(id,i){ var c=App.data.work.checklists.find(function(x){return x.id===id;}); if(c&&c.items[i]){ c.items[i].done=!c.items[i].done; App.setData(App.data); render(); } }
  function delItem(id,i){ App.deleteWithUndo({ apply:function(){ var c=App.data.work.checklists.find(function(x){return x.id===id;}); if(c){ c.items.splice(parseInt(i,10),1); } }, render:render }); }
  function addItem(id){ var inp=container.querySelector('[data-item-input="'+id+'"]'); var v=inp?inp.value.trim():''; if(!v)return; var c=App.data.work.checklists.find(function(x){return x.id===id;}); if(c){ c.items=c.items||[]; c.items.push({t:v,done:false}); App.setData(App.data); render(); } }
  function delChecklist(id){ App.confirm('删除整个清单？', function(){ App.data.work.checklists=(App.data.work.checklists||[]).filter(function(x){return x.id!==id;}); App.setData(App.data); render(); }); }
  function addChecklist(){
    App.openModal('<div class="field"><label>清单标题</label><input class="input" id="ckTitle"></div><div class="field"><label>初始项目（每行一项，可留空）</label><textarea class="input" id="ckItems"></textarea></div>',
      { title:'新建清单', saveText:'创建', onSave:function(close){
        var t=document.getElementById('ckTitle').value.trim(); if(!t){App.toast('请填写标题');return;}
        var items=(document.getElementById('ckItems').value||'').split('\n').map(function(s){return s.trim();}).filter(Boolean).map(function(s){return {t:s,done:false};});
        App.data.work.checklists=App.data.work.checklists||[]; App.data.work.checklists.push({id:'c'+Date.now(),title:t,items:items,ts:Date.now()});
        App.setData(App.data); close(); render(); App.toast('已创建');
      }}
    );
  }

  render();
});
})();