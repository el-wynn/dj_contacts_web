'use client';

import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowDelete?: (row: T) => void;
  loading?: boolean;
  skeletonRowCount?: number;
}

export function SortableTable<T extends Record<string, any>>({
  data,
  columns,
  onRowDelete,
  loading = false,
  skeletonRowCount = 4,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  if (loading) {
    return (
      <div className="table-container animate-pulse">
        <table className="sortable-table">
          <thead>
            <tr>
              {columns.map((column, i) => (
                <th key={i} className={column.sortable !== false ? 'sortable' : ''}>
                  <div className="h-5 bg-gray-200 rounded" />
                </th>
              ))}
              {onRowDelete && <th />}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRowCount }).map((_, idx) => (
              <tr key={idx}>
                {columns.map((column, i) => (
                  <td key={i}>
                    <div className="h-4 bg-gray-100 rounded" />
                  </td>
                ))}
                {onRowDelete && (
                  <td>
                    <div className="h-4 bg-gray-100 rounded w-8 mx-auto" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="sortable-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                onClick={() => column.sortable !== false && handleSort(column.key)}
                className={column.sortable !== false ? 'sortable' : ''}
              >
                <div className="th-content">
                  <span>{column.label}</span>
                  {column.sortable !== false && (
                    <span className="sort-indicator">
                      {sortKey === column.key && sortDirection === 'asc' && '▲'}
                      {sortKey === column.key && sortDirection === 'desc' && '▼'}
                      {sortKey !== column.key && '⇅'}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {onRowDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
              {onRowDelete && (
                <td>
                  <button
                    onClick={() => onRowDelete(row)}
                    className="delete-btn"
                    aria-label="Delete row"
                  >
                    🗑
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .table-container {
          width: 100%;
          overflow-x: auto;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sortable-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        thead {
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #212529;
          font-size: 13px;
          white-space: nowrap;
          user-select: none;
        }

        th.sortable {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        th.sortable:hover {
          background: #e9ecef;
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-indicator {
          font-size: 10px;
          color: #6c757d;
          opacity: 0.5;
        }

        th.sortable:hover .sort-indicator {
          opacity: 1;
        }

        tbody tr {
          border-bottom: 1px solid #f1f3f5;
          transition: background-color 0.15s;
        }

        tbody tr:hover {
          background: #f8f9fa;
        }

        tbody tr:last-child {
          border-bottom: none;
        }

        td {
          padding: 14px 16px;
          color: #495057;
          font-size: 13px;
        }

        .delete-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .delete-btn:hover {
          opacity: 1;
        }

        /* Responsive */
        @media (max-width: 768px) {
          th,
          td {
            padding: 10px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}