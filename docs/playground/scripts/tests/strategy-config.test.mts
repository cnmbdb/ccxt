import test from 'node:test';
import assert from 'node:assert/strict';
import { createStrategy, starterStrategies, validateStrategy, validateCollection } from '../../lib/strategy-config.ts';

test('defaults survive persisted JSON round-trip and empty collection is valid', () => {
  assert.equal(validateCollection(JSON.parse(JSON.stringify(starterStrategies))), true);
  assert.equal(validateCollection([]), true);
});
test('EMA rejects reversed, equal, fractional or missing periods', () => {
  for (const [fast, slow] of [[26,12],[12,12],[2.5,26],[12,NaN]]) {
    const config=createStrategy('ema','ema'); config.parameters.fast=fast;config.parameters.slow=slow;
    assert.ok(validateStrategy(config).some(s=>s.includes('均线')));
  }
});
test('grid rejects reversed price boundaries and fractional grid count', () => {
  const config=createStrategy('grid','grid');config.parameters.upper=config.parameters.lower;
  assert.ok(validateStrategy(config).length);
  config.parameters.upper=75000;config.parameters.grids=2.5;
  assert.ok(validateStrategy(config).length);
});
test('DCA cannot exceed its order limit or use a fractional schedule', () => {
  const config=createStrategy('dca','dca');config.parameters.amount=config.maxOrder+1;
  assert.ok(validateStrategy(config).some(s=>s.includes('定投')));
  config.parameters.amount=20;config.parameters.interval=1.5;
  assert.ok(validateStrategy(config).some(s=>s.includes('间隔')));
});
test('Agent requires model, signal proposal permission and valid skills', () => {
  const config=createStrategy('agent','agent');
  assert.ok(validateStrategy(config).length);
  config.agent.model='test-model';config.agent.skills=[{id:'trend',name:'趋势分析',instructions:'检查趋势冲突后返回 hold。',enabled:true}];
  assert.deepEqual(validateStrategy(config),[]);
  config.agent.capabilities=['market.read'];
  assert.ok(validateStrategy(config).length);
});
test('Agent rejects order execution, withdrawal and duplicate capability permissions', () => {
  for(const capability of ['orders.create','withdraw','shell.exec','market.read']) {
    const config=createStrategy('agent','agent');config.agent.model='test-model';config.agent.capabilities.push(capability);
    assert.ok(validateStrategy(config).length);
  }
});
test('corrupt storage cannot pass structural validation', () => {
  for(const value of [null,{},[null],[{version:1}],{parameters:null},[{...createStrategy('ema','ema'),agent:{enabled:true}}]]) {
    assert.equal(validateCollection(value),false);
  }
  const config=createStrategy('ema','ema');config.parameters.lower=NaN;
  assert.ok(validateStrategy(JSON.parse(JSON.stringify(config))).length);
});
test('persisted collections reject duplicate identifiers and names', () => {
  const first=createStrategy('ema','a');const second=createStrategy('grid','a');
  assert.equal(validateCollection([first,second]),false);
  second.id='b';second.name=first.name;
  assert.equal(validateCollection([first,second]),false);
});
