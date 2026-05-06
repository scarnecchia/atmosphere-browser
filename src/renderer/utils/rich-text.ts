// pattern: Functional Core

export type RichTextSegment = {
  readonly text: string
  readonly facet: RichTextFacet | null
}

export type RichTextFacet = {
  readonly index: { readonly byteStart: number; readonly byteEnd: number }
  readonly features: ReadonlyArray<FacetFeature>
}

export type FacetFeature =
  | { readonly $type: 'app.bsky.richtext.facet#mention'; readonly did: string }
  | { readonly $type: 'app.bsky.richtext.facet#link'; readonly uri: string }
  | { readonly $type: 'app.bsky.richtext.facet#tag'; readonly tag: string }

export function segmentRichText(
  text: string,
  facets: ReadonlyArray<RichTextFacet> = [],
): ReadonlyArray<RichTextSegment> {
  if (facets.length === 0) {
    return [{ text, facet: null }]
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const textBytes = encoder.encode(text)

  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)

  const segments: Array<RichTextSegment> = []
  let lastByteEnd = 0

  for (const facet of sorted) {
    if (facet.index.byteStart > lastByteEnd) {
      const plainBytes = textBytes.slice(lastByteEnd, facet.index.byteStart)
      segments.push({ text: decoder.decode(plainBytes), facet: null })
    }

    const facetBytes = textBytes.slice(facet.index.byteStart, facet.index.byteEnd)
    segments.push({ text: decoder.decode(facetBytes), facet })

    lastByteEnd = facet.index.byteEnd
  }

  if (lastByteEnd < textBytes.length) {
    const remainingBytes = textBytes.slice(lastByteEnd)
    segments.push({ text: decoder.decode(remainingBytes), facet: null })
  }

  return segments
}
