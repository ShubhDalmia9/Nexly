import { Plus, X } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useId, useMemo, useRef, useState } from 'react';
import { LIMITS } from '../../../shared/constants';
import { FieldShell } from './Field';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  max: number;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  /** A short list of one-tap additions shown under the field. */
  quickPicks?: string[];
  /** When false, only values from `suggestions` can be added (used by filters). */
  allowCustom?: boolean;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A multi-value combobox: type to filter suggestions, Enter or comma to add, Backspace to remove. */
export function TagInput({
  label,
  value,
  onChange,
  suggestions,
  max,
  placeholder,
  hint,
  error,
  optional,
  quickPicks,
  allowCustom = true,
}: TagInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // True once the arrow keys have been used, so Enter knows whether an option is deliberately highlighted.
  const [navigated, setNavigated] = useState(false);
  const full = value.length >= max;

  const options = useMemo(() => {
    const query = text.trim().toLowerCase();
    const available = suggestions.filter((item) => !value.some((selected) => same(selected, item)));
    if (!query) return available.slice(0, 8);
    const exact = available.filter((item) => item.toLowerCase() === query);
    const starts = available.filter((item) => item.toLowerCase() !== query && item.toLowerCase().startsWith(query));
    const contains = available.filter((item) => !item.toLowerCase().startsWith(query) && item.toLowerCase().includes(query));
    return [...exact, ...starts, ...contains].slice(0, 8);
  }, [text, suggestions, value]);

  const typed = text.trim();
  const canCreate = allowCustom && typed.length > 0 && !options.some((item) => same(item, typed)) && !value.some((item) => same(item, typed));
  const optionCount = options.length + (canCreate ? 1 : 0);
  const showMenu = open && !full && optionCount > 0;

  /** Adds one or more tags, skipping blanks, duplicates and anything beyond the limit. */
  const addAll = (tags: string[]) => {
    const next = [...value];
    for (const tag of tags) {
      const clean = tag.trim().replace(/\s+/g, ' ').slice(0, LIMITS.tag);
      if (!clean || next.length >= max || next.some((item) => same(item, clean))) continue;
      // Prefer the vocabulary's spelling so "python" becomes "Python".
      const known = suggestions.find((item) => same(item, clean));
      if (known) next.push(known);
      else if (allowCustom) next.push(clean);
    }
    setActive(0);
    setNavigated(false);
    if (next.length > value.length) onChange(next);
  };

  const add = (tag: string) => {
    setText('');
    // Close the list once a tag is added. Left open it would show unrelated suggestions over the
    // fields below, and a click meant for the next field would add one of them instead.
    setOpen(false);
    addAll([tag]);
  };

  const highlight = (index: number) => {
    setActive(index);
    setNavigated(true);
  };

  const remove = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      // The first press highlights the first option; later presses move down the list.
      setActive((current) => (optionCount === 0 || !navigated ? 0 : (current + 1) % optionCount));
      setNavigated(true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (optionCount === 0 ? 0 : (current - 1 + optionCount) % optionCount));
      setNavigated(true);
    } else if (event.key === 'Enter' || event.key === ',') {
      const highlighted = showMenu && navigated ? (active < options.length ? options[active] : typed) : null;
      // With nothing typed and nothing highlighted, Enter keeps its normal job of submitting the form.
      if (!typed && !highlighted) return;
      event.preventDefault();
      if (highlighted) add(highlighted);
      else if (event.key === 'Enter' && options[0]?.toLowerCase().startsWith(typed.toLowerCase())) add(options[0]);
      else if (allowCustom) add(typed);
      else if (options[0]) add(options[0]);
    } else if (event.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
    }
  };

  const picks = quickPicks?.filter((item) => !value.some((selected) => same(selected, item))).slice(0, 8) ?? [];

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      counter={`${value.length}/${max}`}
    >
      <div
        className="tag-input"
        onClick={(event) => {
          // Clicking the empty part of the box behaves like clicking the text field.
          if (event.target !== event.currentTarget) return;
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((tag) => (
          <span key={tag} className="chip chip--shared">
            <span>{tag}</span>
            <button type="button" className="chip__remove" aria-label={`Remove ${tag}`} onClick={() => remove(tag)}>
              <X aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          className="tag-input__field"
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={showMenu ? `${id}-option-${active}` : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          autoComplete="off"
          value={text}
          disabled={full}
          placeholder={full ? `Maximum of ${max} reached` : value.length === 0 ? placeholder : 'Add another…'}
          onChange={(event) => {
            // Pasting or typing "Python, SQL, R" adds each finished tag and keeps the last part editable.
            const parts = event.target.value.split(',');
            const rest = parts.pop() ?? '';
            if (parts.length > 0) addAll(parts);
            setText(rest.trimStart());
            // A comma finishes a tag, which closes the list until the next character is typed.
            setOpen(parts.length === 0 || rest.trim().length > 0);
            setActive(0);
            setNavigated(false);
          }}
          // Suggestions open on a click, on typing or with the arrow keys, but not on focus alone:
          // removing a tag returns focus here and should not cover the fields below with a menu.
          onClick={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            if (allowCustom && typed) add(typed);
            else setText('');
          }}
          onKeyDown={onKeyDown}
        />
        {showMenu && (
          <div className="tag-input__menu" id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`}>
            {options.map((option, index) => (
              <button
                key={option}
                type="button"
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={navigated && index === active}
                className="tag-input__option"
                tabIndex={-1}
                // Keep focus in the input so the blur handler does not close the menu first.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => highlight(index)}
                onClick={() => add(option)}
              >
                {option}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                id={`${id}-option-${options.length}`}
                role="option"
                aria-selected={navigated && active === options.length}
                className="tag-input__option"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => highlight(options.length)}
                onClick={() => add(typed)}
              >
                <span>Add “{typed}”</span>
                <small>New tag</small>
              </button>
            )}
          </div>
        )}
      </div>
      {picks.length > 0 && !full && (
        <div className="suggestions" aria-label={`Suggested ${label.toLowerCase()}`}>
          {picks.map((pick) => (
            <button key={pick} type="button" className="chip chip--outline" onClick={() => add(pick)}>
              <Plus aria-hidden />
              <span>{pick}</span>
            </button>
          ))}
        </div>
      )}
    </FieldShell>
  );
}
