import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const base = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, base), 'utf8'));
const {robots, embodiments, unifiedActionSpace} = read('data/embodiments.json');
const {images, unpictured} = read('data/embodiment-sources.json');
const tasks = read('data/data.json').runs.filter(r => r.model === 'Astra');
const matches = (robot, task) => robot.benches.includes(task.bench) &&
  (robot.id === 'f1tenth' ? task.task === 'f1tenth-drift' : robot.id === 'mushr' ? task.task !== 'f1tenth-drift' : true);
assert.equal(robots.length, 20);
assert.equal(new Set(robots.map(r => r.id)).size, 20);
assert.equal(embodiments.length, 18);
assert.equal(new Set(embodiments.map(r => r.id)).size, 18);
const assigned = embodiments.flatMap(r => r.configurationIds);
assert.deepEqual([...assigned].sort(), robots.map(r => r.id).sort());
assert.deepEqual(embodiments.find(r => r.id === 'panda').configurationIds, ['panda','droid','panda-cup']);
for (const body of embodiments) {
  assert.equal(new Set(body.configurationIds.map(id => robots.find(r => r.id === id).domain)).size, 1);
}
const components = unifiedActionSpace.components;
assert.equal(unifiedActionSpace.kind, 'semantic-union');
assert.equal(components.length, 12);
const keys = components.flatMap(c => c.keys);
assert.equal(new Set(keys).size, keys.length, 'No double-counting across components');
for (const r of robots) for (const part of r.parts) assert.ok(keys.includes(part.key));
const dimensions = r => components.map(c => r.parts.filter(p => c.keys.includes(p.key)).reduce((n,p) => n+p.n,0));
const maxima = components.map((c,i) => Math.max(...robots.map(r => dimensions(r)[i])));
assert.deepEqual(maxima, [14,12,2,40,4,12,4,3,2,2,4,1]);
for (const r of robots) assert.equal(dimensions(r).reduce((n,v)=>n+v,0),r.dim);
assert.equal(robots.find(r=>r.id==='arx').parts[0].key,'eef');
assert.equal(robots.find(r=>r.id==='r1pro').parts[0].key,'eef');
assert.equal(tasks.length, 84);
assert.equal(Math.min(...robots.map(r => r.dim)), 2);
assert.equal(Math.max(...robots.map(r => r.dim)), 52);
for (const task of tasks) {
  const owners = robots.filter(r => matches(r, task));
  assert.equal(owners.length, 1, `Exactly one configuration for ${task.bench}/${task.task}`);
  assert.equal(owners[0].domain, task.domain);
}
for (const r of robots) {
  assert.equal(r.parts.reduce((n,p) => n + p.n, 0), r.dim, `${r.id}: dimension sum`);
  assert.ok(tasks.some(t => matches(r,t)), `${r.id}: nonempty task mapping`);
  assert.ok(r.note.en && r.note.zh && r.control.en && r.control.zh);
  assert.equal(r.contract.length, r.benches.length);
  if (r.image) {
    assert.ok(existsSync(new URL('assets/images/embodiments/' + r.image, base)), r.image);
    assert.ok(r.imageSource?.startsWith('https://'));
    assert.ok(images.some(i => i.robot === r.id && i.file.endsWith(r.image)));
  } else assert.ok(unpictured.some(i => i.robot === r.id));
}
for (const page of ['index.html','zh/index.html']) {
  const html = readFileSync(new URL(page, base), 'utf8');
  assert.equal((html.match(/id="embodiment-atlas"/g) || []).length, 1);
  assert.ok(html.includes('href="#embodiments"'));
  assert.ok(html.includes('/assets/css/embodiments.css'));
  assert.ok(html.includes('/assets/js/embodiments.js'));
  assert.ok(html.includes('Diverse Embodiment. One RobotWorld.'));
}
console.log('PASS: 18 embodiments, 20 profiles, 84 uniquely mapped tasks, 12-component union, action sums, assets, provenance, EN/ZH integration.');
