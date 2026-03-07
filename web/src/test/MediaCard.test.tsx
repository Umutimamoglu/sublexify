import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import MediaCard from '@/components/features/MediaCard';

const mockMedia = {
    id: 1,
    title: 'Test Movie',
    type: 'MOVIE' as const,
    language: 'en',
    totalWords: 100,
    createdAt: '2023-01-01T00:00:00Z'
};

describe('MediaCard', () => {
    it('should render a card with no difficulty badge if none provided', () => {
        render(
            <MemoryRouter>
                <MediaCard media={mockMedia} />
            </MemoryRouter>
        );
        expect(screen.getByText('Test Movie')).toBeInTheDocument();
        expect(screen.queryByText('Kolay')).not.toBeInTheDocument();
        expect(screen.queryByText('Zor')).not.toBeInTheDocument();
    });

    it('should render EASY difficulty badge correctly', () => {
        const easyMedia = { ...mockMedia, overallDifficulty: 'EASY' };
        render(
            <MemoryRouter>
                <MediaCard media={easyMedia} />
            </MemoryRouter>
        );
        const badge = screen.getByText('Kolay');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-emerald-500');
    });

    it('should render MEDIUM difficulty badge correctly', () => {
        const mediumMedia = { ...mockMedia, overallDifficulty: 'MEDIUM' };
        render(
            <MemoryRouter>
                <MediaCard media={mediumMedia} />
            </MemoryRouter>
        );
        const badge = screen.getByText('Orta');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-amber-500');
    });

    it('should render HARD difficulty badge correctly', () => {
        const hardMedia = { ...mockMedia, overallDifficulty: 'HARD' };
        render(
            <MemoryRouter>
                <MediaCard media={hardMedia} />
            </MemoryRouter>
        );
        const badge = screen.getByText('Zor');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-rose-500');
    });
});
