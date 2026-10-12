(function(E){
  'use strict';
  const TAU=Math.PI*2,clamp=E.utils.clamp;
  class Renderer{
    constructor(canvas,settings){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.settings=settings;this.width=960;this.height=640;this.scale=1;this.camera=0;this.age=0;this.mobile=false;this.resize();}
    resize(){this.width=Math.max(1,this.canvas.clientWidth||innerWidth);this.height=Math.max(1,this.canvas.clientHeight||innerHeight);this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
    line(x1,y1,x2,y2,color,alpha=1,width=1){const c=this.ctx;c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.globalAlpha=1;}
    ring(x,y,r,color,alpha=1,width=1){if(r<=0)return;const c=this.ctx;c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.globalAlpha=1;}
    background(){const c=this.ctx;c.fillStyle='#070b0e';c.fillRect(0,0,this.width,this.height);const g=c.createRadialGradient(this.width*.63,this.height*.53,0,this.width*.63,this.height*.53,this.width*.7);g.addColorStop(0,'#102029');g.addColorStop(.45,'#0a141b');g.addColorStop(1,'#070b0e');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);}
    home(dt){this.age+=dt;const c=this.ctx,w=this.width,h=this.height;this.background();const portrait=w<h;const x=portrait?w*.78:w*.73,y=portrait?h*.55:h*.59,base=Math.min(w,h)*.12;const motion=this.settings.softMotion?0:this.age;
      c.save();const fog=c.createRadialGradient(x,y,0,x,y,Math.min(w,h)*.61);fog.addColorStop(0,'#1b373845');fog.addColorStop(1,'#06101900');c.fillStyle=fog;c.fillRect(0,0,w,h);
      for(let i=0;i<8;i++){const r=base+i*45+(motion*18)%45;this.ring(x,y,r,'#82b8bd',Math.max(0,.16-i*.018),i===0?1.5:.75);}
      for(let i=0;i<3;i++){const xx=x-180+i*150,yy=y+64+Math.sin(i*3)*25;this.line(xx,yy,xx+98,yy,'#8fcbd2',.14);this.line(xx,yy,xx,yy+18,'#8fcbd2',.08);this.line(xx+98,yy,xx+98,yy+18,'#8fcbd2',.08);}
      this.line(x-280,y+105,w+20,y+105,'#789caa',.14);this.line(x+164,y-150,x+164,y+105,'#789caa',.08);this.line(x+164,y-150,x+214,y-150,'#789caa',.1);
      for(let i=0;i<36;i++){const xx=(i*131.31+Math.sin(i)*21)%w,yy=(i*79.67+motion*(i%3+1)*.7)%h;c.globalAlpha=.06+(Math.sin(motion*.7+i)+1)*.025;c.fillStyle='#9cb8bd';c.fillRect(xx,yy,1,1);}c.globalAlpha=1;
      c.globalAlpha=portrait?.24:1;this.figure(x,y-16,0,1,0,motion,true);c.globalAlpha=1;c.restore();
      const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#080b0df2');shade.addColorStop(portrait?.65:.38,'#080b0dba');shade.addColorStop(1,'#080b0d00');c.fillStyle=shade;c.fillRect(0,0,w,h);
    }
    figure(x,y,vx,facing,squash,clock,home=false){const c=this.ctx;c.save();c.translate(x,y);const s=home?1.55:1;c.scale(s*(1+squash*.65),s*(1-squash));
      const halo=c.createRadialGradient(0,0,2,0,0,33);halo.addColorStop(0,'#d4f4ed19');halo.addColorStop(1,'#d4f4ed00');c.fillStyle=halo;c.fillRect(-33,-33,66,66);
      c.shadowColor='#d5e6df';c.shadowBlur=home?12:6;c.fillStyle='#e5ebe0';c.beginPath();c.arc(0,-9,6,Math.PI,0);c.lineTo(7,7);c.quadraticCurveTo(0,11,-7,7);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle='#112328';c.fillRect(facing>0?1:-4,-11,3,2);
      const stride=Math.sin(clock*15)*Math.min(3.6,Math.abs(vx)/60);this.line(-3,7,-4+stride,15,'#cbd6cb',1,2.3);this.line(3,7,4-stride,15,'#cbd6cb',1,2.3);c.restore();
    }
    gameplay(game,dt,touch=false){
      this.age+=dt;const c=this.ctx,w=this.width,h=this.height;this.mobile=touch;c.fillStyle='#05080a';c.fillRect(0,0,w,h);
      const landscape=w>h,top=h<600&&landscape?100:155,bottom=touch?(landscape?65:105):45,available=Math.max(120,h-top-bottom);
      this.scale=Math.min(available/430,w/(landscape?900:660),1.6);const scale=this.scale,viewW=w/scale;
      const desired=clamp(game.player.x+9-viewW*.34,0,Math.max(0,game.level.width-viewW));this.camera+=(desired-this.camera)*Math.min(1,dt*7.5);if(Math.abs(desired-this.camera)>viewW*.6)this.camera=desired;
      const offsetY=top+(available-430*scale)/2-210*scale;
      c.save();c.translate(0,offsetY);c.scale(scale,scale);c.translate(-this.camera,0);
      if(!this.settings.softMotion&&game.shake>0)c.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake*.5);
      const visible=(x,y)=>game.visibility(x,y,this.settings.assist),left=this.camera-50,right=this.camera+viewW+50;
      // Sparse airborne dust has no map information. Everything solid responds to a wave.
      for(let i=0;i<40;i++){const x=(i*83.7)%game.level.width,y=235+(i*37.1)%355;if(x<left||x>right)continue;const a=.018+visible(x,y)*.15;c.globalAlpha=a;c.fillStyle='#c3e3e5';c.fillRect(x,y+Math.sin(this.age*.2+i)*5,1.2,1.2);}c.globalAlpha=1;
      for(const p of game.platforms){if(p.x+p.w<left||p.x>right||p.gone>0)continue;this.platform(p,visible,game.clock);}
      for(const s of game.spikes){if(s.x+s.w<left||s.x>right)continue;for(let x=s.x;x<s.x+s.w;x+=18){const span=Math.min(18,s.x+s.w-x),a=visible(x+span/2,s.y+9);if(a<.006)continue;c.globalAlpha=a;c.strokeStyle='#d995a0';c.fillStyle='#d995a016';c.lineWidth=1;c.beginPath();c.moveTo(x,s.y+s.h);c.lineTo(x+span/2,s.y);c.lineTo(x+span,s.y+s.h);c.closePath();c.fill();c.stroke();}c.globalAlpha=1;}
      for(const gate of game.gates){const a=visible(gate.x+11,gate.y+gate.h/2),height=gate.h*(1-gate.opening);if(height>1){const gateAlpha=Math.max(a,visible(gate.x+11,gate.y+gate.h-20));c.globalAlpha=gateAlpha;c.fillStyle='#658c9635';c.fillRect(gate.x,gate.y,gate.w,height);c.strokeStyle=gate.open?'#9fdfdd':'#b7cbd1';c.lineWidth=1;c.strokeRect(gate.x,gate.y,gate.w,height);for(let yy=gate.y+12;yy<gate.y+height;yy+=17)this.line(gate.x+4,yy,gate.x+gate.w-4,yy,'#91c9d0',gateAlpha*.4);c.globalAlpha=1;}}
      for(const r of game.resonators){const a=Math.max(visible(r.x,r.y),r.active?.22:0);c.save();c.globalAlpha=a;c.shadowColor='#a8d9dd';c.shadowBlur=r.active?10:0;this.ring(r.x,r.y,12,'#a8d9dd',a);this.ring(r.x,r.y,5,'#a8d9dd',a*.8,2);this.line(r.x,r.y+12,r.x,r.y+28,'#9dc3c6',a);if(r.active){c.fillStyle='#b3e9e7';c.fillRect(r.x-2,r.y-2,4,4);}c.restore();}
      for(const checkpoint of game.checkpoints){const a=Math.max(visible(checkpoint.x,checkpoint.y-20),checkpoint.active?.2:0);this.line(checkpoint.x,checkpoint.y-40,checkpoint.x,checkpoint.y,'#c8d8ce',a);c.globalAlpha=a;c.fillStyle=checkpoint.active?'#aadede':'#bfccc6';c.beginPath();c.moveTo(checkpoint.x,checkpoint.y-40);c.lineTo(checkpoint.x+16,checkpoint.y-34);c.lineTo(checkpoint.x,checkpoint.y-27);c.fill();c.globalAlpha=1;if(checkpoint.active)this.ring(checkpoint.x,checkpoint.y-34,5+Math.sin(game.clock*2)*2,'#a8d9dd',.13);}
      for(const m of game.memories){if(m.collected)continue;const a=visible(m.x,m.y);if(a<.008)continue;const yy=m.y+(this.settings.softMotion?0:Math.sin(game.clock*2+m.x)*3);c.save();c.translate(m.x,yy);c.rotate(Math.PI/4);c.globalAlpha=a;c.shadowColor='#a8e4e7';c.shadowBlur=12;c.strokeStyle='#b4e6e9';c.lineWidth=1.4;c.strokeRect(-5,-5,10,10);c.fillStyle='#8dceda33';c.fillRect(-5,-5,10,10);c.restore();}
      for(const n of game.enemies){const a=visible(n.x,n.y-16);if(a<.008)continue;c.save();c.translate(n.x,n.y-14);c.globalAlpha=a;c.strokeStyle='#c18795';c.fillStyle='#35222b';c.lineWidth=1.3;c.beginPath();c.moveTo(-14,12);c.quadraticCurveTo(-11,-18,0,-14);c.quadraticCurveTo(11,-18,14,12);c.lineTo(5,8);c.lineTo(0,12);c.lineTo(-5,8);c.closePath();c.fill();c.stroke();c.fillStyle=n.alert>0?'#f3a3ad':'#ae7a88';c.shadowBlur=n.alert>0?10:0;c.shadowColor='#ed7388';c.fillRect(-5,-6,3,2);c.fillRect(2,-6,3,2);c.restore();}
      const exit=game.level.exit,ea=visible(exit.x,exit.y-24);c.save();c.globalAlpha=ea;c.strokeStyle='#c4ded7';c.lineWidth=1.3;c.strokeRect(exit.x-18,exit.y-57,36,57);c.strokeRect(exit.x-12,exit.y-51,24,51);c.fillStyle='#bde4dc';c.shadowColor='#a2ede0';c.shadowBlur=12;c.fillRect(exit.x+7,exit.y-27,3,3);c.font='8px Courier New';c.textAlign='center';c.fillText('ВЫХОД',exit.x,exit.y-67);c.restore();
      for(const wave of game.waves){const radius=Math.min(wave.max,wave.age*wave.speed);if(wave.age>wave.max/wave.speed)continue;const a=(1-radius/wave.max)*wave.strength*.58;c.save();if(wave.kind==='sonar'&&!this.settings.softMotion){c.shadowColor='#bde8e7';c.shadowBlur=7;}this.ring(wave.x,wave.y,radius,'#d3ede8',a,wave.kind==='sonar'?1.3:.9);if(wave.kind==='sonar')this.ring(wave.x,wave.y,radius-9,'#89c4cb',a*.25,.6);c.restore();}
      if(game.state!=='dead')this.figure(game.player.x+9,game.player.y+16,game.player.vx,game.player.facing,game.player.squash,game.clock);
      const particleLimit=this.settings.softMotion?20:200;for(const q of game.particles.slice(0,particleLimit)){c.globalAlpha=Math.max(0,1-q.age/q.life);c.fillStyle=q.color;c.fillRect(q.x-1,q.y-1,2,2);}c.globalAlpha=1;c.restore();
      // Soft vignette avoids abrupt canvas edges without exposing geometry.
      const vg=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.25,w*.5,h*.5,Math.max(w,h)*.7);vg.addColorStop(0,'#00000000');vg.addColorStop(1,'#0000008c');c.fillStyle=vg;c.fillRect(0,0,w,h);
      if(game.state==='dead'){c.fillStyle='#3f17252b';c.fillRect(0,0,w,h);c.textAlign='center';c.fillStyle='#c6a6b0';c.font='11px Courier New';c.fillText('ЕЩЁ ОДИН ШАГ.',w/2,h*.47);}
    }
    platform(p,visible,clock){const c=this.ctx;const segment=30;
      for(let x=p.x;x<p.x+p.w;x+=segment){const end=Math.min(x+segment,p.x+p.w),a=visible((x+end)/2,p.y);if(a<.006)continue;c.globalAlpha=a;c.fillStyle=p.type==='crumble'?'#b7c2b313':'#a8d9dd0b';c.fillRect(x,p.y,end-x,Math.min(p.h,54));c.strokeStyle=p.type==='crumble'?'#c9d5bd':'#b4d1d5';c.lineWidth=p.type==='moving'?1.6:1.1;if(p.type==='crumble')c.setLineDash([5,4]);c.beginPath();c.moveTo(x,p.y);c.lineTo(end,p.y);c.stroke();c.setLineDash([]);this.line(x,p.y+6,end,p.y+6,'#729ba3',a*.2);if(p.type==='moving'){this.line(x+5,p.y+12,Math.min(end,x+12),p.y+7,'#a8d9dd',a*.45);}if(p.crack>0){const k=p.crack/.85;this.line(x+10,p.y,x+15,p.y+10,'#df9b9b',a*k);this.line(x+15,p.y+10,x+12,p.y+16,'#df9b9b',a*k);}}
      const la=visible(p.x,p.y+12),ra=visible(p.x+p.w,p.y+12);this.line(p.x,p.y,p.x,p.y+Math.min(p.h,80),'#8cafb6',la*.55);this.line(p.x+p.w,p.y,p.x+p.w,p.y+Math.min(p.h,80),'#8cafb6',ra*.55);c.globalAlpha=1;
    }
  }
  E.Renderer=Renderer;
})(Echo);
