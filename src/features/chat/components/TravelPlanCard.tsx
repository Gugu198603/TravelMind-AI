import { MapPin, Wallet } from 'lucide-react'
import type { TravelPlanPayload } from '../types'

export interface TravelPlanCardProps {
  plan: TravelPlanPayload
}

export function TravelPlanCard({ plan }: TravelPlanCardProps) {
  const totalBudget = plan.budget.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white/95">{plan.title}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
            <Wallet className="h-3.5 w-3.5" />
            <span>预算总计：¥{totalBudget.toLocaleString()}</span>
          </div>
        </div>
        {plan.mapPreview?.label && (
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/20 px-2 py-1 text-xs text-white/75">
            <MapPin className="h-3.5 w-3.5" />
            <span className="max-w-[10rem] truncate">{plan.mapPreview.label}</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <div className="text-xs font-medium text-white/80">行程时间线</div>
          <div className="mt-3 space-y-3">
            {plan.timeline.map((item, idx) => (
              <div key={`${item.time}-${idx}`} className="flex gap-3">
                <div className="flex w-14 shrink-0 flex-col items-end">
                  <div className="text-xs font-semibold text-white/90">{item.time}</div>
                </div>
                <div className="relative flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-sm font-medium text-white/90">{item.title}</div>
                  {(item.location || item.description) && (
                    <div className="mt-1 text-xs text-white/70">
                      {item.location ? `${item.location} · ` : ''}
                      {item.description ?? ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-white/80">预算分配</div>
          <div className="mt-2 space-y-2">
            {plan.budget.map((b) => {
              const pct = totalBudget > 0 ? (b.amount / totalBudget) * 100 : 0
              return (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-white/75">
                    <span>{b.label}</span>
                    <span>¥{b.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400/70 to-indigo-400/70"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-white/80">推荐景点</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {plan.spots.map((s, idx) => (
              <div
                key={`${s.name}-${idx}`}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium text-white/90">{s.name}</div>
                  {s.tag && (
                    <div className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-white/75">
                      {s.tag}
                    </div>
                  )}
                </div>
                {s.description && <div className="mt-1 text-xs text-white/70">{s.description}</div>}
              </div>
            ))}
          </div>
        </div>

        {plan.mapPreview && (
          <div>
            <div className="text-xs font-medium text-white/80">地图预览</div>
            <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-black/20">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-white/75">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{plan.mapPreview.label}</span>
                </div>
                {plan.mapPreview.lat != null && plan.mapPreview.lng != null && (
                  <span>
                    {plan.mapPreview.lat.toFixed(3)}, {plan.mapPreview.lng.toFixed(3)}
                  </span>
                )}
              </div>
              <div className="h-28 w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

