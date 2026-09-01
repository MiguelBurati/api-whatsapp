const test = require('node:test');
const assert = require('node:assert/strict');
const { getMessageText, hasMediaTrigger } = require('../src/shared/utils');

test('should detect media messages that trigger the bot even without caption', () => {
  assert.equal(getMessageText({ imageMessage: { mimeType: 'image/jpeg' } }), '');
  assert.equal(hasMediaTrigger({ imageMessage: { mimeType: 'image/jpeg' } }), true);
  assert.equal(hasMediaTrigger({ audioMessage: { mimeType: 'audio/ogg; codecs=opus' } }), true);
});

test('should ignore non-media text messages and keep caption extraction', () => {
  assert.equal(getMessageText({ conversation: 'Olá' }), 'Olá');
  assert.equal(getMessageText({ imageMessage: { caption: 'Foto do cliente' } }), 'Foto do cliente');
  assert.equal(hasMediaTrigger({ conversation: 'Olá' }), false);
});
