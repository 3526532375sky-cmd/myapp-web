/* logic.js —— 纯逻辑层（浏览器与 Node 通用，可单元测试） */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var EXPENSE = ['餐饮','交通','购物','居住','水电燃气','娱乐','医疗','教育','通讯','人情','日用','服饰','美容美发','运动','宠物','旅行','烟酒','保险','其他'];
  var INCOME = ['工资','奖金','理财','兼职','红包','报销','礼金','退款','二手','其他'];

  function pad(n){ return (n<10?'0':'') + n; }
  function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function monthKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  function nowMonth(){ return monthKey(new Date()); }

  function fmtMoney(n){
    n = Number(n) || 0;
    var s = Math.abs(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
    return (n<0?'-':'') + '¥' + s;
  }

// ===== 内置训练计划（源自《训练计划-2026-10-24.md》，只读参考）=====
var FITNESS_PLAN = {"stage":"冬训增肌储备期（10月~次年3月）","cycle":"冬训=增肌/力量储备 → 夏训=体能/塑形/游泳户外期","goal":"主线增肌（BMI 17.9 偏瘦），力量·体态·心肺协同；体态纠正期（肱骨前移），训练以「无痛、两侧分别计数」为原则","days":[{"dow":1,"label":"周一","focus":"推日","kind":"strength","tag":"胸 · 肩 · 三头","items":[{"name":"肩/髋/腕踝关节活动","category":"热身","sets":"1","reps":"各20秒","weight":"","rest":"","note":"全身绕环"},{"name":"臀桥激活","category":"热身","sets":"2","reps":"15","weight":"","rest":"","note":""},{"name":"鸟狗","category":"热身","sets":"2","reps":"10/侧","weight":"","rest":"","note":""},{"name":"肩胛回缩","category":"热身","sets":"2","reps":"15","weight":"","rest":"","note":""},{"name":"上斜俯卧撑","category":"主训","sets":"4","reps":"8~12","weight":"自重","rest":"90s","note":"肱骨前移纠正期替代标准俯卧撑，肩有弹响可降为更高上斜/跪姿"},{"name":"哑铃地板卧推","category":"主训","sets":"3","reps":"8~12","weight":"哑铃","rest":"90s","note":"大臂触地"},{"name":"哑铃肩推","category":"主训","sets":"3","reps":"8~12","weight":"哑铃","rest":"90s","note":"核心收紧不塌腰"},{"name":"弹力带侧平举","category":"主训","sets":"3","reps":"12~15","weight":"弹力带","rest":"60s","note":"中束"},{"name":"弹力带颈后臂屈伸","category":"主训","sets":"3","reps":"12~15","weight":"弹力带","rest":"60s","note":"三头"},{"name":"死虫","category":"核心","sets":"3","reps":"10/侧","weight":"","rest":"","note":""},{"name":"平板支撑","category":"核心","sets":"3","reps":"30~45s","weight":"","rest":"","note":"不塌腰不撅臀"},{"name":"髋屈肌拉伸","category":"拉伸","sets":"2","reps":"30秒/侧","weight":"","rest":"","note":"久坐必做"},{"name":"弹力带肩外旋","category":"体态","sets":"2","reps":"15/侧","weight":"弹力带","rest":"","note":"肱骨前移：强化肩外旋"},{"name":"胸小肌/胸大肌拉伸","category":"拉伸","sets":"2","reps":"30秒/侧","weight":"","rest":"","note":"肱骨前移：放松胸前侧"}]},{"dow":3,"label":"周三","focus":"拉日","kind":"strength","tag":"背 · 二头 · 后束","items":[{"name":"肩关节活动","category":"热身","sets":"1","reps":"各20秒","weight":"","rest":"","note":""},{"name":"鸟狗","category":"热身","sets":"2","reps":"10/侧","weight":"","rest":"","note":""},{"name":"肩胛回缩","category":"热身","sets":"2","reps":"15","weight":"","rest":"","note":""},{"name":"胸椎旋转","category":"热身","sets":"2","reps":"10/侧","weight":"","rest":"","note":""},{"name":"引体向上","category":"主训","sets":"4","reps":"尽量","weight":"自重","rest":"120s","note":"做不动用弹力带辅助/离心下放"},{"name":"单臂哑铃划船","category":"主训","sets":"3","reps":"8~12/侧","weight":"哑铃","rest":"90s","note":"背挺直肘向后"},{"name":"弹力带坐姿划船","category":"主训","sets":"3","reps":"12~15","weight":"弹力带","rest":"60s","note":"中背"},{"name":"弹力带面拉","category":"主训","sets":"3","reps":"12~15","weight":"弹力带","rest":"60s","note":"圆肩克星"},{"name":"哑铃弯举/锤式弯举","category":"主训","sets":"3","reps":"10~15","weight":"哑铃","rest":"60s","note":"二头"},{"name":"死虫","category":"核心","sets":"3","reps":"10/侧","weight":"","rest":"","note":""},{"name":"侧平板支撑","category":"核心","sets":"3","reps":"20~30s/侧","weight":"","rest":"","note":"左右都做"},{"name":"肩后侧拉伸","category":"拉伸","sets":"2","reps":"20秒/侧","weight":"","rest":"","note":""},{"name":"弹力带肩外旋","category":"体态","sets":"2","reps":"15/侧","weight":"弹力带","rest":"","note":"肱骨前移纠正"}]},{"dow":5,"label":"周五","focus":"腿日","kind":"strength","tag":"腿 · 臀 · 核心","items":[{"name":"髋绕环","category":"热身","sets":"1","reps":"各20秒","weight":"","rest":"","note":""},{"name":"臀桥激活","category":"热身","sets":"2","reps":"15","weight":"","rest":"","note":""},{"name":"蚌式开合","category":"热身","sets":"2","reps":"15/侧","weight":"","rest":"","note":""},{"name":"髋屈肌拉伸","category":"热身","sets":"2","reps":"30秒/侧","weight":"","rest":"","note":""},{"name":"高脚杯深蹲","category":"主训","sets":"4","reps":"8~12","weight":"哑铃","rest":"120s","note":"下蹲至大腿平行或略下"},{"name":"保加利亚分腿蹲","category":"主训","sets":"3","reps":"8~12/侧","weight":"哑铃","rest":"90s","note":"两侧分开计数"},{"name":"单腿罗马尼亚硬拉","category":"主训","sets":"3","reps":"8~12/侧","weight":"哑铃","rest":"90s","note":"练臀腿后侧+平衡"},{"name":"单腿臀桥","category":"主训","sets":"3","reps":"12~15/侧","weight":"","rest":"60s","note":"臀肌激活"},{"name":"单腿提踵","category":"主训","sets":"3","reps":"12~15/侧","weight":"","rest":"60s","note":"左右分别补"},{"name":"鸟狗","category":"核心","sets":"3","reps":"10/侧","weight":"","rest":"","note":""},{"name":"侧平板支撑","category":"核心","sets":"3","reps":"20~30s/侧","weight":"","rest":"","note":""},{"name":"髋屈肌+小腿拉伸","category":"拉伸","sets":"2","reps":"30秒/侧","weight":"","rest":"","note":""}]},{"dow":4,"label":"周四","focus":"羽毛球","kind":"cardio","tag":"有氧 · 灵敏","items":[{"name":"动态热身","category":"热身","sets":"1","reps":"5分钟","weight":"","rest":"","note":"关节活动+快走"},{"name":"羽毛球","category":"有氧","sets":"1","reps":"45~60分钟","weight":"","rest":"","note":"先热身再上场"},{"name":"下肢拉伸","category":"拉伸","sets":"2","reps":"30秒/侧","weight":"","rest":"","note":""}]},{"dow":0,"label":"周日","focus":"居家循环","kind":"optional","tag":"体能 · 居家循环","items":[{"name":"居家循环（可选）","category":"有氧","sets":"4~6","reps":"每动作30s练/15s休","weight":"","rest":"","note":"深蹲跳·登山跑·开合跳·波比低冲击版"},{"name":"全身拉伸","category":"拉伸","sets":"2","reps":"20秒/侧","weight":"","rest":"","note":""}]},{"dow":2,"label":"周二","focus":"休息 / 快走","kind":"rest","tag":"恢复","items":[]},{"dow":6,"label":"周六","focus":"休息 / 恢复","kind":"rest","tag":"恢复","items":[]}],"tips":{"nutrition":["热量维持 +300~500 kcal 盈余（约 2600~2900 kcal/天）","蛋白质 1.6~2.0 g/kg ≈ 90~112g/天，分 4 餐","训练日吃够主食（米面薯类）","每周固定晨起称重，4 周目标 +1~2kg"],"recovery":["23:30 前睡，睡前 30 分钟不看手机","同一肌群两次训练间隔 ≥48 小时","宁可休息充分，不带酸痛硬练"],"progress":["动作质量优先，前 2 周轻重量学动作","能稳定完成次数上限且不变形 → 加 1~2 次或 +0.5~2.5kg","引体：弹力带辅助 → 自重 → 再负重"],"accept":["体重 4 周 +1~2kg","力量动作次数/重量明显提升","每周必练 3 天连续 4 周","全程无关节/腰部疼痛"]}};


// ===== 内置动作参考库（权威来源，导入动作库时默认「待评估」）=====
var EXERCISE_LIBRARY = [{"name":"俯卧撑","points":"手略宽于肩，身体成直线，核心收紧，下至胸近地；降阶跪姿/上斜，进阶负重","srcType":"web","source":"ExRx.net 动作库（Push-up）","note":"推日主项"},{"name":"哑铃地板卧推","points":"平躺瑜伽垫，哑铃下放至大臂触地，手腕在肘正上方","srcType":"web","source":"ExRx.net 动作库（Floor Press）","note":"无卧推凳替代"},{"name":"哑铃肩推","points":"核心收紧不塌腰，推至头顶，不锁死肘关节","srcType":"web","source":"ExRx.net 动作库（Dumbbell Press）","note":"站姿/坐姿"},{"name":"哑铃侧平举","points":"肘微屈，抬至肩高，不耸肩","srcType":"web","source":"ExRx.net 动作库（Lateral Raise）","note":"中束"},{"name":"哑铃颈后臂屈伸","points":"大臂固定，肘朝上，屈伸小臂","srcType":"web","source":"ExRx.net 动作库（Triceps Extension）","note":"三头"},{"name":"引体向上","points":"肩胛下沉启动，下巴过杠，慢放；辅助用弹力带或离心下放","srcType":"web","source":"ExRx.net 动作库（Pull-up）","note":"拉日主项"},{"name":"单臂哑铃划船","points":"背挺直，肘向后上方拉，顶峰收缩","srcType":"web","source":"ExRx.net 动作库（One-arm Row）","note":"背阔"},{"name":"弹力带坐姿划船","points":"坐直，肩胛后收，拉至腹部","srcType":"web","source":"通用弹力带抗阻训练指南","note":"中背"},{"name":"弹力带面拉","points":"肘与肩同高，向后拉至面部两侧","srcType":"web","source":"ExRx.net 动作库（Face Pull）","note":"改善圆肩"},{"name":"哑铃弯举","points":"大臂贴身，肘固定，慢放","srcType":"web","source":"ExRx.net 动作库（Dumbbell Curl）","note":"二头"},{"name":"高脚杯深蹲","points":"哑铃抱胸前，脚跟踩实，下蹲至大腿平行或略下","srcType":"book","source":"《力量训练解剖学》(Frederic Delavier)","note":"腿日主蹲"},{"name":"保加利亚分腿蹲","points":"后脚垫高，前腿屈膝下蹲，两侧分开计数","srcType":"web","source":"ExRx.net 动作库（Bulgarian Split Squat）","note":"单侧"},{"name":"单腿罗马尼亚硬拉","points":"髋铰链，背平，后腿伸直，练臀腿后侧+平衡","srcType":"web","source":"ExRx.net 动作库（Single-leg RDL）","note":"臀腿后侧"},{"name":"臀桥","points":"仰卧屈膝，臀收紧顶起，顶峰停 1 秒","srcType":"web","source":"ExRx.net 动作库（Hip Thrust/Bridge）","note":"臀激活"},{"name":"单腿提踵","points":"前脚掌踩实，缓慢起落，两侧分别补","srcType":"web","source":"ExRx.net 动作库（Calf Raise）","note":"小腿"},{"name":"死虫","points":"仰卧，对侧手脚同步伸展，腰贴地","srcType":"book","source":"《腰背维修师》(Stuart McGill) 核心训练","note":"核心稳定"},{"name":"鸟狗","points":"四足跪姿，对侧手脚伸展，骨盆稳定","srcType":"book","source":"《腰背维修师》(Stuart McGill) 核心训练","note":"对侧稳定"},{"name":"平板支撑","points":"肘撑，身体成直线，不塌腰不撅臀","srcType":"web","source":"ACSM（美国运动医学会）体能指南","note":"核心"},{"name":"侧平板支撑","points":"侧身肘撑，髋抬起成直线","srcType":"web","source":"ACSM（美国运动医学会）体能指南","note":"核心侧链"},{"name":"蚌式开合","points":"侧卧屈膝，脚跟并拢，上膝打开","srcType":"web","source":"髋关节康复训练指南","note":"臀中肌"},{"name":"髋屈肌拉伸","points":"弓步姿势，后腿髋前侧拉伸","srcType":"web","source":"ACSM 柔韧性指南","note":"久坐必做"},{"name":"胸椎旋转","points":"四足跪姿或靠墙，旋转上胸椎","srcType":"web","source":"体态纠正训练指南","note":"改善圆肩驼背"},{"name":"弹力带帕洛夫推","points":"侧对锚点，双手前推抵抗旋转","srcType":"book","source":"《腰背维修师》(Stuart McGill) 抗旋转训练","note":"核心抗旋转"}];

  function emptyData(){
    return {
      settings: { theme: 'auto' },
      memos: [],
      today: [],
      todayReviews: [],
      work: { sops: [], logs: [], checklists: [] },
      ledger: { records: [], settings: { monthBudget: 0, bills: [], holdings: [], financeNotes: [], goal: 0, hide: false, customCats: { expense: [], income: [] }, catOrder: { expense: [], income: [] }, quick: [] } },
      study: { goals: [], notes: [], resources: [], logs: [], reviews: [], cards: [] },
      fitness: { records: [], workouts: [], weights: [] },
      decisions: { entries: [], manuals: [] }
    };
  }

  function todaySummary(today){
    var arr = today || [];
    var done = arr.filter(function(t){ return t.done; }).length;
    return { done: done, total: arr.length };
  }

  function ledgerMonth(records, mk){
    var e=0, i=0;
    (records||[]).forEach(function(r){ if(r.date && r.date.indexOf(mk)===0){ if(r.type==='expense') e+=Number(r.amount)||0; else i+=Number(r.amount)||0; } });
    return { expense: e, income: i, balance: i-e };
  }

  function checklistProgress(c){
    var items = c && c.items ? c.items : [];
    var done = items.filter(function(i){ return i.done; }).length;
    return { done: done, total: items.length };
  }

  function decisionCounts(entries){
    var o = { do:0, no:0, wait:0 };
    (entries||[]).forEach(function(e){ if(e.verdict==='do') o.do++; else if(e.verdict==='no') o.no++; else o.wait++; });
    return o;
  }

  function fitnessSop(records){
    return (records||[]).filter(function(r){ return r.status==='added'; });
  }

  function studyOpenGoals(goals){
    return (goals||[]).filter(function(g){ return !g.done; }).length;
  }

  function fitnessDidWorkout(workouts, date){
    date = date || todayStr();
    return (workouts||[]).some(function(w){ return w.date === date; });
  }

  function holdingsSummary(holdings){
    var cost=0, mv=0;
    (holdings||[]).forEach(function(h){
      cost += (Number(h.qty)||0)*(Number(h.cost)||0);
      mv += (Number(h.qty)||0)*(Number(h.price)||0);
    });
    var pl = mv - cost;
    var pct = cost > 0 ? Math.round(pl/cost*100) : 0;
    return { cost: cost, mv: mv, pl: pl, pct: pct };
  }

  function upcomingBills(bills){
    var out = [];
    (bills||[]).forEach(function(b){
      if(!b.date) return;
      var d = new Date(b.date+'T00:00:00');
      var now = new Date(); now.setHours(0,0,0,0);
      var days = Math.round((d-now)/86400000);
      if(days <= 7) out.push({ bill:b, days:days });
    });
    out.sort(function(a,b){ return a.bill.date < b.bill.date ? -1 : 1; });
    return out;
  }

  // 日期加天数（用于 SM-2 排程）
  function addDays(date, days){ var d=new Date(date+'T00:00:00'); d.setDate(d.getDate()+days); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }

  // SM-2 间隔重复：quality 0-5（0忘记/1-2困难/3记得/4轻松/5完美）
  function sm2Review(card, quality, date){
    date = date || todayStr();
    var c = card || {};
    var ef = (typeof c.easeFactor==='number' && c.easeFactor>=1.3) ? c.easeFactor : 2.5;
    var rep = c.repetition || 0;
    var interval = c.interval || 0;
    if(quality < 3){ rep = 0; interval = 1; }
    else { if(rep===0) interval=1; else if(rep===1) interval=6; else interval=Math.round(interval*ef); rep = rep+1; }
    ef = ef + (0.1 - (5-quality)*(0.08+(5-quality)*0.02));
    if(ef < 1.3) ef = 1.3;
    return { easeFactor: ef, repetition: rep, interval: interval, due: addDays(date, interval) };
  }

  // 今日应复习的卡：无 due 的新卡 + 已到期的卡
  function dueCards(cards, date){
    date = date || todayStr();
    return (cards||[]).filter(function(c){ return !c.due || c.due <= date; });
  }

  // 首页「今日行动面板」聚合：回答"今天做什么"
  function homeActions(data, date){
    date = date || todayStr();
    var mk = date.slice(0,7);
    var today = data.today || [];
    var done = today.filter(function(t){ return t.done; }).length;
    var open = today.filter(function(t){ return !t.done; }).slice(0,3).map(function(t){ return { id:t.id, text:t.text }; });
    var ckDone=0, ckTotal=0, running=0;
    ((data.work && data.work.checklists) || []).forEach(function(c){ var p=checklistProgress(c); ckDone+=p.done; ckTotal+=p.total; if(c.running) running++; });
    return {
      today: { done: done, total: today.length, open: open },
      study: { openGoals: studyOpenGoals(data.study.goals) },
      work: { ckDone: ckDone, ckTotal: ckTotal, running: running },
      fitness: { didWorkout: fitnessDidWorkout(data.fitness.workouts, date) },
      decision: { wait: decisionCounts(data.decisions.entries).wait },
      ledger: ledgerMonth(data.ledger.records, mk)
    };
  }

  // 体重序列（按日期升序，供折线图）
  function weightSeries(weights){
    return (weights||[]).slice().sort(function(a,b){ return a.date < b.date ? -1 : 1; }).map(function(w){ return { date:w.date, weight:Number(w.weight)||0 }; });
  }

  // 渐进超负荷：某动作最近两次重量对比（新在前）
  function progressiveOverload(workouts, name){
    var list = (workouts||[]).filter(function(w){ return w.name===name; }).sort(function(a,b){ return a.date < b.date ? 1 : -1; });
    if(!list.length) return { current:null, previous:null, delta:null };
    var cur = Number(list[0].weight)||0;
    if(list.length < 2) return { current:cur, previous:null, delta:null };
    var prev = Number(list[1].weight)||0;
    return { current:cur, previous:prev, delta:+(cur-prev).toFixed(1) };
  }


  // 根据日期返回当天训练计划日（覆盖周一到周日；无匹配返回 null）

  // 返回某日期生效的计划版本（name/from/to/days）；plan 空时兜底内置常量
  function fitnessPlanVersion(plan, date){
    date = date || todayStr();
    if(plan && (plan.current || (plan.history && plan.history.length))){
      var cand=[];
      (plan.history||[]).forEach(function(h){ cand.push({name:h.name, from:h.from, to:h.to, days:h.days}); });
      if(plan.current) cand.push({name:plan.current.name, from:plan.current.from, to:null, days:plan.current.days});
      var latest=null;
      cand.forEach(function(v){
        if(v.from && v.from<=date){
          if(v.to==null || date<=v.to){ if(!latest || v.from>=latest.from) latest=v; }
        }
      });
      return latest;
    }
    return { name:'冬训增肌储备期', from:null, to:null, days:(FITNESS_PLAN && FITNESS_PLAN.days)||[] };
  }

  // 某日期对应的训练日（按 dow）；plan 可为 null
  function fitnessDayFor(plan, date){
    date = date || todayStr();
    var v = fitnessPlanVersion(plan, date);
    var days = v && v.days ? v.days : ((FITNESS_PLAN && FITNESS_PLAN.days)||[]);
    var dow = new Date(date+'T00:00:00').getDay();
    for(var i=0;i<days.length;i++){ if(days[i].dow===dow) return days[i]; }
    return null;
  }

  // 初始化计划（首次）
  function buildInitialPlan(date){
    return { current:{ name:'冬训增肌储备期', from: date||todayStr(), days: JSON.parse(JSON.stringify((FITNESS_PLAN&&FITNESS_PLAN.days)||[])) }, history:[] };
  }

  // 改计划：旧 current 压入 history，新 current 自 fromDate 生效
  function applyPlanChange(plan, newName, newDays, fromDate){
    fromDate = fromDate || todayStr();
    var pp = plan || { current:null, history:[] };
    if(pp.current && pp.current.from && pp.current.from <= fromDate){
      var to = addDays(fromDate, -1);
      pp.history = pp.history || [];
      if(pp.current.from <= to){ pp.history.push({ name:pp.current.name, from:pp.current.from, to:to, days:pp.current.days }); }
    }
    pp.current = { name:newName, from:fromDate, days:newDays };
    return pp;
  }
  function fitnessTodayPlan(date){
    date = date || todayStr();
    var dow = new Date(date+'T00:00:00').getDay();
    var days = (FITNESS_PLAN && FITNESS_PLAN.days) || [];
    for(var i=0;i<days.length;i++){ if(days[i].dow===dow) return days[i]; }
    return null;
  }

  // 今日计划执行状态：planned 是否有安排；done 今日是否已记录训练
  function fitnessPlanStatus(plan, workouts, date){
    date = date || todayStr();
    var p = fitnessDayFor(plan, date);
    if(!p) return { planned:false, focus:null, kind:null, done:false, day:null };
    var done = (workouts||[]).some(function(w){ return w.date===date; });
    return { planned:true, focus:p.focus, kind:p.kind, done:done, day:p };
  }

  // 某天按计划完成情况：逐项是否已记录
  function fitnessDayProgress(workouts, date, day){
    date = date || todayStr();
    var focus = (day && day.focus) || '';
    var items = (day && day.items) || [];
    var rows = items.map(function(it){
      var done = (workouts||[]).some(function(w){ return w.date===date && w.name===it.name && w.plan===focus; });
      return { item: it, done: done };
    });
    var done = rows.filter(function(r){ return r.done; }).length;
    return { total: items.length, done: done, rows: rows };
  }


  // 当月锻炼日历网格：返回 [null(占位) | {date,d,dow,cls,kind,focus}]
  function fitnessMonthGrid(plan, workouts, year, month){
    year = year || Number(todayStr().slice(0,4));
    month = month || Number(todayStr().slice(5,7));
    var firstDow = new Date(year, month-1, 1).getDay();
    var daysInMonth = new Date(year, month, 0).getDate();
    var cells=[];
    for(var i=0;i<firstDow;i++) cells.push(null);
    for(var d=1; d<=daysInMonth; d++){
      var date = year+'-'+pad(month)+'-'+pad(d);
      var planDay = fitnessDayFor(plan, date);
      var cls='', kind='rest', focus='';
      if(planDay){ kind=planDay.kind; focus=planDay.focus; }
      if(planDay && planDay.kind==='strength'){
        var prog=fitnessDayProgress(workouts, date, planDay);
        var pct=prog.total?prog.done/prog.total:0;
        if(prog.total>0 && prog.done>=prog.total) cls='wk-100';
        else if(pct>=0.8) cls='wk-80';
        else if(pct>=0.5) cls='wk-50';
        else if(pct>0) cls='wk-1';
        else cls='wk-0';
      } else if(planDay && planDay.kind!=='rest'){
        cls = fitnessDidWorkout(workouts, date) ? 'wk-100' : 'wk-0';
      }
      cells.push({date:date, d:d, dow:new Date(year,month-1,d).getDay(), cls:cls, kind:kind, focus:focus});
    }
    return cells;
  }
  // 某 dow 在本周对应的日期字符串（周一起始）
  function fitnessWeekDate(dow, date){
    date = date || todayStr();
    var t = new Date(date+'T00:00:00');
    var cur = t.getDay();
    var monday = new Date(t);
    monday.setDate(t.getDate() - ((cur===0?7:cur)-1));
    var target = new Date(monday);
    target.setDate(monday.getDate() + (dow===0?6:dow-1));
    return target.getFullYear()+'-'+pad(target.getMonth()+1)+'-'+pad(target.getDate());
  }

  // 进行中的清单
  function runningChecklists(work){
    return ((work && work.checklists) || []).filter(function(c){ return c.running; });
  }

  // 校验是否为本 App 的完整数据结构（导入/恢复前防误覆盖）
  function isValidAppData(d){
    if(!d || typeof d !== 'object') return false;
    var required = ['today','work','study','fitness','decisions','ledger','settings'];
    for(var i=0;i<required.length;i++){ if(!(required[i] in d)) return false; }
    return true;
  }

  // 决策看板：按结论分栏
  function decisionBoard(entries){
    var o = { do:[], no:[], wait:[] };
    (entries||[]).forEach(function(e){ var k = (e.verdict==='do')?'do':(e.verdict==='no')?'no':'wait'; o[k].push(e); });
    return o;
  }

  // 决策匹配相关手册原则（中文 2-gram）
  function matchManuals(entry, manuals){
    var name = (entry && entry.name) ? entry.name : '';
    var grams = [];
    for(var i=0;i<name.length-1;i++){ var g=name.slice(i,i+2); if(grams.indexOf(g)<0) grams.push(g); }
    return (manuals||[]).filter(function(m){ return grams.some(function(g){ return (m.title||'').indexOf(g)>=0 || (m.content||'').indexOf(g)>=0; }); });
  }

  // 收支分析：结余率/餐饮占比/环比/同比
  function ledgerAnalysis(records, cur){
    var m = ledgerMonth(records, cur);
    var d = new Date(cur+'-01T00:00:00'); d.setDate(0); var prev = monthKey(d);
    var pm = ledgerMonth(records, prev);
    var y = String(parseInt(cur.slice(0,4),10)-1) + cur.slice(4);
    var ym = ledgerMonth(records, y);
    var saveRate = m.income>0 ? Math.round(m.balance/m.income*100) : null;
    var food=0;
    (records||[]).forEach(function(r){ if(r.date && r.date.indexOf(cur)===0 && r.type==='expense' && r.category==='餐饮') food += Number(r.amount)||0; });
    var foodPct = m.expense>0 ? Math.round(food/m.expense*100) : 0;
    var mom = pm.expense>0 ? Math.round((m.expense-pm.expense)/pm.expense*100) : null;
    var yoy = ym.expense>0 ? Math.round((m.expense-ym.expense)/ym.expense*100) : null;
    return { month:m, prevMonth:pm, saveRate:saveRate, foodPct:foodPct, mom:mom, yoy:yoy };
  }

  // 日复盘：完成统计 + 未完成项列表
  function dailyReview(today){
    var arr = today || [];
    var done = arr.filter(function(t){ return t.done; }).length;
    var undone = arr.filter(function(t){ return !t.done; }).map(function(t){ return t.text; });
    return { done: done, total: arr.length, undone: undone };
  }

  return {
    EXPENSE: EXPENSE,
    INCOME: INCOME,
    todayStr: todayStr,
    nowMonth: nowMonth,
    monthKey: monthKey,
    fmtMoney: fmtMoney,
    emptyData: emptyData,
    todaySummary: todaySummary,
    ledgerMonth: ledgerMonth,
    checklistProgress: checklistProgress,
    decisionCounts: decisionCounts,
    fitnessSop: fitnessSop,
    studyOpenGoals: studyOpenGoals,
    fitnessDidWorkout: fitnessDidWorkout,
    holdingsSummary: holdingsSummary,
    upcomingBills: upcomingBills,
    homeActions: homeActions,
    sm2Review: sm2Review,
    dueCards: dueCards,
    weightSeries: weightSeries,
    progressiveOverload: progressiveOverload,
    fitnessTodayPlan: fitnessTodayPlan,
    fitnessPlanStatus: fitnessPlanStatus,
    FITNESS_PLAN: FITNESS_PLAN,
    EXERCISE_LIBRARY: EXERCISE_LIBRARY,
    fitnessDayProgress: fitnessDayProgress,
    fitnessWeekDate: fitnessWeekDate,
    fitnessMonthGrid: fitnessMonthGrid,
    fitnessPlanVersion: fitnessPlanVersion,
    fitnessDayFor: fitnessDayFor,
    buildInitialPlan: buildInitialPlan,
    applyPlanChange: applyPlanChange,
    runningChecklists: runningChecklists,
    decisionBoard: decisionBoard,
    matchManuals: matchManuals,
    dailyReview: dailyReview,
    ledgerAnalysis: ledgerAnalysis,
    isValidAppData: isValidAppData
  };
});