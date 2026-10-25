/* modules/today.js —— 今日计划 */
(function(){
'use strict';
App.register('today', function(container){
  function render(){
    var t = App.data.today || [];
    var s = App.Logic.todaySummary(t);
    var rv = App.Logic.dailyReview(t);
    var reviews = App.data.todayReviews || [];
    var review = reviews.find(function(x){ return x.date===App.Logic.todayStr(); });
    var open = t.filter(function(x){ return !x.done; });
    var done = t.filter(function(x){ return x.done; });
    var pct = s.total ? Math.round(s.done/s.total*100) : 0;

    function itemHtml(x){
      return '<div class="todo-item'+(x.done?' done':'')+'">'+
        '<button class="ck" data-toggle="'+x.id+'">'+(x.done?'☑':'☐')+'</button>'+
        '<span class="txt">'+App.esc(x.text)+'</span>'+
        '<button class="del" data-del="'+x.id+'">✕</button>'+
      '</div>';
    }

    container.innerHTML =
      '<div class="card"><div class="prog-track"><div class="prog-bar" style="width:'+pct+'%"></div></div>'+
      '<div class="prog-txt">已完成 '+s.done+' / '+s.total+'</div></div>'+
      '<div class="card">'+
        (open.length+done.length ? open.map(itemHtml).join('') + done.map(itemHtml).join('') : '<div class="placeholder">还没有计划，在下方输入一条开始。</div>')+
      '</div>'+
      '<div class="card"><div class="row"><input class="input" id="todayInput" placeholder="添加一项"><button class="mbtn primary" id="btnAddToday" style="flex:none;padding:0 16px">添加</button></div></div>'+
      '<div class="card"><h2>📝 今日复盘</h2>'+
        '<div class="sum-line">已完成 '+rv.done+' / '+rv.total+' 项'+(rv.undone.length?'，未完成：'+rv.undone.map(function(u){return App.esc(u);}).join('、'):'')+'</div>'+
        (review ? '<p class="pre">'+App.esc(review.content)+'</p>' : '<div class="row"><input class="input" id="reviewInput" placeholder="为什么没做完？明天怎么办？（回车保存）"></div>')+
      '</div>';

    container.querySelectorAll('[data-toggle]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-toggle');
        var t2 = App.data.today || [];
        var it = t2.find(function(x){ return x.id===id; });
        if(it){ it.done = !it.done; App.setData(App.data); render(); }
      });
    });
    container.querySelectorAll('[data-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-del');
        App.deleteWithUndo({
          apply: function(){
            App.data.today = (App.data.today||[]).filter(function(x){ return x.id!==id; });
          },
          render: render
        });
      });
    });
    var ri = container.querySelector('#reviewInput');
    if(ri){ ri.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var v=ri.value.trim(); if(!v){ App.toast('请输入复盘内容'); return; } App.data.todayReviews = App.data.todayReviews || []; App.data.todayReviews.push({id:'tr'+Date.now(), date:App.Logic.todayStr(), content:v, ts:Date.now()}); App.setData(App.data); render(); App.toast('复盘已保存'); } }); }
    var inp = container.querySelector('#todayInput');
    if(inp){
      var composing = false;
      inp.addEventListener('compositionstart', function(){ composing = true; });
      inp.addEventListener('compositionend', function(){ composing = false; });
      function addToday(){
        var v = inp.value.trim();
        if(!v){ App.toast('请输入内容'); return; }
        App.data.today = App.data.today || [];
        App.data.today.push({id:'t'+Date.now(), text:v, done:false, ts:Date.now()});
        App.setData(App.data); render();
      }
      var addBtn = container.querySelector('#btnAddToday');
      if(addBtn) addBtn.addEventListener('click', addToday);
      inp.addEventListener('keydown', function(e){
        if(e.key==='Enter' && !composing){ addToday(); }
      });
    }
  }
  render();
});
})();