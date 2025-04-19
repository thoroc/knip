import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { main } from '../../src/index.js';
import { resolve } from '../../src/util/path.js';
import baseArguments from '../helpers/baseArguments.js';
import baseCounters from '../helpers/baseCounters.js';

const cwd = resolve('fixtures/plugins/aws-cdk');

test('Find dependencies with the aws-cdk plugin', async () => {
  const { issues, counters } = await main({
    ...baseArguments,
    cwd,
  });

  console.log(issues);

  assert(issues.devDependencies['package.json']['aws-cdk']);

  assert.deepEqual(counters, {
    ...baseCounters,
    binaries: 1,
    dependencies: 0,
    devDependencies: 2,
    unlisted: 1,
    processed: 3,
    total: 3,
  });
});
