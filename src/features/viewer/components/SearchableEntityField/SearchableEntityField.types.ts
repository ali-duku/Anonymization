export interface SearchableEntityFieldProps {
  id: string;
  value: string;
  entityLabels: readonly string[];
  coerceEntityLabel: (value: unknown) => string;
  onChange: (nextEntity: string) => void;
  className?: string;
}

