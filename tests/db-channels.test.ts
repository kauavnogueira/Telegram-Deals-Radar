import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatChannelUsername,
  addMonitoredChannel,
  getMonitoredChannels,
  removeMonitoredChannel,
  toggleMonitoredChannel,
} from '../src/lib/db';

test('formatChannelUsername sanitizes handles and links correctly', () => {
  assert.equal(formatChannelUsername('@ofertaz'), '@ofertaz');
  assert.equal(formatChannelUsername('ofertaz'), '@ofertaz');
  assert.equal(formatChannelUsername('https://t.me/ofertaz'), '@ofertaz');
  assert.equal(formatChannelUsername('t.me/promobit_oficial?param=1'), '@promobit_oficial');
  assert.equal(formatChannelUsername('-1001906755174'), '-1001906755174');
  assert.equal(formatChannelUsername(''), '');
});

test('addMonitoredChannel, getMonitoredChannels and removeMonitoredChannel work as expected', () => {
  const testChannel = '@canal_unit_test';
  
  // Clean up if already exists from previous runs
  removeMonitoredChannel(testChannel);

  // Add channel
  const addRes = addMonitoredChannel(testChannel, 'Canal Teste');
  assert.equal(addRes.success, true);
  assert.equal(addRes.channel?.username, testChannel);

  // Listing includes channel
  const channels = getMonitoredChannels();
  const found = channels.find((c) => c.username === testChannel);
  assert.ok(found);
  assert.equal(found?.isActive, true);

  // Duplicate addition is rejected
  const dupRes = addMonitoredChannel(testChannel);
  assert.equal(dupRes.success, false);

  // Toggle active status
  toggleMonitoredChannel(testChannel, false);
  const channelsInactive = getMonitoredChannels();
  const foundInactive = channelsInactive.find((c) => c.username === testChannel);
  assert.equal(foundInactive?.isActive, false);

  // Remove channel
  const removeRes = removeMonitoredChannel(testChannel);
  assert.equal(removeRes, true);

  // Verify removed
  const finalChannels = getMonitoredChannels();
  assert.equal(finalChannels.some((c) => c.username === testChannel), false);
});

test('addMonitoredChannel supports numeric Telegram IDs', () => {
  const testId = '-1009998887776';
  removeMonitoredChannel(testId);
  const addRes = addMonitoredChannel(testId, 'Canal Privado Teste');
  assert.equal(addRes.success, true);
  assert.equal(addRes.channel?.username, testId);
  removeMonitoredChannel(testId);
});
