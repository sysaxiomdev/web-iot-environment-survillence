function StatusPill({ status }) {
  const normalized = status || "unknown";
  return (
    <span className={`status-pill status-pill--${normalized.replace("_", "-")}`}>
      {normalized.replace("_", " ")}
    </span>
  );
}

export default StatusPill;
