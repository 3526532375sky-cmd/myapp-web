/* modules/settings.js —— 数据与设置 */
(function(){
'use strict';
App.register('settings', function(container){
  function render(){
    var t = App.data.settings.theme || 'auto';
    container.innerHTML =
      '<div class="card"><h2>外观主题</h2>'+
      '<div class="seg2" id="themeSeg"><button data-t="auto" class="'+(t==='auto'?'on':'')+'">跟随系统</button><button data-t="light" class="'+(t==='light'?'on':'')+'">浅色</button><button data-t="dark" class="'+(t==='dark'?'on':'')+'">深色</button></div></div>'+
      '<div class="card"><h2>数据安全</h2><div class="sum-line">数据文件：app/data/appdata.bin（主密码加密，仅存本机）</div>'+
      '<div class="row" style="margin-top:10px"><button class="mbtn ghost" id="btnExport">导出备份</button><button class="mbtn ghost" id="btnImport">导入恢复</button></div></div>'+
      '<div class="card"><h2>跨设备同步</h2>'+
      '<div class="sum-line">加密数据经 GitHub 私有仓库同步，手机与电脑数据一致。</div>'+
      '<div class="sum-line" id="syncStatus"></div>'+
      '<div class="field"><label>GitHub 用户名（owner）</label><input class="input" id="syncOwner" placeholder="如 zhangsan" autocomplete="off"></div>'+
      '<div class="field"><label>仓库名（repo）</label><input class="input" id="syncRepo" placeholder="myapp-data" autocomplete="off"></div>'+
      '<div class="field"><label>Fine-grained token（github_pat_ 开头，可粘贴）</label><div class="pwdwrap"><input class="input" id="syncToken" type="text" placeholder="已保存（留空则不变）" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="eye" id="syncTokenEye" title="显示/隐藏">👁</button></div></div>'+
      '<div class="field"><label>到期日</label><input class="input" id="syncExpires" type="date"></div>'+
      '<div class="row" style="margin-top:10px"><button class="mbtn ghost" id="btnSyncTest">测试连接</button><button class="mbtn primary" id="btnSyncSave">保存</button></div>'+
    '</div>'+
    '<div class="card"><h2>修改主密码</h2><div class="sum-line">修改后所有数据会用新密码重新加密。</div><button class="mbtn ghost" id="btnChangePw" style="margin-top:10px">修改主密码</button></div>'+
      '<div class="card"><h2>危险区</h2><div class="sum-line">删除全部数据后无法恢复。</div><button class="mbtn danger" id="btnDelete" style="margin-top:10px">删除全部数据</button></div>'+
      '<input type="file" id="importFile" accept=".appdata,.json" style="display:none">';
    bind();
  }
  function fillSync(){
    var cfg=window.AppSync?AppSync.getConfig():null;
    if(cfg){ container.querySelector('#syncOwner').value=cfg.owner||''; container.querySelector('#syncRepo').value=cfg.repo||''; container.querySelector('#syncExpires').value=cfg.expiresAt||''; container.querySelector('#syncToken').placeholder='已保存（留空则保持不变）'; }
    var info=window.AppSync?AppSync.expiryInfo(cfg):null; var st=container.querySelector('#syncStatus'); if(!st) return;
    if(!info||!info.configured){ st.textContent='未配置同步。'; } else if(info.expired){ st.textContent='⚠️ 令牌已过期，请重新生成。'; } else if(info.permanent){ st.textContent='✅ 已配置（永不过期）。'; } else { st.textContent='✅ 已配置，剩余 '+info.days+' 天到期'+(info.days<=5?'（即将到期，请续期）':''); }
  }
  function bind(){
    var eye=container.querySelector('#syncTokenEye'); if(eye) eye.addEventListener('click', function(){ var inp=container.querySelector('#syncToken'); inp.type=(inp.type==='password')?'text':'password'; eye.textContent=(inp.type==='password')?'🙈':'👁'; });
    fillSync();
    var bt=container.querySelector('#btnSyncTest'); if(bt) bt.addEventListener('click', function(){
      var owner=container.querySelector('#syncOwner').value.trim(), repo=container.querySelector('#syncRepo').value.trim(), token=container.querySelector('#syncToken').value.trim();
      var prev=window.AppSync?AppSync.getConfig():null; token=token||(prev&&prev.token)||'';
      if(!owner||!repo){ App.toast('请填写用户名和仓库名'); return; } if(!token){ App.toast('请填写 token'); return; }
      App.toast('正在测试连接…');
      AppSync.makeApi({owner:owner,repo:repo,token:token}).testConnection().then(function(r){ App.toast('✅ 连接成功：'+r.full_name+(r.private?'（私有）':'（⚠️公开！请改私有）')); }).catch(function(e){ App.toast('❌ 连接失败：'+(e.message||'')); });
    });
    var bs=container.querySelector('#btnSyncSave'); if(bs) bs.addEventListener('click', function(){
      var owner=container.querySelector('#syncOwner').value.trim(), repo=container.querySelector('#syncRepo').value.trim(), expiresAt=container.querySelector('#syncExpires').value, token=container.querySelector('#syncToken').value.trim();
      var prev=window.AppSync?AppSync.getConfig():null; token=token||(prev&&prev.token)||'';
      if(!owner||!repo){ App.toast('请填写用户名和仓库名'); return; } if(!token){ App.toast('请填写 token'); return; }
      AppSync.setConfig({owner:owner,repo:repo,expiresAt:expiresAt,token:token}); fillSync(); App.toast('✅ 已保存');
    });
    container.querySelector('#themeSeg').addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      App.data.settings.theme = b.getAttribute('data-t');
      App.setData(App.data); App.applyTheme(); render();
    });
    container.querySelector('#btnExport').addEventListener('click', function(){ App.exportBackup(); });
    container.querySelector('#btnImport').addEventListener('click', function(){ container.querySelector('#importFile').click(); });
    container.querySelector('#importFile').addEventListener('change', function(e){
      var f = e.target.files[0]; if(!f) return;
      var fr = new FileReader();
      fr.onload = function(){
        var text = fr.result;
        App.confirm('导入备份会覆盖当前全部数据，且无法撤销。确定继续？', function(){
          App.openModal('<div class="field"><label>输入该备份的主密码</label><input class="input" type="password" id="impPw"></div>',
            { title:'导入恢复', saveText:'恢复', onSave:function(close){
              var pw = document.getElementById('impPw').value;
              if(!pw){ App.toast('请输入密码'); return; }
              var b = document.querySelector('.modal-save');
              if(b){ b.disabled = true; b.textContent = '恢复中...'; }
              App.importBackup(String(text), pw).then(function(){ close(); App.toast('已恢复，请重新输入密码'); setTimeout(function(){ App.relock(); }, 300); })
                .catch(function(err){ if(b){ b.disabled=false; b.textContent='恢复'; } App.toast(err.message); });
            }});
        });
      };
      fr.readAsText(f);
      e.target.value = '';
    });
    container.querySelector('#btnChangePw').addEventListener('click', function(){
      App.openModal(
        '<div class="field"><label>旧密码</label><input class="input" type="password" id="oldPw"></div>'+
        '<div class="field"><label>新密码（至少 6 位）</label><input class="input" type="password" id="newPw1"></div>'+
        '<div class="field"><label>再次输入新密码</label><input class="input" type="password" id="newPw2"></div>',
        { title:'修改主密码', saveText:'修改', onSave:function(close){
          var o=document.getElementById('oldPw').value, n1=document.getElementById('newPw1').value, n2=document.getElementById('newPw2').value;
          if(n1.length<6){ App.toast('新密码至少 6 位'); return; }
          if(n1!==n2){ App.toast('两次输入不一致'); return; }
          var b = document.querySelector('.modal-save');
          if(b){ b.disabled = true; b.textContent = '修改中...'; }
          App.changePassword(o, n1).then(function(){ close(); App.toast('密码已修改'); }).catch(function(err){ if(b){ b.disabled=false; b.textContent='修改'; } App.toast(err.message); });
        }});
    });
    container.querySelector('#btnDelete').addEventListener('click', function(){
      App.confirm('确定删除全部数据？此操作不可恢复！', function(){
        App.openModal('<div class="field"><label>输入主密码确认删除</label><input class="input" type="password" id="delPw"></div>',
          { title:'删除全部数据', saveText:'删除', onSave:function(close){
            var b = document.querySelector('.modal-save');
            if(b){ b.disabled = true; b.textContent = '删除中...'; }
            App.deleteAll(document.getElementById('delPw').value).then(function(){ close(); App.toast('数据已删除'); }).catch(function(err){ if(b){ b.disabled=false; b.textContent='删除'; } App.toast(err.message); });
          }});
      });
    });
  }
  function showLockAgain(first){ /* 复用密码页显示 */ }
  render();
});
})();