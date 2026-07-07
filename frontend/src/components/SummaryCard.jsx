function SummaryCard({ label, value, accent }) {
  return (
    <article className="summary-card">
      <span className="summary-card__label">{label}</span>
      <strong className={`summary-card__value summary-card__value--${accent}`}>
        {value}
      </strong>
    </article>
  );
}

export default SummaryCard;
