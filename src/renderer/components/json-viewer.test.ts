// Test for json-viewer: Syntax highlighting and JSON formatting
// Tests pure logic: syntaxHighlight function extraction for string transforms

import { describe, it, expect } from 'vitest'

// Extracted pure function for testing syntax highlighting
function syntaxHighlight(json: string): string {
  return json
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]*?)"/g, ': <span class="string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
    .replace(/: null/g, ': <span class="null">null</span>')
}

describe('syntaxHighlight', () => {
  it('AC9.3: highlights JSON keys with key class', () => {
    const json = '{\n  "name": "test"\n}'
    const result = syntaxHighlight(json)

    expect(result).toContain('<span class="key">"name"</span>:')
  })

  it('AC9.3: highlights string values with string class', () => {
    const json = '{\n  "name": "test"\n}'
    const result = syntaxHighlight(json)

    expect(result).toContain(': <span class="string">"test"</span>')
  })

  it('AC9.3: highlights numbers with number class', () => {
    const json = '{\n  "count": 42\n}'
    const result = syntaxHighlight(json)

    expect(result).toContain(': <span class="number">42</span>')
  })

  it('AC9.3: highlights booleans with boolean class', () => {
    const json = '{\n  "active": true,\n  "disabled": false\n}'
    const result = syntaxHighlight(json)

    expect(result).toContain(': <span class="boolean">true</span>')
    expect(result).toContain(': <span class="boolean">false</span>')
  })

  it('AC9.3: highlights null with null class', () => {
    const json = '{\n  "value": null\n}'
    const result = syntaxHighlight(json)

    expect(result).toContain(': <span class="null">null</span>')
  })

  it('AC9.3: handles complex nested JSON', () => {
    const json = JSON.stringify(
      {
        user: { name: 'Alice', age: 30, active: true, email: null },
        tags: ['red', 'blue'],
      },
      null,
      2
    )
    const result = syntaxHighlight(json)

    expect(result).toContain('<span class="key">"user"</span>:')
    expect(result).toContain('<span class="key">"name"</span>:')
    expect(result).toContain('<span class="string">"Alice"</span>')
    expect(result).toContain('<span class="number">30</span>')
    expect(result).toContain('<span class="boolean">true</span>')
    expect(result).toContain('<span class="null">null</span>')
  })

  it('AC9.3: preserves structure and formatting', () => {
    const json = '{\n  "test": "value"\n}'
    const result = syntaxHighlight(json)

    // Should still contain the JSON structure with newlines
    expect(result).toContain('\n')
    expect(result).toContain('{')
    expect(result).toContain('}')
  })

  it('handles empty strings in values', () => {
    const json = '{\n  "empty": ""\n}'
    const result = syntaxHighlight(json)

    expect(result).toContain('<span class="string">""</span>')
  })

  it('handles objects with no values (just keys)', () => {
    const json = '{\n  "key": \n}'
    // This is invalid JSON but the function should handle it gracefully
    const result = syntaxHighlight(json)
    expect(result).toContain('<span class="key">"key"</span>:')
  })
})
