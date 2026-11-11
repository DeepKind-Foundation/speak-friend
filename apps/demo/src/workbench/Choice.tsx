import { useId, type JSX } from "react";

interface ChoiceProps<T extends string> {
  legend: string;
  value: T;
  options: readonly T[];
  /** Text to show instead of the value, for values that read badly as text. */
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}

/** A labelled group of radio buttons. */
export function Choice<T extends string>({ legend, value, options, labels, onChange }: ChoiceProps<T>): JSX.Element {
  const name = useId();
  return (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <label key={option}>
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
            <span>{labels?.[option] ?? option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
