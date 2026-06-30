'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import type { Tone } from '../../types';

export interface TabItem {
  value: string;
  label: string;
  panel: ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  ariaLabel: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  tone?: Tone;
}

export function Tabs({
  items,
  ariaLabel,
  value,
  defaultValue,
  onChange,
  tone = 'primary',
}: TabsProps) {
  const fallbackValue = items[0]?.value ?? '';
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? fallbackValue,
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  function selectTab(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  }

  function focusTab(index: number) {
    const button = tabRefs.current[index];
    button?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    const nextItem = items[nextIndex];
    if (!nextItem) {
      return;
    }

    selectTab(nextItem.value);
    focusTab(nextIndex);
  }

  return (
    <div className="tabs">
      <div aria-label={ariaLabel} className="tab-list" role="tablist">
        {items.map((item, index) => {
          const isActive = item.value === currentValue;
          const tabId = `tab-${item.value}`;
          const panelId = `panel-${item.value}`;
          const classes = ['tab', `tone-${tone}`, isActive ? 'active' : null]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              aria-controls={panelId}
              aria-selected={isActive}
              className={classes}
              id={tabId}
              key={item.value}
              onClick={() => selectTab(item.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const isActive = item.value === currentValue;
        return (
          <div
            aria-labelledby={`tab-${item.value}`}
            className="tab-panel"
            hidden={!isActive}
            id={`panel-${item.value}`}
            key={item.value}
            role="tabpanel"
          >
            {item.panel}
          </div>
        );
      })}
    </div>
  );
}
