// Score bar - AI değerlendirme skorunu görsel olarak göster
import { cn } from '@/lib/utils';

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const color =
    score >= 85 ? 'bg-red-500' :
    score >= 70 ? 'bg-orange-500' :
    score >= 50 ? 'bg-yellow-500' :
    score >= 30 ? 'bg-blue-500' :
    'bg-gray-400';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', color)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums w-10 text-right">
        {Math.round(score)}
      </span>
    </div>
  );
}