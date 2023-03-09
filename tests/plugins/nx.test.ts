import assert from 'node:assert/strict';
import test from 'node:test';
import * as nx from '../../src/plugins/nx/index.js';
import { resolve, join } from '../../src/util/path.js';

const cwd = resolve('tests/fixtures/plugins/nx');

test('Find dependencies in Nx configuration (project.json)', async () => {
  const configFilePath = join(cwd, 'apps/a/project.json');
  const dependencies = await nx.findDependencies(configFilePath, { cwd });
  assert.deepEqual(dependencies, { dependencies: ['@nrwl/next', '@nrwl/linter', '@nrwl/cypress'], entryFiles: [] });
});

test('Find dependencies in Nx configuration (project.json)', async () => {
  const configFilePath = join(cwd, 'libs/b/project.json');
  const dependencies = await nx.findDependencies(configFilePath, { cwd });
  assert.deepEqual(dependencies, { dependencies: ['nx', '@nrwl/jest', 'compodoc'], entryFiles: [] });
});
