import type { ReactNode } from "react";
import type { Json } from "@/integrations/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = Record<string, Json | undefined>;
export default function AdminRecords({
  rows,
  fields,
  value,
  actions,
}: {
  rows: Row[];
  fields: string[];
  value: (row: Row, field: string) => ReactNode;
  actions: (row: Row) => ReactNode;
}) {
  return (
    <>
      <div className="space-y-4 md:hidden">
        {rows.map((row) => (
          <article
            key={String(row.id)}
            className="rounded-xl border bg-card p-4"
          >
            <dl className="mb-4 space-y-3">
              {fields.map((field) => (
                <div key={field}>
                  <dt className="mb-1 text-xs capitalize text-muted-foreground">
                    {field.replace(/_/g, " ")}
                  </dt>
                  <dd className="break-words text-sm">{value(row, field)}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t pt-3">{actions(row)}</div>
          </article>
        ))}
      </div>
      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((field) => (
                <TableHead key={field}>{field.replace(/_/g, " ")}</TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={String(row.id)}>
                {fields.map((field) => (
                  <TableCell key={field} className="max-w-[250px] break-words">
                    {value(row, field)}
                  </TableCell>
                ))}
                <TableCell>{actions(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
