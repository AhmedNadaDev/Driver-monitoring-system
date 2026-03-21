const ScoreBadge = ({ score, size = 'sm' }) => {
  const color =
    score >= 90
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
      : score >= 75
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
      : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'

  const sizeClass = size === 'md' ? 'px-3.5 py-1.5 text-sm font-semibold' : 'px-2.5 py-0.5 text-xs font-semibold'

  return (
    <span className={`inline-flex items-center rounded-lg font-semibold ${color} ${sizeClass}`}>
      {score}
    </span>
  )
}

export default ScoreBadge