import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    query: {
      documents: {
        findMany: vi.fn(),
      },
    },
  },
}));

// Import after mocking
import { AnalyticsService } from '@/lib/services/analytics.service';
import { db } from '@/lib/db';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('returns correct dashboard statistics', async () => {
      // Setup mock chain for employee stats
      const mockEmployeeSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10, active: 8 }]),
        }),
      });

      // Setup mock chain for document stats
      const mockDocumentSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { total: 50, processed: 40, pending: 5, failed: 3, totalSize: 1048576 },
          ]),
        }),
      });

      // Setup mock chain for vector stats
      const mockVectorSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: 1000 }]),
      });

      // Setup mock chain for conflict stats
      const mockConflictSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      // Chain mocks in order of calls
      vi.mocked(db.select)
        .mockImplementationOnce(mockEmployeeSelect)
        .mockImplementationOnce(mockDocumentSelect)
        .mockImplementationOnce(mockVectorSelect)
        .mockImplementationOnce(mockConflictSelect);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalEmployees: 10,
        activeEmployees: 8,
        totalDocuments: 50,
        processedDocuments: 40,
        pendingDocuments: 5,
        failedDocuments: 3,
        totalVectors: 1000,
        pendingConflicts: 2,
        storageUsedMB: 1,
      });
    });

    it('handles empty database gracefully', async () => {
      // Setup mock chains that return empty/zero values
      const mockEmployeeSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 0, active: 0 }]),
        }),
      });

      const mockDocumentSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { total: 0, processed: 0, pending: 0, failed: 0, totalSize: 0 },
          ]),
        }),
      });

      const mockVectorSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      });

      const mockConflictSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockEmployeeSelect)
        .mockImplementationOnce(mockDocumentSelect)
        .mockImplementationOnce(mockVectorSelect)
        .mockImplementationOnce(mockConflictSelect);

      const result = await service.getDashboardStats();

      expect(result.totalEmployees).toBe(0);
      expect(result.totalDocuments).toBe(0);
      expect(result.totalVectors).toBe(0);
      expect(result.pendingConflicts).toBe(0);
    });
  });

  describe('getStatusBreakdown', () => {
    it('returns correct status breakdown', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { status: 'pending', count: 5 },
              { status: 'processing', count: 2 },
              { status: 'completed', count: 40 },
              { status: 'failed', count: 3 },
              { status: 'partial', count: 1 },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getStatusBreakdown();

      expect(result).toEqual({
        pending: 5,
        processing: 2,
        completed: 40,
        failed: 3,
        partial: 1,
      });
    });

    it('initializes all statuses to 0 for empty results', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getStatusBreakdown();

      expect(result).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        partial: 0,
      });
    });
  });

  describe('getRecentActivity', () => {
    it('maps document statuses to activity actions correctly', async () => {
      const now = new Date();
      const mockDocs = [
        {
          id: '1',
          fileName: 'completed.xlsx',
          status: 'completed',
          createdAt: new Date(now.getTime() - 3600000),
          processedAt: now,
          updatedAt: now,
        },
        {
          id: '2',
          fileName: 'failed.xlsx',
          status: 'failed',
          createdAt: new Date(now.getTime() - 3600000),
          processedAt: null,
          updatedAt: now,
        },
        {
          id: '3',
          fileName: 'processing.xlsx',
          status: 'processing',
          createdAt: new Date(now.getTime() - 3600000),
          processedAt: null,
          updatedAt: now,
        },
        {
          id: '4',
          fileName: 'pending.xlsx',
          status: 'pending',
          createdAt: now,
          processedAt: null,
          updatedAt: now,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query.documents.findMany).mockResolvedValue(mockDocs as any);

      const result = await service.getRecentActivity(10);

      expect(result).toHaveLength(4);
      expect(result[0].action).toBe('complete');
      expect(result[1].action).toBe('fail');
      expect(result[2].action).toBe('process');
      expect(result[3].action).toBe('upload');
    });

    it('respects limit parameter', async () => {
      vi.mocked(db.query.documents.findMany).mockResolvedValue([]);

      await service.getRecentActivity(5);

      expect(db.query.documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('getProcessingRate', () => {
    it('calculates processing rate correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 100, completed: 75 }]),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getProcessingRate();

      expect(result).toBe(75);
    });

    it('returns 100 for empty database', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 0, completed: 0 }]),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getProcessingRate();

      expect(result).toBe(100);
    });

    it('rounds to one decimal place', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 3, completed: 2 }]),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getProcessingRate();

      expect(result).toBe(66.7);
    });
  });

  describe('getDepartmentDistribution', () => {
    it('returns department distribution correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { department: '개발팀', count: 5 },
              { department: '기획팀', count: 3 },
              { department: null, count: 2 },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getDepartmentDistribution();

      expect(result).toEqual([
        { name: '개발팀', value: 5 },
        { name: '기획팀', value: 3 },
        { name: '미지정', value: 2 },
      ]);
    });
  });

  describe('getVectorDistribution', () => {
    it('categorizes vectors by namespace type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([
            { namespace: 'org_123', count: 500 },
            { namespace: 'emp_456', count: 300 },
            { namespace: 'emp_789', count: 200 },
          ]),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await service.getVectorDistribution();

      expect(result).toEqual({
        organization: 500,
        employees: 500,
      });
    });
  });
});
