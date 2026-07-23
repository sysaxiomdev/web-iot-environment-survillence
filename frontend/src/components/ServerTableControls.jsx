const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function SortHeader({ field, label, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  return (
    <button
      type="button"
      className="sort-header"
      onClick={() => onSort(field)}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span>{label}</span>
      <span aria-hidden="true">{active ? (sortDir === "asc" ? "Asc" : "Desc") : "Sort"}</span>
    </button>
  );
}


function ServerTableControls({
  search,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  total,
  loading,
  itemLabel = "records",
  searchPlaceholder = "Search",
  onPreviousPage,
  onNextPage,
}) {
  return (
    <div className="table-controls">
      <div className="table-controls__filters">
        <input
          className="search-input"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <label className="field field--page-size">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-controls__pager" aria-live="polite">
        <span>
          {total} {itemLabel} · Page {page} of {totalPages || 1}
        </span>
        <button
          type="button"
          className="ghost-button"
          onClick={onPreviousPage}
          disabled={loading || page <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={onNextPage}
          disabled={loading || page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default ServerTableControls;