import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProgressDashboard from '@/pages/ProgressDashboard';
import ProgressService from '@/services/ProgressService';

// Mock the ProgressService
vi.mock('@/services/ProgressService', () => ({
    default: {
        getStats: vi.fn()
    }
}));

describe('ProgressDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should show loading state initially', () => {
        // Return a promise that doesn't resolve immediately
        vi.mocked(ProgressService.getStats).mockImplementation(() => new Promise(() => {}));
        
        render(<ProgressDashboard />);
        
        // Check for the loader icon class (lucide-react animate-spin usually has a class or aria-hidden)
        // A simpler way is to check the container doesn't render the heading yet
        expect(screen.queryByText('Learning Progress')).not.toBeInTheDocument();
        // Since we didn't add data-testid, we can verify it's spinning via the SVG loader
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render stats correctly after fetching', async () => {
        const mockStats = {
            totalWordsStudied: 1500,
            highRetentionWords: 450,
            wordsToReviewToday: 25
        };

        vi.mocked(ProgressService.getStats).mockResolvedValue(mockStats);

        render(<ProgressDashboard />);

        // Wait for the data to resolve and UI to update
        await waitFor(() => {
            expect(screen.getByText('Learning Progress')).toBeInTheDocument();
        });

        // Verify the numbers are displayed
        expect(screen.getByText('1500')).toBeInTheDocument();
        expect(screen.getByText('450')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();

        // Verify the dynamic text in the bottom banner
        expect(screen.getByText(/You have 25 words waiting for review/i)).toBeInTheDocument();
    });
});
