/**
 * Where to turn when looking for an open clinic isn't the right move. #7119
 * and #8000 are run by the prefectures, and #7119 not in every one of them.
 */
export default function EmergencyNotice() {
  return (
    <aside className="rounded-xl border border-border bg-surface px-4 py-3 leading-relaxed">
      <p>
        <span className="font-bold text-danger">命に関わるときは迷わず </span>
        <a href="tel:119" className="font-bold text-danger underline underline-offset-2">
          119
        </a>
      </p>
      <p className="text-muted">
        救急車を呼ぶか迷ったら{" "}
        <a href="tel:#7119" className="text-accent underline underline-offset-2">
          #7119
        </a>
        （実施地域のみ）、子どもの急病は{" "}
        <a href="tel:#8000" className="text-accent underline underline-offset-2">
          #8000
        </a>
      </p>
    </aside>
  );
}
