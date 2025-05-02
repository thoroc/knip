import { type PerformanceEntry, PerformanceObserver, performance } from 'node:perf_hooks';
import { constants } from 'node:perf_hooks';
import { memoryUsage } from 'node:process';
import prettyMilliseconds from 'pretty-ms';
import parsedArgValues from './cli-arguments.js';
import { debugLog } from './debug.js';
import { getStats } from './math.js';
import { Table } from './table.js';

const { performance: isEnabled = false } = parsedArgValues;

export const timerify = <T extends (...params: any[]) => any>(fn: T, name: string = fn.name): T => {
  if (!isEnabled) return fn;
  return performance.timerify(Object.defineProperty(fn, 'name', { get: () => name }));
};

class Performance {
  isEnabled: boolean;
  startTime = 0;
  endTime = 0;
  entries: PerformanceEntry[] = [];
  instanceId?: number;
  fnObserver?: PerformanceObserver;
  gcObserver?: PerformanceObserver;
  memoryUsageStart?: ReturnType<typeof memoryUsage>;

  constructor(isEnabled: boolean) {
    if (isEnabled) {
      this.startTime = performance.now();
      this.instanceId = Math.floor(performance.now() * 100);

      // timerified functions
      this.fnObserver = new PerformanceObserver(items => {
        for (const entry of items.getEntries()) {
          this.entries.push(entry);
        }
      });
      this.fnObserver.observe({ entryTypes: ['function'] });

      // major garbage collection events
      this.gcObserver = new PerformanceObserver(items => {
        for (const item of items.getEntries()) {
          if ((item.detail as { kind: number })?.kind === constants.NODE_PERFORMANCE_GC_MAJOR) {
            debugLog('*', `GC (after ${prettyMilliseconds(item.startTime)} in ${prettyMilliseconds(item.duration)})`);
          }
        }
      });
      this.gcObserver.observe({ entryTypes: ['gc'] });

      this.memoryUsageStart = memoryUsage();
    }
    this.isEnabled = isEnabled;
  }

  private setMark(name: string) {
    const id = `${this.instanceId}:${name}`;
    performance.mark(`${id}:start`);
  }

  private clearMark(name: string) {
    const id = `${this.instanceId}:${name}`;
    performance.mark(`${id}:end`);
    performance.measure(id, `${id}:start`, `${id}:end`);
    performance.clearMarks(`${id}:start`);
    performance.clearMarks(`${id}:end`);
  }

  private async flush() {
    this.setMark('_flush');
    await new Promise(resolve => setTimeout(resolve, 1));
    this.clearMark('_flush');
  }

  private getEntriesByName() {
    return this.entries.reduce(
      (entries, entry) => {
        const name = entry.name.replace(`${this.instanceId}:`, '');
        entries[name] = entries[name] ?? [];
        entries[name].push(entry.duration);
        return entries;
      },
      {} as Record<string, number[]>
    );
  }

  getTable() {
    const entriesByName = this.getEntriesByName();
    const table = new Table({ header: true });
    const twoFixed = (value: any) => (typeof value === 'number' ? value.toFixed(2) : value);
    for (const [name, values] of Object.entries(entriesByName)) {
      const stats = getStats(values);
      table.newRow();
      table.cell('Name', name);
      table.cell('size', values.length);
      table.cell('min', stats.min, twoFixed);
      table.cell('max', stats.max, twoFixed);
      table.cell('median', stats.median, twoFixed);
      table.cell('sum', stats.sum, twoFixed);
    }
    table.sort('sum|desc');
    return table.toString().trim();
  }

  getCurrentDurationInMs(startTime?: number) {
    return performance.now() - (startTime ?? this.startTime);
  }

  getMemHeapUsage() {
    return (memoryUsage().heapUsed ?? 0) - (this.memoryUsageStart?.heapUsed ?? 0);
  }

  getCurrentMemUsageInMb() {
    return Math.round((this.getMemHeapUsage() / 1024 / 1024) * 100) / 100;
  }

  public async finalize() {
    if (!this.isEnabled) return;
    // Workaround to get all entries
    await this.flush();
  }

  public reset() {
    this.entries = [];
    this.fnObserver?.disconnect();
  }
}

export const perfObserver = new Performance(isEnabled);
