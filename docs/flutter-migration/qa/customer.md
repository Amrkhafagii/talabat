# Customer QA – Phase 7

## Mid-sprint pass
- [ ] Addresses: add/edit, map pin drop, select default, verify Supabase RPC triggered.
- [ ] Checkout: ensures default address populates and placing order uses `set_default_address` result.
- [ ] Profile: update name, phone, avatar; confirm Supabase metadata refreshes.
- [ ] Wallet edge cases: trigger pending payout state, resubmit proof, confirm telemetry `wallet_proof_resubmitted`.

## Pre-release pass
- [ ] Offline/permission flows for map picker (deny GPS, fallback coordinates).
- [ ] Validate checkout + payment proof upload still works with new address selectors.
- [ ] Confirm telemetry events appear in Supabase dashboard for address/profile/wallet scenarios.
