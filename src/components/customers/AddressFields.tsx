"use client";

import Image from "next/image";
import { type InputHTMLAttributes, useEffect, useId, useRef, useState } from "react";

export type AddressValue = { streetAddress: string; city: string; state: string; zipCode: string };

type Suggestion = { placeId: string; main: string; secondary: string };

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const PLACES = "https://places.googleapis.com/v1";

/** Google Places API (New): address suggestions for what's typed so far. */
async function fetchSuggestions(input: string, sessionToken: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch(`${PLACES}/places:autocomplete`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY! },
    body: JSON.stringify({ input, sessionToken, includedRegionCodes: ["us"], includedPrimaryTypes: ["street_address", "premise", "subpremise"] }),
  });
  if (!res.ok) throw new Error(`Places autocomplete failed (${res.status})`);
  const data: {
    suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[];
  } = await res.json();
  return (data.suggestions ?? []).flatMap((s) =>
    s.placePrediction
      ? [{ placeId: s.placePrediction.placeId, main: s.placePrediction.structuredFormat?.mainText?.text ?? "", secondary: s.placePrediction.structuredFormat?.secondaryText?.text ?? "" }]
      : [],
  );
}

/** Splits a chosen place into street, city, state, and ZIP. */
async function fetchAddress(placeId: string, sessionToken: string): Promise<AddressValue> {
  const res = await fetch(`${PLACES}/places/${encodeURIComponent(placeId)}?sessionToken=${sessionToken}`, {
    headers: { "X-Goog-Api-Key": API_KEY!, "X-Goog-FieldMask": "addressComponents" },
  });
  if (!res.ok) throw new Error(`Place details failed (${res.status})`);
  const data: { addressComponents?: { longText: string; shortText: string; types: string[] }[] } = await res.json();
  const part = (type: string, short = false) => {
    const c = data.addressComponents?.find((a) => a.types.includes(type));
    return c ? (short ? c.shortText : c.longText) : "";
  };
  const unit = part("subpremise");
  return {
    streetAddress: [part("street_number"), part("route")].filter(Boolean).join(" ") + (unit ? ` #${unit}` : ""),
    city: part("locality") || part("postal_town") || part("sublocality") || part("administrative_area_level_3"),
    state: part("administrative_area_level_1", true),
    zipCode: part("postal_code"),
  };
}

const newSessionToken = () => crypto.randomUUID();

/** Whether address suggestions are available (a Maps key is configured). */
export const HAS_ADDRESS_AUTOCOMPLETE = Boolean(API_KEY);

/** One line, e.g. "123 Maple St, Springfield, IL 62704". */
export function formatAddress(a: AddressValue): string {
  const stateZip = [a.state, a.zipCode].filter(Boolean).join(" ");
  return [a.streetAddress, a.city, stateZip].filter((p) => p.trim()).join(", ");
}

/**
 * A text input that suggests Google addresses as you type. Typing calls onChange;
 * picking a suggestion calls onSelect with the address split into parts.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  className,
  placeholder,
  showPin = true,
  pinClassName = "left-3.5",
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onSelect"> & {
  value: string;
  onChange: (text: string) => void;
  onSelect: (address: AddressValue) => void;
  showPin?: boolean;
  pinClassName?: string;
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const session = useRef(newSessionToken());
  const box = useRef<HTMLDivElement>(null);

  // Debounced lookups while typing.
  useEffect(() => {
    if (!API_KEY || query.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetchSuggestions(query.trim(), session.current, ctrl.signal)
        .then((s) => {
          setSuggestions(s);
          setActive(-1);
          setOpen(s.length > 0);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.warn(err);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = async (s: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    try {
      const address = await fetchAddress(s.placeId, session.current);
      onSelect({ ...address, streetAddress: address.streetAddress || s.main });
    } catch (err) {
      console.warn(err);
      onChange(s.main);
    }
    // A session ends with the details lookup; the next search starts a new one.
    session.current = newSessionToken();
  };

  return (
    <div ref={box} className="relative">
      {showPin && <Image src="/customers/field-pin.svg" alt="" width={11} height={14} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${pinClassName}`} />}
      <input
        type="text"
        {...input}
        autoComplete="off"
        role={API_KEY ? "combobox" : undefined}
        aria-autocomplete={API_KEY ? "list" : undefined}
        aria-expanded={API_KEY ? open : undefined}
        aria-controls={API_KEY ? listId : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          if (e.target.value.trim().length < 3) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={API_KEY ? "Start typing an address…" : placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_12px_24px_-8px_rgba(8,39,65,0.2)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3.5 py-2.5 text-[14px] leading-5 ${i === active ? "bg-brand-light" : ""}`}
            >
              <span className="block font-semibold text-navy">{s.main}</span>
              <span className="block text-[12px] text-muted">{s.secondary}</span>
            </li>
          ))}
          <li aria-hidden className="px-3.5 pb-1 pt-2 text-right text-[10px] text-[#94a3b8]">
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  );
}

export default function AddressFields({
  value,
  onChange,
  inputClass,
  plainInputClass,
  labelClass,
  idPrefix,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  /** Input style with room for the pin icon. */
  inputClass: string;
  plainInputClass: string;
  labelClass: string;
  idPrefix: string;
}) {
  const set = (key: keyof AddressValue, v: string) => onChange({ ...value, [key]: v });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-street`} className={labelClass}>
          Street Address
        </label>
        <AddressAutocomplete
          id={`${idPrefix}-street`}
          value={value.streetAddress}
          onChange={(v) => set("streetAddress", v)}
          onSelect={onChange}
          placeholder="e.g., 123 Maple St"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-city`} className={labelClass}>
          City
        </label>
        <input id={`${idPrefix}-city`} type="text" autoComplete="off" value={value.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g., Springfield" className={plainInputClass} />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-state`} className={labelClass}>
            State
          </label>
          <input id={`${idPrefix}-state`} type="text" autoComplete="off" value={value.state} onChange={(e) => set("state", e.target.value)} placeholder="e.g., IL" className={plainInputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-zip`} className={labelClass}>
            ZIP Code
          </label>
          <input id={`${idPrefix}-zip`} type="text" inputMode="numeric" autoComplete="off" value={value.zipCode} onChange={(e) => set("zipCode", e.target.value)} placeholder="e.g., 62704" className={plainInputClass} />
        </div>
      </div>
    </>
  );
}
