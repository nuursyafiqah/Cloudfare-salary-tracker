export const FIXED_SPENDING_CATEGORIES = [
  "Rent",
  "Loan",
  "Hutang",
  "Pika & (mak abah)",
  "Anak",
  "Loan ASB (Saving)",
  "Loan Rumah",
  "Internet",
  "Insurance",
  "Utilities",
  "Subscription",
  "Other",
];

export const normalizeFixedSpendingCategory = (category = "") => {
  if (category === "Yuran Anak") return "Anak";
  return category || "";
};
