# CloudTweak Invoice Foundation

This phase adds the Invoice domain foundation without replacing any Revenue files.

## Suggested destinations

- `types/invoice.ts` → `src/types/invoice.ts`
- `config/invoice.ts` → `src/config/invoice.ts`
- `utils/invoice.ts` → `src/utils/invoice.ts`
- `database/001_create_invoices.sql` → your Supabase migration directory

## Important database note

The migration enables row-level security but deliberately does not create policies. Reuse the same admin authorization policy pattern already used by Revenue and the other protected finance tables.

## Next phase

The next phase will add the Invoice service layer:

- create invoice and items atomically
- list/search/filter/sort invoices
- fetch invoice details
- update drafts
- archive and restore
- cancel invoices
- record payments
- calculate invoice statistics
