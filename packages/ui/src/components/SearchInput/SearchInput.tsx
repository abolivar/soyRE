import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  placeholder: string;
}

export function SearchInput({
  placeholder,
  name = 'search',
  ...inputProps
}: SearchInputProps) {
  return (
    <label className="search-input">
      <Search size={17} strokeWidth={2.2} />
      <input
        {...inputProps}
        aria-label={inputProps['aria-label'] ?? placeholder}
        name={name}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}
