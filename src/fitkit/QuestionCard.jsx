/**
 * QuestionCard - Single question with Likert scale response
 */
export default function QuestionCard({ question, scale, value, onChange }) {
  return (
    <div className="fitkit-question">
      <p className="fitkit-question-text">{question.text}</p>
      <div className="fitkit-likert">
        {scale.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`fitkit-likert-option ${value === option.value ? 'selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <div className="fitkit-likert-circle" />
            <span className="fitkit-likert-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
