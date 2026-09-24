const SourceList = ({ sources, onSelect }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="sources">
      {sources.map((source, index) => {
        const className =
          source.type === "STUDY_MATERIAL"
            ? "source-chip material"
            : "source-chip video";

        return (
          <button
            key={`${source.type}-${index}`}
            type="button"
            className={className}
            onClick={() => onSelect(source)}
          >
            {source.label}
          </button>
        );
      })}
    </div>
  );
};

export default SourceList;
