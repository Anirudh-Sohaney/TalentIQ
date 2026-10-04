const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getCheckinTime } = require('../lib/checkinTime.ts');

for (const [timestamp, expected] of [
  ['2026-09-30T13:41:23Z', '8:41 am'],
  ['2026-10-01T01:41:59Z', '8:41 pm'],
  ['2026-09-30T05:00:00Z', '12:00 am'],
  ['2026-09-30T17:00:00Z', '12:00 pm'],
  ['2026-01-15T14:41:23Z', '8:41 am'],
]) {
  test(`${timestamp} is ${expected} in Central Time`, () => {
    const date = new Date(timestamp);
    assert.deepEqual(getCheckinTime(date), {
      utc: date.toISOString(),
      central: expected,
    });
  });
}

test('invalid dates cannot produce a saved check-in time', () => {
  assert.throws(() => getCheckinTime(new Date('invalid')), RangeError);
});
