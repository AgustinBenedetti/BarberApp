"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { Users } from "lucide-react";
import { getClients } from "@/actions/clients";
import type { ClientRow, ClientFilter } from "@/actions/clients";
import { ClientCard } from "./client-card";
import { ClientSearch } from "./client-search";
import { ClientFilters } from "./client-filters";

interface ClientListViewProps {
  initialClients: ClientRow[];
  initialTotal: number;
}

export function ClientListView({
  initialClients,
  initialTotal,
}: ClientListViewProps) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Ref to avoid stale closure in debounce
  const filterRef = useRef(filter);
  const queryRef = useRef(query);
  filterRef.current = filter;
  queryRef.current = query;

  const fetchClients = useCallback(
    (q: string, f: ClientFilter, p: number, append = false) => {
      startTransition(async () => {
        const result = await getClients(q, f, p);
        setTotal(result.total);
        if (append) {
          setClients((prev) => [...prev, ...result.clients]);
        } else {
          setClients(result.clients);
        }
      });
    },
    [],
  );

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      setPage(1);
      fetchClients(q, filterRef.current, 1);
    },
    [fetchClients],
  );

  const handleFilter = useCallback(
    (f: ClientFilter) => {
      setFilter(f);
      setPage(1);
      fetchClients(queryRef.current, f, 1);
    },
    [fetchClients],
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchClients(query, filter, nextPage, true);
  }, [page, query, filter, fetchClients]);

  const hasMore = clients.length < total;

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <ClientSearch onSearch={handleSearch} />
      </div>

      {/* Filters */}
      <div className="mb-5">
        <ClientFilters active={filter} onChange={handleFilter} />
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{total}</span>{" "}
          {total === 1 ? "cliente" : "clientes"}
          {query && (
            <span>
              {" "}
              para <span className="font-medium text-foreground">"{query}"</span>
            </span>
          )}
        </p>
      </div>

      {/* Loading overlay indicator */}
      {isPending && clients.length > 0 && (
        <div className="mb-3 h-0.5 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/40" />
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <EmptyState query={query} filter={filter} isPending={isPending} />
      ) : (
        <>
          <div className="space-y-2">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isPending}
                className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {isPending ? "Cargando..." : `Ver más (${total - clients.length} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  query,
  filter,
  isPending,
}: {
  query: string;
  filter: ClientFilter;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-card/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-12 text-center">
      <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        {query
          ? `Sin resultados para "${query}"`
          : filter !== "all"
            ? "No hay clientes en esta categoría"
            : "Aún no hay clientes"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        {query
          ? "Probá con otro nombre o teléfono"
          : filter !== "all"
            ? "Probá con otro filtro"
            : "Los clientes aparecerán acá cuando reserven turnos"}
      </p>
    </div>
  );
}
