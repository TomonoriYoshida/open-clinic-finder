/**
 * Marks a link that opens in a new tab, both to the eye and to screen
 * readers (DADS: リンクテキスト).
 */
export default function NewTabMark() {
  return (
    <>
      <span aria-hidden> ↗</span>
      <span className="sr-only">（新しいタブで開きます）</span>
    </>
  );
}
