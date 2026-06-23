// --- observer.ts ---
import { Observer } from './observer.ts';

interface TestEvents { ping: string; count: number }
const obs = new Observer<TestEvents>();
const log: string[] = [];

obs.on('ping', (msg) => log.push(`ping: ${msg}`));
obs.once('count', (n) => log.push(`once: ${n}`));
obs.on('count', (n) => log.push(`count: ${n}`));

obs.notify('ping', 'hello');
obs.notify('ping', 'world');
obs.notify('count', 42);
obs.notify('count', 99); // once already fired

console.log('Observer:', log);
// expect: ['ping: hello', 'ping: world', 'once: 42', 'count: 42', 'count: 99']

obs.destroy();
obs.notify('ping', 'after destroy');
console.log('After destroy (should stay same length):', log.length === 5);

// --- easing.ts ---
import { EASING, cssEasing } from './easing.ts';

console.log('\nEasing keys:', Object.keys(EASING));
console.log('cssEasing("elasticOut"):', cssEasing('elasticOut'));
console.log('cssEasing passthrough:', cssEasing('cubic-bezier(0,0,1,1)'));

// applyTransition needs HTMLElement — skip in Deno, just test the string logic
const result = cssEasing('easeInOut');
console.log('easeInOut value correct:', result === EASING.easeInOut);

// --- keyboard.ts ---
import { parseShortcut, matchesShortcut, matchesAny } from './keyboard.ts';

const ctrlA = parseShortcut('ctrl+a');
console.log('\nparseShortcut("ctrl+a"):', ctrlA);
console.log('ctrl+shift+z:', parseShortcut('ctrl+shift+z'));
console.log('f5:', parseShortcut('f5'));

// mock KeyboardEvent
const mockEvent = (key: string, ctrl = false, shift = false, alt = false, meta = false) =>
  ({ key, ctrlKey: ctrl, shiftKey: shift, altKey: alt, metaKey: meta }) as KeyboardEvent;

console.log('\nmatchesShortcut ctrl+a:', matchesShortcut(mockEvent('a', true), 'ctrl+a'));
console.log('matchesShortcut ctrl+a (wrong key):', matchesShortcut(mockEvent('b', true), 'ctrl+a'));
console.log('matchesShortcut escape:', matchesShortcut(mockEvent('Escape'), 'escape'));
console.log('matchesShortcut f5:', matchesShortcut(mockEvent('F5'), 'f5'));

const hit = matchesAny(mockEvent('z', true, true), ['ctrl+z', 'ctrl+shift+z', 'ctrl+y']);
console.log('matchesAny ctrl+shift+z:', hit);

// cache hit (same object returned)
const a = parseShortcut('ctrl+shift+s');
const b = parseShortcut('ctrl+shift+s');
console.log('cache hit (same ref):', a === b);

console.log('\nAll done.');
