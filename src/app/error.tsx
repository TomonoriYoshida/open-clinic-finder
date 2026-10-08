"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="py-10 text-center">
      <p className="text-danger">表示中にエラーが発生しました。</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded-full border border-accent px-5 py-2 font-bold text-accent hover:bg-band"
      >
        再読み込み
      </button>
    </div>
  );
}
