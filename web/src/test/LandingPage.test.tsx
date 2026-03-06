import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import MediaService from '../services/MediaService';

// Mock the react-i18next module
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

// Mock the MediaService
vi.mock('../services/MediaService', () => ({
    default: {
        getContinueLearning: vi.fn(),
        getAllMedia: vi.fn()
    }
}));

// Mock WordListService to prevent unrelated errors
vi.mock('../services/WordListService', () => ({
    default: {
        getStandardLists: vi.fn(() => Promise.resolve([]))
    }
}));


const mockMediaData = [
    {
        id: 1,
        tmdbId: 111,
        title: "Mr. Robot - S01",
        type: "SERIES",
        knownWordPercentage: 45.5,
        posterUrl: "mr-robot.jpg"
    },
    {
        id: 2,
        tmdbId: 111,
        title: "Mr. Robot - S02",
        type: "SERIES",
        knownWordPercentage: 42.1,
        posterUrl: "mr-robot-2.jpg"
    },
    {
        id: 3,
        tmdbId: 222,
        title: "The Matrix",
        type: "MOVIE",
        knownWordPercentage: 88.9,
        posterUrl: "matrix.jpg"
    }
];

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('LandingPage GlobalSearch', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mock returns
        (MediaService.getContinueLearning as any).mockResolvedValue([]);
        (MediaService.getAllMedia as any).mockResolvedValue(mockMediaData);
    });

    it('renders the search input', async () => {
        renderWithRouter(<LandingPage />);
        expect(screen.getByPlaceholderText('Search movies or series...')).toBeInTheDocument();
    });

    it('fetches all media on mount', async () => {
        renderWithRouter(<LandingPage />);
        
        await waitFor(() => {
            expect(MediaService.getAllMedia).toHaveBeenCalled();
        });
    });

    it('filters and groups search results correctly', async () => {
        renderWithRouter(<LandingPage />);
        
        // Wait for data to load
        await waitFor(() => {
            expect(MediaService.getAllMedia).toHaveBeenCalled();
        });

        const searchInput = screen.getByPlaceholderText('Search movies or series...');
        
        // Type 'robot'
        await userEvent.type(searchInput, 'robot');

        // Should group "Mr. Robot - S01" and "S02" into a single Series entry
        await waitFor(() => {
            const seriesResult = screen.getByText('Mr. Robot');
            expect(seriesResult).toBeInTheDocument();
            
            // It should calculate string properly up to ' - '
            const typeLabel = screen.getByText('SERIES');
            expect(typeLabel).toBeInTheDocument();
            
            // Should show Uyum
            const uyumLabel = screen.getByText('%46 Uyum'); // 45.5 rounded
            expect(uyumLabel).toBeInTheDocument();
        });

        // The Matrix should NOT be visible
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
    });

    it('shows movie results with correct Uyum', async () => {
        renderWithRouter(<LandingPage />);
        
        await waitFor(() => {
            expect(MediaService.getAllMedia).toHaveBeenCalled();
        });

        const searchInput = screen.getByPlaceholderText('Search movies or series...');
        
        // Type 'matrix'
        await userEvent.type(searchInput, 'matrix');

        // Should show The Matrix
        await waitFor(() => {
            expect(screen.getByText('The Matrix')).toBeInTheDocument();
            expect(screen.getByText('MOVIE')).toBeInTheDocument();
            expect(screen.getByText('%89 Uyum')).toBeInTheDocument(); // 88.9 rounded
        });
    });
});
