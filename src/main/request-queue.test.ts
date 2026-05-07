// Test for request queue: concurrency limiting and backoff

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enqueue, resetQueueForTesting } from './request-queue.js'

describe('request-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    resetQueueForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    resetQueueForTesting()
  })

  it('executes a single request immediately', async () => {
    const execute = vi.fn().mockResolvedValue('success')

    const result = await enqueue(execute)

    expect(result).toBe('success')
    expect(execute).toHaveBeenCalledOnce()
  })

  it('limits concurrent requests to MAX_CONCURRENT', async () => {
    let activeCount = 0
    let maxActive = 0

    const createRequest = () =>
      vi.fn(async () => {
        activeCount++
        maxActive = Math.max(maxActive, activeCount)
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10))
        activeCount--
        return 'done'
      })

    // Queue 10 requests
    const promises = Array.from({ length: 10 }, () => enqueue(createRequest()))

    // Run timers to execute all
    vi.runAllTimersAsync()
    await Promise.all(promises)

    // MAX_CONCURRENT is 5, so max concurrent should not exceed 5
    expect(maxActive).toBeLessThanOrEqual(5)
  })

  it('resolves requests in queue order when concurrent limit is reached', async () => {
    const results: number[] = []
    const createRequest = (id: number) =>
      vi.fn(async () => {
        results.push(id)
        await new Promise((resolve) => setTimeout(resolve, 5))
        return id
      })

    // Queue 3 requests
    const promises = [enqueue(createRequest(1)), enqueue(createRequest(2)), enqueue(createRequest(3))]

    await vi.runAllTimersAsync()
    const values = await Promise.all(promises)

    expect(values).toEqual([1, 2, 3])
    expect(results).toEqual([1, 2, 3])
  })

  it('rejects request when execute throws', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Request failed'))

    const promise = enqueue(execute).catch(() => 'caught')

    await vi.runAllTimersAsync()

    const result = await promise
    expect(result).toBe('caught')
  })

  it('applies backoff when 429 response received', async () => {
    const BACKOFF_MS = 1000
    const execute = vi.fn().mockRejectedValue(new Response('', { status: 429 }))

    // First request triggers backoff
    const promise1 = enqueue(execute).catch(() => 'caught')
    await vi.runAllTimersAsync()
    await promise1

    // Reset mock but keep the backoff active
    vi.clearAllMocks()
    execute.mockResolvedValue('success')

    // Second request should wait for backoff
    const promise2 = enqueue(execute)

    // Advance time just before backoff expires
    vi.advanceTimersByTime(BACKOFF_MS - 1)
    expect(execute).not.toHaveBeenCalled()

    // Advance to complete backoff
    vi.advanceTimersByTime(1)
    await vi.runAllTimersAsync()

    const result = await promise2
    expect(result).toBe('success')
    expect(execute).toHaveBeenCalled()
  })

  it('continues processing queue after error', async () => {
    const execute1 = vi.fn().mockRejectedValue(new Error('fail'))
    const execute2 = vi.fn().mockResolvedValue('success')

    const promise1 = enqueue(execute1).catch(() => 'caught')
    const promise2 = enqueue(execute2)

    await vi.runAllTimersAsync()

    const result1 = await promise1
    const result2 = await promise2
    expect(result1).toBe('caught')
    expect(result2).toBe('success')
    expect(execute2).toHaveBeenCalled()
  })

  it('preserves type information for generic promises', async () => {
    const execute = vi.fn().mockResolvedValue({ count: 42 })

    const result = await enqueue<{ count: number }>(execute)

    expect(result.count).toBe(42)
  })
})
