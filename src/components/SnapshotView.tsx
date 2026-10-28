import type { Snapshot } from '../api';
import { LETTERS } from '../stats';

/** Zobrazení otázky, která není v ministerské sadě (uložená kopie z importovaného testu) */
export default function SnapshotView({ snapshot: s }: { snapshot: Snapshot }) {
  return (
    <div className="question">
      <div className="q-meta">
        {s.category && <span className="chip">{s.category}</span>}
        {s.points != null && <span className="chip">{s.points} b.</span>}
        {s.code && <span className="muted">kód {s.code}</span>}
      </div>
      <h2 className="q-text">{s.text}</h2>
      {s.image && <img className="q-media" src={s.image} alt="" loading="lazy" />}
      <ol className="answers">
        {s.answers.map((a, i) => (
          <li key={i}>
            <div className={['answer', a.correct && 'correct', a.chosen && !a.correct && 'wrong', a.chosen && 'selected'].filter(Boolean).join(' ')}>
              <span className="letter">{LETTERS[i]}</span>
              <span className="answer-body"><span>{a.text}</span></span>
              {a.correct && <span className="answer-tag">správně</span>}
              {a.chosen && !a.correct && <span className="answer-tag">tvoje odpověď</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
