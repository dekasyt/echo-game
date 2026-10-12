/* Deterministic, frame-rate independent gameplay. DOM and rendering stay outside. */
(function(E){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const nearest=(x,y,r)=>Math.hypot(x-clamp(x,r.x,r.x+r.w),y-clamp(y,r.y,r.y+r.h));
  const approach=(a,b,d)=>a<b?Math.min(a+d,b):Math.max(a-d,b);
  class Game{
    constructor(onEvent=()=>{}){this.onEvent=onEvent;this.loaded=false;this.elapsed=0;this.waves=[];this.particles=[];this.state='idle';}
    event(type,data={}){this.onEvent(type,data);}
    load(index){
      this.index=index;this.level=E.LEVELS[index];this.loaded=true;this.state='playing';this.elapsed=0;this.clock=0;this.deaths=0;this.sonars=0;this.bonks=0;this.idleTime=0;this.rideTime=0;this.closeTimer=0;this.closeArmed=false;this.deathTimer=0;this.cooldown=0;this.finishTimer=0;this.cameraX=0;this.shake=0;this.jumpBuffer=0;this.stepDistance=0;this.waves=[];this.particles=[];this.previous={};this.hintIndex=-1;this.crumblePending=false;
      this.platforms=this.level.platforms.map((p,i)=>({...p,id:'p'+i,baseX:p.x,baseY:p.y,dx:0,dy:0,crack:0,gone:0}));
      this.spikes=this.level.spikes.map((s,i)=>({...s,id:'s'+i}));
      this.memories=this.level.memories.map((m,i)=>({...m,id:'m'+i,collected:false}));
      this.checkpoints=this.level.checkpoints.map((c,i)=>({...c,id:'c'+i,active:false}));
      this.resonators=(this.level.resonators||[]).map(r=>({...r,active:false}));
      this.gates=(this.level.gates||[]).map(g=>({...g,open:false,opening:0}));
      this.enemies=(this.level.enemies||[]).map((n,i)=>({...n,id:'n'+i,dir:i%2?-1:1,alert:0}));
      this.spawn={...this.level.spawn};this.checkpointIndex=-1;this.player={x:this.spawn.x,y:this.spawn.y-32,w:18,h:32,vx:0,vy:0,grounded:true,ground:null,coyote:.12,facing:1,squash:0};
      this.pulse(this.player.x+9,this.player.y+16,'start');this.event('loaded',{index});
    }
    pulse(x,y,kind){const strong=kind==='sonar';this.waves.push({x,y,age:0,speed:strong?760:kind==='start'?630:640,max:strong?670:kind==='jump'?310:kind==='land'?340:kind==='start'?440:kind==='quiet'?105:230,kind,strength:strong?1:kind==='quiet'?.34:.65,triggered:new Set()});if(this.waves.length>20)this.waves.shift();}
    sonar(){if(this.cooldown>0||this.state!=='playing')return;const p=this.player;this.pulse(p.x+p.w/2,p.y+p.h/2,'sonar');this.cooldown=1.65;this.sonars++;this.event('sonar');for(const n of this.enemies){if(Math.hypot(n.x-p.x,n.y-p.y)<580){n.alert=2.6;this.event('alert');}}if(this.sonars>=12)this.event('achievement',{id:'spam'});this.event('achievement',{id:'first_echo'});}
    bursts(x,y,color,count=14){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*120;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life:.35+Math.random()*.6,color});}if(this.particles.length>200)this.particles.splice(0,this.particles.length-200);}
    die(reason='fall'){
      if(this.state!=='playing')return;this.deaths++;this.state='dead';this.deathTimer=.7;this.shake=9;this.closeArmed=false;this.crumblePending=false;this.bursts(this.player.x+9,this.player.y+16,'#d78794',24);this.event('death',{reason});
    }
    respawn(){this.player={x:this.spawn.x,y:this.spawn.y-32,w:18,h:32,vx:0,vy:0,grounded:true,ground:null,coyote:.12,facing:1,squash:0};for(const n of this.enemies){n.alert=0;if(Math.abs(n.x-this.spawn.x)<90)n.x=clamp(this.spawn.x+130,n.min,n.max);}for(const p of this.platforms)if(p.type==='crumble'){p.crack=0;p.gone=0;}this.previous={};this.jumpBuffer=0;this.stepDistance=0;this.idleTime=0;this.cooldown=.25;this.state='playing';this.pulse(this.spawn.x+9,this.spawn.y-16,'start');this.event('respawn');}
    retry(){if(!this.loaded)return;this.deaths++;this.closeArmed=false;this.crumblePending=false;this.respawn();this.event('retry');}
    solids(){return this.platforms.filter(p=>p.gone<=0).concat(this.gates.filter(g=>!g.open));}
    update(dt,input={}){
      if(!this.loaded||this.state==='complete')return;
      this.clock+=dt;this.shake=Math.max(0,this.shake-dt*22);
      for(const w of this.waves)w.age+=dt;
      this.waves=this.waves.filter(w=>w.age<w.max/w.speed+1.7);
      for(const q of this.particles){q.age+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=95*dt;}
      this.particles=this.particles.filter(q=>q.age<q.life);
      for(const p of this.platforms){const oldX=p.x,oldY=p.y;if(p.type==='moving'){const t=(Math.sin(this.clock/p.period*Math.PI*2+p.phase)+1)/2;p.x=p.baseX+(p.axis==='x'?p.range*t:0);p.y=p.baseY+(p.axis==='y'?p.range*t:0);}p.dx=p.x-oldX;p.dy=p.y-oldY;if(p.gone>0){p.gone-=dt;if(p.gone<=0){p.crack=0;this.pulse(p.x+p.w/2,p.y,'quiet');}}}
      for(const g of this.gates)if(g.open)g.opening=Math.min(1,g.opening+dt*1.4);
      for(const w of this.waves)if(w.kind==='sonar'){const radius=w.age*w.speed;for(const r of this.resonators)if(!r.active&&Math.hypot(r.x-w.x,r.y-w.y)<=radius&&Math.hypot(r.x-w.x,r.y-w.y)<=w.max){r.active=true;for(const g of this.gates)if(g.id===r.id)g.open=true;this.event('door');this.event('achievement',{id:'door'});this.bursts(r.x,r.y,'#a8d9dd',12);}}
      if(this.state==='dead'){this.deathTimer-=dt;if(this.deathTimer<=0)this.respawn();return;}
      this.elapsed+=dt;this.cooldown=Math.max(0,this.cooldown-dt);const p=this.player;
      if(input.sonar&&!this.previous.sonar)this.sonar();
      if(input.jump&&!this.previous.jump)this.jumpBuffer=.14;else this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
      if(!input.jump&&this.previous.jump&&p.vy<-170)p.vy*=.52;
      p.coyote=p.grounded?.12:Math.max(0,p.coyote-dt);
      if(p.ground&&p.ground.type==='moving'&&p.ground.gone<=0){p.x+=p.ground.dx;p.y+=p.ground.dy;this.rideTime+=dt;if(this.rideTime>=4)this.event('achievement',{id:'elevator'});}
      const direction=(input.right?1:0)-(input.left?1:0),speed=input.quiet?98:245;
      p.vx=approach(p.vx,direction*speed,(p.grounded?1400:850)*dt);if(direction)p.facing=direction;
      if(this.jumpBuffer>0&&p.coyote>0){p.vy=-510;p.grounded=false;p.ground=null;p.coyote=0;this.jumpBuffer=0;p.squash=-.15;this.pulse(p.x+9,p.y+22,'jump');this.event('jump');}
      const solids=this.solids();p.x+=p.vx*dt;
      for(const r of solids)if(overlap(p,r)){if(p.vx>0)p.x=r.x-p.w;else if(p.vx<0)p.x=r.x+r.w;p.vx=0;}
      p.x=clamp(p.x,1,this.level.width-p.w-1);
      const oldFeet=p.y+p.h;const oldGrounded=p.grounded;p.vy=Math.min(800,p.vy+1350*dt);p.y+=p.vy*dt;p.grounded=false;p.ground=null;
      for(const r of solids){if(p.x+p.w<=r.x+.01||p.x>=r.x+r.w-.01)continue;const movedTop=r.y-Math.min(0,r.dy||0);if(p.vy>=0&&oldFeet<=movedTop+3&&p.y+p.h>=r.y&&p.y<r.y+r.h){p.y=r.y-p.h;p.vy=0;p.grounded=true;p.ground=r;}else if(p.vy<0&&p.y<r.y+r.h&&p.y+p.h>r.y&&oldFeet-p.h>=r.y+r.h-3){p.y=r.y+r.h;p.vy=0;this.bonks++;this.pulse(p.x+9,p.y,'quiet');if(this.bonks>=5)this.event('achievement',{id:'bonk'});}}
      if(p.grounded&&!oldGrounded){this.pulse(p.x+9,p.y+32,'land');this.event('land');p.squash=.2;if(this.crumblePending){this.event('achievement',{id:'crumble'});this.crumblePending=false;}}
      if(p.ground&&p.ground.type==='crumble'){p.ground.crack+=dt;if(p.ground.crack>.85){this.bursts(p.ground.x+p.ground.w/2,p.ground.y,'#c8d6cc',12);p.ground.gone=4.5;this.event('crumble');p.ground=null;p.grounded=false;this.crumblePending=true;}}
      p.squash=approach(p.squash,0,dt*1.8);
      if(p.grounded){this.stepDistance+=Math.abs(p.vx)*dt;if(this.stepDistance>(input.quiet?55:48)){this.stepDistance=0;this.pulse(p.x+9,p.y+31,input.quiet?'quiet':'step');this.event('step');}}
      this.idleTime=Math.abs(p.vx)<4&&p.grounded&&!input.jump&&!input.sonar?this.idleTime+dt:0;if(this.idleTime>=25)this.event('achievement',{id:'idle'});
      for(const s of this.spikes){const hit={x:s.x+4,y:s.y+5,w:s.w-8,h:s.h-5};if(overlap(p,hit)){this.die('spikes');break;}}
      if(p.y>760)this.die('fall');
      if(this.state==='dead'){this.previous={...input};return;}
      for(const n of this.enemies){n.alert=Math.max(0,n.alert-dt);if(n.alert>0)n.dir=p.x+9>n.x?1:-1;n.x+=n.dir*n.speed*(n.alert>0?1.8:1)*dt;if(n.x<=n.min){n.x=n.min;n.dir=1;}if(n.x>=n.max){n.x=n.max;n.dir=-1;}const body={x:n.x-12,y:n.y-27,w:24,h:27};if(overlap(p,body)){this.die('listener');break;}const distance=Math.hypot(p.x+9-n.x,p.y+16-(n.y-14));if(distance<57&&!this.closeArmed){this.closeArmed=true;this.closeTimer=0;}}
      if(this.state==='dead'){this.previous={...input};return;}
      if(this.closeArmed){this.closeTimer+=dt;if(this.closeTimer>=2){this.event('achievement',{id:'close_call'});this.closeArmed=false;}}
      for(let i=0;i<this.memories.length;i++){const m=this.memories[i];if(!m.collected&&Math.hypot(p.x+9-m.x,p.y+16-m.y)<31){m.collected=true;this.bursts(m.x,m.y,'#a8d9dd',20);this.pulse(m.x,m.y,'land');this.event('memory',{index:i,text:m.text});this.event('achievement',{id:'first_memory'});}}
      for(let i=0;i<this.checkpoints.length;i++){const c=this.checkpoints[i];if(!c.active&&i>this.checkpointIndex&&Math.hypot(p.x+9-c.x,p.y+32-c.y)<37){c.active=true;this.checkpointIndex=i;this.spawn={x:c.x,y:c.y};this.pulse(c.x,c.y-24,'start');this.event('checkpoint');}}
      const exit=this.level.exit;if(Math.abs(p.x+9-exit.x)<29&&Math.abs(p.y+32-exit.y)<32&&this.gates.every(g=>g.open)){
        this.state='complete';this.event('complete',{time:this.elapsed,deaths:this.deaths,memories:this.memories.filter(m=>m.collected).length,sonars:this.sonars});
      }
      let h=-1;for(let i=0;i<this.level.hints.length;i++)if(p.x>=this.level.hints[i].x)h=i;if(h!==this.hintIndex){this.hintIndex=h;if(h>=0)this.event('hint',{text:this.level.hints[h].text});}
      this.previous={...input};
    }
    visibility(x,y,assist=false){let value=assist?.095:0;for(const w of this.waves){const d=Math.hypot(x-w.x,y-w.y);if(d>w.max)continue;const since=w.age-d/w.speed;if(since>=0&&since<(assist?2.3:1.15)){const fade=Math.exp(-since*(assist?1.8:3.4));value=Math.max(value,fade*w.strength);}}return clamp(value,0,1);}
  }
  E.Game=Game;E.utils={clamp,overlap,nearest};
})(Echo);
