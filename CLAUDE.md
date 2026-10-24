# Dad-O-Matic: working rules

- **Never deploy anything to Veeva Vault** (the Custom Page, MDL, client code) unless the owner
  gives a specific instruction to do so in the current conversation. The page was removed from
  Vault on 2026-10-24; `packages/vault` and `mdl/` are kept as code only. `scripts/vault-deploy.sh`
  refuses to run without `VAULT_DEPLOY_APPROVED=yes`; do not set it on your own.
- The public site (AWS stack `DadJokes`, `pnpm aws:deploy`) is the live product.
- Run the `verify` skill's checks before every push.
