/**
 * Base UI's <Select.Value> only shows a real label for values it has seen
 * rendered as a <Select.Item> (registration-based); a value set purely via
 * default/controlled state (e.g. "any") otherwise falls back to printing the
 * raw value. Passing this as SelectValue's children (a value -> label
 * function, per Base UI's documented API) fixes that for every select.
 */
export function selectLabel(options: { value: string; label: string }[], placeholder: string) {
  return (value: string | null) => options.find((o) => o.value === value)?.label ?? placeholder;
}
