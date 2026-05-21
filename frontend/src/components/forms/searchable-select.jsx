"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import styles from "./searchable-select.module.css";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function useDismissableLayer(open, onClose) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return rootRef;
}

export function SearchableSelect({
  ariaLabel,
  disabled = false,
  emptyMessage = "No matching options.",
  name,
  onChange,
  onValueChange,
  options,
  placeholder = "Select an option",
  required = false,
  searchPlaceholder = "Search...",
  value,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const listId = useId();
  const rootRef = useDismissableLayer(open, () => setOpen(false));

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value],
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => normalizeText(option.label).includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
      searchRef.current.select();
    }
  }, [open]);

  function commit(nextValue) {
    const normalizedValue = String(nextValue);
    onValueChange?.(normalizedValue);
    onChange?.({ target: { name, value: normalizedValue } });
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={styles.field}>
      {required ? <input className={styles.srInput} tabIndex={-1} value={value || ""} onChange={() => {}} required aria-hidden="true" /> : null}
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span className={`${styles.triggerLabel} ${selectedOption ? "" : styles.triggerPlaceholder}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className={styles.panel}>
          <input
            ref={searchRef}
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`${ariaLabel || placeholder} search`}
          />
          <div id={listId} className={styles.options} role="listbox" aria-label={ariaLabel}>
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => commit(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })
            ) : (
              <p className={styles.empty}>{emptyMessage}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SearchableMultiSelect({
  ariaLabel,
  emptyMessage = "No matching options.",
  label,
  onToggle,
  options,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  selectedValues,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const rootRef = useDismissableLayer(open, () => setOpen(false));

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedValues.includes(String(option.value))),
    [options, selectedValues],
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => normalizeText(option.label).includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
      searchRef.current.select();
    }
  }, [open]);

  return (
    <div ref={rootRef} className={styles.field}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel || label}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span className={`${styles.triggerLabel} ${selectedOptions.length ? "" : styles.triggerPlaceholder}`}>
          {selectedOptions.length ? `${selectedOptions.length} selected` : placeholder}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className={styles.panel}>
          <input
            ref={searchRef}
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`${ariaLabel || label} search`}
          />
          {selectedOptions.length ? (
            <div className={styles.summary}>
              {selectedOptions.map((option) => (
                <span key={option.value} className={styles.summaryPill}>
                  {option.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.options} role="listbox" aria-multiselectable="true" aria-label={ariaLabel || label}>
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(String(option.value));
                return (
                  <button
                    key={option.value}
                    className={`${styles.multiOption} ${isSelected ? styles.multiOptionSelected : ""}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onToggle(String(option.value))}
                  >
                    <span className={styles.check} aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })
            ) : (
              <p className={styles.empty}>{emptyMessage}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
