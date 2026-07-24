import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-text">
      <Image
        src="/brand/app-icon.png"
        alt=""
        aria-hidden
        width={24}
        height={24}
        priority
        className="rounded-md"
      />
      <span className="label-mono text-xs">LectureAlly</span>
    </Link>
  );
}
