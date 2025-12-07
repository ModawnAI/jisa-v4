/**
 * Pipeline Orchestrator Service
 *
 * Coordinates the autonomous RAG improvement pipeline:
 * 1. Analyzes documents
 * 2. Discovers/updates schemas
 * 3. Extracts ground truth
 * 4. Runs accuracy tests
 * 5. Applies optimizations
 * 6. Iterates until target accuracy reached
 */

import { db } from '@/lib/db';
import { pipelineRuns, documents, ragTemplateSchemas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

import { DocumentAnalyzer } from './document-analyzer';
import { schemaRegistryService } from './schema-registry.service';
import { groundTruthExtractorService } from './ground-truth-extractor.service';
import { accuracyAnalyzerService, type RagQueryExecutor } from './accuracy-analyzer.service';

import type { PipelineState, PipelinePhase } from './types';

// =============================================================================
// Types
// =============================================================================

export interface PipelineConfig {
  /** Target accuracy (0-1), default 0.95 */
  targetAccuracy?: number;
  /** Maximum optimization iterations, default 5 */
  maxIterations?: number;
  /** Trigger type for this run */
  triggerType: 'document_upload' | 'manual' | 'scheduled';
  /** Categories to test (all if not specified) */
  testCategories?: string[];
  /** Priorities to test (all if not specified) */
  testPriorities?: string[];
  /** Skip ground truth extraction */
  skipGroundTruth?: boolean;
  /** Skip schema discovery */
  skipSchemaDiscovery?: boolean;
  /** Dry run (don't apply optimizations) */
  dryRun?: boolean;
}

export interface PipelineResult {
  pipelineRunId: string;
  status: 'completed' | 'failed' | 'partial';
  finalAccuracy: number;
  totalIterations: number;
  testsRun: number;
  testsPassed: number;
  optimizationsApplied: number;
  duration: number;
  error?: string;
  phases: {
    analysis?: { success: boolean; duration: number };
    schema?: { success: boolean; duration: number; schemaId?: string };
    groundTruth?: { success: boolean; duration: number; recordsExtracted: number };
    testing?: { success: boolean; duration: number; accuracy: number };
    optimization?: { success: boolean; duration: number; actionsApplied: number };
  };
}

// =============================================================================
// Pipeline Orchestrator Service
// =============================================================================

export class PipelineOrchestratorService {
  private documentAnalyzer = new DocumentAnalyzer();
  private ragQueryExecutor: RagQueryExecutor | null = null;

  /**
   * Set the RAG query executor for accuracy testing
   */
  setQueryExecutor(executor: RagQueryExecutor): void {
    this.ragQueryExecutor = executor;
    accuracyAnalyzerService.setQueryExecutor(executor);
  }

  /**
   * Run the full autonomous pipeline for a document
   */
  async runPipeline(
    documentId: string,
    config: PipelineConfig
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const phases: PipelineResult['phases'] = {};

    // Create pipeline run record
    const [pipelineRun] = await db
      .insert(pipelineRuns)
      .values({
        documentId,
        triggerType: config.triggerType,
        status: 'running',
        currentPhase: 'analyzing',
        targetAccuracy: config.targetAccuracy || 0.95,
        maxIterations: config.maxIterations || 5,
      })
      .returning();

    let schemaId: string | null = null;
    let finalAccuracy = 0;
    let totalIterations = 0;
    let testsRun = 0;
    let testsPassed = 0;
    let optimizationsApplied = 0;

    try {
      // Get document info
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

      if (!doc) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Phase 1: Document Analysis
      await this.updatePhase(pipelineRun.id, 'analyzing');
      const analysisStart = Date.now();

      const buffer = await this.getDocumentBuffer(doc.filePath);
      if (!buffer) {
        throw new Error(`Could not read document: ${doc.filePath}`);
      }

      const analysis = await this.documentAnalyzer.analyze(
        buffer,
        doc.fileName,
        doc.fileType
      );

      phases.analysis = {
        success: true,
        duration: Date.now() - analysisStart,
      };

      // Phase 2: Schema Discovery/Matching
      if (!config.skipSchemaDiscovery) {
        await this.updatePhase(pipelineRun.id, 'schema_discovery');
        const schemaStart = Date.now();

        const schemaMatch = await schemaRegistryService.findMatchingSchema(analysis);

        if (schemaMatch.schema && schemaMatch.confidence > 0.7) {
          schemaId = schemaMatch.schema.id;
        } else {
          // Discover new schema
          const discovered = await schemaRegistryService.discoverSchema(analysis, {
            suggestedSlug: doc.fileName?.replace(/\.[^.]+$/, '') || 'unknown',
          });
          schemaId = discovered.schemaId;
        }

        phases.schema = {
          success: true,
          duration: Date.now() - schemaStart,
          schemaId: schemaId || undefined,
        };
      }

      // Update pipeline with schema
      if (schemaId) {
        await db
          .update(pipelineRuns)
          .set({ schemaId })
          .where(eq(pipelineRuns.id, pipelineRun.id));
      }

      // Phase 3: Ground Truth Extraction
      if (!config.skipGroundTruth && schemaId) {
        await this.updatePhase(pipelineRun.id, 'ground_truth');
        const gtStart = Date.now();

        // Reuse buffer from analysis phase
        if (buffer) {
          const extraction = await groundTruthExtractorService.extractWithAnalysis(
            buffer,
            analysis,
            { schemaId, documentId }
          );

          if (extraction.records.length > 0) {
            const saveResult = await groundTruthExtractorService.saveGroundTruth(
              extraction.records,
              { replaceExisting: true }
            );

            // Generate tests from ground truth
            const tests = await groundTruthExtractorService.generateTests(
              extraction.records.map(r => r.id),
              { schemaId, maxTestsPerRecord: 5 }
            );

            if (tests.tests.length > 0) {
              await groundTruthExtractorService.saveTests(tests.tests);
            }

            phases.groundTruth = {
              success: true,
              duration: Date.now() - gtStart,
              recordsExtracted: extraction.stats.extractedRecords,
            };
          }
        }
      }

      // Phase 4-5: Testing and Optimization Loop
      if (schemaId && this.ragQueryExecutor) {
        const targetAccuracy = config.targetAccuracy || 0.95;
        const maxIterations = config.maxIterations || 5;

        for (let iteration = 0; iteration < maxIterations; iteration++) {
          totalIterations++;
          await this.updatePhase(pipelineRun.id, 'testing');

          // Run tests
          const testResult = await accuracyAnalyzerService.runTestSuite(schemaId, {
            pipelineRunId: pipelineRun.id,
            iteration,
            categories: config.testCategories,
            priorities: config.testPriorities,
          });

          testsRun = testResult.testsRun;
          testsPassed = testResult.testsPassed;
          finalAccuracy = testResult.accuracy;

          phases.testing = {
            success: true,
            duration: testResult.duration,
            accuracy: testResult.accuracy,
          };

          // Update accuracy history
          await db
            .update(pipelineRuns)
            .set({
              totalIterations: iteration + 1,
              testsRun,
              testsPassed,
              finalAccuracy,
              accuracyHistory: [...(pipelineRun.accuracyHistory as number[] || []), testResult.accuracy],
            })
            .where(eq(pipelineRuns.id, pipelineRun.id));

          // Check if target reached
          if (testResult.accuracy >= targetAccuracy) {
            break;
          }

          // Analyze failures and optimize
          if (!config.dryRun && iteration < maxIterations - 1) {
            await this.updatePhase(pipelineRun.id, 'optimizing');
            const optStart = Date.now();

            const failureAnalysis = await accuracyAnalyzerService.analyzeFailures(
              testResult.results,
              { schemaId }
            );

            let actionsApplied = 0;
            for (const suggestion of failureAnalysis.suggestedOptimizations.slice(0, 3)) {
              const result = await accuracyAnalyzerService.applyOptimization(suggestion, {
                pipelineRunId: pipelineRun.id,
                iteration,
                schemaId,
              });

              if (result.success) {
                actionsApplied++;
                optimizationsApplied++;
              }
            }

            phases.optimization = {
              success: true,
              duration: Date.now() - optStart,
              actionsApplied,
            };
          }
        }
      }

      // Complete pipeline
      await db
        .update(pipelineRuns)
        .set({
          status: 'completed',
          currentPhase: null,
          finalAccuracy,
          totalIterations,
          testsRun,
          testsPassed,
          optimizationsApplied,
          completedAt: new Date(),
          totalDurationMs: Date.now() - startTime,
        })
        .where(eq(pipelineRuns.id, pipelineRun.id));

      return {
        pipelineRunId: pipelineRun.id,
        status: 'completed',
        finalAccuracy,
        totalIterations,
        testsRun,
        testsPassed,
        optimizationsApplied,
        duration: Date.now() - startTime,
        phases,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';

      await db
        .update(pipelineRuns)
        .set({
          status: 'failed',
          errorMessage: error,
          completedAt: new Date(),
          totalDurationMs: Date.now() - startTime,
        })
        .where(eq(pipelineRuns.id, pipelineRun.id));

      return {
        pipelineRunId: pipelineRun.id,
        status: 'failed',
        finalAccuracy,
        totalIterations,
        testsRun,
        testsPassed,
        optimizationsApplied,
        duration: Date.now() - startTime,
        error,
        phases,
      };
    }
  }

  /**
   * Run accuracy tests only (no document processing)
   */
  async runAccuracyTests(
    schemaId: string,
    config?: Partial<PipelineConfig>
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    if (!this.ragQueryExecutor) {
      return {
        pipelineRunId: '',
        status: 'failed',
        finalAccuracy: 0,
        totalIterations: 0,
        testsRun: 0,
        testsPassed: 0,
        optimizationsApplied: 0,
        duration: 0,
        error: 'No RAG query executor configured',
        phases: {},
      };
    }

    const [pipelineRun] = await db
      .insert(pipelineRuns)
      .values({
        schemaId,
        triggerType: config?.triggerType || 'manual',
        status: 'running',
        currentPhase: 'testing',
        targetAccuracy: config?.targetAccuracy || 0.95,
        maxIterations: config?.maxIterations || 5,
      })
      .returning();

    try {
      const testResult = await accuracyAnalyzerService.runTestSuite(schemaId, {
        pipelineRunId: pipelineRun.id,
        iteration: 0,
        categories: config?.testCategories,
        priorities: config?.testPriorities,
      });

      await db
        .update(pipelineRuns)
        .set({
          status: 'completed',
          finalAccuracy: testResult.accuracy,
          testsRun: testResult.testsRun,
          testsPassed: testResult.testsPassed,
          completedAt: new Date(),
          totalDurationMs: Date.now() - startTime,
        })
        .where(eq(pipelineRuns.id, pipelineRun.id));

      return {
        pipelineRunId: pipelineRun.id,
        status: 'completed',
        finalAccuracy: testResult.accuracy,
        totalIterations: 1,
        testsRun: testResult.testsRun,
        testsPassed: testResult.testsPassed,
        optimizationsApplied: 0,
        duration: Date.now() - startTime,
        phases: {
          testing: {
            success: true,
            duration: testResult.duration,
            accuracy: testResult.accuracy,
          },
        },
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';

      await db
        .update(pipelineRuns)
        .set({
          status: 'failed',
          errorMessage: error,
          completedAt: new Date(),
        })
        .where(eq(pipelineRuns.id, pipelineRun.id));

      return {
        pipelineRunId: pipelineRun.id,
        status: 'failed',
        finalAccuracy: 0,
        totalIterations: 0,
        testsRun: 0,
        testsPassed: 0,
        optimizationsApplied: 0,
        duration: Date.now() - startTime,
        error,
        phases: {},
      };
    }
  }

  /**
   * Get pipeline run status
   */
  async getPipelineStatus(pipelineRunId: string): Promise<PipelineState | null> {
    const [run] = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.id, pipelineRunId));

    if (!run) return null;

    return {
      id: run.id,
      documentId: run.documentId || undefined,
      schemaId: run.schemaId || undefined,
      status: run.status as PipelineState['status'],
      currentPhase: (run.currentPhase || 'analyzing') as PipelinePhase,
      triggerType: run.triggerType as PipelineState['triggerType'],
      targetAccuracy: run.targetAccuracy || 0.95,
      maxIterations: run.maxIterations || 5,
      totalIterations: run.totalIterations || 0,
      accuracyHistory: (run.accuracyHistory as number[]) || [],
      testsRun: run.testsRun || 0,
      testsPassed: run.testsPassed || 0,
      optimizationsApplied: run.optimizationsApplied || 0,
      finalAccuracy: run.finalAccuracy || undefined,
      errorMessage: run.errorMessage || undefined,
      startedAt: run.startedAt,
      completedAt: run.completedAt || undefined,
    };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async updatePhase(pipelineRunId: string, phase: string): Promise<void> {
    await db
      .update(pipelineRuns)
      .set({ currentPhase: phase })
      .where(eq(pipelineRuns.id, pipelineRunId));
  }

  private async getDocumentBuffer(storagePath: string): Promise<Buffer | null> {
    // This would fetch from Supabase Storage
    // For now, return null - needs to be implemented with actual storage access
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (error || !data) {
        console.error('Error fetching document:', error);
        return null;
      }

      return Buffer.from(await data.arrayBuffer());
    } catch (err) {
      console.error('Error getting document buffer:', err);
      return null;
    }
  }
}

// Singleton instance
export const pipelineOrchestratorService = new PipelineOrchestratorService();
