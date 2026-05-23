const PAID_STATUS_MARKER_REGEX = /(?:\n|\r\n)?\[\[fixed_spending_paid:(paid|unpaid)\]\]\s*$/i;

export const getPaidStatusFromNote = (note = "") => {
  const match = String(note || "").match(PAID_STATUS_MARKER_REGEX);
  if (!match) return null;
  return match[1].toLowerCase() === "paid";
};

export const stripPaidStatusFromNote = (note = "") => {
  return String(note || "").replace(PAID_STATUS_MARKER_REGEX, "").trimEnd();
};

export const applyPaidStatusToNote = (note = "", isPaid = false) => {
  const cleanNote = stripPaidStatusFromNote(note);
  const marker = `[[fixed_spending_paid:${isPaid ? "paid" : "unpaid"}]]`;
  return cleanNote ? `${cleanNote}\n${marker}` : marker;
};

export const normalizeFixedSpendingItem = (item = {}) => {
  const paidFromNote = getPaidStatusFromNote(item.note);
  return {
    ...item,
    is_paid: paidFromNote ?? !!item.is_paid,
    note: stripPaidStatusFromNote(item.note),
  };
};

export const normalizeFixedSpendingItems = (items = []) => {
  return items.map(normalizeFixedSpendingItem);
};
