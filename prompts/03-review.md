Review the milestone just finished, as a strict senior engineer who did not write it.

Check:
- Every table has company_id and an RLS policy; try to read another company's data in a test.
- Cost maths: labour, parts (weighted average) and subcontract totals are correct; no cost record can be deleted.
- Operator and mechanic screens work at 390px wide with large tap targets.
- Offline pre-start queue survives a page reload.
- No secrets committed; inputs validated with Zod on the server.

Fix what you find, add tests for each fix, then log the review in docs/PROGRESS.md.
