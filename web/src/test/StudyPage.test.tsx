import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudyPage from '@/pages/StudyPage';
import StudyService from '@/services/StudyService';

vi.mock('@/services/StudyService', () => ({
    default: {
        getNextBatch: vi.fn(),
        processStudyResults: vi.fn()
    }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as unknown as Record<string, unknown>,
        useNavigate: () => mockNavigate,
    };
});

describe('StudyPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        render(
            <MemoryRouter initialEntries={['/study/123']}>
                <Routes>
                    <Route path="/study/:listId" element={<StudyPage />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('should display loading initially and empty state if no words', async () => {
        vi.mocked(StudyService.getNextBatch).mockResolvedValue([]);
        renderComponent();

        expect(document.querySelector('.animate-spin')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('You have reviewed all due words!')).toBeInTheDocument();
        });
    });

    it('should render multiple choice question and handle correct answer', async () => {
        const mockBatch = [{
            wordId: 10,
            word: 'apple',
            definition: 'A red fruit',
            questionType: 'MULTIPLE_CHOICE' as const,
            options: ['apple', 'banana', 'cherry', 'date'],
            exampleSentence: 'I ate an apple',
            difficulty: 'A1'
        }];
        vi.mocked(StudyService.getNextBatch).mockResolvedValue(mockBatch);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('A red fruit')).toBeInTheDocument();
        });

        const correctBtn = screen.getByText('apple');
        const incorrectBtn = screen.getByText('banana');

        expect(correctBtn).toBeInTheDocument();
        expect(incorrectBtn).toBeInTheDocument();

        // Answer correctly
        fireEvent.click(correctBtn);

        // Feedback
        await waitFor(() => {
            expect(screen.getByText('Correct!')).toBeInTheDocument();
        });

        // Click next/finish (since it's the only question)
        const finishBtn = screen.getByText('Finish');
        expect(finishBtn).toBeInTheDocument();

        vi.mocked(StudyService.processStudyResults).mockResolvedValue();
        vi.mocked(StudyService.getNextBatch).mockResolvedValue([]); // Next batch is empty

        fireEvent.click(finishBtn);

        await waitFor(() => {
            expect(StudyService.processStudyResults).toHaveBeenCalledWith(1, [{ wordId: 10, isCorrect: true }]);
            expect(mockNavigate).toHaveBeenCalledWith('/lists');
        });
    });

    it('should render fill in the blanks and handle incorrect answer', async () => {
        const mockBatch = [{
            wordId: 11,
            word: 'orange',
            definition: 'A citrus fruit',
            questionType: 'FILL_IN_THE_BLANKS' as const,
            exampleSentence: 'I ate an orange',
            difficulty: 'A2'
        }];
        vi.mocked(StudyService.getNextBatch).mockResolvedValue(mockBatch);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('A citrus fruit')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Type the word...');
        fireEvent.change(input, { target: { value: 'wrong' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        await waitFor(() => {
            expect(screen.getByText('Incorrect')).toBeInTheDocument();
            expect(screen.getByText('orange')).toBeInTheDocument(); // Shows the correct answer
        });
    });
});
