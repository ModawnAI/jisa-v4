/**
 * Autonomous RAG System
 *
 * Self-improving document processing and RAG pipeline.
 *
 * Components:
 * - DocumentAnalyzer: Analyzes document structure and content
 * - SchemaRegistryService: Manages schema discovery and matching
 * - GroundTruthExtractorService: Extracts accurate data for testing
 * - AccuracyAnalyzerService: Runs tests and analyzes failures
 * - PipelineOrchestratorService: Coordinates the full pipeline
 */

// Types
export * from './types';

// Components
export { DocumentAnalyzer } from './document-analyzer';
export { SchemaRegistryService, schemaRegistryService } from './schema-registry.service';
export { GroundTruthExtractorService, groundTruthExtractorService } from './ground-truth-extractor.service';
export { AccuracyAnalyzerService, accuracyAnalyzerService } from './accuracy-analyzer.service';
export { PipelineOrchestratorService, pipelineOrchestratorService } from './pipeline-orchestrator.service';
