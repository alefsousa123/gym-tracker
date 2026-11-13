import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const cwd = process.cwd();
let initialGitStatus = null;
const home = homedir();
const reportDir = join(home, 'Downloads', 'GymTracker_A2_' + new Date().toISOString().replaceAll(':', '-'));
const results = [];
const consoleMessages = [];
let vite, browser;

function command(cmd, args) { return execFileSync(cmd, args, {cwd, encoding:'utf8'}).trim(); }
function record(name, status, detail='') {
  results.push({name,status,detail});
  console.log(`${status} — ${name}${detail ? ' — ' + detail : ''}`);
}
async function check(name, fn) {
  try { record(name, 'PASS', await fn() ?? ''); }
  catch (e) { record(name,'FAIL',(e.message || String(e)).split('\n').slice(0,3).join(' | ')); }
}
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
function target(type, sets, restSeconds, durationSeconds=30) {
  return {sets, targetType:type, minReps:8,maxReps:12,durationSeconds,restSeconds,weight:'',loadMeasurement:'added-bodyweight'};
}
const plankTarget = target('duration',3,0,45);
const pushTarget = target('reps',2,0);
const basePlan = {
  name:'A2 Isolated Plan', splitId:'full-body', location:'home', weightUnit:'kg',
  sessions:[{id:'full-body',name:'Full Body',exerciseEntries:[
    {entryId:'a2-plank',exerciseId:'plank',target:plankTarget},
    {entryId:'a2-push',exerciseId:'push-up',target:pushTarget}
  ],exerciseIds:['plank','push-up'],exerciseTargets:{plank:plankTarget,'push-up':pushTarget},missingSlots:[]}]
};
const profile = {primaryGoal:'build-muscle',trainingGoal:'build-muscle',secondaryGoal:'',experienceLevel:'beginner',trainingLocation:'home',trainingDaysPerWeek:3,sessionDurationMinutes:60,weightUnit:'kg',musclePriorities:[],sex:''};
const K={profile:'gym-tracker:profile:v1',equipment:'gym-tracker:equipment:v1',plan:'gym-tracker:applied-plan:v1',schedule:'gym-tracker:weekly-schedule:v1',active:'gym-tracker:active-workout:v1',history:'gym-tracker:workout-history:v1',timed:'gym-tracker:timed-set:v1',rest:'gym-tracker:rest-timer:v1'};
const historicDate = new Date(Date.now()-2*86400000);
const historicalRecord={id:'a2-previous',startedAt:historicDate.toISOString(),finishedAt:historicDate.toISOString(),planName:basePlan.name,sessionId:'full-body',sessionName:'Full Body',weightUnit:'kg',status:'partial',totalCompletedSets:1,exercises:[{entryId:'a2-push',exerciseId:'push-up',target:pushTarget,skipped:false,completedSets:[{setNumber:1,targetType:'reps',reps:12,durationSeconds:null,weight:20}]}]};

try {
  console.log('=== GYM TRACKER — A2 DEEP AUDIT (READ-ONLY SOURCE) ===');
  console.log('Project:',cwd);
  console.log('Report:',reportDir);
  await mkdir(reportDir,{recursive:true});
  assert.equal(command('git',['rev-parse','--show-toplevel']),cwd,'Run inside Gym Tracker repository root');
  initialGitStatus = command('git',['status','--porcelain']);
  console.log('PASS — Git baseline recorded' + (initialGitStatus ? ' (pending A3 changes)' : ' (clean)'));
  const viteLib = await import(pathToFileURL(join(cwd,'node_modules/vite/dist/node/index.js')).href);
  vite = await viteLib.createServer({root:cwd,logLevel:'error',server:{host:'127.0.0.1',port:0}});
  await vite.listen();
  const port = vite.httpServer.address().port;
  const base = `http://127.0.0.1:${port}`;
  const {chromium} = await import('playwright');
  browser = await chromium.launch({channel:'chrome',headless:true});
  console.log('PASS — Isolated Chrome and Vite server:',base);

  async function newScenario(data={}) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror',e=>consoleMessages.push({type:'pageerror',message:e.message}));
    page.on('console',m=>{if(['warning','error'].includes(m.type())) consoleMessages.push({type:m.type(),message:m.text()});});
    await page.goto(base+'/dashboard',{waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor({timeout:15000});
    const seed={
      [K.profile]:profile,[K.equipment]:['Dumbbells'],[K.plan]:basePlan,
      [K.history]:[],...data
    };
    await page.evaluate(entries=>{for(const [k,v] of Object.entries(entries))localStorage.setItem(k,JSON.stringify(v));},seed);
    await page.reload({waitUntil:'domcontentloaded'});
    return {page,ctx};
  }
  const store = (page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)??'null'),key);
  async function untilStore(page,key,predicate,time=9000) {
    const start=Date.now();
    do { const value=await store(page,key); if(predicate(value))return value; await pause(120); }
    while(Date.now()-start<time);
    throw new Error('Timed out waiting for localStorage key: '+key);
  }
  async function goto(page,path,heading=null) {
    await page.goto(base+path,{waitUntil:'domcontentloaded'});
    if(heading)await page.getByRole('heading',{name:heading,exact:true}).first().waitFor({timeout:15000});
  }
  async function openOptions(page) {
    const d=page.locator('details.today-more-options').first();
    await d.waitFor({state:'attached'});
    if(await d.getAttribute('open')===null) await d.locator('summary').click();
  }

  await check('A2.1 — Mudanca de perfil/equipamento preserva plano e historico',async()=>{
    const {ctx,page}=await newScenario({[K.history]:[historicalRecord]});
    try {
      await goto(page,'/settings/profile','Training Profile');
      await page.locator('input[name="primaryGoal"][value="build-strength"]').check({force:true});
      await page.locator('#sessionDuration').selectOption('45');
      await page.getByRole('button',{name:'Save Training Profile'}).click();
      await untilStore(page,K.profile,x=>x?.primaryGoal==='build-strength'&&x?.sessionDurationMinutes===45);
      await goto(page,'/settings/equipment','My Equipment');
      await page.getByRole('button',{name:'Bodyweight Only',exact:true}).click();
      await untilStore(page,K.equipment,x=>Array.isArray(x)&&x.length===0);
      await page.reload();
      assert.deepEqual(await store(page,K.plan),basePlan,'Saved plan changed without consent');
      assert.deepEqual(await store(page,K.history),[historicalRecord],'Workout history changed');
      assert.deepEqual(await store(page,K.equipment),[]);
      await goto(page,'/workouts/plans','Recommended Workout Plans');
      assert.deepEqual(await store(page,K.plan),basePlan);
      return '45 min / strength / bodyweight; saved plan and prior history retained';
    } finally {await ctx.close();}
  });

  await check('A2.2 — Desfazer serie, ignorar exercicio e salvar treino parcial',async()=>{
    const {ctx,page}=await newScenario();
    try {
      await goto(page,'/workouts/today');
      await page.getByRole('button',{name:'Start Workout',exact:true}).click();
      await untilStore(page,K.active,x=>x?.exercises?.length===2);
      await page.getByRole('button',{name:/Complete Set 1/}).click();
      await untilStore(page,K.active,x=>x.exercises[0].completedSets.length===1);
      await openOptions(page);
      await page.getByRole('button',{name:'Undo Last Set'}).click();
      await untilStore(page,K.active,x=>x.exercises[0].completedSets.length===0);
      await page.getByRole('button',{name:/Complete Set 1/}).click();
      await untilStore(page,K.active,x=>x.exercises[0].completedSets.length===1);
      await openOptions(page);
      await page.getByRole('button',{name:'Skip Exercise'}).click();
      await untilStore(page,K.active,x=>x.exercises[0].skipped===true);
      await openOptions(page);
      await page.locator('.today-exercise-picker button').nth(1).click();
      await page.locator('.today-quick-form input[type="number"]').first().fill('8');
      await page.getByRole('button',{name:/Complete Set 1/}).click();
      await untilStore(page,K.active,x=>x.exercises[1].completedSets.length===1);
      await openOptions(page);
      await page.getByRole('button',{name:'Finish Early'}).click();
      await page.getByRole('button',{name:'Save Partial Workout'}).click();
      const history=await untilStore(page,K.history,x=>x?.length===1);
      assert.equal(history[0].status,'partial');
      assert.equal(history[0].totalCompletedSets,2);
      assert.equal(history[0].exercises[0].skipped,true);
      assert.equal(await store(page,K.active),null);
      await page.reload();
      assert.equal((await store(page,K.history)).length,1);
      return 'Undo, skip, 2 distinct sets, partial save and reload verified';
    } finally {await ctx.close();}
  });

  await check('A2.3 — Cronometro pausado, retomado e persistido; descanso',async()=>{
    const plan=structuredClone(basePlan);
    plan.sessions[0].exerciseEntries=[{entryId:'a2-plank',exerciseId:'plank',target:{...plankTarget,restSeconds:45}}];
    plan.sessions[0].exerciseIds=['plank'];
    plan.sessions[0].exerciseTargets={plank:{...plankTarget,restSeconds:45}};
    const {ctx,page}=await newScenario({[K.plan]:plan});
    try {
      await goto(page,'/workouts/today');
      await page.getByRole('button',{name:'Start Workout',exact:true}).click();
      await page.getByRole('button',{name:/Start Timer/}).click();
      await untilStore(page,K.timed,x=>x?.status==='running');
      await page.locator('.timed-set-timer').getByRole('button',{name:'Pause'}).click();
      const paused=await untilStore(page,K.timed,x=>x?.status==='paused');
      assert(paused.remainingMs>0,'Paused timer has no remaining time');
      await page.reload();
      await page.locator('.timed-set-timer').getByRole('button',{name:'Resume'}).waitFor();
      assert.equal((await store(page,K.timed)).status,'paused');
      await page.locator('.timed-set-timer').getByRole('button',{name:'Resume'}).click();
      await untilStore(page,K.timed,x=>x?.status==='running');
      await page.locator('.timed-set-timer').getByRole('button',{name:'Stop Early'}).click();
      await untilStore(page,K.timed,x=>x?.status==='stopped');
      await page.getByRole('button',{name:/Complete Set 1/}).click();
      await untilStore(page,K.active,x=>x.exercises[0].completedSets.length===1);
      const rest=page.getByRole('dialog',{name:/Rest Between Sets/});
      await rest.waitFor({state:'visible'});
      await rest.getByRole('button',{name:'Pause'}).click();
      await untilStore(page,K.rest,x=>x?.status==='paused');
      await page.reload();
      await page.getByRole('dialog',{name:/Rest Between Sets/}).getByRole('button',{name:'Resume'}).waitFor();
      await page.getByRole('dialog',{name:/Rest Between Sets/}).getByRole('button',{name:'Resume'}).click();
      await untilStore(page,K.rest,x=>x?.status==='running');
      await page.getByRole('dialog',{name:/Rest Between Sets/}).getByRole('button',{name:'Skip Rest'}).click();
      await untilStore(page,K.rest,x=>x?.status==='idle');
      await openOptions(page);
      await page.getByRole('button',{name:'Discard Workout'}).click();
      await page.getByRole('button',{name:'Confirm Discard'}).click();
      await untilStore(page,K.active,x=>x===null);
      assert.equal((await store(page,K.history)).length,0);
      return 'Timed and rest timers resume across reload; discard keeps history clean';
    } finally {await ctx.close();}
  });

  await check('A2.4 — Ciclos de treino/descanso e ajuste de sessao',async()=>{
    const roll=await vite.ssrLoadModule('/src/utils/rollingTrainingCycle.js');
    const integration=await vite.ssrLoadModule('/src/utils/rollingTrainingIntegration.js');
    const split=await vite.ssrLoadModule('/src/data/workoutSplits.js');
    const plan={splitId:'custom',sessions:[{id:'a'},{id:'b'}]};
    const fixed=split.createWeeklyTemplate(3,'custom');
    const monday=new Date(2026,10,9,12);
    assert.equal(roll.getScheduleDayForDate(fixed,monday).activity,'workout');
    const schedule={...fixed,mode:'rolling',rolling:{startDate:'2026-11-09',trainingDays:2,restDays:1,sessionIds:['a','b']}};
    assert.equal(roll.getRollingConfigurationError(schedule,plan),null);
    const at=n=>new Date(2026,10,9+n,12);
    assert.equal(roll.getScheduleDayForDate(schedule,at(0)).sessionId,'a');
    assert.equal(roll.getScheduleDayForDate(schedule,at(1)).sessionId,'b');
    assert.equal(roll.getScheduleDayForDate(schedule,at(2)).activity,'rest');
    assert.equal(roll.getScheduleDayForDate(schedule,at(3)).sessionId,'a');
    const bad=structuredClone(schedule);bad.rolling.sessionIds=['deleted'];
    assert(roll.getRollingConfigurationError(bad,plan));
    const saved=integration.prepareRollingScheduleSave(null,schedule,at(0));
    const next=integration.reconcileRollingScheduleForPlan(saved,{splitId:'custom',sessions:[{id:'a'},{id:'c'}]},fixed.days,at(3));
    assert.deepEqual(next.rolling.sessionIds,['a','c']);
    assert.equal(next.rolling.trackingStartDate,'2026-11-12');
    return 'Rest does not advance rotation; obsolete sessions reconciled; tracking reset';
  });

  await check('A2.5 — Graficos, historico e sugestoes nao mudam cargas',async()=>{
    const performance=await vite.ssrLoadModule('/src/utils/performanceAnalysis.js');
    const progression=await vite.ssrLoadModule('/src/utils/progressionRecommendations.js');
    const charts=await vite.ssrLoadModule('/src/utils/trainingChartData.js');
    const consistency=await vite.ssrLoadModule('/src/utils/consistencyMetrics.js');
    const rep={...pushTarget,sets:1,minReps:8,maxReps:12,weight:20};
    const p={name:'A2 Metrics',weightUnit:'kg',sessions:[{id:'a',name:'Workout A',exerciseEntries:[{entryId:'p1',exerciseId:'push-up',target:rep},{entryId:'p2',exerciseId:'push-up',target:rep}],exerciseIds:['push-up','push-up']} ]};
    const workout=(id,day)=>({id,planName:p.name,sessionId:'a',sessionName:'Workout A',weightUnit:'kg',finishedAt:new Date(2026,10,day,12).toISOString(),status:'completed',exercises:['p1','p2'].map(entryId=>({entryId,exerciseId:'push-up',target:rep,skipped:false,completedSets:[{setNumber:1,targetType:'reps',reps:12,weight:20}]}))});
    const history=[workout('a2-day1',9),workout('a2-day2',10)];
    const before=JSON.stringify({p,history});
    const items=performance.buildPerformanceInsights(p,history)[0].exercises;
    assert.equal(items.length,2);
    assert(items.every(x=>x.canReviewIncrease));
    const suggestions=progression.buildProgressionRecommendations(p,history)[0].exercises;
    assert(suggestions.every(x=>x.requiresUserApproval===true&&x.status==='review'));
    const catalog=charts.buildTrainingChartData(history);
    assert.equal(catalog.records.length,2,'Duplicate exercise entries must be grouped by workout');
    assert.equal(catalog.records[0].totalReps,24);
    assert.equal(charts.getTrainingChartStats(catalog.records).totalReps,48);
    const week=consistency.getConsistencyStats([history[0],{...history[0],id:'a2-same-day'}],1,new Date(2026,10,11,12));
    assert.equal(week.totalSessions,2);
    assert.equal(week.totalTrainingDays,1);
    assert.equal(JSON.stringify({p,history}),before,'Read-only metrics unexpectedly mutated inputs');
    const {ctx,page}=await newScenario({[K.plan]:p,[K.history]:history});
    try {await goto(page,'/progress/charts','Training Charts');await goto(page,'/progress/performance');}
    finally {await ctx.close();}
    return 'Duplicates grouped in charts; 48 reps; progression asks approval; input unchanged';
  });

} catch (e) {
  record('A2 setup','FAIL',e.stack || String(e));
} finally {
  if(browser) await browser.close().catch(()=>{});
  if(vite) await vite.close().catch(()=>{});
  try {assert.notEqual(initialGitStatus,null,'Git baseline missing');assert.equal(command('git',['status','--porcelain']),initialGitStatus,'Source working tree changed');record('A2 source integrity','PASS','Git status unchanged; no commit/push');}
  catch(e){record('A2 source integrity','FAIL',e.message);}
  const pass=results.filter(r=>r.status==='PASS').length;
  const fail=results.filter(r=>r.status==='FAIL').length;
  await mkdir(reportDir,{recursive:true});
  await writeFile(join(reportDir,'A2_report.json'),JSON.stringify({project:cwd,results,consoleMessages},null,2));
  console.log(`\n=== A2 FINAL REPORT ===\nPASS: ${pass} | FAIL: ${fail} | CONSOLE MESSAGES: ${consoleMessages.length}`);
  console.log('Report:',join(reportDir,'A2_report.json'));
  for(const m of consoleMessages.slice(0,8))console.log('CONSOLE:',m.type,m.message.slice(0,240));
  console.log('Browser: isolated. Repository: no source modifications, commits or push.');
  if(fail || consoleMessages.length>0)process.exitCode=1;
}
