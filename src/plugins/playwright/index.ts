import { dirname, join, relative } from '../../util/path.js';
import { timerify } from '../../util/Performance.js';
import { hasDependency, load } from '../../util/plugin.js';
import { toEntryPattern } from '../../util/protocols.js';
import type { GenericPluginCallback, IsPluginEnabledCallback } from '../../types/plugins.js';
import type { PlaywrightTestConfig } from 'playwright/test';

// https://playwright.dev/docs/test-configuration

export const NAME = 'Playwright';

/** @public */
export const ENABLERS = ['@playwright/test'];

export const isEnabled: IsPluginEnabledCallback = ({ dependencies }) => hasDependency(dependencies, ENABLERS);

/** @public */
export const ENTRY_FILE_PATTERNS = ['**/*.@(spec|test).?(c|m)[jt]s?(x)'];

export const CONFIG_FILE_PATTERNS = ['playwright.config.{js,ts}'];

const toEntryPatterns = (
  testMatch: string | RegExp | Array<string | RegExp> | undefined,
  cwd: string,
  configFilePath: string,
  config: PlaywrightTestConfig
) => {
  if (!testMatch) return [];
  const dir = relative(cwd, config.testDir ? join(dirname(configFilePath), config.testDir) : dirname(configFilePath));
  const patterns = [testMatch].flat().filter((p): p is string => typeof p === 'string');
  return patterns.map(pattern => toEntryPattern(join(dir, pattern)));
};

const findPlaywrightDependencies: GenericPluginCallback = async (configFilePath, { cwd }) => {
  const config: PlaywrightTestConfig = await load(configFilePath);
  const projects = config.projects ? [config, ...config.projects] : [config];
  const patterns = projects.flatMap(config => toEntryPatterns(config.testMatch, cwd, configFilePath, config));
  if (patterns.length > 0) return patterns;
  return toEntryPatterns(ENTRY_FILE_PATTERNS, cwd, configFilePath, config);
};

export const findDependencies = timerify(findPlaywrightDependencies);
