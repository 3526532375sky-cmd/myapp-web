/* sync.js —— GitHub 同步引擎（端到端加密数据经 GitHub Contents API 同步）
 * 复用旧集成包 sync.js 经验：getFile/putFile/pushFile（409 冲突自动重试）。
 * makeApi(config) 为纯逻辑，可注入 config 与 mock fetch 做单元测试。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AppSync = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var API = 'https://api.github.com';
  var CFGKEY = 'myapp_sync_config';

  // UTF-8 安全 base64（GitHub Contents API 的 content 为 base64）
  function b64encode(s){
    var bytes = new TextEncoder().encode(s);
    var bin = '', chunk = 0x8000;
    for(var i=0;i<bytes.length;i+=chunk){ bin += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk)); }
    return btoa(bin);
  }
  function b64decode(b){
    var bin = atob(b);
    var bytes = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encPath(p){ return p.split('/').map(encodeURIComponent).join('/'); }

  // 纯逻辑引擎：config = { owner, repo, token }
  function makeApi(config){
    function headers(){
      return {
        'Authorization': 'Bearer ' + config.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
    }
    function repoPath(){ return '/repos/' + encodeURIComponent(config.owner) + '/' + encodeURIComponent(config.repo); }
    function req(method, path, body){
      var h = headers();
      if(body) h['Content-Type'] = 'application/json';
      return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined })
        .then(function(res){
          return res.json().catch(function(){ return {}; }).then(function(j){
            if(res.ok) return j;
            var err = new Error((j && j.message) || ('HTTP ' + res.status));
            err.status = res.status;
            throw err;
          });
        });
    }
    function getFile(path){
      return req('GET', repoPath() + '/contents/' + encPath(path))
        .then(function(j){
          if(j && j.content != null && j.sha){ return { content: b64decode(String(j.content).replace(/\n/g,'')), sha: j.sha }; }
          return null;
        })
        .catch(function(e){ if(e.status === 404) return null; throw e; });
    }
    function putFile(path, contentStr, message, sha){
      var body = { message: message || ('sync ' + new Date().toISOString()), content: b64encode(contentStr) };
      if(sha) body.sha = sha;
      return req('PUT', repoPath() + '/contents/' + encPath(path), body);
    }
    // 上传；遇 409（并发写导致 sha 过期）自动重试
    function pushFile(path, contentStr, message, retries){
      retries = retries || 0;
      return getFile(path).then(function(f){
        return putFile(path, contentStr, message, f && f.sha).catch(function(e){
          if(e.status === 409 && retries < 3) return pushFile(path, contentStr, message, retries + 1);
          throw e;
        });
      });
    }
    function testConnection(){
      return req('GET', repoPath()).then(function(j){
        return { ok:true, full_name: j.full_name, private: j.private };
      });
    }
    return { getFile: getFile, putFile: putFile, pushFile: pushFile, testConnection: testConnection };
  }

  // 浏览器端本地配置（token 只存本机 localStorage）
  function getConfig(){
    try{ var c = JSON.parse((typeof localStorage !== 'undefined' ? localStorage.getItem(CFGKEY) : null)); if(c && c.owner && c.repo && c.token) return c; }catch(e){}
    return null;
  }
  function setConfig(c){ if(typeof localStorage !== 'undefined') localStorage.setItem(CFGKEY, JSON.stringify(c || {})); }
  // 到期信息：配置了/剩余天数/是否过期（供首页与设置页提醒）
  function expiryInfo(cfg){
    if(!cfg) return { configured:false, permanent:false, days:null, expired:false };
    if(!cfg.expiresAt) return { configured:true, permanent:true, days:null, expired:false };
    var d = new Date(cfg.expiresAt+'T00:00:00');
    var now = new Date(); now.setHours(0,0,0,0);
    var days = Math.round((d.getTime()-now.getTime())/86400000);
    return { configured:true, permanent:false, days:days, expired: days<0, expiresAt:cfg.expiresAt };
  }
  function enabled(){ return !!getConfig(); }

  return {
    b64encode: b64encode,
    b64decode: b64decode,
    encPath: encPath,
    makeApi: makeApi,
    getConfig: getConfig,
    setConfig: setConfig,
    enabled: enabled,
    expiryInfo: expiryInfo
  };
});