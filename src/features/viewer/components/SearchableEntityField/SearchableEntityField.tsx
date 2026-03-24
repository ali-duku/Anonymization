import { memo, useEffect, useMemo, useState } from "react";
import styles from "./SearchableEntityField.module.css";
import type { SearchableEntityFieldProps } from "./SearchableEntityField.types";

function SearchableEntityFieldComponent({
  id,
  value,
  entityLabels,
  coerceEntityLabel,
  onChange,
  className
}: SearchableEntityFieldProps) {
  const selectedEntity = coerceEntityLabel(value);
  const [query, setQuery] = useState<string>(selectedEntity);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    setQuery(selectedEntity);
  }, [selectedEntity]);

  const filteredEntities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return entityLabels;
    }
    return entityLabels.filter((entity) =>
      entity.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [entityLabels, query]);

  useEffect(() => {
    if (activeIndex < filteredEntities.length) {
      return;
    }
    setActiveIndex(filteredEntities.length > 0 ? filteredEntities.length - 1 : 0);
  }, [activeIndex, filteredEntities]);

  const commitSelection = (entity: string) => {
    const nextEntity = coerceEntityLabel(entity);
    onChange(nextEntity);
    setQuery(nextEntity);
    setIsOpen(false);
  };

  return (
    <div className={styles.root}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        className={className}
        value={query}
        onFocus={() => {
          setIsOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onBlur={() => {
          setIsOpen(false);
          setQuery(selectedEntity);
        }}
        onKeyDown={(event) => {
          if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setIsOpen(true);
            return;
          }

          if (!isOpen) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((previous) =>
              filteredEntities.length === 0 ? 0 : Math.min(previous + 1, filteredEntities.length - 1)
            );
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((previous) => (filteredEntities.length === 0 ? 0 : Math.max(previous - 1, 0)));
            return;
          }

          if (event.key === "Enter") {
            if (filteredEntities.length === 0) {
              return;
            }
            event.preventDefault();
            commitSelection(filteredEntities[activeIndex] ?? filteredEntities[0]);
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            setQuery(selectedEntity);
          }
        }}
      />

      {isOpen ? (
        <ul className={styles.list}>
          {filteredEntities.length > 0 ? (
            filteredEntities.map((entity, index) => (
              <li
                key={entity}
                className={`${styles.option} ${index === activeIndex ? styles.optionActive : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitSelection(entity);
                }}
              >
                {entity}
              </li>
            ))
          ) : (
            <li className={styles.empty}>No matches</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export const SearchableEntityField = memo(SearchableEntityFieldComponent);

