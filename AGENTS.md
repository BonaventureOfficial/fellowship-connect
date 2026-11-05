<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Media queries reuse the generated authenticated client through `src/lib/media-client.ts` for their explicit schema contracts; this keeps media typing isolated when Cloud schema regeneration is unavailable, without creating another auth session.
- Verification category options and normalization live in a browser-safe shared module; keep the existing request field for compatibility with pending requests and the gradual database migration.
- External database migration uses an isolated destination and a verified cutover; currently connected database tools target the source and must never be treated as destination access.
- New community media uploads use the shared browser upload adapter with the current authenticated session; persist the returned media URL and preserve legacy storage reads. Verification portraits must retain private owner/staff access before switching providers.
