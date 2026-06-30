import type { ReactNode } from 'react';

export type DataTableColumn = {
  key: string;
  label: string;
};

export type DataTableRow = {
  id: string;
  cells: Record<string, ReactNode>;
};

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{row.cells[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
