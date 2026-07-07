function Loader({ label = "Loading..." }) {
  return (
    <div className="loader-shell">
      <div className="loader-card" role="status" aria-live="polite">
        <div className="loader-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default Loader;
