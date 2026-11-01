export const intervalsOverlap = (firstStart, firstEnd, secondStart, secondEnd) => (
  new Date(firstStart) < new Date(secondEnd) && new Date(firstEnd) > new Date(secondStart)
);

export const hasRoomConflict = (reservation, roomId) => (
  !roomId || !reservation.room || reservation.room.toString() === roomId.toString()
);

export const isValidStayWindow = (checkIn, checkOut, now = new Date()) => (
  Number.isFinite(checkIn.getTime())
  && Number.isFinite(checkOut.getTime())
  && checkIn > now
  && checkOut > checkIn
);
