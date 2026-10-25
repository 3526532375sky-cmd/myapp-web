/* crypto.js —— 主密码加解密（浏览器 WebCrypto 与 Node 通用） */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Crypto = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var subtle = globalThis.crypto.subtle;

  function b64ToBuf(b){ var bin=atob(b); var u=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
  function bufToB64(u){ var s=''; for(var i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }
  function randomB64(n){ var u=globalThis.crypto.getRandomValues(new Uint8Array(n)); return bufToB64(u); }

  function deriveKey(pw, saltB64, iter){
    var enc = new TextEncoder();
    return subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']).then(function(km){
      return subtle.deriveKey(
        { name:'PBKDF2', salt:b64ToBuf(saltB64), iterations:iter, hash:'SHA-256' },
        km,
        { name:'AES-GCM', length:256 },
        false,
        ['encrypt','decrypt']
      );
    });
  }

  function encryptStr(k, s){
    var iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    var enc = new TextEncoder();
    return subtle.encrypt({ name:'AES-GCM', iv:iv }, k, enc.encode(s)).then(function(ct){
      return { iv: bufToB64(iv), data: bufToB64(new Uint8Array(ct)) };
    });
  }

  function decryptStr(k, ivB64, dataB64){
    return subtle.decrypt({ name:'AES-GCM', iv:b64ToBuf(ivB64) }, k, b64ToBuf(dataB64)).then(function(pt){
      return new TextDecoder().decode(pt);
    });
  }

  // 生成一个新账本所需的元信息（salt/iter）
  function newMeta(iter){
    return { salt: randomB64(16), iter: iter || 150000 };
  }

  return {
    b64ToBuf: b64ToBuf,
    bufToB64: bufToB64,
    randomB64: randomB64,
    deriveKey: deriveKey,
    encryptStr: encryptStr,
    decryptStr: decryptStr,
    newMeta: newMeta
  };
});