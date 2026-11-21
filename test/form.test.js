import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, cityError } from '../public/form.js';

const formData = (entries) => new Map(Object.entries(entries));

test('buildRequest trims the city and maps checkboxes to booleans', () => {
  const body = buildRequest(formData({ city: '  Delhi ', commute: 'car', children: 'on' }));
  assert.deepEqual(body, {
    city: 'Delhi', commute: 'car',
    children: true, elderly: false, respiratory: false, purifier: false, gasStove: false,
  });
});

test('buildRequest tolerates a missing city', () => {
  assert.equal(buildRequest(formData({})).city, '');
});

test('cityError enforces the same length limits as the server', () => {
  assert.notEqual(cityError(''), '');
  assert.notEqual(cityError(' a '), '');
  assert.equal(cityError('Ongole'), '');
  assert.notEqual(cityError('x'.repeat(81)), '');
});
