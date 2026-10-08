"use client";

import { useState, type FormEvent } from "react";
import { isWithinJapan, searchPlaces, type NamedPlace } from "@/lib/places";

type Props = {
  onPick: (place: NamedPlace) => void;
  /** Shown as the big first step on the landing screen, compact elsewhere. */
  prominent?: boolean;
};

export default function LocationPicker({ onPick, prominent = false }: Props) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<NamedPlace[] | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setError("このブラウザでは現在地を使えません。駅名や住所で探してください。");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const place = { latitude: position.coords.latitude, longitude: position.coords.longitude, name: "現在地", area: null };
        if (isWithinJapan(place)) {
          onPick(place);
        } else {
          setError("現在地が日本国内ではありません。駅名や住所で探してください。");
        }
      },
      (positionError) => {
        setLocating(false);
        setError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "位置情報の利用が許可されていません。駅名や住所で探してください。"
            : "現在地を取得できませんでした。駅名や住所で探してください。",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed === "") {
      return;
    }
    setSearching(true);
    setError(null);
    try {
      setCandidates(await searchPlaces(trimmed));
    } catch {
      setCandidates(null);
      setError("場所を検索できませんでした。時間をおいて、もう一度お試しください。");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className={`w-full rounded-xl bg-brand font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${
          prominent ? "px-6 py-4 text-lg" : "px-4 py-3"
        }`}
      >
        {locating ? "現在地を取得中…" : "📍 現在地から探す"}
      </button>

      <form onSubmit={search} className="mt-4" role="search">
        <label htmlFor="place-keyword" className="block font-bold">
          駅名・住所で探す
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="place-keyword"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            enterKeyHint="search"
            aria-describedby="place-keyword-hint"
            className="min-w-0 flex-1 rounded-xl border border-control-border bg-background px-4 py-3"
          />
          <button
            type="submit"
            disabled={searching}
            className="min-h-11 shrink-0 rounded-xl border border-accent px-4 font-bold text-accent hover:bg-band disabled:opacity-60"
          >
            {searching ? "検索中" : "検索"}
          </button>
        </div>
        <p id="place-keyword-hint" className="mt-1 text-sm text-muted">
          例：新宿駅、大阪市北区梅田
        </p>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}

      {candidates !== null && (
        <div className="mt-3" aria-live="polite">
          {candidates.length === 0 ? (
            <p className="leading-relaxed text-muted">見つかりませんでした。別の書き方（「〇〇駅」「〇〇市〇〇町」など）でお試しください。</p>
          ) : (
            <>
              <p className="text-sm text-muted">場所を選んでください</p>
              <ul className="mt-1 divide-y divide-border rounded-xl border border-control-border">
                {candidates.map((candidate) => (
                  <li key={`${candidate.name}-${candidate.latitude}-${candidate.longitude}`}>
                    <button
                      type="button"
                      onClick={() => onPick(candidate)}
                      className="w-full px-4 py-3 text-left hover:bg-band"
                    >
                      {candidate.name}
                      {candidate.area && <span className="ml-2 text-sm text-muted">{candidate.area}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
