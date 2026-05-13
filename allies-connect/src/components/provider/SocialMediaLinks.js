import "../../App.css";

const MAX_LINKS = 5;

function SocialMediaLinks({ links, onChange }) {
  const entries = Array.isArray(links) ? links : [];

  const handleAdd = () => {
    if (entries.length >= MAX_LINKS) return;
    onChange([...entries, { name: "", url: "" }]);
  };

  const handleRemove = (index) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, field, value) => {
    const updated = entries.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    onChange(updated);
  };

  return (
    <div>
      {entries.map((entry, index) => (
        <div key={index} className="d-flex gap-2 mb-2 align-items-center">
          <input
            type="text"
            className="form-control"
            placeholder="Service name (e.g. Facebook)"
            value={entry.name}
            onChange={(e) => handleFieldChange(index, "name", e.target.value)}
          />
          <input
            type="url"
            className="form-control"
            placeholder="https://..."
            value={entry.url}
            onChange={(e) => handleFieldChange(index, "url", e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => handleRemove(index)}
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      {entries.length < MAX_LINKS && (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={handleAdd}
        >
          + Add Social Media Link
        </button>
      )}
      {entries.length >= MAX_LINKS && (
        <small className="text-muted d-block mt-1">
          Maximum of {MAX_LINKS} links reached.
        </small>
      )}
    </div>
  );
}

export default SocialMediaLinks;
