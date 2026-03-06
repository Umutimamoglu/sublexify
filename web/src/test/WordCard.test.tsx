import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordCard from '../components/features/WordCard';
import { Word } from '../services/WordListService';
import { BrowserRouter } from 'react-router-dom';

const mockWord: Word = {
    id: 1,
    word: "resilient",
    language: "en",
    frequency: 1000,
    isKnown: false,
    definition: {
        difficulty: "B2",
        word: "resilient",
        meanings: [
            {
                pos: "adjective",
                definition: "Able to withstand or recover quickly from difficult conditions",
                example: "She was a resilient girl."
            }
        ],
        phrasal_verbs: [],
        verb_forms: { v1: "", v2: "", v3: "", ing: "" }
    },
    difficulty: "B2",
    isEnriched: true
};

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('WordCard Component', () => {

    it('renders the word correctly', () => {
        renderWithRouter(<WordCard {...mockWord} onToggleKnown={vi.fn()} />);
        const wordElements = screen.getAllByText('resilient');
        expect(wordElements.length).toBeGreaterThan(0);
        expect(wordElements[0]).toBeInTheDocument();
    });

    it('displays the correct CEFR difficulty badge', () => {
        renderWithRouter(<WordCard {...mockWord} onToggleKnown={vi.fn()} />);
        const badge = screen.getByText('B2');
        expect(badge).toBeInTheDocument();
        // Check for specific class indicating difficulty color
        expect(badge).toHaveClass('bg-blue-50 text-blue-700'); // B2 style
    });

    it('renders the pos (Part of Speech)', () => {
        renderWithRouter(<WordCard {...mockWord} onToggleKnown={vi.fn()} />);
        expect(screen.getByText('adjective')).toBeInTheDocument();
    });

    it('calls onToggleKnown when Mark as Known button is clicked', async () => {
        const toggleMock = vi.fn();
        renderWithRouter(<WordCard {...mockWord} onToggleKnown={toggleMock} />);
        
        // Find the button (it has the check icon or says 'Mark as Known' implicitly via title)
        const buttons = screen.getAllByRole('button');
        const checkButton = buttons.find(b => b.title === 'Mark Known');
        
        expect(checkButton).toBeDefined();
        
        if (checkButton) {
            await userEvent.click(checkButton);
            expect(toggleMock).toHaveBeenCalledTimes(1);
        }
    });
});
