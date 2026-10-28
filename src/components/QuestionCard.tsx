import { useState, type ReactNode } from 'react';
import { mediaUrl, type Question } from '../api';
import QuestionView from './QuestionView';

/** Rozbalovací karta otázky: v souhrnu text + náhled, po rozbalení odpovědi se správnou zvýrazněnou */
export default function QuestionCard({ question: q, extra, selected }: { question: Question; extra?: ReactNode; selected?: number | null }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="card qcard" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        {q.media?.type === 'image' && <img className="thumb" src={mediaUrl(q.media)} alt="" loading="lazy" />}
        {q.media?.type === 'video' && <span className="thumb video-thumb" aria-label="video">▶</span>}
        <span className="qcard-text">{q.text}</span>
        {extra && <span className="qcard-extra">{extra}</span>}
      </summary>
      {open && <QuestionView question={q} reveal selected={selected} />}
    </details>
  );
}
