import { Search } from 'lucide-react';

export function SearchInput({
  placeholder,
  name = 'search',
}: {
  placeholder: string;
  name?: string;
}) {
  return (
    <label className="search-input">
      <Search size={17} strokeWidth={2.2} />
      <input aria-label={placeholder} name={name} placeholder={placeholder} />
    </label>
  );
}
