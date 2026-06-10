"""Tiny in-memory sliding-window rate limiter. Per-key (we key by client IP).

In-memory by design: the backend is a single scale-to-zero container and
GitHub is the store — no shared state to coordinate.
"""

from __future__ import annotations

import threading
import time
from collections import deque


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Record a hit for `key`; return False if it exceeds the window budget."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                hits = self._hits[key] = deque()
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return False
            hits.append(now)
            # Opportunistically drop other stale keys so memory stays bounded.
            if len(self._hits) > 1024:
                for k in [k for k, v in self._hits.items() if not v or v[-1] < cutoff]:
                    del self._hits[k]
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
