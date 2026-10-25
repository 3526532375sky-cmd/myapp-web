/* app.js —— 核心：数据、加密、密码、路由、通用组件 */
(function(){
'use strict';

var API = '/api/data', ITER = 150000;

// 数据层抽象：本地实现（M2 将支持 GitHub 同步）
var dataStore = {
  get: function(){ return fetch(API).then(function(r){ if(r.status===404) return null; if(!r.ok) throw new Error('read'); return r.text(); }); },
  put: function(str){ return fetch(API,{method:'PUT',body:str}).then(function(r){ if(!r.ok) throw new Error('write'); return r; }); },
  del: function(){ return fetch(API,{method:'DELETE'}).then(function(r){ if(!r.ok) throw new Error('delete'); return r; }); }
};
var key = null, meta = null, active = 'home', saveTimer = null, failCount = 0, corrupt = false;
var data = null;

var MODULES = [
  {m:'home',name:'首页总览',icon:'🏠',desc:'今日计划、快速备忘与各模块摘要'},
  {m:'today',name:'今日计划',icon:'📋',desc:'今天要做的事'},
  {m:'work',name:'工作计划',icon:'💼',desc:'SOP、记录与清单'},
  {m:'ledger',name:'账本',icon:'💰',desc:'收支、统计、金融持仓'},
  {m:'study',name:'学习计划',icon:'📚',desc:'目标、笔记、闪卡、复盘'},
  {m:'fitness',name:'健身计划',icon:'💪',desc:'训练计划、动作库、记录、体重'},
  {m:'decision',name:'决策',icon:'🧭',desc:'成本收益、证据分级、手册'},
  {m:'settings',name:'数据与设置',icon:'⚙️',desc:'备份、主题、数据位置'}
];

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

var Logic = window.Logic, Crypto = window.Crypto;

// ===== 数据读写 =====
function fetchData(){ return dataStore.get(); }
function putData(str){ return dataStore.put(str); }
function loadData(){
  return fetchData().then(function(local){
    if(typeof AppSync !== 'undefined' && AppSync.enabled()){
      var api = AppSync.makeApi(AppSync.getConfig());
      return api.getFile('data/appdata.bin').then(function(f){ return (f && f.content) ? f.content : local; }).catch(function(){ return local; });
    }
    return local;
  });
}

function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 500); }
function doSave(){
  if(!key || !meta) return;
  try{
    Crypto.encryptStr(key, JSON.stringify(data)).then(function(p){
      // 记住最新密文，否则锁定后解锁会读回旧数据
      meta.iv = p.iv;
      meta.data = p.data;
      var str = JSON.stringify({salt:meta.salt, iter:meta.iter, iv:p.iv, data:p.data});
      return putData(str).catch(function(){ /* 本地写入失败（手机端无本地服务）忽略，继续推云端 */ }).then(function(){
        if(typeof AppSync !== 'undefined' && AppSync.enabled()){
          AppSync.makeApi(AppSync.getConfig()).pushFile('data/appdata.bin', str, 'sync').catch(function(e){ console.warn('同步推送失败', e); });
        }
      });
    }).catch(function(e){ console.error(e); });
  }catch(e){ console.error(e); }
}

// ===== UI 组件 =====
function toast(msg, actionText, actionFn){
  var el = $('toast');
  if(!el){ el = document.createElement('div'); el.id='toast'; document.body.appendChild(el); }
  el.textContent = '';
  var span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);
  if(actionText && actionFn){
    var b = document.createElement('button');
    b.className = 'toast-act';
    b.textContent = actionText;
    b.onclick = function(){ clearTimeout(el._t); el.classList.remove('show'); actionFn(); };
    el.appendChild(b);
  }
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.classList.remove('show'); }, (actionFn ? 5000 : 1800));
}
function deleteWithUndo(opts){
  opts = opts || {};
  var snapshot = JSON.parse(JSON.stringify(data));
  opts.apply();
  App.setData(data);
  if(opts.render) opts.render();
  toast('已删除', '撤销', function(){
    data = snapshot;
    App.setData(data);
    if(opts.render) opts.render();
  });
}

var modalLastFocus = null;
function closeModal(){
  var box = $('modal');
  if(!box || box.classList.contains('hidden')) return;
  box.classList.add('hidden');
  if(modalLastFocus && modalLastFocus.focus){ modalLastFocus.focus(); modalLastFocus = null; }
}
function openModal(bodyHtml, opts){
  opts = opts || {};
  var box = $('modal');
  $('modalTitle').textContent = opts.title || '';
  box.querySelector('.modal-body').innerHTML = bodyHtml;
  var cancel = box.querySelector('.modal-cancel');
  var save = box.querySelector('.modal-save');
  cancel.textContent = opts.cancelText || '取消';
  save.textContent = opts.saveText || '确定';
  cancel.style.display = opts.onSave ? '' : 'none';
  box.classList.remove('hidden');
  modalLastFocus = document.activeElement;
  var close = closeModal;
  cancel.onclick = close;
  box.querySelector('.modal-x').onclick = close;
  box.onclick = function(e){ if(e.target === box) close(); };
  save.onclick = function(){ if(opts.onSave) opts.onSave(close); };
  setTimeout(function(){
    var f = box.querySelector('input,select,textarea');
    if(!f) f = box.querySelector('.modal-save');
    (f || box).focus();
  }, 0);
  return close;
}

function confirmDialog(msg, onYes){
  openModal('<div class="confirm-msg">'+esc(msg)+'</div>', { saveText:'确认', onSave:function(close){ close(); onYes(); } });
}

// ===== 密码流程 =====
function showLock(first){
  $('screen-app').classList.add('hidden');
  $('screen-lock').classList.remove('hidden');
  $('lockErr').classList.add('hidden');
  $('pw1').value=''; $('pw2').value='';
  if(first){
    $('lockHint').textContent='首次使用：设置主密码（至少 6 位）';
    $('pw1').placeholder='设置主密码';
    $('pw2').classList.remove('hidden');
    $('btnUnlock').textContent='创建并进入';
  }else{
    $('lockHint').textContent='输入主密码进入';
    $('pw1').placeholder='主密码';
    $('pw2').classList.add('hidden');
    $('btnUnlock').textContent='进入';
  }
  setTimeout(function(){ $('pw1').focus(); }, 60);
}
function lockErr(msg){ $('lockErr').textContent=msg; $('lockErr').classList.remove('hidden'); $('pw1').value=''; $('pw1').focus(); }

function enterApp(){
  failCount = 0;
  $('screen-lock').classList.add('hidden');
  $('screen-app').classList.remove('hidden');
  applyTheme();
  renderNav(); renderView();
}
function tryUnlock(){
  var pw = $('pw1').value;
  if(!pw){ lockErr('请输入密码'); return; }
  if(!meta){ lockErr('无法读取本地数据，请刷新页面或先启动本地服务'); return; }
  Crypto.deriveKey(pw, meta.salt, meta.iter).then(function(k){
    return Crypto.decryptStr(k, meta.iv, meta.data).then(function(json){
      key = k; data = JSON.parse(json); failCount = 0;
      enterApp();
    });
  }).catch(function(){
    failCount++;
    if(failCount >= 5){
      failCount = 0;
      $('btnUnlock').disabled = true;
      lockErr('密码错误，请 2 秒后再试');
      setTimeout(function(){ $('btnUnlock').disabled = false; }, 2000);
    } else {
      lockErr('密码错误');
    }
  });
}
function tryCreate(){
  if(corrupt){ lockErr('数据文件损坏，请先恢复备份，不要创建新密码'); return; }
  var p1 = $('pw1').value, p2 = $('pw2').value;
  if(p1.length < 6){ lockErr('密码至少 6 位'); return; }
  if(p1 !== p2){ lockErr('两次输入不一致'); return; }
  var m = Crypto.newMeta(ITER);
  meta = m;
  Crypto.deriveKey(p1, m.salt, m.iter).then(function(k){
    key = k; data = Logic.emptyData();
    enterApp(); doSave();
  });
}

// ===== 路由 =====
var mods = {}; // 注册的模块渲染器 { m: function(container){} }
function register(m, fn){ mods[m] = fn; }

function renderNav(){
  document.querySelectorAll('#nav button').forEach(function(b){
    var on = b.getAttribute('data-m')===active;
    b.classList.toggle('on', on);
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
}
var navStack = [];
function switchModule(m){ if(m !== active) navStack.push(active); if(navStack.length>20) navStack.shift(); active = m; renderNav(); renderView(); }
function goBack(){
  var prev = navStack.pop();
  if(prev != null && prev !== active){ active = prev; renderNav(); renderView(); }
  else if(active !== 'home'){ active = 'home'; renderNav(); renderView(); }
}
function goto(m){ switchModule(m); }

function applyTheme(){
  var t = data && data.settings ? (data.settings.theme || 'auto') : 'auto';
  if(t === 'auto'){ delete document.documentElement.dataset.theme; }
  else { document.documentElement.dataset.theme = t; }
}

function renderView(){
  var v = $('view');
  var mod = MODULES.find(function(x){ return x.m===active; });
  var back = (active==='home') ? '' : '<button class="back-btn" data-back>← 返回</button>';
  var h = '<div class="view-head">'+back+'<h1>'+mod.icon+' '+mod.name+'</h1></div><p class="desc">'+mod.desc+'</p>';
  v.innerHTML = h + '<div id="module-body"></div>';
  v.classList.remove('slide-in'); void v.offsetWidth; v.classList.add('slide-in');
  var body = $('module-body');
  var bb = v.querySelector('.back-btn');
  if(bb){ bb.addEventListener('click', function(){ goBack(); }); }
  if(mods[active]) mods[active](body);
  else body.innerHTML = '<div class="card"><div class="placeholder">该模块正在搭建中。</div></div>';
}

// ===== 对外 API =====
window.App = {
  get data(){ return data; },
  setData: function(d){ data = d; scheduleSave(); },
  save: scheduleSave,
  Logic: Logic, Crypto: Crypto,
  esc: esc, fmt: Logic.fmtMoney, todayStr: Logic.todayStr,
  toast: toast, openModal: openModal, confirm: confirmDialog, deleteWithUndo: deleteWithUndo,
  register: register, switchModule: switchModule, goto: goto,
  lock: function(){ key=null; data=null; showLock(false); },
  relock: function(){ key=null; data=null; showLock(false); },
  applyTheme: applyTheme,
  activeModule: function(){ return active; },
  exportBackup: function(){
    return fetchData().then(function(raw){
      if(!raw){ toast('暂无数据'); return false; }
      var d = new Date();
      var name = '备份-' + d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.appdata';
      var blob = new Blob([raw], {type:'application/octet-stream'});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('已导出备份'); return true;
    });
  },
  importBackup: function(text, pw){
    return new Promise(function(resolve, reject){
      var o; try{ o = JSON.parse(text); }catch(e){ reject(new Error('不是有效的备份文件')); return; }
      if(!o || !o.salt || !o.iv || !o.data){ reject(new Error('不是有效的备份文件')); return; }
      var it = o.iter || ITER;
      Crypto.deriveKey(pw, o.salt, it).then(function(k){
        return Crypto.decryptStr(k, o.iv, o.data).then(function(json){
          var d = JSON.parse(json);
          if(!Logic.isValidAppData(d)){ reject(new Error('这不是本 App 的备份，请勿导入其他文件')); return; }
          key = k; meta = {salt:o.salt, iter:it, iv:o.iv, data:o.data}; data = d;
          return putData(text).then(function(){ resolve(); });
        });
      }).catch(function(){ reject(new Error('密码错误或文件损坏')); });
    });
  },
  changePassword: function(oldPw, newPw){
    return new Promise(function(resolve, reject){
      if(!key || !meta){ reject(new Error('未解锁')); return; }
      Crypto.deriveKey(oldPw, meta.salt, meta.iter).then(function(oldK){
        return Crypto.decryptStr(oldK, meta.iv, meta.data).then(function(){
          var m = Crypto.newMeta(ITER);
          return Crypto.deriveKey(newPw, m.salt, m.iter).then(function(newK){
            return Crypto.encryptStr(newK, JSON.stringify(data)).then(function(p){
              meta = {salt:m.salt, iter:m.iter, iv:p.iv, data:p.data}; key = newK;
              return putData(JSON.stringify(meta)).then(function(){ resolve(); });
            });
          });
        });
      }).catch(function(){ reject(new Error('旧密码错误')); });
    });
  },
  deleteAll: function(pw){
    return new Promise(function(resolve, reject){
      Crypto.deriveKey(pw, meta.salt, meta.iter).then(function(k){
        return Crypto.decryptStr(k, meta.iv, meta.data).then(function(){
          return dataStore.del().then(function(r){
            if(!r.ok){ reject(new Error('删除失败')); return; }
            key=null; data=null; meta=null; showLock(true); resolve();
          });
        });
      }).catch(function(){ reject(new Error('密码错误')); });
    });
  }
};

// ===== 启动 =====
function init(){
  if(!globalThis.crypto || !globalThis.crypto.subtle){
    $('lockHint').textContent = '当前浏览器不支持 WebCrypto';
    $('lockErr').textContent = '请升级现代浏览器（Chrome / Edge 最新版）后再使用。';
    $('lockErr').classList.remove('hidden');
    $('btnUnlock').disabled = true;
    $('btnUnlock').textContent = '无法进入';
    return;
  }
  loadData().then(function(raw){
    if(raw){
      try{ var o = JSON.parse(raw); meta = {salt:o.salt, iter:o.iter||ITER, iv:o.iv, data:o.data}; corrupt=false; showLock(false); }
      catch(e){
        corrupt = true; meta = null; showLock(false);
        $('lockHint').textContent = '数据文件损坏或无法解密';
        $('btnUnlock').textContent = '无法进入';
        $('btnUnlock').disabled = true;
        $('lockErr').textContent = '请用备份恢复 data 文件夹，不要创建新密码';
        $('lockErr').classList.remove('hidden');
      }
    }else{ corrupt=false; showLock(true); }
  }).catch(function(){
    corrupt = false; meta = null; showLock(false);
    $('lockHint').textContent = '无法连接本地服务';
    $('lockErr').textContent = '请先双击“启动我的APP.vbs”';
    $('lockErr').classList.remove('hidden');
  });

  $('btnUnlock').addEventListener('click', function(){
    if($('pw2').classList.contains('hidden')) tryUnlock(); else tryCreate();
  });
  $('pw1').addEventListener('keydown', function(e){ if(e.key==='Enter') $('btnUnlock').click(); });
  $('pw2').addEventListener('keydown', function(e){ if(e.key==='Enter') $('btnUnlock').click(); });
  $('btnLock').addEventListener('click', function(){ window.App.lock(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });
  $('nav').addEventListener('click', function(e){ var b=e.target.closest('button[data-m]'); if(b) switchModule(b.getAttribute('data-m')); });
  var touchX = null, backArmed = false;
  document.addEventListener('touchstart', function(e){ var t=e.touches[0]; touchX=t.clientX; backArmed=(t.clientX > window.innerWidth - 40); }, {passive:true});
  document.addEventListener('touchmove', function(e){ if(!backArmed) return; var t=e.touches[0]; if(t.clientX < touchX - 70){ backArmed=false; goBack(); } }, {passive:true});
  // 内容区水平滑动切换子页签（垂直滑动仍为列表滚动）
  var swX = null, swY = null, swSeg = null, swBody = null, swH = null;
  document.addEventListener('touchstart', function(e){
    var inContent = e.target.closest ? e.target.closest('.content') : null;
    var seg = document.querySelector('.seg2-tabs');
    if(inContent && seg){ swX = e.touches[0].clientX; swY = e.touches[0].clientY; swSeg = seg; swBody = document.querySelector('#module-body') || inContent; swH = null; }
    else { swX = null; swY = null; swSeg = null; swBody = null; swH = null; }
  }, {passive:true});
  document.addEventListener('touchmove', function(e){
    if(swX == null) return;
    var dx = e.touches[0].clientX - swX, dy = e.touches[0].clientY - swY;
    if(swH == null){
      if(Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swH = true;
      else if(Math.abs(dy) > 10) swH = false;
    }
    if(swH !== true || !swBody) return;
    swBody.style.transition = 'none';
    swBody.style.transform = 'translateX(' + (dx*0.35) + 'px)';
  }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(swX == null) return;
    if(swH === true){
      var dx = e.changedTouches[0].clientX - swX;
      if(swBody){ swBody.style.transition = 'transform .2s ease'; swBody.style.transform = ''; }
      if(Math.abs(dx) > 60 && swSeg){
        var btns = swSeg.querySelectorAll('button[data-sub]');
        var cur = swSeg.querySelector('button.on');
        var idx = cur ? Array.prototype.indexOf.call(btns, cur) : -1;
        var next = (dx < 0) ? (idx+1) : (idx-1);
        if(next >= 0 && next < btns.length){ btns[next].click(); }
      }
    }
    swX = null; swY = null; swSeg = null; swBody = null; swH = null;
  }, {passive:true});
}
init();
})();