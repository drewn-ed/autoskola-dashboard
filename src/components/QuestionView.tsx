import { mediaUrl, type Media, type Question } from '../api';
import { useData } from '../App';
import { LETTERS } from '../stats';

function MediaView({ media, className }: { media: Media; className?: string }) {
  return media.type === 'video' ? (
    <video className={className} src={mediaUrl(media)} controls playsInline preload="metadata" />
  ) : (
    <img className={className} src={mediaUrl(media)} alt="" loading="lazy" />
  );
}

type Props = {
  question: Question;
  /** id zvolené odpovědi */
  selected?: number | null;
  onSelect?: (answerId: number) => void;
  /** zobrazit správnou odpověď (a případně chybu) */
  reveal?: boolean;
  showMeta?: boolean;
};

export default function QuestionView({ question: q, selected, onSelect, reveal, showMeta = true }: Props) {
  const { areaName } = useData();
  return (
    <div className="question">
      {showMeta && (
        <div className="q-meta">
          <span className="chip">{areaName(q.area)}</span>
          <span className="chip">{q.points} {q.points === 1 ? 'bod' : q.points < 5 ? 'body' : 'bodů'}</span>
          <span className="muted">kód {q.code}</span>
        </div>
      )}
      <h2 className="q-text">{q.text}</h2>
      {q.note && <p className="q-note">{q.note}</p>}
      {q.media && <MediaView media={q.media} className="q-media" key={q.id} />}
      <ol className="answers">
        {q.answers.map((a, i) => {
          const isSel = selected === a.id;
          const isCorrect = a.id === q.correct;
          const cls = ['answer', isSel && 'selected', reveal && isCorrect && 'correct', reveal && isSel && !isCorrect && 'wrong']
            .filter(Boolean)
            .join(' ');
          return (
            <li key={a.id}>
              <button type="button" className={cls} onClick={onSelect ? () => onSelect(a.id) : undefined} disabled={!onSelect}>
                <span className="letter">{LETTERS[i]}</span>
                <span className="answer-body">
                  {a.media && <MediaView media={a.media} className="a-media" />}
                  {a.text && <span>{a.text}</span>}
                </span>
                {reveal && isCorrect && <span className="answer-tag">správně</span>}
                {reveal && isSel && !isCorrect && <span className="answer-tag">tvoje odpověď</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
