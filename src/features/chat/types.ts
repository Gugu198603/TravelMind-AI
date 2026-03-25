export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageType = 'text' | 'thought' | 'tool' | 'travel_plan'

export interface ToolCallPayload {
  name: string
  args?: Record<string, unknown>
  result?: string
}

export interface TravelPlanTimelineItem {
  time: string
  title: string
  description?: string
  location?: string
}

export interface TravelBudgetItem {
  label: string
  amount: number
}

export interface TravelSpot {
  name: string
  description?: string
  tag?: string
}

export interface TravelPlanPayload {
  title: string
  timeline: TravelPlanTimelineItem[]
  budget: TravelBudgetItem[]
  spots: TravelSpot[]
  mapPreview?: {
    label: string
    lat?: number
    lng?: number
  }
}

export interface Message {
  id: string
  role: MessageRole
  type: MessageType
  content: string
  createdAt: number
  isStreaming?: boolean
  toolCall?: ToolCallPayload
  travelPlan?: TravelPlanPayload
}

