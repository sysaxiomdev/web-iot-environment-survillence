export function formatDateTime(value) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatNumber(value, suffix = "") {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(1)}${suffix}`;
}
