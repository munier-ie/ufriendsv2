import { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Loader } from 'lucide-react';

/**
 * Bulk Transactions Component
 * Allows vendor users to upload CSV files for bulk transaction processing
 * with format validation, preview, and progress tracking
 */
const BulkTransactions = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [error, setError] = useState('');

    // Handle file selection
    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file type
        if (!selectedFile.name.endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        setFile(selectedFile);
        setError('');

        // Generate preview
        const text = await selectedFile.text();
        const lines = text.split('\n').slice(0, 11); // Header + 10 rows
        const previewData = lines.map(line => line.split(','));
        setPreview(previewData);
    };

    // Upload and process CSV
    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await axios.post('/api/bulk/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setJobId(response.data.jobId);
            setProcessing(true);
            pollJobStatus(response.data.jobId);

        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    // Poll job status
    const pollJobStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`/api/bulk/status/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setJobStatus(response.data);

                if (response.data.status === 'completed' || response.data.status === 'failed') {
                    clearInterval(interval);
                    setProcessing(false);
                }
            } catch (err) {
                clearInterval(interval);
                setProcessing(false);
                setError('Failed to fetch job status');
            }
        }, 2000);
    };

    // Download results
    const downloadResults = async () => {
        if (!jobId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/bulk/download/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bulk_results_${jobId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Failed to download results');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                            <Upload className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Bulk Transactions</h1>
                            <p className="text-gray-600">Upload CSV for batch processing (max 1000 rows)</p>
                        </div>
                    </div>
                </div>

                {/* CSV Format Guide */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                        <FileText className="text-blue-600" />
                        <span>CSV Format Guide</span>
                    </h2>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                        <p className="text-blue-900 font-medium mb-2">Required Columns:</p>
                        <code className="text-blue-800 text-sm">service, phone, amount, variation_code</code>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                        <div className="text-gray-700">
                            service,phone,amount,variation_code<br />
                            airtime,08012345678,100,mtn<br />
                            data,08123456789,1000,mtn-1gb<br />
                            cable,01234567890,2500,dstv-compact
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <h3 className="font-semibold text-gray-800">Supported Services:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">airtime</span>
                            <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">data</span>
                            <span className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">cable</span>
                            <span className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">electricity</span>
                        </div>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Upload CSV File</h2>

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                                {file ? file.name : 'Click to upload CSV file'}
                            </p>
                            <p className="text-sm text-gray-500">Maximum 1000 rows</p>
                        </label>
                    </div>

                    {error && (
                        <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                            <p className="text-red-800 flex items-center space-x-2">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </p>
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-gray-800 mb-3">Preview (First 10 rows)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {preview[0]?.map((header, index) => (
                                                <th key={index} className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-700">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.slice(1).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-gray-50">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="border border-gray-200 px-4 py-2 text-gray-600">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={uploading || processing}
                                className="mt-4 px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Uploading...' : 'Process Bulk Transactions'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Processing Status */}
                {processing && jobStatus && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <Loader className="animate-spin text-blue-600" />
                            <span>Processing...</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Total Rows:</span>
                                <span className="font-bold text-gray-800">{jobStatus.totalRows}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Processed:</span>
                                <span className="font-bold text-blue-600">{jobStatus.processed}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Successful:</span>
                                <span className="font-bold text-green-600 flex items-center space-x-1">
                                    <CheckCircle size={16} />
                                    <span>{jobStatus.successful}</span>
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Failed:</span>
                                <span className="font-bold text-red-600 flex items-center space-x-1">
                                    <XCircle size={16} />
                                    <span>{jobStatus.failed}</span>
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${(jobStatus.processed / jobStatus.totalRows) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Results */}
                {jobStatus && jobStatus.status === 'completed' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <CheckCircle className="text-green-600" />
                            <span>Processing Complete</span>
                        </h2>

                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-4">
                            <p className="text-green-800">
                                Successfully processed {jobStatus.successful} out of {jobStatus.totalRows} transactions
                            </p>
                        </div>

                        <button
                            onClick={downloadResults}
                            className="px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                        >
                            <Download size={20} />
                            <span>Download Results</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkTransactions;
