interface IconProps {
  name: string
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded${className ? ' ' + className : ''}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name}
    </span>
  )
}
