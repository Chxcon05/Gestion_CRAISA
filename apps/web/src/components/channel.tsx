import { CircleEllipsis, Globe, Mail, MapPin, MessageCircle, Phone, Camera, Tent, ThumbsUp, type LucideIcon } from 'lucide-react'
import { CHANNEL_LABELS, type Channel } from '@craisa/shared'
import { cn } from '@/lib/utils'

// Iconos genericos y no logotipos de marca: lucide retiro los de redes sociales y no se usan marcas de terceros.
export const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  CORREO: Mail,
  FACEBOOK: ThumbsUp,
  FERIA: Tent,
  INSTAGRAM: Camera,
  LLAMADA: Phone,
  OTRO: CircleEllipsis,
  SITIO_WEB: Globe,
  VISITA_COMERCIAL: MapPin,
  WHATSAPP: MessageCircle,
}

// auto marca los leads que entraron solos por un canal digital, para que el admin los distinga al repartirlos.
export function ChannelLabel({ auto, channel, className }: { auto?: boolean; channel: Channel; className?: string }) {
  const Icon = CHANNEL_ICONS[channel]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <Icon className="size-3.5 text-stone-400" aria-hidden />
      {CHANNEL_LABELS[channel]}
      {auto && (
        <span
          className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] leading-none font-medium text-sky-700 ring-1 ring-sky-600/20 ring-inset"
          title="Lead capturado automaticamente"
        >
          Automatico
        </span>
      )}
    </span>
  )
}
