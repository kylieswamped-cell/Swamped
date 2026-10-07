"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { SettingsResult } from "@/lib/settings/actions";
import type { Status } from "./ui";

/**
 * Local state for one settings card: edits, Cancel back to the last save,
 * and Save with field errors and a status line.
 */
export function useSettingsForm<T>(
  initial: T,
  save: (values: T) => Promise<SettingsResult>,
  /** Adjusts what's kept after a successful save, e.g. clearing password fields. */
  afterSave: (values: T) => T = (v) => v,
) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function set<K extends keyof T>(key: K, value: T[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus(null);
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function update(fn: (v: T) => T) {
    setValues(fn);
    setStatus(null);
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    startTransition(async () => {
      const result = await save(values);
      setErrors(result.fieldErrors ?? {});
      if (result.error || result.fieldErrors) {
        setStatus({ error: result.error ?? "Please fix the highlighted fields." });
        return;
      }
      const kept = afterSave(values);
      setSaved(kept);
      setValues(kept);
      setStatus({ notice: result.notice ?? "Changes saved." });
    });
  }

  function cancel() {
    setValues(saved);
    setErrors({});
    setStatus(null);
  }

  /** Records part of the form as saved elsewhere (e.g. a template's own Save button). */
  function commit(fn: (v: T) => T) {
    setSaved(fn);
  }

  return { values, set, update, errors, setErrors, status, setStatus, pending, dirty, submit, cancel, commit };
}
