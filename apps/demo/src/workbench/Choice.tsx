import { useId, type JSX } from "react";

interface ChoiceProps<T extends string> {
  legend: string;
  /** One line on what the choice does. */
  hint: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

/** A labelled group of radio buttons with a line saying what it does. */
export function Choice<T extends string>({ legend, hint, value, options, onChange }: ChoiceProps<T>): JSX.Element {
  const name = useId();
  const hintId = useId();
  return (
    <fieldset className="choice" aria-describedby={hintId}>
      <legend>{legend}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <label key={option}>
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <p className="hint" id={hintId}>
        {hint}
      </p>
    </fieldset>
  );
}
