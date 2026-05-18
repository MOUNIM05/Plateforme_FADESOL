import { Quote } from "lucide-react";

function QuoteCard() {
  return (
    <div className="login-quote-card">
      <span className="login-quote-card__mark">
        <Quote size={34} fill="currentColor" strokeWidth={1.5} />
      </span>
      <div>
        <p>L’énergie de demain,<br />les solutions d’aujourd’hui.</p>
        <strong>Fadesol Power Solutions</strong>
      </div>
    </div>
  );
}

export default QuoteCard;
