/** Member photo with initials fallback (visual check-in verification). */
export function MemberAvatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ? `${name}'s photo` : "Member photo"}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-lime-500/15 text-lime-600 font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
