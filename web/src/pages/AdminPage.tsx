import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import MediaService from '@/services/MediaService';

const AdminPage = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
        setError(null);
        setResults([]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.srt', '.vtt'],
            'application/x-subrip': ['.srt']
        }
    });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setError(null);
        setResults([]);

        try {
            const response = await MediaService.batchUpload(files);
            setResults(response);
            setFiles([]); // Clear queue on success
        } catch (err: any) {
            setError(err.response?.data || 'Failed to upload files');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Dashboard</h1>

            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Bulk Upload Subtitles</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Upload .srt files. Use format <code>Show.Name.S01E01.srt</code> for automatic metadata fetching.
                </p>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
                            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                    {isDragActive ? (
                        <p className="text-indigo-600 dark:text-indigo-400 font-medium">Drop the files here...</p>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">
                            Drag & drop files here, or click to select files
                        </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Supported formats: .srt</p>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Files ({files.length})</h3>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload {files.length} Files
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Upload Failed</h3>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {results.length > 0 && (
                <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        Upload Results
                    </h2>
                    <div className="space-y-2">
                        {results.map((result, index) => (
                            <div key={index} className={`p-3 rounded-lg text-sm border ${result.startsWith('Error')
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300'
                                    : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 text-green-700 dark:text-green-300'
                                }`}>
                                {result}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
