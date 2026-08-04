# CloudTweak Finance Module Final Checklist

## Revenue

- [ *] Revenue dashboard displays live Supabase data
- [ ] Paid Invoice payments appear automatically
- [ ] Paystack provider totals match the database
- [ ] Archived records are excluded
- [ ] CSV export works
- [ ] RLS blocks unauthorized users

## Invoices

- [ ] Draft Invoice creation works
- [ ] Draft editing works
- [ ] Mark as Sent works
- [ ] Paystack button appears only for payable Invoices
- [ ] Full payments set status to `paid`
- [ ] Partial payments set status to `partially_paid`
- [ ] Duplicate webhook delivery does not add payment twice
- [ ] Invoice PDF downloads successfully

## Payment Attempts

- [ ] Initialization creates one payment attempt
- [ ] Recent pending attempts can be resumed
- [ ] Successful attempts store Paystack transaction details
- [ ] Each successful attempt links to one Revenue transaction
- [ ] Each successful attempt links to one Receipt

## Receipts

- [ ] Receipt is generated automatically after payment
- [ ] Receipt appears on the Receipt dashboard
- [ ] Receipt details modal opens
- [ ] Receipt PDF downloads
- [ ] Print action works
- [ ] Receipt can be opened from Invoice payment history
- [ ] Status changes update timestamps
- [ ] Email action clearly remains unavailable

## Reports

- [ ] Total Revenue matches Revenue dashboard
- [ ] Total Expenses matches Expenses module
- [ ] Gross Profit equals Revenue minus Expenses
- [ ] Monthly table displays correct periods
- [ ] Category breakdowns are correct
- [ ] Provider breakdown is correct
- [ ] Date filters work
- [ ] Currency filter works
- [ ] CSV export downloads valid data

## Production

- [ ] Vercel environment variables are configured
- [ ] Paystack webhook points to the deployed route
- [ ] Paystack secret key is server-only
- [ ] Supabase service-role key is server-only
- [ ] Finance RLS uses `is_finance_staff()`
- [ ] No `using (true)` diagnostic policy remains
- [ ] Supabase generated types are current
- [ ] All Finance pages compile without TypeScript errors
- [ ] Browser console has no Finance errors
