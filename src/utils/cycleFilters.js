export function toDateOnly(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.split("T")[0];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;

  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}


export function formatDateOnlyFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateOnly(value, days) {
  const date = parseDateOnly(value);
  if (!date) return "";

  date.setDate(date.getDate() + days);
  return formatDateOnlyFromDate(date);
}

export function getPreviousDate(value) {
  return addDaysToDateOnly(value, -1);
}

export function formatDisplayDate(value) {
  const date = parseDateOnly(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isDateInSalaryCycle(dateValue, cycle) {
  if (!dateValue || !cycle?.start_date) return false;

  const date = toDateOnly(dateValue);
  const start = toDateOnly(cycle.start_date);
  const end = toDateOnly(cycle.end_date);

  if (!date || !start) return false;
  if (date < start) return false;
  if (end && date > end) return false;

  return true;
}

export function filterExpensesForCycle(expenses = [], cycle) {
  return expenses.filter((expense) => isDateInSalaryCycle(expense.date, cycle));
}
