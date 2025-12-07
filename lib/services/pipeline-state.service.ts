/**
 * Pipeline State Service
 *
 * Manages the state of the RAG pipeline, including tracking when
 * schema regeneration is in progress. Queries are blocked during
 * pipeline updates to ensure consistency.
 *
 * Key behaviors:
 * - Pipeline regenerates ONLY on document upload/delete (not per query)
 * - Queries are blocked with user-friendly message during updates
 * - State is tracked per namespace to allow partial updates
 */

import { EventEmitter } from 'events';

/**
 * Pipeline state for a namespace
 */
export interface NamespacePipelineState {
  namespace: string;
  isUpdating: boolean;
  lastUpdatedAt: Date | null;
  updateStartedAt: Date | null;
  updateReason: 'document_upload' | 'document_delete' | 'manual' | 'initial' | null;
  progress: number; // 0-100
  error: string | null;
}

/**
 * Global pipeline state
 */
export interface GlobalPipelineState {
  isAnyUpdating: boolean;
  updatingNamespaces: string[];
  lastGlobalUpdate: Date | null;
  queuedUpdates: QueuedUpdate[];
}

/**
 * Queued update request
 */
interface QueuedUpdate {
  namespace: string;
  reason: 'document_upload' | 'document_delete' | 'manual';
  queuedAt: Date;
  documentId?: string;
}

/**
 * Update completion callback
 */
type UpdateCallback = (namespace: string, success: boolean, error?: string) => void;

/**
 * Pipeline blocked response for queries
 */
export interface PipelineBlockedResponse {
  blocked: true;
  message: string;
  estimatedWaitMs: number;
  updatingNamespaces: string[];
}

/**
 * Pipeline ready response
 */
export interface PipelineReadyResponse {
  blocked: false;
  schemasReady: boolean;
  lastUpdated: Date | null;
}

export type PipelineCheckResult = PipelineBlockedResponse | PipelineReadyResponse;

// Constants
const DEFAULT_UPDATE_TIMEOUT_MS = 60000; // 1 minute timeout
const MAX_QUEUE_SIZE = 100;
const DEBOUNCE_MS = 2000; // Debounce rapid updates

class PipelineStateService extends EventEmitter {
  private namespaceStates: Map<string, NamespacePipelineState> = new Map();
  private updateQueue: QueuedUpdate[] = [];
  private updateCallbacks: Map<string, UpdateCallback[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private globalLock: boolean = false;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Check if pipeline is ready for queries
   * Returns blocked status with user-friendly message if updating
   */
  checkPipelineStatus(namespaces: string[]): PipelineCheckResult {
    const updatingNamespaces = namespaces.filter((ns) => {
      const state = this.namespaceStates.get(ns);
      return state?.isUpdating === true;
    });

    if (updatingNamespaces.length > 0 || this.globalLock) {
      const estimatedWaitMs = this.estimateWaitTime(updatingNamespaces);

      return {
        blocked: true,
        message: this.getBlockedMessage(updatingNamespaces),
        estimatedWaitMs,
        updatingNamespaces,
      };
    }

    // Find last update time
    let lastUpdated: Date | null = null;
    for (const ns of namespaces) {
      const state = this.namespaceStates.get(ns);
      if (state?.lastUpdatedAt) {
        if (!lastUpdated || state.lastUpdatedAt > lastUpdated) {
          lastUpdated = state.lastUpdatedAt;
        }
      }
    }

    return {
      blocked: false,
      schemasReady: lastUpdated !== null,
      lastUpdated,
    };
  }

  /**
   * Get user-friendly blocked message
   */
  private getBlockedMessage(updatingNamespaces: string[]): string {
    if (this.globalLock) {
      return '시스템이 업데이트 중입니다. 잠시 후 다시 시도해 주세요.';
    }

    if (updatingNamespaces.length === 1) {
      return '데이터가 업데이트 중입니다. 약 10-30초 후 다시 질문해 주세요.';
    }

    return `${updatingNamespaces.length}개 데이터 영역이 업데이트 중입니다. 잠시 후 다시 시도해 주세요.`;
  }

  /**
   * Estimate wait time based on current progress
   */
  private estimateWaitTime(namespaces: string[]): number {
    let maxWait = 0;

    for (const ns of namespaces) {
      const state = this.namespaceStates.get(ns);
      if (state?.isUpdating && state.updateStartedAt) {
        const elapsed = Date.now() - state.updateStartedAt.getTime();
        const progress = state.progress || 0;

        if (progress > 0) {
          // Estimate based on progress
          const estimatedTotal = (elapsed / progress) * 100;
          const remaining = estimatedTotal - elapsed;
          maxWait = Math.max(maxWait, remaining);
        } else {
          // Default estimate if no progress
          maxWait = Math.max(maxWait, 30000 - elapsed);
        }
      }
    }

    return Math.max(5000, Math.min(maxWait, 60000)); // Between 5s and 60s
  }

  /**
   * Request pipeline update for namespace(s)
   * Called when documents are uploaded or deleted
   */
  async requestUpdate(
    namespace: string,
    reason: 'document_upload' | 'document_delete' | 'manual',
    documentId?: string
  ): Promise<void> {
    // Debounce rapid updates to same namespace
    const existingTimer = this.debounceTimers.get(namespace);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(namespace);
        await this.executeUpdate(namespace, reason, documentId);
        resolve();
      }, DEBOUNCE_MS);

      this.debounceTimers.set(namespace, timer);
    });
  }

  /**
   * Execute the actual update
   */
  private async executeUpdate(
    namespace: string,
    reason: 'document_upload' | 'document_delete' | 'manual',
    documentId?: string
  ): Promise<void> {
    // Check if already updating
    const currentState = this.namespaceStates.get(namespace);
    if (currentState?.isUpdating) {
      // Queue the update
      if (this.updateQueue.length < MAX_QUEUE_SIZE) {
        this.updateQueue.push({
          namespace,
          reason,
          queuedAt: new Date(),
          documentId,
        });
      }
      console.log(`[Pipeline] Update queued for ${namespace} (already updating)`);
      return;
    }

    // Start update
    const state: NamespacePipelineState = {
      namespace,
      isUpdating: true,
      lastUpdatedAt: currentState?.lastUpdatedAt || null,
      updateStartedAt: new Date(),
      updateReason: reason,
      progress: 0,
      error: null,
    };

    this.namespaceStates.set(namespace, state);
    this.emit('updateStarted', namespace, reason);

    console.log(`[Pipeline] Update started for ${namespace} (reason: ${reason})`);
  }

  /**
   * Update progress for a namespace
   */
  updateProgress(namespace: string, progress: number): void {
    const state = this.namespaceStates.get(namespace);
    if (state) {
      state.progress = Math.min(100, Math.max(0, progress));
      this.emit('progress', namespace, progress);
    }
  }

  /**
   * Mark update as complete
   */
  completeUpdate(namespace: string, success: boolean, error?: string): void {
    const state = this.namespaceStates.get(namespace);
    if (state) {
      state.isUpdating = false;
      state.progress = 100;
      state.error = error || null;

      if (success) {
        state.lastUpdatedAt = new Date();
      }

      this.emit('updateCompleted', namespace, success, error);
      console.log(`[Pipeline] Update completed for ${namespace} (success: ${success})`);

      // Notify callbacks
      const callbacks = this.updateCallbacks.get(namespace) || [];
      for (const cb of callbacks) {
        try {
          cb(namespace, success, error);
        } catch (e) {
          console.error('[Pipeline] Callback error:', e);
        }
      }
      this.updateCallbacks.delete(namespace);

      // Process queued updates for this namespace
      this.processQueue(namespace);
    }
  }

  /**
   * Process queued updates
   */
  private async processQueue(namespace: string): Promise<void> {
    const queuedIndex = this.updateQueue.findIndex((q) => q.namespace === namespace);
    if (queuedIndex >= 0) {
      const queued = this.updateQueue.splice(queuedIndex, 1)[0];
      // Small delay before processing queue
      setTimeout(() => {
        this.executeUpdate(queued.namespace, queued.reason, queued.documentId);
      }, 500);
    }
  }

  /**
   * Register callback for when update completes
   */
  onUpdateComplete(namespace: string, callback: UpdateCallback): void {
    const callbacks = this.updateCallbacks.get(namespace) || [];
    callbacks.push(callback);
    this.updateCallbacks.set(namespace, callbacks);
  }

  /**
   * Wait for update to complete (with timeout)
   */
  async waitForUpdate(
    namespace: string,
    timeoutMs: number = DEFAULT_UPDATE_TIMEOUT_MS
  ): Promise<boolean> {
    const state = this.namespaceStates.get(namespace);
    if (!state?.isUpdating) {
      return true; // Already complete
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      this.onUpdateComplete(namespace, (ns, success) => {
        clearTimeout(timeout);
        resolve(success);
      });
    });
  }

  /**
   * Set global lock (blocks all queries)
   */
  setGlobalLock(locked: boolean): void {
    this.globalLock = locked;
    this.emit('globalLockChanged', locked);
    console.log(`[Pipeline] Global lock ${locked ? 'acquired' : 'released'}`);
  }

  /**
   * Get current state for all namespaces
   */
  getAllStates(): Map<string, NamespacePipelineState> {
    return new Map(this.namespaceStates);
  }

  /**
   * Get global pipeline state summary
   */
  getGlobalState(): GlobalPipelineState {
    const updatingNamespaces: string[] = [];
    let lastGlobalUpdate: Date | null = null;

    for (const [ns, state] of this.namespaceStates) {
      if (state.isUpdating) {
        updatingNamespaces.push(ns);
      }
      if (state.lastUpdatedAt) {
        if (!lastGlobalUpdate || state.lastUpdatedAt > lastGlobalUpdate) {
          lastGlobalUpdate = state.lastUpdatedAt;
        }
      }
    }

    return {
      isAnyUpdating: updatingNamespaces.length > 0 || this.globalLock,
      updatingNamespaces,
      lastGlobalUpdate,
      queuedUpdates: [...this.updateQueue],
    };
  }

  /**
   * Initialize namespace state (called at startup)
   */
  initializeNamespace(namespace: string): void {
    if (!this.namespaceStates.has(namespace)) {
      this.namespaceStates.set(namespace, {
        namespace,
        isUpdating: false,
        lastUpdatedAt: null,
        updateStartedAt: null,
        updateReason: null,
        progress: 0,
        error: null,
      });
    }
  }

  /**
   * Clear state for namespace (e.g., when all documents deleted)
   */
  clearNamespace(namespace: string): void {
    this.namespaceStates.delete(namespace);
    this.emit('namespaceCleared', namespace);
  }

  /**
   * Check if specific namespace needs initial update
   */
  needsInitialUpdate(namespace: string): boolean {
    const state = this.namespaceStates.get(namespace);
    return !state || state.lastUpdatedAt === null;
  }
}

// Export singleton instance
export const pipelineStateService = new PipelineStateService();

// Export types
export type { PipelineStateService };
