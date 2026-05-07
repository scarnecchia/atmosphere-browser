// pattern: Functional Core
// (Pure concurrency limiting and backoff logic)

type QueuedRequest = {
  readonly execute: () => Promise<unknown>
  readonly resolve: (value: unknown) => void
  readonly reject: (reason: unknown) => void
}

const queue: Array<QueuedRequest> = []
let activeRequests = 0
const MAX_CONCURRENT = 5
const BACKOFF_MS = 1000
let backoffUntil = 0

export async function enqueue<T>(execute: () => Promise<T>): Promise<T> {
  if (Date.now() < backoffUntil) {
    await new Promise((r) => setTimeout(r, backoffUntil - Date.now()))
  }

  return new Promise<T>((resolve, reject) => {
    queue.push({ execute: execute as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject })
    processQueue()
  })
}

function processQueue(): void {
  while (activeRequests < MAX_CONCURRENT && queue.length > 0) {
    const request = queue.shift()
    if (!request) return
    activeRequests++

    request
      .execute()
      .then((result) => {
        activeRequests--
        request.resolve(result)
        processQueue()
      })
      .catch((err) => {
        activeRequests--
        if (err instanceof Response && err.status === 429) {
          backoffUntil = Date.now() + BACKOFF_MS
        }
        request.reject(err)
        processQueue()
      })
  }
}

// Testing helper: reset queue state
export function resetQueueForTesting(): void {
  queue.length = 0
  activeRequests = 0
  backoffUntil = 0
}
