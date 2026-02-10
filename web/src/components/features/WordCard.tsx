import { CheckCircle } from 'lucide-react';

import classNames from 'classnames';

interface WordProps {
    id: number;
    word: string;
    frequency: number;
    isKnown: boolean;
    onToggleKnown: (id: number, currentStatus: boolean) => void;
}

const WordCard = ({ id, word, frequency, isKnown, onToggleKnown }: WordProps) => {
    return (
        <div className={classNames(
            "relative group p-4 rounded-lg border transition-all duration-200",
            isKnown
                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md"
        )}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 capitalize">
                        {word}
                    </h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Frequency: {frequency}
                    </div>
                </div>

                <button
                    onClick={() => onToggleKnown(id, isKnown)}
                    className={classNames(
                        "p-2 rounded-full transition-colors",
                        isKnown
                            ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-800"
                            : "text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    title={isKnown ? "Mark as unknown" : "Mark as known"}
                >
                    {isKnown ? <CheckCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </button>
            </div>

            {/* Examples or translation placehoder */}
        </div>
    );
};

export default WordCard;
