/* modules/ledger.js —— 账本 */
(function(){
'use strict';
var sub = 'flow'; // 模块级：离开账本再回来保留，重启重置为流水
App.register('ledger', function(container){
  var L = App.Logic;
  var filter = 'all', query = '', openMonths = {};
  var editingId = null, editingBase = 0;

  var EMO = {餐饮:'🍚',交通:'🚌',购物:'🛒',居住:'🏠',水电燃气:'💡',娱乐:'🎮',医疗:'💊',教育:'📚',通讯:'📱',人情:'🎁',日用:'🧻',服饰:'👕',美容美发:'💇',运动:'⚽',宠物:'🐶',旅行:'✈️',烟酒:'🚬',保险:'🛡️',其他:'📦',工资:'💰',奖金:'🧧',理财:'📈',兼职:'💼',红包:'🧧',报销:'🧾',礼金:'🎁',退款:'↩️',二手:'🔄'};
  function emojiFor(c){ return EMO[c] || '🏷️'; }
  function catsOf(type){
    var base = type==='expense' ? L.EXPENSE : L.INCOME;
    var custom = (App.data.ledger.settings.customCats && App.data.ledger.settings.customCats[type]) || [];
    var all = base.concat(custom);
    var order = (App.data.ledger.settings.catOrder && App.data.ledger.settings.catOrder[type]) || [];
    if(order.length){ var seen={}, out=[]; order.forEach(function(c){ if(all.indexOf(c)>=0&&!seen[c]){out.push(c);seen[c]=true;} }); all.forEach(function(c){ if(!seen[c])out.push(c); }); return out; }
    return all;
  }
  function monthSum(){ return L.ledgerMonth(App.data.ledger.records || [], L.nowMonth()); }

  var PAGES = ['flow','stats','year','fin','cfg'];
  function render(){
    var ms = monthSum();
    var tabs = container.querySelector('.seg2-tabs');
    var strip = container.querySelector('.pager-strip');
    if(!tabs){
      container.innerHTML = '<div class="seg2 seg2-tabs">'+
        '<button data-sub="flow" class="on">流水</button>'+
        '<button data-sub="stats">统计</button>'+
        '<button data-sub="year">年度</button>'+
        '<button data-sub="fin">金融</button>'+
        '<button data-sub="cfg">设置</button>'+
        '</div>';
      tabs = container.querySelector('.seg2-tabs');
      tabs.addEventListener('click', function(e){ var b=e.target.closest('button[data-sub]'); if(b){ switchSub(b.getAttribute('data-sub')); } });
      var viewport = document.createElement('div'); viewport.className = 'pager-viewport';
      strip = document.createElement('div'); strip.className = 'pager-strip';
      strip.setAttribute('data-total', PAGES.length);
      strip.setAttribute('data-idx', PAGES.indexOf(sub));
      strip.style.width = (PAGES.length * 100) + '%';
      PAGES.forEach(function(s){ var p=document.createElement('div'); p.className='pager-page'; p.setAttribute('data-page', s); strip.appendChild(p); });
      viewport.appendChild(strip);
      tabs.after(viewport);
      var fab = document.createElement('button');
      fab.className = 'fab';
      fab.id = 'btnAddRecord';
      fab.type = 'button';
      fab.setAttribute('aria-label', '记一笔');
      fab.textContent = '＋';
      fab.addEventListener('click', function(){ openRecordModal(null); });
      container.appendChild(fab);
    }
    var fab = container.querySelector('#btnAddRecord');
    if(fab) fab.style.display = (sub==='flow') ? '' : 'none';
    tabs.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sub')===sub); });
    renderAllPages(ms);
    positionStrip(false);
    bindAll();
  }
  function statArea(ms){
    return '<div class="stat3">'+
      '<div class="stat-item"><div class="sl">本月支出</div><div class="sv exp">'+L.fmtMoney(ms.expense)+'</div></div>'+
      '<div class="stat-item"><div class="sl">本月收入</div><div class="sv inc">'+L.fmtMoney(ms.income)+'</div></div>'+
      '<div class="stat-item"><div class="sl">本月结余</div><div class="sv '+(ms.balance<0?'exp':'inc')+'">'+L.fmtMoney(ms.balance)+'</div></div>'+
      '</div>' + goalBudgetHtml(ms);
  }
  function renderAllPages(ms){
    PAGES.forEach(function(s){
      var pg = container.querySelector('[data-page="'+s+'"]'); if(!pg) return;
      var html = '';
      if(s==='flow') html = statArea(ms) + renderFlow();
      else if(s==='stats') html = renderStats();
      else if(s==='year') html = renderYear();
      else if(s==='fin') html = renderFin();
      else html = renderCfg();
      pg.innerHTML = html;
    });
  }
  function positionStrip(animate){
    var strip = container.querySelector('.pager-strip'); if(!strip) return;
    var total = parseInt(strip.getAttribute('data-total') || '1', 10);
    var idx = PAGES.indexOf(sub); if(idx<0) idx=0;
    strip.setAttribute('data-idx', idx);
    strip.style.transition = animate ? 'transform .18s cubic-bezier(.22,.61,.36,1)' : 'none';
    strip.style.transform = 'translateX(' + (-idx*(100/total)) + '%)';
  }
  function switchSub(s){
    sub = s;
    var fab = container.querySelector('#btnAddRecord');
    if(fab) fab.style.display = (sub==='flow') ? '' : 'none';
    container.querySelectorAll('.seg2-tabs button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sub')===sub); });
    positionStrip(true);
  }


  function goalBudgetHtml(ms){
    var s = App.data.ledger.settings || {};
    var g=s.goal, b=s.monthBudget;
    if(!g && !b) return '';
    var html = '<div class="stat3">';
    if(g){ var p=Math.min(100,Math.max(0,Math.round(ms.balance/g*100))); var reached=ms.balance>=g; html+='<div class="stat-item"><div class="sl">结余目标</div><div class="sv">'+L.fmtMoney(g)+'</div><div class="prog-track thick"><div class="prog-bar" style="width:'+p+'%;background:'+(reached?'var(--success)':'var(--accent)')+'"></div></div></div>'; }
    if(b){ var p2=Math.min(100,Math.round(ms.expense/b*100)); var over=ms.expense>b; html+='<div class="stat-item"><div class="sl">支出预算</div><div class="sv">'+L.fmtMoney(b)+'</div><div class="prog-track thick"><div class="prog-bar" style="width:'+p2+'%;background:'+(over?'var(--danger)':'var(--accent)')+'"></div></div></div>'; }
    html += '</div>';
    return html;
  }

  function bindAll(){
    var pg = function(s){ return container.querySelector('[data-page="'+s+'"]'); };
    var body = pg('flow');
    if(body){
      var s = body.querySelector('#flowFilter'); if(s) s.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b)return; filter=b.getAttribute('data-f'); render(); });
      var q = body.querySelector('#flowSearch'); if(q) q.addEventListener('input', function(){ query=q.value.trim(); renderFlowOnly(); });
      var bs = body.querySelector('#btnSearch'); if(bs) bs.addEventListener('click', function(){ var sb=container.querySelector('#searchBox'); if(!sb) return; var open=sb.classList.toggle('open'); this.classList.toggle('on', open); if(open){ var si=sb.querySelector('#flowSearch'); if(si) si.focus(); } });
      var bc = body.querySelector('#btnSearchClear'); if(bc) bc.addEventListener('click', function(){ var si=container.querySelector('#flowSearch'); if(si) si.value=''; query=''; renderFlowOnly(); var sb=container.querySelector('#searchBox'); if(sb) sb.classList.remove('open'); var bt=container.querySelector('#btnSearch'); if(bt) bt.classList.remove('on'); });

      var qb = body.querySelector('#quickBar'); if(qb) qb.addEventListener('click', function(e){ var b=e.target.closest('button[data-qi]'); if(!b)return; quickOpen(parseInt(b.getAttribute('data-qi'),10)); });
      bindFlow();
    }
    body = pg('cfg');
    if(body){
      var bs = body.querySelector('#btnBudgetSave'); if(bs) bs.addEventListener('click', saveBudget);
      var ba = body.querySelector('#btnBillAdd'); if(ba) ba.addEventListener('click', addBill);
      body.querySelectorAll('[data-bill-del]').forEach(function(b){ b.addEventListener('click', function(){ delBill(b.getAttribute('data-bill-del')); }); });
      var io = body.querySelector('#btnImportOld'); if(io) io.addEventListener('click', importOldLedger);
      var gs = body.querySelector('#btnGoalSave'); if(gs) gs.addEventListener('click', saveGoal);
      var ht = body.querySelector('#hideToggle'); if(ht) ht.addEventListener('change', toggleHide);
      var ae = body.querySelector('#btnAddExp'); if(ae) ae.addEventListener('click', function(){ addCat('expense'); });
      var ai = body.querySelector('#btnAddInc'); if(ai) ai.addEventListener('click', function(){ addCat('income'); });
      body.querySelectorAll('[data-cat-del]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-cat-del').split('|'); removeCat(p[0],p[1]); }); });
      body.querySelectorAll('.cat-chip').forEach(function(chip){
        chip.addEventListener('dragstart', function(e){ dragCatIdx = chip.getAttribute('data-cidx'); dragCatType = chip.getAttribute('data-cat'); if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', chip.getAttribute('data-cname')); } });
        chip.addEventListener('dragover', function(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move'; });
        chip.addEventListener('drop', function(e){ e.preventDefault(); var ti=chip.getAttribute('data-cidx'), tt=chip.getAttribute('data-cat'); if(tt===dragCatType && dragCatIdx!==null && dragCatIdx!==ti){ moveCat(tt, parseInt(dragCatIdx,10), parseInt(ti,10)); } });
      });
      var aq = body.querySelector('#btnAddQuick'); if(aq) aq.addEventListener('click', addQuick);
      var qt = body.querySelector('#newQType'); if(qt){ qt.addEventListener('change', fillQuickCat); fillQuickCat(); }
      body.querySelectorAll('[data-quick-del]').forEach(function(b){ b.addEventListener('click', function(){ delQuick(b.getAttribute('data-quick-del')); }); });
      var ce = body.querySelector('#btnExportCSV'); if(ce) ce.addEventListener('click', exportCSV);
    }
    body = pg('year');
    if(body){
      body.querySelectorAll('[data-yp]').forEach(function(b){ b.addEventListener('click', function(){ year = String(parseInt(year,10)+parseInt(b.getAttribute('data-yp'),10)); render(); }); });
      var ys = body.querySelector('#yearSeg'); if(ys) ys.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b)return; yearMode=b.getAttribute('data-ym'); render(); });
    }
    body = pg('fin');
    if(body){
      var ha = body.querySelector('#btnHoldAdd'); if(ha) ha.addEventListener('click', function(){ openHoldingModal(null); });
      body.querySelectorAll('[data-hold-edit]').forEach(function(b){ b.addEventListener('click', function(){ openHoldingModal(b.getAttribute('data-hold-edit')); }); });
      body.querySelectorAll('[data-hold-del]').forEach(function(b){ b.addEventListener('click', function(){ delHolding(b.getAttribute('data-hold-del')); }); });
      var na = body.querySelector('#btnFinNoteAdd'); if(na) na.addEventListener('click', addFinNote);
      body.querySelectorAll('[data-fnote-del]').forEach(function(b){ b.addEventListener('click', function(){ delFinNote(b.getAttribute('data-fnote-del')); }); });
    }
  }

  // ===== 流水 ===== 
  function filtered(){
    var r = App.data.ledger.records || [];
    if(filter!=='all') r = r.filter(function(x){ return x.type===filter; });
    if(query) r = r.filter(function(x){ return (x.category&&x.category.indexOf(query)>=0)||(x.note&&x.note.indexOf(query)>=0); });
    return r.slice().sort(function(a,b){ return a.date<b.date?1:(a.date>b.date?-1:0); });
  }
  function bindFlow(){
    var box = container.querySelector('#flowList'); if(!box) return;
    box.querySelectorAll('[data-mk]').forEach(function(b){ b.addEventListener('click', function(){ var mk=b.getAttribute('data-mk'); openMonths[mk]=!openMonths[mk]; renderFlowOnly(); }); });
    box.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ delRecord(b.getAttribute('data-del')); }); });
    box.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ openRecordModal(b.getAttribute('data-edit')); }); });
  }
  function renderFlowOnly(){ var box=container.querySelector('#flowList'); if(box) box.innerHTML=flowTreeHtml(); bindFlow(); }
  function flowTreeHtml(){
    var r = filtered();
    if(!r.length) return '<div class="placeholder">暂无记录，点右下角记一笔。</div>';
    var years={}; r.forEach(function(x){ var y=x.date.slice(0,4),m=x.date.slice(5,7); if(!years[y])years[y]={}; if(!years[y][m])years[y][m]=[]; years[y][m].push(x); });
    var h='';
    Object.keys(years).sort().reverse().forEach(function(y){
      h += '<div class="tree-year">'+y+' 年</div>';
      var months=years[y];
      Object.keys(months).sort().reverse().forEach(function(m){
        var mk=y+'-'+m, arr=months[m]; var de=0,di=0; arr.forEach(function(x){ if(x.type==='expense')de+=Number(x.amount); else di+=Number(x.amount); });
        var open=!!openMonths[mk];
        h += '<div class="tree-month"><button class="tm-head" data-mk="'+mk+'"><span class="tm-label">'+parseInt(m,10)+' 月 <span class="tm-caret">'+(open?'▾':'▸')+'</span></span><span class="tm-sums"><span class="exp">支<span class="v">'+L.fmtMoney(de)+'</span></span><span class="inc">收<span class="v">'+L.fmtMoney(di)+'</span></span></span></button>';
        if(open){
          var days={}; arr.forEach(function(x){ if(!days[x.date])days[x.date]=[]; days[x.date].push(x); });
          Object.keys(days).sort().reverse().forEach(function(d){
            h += '<div class="day-head">'+d+'</div>';
            days[d].forEach(function(x){
              h += '<div class="rec-row"><span class="cat">'+emojiFor(x.category)+' '+(x.type==='expense'?'－':'＋')+' '+App.esc(x.category)+'</span><span class="note">'+App.esc(x.note||'')+'</span><span class="amt '+(x.type==='expense'?'exp':'inc')+'">'+L.fmtMoney(Number(x.amount))+'</span><button class="del" data-edit="'+x.id+'" title="编辑">✎</button><button class="del" data-del="'+x.id+'">✕</button></div>';
            });
          });
        }
        h += '</div>';
      });
    });
    return h;
  }
  function renderFlow(){
    var quick = App.data.ledger.settings.quick || [];
    var qh = quick.length ? '<div class="card"><div class="sum-line">⚡ 快捷记账</div><div id="quickBar" class="quick-row">'+quick.map(function(q,i){ return '<button class="mbtn ghost" data-qi="'+i+'">'+emojiFor(q.category)+' '+App.esc(q.name||q.category)+'</button>'; }).join('')+'</div></div>' : '';
    return qh +
      '<div class="card"><div class="flow-top">'+
      '<div class="seg2" id="flowFilter">'+
      '<button data-f="all" class="'+(filter==='all'?'on':'')+'">全部</button>'+
      '<button data-f="expense" class="'+(filter==='expense'?'on':'')+'">支出</button>'+
      '<button data-f="income" class="'+(filter==='income'?'on':'')+'">收入</button>'+
      '</div>'+
      '<button type="button" class="search-toggle'+(query?' on':'')+'" id="btnSearch" aria-label="搜索" title="搜索">🔍</button>'+
      '</div>'+
      '<div class="search-box'+(query?' open':'')+'" id="searchBox"><span class="search-ico">🔍</span><input class="input" id="flowSearch" placeholder="搜索分类或备注…" value="'+App.esc(query)+'"><button type="button" class="search-clear" id="btnSearchClear" aria-label="清空并关闭">✕</button></div>'+
      '<div id="flowList" style="margin-top:10px">'+flowTreeHtml()+'</div></div>';
  }
  function quickOpen(i){
    var q = (App.data.ledger.settings.quick||[])[i]; if(!q) return;
    openRecordModal(null, q.type, q.category, q.amount, q.name);
  }
  function openRecordModal(id, presetType, presetCat, presetAmount, presetNote){
    var r = id ? (App.data.ledger.records||[]).find(function(x){return x.id===id;}) : null;
    editingId = id; editingBase = r ? Number(r.amount) : 0;
    var type = r ? r.type : (presetType||'expense');
    var curType = type;
    function optsFor(t){ return catsOf(t).map(function(c){ return '<option value="'+App.esc(c)+'">'+emojiFor(c)+' '+App.esc(c)+'</option>'; }).join(''); }
    App.openModal(
      '<div class="field"><label>类型</label><div class="seg2 type-seg" id="recTypeSeg"><button type="button" data-rt="expense" class="'+(curType==='expense'?'on':'')+'">支出</button><button type="button" data-rt="income" class="'+(curType==='income'?'on':'')+'">收入</button></div></div>'+
      '<div class="field"><label>金额'+(r?'（原 '+L.fmtMoney(editingBase)+'，可输 +50/-30 加减）':'')+'</label><input class="input" id="recAmount" inputmode="decimal" value="'+(r?r.amount:(presetAmount||''))+'"></div>'+
      '<div class="field"><label>分类</label><select class="input" id="recCat">'+optsFor(curType)+'</select></div>'+
      '<div class="field"><label>日期</label><input class="input" id="recDate" type="date" value="'+(r?r.date:L.todayStr())+'"></div>'+
      '<div class="field"><label>备注</label><input class="input" id="recNote" value="'+(r?App.esc(r.note||''):App.esc(presetNote||''))+'"></div>',
      { title: r?'编辑记录':'记一笔', saveText:'保存', onSave:function(close){
        var amt = parsePlus(document.getElementById('recAmount').value, editingId?editingBase:0);
        if(amt==null||amt<=0){ App.toast('请输入有效金额'); return; }
        var t2 = curType;
        var obj = { type:t2, amount:amt, category:document.getElementById('recCat').value, date:document.getElementById('recDate').value||L.todayStr(), note:document.getElementById('recNote').value.trim() };
        if(editingId){ App.data.ledger.records = (App.data.ledger.records||[]).map(function(x){ return x.id===editingId ? Object.assign({}, x, obj) : x; }); }
        else { obj.id='r'+Date.now(); obj.ts=Date.now(); App.data.ledger.records = (App.data.ledger.records||[]).concat([obj]); }
        App.setData(App.data); close(); render(); App.toast(editingId?'已修改':'已记录');
      }}
    );
    var seg = document.getElementById('recTypeSeg');
    seg.addEventListener('click', function(e){
      var b = e.target.closest('button[data-rt]'); if(!b) return;
      curType = b.getAttribute('data-rt');
      seg.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
      var cat=document.getElementById('recCat'); var cur=cat.value;
      cat.innerHTML=optsFor(curType);
      if(cur && catsOf(curType).indexOf(cur)>=0) cat.value=cur;
    });
    var sel = document.getElementById('recCat'); if(r||presetCat){ if(catsOf(curType).indexOf(r?r.category:presetCat)>=0) sel.value = r?r.category:presetCat; }
  }
  function parsePlus(v, base){
    v = String(v).trim();
    if(v==='') return null;
    if(/^[+-]/.test(v)){ var d = parseFloat(v); return isNaN(d)?null:base+d; }
    var n = parseFloat(v); return isNaN(n)?null:n;
  }
  function delRecord(id){
    App.confirm('确定删除这条记录吗？', function(){
      App.data.ledger.records = (App.data.ledger.records||[]).filter(function(x){ return x.id!==id; });
      App.setData(App.data); render(); App.toast('已删除');
    });
  }

  // ===== 统计 =====
  var year = String(new Date().getFullYear()), yearMode = 'both', dragCatIdx = null, dragCatType = null;
  function fmtM(n){ return App.data.ledger.settings.hide ? '•••' : L.fmtMoney(n); }
  function catColor(i){ var colors=['#60a5fa','#6ecb9a','#f5b971','#a78bfa','#e07a7a','#5ec8c2','#93c5fd','#fbbf24']; return colors[i%colors.length]; }

  function shortNum(n){ n=Number(n)||0; if(Math.abs(n)>=10000) return (n/10000).toFixed(1)+'万'; if(Math.abs(n)>=1000) return (n/1000).toFixed(1)+'k'; return String(Math.round(n)); }
  function svgBarsHtml(recs, months, mode){
    var data=[], max=0;
    months.forEach(function(mk){ var s=L.ledgerMonth(recs,mk); data.push({mk:mk,e:s.expense,i:s.income}); if(mode!=='income')max=Math.max(max,s.expense); if(mode!=='expense')max=Math.max(max,s.income); });
    if(max===0) return '<div class="placeholder">暂无数据</div>';
    var W=600,H=220,padL=46,padB=24,padT=8,plotW=W-padL-12,plotH=H-padT-padB,n=data.length,bw=plotW/n;
    var html='<svg viewBox="0 0 '+W+' '+H+'" width="100%">';
    for(var g=0;g<=4;g++){ var val=max*g/4,y=padT+plotH-g*plotH/4; html+='<line x1="'+padL+'" y1="'+y+'" x2="'+(W-12)+'" y2="'+y+'" stroke="var(--border)" stroke-dasharray="3 4"/>'; html+='<text x="'+(padL-6)+'" y="'+(y+3.5)+'" font-size="10" text-anchor="end" fill="var(--text-3)">'+shortNum(val)+'</text>'; }
    data.forEach(function(x,idx){ var cx=padL+idx*bw+bw/2;
      if(mode!=='income'){ var he=x.e/max*plotH; html+='<rect x="'+(cx-bw*0.36)+'" y="'+(padT+plotH-he)+'" width="'+(bw*0.32)+'" height="'+(he>0?he:1)+'" rx="3" fill="var(--success)"><title>支出 '+L.fmtMoney(x.e)+'</title></rect>'; }
      if(mode!=='expense'){ var hi=x.i/max*plotH; html+='<rect x="'+(cx+bw*0.04)+'" y="'+(padT+plotH-hi)+'" width="'+(bw*0.32)+'" height="'+(hi>0?hi:1)+'" rx="3" fill="var(--danger)"><title>收入 '+L.fmtMoney(x.i)+'</title></rect>'; }
      html+='<text x="'+cx+'" y="'+(H-6)+'" font-size="9" text-anchor="middle" fill="var(--text-3)">'+parseInt(x.mk.slice(5,7),10)+'月</text>';
    });
    return html+'</svg>';
  }
  function catBarsHtml(agg, total){
    var cats = Object.keys(agg).sort(function(a,b){ return agg[b]-agg[a]; });
    if(!cats.length) return '<div class="placeholder">本月暂无支出</div>';
    return cats.slice(0,8).map(function(c){
      var pct = total ? Math.round(agg[c]/total*100) : 0;
      return '<div class="cat-bar-row"><span class="cb-name">'+emojiFor(c)+' '+App.esc(c)+'</span><div class="cb-track"><div class="cb-fill" style="width:'+pct+'%"></div></div><span class="cb-meta">'+L.fmtMoney(agg[c])+' · '+pct+'%</span></div>';
    }).join('');
  }
  function donutHtml(agg, total){
    var cats = Object.keys(agg).sort(function(a,b){ return agg[b]-agg[a]; });
    if(!cats.length) return '';
    var acc=0, segs=[];
    cats.slice(0,8).forEach(function(c,i){ var pct=total?agg[c]/total*100:0; segs.push(catColor(i)+' '+acc.toFixed(1)+'% '+(acc+pct).toFixed(1)+'%'); acc+=pct; });
    return '<div class="donut" style="background:conic-gradient('+segs.join(',')+')"><div class="donut-hole">'+L.fmtMoney(total)+'</div></div>';
  }

  function renderStats(){
    var recs = App.data.ledger.records || [];
    var cur = L.nowMonth();
    var m = L.ledgerMonth(recs, cur);
    var days = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
    var avg = days ? m.expense/days : 0;
    var grid = '<div class="stat3">'+
      '<div class="stat-item"><div class="sl">本月支出</div><div class="sv exp">'+fmtM(m.expense)+'</div></div>'+
      '<div class="stat-item"><div class="sl">本月收入</div><div class="sv inc">'+fmtM(m.income)+'</div></div>'+
      '<div class="stat-item"><div class="sl">本月结余</div><div class="sv '+(m.balance<0?'exp':'inc')+'">'+fmtM(m.balance)+'</div></div>'+
      '<div class="stat-item"><div class="sl">日均支出</div><div class="sv">'+fmtM(avg)+'</div></div>'+
      '</div>';
    var agg = {}; recs.forEach(function(r){ if(r.date&&r.date.indexOf(cur)===0&&r.type==='expense') agg[r.category]=(agg[r.category]||0)+Number(r.amount); });
    var cats = Object.keys(agg).sort(function(a,b){ return agg[b]-agg[a]; });

    var legend = cats.length ? cats.map(function(c,i){ var pct=m.expense?Math.round(agg[c]/m.expense*100):0; return '<div class="leg"><span class="dot" style="background:'+catColor(i)+'"></span><span class="leg-name">'+emojiFor(c)+' '+App.esc(c)+'</span><span class="leg-v">'+L.fmtMoney(agg[c])+' · '+pct+'%</span></div>'; }).join('') : '<div class="placeholder">本月暂无支出</div>';
    var top3 = cats.length ? cats.slice(0,3).map(function(c,i){ var pct=m.expense?Math.round(agg[c]/m.expense*100):0; return '<div class="top-row"><span class="top-n">'+(i+1)+'</span><span class="top-c">'+emojiFor(c)+' '+App.esc(c)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div><span class="bv">'+fmtM(agg[c])+'</span></div>'; }).join('') : '';
    var months=[]; for(var i=11;i>=0;i--){ var d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(L.monthKey(d)); }

    var trend = svgBarsHtml(recs, months, 'both');
    var ys=String(parseInt(cur.slice(0,4),10)-1); var ps=L.ledgerMonth(recs,ys);
    var diff=ps.expense>0?Math.round((m.expense-ps.expense)/ps.expense*100):(m.expense>0?100:0);
    return grid+
      '<div class="card"><h2>本月支出分类占比</h2><div class="donut-wrap">'+donutHtml(agg,m.expense)+'<div class="leg-wrap">'+legend+'</div></div></div>'+
      '<div class="card"><h2>本月每日支出</h2>'+dailyHtml(recs,cur,days)+'</div>'+
      (top3?'<div class="card"><h2>支出 Top 3</h2>'+top3+'</div>':'')+
      '<div class="card"><h2>近 12 个月收支</h2>'+trend+'</div>'+
      analysisHtml(recs, cur);
  }

  function anRow(name, val, desc){ return '<div class="an-row"><span class="an-name">'+name+'</span><span class="an-val">'+val+'</span><span class="an-desc">'+desc+'</span></div>'; }
  function analysisHtml(recs, cur){
    var an = L.ledgerAnalysis(recs, cur);
    var rows = '';
    rows += anRow('💰 结余率', an.saveRate==null?'—':an.saveRate+'%', an.saveRate==null?'本月无收入':(an.saveRate>=0?'结余为正，有储蓄':'结余为负，入不敷出'));
    rows += anRow('🍚 餐饮占比', an.foodPct+'%', '餐饮占总支出的比例（近似恩格尔系数）');
    rows += anRow('📉 环比', an.mom==null?'—':(an.mom>0?'+':'')+an.mom+'%', '本月支出较上月');
    rows += anRow('📅 同比', an.yoy==null?'—':(an.yoy>0?'+':'')+an.yoy+'%', '本月支出较去年同月');
    return '<div class="card"><h2>📊 收支分析</h2>'+rows+'</div>';
  }
  function dailyHtml(recs, cur, days){
    var data=[]; for(var i=1;i<=days;i++) data[i]=0;
    recs.forEach(function(r){ if(r.date&&r.date.indexOf(cur)===0&&r.type==='expense'){ var d=parseInt(r.date.slice(8,10),10); if(d>=1&&d<=days) data[d]+=Number(r.amount); } });
    var max=0; for(var k=1;k<=days;k++) max=Math.max(max,data[k]);
    if(max===0) return '<div class="placeholder">本月暂无支出</div>';
    var W=600,H=160,padL=46,padB=20,padT=8,plotW=W-padL-8,plotH=H-padT-padB,bw=plotW/days;
    var html='<svg viewBox="0 0 '+W+' '+H+'" width="100%">';
    for(var g=0;g<=2;g++){ var val=max*g/2,y=padT+plotH-g*plotH/2; html+='<line x1="'+padL+'" y1="'+y+'" x2="'+(W-8)+'" y2="'+y+'" stroke="var(--border)" stroke-dasharray="3 4"/>'; html+='<text x="'+(padL-6)+'" y="'+(y+3.5)+'" font-size="10" text-anchor="end" fill="var(--text-3)">'+shortNum(val)+'</text>'; }
    for(var d=1;d<=days;d++){ var h=data[d]/max*plotH,x=padL+d*bw-bw/2,w=bw*0.7,r=Math.min(w/2,3); html+='<rect x="'+x+'" y="'+(padT+plotH-h)+'" width="'+w+'" height="'+(h>0?h:1)+'" rx="'+r+'" fill="var(--success)" opacity="0.8"><title>'+d+'日：'+L.fmtMoney(data[d])+'</title></rect>'; if(d===1||d%5===0||d===days){ html+='<text x="'+(x+w/2)+'" y="'+(H-4)+'" font-size="9" text-anchor="middle" fill="var(--text-3)">'+d+'</text>'; } }
    return html+'</svg>';
  }
  // ===== 年度 =====
  function sumsOfYear(recs,yk){ var e=0,i=0; recs.forEach(function(r){ if(r.date&&r.date.indexOf(yk)===0){ if(r.type==='expense')e+=Number(r.amount); else i+=Number(r.amount); } }); return {e:e,i:i,b:i-e}; }
  function renderYear(){
    var recs=App.data.ledger.records||[];
    var cs=sumsOfYear(recs,year);
    var html='<div class="year-nav"><button class="mbtn ghost" data-yp="-1" style="flex:none;padding:8px 16px">‹</button><span class="year-txt">'+year+' 年</span><button class="mbtn ghost" data-yp="1" style="flex:none;padding:8px 16px">›</button></div>';
    html+='<div class="stat3">'+
      '<div class="stat-item"><div class="sl">全年收入</div><div class="sv inc">'+fmtM(cs.i)+'</div></div>'+
      '<div class="stat-item"><div class="sl">全年支出</div><div class="sv exp">'+fmtM(cs.e)+'</div></div>'+
      '<div class="stat-item"><div class="sl">全年结余</div><div class="sv '+(cs.b<0?'exp':'inc')+'">'+fmtM(cs.b)+'</div></div>'+
      '<div class="stat-item"><div class="sl">月均支出</div><div class="sv">'+fmtM(cs.e/12)+'</div></div>'+
      '</div>';
    var ps=sumsOfYear(recs,String(parseInt(year,10)-1));
    var diff=ps.e>0?Math.round((cs.e-ps.e)/ps.e*100):(cs.e>0?100:0);
    html+='<div class="card"><h2>本年 vs 上年</h2><div class="sum-line">本年支出 '+fmtM(cs.e)+' · 上年支出 '+fmtM(ps.e)+' · 同比 '+(diff>=0?'+':'')+diff+'%</div></div>';
    html+='<div class="card"><h2>全年收支（按月）</h2><div class="seg2" id="yearSeg">'+
      '<button data-ym="both" class="'+(yearMode==='both'?'on':'')+'">收支</button>'+
      '<button data-ym="expense" class="'+(yearMode==='expense'?'on':'')+'">支出</button>'+
      '<button data-ym="income" class="'+(yearMode==='income'?'on':'')+'">收入</button>'+
      '</div><div id="yearBars">'+yearBarsHtml(recs)+'</div></div>';
    var agg={}; recs.forEach(function(r){ if(r.date&&r.date.indexOf(year)===0&&r.type==='expense') agg[r.category]=(agg[r.category]||0)+Number(r.amount); });
    var cats=Object.keys(agg).sort(function(a,b){ return agg[b]-agg[a]; });
    var catsHtml=cats.length?cats.slice(0,10).map(function(c){ var pct=cs.e?Math.round(agg[c]/cs.e*100):0; return '<div class="bar-row"><span class="bn">'+emojiFor(c)+' '+App.esc(c)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div><span class="bv">'+pct+'%</span></div>'; }).join(''):'<div class="placeholder">该年暂无支出</div>';
    html+='<div class="card"><h2>全年支出分类</h2>'+catsHtml+'</div>';
    html+='<div class="card"><h2>月度明细</h2>'+monthTableHtml(recs)+'</div>';
    return html;
  }
  function yearBarsHtml(recs){
    var months=[]; for(var m=1;m<=12;m++) months.push(year+'-'+(m<10?'0':'')+m);
    return svgBarsHtml(recs, months, yearMode);
  }
  function monthTableHtml(recs){
    var rows='<div class="mt-row mt-head"><span>月份</span><span>收入</span><span>支出</span><span>结余</span></div>';
    for(var m=1;m<=12;m++){ var s=L.ledgerMonth(recs,year+'-'+(m<10?'0':'')+m); rows+='<div class="mt-row"><span>'+m+'月</span><span class="inc">'+fmtM(s.income)+'</span><span class="exp">'+fmtM(s.expense)+'</span><span class="inc">'+fmtM(s.balance)+'</span></div>'; }
    return '<div class="mt-table">'+rows+'</div>';
  }

  // ===== 金融 =====
  function renderFin(){
    var hs = App.data.ledger.settings.holdings || [];
    var sum = L.holdingsSummary(hs);
    var notes = (App.data.ledger.settings.financeNotes||[]).slice().reverse();
    var h = '<div class="card"><h2>持仓跟踪</h2><div class="stat3">'+
      '<div class="stat-item"><div class="sl">总市值</div><div class="sv">'+L.fmtMoney(sum.mv)+'</div></div>'+
      '<div class="stat-item"><div class="sl">总成本</div><div class="sv">'+L.fmtMoney(sum.cost)+'</div></div>'+
      '<div class="stat-item"><div class="sl">浮动盈亏</div><div class="sv '+(sum.pl<0?'exp':'inc')+'">'+L.fmtMoney(sum.pl)+' ('+(sum.pl>=0?'+':'')+sum.pct+'%)</div></div>'+
      '</div>'+
      (hs.length ? hs.map(function(hh,i){ var mv=Number(hh.qty)*Number(hh.price), c=Number(hh.qty)*Number(hh.cost), p=mv-c, pc=c?Math.round(p/c*100):0; return '<div class="rec-row"><span class="cat">'+App.esc(hh.name)+(hh.code?' <small>'+App.esc(hh.code)+'</small>':'')+'</span><span class="amt '+(p<0?'exp':'inc')+'">'+L.fmtMoney(p)+'</span><button class="del" data-hold-edit="'+i+'">改</button><button class="del" data-hold-del="'+i+'">✕</button></div>'; }).join('') : '<div class="placeholder">暂无持仓，点下方添加。</div>')+
      '<button class="mbtn ghost" id="btnHoldAdd" style="margin-top:8px">＋ 添加持仓</button></div>';
    h += '<div class="card"><h2>资讯与决策记录</h2>'+
      (notes.length ? notes.map(function(n){ return '<div class="rec-row"><span class="cat">'+App.esc(n.content)+'</span><span class="note">'+App.esc(n.date)+'</span><button class="del" data-fnote-del="'+n.id+'">✕</button></div>'; }).join('') : '<div class="placeholder">暂无记录。</div>')+
      '<div class="row" style="margin-top:8px"><input class="input" id="finNoteInput" placeholder="记录官方/权威数据、新闻及决策…"></div>'+
      '<button class="mbtn ghost" id="btnFinNoteAdd" style="margin-top:8px">添加记录</button></div>';
    return h;
  }
  function openHoldingModal(idx){
    var hs = App.data.ledger.settings.holdings || [];
    var h = idx!=null ? hs[parseInt(idx,10)] : null;
    App.openModal(
      '<div class="field"><label>名称 / 标的</label><input class="input" id="hName" value="'+(h?App.esc(h.name):'')+'" placeholder="如 沪深300ETF"></div>'+
      '<div class="field"><label>代码（可选）</label><input class="input" id="hCode" value="'+(h?App.esc(h.code||''):'')+'"></div>'+
      '<div class="row"><div class="field"><label>数量</label><input class="input" id="hQty" inputmode="decimal" value="'+(h?h.qty:'')+'"></div><div class="field"><label>成本价</label><input class="input" id="hCost" inputmode="decimal" value="'+(h?h.cost:'')+'"></div></div>'+
      '<div class="field"><label>现价</label><input class="input" id="hPrice" inputmode="decimal" value="'+(h?h.price:'')+'"></div>',
      { title:h?'编辑持仓':'添加持仓', saveText:'保存', onSave:function(close){
        var name=document.getElementById('hName').value.trim(), qty=parseFloat(document.getElementById('hQty').value), cost=parseFloat(document.getElementById('hCost').value), price=parseFloat(document.getElementById('hPrice').value);
        if(!name||isNaN(qty)||qty<=0||isNaN(cost)||cost<0||isNaN(price)||price<0){ App.toast('请正确填写'); return; }
        var obj={name:name, code:document.getElementById('hCode').value.trim(), qty:qty, cost:cost, price:price};
        if(idx!=null){ hs[parseInt(idx,10)] = Object.assign({}, hs[parseInt(idx,10)], obj); } else { obj.id='h'+Date.now(); hs.push(obj); }
        App.data.ledger.settings.holdings = hs; App.setData(App.data); close(); render(); App.toast('已保存');
      }}
    );
  }
  function delHolding(idx){ App.confirm('删除该持仓？', function(){ var hs=App.data.ledger.settings.holdings||[]; hs.splice(parseInt(idx,10),1); App.setData(App.data); render(); }); }
  function addFinNote(){ var v=document.getElementById('finNoteInput').value.trim(); if(!v){App.toast('请输入内容');return;} var n=App.data.ledger.settings.financeNotes||[]; n.push({id:'n'+Date.now(),date:L.todayStr(),content:v}); App.data.ledger.settings.financeNotes=n; App.setData(App.data); render(); App.toast('已记录'); }
  function delFinNote(id){ App.deleteWithUndo({ apply:function(){ var n=(App.data.ledger.settings.financeNotes||[]).filter(function(x){return x.id!==id;}); App.data.ledger.settings.financeNotes=n; }, render:render }); }

  // ===== 设置（账单 + 预算）=====
  function renderCfg(){
    var s = App.data.ledger.settings;
    var bills = (s.bills||[]).slice().sort(function(a,b){ return a.date<b.date?-1:1; });
    var up = L.upcomingBills(bills);
    function chipsHtml(t){
      var all = catsOf(t);
      var custom = (s.customCats&&s.customCats[t])||[];
      var chips = all.map(function(c, i){
        var isCustom = custom.indexOf(c)>=0;
        return '<div class="cat-chip" draggable="true" data-cat="'+t+'" data-cidx="'+i+'" data-cname="'+App.esc(c)+'">'+emojiFor(c)+' '+App.esc(c)+(isCustom?'<span class="cat-x" data-cat-del="'+t+'|'+App.esc(c)+'" title="删除">✕</span>':'')+'</div>';
      }).join('');
      return '<div class="chips" data-cat-group="'+t+'">'+(chips||'<span class="sum-line">（无）</span>')+'</div>';
    }
    var quickList = (s.quick||[]).map(function(q,i){ return '<div class="rec-row"><span class="cat">'+emojiFor(q.category)+' '+App.esc(q.name||q.category)+' '+L.fmtMoney(Number(q.amount)||0)+'</span><button class="del" data-quick-del="'+i+'">✕</button></div>'; }).join('');
    return '<div class="card"><h2>🎯 结余目标</h2><div class="row"><input class="input" id="goalInput" inputmode="decimal" value="'+(s.goal||'')+'" placeholder="如 2000（0 不设）"><button class="mbtn primary" id="btnGoalSave" style="flex:none;padding:0 16px">保存</button></div></div>'+
      '<div class="card"><h2>👁 金额隐私</h2><label class="switch-row"><input type="checkbox" id="hideToggle"'+(s.hide?' checked':'')+'><span>隐藏金额（统计与年度显示为 •••）</span></label></div>'+
      '<div class="card"><h2>月度支出预算</h2><div class="row"><input class="input" id="budgetInput" inputmode="decimal" value="'+(s.monthBudget||'')+'" placeholder="如 3000（0 不设）"><button class="mbtn primary" id="btnBudgetSave" style="flex:none;padding:0 16px">保存</button></div></div>'+
      '<div class="card"><h2>周期账单</h2>'+
      (up.length?'<div class="sum-line">🔔 近期：'+up.map(function(u){return App.esc(u.bill.name)+'（'+(u.days<0?'已过期':u.days+'天后')+'）';}).join('、')+'</div>':'')+
      (bills.length?bills.map(function(b,i){return '<div class="rec-row"><span class="cat">'+App.esc(b.name)+' '+L.fmtMoney(Number(b.amount)||0)+'</span><span class="note">'+App.esc(b.date)+'</span><button class="del" data-bill-del="'+i+'">✕</button></div>';}).join(''):'<div class="placeholder">暂无账单。</div>')+
      '<div class="row" style="margin-top:8px"><input class="input" id="billName" placeholder="名称"><input class="input" id="billAmount" inputmode="decimal" placeholder="金额"></div>'+
      '<div class="row" style="margin-top:8px"><select class="input" id="billCycle"><option value="monthly">每月</option><option value="yearly">每年</option><option value="once">一次性</option></select><input class="input" id="billDate" type="date"></div>'+
      '<button class="mbtn ghost" id="btnBillAdd" style="margin-top:8px">添加账单</button></div>'+
      '<div class="card"><h2>支出分类</h2>'+chipsHtml('expense')+'<div class="row" style="margin-top:8px"><input class="input" id="newCatExp" placeholder="新增支出分类"><button class="mbtn ghost" id="btnAddExp" style="flex:none;padding:0 14px">添加</button></div></div>'+
      '<div class="card"><h2>收入分类</h2>'+chipsHtml('income')+'<div class="row" style="margin-top:8px"><input class="input" id="newCatInc" placeholder="新增收入分类"><button class="mbtn ghost" id="btnAddInc" style="flex:none;padding:0 14px">添加</button></div></div>'+
      '<div class="card"><h2>⚡ 快捷记账</h2>'+(quickList||'<div class="placeholder">暂无快捷项。</div>')+'<div class="row" style="margin-top:8px"><input class="input" id="newQName" placeholder="名称"><input class="input" id="newQAmount" inputmode="decimal" placeholder="金额"></div><div class="row" style="margin-top:8px"><select class="input" id="newQType"><option value="expense">支出</option><option value="income">收入</option></select><select class="input" id="newQCat"></select><button class="mbtn ghost" id="btnAddQuick" style="flex:none;padding:0 14px">添加</button></div></div>'+
      '<div class="card"><h2>导出</h2><button class="mbtn ghost" id="btnExportCSV">导出 CSV（Excel 可打开）</button></div>'+
      '<div class="card"><h2>导入旧账本</h2><div class="sum-line">从旧版集成包导出的加密备份（.json）迁移到本 App。</div><button class="mbtn ghost" id="btnImportOld">导入旧账本备份</button></div>';
  }
  function saveGoal(){ var v=parseFloat(document.getElementById('goalInput').value); App.data.ledger.settings.goal=isNaN(v)||v<0?0:v; App.setData(App.data); render(); App.toast('已保存'); }
  function toggleHide(){ App.data.ledger.settings.hide=document.getElementById('hideToggle').checked; App.setData(App.data); render(); App.toast('已更新'); }
  function addCat(t){ var inp=document.getElementById(t==='expense'?'newCatExp':'newCatInc'); var v=inp.value.trim(); if(!v){App.toast('请输入分类名');return;} var cc=App.data.ledger.settings.customCats||{expense:[],income:[]}; cc[t]=cc[t]||[]; if(cc[t].indexOf(v)>=0){App.toast('分类已存在');return;} cc[t].push(v); App.data.ledger.settings.customCats=cc; inp.value=''; App.setData(App.data); render(); App.toast('已添加'); }
  function removeCat(t,c2){ App.deleteWithUndo({ apply:function(){ var cc=App.data.ledger.settings.customCats; if(cc&&cc[t]){ cc[t]=cc[t].filter(function(x){return x!==c2;}); } }, render:render }); }
  function moveCat(t2, from, to){ var list=catsOf(t2); if(from<0||from>=list.length||to<0||to>=list.length) return; var item=list.splice(from,1)[0]; list.splice(to,0,item); var co=App.data.ledger.settings.catOrder||{expense:[],income:[]}; co[t2]=list; App.data.ledger.settings.catOrder=co; App.setData(App.data); render(); App.toast('已调整顺序'); }
  function fillQuickCat(){ var sel=document.getElementById('newQCat'); var t2=document.getElementById('newQType').value; sel.innerHTML=catsOf(t2).map(function(c2){return '<option value="'+App.esc(c2)+'">'+emojiFor(c2)+' '+App.esc(c2)+'</option>';}).join(''); }
  function addQuick(){ var n=document.getElementById('newQName').value.trim(), a=parseFloat(document.getElementById('newQAmount').value); if(!n||isNaN(a)||a<=0){App.toast('请填写名称和金额');return;} var q=App.data.ledger.settings.quick||[]; q.push({name:n,amount:a,type:document.getElementById('newQType').value,category:document.getElementById('newQCat').value}); App.data.ledger.settings.quick=q; App.setData(App.data); render(); App.toast('已添加'); }
  function delQuick(i){ App.deleteWithUndo({ apply:function(){ var q=App.data.ledger.settings.quick||[]; q.splice(parseInt(i,10),1); }, render:render }); }
  function exportCSV(){
    var recs=App.data.ledger.records||[];
    var lines=['类型,分类,金额,日期,备注'];
    recs.slice().sort(function(a,b){return a.date<b.date?1:-1;}).forEach(function(r){ var row=[(r.type==='expense'?'支出':'收入'),r.category,r.amount,r.date,(r.note||'')]; lines.push(row.map(function(x){return '"'+String(x).replace(/"/g,'""')+'"';}).join(',')); });
    var blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='账本导出-'+L.todayStr()+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
    App.toast('已导出 CSV');
  }
  function saveBudget(){ var v=parseFloat(document.getElementById('budgetInput').value); App.data.ledger.settings.monthBudget = isNaN(v)||v<0?0:v; App.setData(App.data); render(); App.toast('已保存'); }
  function addBill(){ var n=document.getElementById('billName').value.trim(), a=parseFloat(document.getElementById('billAmount').value), d=document.getElementById('billDate').value; if(!n||isNaN(a)||a<=0){App.toast('请填写名称和金额');return;} if(!d){App.toast('请选择日期');return;} var b=App.data.ledger.settings.bills||[]; b.push({id:'b'+Date.now(),name:n,amount:a,cycle:document.getElementById('billCycle').value,date:d}); App.data.ledger.settings.bills=b; App.setData(App.data); render(); App.toast('已添加'); }
  function delBill(i){ App.deleteWithUndo({ apply:function(){ var b=App.data.ledger.settings.bills||[]; b.splice(parseInt(i,10),1); }, render:render }); }
  function importOldLedger(){
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function(e){
      var f = e.target.files[0]; if(!f) return;
      var fr = new FileReader();
      fr.onload = function(){
        var o; try{ o = JSON.parse(fr.result); }catch(err){ App.toast('不是有效的备份文件'); return; }
        if(!o || !o.salt || !o.iv || !o.data){ App.toast('不是有效的旧账本备份'); return; }
        App.openModal('<div class="field"><label>输入旧账本的主密码</label><input class="input" type="password" id="oldPw"></div>',
          { title:'导入旧账本', saveText:'解密', onSave:function(close){
            var pw = document.getElementById('oldPw').value;
            if(!pw){ App.toast('请输入密码'); return; }
            App.Crypto.deriveKey(pw, o.salt, o.iter||150000).then(function(k){
              return App.Crypto.decryptStr(k, o.iv, o.data).then(function(json){
                var d = JSON.parse(json);
                var recs = Array.isArray(d) ? d : (d.records || []);
                var os = Array.isArray(d) ? {} : (d.settings || {});
                close();
                var ledger = App.data.ledger;
                ledger.records = ledger.records || [];
                ledger.settings = ledger.settings || {};
                var ids = {}; ledger.records.forEach(function(r){ if(r.id) ids[r.id]=true; });
                var added = 0;
                recs.forEach(function(r){ if(r && r.id && !ids[r.id]){ ledger.records.push(r); ids[r.id]=true; added++; } });
                if(os.customCats){
                  ledger.settings.customCats = ledger.settings.customCats || {expense:[],income:[]};
                  ['expense','income'].forEach(function(tt){
                    var src = os.customCats[tt]||[], dst = ledger.settings.customCats[tt]||[];
                    src.forEach(function(c){ if(c && dst.indexOf(c)<0) dst.push(c); });
                    ledger.settings.customCats[tt] = dst;
                  });
                }
                ['bills','holdings','financeNotes'].forEach(function(k){
                  if(Array.isArray(os[k])){
                    ledger.settings[k] = ledger.settings[k] || [];
                    var kid = {}; ledger.settings[k].forEach(function(x){ if(x.id) kid[x.id]=true; });
                    os[k].forEach(function(x){ if(x && x.id && !kid[x.id]){ ledger.settings[k].push(x); kid[x.id]=true; } });
                  }
                });
                if(!ledger.settings.monthBudget && os.monthBudget){ ledger.settings.monthBudget = os.monthBudget; }
                App.setData(App.data); render();
                App.toast('已导入 '+added+' 条流水'+(added<recs.length?('，跳过 '+(recs.length-added)+' 条重复'):''));
              });
            }).catch(function(){ App.toast('密码错误或文件损坏'); });
          }});
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  render();
});
})();