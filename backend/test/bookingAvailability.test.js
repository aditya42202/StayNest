import test from 'node:test';
import assert from 'node:assert/strict';
import Property from '../src/models/Property.js';
import { hasRoomConflict, intervalsOverlap, isValidStayWindow } from '../src/utils/bookingAvailability.js';
import { calculateRentalPrice } from '../src/utils/rentalPricing.js';

test('stay windows reject invalid and past dates', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(isValidStayWindow(new Date('2026-01-02T10:00:00.000Z'), new Date('2026-01-02T11:00:00.000Z'), now), true);
  assert.equal(isValidStayWindow(new Date('2026-01-02T10:00:00.000Z'), new Date('2026-01-02T10:00:00.000Z'), now), false);
  assert.equal(isValidStayWindow(new Date('2025-12-31T10:00:00.000Z'), new Date('2026-01-02T10:00:00.000Z'), now), false);
  assert.equal(isValidStayWindow(new Date(Number.NaN), new Date('2026-01-02T10:00:00.000Z'), now), false);
});

test('availability intervals allow adjacent stays and reject overlaps', () => {
  const start = new Date('2026-01-02T10:00:00.000Z');
  const end = new Date('2026-01-02T12:00:00.000Z');
  assert.equal(intervalsOverlap(start, end, new Date('2026-01-02T12:00:00.000Z'), new Date('2026-01-02T14:00:00.000Z')), false);
  assert.equal(intervalsOverlap(start, end, new Date('2026-01-02T11:00:00.000Z'), new Date('2026-01-02T13:00:00.000Z')), true);
});

test('room reservations only conflict with the same room or whole-property bookings', () => {
  const roomOne = { _id: 'room-one' };
  assert.equal(hasRoomConflict({ room: 'room-one' }, roomOne._id), true);
  assert.equal(hasRoomConflict({ room: 'room-two' }, roomOne._id), false);
  assert.equal(hasRoomConflict({ room: null }, roomOne._id), true);
  assert.equal(hasRoomConflict({ room: 'room-two' }, undefined), true);
});

test('hourly and daily price quotes use the selected stay duration', () => {
  const property = { rent: 7200, rentPerDay: 600, rentPerHour: 50 };
  const checkIn = new Date('2026-01-02T10:00:00.000Z');
  const checkOut = new Date('2026-01-02T13:00:00.000Z');

  assert.deepEqual(calculateRentalPrice({ property, billingUnit: 'hour', checkIn, checkOut }), { rate: 50, amount: 150 });
  assert.deepEqual(calculateRentalPrice({
    property,
    billingUnit: 'day',
    checkIn,
    checkOut: new Date('2026-01-03T10:00:00.000Z')
  }), { rate: 600, amount: 600 });
});

test('property categories cover the supported accommodation types without exposing reservations', () => {
  const categories = Property.schema.path('category').enumValues;
  assert.ok(categories.includes('hotel'));
  assert.ok(categories.includes('hourly stay room'));
  assert.ok(categories.includes('monthly rental property'));
  assert.equal(Property.schema.path('activeReservations').options.select, false);
});
