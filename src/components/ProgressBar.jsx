function ProgressBar({ current, total }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Question ${current} of ${total}`}
    >
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-label">
        Question {current} of {total}
      </p>
    </div>
  );
}

export default ProgressBar;
