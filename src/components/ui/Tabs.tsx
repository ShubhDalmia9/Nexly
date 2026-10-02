import { type KeyboardEvent, useRef } from 'react';
import { cx } from '../../utils/format';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  /** Draws attention to the count, e.g. requests waiting for an answer. */
  alert?: boolean;
}

interface TabsProps<T extends string> {
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Prefix for the ids that link each tab to its panel: `${idPrefix}-tab-<id>` / `${idPrefix}-panel-<id>`. */
  idPrefix: string;
}

export function Tabs<T extends string>({ label, tabs, value, onChange, idPrefix }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${idPrefix}-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className="tab"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cx('tab__count', tab.alert && tab.count > 0 && 'tab__count--alert')}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
