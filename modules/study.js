/* modules/study.js —— 学习计划 */
(function(){
'use strict';
App.register('study', function(container){
  var sub = 'goals';
  var q = '';
  var reviewing = false, revQueue = [], revIdx = 0, revFlipped = false;
  
  function render(){
    var tabs = container.querySelector('.seg2-tabs');
    if(!tabs){
      var arr = [['goals','计划'],['notes','笔记'],['resources','资料'],['cards','闪卡'],['reviews','复盘']];
      container.innerHTML = '<div class="seg2 seg2-tabs">'+arr.map(function(t){ return '<button data-sub="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>';
      tabs = container.querySelector('.seg2-tabs');
      tabs.addEventListener('click', function(e){ var b=e.target.closest('button[data-sub]'); if(b){ sub=b.getAttribute('data-sub'); reviewing=false; revFlipped=false; render(); } });
      var bd = document.createElement('div'); bd.id = 'studyBody'; tabs.after(bd);
    }
    tabs.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sub')===sub); });
    var body = container.querySelector('#studyBody');
    body.innerHTML = renderBody();
    bind();
  }

  function bind(){
    var body = container.querySelector('#studyBody');
    if(sub==='goals'){
      body.querySelectorAll('[data-toggle]').forEach(function(b){ b.addEventListener('click', function(){ var g=App.data.study.goals.find(function(x){return x.id===b.getAttribute('data-toggle');}); if(g){g.done=!g.done;App.setData(App.data);render();} }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-del'); App.deleteWithUndo({ apply:function(){ App.data.study.goals=(App.data.study.goals||[]).filter(function(x){return x.id!==id;}); }, render:render }); }); });
      var inp=body.querySelector('#goalInput'); if(inp) inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var v=inp.value.trim(); if(!v){App.toast('请输入内容');return;} App.data.study.goals=App.data.study.goals||[]; App.data.study.goals.push({id:'g'+Date.now(),text:v,done:false,ts:Date.now()}); App.setData(App.data); render(); } });
    }
    if(sub==='notes'||sub==='resources'||sub==='reviews'||sub==='cards'){
      body.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ editItem(b.getAttribute('data-edit')); }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ delItem(b.getAttribute('data-del')); }); });
      var a=body.querySelector('#btnAdd'); if(a) a.addEventListener('click', function(){ editItem(null); });
      var si=body.querySelector('.search-input'); if(si){ var composing=false; si.addEventListener('compositionstart', function(){ composing=true; }); si.addEventListener('compositionend', function(){ composing=false; setTimeout(applySearch,0); }); si.addEventListener('input', function(){ if(composing) return; applySearch(); }); function applySearch(){ q=si.value; var pos=si.selectionStart; render(); var nsi=container.querySelector('.search-input'); if(nsi){ nsi.focus(); nsi.setSelectionRange(pos,pos); } } }
    }
    if(sub==='cards'){
      body.querySelectorAll('[data-flip]').forEach(function(el){ el.addEventListener('click', function(){ flipCard(el.getAttribute('data-flip')); }); });
      var br=body.querySelector('#btnReview'); if(br) br.addEventListener('click', function(){ revQueue=App.Logic.dueCards(App.data.study.cards||[], App.Logic.todayStr()); revIdx=0; revFlipped=false; reviewing=true; render(); });
      var bs=body.querySelector('#btnShow'); if(bs) bs.addEventListener('click', function(){ revFlipped=true; render(); });
      body.querySelectorAll('[data-q]').forEach(function(b){ b.addEventListener('click', function(){ var qv=parseInt(b.getAttribute('data-q'),10); var card=revQueue[revIdx]; if(card){ var u=App.Logic.sm2Review(card, qv, App.Logic.todayStr()); card.easeFactor=u.easeFactor; card.repetition=u.repetition; card.interval=u.interval; card.due=u.due; } App.setData(App.data); revIdx++; revFlipped=false; if(revIdx>=revQueue.length){ reviewing=false; App.toast('今日复习完成 🎉'); } render(); }); });
    }
  }
  function renderBody(){
    if(sub==='goals'){
      var g=App.data.work?null:null;
      var arr=App.data.study.goals||[];
      var open=arr.filter(function(x){return !x.done;}), done=arr.filter(function(x){return x.done;});
      function row(x){ return '<div class="todo-item'+(x.done?' done':'')+'"><button class="ck" data-toggle="'+x.id+'">'+(x.done?'☑':'☐')+'</button><span class="txt">'+App.esc(x.text)+'</span><button class="del" data-del="'+x.id+'">✕</button></div>'; }
      return '<div class="card">'+ (arr.length? open.map(row).join('')+done.map(row).join('') : '<div class="placeholder">还没有学习目标，输入一条开始。</div>') +'<div class="row" style="margin-top:10px"><input class="input" id="goalInput" placeholder="添加目标 / 今日任务，回车确认"></div></div>';
    }
    if(sub==='notes'){
      var n=(App.data.study.notes||[]).filter(function(x){ return !q||(x.title||'').indexOf(q)>=0||(x.content||'').indexOf(q)>=0; });
      var h=n.map(function(x){return '<div class="card"><h2>'+App.esc(x.title||'（无标题）')+'</h2><p class="pre">'+App.esc(x.content)+'</p><div class="acts"><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>';}).join('');
      return searchBox()+(h||'<div class="placeholder">'+(q?'无匹配结果':'暂无笔记。')+'</div>')+'<button class="mbtn ghost" id="btnAdd">＋ 添加笔记</button>';
    }
    if(sub==='resources'){
      var r=(App.data.study.resources||[]).filter(function(x){ return !q||(x.title||'').indexOf(q)>=0||(x.progress||'').indexOf(q)>=0; });
      var h=r.map(function(x){return '<div class="card"><h2>'+typeL(x.type)+' · '+statusL(x.status)+' '+App.esc(x.title)+'</h2>'+(x.progress?'<div class="sum-line">'+App.esc(x.progress)+'</div>':'')+'<div class="acts"><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>';}).join('');
      return searchBox()+(h||'<div class="placeholder">'+(q?'无匹配结果':'暂无资料。')+'</div>')+'<button class="mbtn ghost" id="btnAdd">＋ 添加资料</button>';
    }
    if(sub==='cards'){
      if(reviewing) return renderReview();
      var due = App.Logic.dueCards(App.data.study.cards||[], App.Logic.todayStr());
      var c=(App.data.study.cards||[]).filter(function(x){ return !q||(x.front||'').indexOf(q)>=0||(x.back||'').indexOf(q)>=0; });
      var h=c.map(function(x){return '<div class="card"><div class="fc" data-flip="'+x.id+'">'+App.esc(App._flip&&App._flip[x.id]?x.back:x.front)+'</div><div class="sum-line" style="text-align:center">'+(App._flip&&App._flip[x.id]?'背面':'正面')+'（点击翻转）</div><div class="acts" style="justify-content:center"><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>';}).join('');
      var revBox = due.length ? '<div class="card"><h2>📇 今日复习</h2><div class="sum-line">有 '+due.length+' 张卡到期（含新卡）</div><button class="mbtn primary" id="btnReview">开始复习</button></div>' : '<div class="card"><h2>📇 今日复习</h2><div class="sum-line">今日没有到期卡片</div></div>';
      return revBox + searchBox() + (h||'<div class="placeholder">'+(q?'无匹配结果':'暂无闪卡。')+'</div>')+'<button class="mbtn ghost" id="btnAdd">＋ 添加闪卡</button>';
    }
        if(sub==='reviews'){
      var v=(App.data.study.reviews||[]).filter(function(x){ return !q||(x.content||'').indexOf(q)>=0||(x.period||'').indexOf(q)>=0; });
      var h=v.map(function(x){return '<div class="card"><h2>'+perL(x.period)+'</h2><p class="pre">'+App.esc(x.content)+'</p><div class="acts"><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>';}).join('');
      return searchBox()+(h||'<div class="placeholder">'+(q?'无匹配结果':'暂无复盘。')+'</div>')+'<button class="mbtn ghost" id="btnAdd">＋ 添加复盘</button>';
    }
    return '';
  }
  function renderReview(){
    var card = revQueue[revIdx];
    if(!card){ reviewing=false; return renderBody(); }
    var html = '<div class="card"><h2>📇 复习 '+(revIdx+1)+' / '+revQueue.length+'</h2>';
    if(!revFlipped){ html += '<div class="fc">'+App.esc(card.front)+'</div><button class="mbtn primary" id="btnShow">显示答案</button>'; }
    else { html += '<div class="fc">'+App.esc(card.front)+'</div><div class="sum-line" style="text-align:center;margin:8px 0">—— 答案 ——</div><div class="fc">'+App.esc(card.back)+'</div>'; html += '<div class="row" style="margin-top:12px"><button class="mbtn danger" data-q="0">忘记</button><button class="mbtn ghost" data-q="2">困难</button><button class="mbtn ghost" data-q="3">记得</button><button class="mbtn primary" data-q="4">轻松</button></div>'; }
    html += '</div>';
    return html;
  }
  function searchBox(){ return '<div class="row" style="margin-bottom:8px"><input class="input search-input" placeholder="搜索当前列表" value="'+App.esc(q)+'"></div>'; }
  function typeL(t){ return t==='book'?'📖 书':(t==='course'?'🎓 课程':(t==='article'?'📄 文章':'🎬 视频')); }
  function statusL(s){ return s==='want'?'想看':(s==='doing'?'在读':'读完'); }
  function perL(p){ return p==='week'?'周复盘':(p==='month'?'月复盘':'复盘'); }

  function editItem(id){
    var arr = sub==='notes'?App.data.study.notes:sub==='resources'?App.data.study.resources:sub==='reviews'?App.data.study.reviews:App.data.study.cards;
    var x = id?arr.find(function(y){return y.id===id;}):null;
    var body='';
    if(sub==='notes'){ body='<div class="field"><label>标题</label><input class="input" id="f1" value="'+(x?App.esc(x.title||''):'')+'"></div><div class="field"><label>内容</label><textarea class="input" id="f2">'+(x?App.esc(x.content):'')+'</textarea></div>'; }
    if(sub==='resources'){ body='<div class="field"><label>标题</label><input class="input" id="f1" value="'+(x?App.esc(x.title):'')+'"></div><div class="row"><div class="field"><label>类型</label><select class="input" id="f2"><option value="book"'+(x&&x.type==='book'?' selected':'')+'>书</option><option value="course"'+(x&&x.type==='course'?' selected':'')+'>课程</option><option value="article"'+(x&&x.type==='article'?' selected':'')+'>文章</option><option value="video"'+(x&&x.type==='video'?' selected':'')+'>视频</option></select></div><div class="field"><label>状态</label><select class="input" id="f3"><option value="want"'+(x&&x.status==='want'?' selected':'')+'>想看</option><option value="doing"'+(x&&x.status==='doing'?' selected':'')+'>在读</option><option value="done"'+(x&&x.status==='done'?' selected':'')+'>读完</option></select></div></div><div class="field"><label>进度</label><input class="input" id="f4" value="'+(x?App.esc(x.progress||''):'')+'"></div>'; }
    if(sub==='reviews'){ body='<div class="field"><label>周期</label><select class="input" id="f1"><option value="week"'+(x&&x.period==='week'?' selected':'')+'>周复盘</option><option value="month"'+(x&&x.period==='month'?' selected':'')+'>月复盘</option><option value="other"'+(x&&x.period==='other'?' selected':'')+'>其他</option></select></div><div class="field"><label>内容</label><textarea class="input" id="f2">'+(x?App.esc(x.content):'')+'</textarea></div>'; }
    if(sub==='cards'){ body='<div class="field"><label>正面（问题）</label><input class="input" id="f1" value="'+(x?App.esc(x.front):'')+'"></div><div class="field"><label>背面（答案）</label><textarea class="input" id="f2">'+(x?App.esc(x.back):'')+'</textarea></div>'; }
    App.openModal(body, { title:x?'编辑':'添加', saveText:'保存', onSave:function(close){
      var obj={};
      if(sub==='notes'){ obj={title:document.getElementById('f1').value.trim(),content:document.getElementById('f2').value}; }
      if(sub==='resources'){ var t=document.getElementById('f1').value.trim(); if(!t){App.toast('请填写标题');return;} obj={title:t,type:document.getElementById('f2').value,status:document.getElementById('f3').value,progress:document.getElementById('f4').value.trim()}; }
      if(sub==='reviews'){ obj={period:document.getElementById('f1').value,content:document.getElementById('f2').value}; }
      if(sub==='cards'){ var f=document.getElementById('f1').value.trim(),b=document.getElementById('f2').value.trim(); if(!f||!b){App.toast('请填写正反面');return;} obj={front:f,back:b}; }
      if(id){ Object.assign(x,obj); } else { obj.id=sub[0]+Date.now(); obj.ts=Date.now(); arr.push(obj); }
      if(sub==='notes')App.data.study.notes=arr; if(sub==='resources')App.data.study.resources=arr; if(sub==='reviews')App.data.study.reviews=arr; if(sub==='cards')App.data.study.cards=arr;
      App.setData(App.data); close(); render(); App.toast('已保存');
    }});
  }
  function delItem(id){ App.confirm('确定删除？', function(){
    if(sub==='notes')App.data.study.notes=(App.data.study.notes||[]).filter(function(x){return x.id!==id;});
    if(sub==='resources')App.data.study.resources=(App.data.study.resources||[]).filter(function(x){return x.id!==id;});
    if(sub==='reviews')App.data.study.reviews=(App.data.study.reviews||[]).filter(function(x){return x.id!==id;});
    if(sub==='cards')App.data.study.cards=(App.data.study.cards||[]).filter(function(x){return x.id!==id;});
    App.setData(App.data); render();
  }); }
  function flipCard(id){ App._flip = App._flip || {}; App._flip[id]=!App._flip[id]; render(); }



  render();
});
})();