import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-text">
      <span aria-hidden className="text-accent">
        🎓
      </span>
      <span className="label-mono text-xs">LectureAlly</span>
    </Link>
  );
}
