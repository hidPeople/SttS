const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {}),headless:true});
 const p=await browser.newPage({viewport:{width:1280,height:720}}), errors=[];
 p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 p.on('requestfailed',r=>console.log('REQUEST',r.url(),r.failure()));
 p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});
 try{
  await p.route('**/src/main.ts*',async route=>{
   const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('new Phaser.Game(config)','window.testGame = new Phaser.Game(config)')});
  });
  await p.route('**/src/ui/keyboardNavigation.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+'\nwindow.Nav = KeyboardNavigation;'});});
  await p.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
  await p.waitForFunction(()=>window.testGame?.scene.isActive('TitleScene'));
  await p.waitForFunction(()=>Boolean(window.Nav));
  const snap=()=>p.evaluate(()=>{
   const scene=testGame.scene.getScenes(true).slice(-1)[0], current=Nav.for(scene).current;
   return {scene:scene.scene.key,group:current?.group,hand:scene.deck?.hand.findIndex(c=>scene.cardViews.get(c.uid)?.hitArea===current?.object),
    hovered:scene.deck?.hand.findIndex(c=>c.uid===scene.hoveredCardUid),enemy:scene.selectedEnemyIndex,modal:scene.modalOverlay?.visible,pile:scene.pileOverlay?.visible};
  });
  const key=async value=>{await p.keyboard.press(value);await p.waitForTimeout(55);return snap();};
  assert.equal((await key('Enter')).scene,'TitleScene');
  assert.equal((await key('ArrowDown')).group,'buttons');
  assert.equal((await key('w')).group,'buttons');
  await p.keyboard.press('z');
  await p.waitForFunction(()=>{const s=testGame.scene.getScene('BattleScene');return s.canEndTurn&&!s.isAnimating&&!s.handInputLocked&&s.deck.hand.length>0;});
  console.log('title passed');
  assert.equal((await key('ArrowDown')).hand,0);
  assert.equal((await key('ArrowRight')).hand,1);
  assert.equal((await snap()).hovered,1);
  assert.equal((await key('ArrowLeft')).hand,0);
  assert.equal((await key('ArrowLeft')).group,'end-turn');
  assert.equal((await key('ArrowRight')).hand,0);
  assert.equal((await key('ArrowUp')).group,'enemies');
  const enemyCount=await p.evaluate(()=>testGame.scene.getScene('BattleScene').enemyViews.length);
  assert.equal((await key('ArrowRight')).enemy,enemyCount>1?1:0);
  // Seed one player and enemy icon, then test every info group.
  await p.evaluate(()=>{const s=testGame.scene.getScene('BattleScene');s.player.statuses.set('Weak',1);s.enemy.statuses.set('Vulnerable',1);s.updateHud();});
  assert.equal((await key('ArrowUp')).group,'player-status');
  await p.waitForTimeout(350);
  assert.ok(await p.evaluate(()=>testGame.scene.getScene('BattleScene').statusTooltip.visible));
  const infoGroups=new Set();
  for(let i=0;i<12;i++) infoGroups.add((await key('ArrowRight')).group);
  assert.ok(infoGroups.has('relics'));assert.ok(infoGroups.has('enemy-status'));
  assert.equal((await key('ArrowDown')).group,'enemies');
  assert.equal((await key('ArrowDown')).hand,0);
  assert.equal((await key('s')).group,'piles');
  await key('z');
  assert.ok((await snap()).pile);
  assert.equal((await key('ArrowRight')).group,'pile-card');
  assert.equal((await key('ArrowUp')).group,'pile-buttons');
  await key('ArrowRight');await key('ArrowRight');await key('Enter');
  assert.equal((await snap()).pile,false);
  console.log('battle navigation and pile passed');
  await key('Escape');assert.ok((await snap()).modal);
  assert.equal((await key('ArrowDown')).group,'buttons');
  await key('z'); // language toggle rebuilds modal
  assert.ok((await snap()).modal);
  await key('Escape');assert.equal((await snap()).modal,false);
  // Check moving pointer and then keyboard continue from the hovered card.
  const point=await p.evaluate(()=>{const s=testGame.scene.getScene('BattleScene'),v=s.cardViews.get(s.deck.hand[2].uid);const b=v.hitArea.getBounds();return{x:b.centerX,y:b.centerY};});
  await p.mouse.move(point.x,point.y);await p.waitForTimeout(100);
  const hovered=await snap();assert.equal(hovered.hand,2);
  assert.equal(await p.evaluate(()=>testGame.scene.getScene('BattleScene').children.getByName('keyboard-selection').commandBuffer.length),0);
  assert.equal((await key('ArrowRight')).hand,3);
  assert.ok(await p.evaluate(()=>testGame.scene.getScene('BattleScene').children.getByName('keyboard-selection').commandBuffer.length>0));
  console.log('settings and mouse continuity passed');
  // Compare timer, tween, sprite and delta-driven progress across a mid-flight speed change.
  await p.mouse.move(0,0);
  await p.evaluate(()=>{
   const s=testGame.scene.getScene('BattleScene');window.probe={value:0,elapsed:0,frames:0};
   window.probeSprite=s.add.sprite(0,0,'grunt-idle').play('grunt-idle-play');
   probeSprite.on('animationupdate',()=>probe.frames++);
   window.probeTimer=s.time.addEvent({delay:100000});
   s.tweens.add({targets:probe,value:100000,duration:100000,ease:'Linear'});
   s.events.on('update',(_t,d)=>probe.elapsed+=d);
  });
  const progress=()=>p.evaluate(()=>({...probe,timer:probeTimer.elapsed}));
  const a=await progress();await p.waitForTimeout(650);const b=await progress();
  await p.keyboard.down('Control');await p.waitForTimeout(650);const c=await progress();
  await p.keyboard.up('Control');await p.waitForTimeout(650);const d=await progress();
  for(const field of ['value','elapsed','timer']) {
   const ratio=(c[field]-b[field])/(b[field]-a[field]);
   assert.ok(ratio>1.65&&ratio<2.4,field+' '+ratio);
   const restored=(d[field]-c[field])/(b[field]-a[field]);assert.ok(restored>.75&&restored<1.3,field+' restored '+restored);
  }
  assert.ok(c.frames-b.frames>=1.5*(b.frames-a.frames));
  await p.keyboard.down('Control');
  await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.waitForTimeout(50);
  assert.equal(await p.evaluate(()=>testGame.scene.getScene('BattleScene').tweens.timeScale),1);
  await p.keyboard.up('Control');
  console.log('speed timers/tweens/sprites/delta/restoration passed');
  await p.evaluate(()=>testGame.scene.getScene('BattleScene').scene.launch('RewardScene'));
  await p.waitForFunction(()=>testGame.scene.isActive('RewardScene'));
  assert.equal((await key('ArrowRight')).group,'rewards');
  await key('z');
  assert.ok(await p.evaluate(()=>testGame.scene.getScene('RewardScene').selectedCardId));
  await key('Escape');await key('ArrowDown');
  assert.equal((await snap()).group,'buttons');
  await key('Escape');
  // Restart while fast-forwarding: the tween manager resets its own scale at start.
  await p.keyboard.down('Control');
  await p.evaluate(async()=>{
   testGame.scene.stop('RewardScene');
   const {RUN_STATE,resetRunState}=await import('/src/models/RunState.ts');resetRunState();
   RUN_STATE.encounterEnemyIds=['grunt','grunt','grunt'];RUN_STATE.deckIds=Array(60).fill('defend');
   testGame.scene.getScene('BattleScene').scene.restart();
  });
  await p.waitForFunction(()=>{const s=testGame.scene.getScene('BattleScene');return s.enemyViews?.length===3&&s.deck?.drawPile.length===55&&s.canEndTurn&&!s.isAnimating&&!s.handInputLocked;});
  assert.equal(await p.evaluate(()=>testGame.scene.getScene('BattleScene').tweens.timeScale),2);
  await p.keyboard.up('Control');await p.waitForTimeout(40);
  assert.equal(await p.evaluate(()=>testGame.scene.getScene('BattleScene').tweens.timeScale),1);
  assert.equal((await key('ArrowLeft')).hand,0);
  assert.equal((await key('ArrowUp')).enemy,0);
  assert.equal((await key('ArrowRight')).enemy,1);
  assert.equal((await key('ArrowRight')).enemy,2);
  assert.equal((await key('ArrowRight')).enemy,0);
  assert.equal((await key('ArrowLeft')).enemy,2);
  await p.evaluate(()=>{const s=testGame.scene.getScene('BattleScene');s.enemies[1].hp=0;s.updateHud();});
  assert.equal((await key('ArrowRight')).enemy,0);
  assert.equal((await key('ArrowRight')).enemy,2);
  await key('ArrowDown');await key('ArrowDown');await key('Enter');await key('ArrowRight');
  for(let i=0;i<5;i++) await key('ArrowDown');
  assert.equal((await snap()).group,'pile-card');
  assert.ok(await p.evaluate(()=>testGame.scene.getScene('BattleScene').pileOverlay.getByName('pile-scroll-grid').y<0));
  await key('Escape');await key('ArrowRight');
  const beforeUse=await p.evaluate(()=>testGame.scene.getScene('BattleScene').deck.hand.length);
  await p.keyboard.down('z');await p.waitForTimeout(25);await p.keyboard.down('z');
  await p.waitForFunction(()=>{const s=testGame.scene.getScene('BattleScene');return !s.isAnimating&&!s.handInputLocked&&s.deck.hand.length===4;});
  await p.keyboard.up('z');
  assert.equal(await p.evaluate(()=>testGame.scene.getScene('BattleScene').deck.hand.length),beforeUse-1);
  // Empty hand and empty discard still allow opening/closing the browser and ending turn.
  await p.evaluate(()=>{const s=testGame.scene.getScene('BattleScene');s.deck.hand.length=0;s.deck.discardPile.length=0;s.renderHand();s.updateHud();});
  assert.equal((await key('ArrowRight')).group,'end-turn');
  await key('ArrowDown');await key('ArrowRight');await key('z');
  assert.ok((await snap()).pile);
  assert.equal((await key('ArrowRight')).group,'pile-buttons');
  await key('Escape');
  assert.deepEqual(errors,[]);
  console.log('PASS keyboard and speed integration including restart, three targets, defeated target skipping, scrolling, held confirm and empty hand/pile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
