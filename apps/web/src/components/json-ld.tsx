/**
 * Emits a JSON-LD block.
 *
 * The payload is serialised with `<` escaped, so a string inside the data
 * cannot close the script tag early and inject markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
