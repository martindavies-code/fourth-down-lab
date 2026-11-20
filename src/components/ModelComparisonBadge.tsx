import React from 'react';
import type { ModelComparisonPlay } from '../types/decision';
import { refVerdictDiffers, refVerdictShortLabel } from '../utils/comparison';
import { FlaskConical } from 'lucide-react';

interface ModelComparisonBadgeProps {
  /** The site's published verdict label for this decision. */
  siteVerdict: string;
  /** Reference row from the nfl4th development rebuild, when the play is covered. */
  comparison: ModelComparisonPlay | null | undefined;
}

/**
 * Compact, clearly-labelled comparison strip for a decision card.
 * Never alters the site's verdict: it only reports what nfl4th's
 * development rebuild (master branch, not yet released) says for the
 * identical pre-snap situation under this site's own verdict rules.
 */
export const ModelComparisonBadge: React.FC<ModelComparisonBadgeProps> = ({
  siteVerdict,
  comparison,
}) => {
  if (!comparison || comparison.ref_verdict === null) return null;

  const differs = refVerdictDiffers(siteVerdict, comparison.ref_verdict);
  const boost = comparison.ref_go_boost_pp;
  const boostText =
    boost !== null ? `go ${boost > 0 ? '+' : ''}${boost.toFixed(1)} pp` : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-[11px] ${
        differs
          ? 'border-violet-500/50 bg-violet-950/20'
          : 'border-slate-700/80 bg-[#0a0f1d]'
      }`}
      title="Experimental comparison: nfl4th development rebuild (master branch, not yet released). Site verdicts above still come from the released model."
    >
      <span className="inline-flex items-center gap-1 rounded border border-violet-400/40 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-300">
        <FlaskConical className="h-3 w-3" aria-hidden="true" />
        比較 Dev rebuild
      </span>
      {differs ? (
        <span className="font-semibold text-violet-200">
          Differs: {refVerdictShortLabel(comparison.ref_verdict)}
          {boostText && <span className="tabular-nums"> ({boostText})</span>}
        </span>
      ) : (
        <span className="font-medium text-slate-300">
          Agrees with this verdict
          {boostText && <span className="tabular-nums text-slate-400"> ({boostText})</span>}
        </span>
      )}
      <span className="ml-auto text-[10px] italic text-slate-400">
        nfl4th dev model, unreleased — comparison only
      </span>
    </div>
  );
};
