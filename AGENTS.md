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
- External database migration uses an isolated destination and a verified cutover; currently connected database tools target the source and must never be treated as destination access.
