"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  title?: string;
  searchFields?: (keyof T)[];
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  title,
  searchFields = [],
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (!searchTerm) return true;
      return searchFields.some((field) =>
        String(item[field])
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm, searchFields]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = String(a[sortKey] ?? "");
      const bVal = String(b[sortKey] ?? "");
      const cmp = aVal.localeCompare(bVal, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        {title && <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>}

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="px-4 py-3 text-left font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors"
                    onClick={() =>
                      col.sortable && handleSort(col.key)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No records found.
                  </td>
                </tr>
              ) : null}
              {paginatedData.map((row, idx) => (
                <motion.tr
                  key={String(row.id || idx)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-4 py-3 text-slate-300"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key])}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
