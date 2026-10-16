export default function RosterPagination({ page, pages, changePage }: {
  page: number; pages: number; changePage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const button = 'min-h-11 rounded-xl border border-[#e4dfd4] bg-white px-4 text-sm text-gray-700 hover:bg-[#f7f5ef] disabled:opacity-40';
  return <nav aria-label="Páginas de invitados" className="flex flex-wrap items-center justify-between gap-2">
    <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} className={button}>Anterior</button>
    <span className="text-sm tabular-nums text-gray-600">Página {page} de {pages}</span>
    <button type="button" disabled={page === pages} onClick={() => changePage(page + 1)} className={button}>Siguiente</button>
  </nav>;
}
