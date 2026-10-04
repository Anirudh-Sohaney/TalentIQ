const centralTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function getCheckinTime(date = new Date()) {
  const utc = date.toISOString();
  const central = centralTimeFormatter.format(date).replace(/\s+/g, " ").toLowerCase();

  if (!/^([1-9]|1[0-2]):[0-5][0-9] (am|pm)$/.test(central)) {
    throw new Error("Could not format the check-in time.");
  }

  return { utc, central };
}
