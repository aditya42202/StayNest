export const millisecondsPerUnit = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
};

export const getRentalRate = (property, room, billingUnit) => {
  const monthlyRate = Number(room?.price || property.rent);
  const dailyRate = Number(property.rentPerDay || monthlyRate / 30);
  const hourlyRate = Number(property.rentPerHour || dailyRate / 24);

  if (billingUnit === 'hour') return hourlyRate;
  if (billingUnit === 'day') return dailyRate;
  if (billingUnit === 'year') return monthlyRate * 12;
  return monthlyRate;
};

export const calculateRentalPrice = ({ property, room, billingUnit, checkIn, checkOut }) => {
  const rate = getRentalRate(property, room, billingUnit);
  const duration = (new Date(checkOut) - new Date(checkIn)) / millisecondsPerUnit[billingUnit];
  const amount = Math.round(rate * duration * 100) / 100;

  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(duration) || duration <= 0 || amount <= 0) {
    throw new Error('Unable to calculate rent for the selected dates and billing period');
  }

  return { rate, amount };
};

export const addBillingPeriod = (date, billingUnit) => {
  const start = new Date(date);
  return new Date(start.getTime() + millisecondsPerUnit[billingUnit]);
};