import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('app shell', () => {
  it('has a root container, a title and no garbage text', () => {
    // Given the app's index.html
    const html = readFileSync('index.html', 'utf8')
    // When it is loaded into a document
    document.documentElement.innerHTML = html
    // Then there is an empty #root to render into and the page is named
    expect(document.getElementById('root')).not.toBeNull()
    expect(document.title).toBe('bareshorts')
    // And nothing garbage is rendered
    expect(document.body.textContent).not.toMatch(/undefined|\[object Object\]|NaN/)
  })
})
