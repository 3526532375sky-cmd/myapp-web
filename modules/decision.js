/* modules/decision.js —— 决策 */
(function(){
'use strict';
App.register('decision', function(container){
  var sub='entries', filter='all';
  var q='';
  function render(){
    var tabs = container.querySelector('.seg2-tabs');
    if(!tabs){
      container.innerHTML = '<div class="seg2 seg2-tabs"><button data-sub="entries">决策</button><button data-sub="manuals">手册</button></div>';
      tabs = container.querySelector('.seg2-tabs');
      tabs.addEventListener('click', function(e){ var b=e.target.closest('button[data-sub]'); if(b){ sub=b.getAttribute('data-sub'); render(); } });
      var bd = document.createElement('div'); bd.id = 'decBody'; tabs.after(bd);
    }
    tabs.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sub')===sub); });
    var body = container.querySelector('#decBody');
    body.innerHTML = searchBox() + renderBody();
    bind();
  }

  function searchBox(){ return '<div class="row" style="margin-bottom:8px"><input class="input search-input" placeholder="搜索当前列表" value="'+App.esc(q)+'"></div>'; }
  function bind(){
    var body=container.querySelector('#decBody');
    var si=body.querySelector('.search-input'); if(si){ var composing=false; si.addEventListener('compositionstart', function(){ composing=true; }); si.addEventListener('compositionend', function(){ composing=false; setTimeout(applySearch,0); }); si.addEventListener('input', function(){ if(composing) return; applySearch(); }); function applySearch(){ q=si.value; var pos=si.selectionStart; render(); var nsi=container.querySelector('.search-input'); if(nsi){ nsi.focus(); nsi.setSelectionRange(pos,pos); } } }
    if(sub==='entries'){
      var f=body.querySelector('#decFilter'); if(f) f.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b)return; filter=b.getAttribute('data-f'); render(); });
      body.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ editEntry(b.getAttribute('data-edit')); }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-del'); App.deleteWithUndo({ apply:function(){ App.data.decisions.entries=(App.data.decisions.entries||[]).filter(function(x){return x.id!==id;}); }, render:render }); }); });
      var a=body.querySelector('#btnAdd'); if(a) a.addEventListener('click', function(){ editEntry(null); });
      var qi=body.querySelector('#quickDecision'); if(qi) qi.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var v=qi.value.trim(); if(!v){ App.toast('请输入内容'); return; } App.data.decisions.entries=App.data.decisions.entries||[]; App.data.decisions.entries.push({id:'d'+Date.now(), name:v, verdict:'wait', evidence:'C', cm:'低', ct:'低', cw:'低', benefit:'中', domain:'其他', ts:Date.now()}); App.setData(App.data); render(); App.toast('已记入待定'); } });
    }
    if(sub==='manuals'){
      body.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ editManual(b.getAttribute('data-edit')); }); });
      body.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-del'); App.deleteWithUndo({ apply:function(){ App.data.decisions.manuals=(App.data.decisions.manuals||[]).filter(function(x){return x.id!==id;}); }, render:render }); }); });
      var a=body.querySelector('#btnAdd'); if(a) a.addEventListener('click', function(){ editManual(null); });
    }
  }
  function renderBody(){
    if(sub==='entries'){
      var board=App.Logic.decisionBoard(App.data.decisions.entries||[]);
      if(q){ ['do','no','wait'].forEach(function(k){ board[k]=board[k].filter(function(e){ return (e.name||'').indexOf(q)>=0||(e.plain||'').indexOf(q)>=0||(e.note||'').indexOf(q)>=0||(e.source||'').indexOf(q)>=0; }); }); }
      function col(k, title, icon){
        var items=board[k].map(function(e){ var ms=App.Logic.matchManuals(e, App.data.decisions.manuals||[]); var mh=ms.length?'<div class="sum-line">📖 相关原则：'+ms.slice(0,2).map(function(m){return App.esc(m.title);}).join('、')+'</div>':''; return '<div class="card"><h2>'+App.esc(e.name)+'</h2>'+(e.plain?'<div class="sum-line">'+App.esc(e.plain)+'</div>':'')+mh+'<div class="acts"><button data-edit="'+e.id+'">编辑</button><button data-del="'+e.id+'">删除</button></div></div>'; }).join('');
        return '<div class="board-col"><h2>'+icon+' '+title+' <span class="sum-line">'+board[k].length+'</span></h2>'+(items||'<div class="placeholder">无</div>')+'</div>';
      }
      return '<div class="card"><div class="row"><input class="input" id="quickDecision" placeholder="记一个待决策，回车即存（以后再补细节）"></div></div><div class="board">'+col('wait','待定','🕐')+col('do','做','✅')+col('no','不做','🚫')+'</div><button class="mbtn ghost" id="btnAdd">＋ 完整添加决策</button>';
    }
    if(sub==='manuals'){
      var m=(App.data.decisions.manuals||[]).filter(function(x){ return !q||(x.title||'').indexOf(q)>=0||(x.content||'').indexOf(q)>=0; });
      return (m.length?m.map(function(x){ return '<div class="card"><h2>📖 '+App.esc(x.title)+'</h2><p class="pre">'+App.esc(x.content)+'</p><div class="acts"><button data-edit="'+x.id+'">编辑</button><button data-del="'+x.id+'">删除</button></div></div>'; }).join(''):'<div class="placeholder">暂无手册。</div>')+'<button class="mbtn ghost" id="btnAdd">＋ 添加手册</button>';
    }
    return '';
  }
  function vL(v){ return v==='do'?'做':(v==='no'?'不做':'待定'); }
  function dL(d){ return d==='寿命'?'换寿命':(d==='钱'?'换钱':(d==='时间精力'?'换时间精力':(d==='自由'?'换人身自由':'其他'))); }
  function editEntry(id){
    var arr=App.data.decisions.entries||[], x=id?arr.find(function(y){return y.id===id;}):null;
    function sel(id,name,vals,cur){ return '<select class="input" id="'+id+'">'+vals.map(function(v){return '<option value="'+v+'"'+(cur===v?' selected':'')+'>'+name(v)+'</option>';}).join('')+'</select>'; }
    App.openModal(
      '<div class="field"><label>条目名称（动词开头）</label><input class="input" id="f1" value="'+(x?App.esc(x.name):'')+'"></div>'+
      '<div class="row"><div class="field"><label>钱</label>'+sel('f2',function(v){return v;},['低','中','高'],x?x.cm:'低')+'</div><div class="field"><label>时间</label>'+sel('f3',function(v){return v;},['低','中','高'],x?x.ct:'低')+'</div><div class="field"><label>毅力</label>'+sel('f4',function(v){return v;},['低','中','高'],x?x.cw:'低')+'</div></div>'+
      '<div class="field"><label>说人话（一句话好处）</label><input class="input" id="f5" value="'+(x?App.esc(x.plain||''):'')+'"></div>'+
      '<div class="row"><div class="field"><label>收益量级</label>'+sel('f6',function(v){return v;},['大','中','小'],x?x.benefit:'中')+'</div><div class="field"><label>收益口径</label>'+sel('f7',dL,['寿命','钱','时间精力','自由','其他'],x?x.domain:'其他')+'</div></div>'+
      '<div class="row"><div class="field"><label>证据等级</label>'+sel('f8',function(v){return v;},['A','B','C'],x?x.evidence:'C')+'</div><div class="field"><label>结论</label>'+sel('f9',vL,['do','no','wait'],x?x.verdict:'wait')+'</div></div>'+
      '<div class="field"><label>来源</label><input class="input" id="f10" value="'+(x?App.esc(x.source||''):'')+'"></div>'+
      '<div class="field"><label>备注</label><textarea class="input" id="f11">'+(x?App.esc(x.note||''):'')+'</textarea></div>',
      { title:x?'编辑决策':'添加决策', saveText:'保存', onSave:function(close){
        var n=document.getElementById('f1').value.trim(); if(!n){App.toast('请填写名称');return;}
        var obj={name:n,cm:document.getElementById('f2').value,ct:document.getElementById('f3').value,cw:document.getElementById('f4').value,plain:document.getElementById('f5').value.trim(),benefit:document.getElementById('f6').value,domain:document.getElementById('f7').value,evidence:document.getElementById('f8').value,verdict:document.getElementById('f9').value,source:document.getElementById('f10').value.trim(),note:document.getElementById('f11').value.trim()};
        if(id){ Object.assign(x,obj); } else { obj.id='d'+Date.now(); obj.ts=Date.now(); arr.push(obj); }
        App.data.decisions.entries=arr; App.setData(App.data); close(); render(); App.toast('已保存');
      }}
    );
  }
  function editManual(id){
    var arr=App.data.decisions.manuals||[], x=id?arr.find(function(y){return y.id===id;}):null;
    App.openModal('<div class="field"><label>标题</label><input class="input" id="f1" value="'+(x?App.esc(x.title):'')+'"></div><div class="field"><label>内容</label><textarea class="input" id="f2">'+(x?App.esc(x.content):'')+'</textarea></div>',
      { title:x?'编辑手册':'添加手册', saveText:'保存', onSave:function(close){
        var t=document.getElementById('f1').value.trim(); if(!t){App.toast('请填写标题');return;}
        var obj={title:t,content:document.getElementById('f2').value};
        if(id){ Object.assign(x,obj); } else { obj.id='m'+Date.now(); obj.ts=Date.now(); arr.push(obj); }
        App.data.decisions.manuals=arr; App.setData(App.data); close(); render(); App.toast('已保存');
      }}
    );
  }

  render();
});
})();