const sizeMap = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
  xl: "w-[72px] h-[72px] text-2xl",
};

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizeMap;
}

export default function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const cls = `${sizeMap[size]} rounded-full flex-shrink-0`;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className={`${cls} object-cover`} />
    );
  }

  return (
    <div
      className={`${cls} bg-zinc-700 flex items-center justify-center font-bold text-white`}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
