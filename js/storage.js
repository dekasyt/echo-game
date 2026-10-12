(function(E){
  'use strict';
  const KEY='echo-beyond-silence-v1';
  const defaults=()=>({version:1,unlocked:0,last:0,rooms:{},memories:[],achievements:{},settings:{sound:true,volume:.35,softMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,assist:false,touch:'auto'}});
  class Save{
    constructor(){this.available=true;this.data=defaults();try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&raw.version===1){this.data.unlocked=Math.max(0,Math.min(7,Number(raw.unlocked)||0));this.data.last=Math.max(0,Math.min(this.data.unlocked,Number(raw.last)||0));for(const k of ['rooms','achievements'])if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k]))this.data[k]=raw[k];if(Array.isArray(raw.memories))this.data.memories=raw.memories.filter(v=>/^\d:[0-2]$/.test(v));Object.assign(this.data.settings,raw.settings||{});this.data.settings.volume=Math.max(0,Math.min(1,Number(this.data.settings.volume)||0));}}catch(_){this.available=false;}}
    write(){try{localStorage.setItem(KEY,JSON.stringify(this.data));}catch(_){this.available=false;}}
    unlock(id){if(this.data.achievements[id])return false;this.data.achievements[id]=Date.now();this.write();return true;}
    memory(level,index){const id=level+':'+index;if(!this.data.memories.includes(id)){this.data.memories.push(id);this.write();}}
    complete(index,stats){const old=this.data.rooms[index]||{};this.data.rooms[index]={done:true,time:Math.min(old.time||Infinity,stats.time),deaths:Math.min(old.deaths??Infinity,stats.deaths),all:!!old.all||stats.memories===3,clean:!!old.clean||stats.deaths===0};this.data.unlocked=Math.min(7,Math.max(this.data.unlocked,index+1));this.data.last=Math.min(7,index+1);this.write();}
  }
  E.Save=Save;
})(Echo);
