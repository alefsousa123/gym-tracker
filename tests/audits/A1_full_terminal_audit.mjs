import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/*
 * Gym Tracker A1 -- automated functional audit, v1.
 * Read-only with respect to project source, Git, and the user's real browser data.
 * This script runs unit tests, lint, build, and a disposable Chrome Playwright context.
 * No production account, server, or browser profile is used.
 */

const root = process.cwd();
const tag = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(os.homedir(), 'Downloads', `GymTracker_A1_Audit_${tag}`);
const result = { startedAt: new Date().toISOString(), projectRoot: root, checks: [], browserErrors: [], notes: [] };
let browser = null;
let page = null;
let server = null;
let vite = null;
let testPort = 0;
let preGit = null;

function log(line) { console.log(line); }
function detailMessage(e) { return e?.stack || String(e); }
async function check(id, label, fn) {
  try {
    const value = await fn();
    result.checks.push({ id, label, status: 'PASS', detail: value ?? null });
    log(`PASS — ${id}: ${label}${value ? ' — ' + String(value).slice(0,160) : ''}`);
    return true;
  } catch (error) {
    const message = detailMessage(error);
    result.checks.push({ id, label, status: 'FAIL', detail: message });
    log(`FAIL — ${id}: ${label}\n    ${message.split('\n')[0]}`);
    if (page) {
      try { await page.screenshot({ path: path.join(outputDir, `FAIL_${id.replace(/[^a-z0-9._-]/gi, '_')}.png`), fullPage: true, timeout: 4000 }); } catch { /* ignore */ }
    }
    return false;
  }
}
function skip(id, label, reason) {
  result.checks.push({ id, label, status: 'SKIP', detail: reason });
  log(`SKIP — ${id}: ${label} (${reason})`);
}
function command(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: opts.timeout ?? 120000, maxBuffer: 12 * 1024 * 1024, ...opts });
  if (r.error || r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${r.status}): ${String(r.stderr || r.stdout || r.error).slice(-2400)}`);
  }
  return (r.stdout || '').trim();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function findPort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}
async function openRoute(url, expectedHeading = null) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });
  const title = (await page.locator('h1').first().innerText()).trim();
  assert(!/page not found|404|loading page|error loading/i.test(title), `Unexpected heading: ${title}`);
  if (expectedHeading) assert.match(title, expectedHeading, `${url} heading`);
  return title;
}
async function getStore(key) {
  return await page.evaluate((k) => {
    const v = window.localStorage.getItem(k);
    return v === null ? null : JSON.parse(v);
  }, key);
}
async function waitStore(key, predicate) {
  let last = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    last = await getStore(key);
    if (predicate(last)) return last;
    await sleep(150);
  }
  throw new Error(`localStorage ${key} did not match expected shape: ${JSON.stringify(last).slice(0, 300)}`);
}

if (!existsSync(path.join(root, 'package.json')) || !existsSync(path.join(root, 'src', 'App.jsx'))) {
  log('STOP — Execute dentro da pasta gym-tracker (onde ficam package.json e src/App.jsx).');
  process.exit(2);
}
await mkdir(outputDir, { recursive: true });
log('=== GYM TRACKER — A1 AUTOMATED AUDIT ===');
log(`Project: ${root}`);
log(`Report:  ${outputDir}`);

try {
  await check('A0.1', 'Git status registrado', () => {
    preGit = command('git', ['status', '--porcelain=v1']);
    return preGit ? `pre-existing changes: ${preGit.split('\n').length}` : 'working tree clean';
  });
  await check('A0.2', 'ESLint', () => { command('npm', ['run', 'lint']); return 'npm run lint'; });
  await check('A0.3', 'Production build', () => { command('npm', ['run', 'build'], { timeout: 180000 }); return 'npm run build'; });
  await check('A0.4', 'Catálogo, duração e normalização (Vite SSR)', async () => {
    const { createServer: createViteServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
    vite = await createViteServer({ root, logLevel: 'error', cacheDir: path.join(outputDir, 'vite-ssr-cache'), server: { middlewareMode: true }, appType: 'custom' });
    const { exercises } = await vite.ssrLoadModule('/src/data/exercises.js');
    const { createDefaultExerciseTarget, normalizeExerciseTarget, validateExerciseTarget } = await vite.ssrLoadModule('/src/utils/workoutTargets.js');
    const { splitDurationSeconds, combineDurationParts, formatDurationLabel } = await vite.ssrLoadModule('/src/utils/workoutDuration.js');
    assert.equal(exercises.length, 704);
    assert.equal(new Set(exercises.map(e => e.id)).size, 704);
    assert.equal(createDefaultExerciseTarget('cycling').targetType, 'duration');
    assert.equal(createDefaultExerciseTarget('stationary-bike').targetType, 'duration');
    assert.equal(createDefaultExerciseTarget('air-bike').targetType, 'duration');
    assert.equal(createDefaultExerciseTarget('wall-sit').targetType, 'duration');
    assert.equal(createDefaultExerciseTarget('plank').targetType, 'duration');
    assert.equal(createDefaultExerciseTarget('biceps-curl').targetType, 'reps');
    assert.equal(combineDurationParts(40, 0), 2400);
    assert.equal(combineDurationParts(1, 30), 90);
    assert.deepEqual(splitDurationSeconds(2400), { minutes: 40, seconds: 0 });
    assert.equal(formatDurationLabel(2400), '40 min');
    assert.equal(normalizeExerciseTarget('cycling', { targetType: 'reps', minReps: 8, maxReps: 10 }).targetType, 'reps');
    assert.equal(normalizeExerciseTarget('cycling', { minReps: 8, maxReps: 10 }).targetType, 'reps');
    const validated = validateExerciseTarget('cycling', { ...createDefaultExerciseTarget('cycling'), durationSeconds: 2400 });
    assert.equal(validated.error, null);
    assert.equal(validated.value.durationSeconds, 2400);
    await vite.close(); vite = null;
    return '704 IDs, cycling, bike, timed/reps, 40 min and legacy behavior';
  });

  let chromium = null;
  try {
    const requireTools = createRequire(import.meta.url);
    chromium = requireTools('playwright').chromium;
  } catch (error) {
    result.notes.push('Playwright missing in this project. Run npm install.');
    log('NOTE — Playwright missing. Run npm install and rerun.');
  }

  if (chromium) {
    const launched = await check('A0.5', 'Iniciar Chrome isolado (headless)', async () => {
      try {
        browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 20000 });
      } catch (err) {
        throw new Error(`Chrome não disponível para Playwright. Verifique Google Chrome instalado. ${err.message}`);
      }
      return 'temporary context; no personal browser data';
    });
    if (launched) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', serviceWorkers: 'block' });
      page = await ctx.newPage();
      page.on('pageerror', err => result.browserErrors.push({ type: 'pageerror', message: err.message, url: page.url() }));
      page.on('console', msg => {
        if (msg.type() === 'error' && !/favicon|\.webp|\.png|\.jpg|\.svg|resource|net::ERR/i.test(msg.text())) result.browserErrors.push({ type: 'console', message: msg.text().slice(0, 300), url: page.url() });
      });
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(20000);
      await check('A0.6', 'Iniciar servidor Vite temporário', async () => {
        testPort = await findPort();
        const args = ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(testPort), '--strictPort'];
        server = spawn('npm', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
        let diagnostic = '';
        server.stderr.on('data', b => diagnostic += String(b).slice(0, 800));
        server.stdout.on('data', b => diagnostic += String(b).slice(0, 800));
        let ready = false;
        for (let i = 0; i < 100; i++) {
          if (server.exitCode != null) break;
          try { const r = await fetch(`http://127.0.0.1:${testPort}/`); if (r.ok) { ready = true; break; } } catch { /* not yet */ }
          await sleep(200);
        }
        assert(ready, `Vite did not start: ${diagnostic}`);
        return `http://127.0.0.1:${testPort}`;
      });
      const base = `http://127.0.0.1:${testPort}`;
      if (server && server.exitCode === null) {
        await check('A1.1', 'Navegação pelas páginas principais', async () => {
          const routes = [
            ['/dashboard', /Dashboard/i], ['/workouts', /Workout/i], ['/workouts/plans', /Recommended Workout Plans/i],
            ['/workouts/builder', /Workout Builder/i], ['/workouts/schedule', /Weekly Schedule/i],
            ['/workouts/today', /Workout|Training/i], ['/progress', /Progress/i], ['/progress/history', /Workout History/i],
            ['/progress/consistency', /Consistency/i], ['/progress/performance', /Insights|Performance/i],
            ['/progress/charts', /Chart/i], ['/progress/body-fat', /Body Fat/i],
            ['/progress/measurements', /Measurement/i], ['/exercises', /Explore Exercises/i],
            ['/exercises/plank', /Plank/i], ['/settings', /Settings/i],
            ['/settings/profile', /Training Profile/i], ['/settings/equipment', /My Equipment/i],
          ];
          const failed = [];
          for (const [route, title] of routes) {
            try { await openRoute(base + route, title); } catch (e) { failed.push(`${route}: ${e.message.split('\n')[0]}`); }
          }
          assert.equal(failed.length, 0, failed.join('\n'));
          return `${routes.length} routes render headings`;
        });
        await check('A1.2', 'Salvar e reabrir perfil em contexto de teste', async () => {
          await openRoute(base + '/settings/profile', /Training Profile/);
          await page.locator('input[name="primaryGoal"][value="build-muscle"]').check({ force: true });
          await page.locator('input[name="experienceLevel"][value="beginner"]').check({ force: true });
          await page.locator('input[name="trainingLocation"][value="home"]').check({ force: true });
          await page.locator('#trainingDays').selectOption('3');
          await page.locator('#sessionDuration').selectOption('60');
          await page.getByRole('button', { name: 'Save Training Profile' }).click();
          await page.getByText('Training profile saved successfully.', { exact: false }).first().waitFor();
          await page.reload({ waitUntil: 'domcontentloaded' });
          const data = await waitStore('gym-tracker:profile:v1', v => v?.primaryGoal === 'build-muscle' && v?.sessionDurationMinutes === 60 && v?.trainingLocation === 'home');
          assert.equal(await page.locator('#sessionDuration').inputValue(), '60');
          return `goal=${data.primaryGoal}; 3 days, 60 min, home`;
        });
        await check('A1.3', 'Equipamento e persistência (Dumbbells)', async () => {
          await openRoute(base + '/settings/equipment', /My Equipment/);
          await page.locator('#equipment-search').fill('Dumbbells');
          const checkbox = page.locator('input[type="checkbox"][value="Dumbbells"]');
          await checkbox.waitFor({ state: 'attached' });
          if (!(await checkbox.isChecked())) await checkbox.check({ force: true });
          await page.reload({ waitUntil: 'domcontentloaded' });
          const data = await waitStore('gym-tracker:equipment:v1', v => Array.isArray(v) && v.includes('Dumbbells'));
          return `${data.length} selected; Dumbbells persisted`;
        });
        await check('A1.4', 'Página de recomendações com perfil salvo', async () => {
          await openRoute(base + '/workouts/plans', /Recommended Workout Plans/);
          await page.getByRole('heading', { name: 'Suggested Programs' }).waitFor();
          const body = await page.locator('main').innerText();
          assert(!/Set Up Your Training Profile/.test(body), 'App still requests a profile');
          assert(/ABC Training|Full Body Foundation|Upper \/ Lower Builder|Push \/ Pull \/ Legs/.test(body), 'No visible programs');
          return 'programs rendered with saved profile';
        });
        await check('A1.5', 'Workout Builder: exercício duplicado, tempos independentes e save', async () => {
          await openRoute(base + '/workouts/builder', /Workout Builder/);
          await page.locator('#builderSplit').selectOption('custom');
          await page.getByRole('button', { name: 'Change Split', exact: true }).click();
          await page.locator('#builderLocation').selectOption('home');
          await page.locator('#builderSearch').fill('Plank');
          const plankRow = page.locator('.builder-library-exercise').filter({ has: page.locator('strong:text-is("Plank")') }).first();
          await plankRow.waitFor({ state: 'visible' });
          await plankRow.getByRole('button', { name: '+ Add', exact: true }).click();
          await plankRow.getByRole('button', { name: '+ Add Again', exact: true }).click();
          const selected = page.locator('.builder-selected-item');
          assert.equal(await selected.count(), 2, 'Plank not added twice');
          const first = selected.nth(0); const second = selected.nth(1);
          await first.locator('summary').click();
          await second.locator('summary').click();
          assert.equal(await first.getByLabel('Target Type').inputValue(), 'duration');
          await first.getByLabel('Number of Sets').fill('1');
          await second.getByLabel('Number of Sets').fill('1');
          await first.getByLabel('Minutes', { exact: true }).fill('0');
          await first.getByLabel('Seconds', { exact: true }).fill('45');
          await first.getByLabel('Seconds', { exact: true }).blur();
          await second.getByLabel('Minutes', { exact: true }).fill('0');
          await second.getByLabel('Seconds', { exact: true }).fill('30');
          await second.getByLabel('Seconds', { exact: true }).blur();
          await page.getByRole('button', { name: 'Review & Save Plan' }).click();
          await page.getByRole('button', { name: 'Confirm & Save' }).click();
          const plan = await waitStore('gym-tracker:applied-plan:v1', v => v?.sessions?.[0]?.exerciseEntries?.length === 2);
          const items = plan.sessions[0].exerciseEntries;
          assert.notEqual(items[0].entryId, items[1].entryId);
          assert.deepEqual(items.map(e => e.target.durationSeconds), [45, 30]);
          assert.deepEqual(items.map(e => e.target.sets), [1, 1]);
          return 'two Planks saved separately: 45 sec and 30 sec';
        });
        await check('A1.6', 'Calendário e modo rotativo', async () => {
          await openRoute(base + '/workouts/schedule', /Weekly Schedule/);
          await page.getByRole('button', { name: 'Rolling Training Cycle' }).click();
          await page.getByRole('heading', { name: 'Next 14 Days' }).waitFor();
          const steps = await page.locator('select[aria-label^="Rotation step "]').count();
          assert(steps > 0, 'No workout rotation steps');
          return `${steps} rotation steps; 14-day preview visible`;
        });
        const exercisePassed = await check('A1.7', 'Execução: série por duração e persistência do treino ativo', async () => {
          await openRoute(base + '/workouts/today');
          await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
          await page.getByRole('button', { name: /Complete Set 1/ }).first().waitFor();
          const act = await waitStore('gym-tracker:active-workout:v1', v => v?.exercises?.length === 2);
          assert.equal(act.exercises[0].target.durationSeconds, 45);
          await page.reload({ waitUntil: 'domcontentloaded' });
          const restored = await waitStore('gym-tracker:active-workout:v1', v => v?.exercises?.length === 2);
          assert.equal(restored.exercises[0].target.durationSeconds, 45);
          await page.getByRole('button', { name: /Complete Set 1/ }).first().waitFor({ state: 'visible', timeout: 20000 });
          await page.getByRole('button', { name: /Complete Set 1/ }).first().click();
          await page.getByRole('button', { name: /Complete Set 1/ }).first().click();
          const updated = await waitStore('gym-tracker:active-workout:v1', v => v?.exercises?.reduce((n, e) => n + e.completedSets.length, 0) === 2);
          assert.deepEqual(updated.exercises.map(e => e.completedSets[0]?.durationSeconds), [45, 30]);
          return '2 timed sets recorded; refresh maintained active session';
        });
        if (exercisePassed) await check('A1.8', 'Histórico: finalizar, consultar e remover registro de teste', async () => {
          await page.getByRole('button', { name: 'Finish Workout', exact: true }).click();
          const history = await waitStore('gym-tracker:workout-history:v1', v => Array.isArray(v) && v.length === 1);
          assert.equal(history[0].exercises.length, 2);
          const id = history[0].id;
          await openRoute(base + '/progress/history/' + encodeURIComponent(id));
          const body = await page.locator('main').last().innerText();
          assert(body.includes('45 sec') || body.includes('30 sec'), 'No timed set results visible in history');
          await page.getByRole('button', { name: 'Delete Workout Record' }).click();
          await page.getByRole('button', { name: 'Confirm Delete' }).click();
          await page.waitForFunction(() => (JSON.parse(localStorage.getItem('gym-tracker:workout-history:v1') || '[]')).length === 0);
          return 'saved, viewed and deleted one isolated test workout';
        });
        else skip('A1.8', 'Histórico: finalizar, consultar e remover registro de teste', 'A1.7 did not complete');
        await check('A1.9', 'Compatibilidade de navegação legada', async () => {
          await page.goto(base + '/workouts/history');
          await page.waitForURL('**/progress/history', { timeout: 12000 });
          await page.goto(base + '/profile');
          await page.waitForURL('**/settings/profile', { timeout: 12000 });
          return 'old history/profile routes redirect correctly';
        });
        if (result.browserErrors.length > 0) {
          log(`WARN — Browser console/runtime messages captured: ${result.browserErrors.length} (see report)`);
        }
      } else {
        for (let n = 1; n <= 9; n++) skip(`A1.${n}`, 'Browser flow', 'Vite server unavailable');
      }
      await ctx.close();
    } else {
      for (let n = 1; n <= 9; n++) skip(`A1.${n}`, 'Browser flow', 'Chrome unavailable');
    }
  } else {
    for (let n = 1; n <= 9; n++) skip(`A1.${n}`, 'Browser flow', 'Playwright missing');
  }
} finally {
  if (server) {
    try { server.kill('SIGTERM'); } catch { /* ignore */ }
    await sleep(350);
  }
  if (browser) await browser.close().catch(() => {});
  if (vite) await vite.close().catch(() => {});
  try {
    const after = command('git', ['status', '--porcelain=v1']);
    const same = preGit === after;
    if (preGit != null) {
      result.checks.push({ id: 'A0.7', label: 'Working tree unchanged', status: same ? 'PASS' : 'WARN', detail: same ? 'No tracked/untracked project files changed' : `Before: ${preGit}; After: ${after}` });
      log(`${same ? 'PASS' : 'WARN'} — A0.7: Git working tree unchanged`);
    }
  } catch (e) { result.notes.push(`Git postcheck failed: ${e.message}`); }
  result.finishedAt = new Date().toISOString();
  result.counts = Object.fromEntries(['PASS', 'FAIL', 'SKIP', 'WARN'].map(k => [k, result.checks.filter(x => x.status === k).length]));
  const report = path.join(outputDir, 'A1_report.json');
  await writeFile(report, JSON.stringify(result, null, 2) + '\n');
  log('');
  log('=== A1 FINAL REPORT ===');
  log(`PASS: ${result.counts.PASS} | FAIL: ${result.counts.FAIL} | SKIP: ${result.counts.SKIP} | WARN: ${result.counts.WARN}`);
  log(`Report: ${report}`);
  log('Browser data: isolated; no changes to your personal Chrome profile.');
  log('Git/commit/push: none performed.');
  log('Please paste this final summary and FAIL lines back into the chat.');
  if (result.counts.FAIL > 0 || result.counts.SKIP > 0 || result.counts.WARN > 0 || result.browserErrors.length > 0) process.exitCode = 1;
}
