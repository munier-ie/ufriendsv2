import React, { useState } from 'react';
import axios from 'axios';
import {
    Upload,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Loader2,
    ArrowRight,
    FileSpreadsheet
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function BulkTransactions() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [error, setError] = useState('');

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            setError('Please select a valid CSV spreadsheet (.csv)');
            return;
        }

        setFile(selectedFile);
        setError('');

        const text = await selectedFile.text();
        const lines = text.split('\n').filter(line => line.trim() !== '').slice(0, 11);
        const previewData = lines.map(line => line.split(','));
        setPreview(previewData);
    };

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
            setError(err.response?.data?.message || 'Bulk upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

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
                setError('Failed to fetch processing status');
            }
        }, 2000);
    };

    const downloadSampleCsv = () => {
        const csvContent = "data:text/csv;charset=utf-8," + 
            "service,phone,amount,variation_code\n" +
            "airtime,08012345678,100,mtn\n" +
            "data,08123456789,1000,mtn-1gb\n" +
            "cable,01234567890,2500,dstv-compact\n" +
            "electricity,04123456789,5000,ikeja-electric";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ufriends_bulk_template.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

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
            setError('Failed to download results file');
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Bulk Transactions</h1>
                    <p className="text-gray-500 text-sm mt-1">Upload CSV spreadsheets for batch airtime, data, and bill processing</p>
                </div>

                <Button 
                    onClick={downloadSampleCsv}
                    variant="outline"
                    className="flex items-center space-x-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl"
                >
                    <Download size={16} />
                    <span>Download CSV Template</span>
                </Button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main File Upload & Preview Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* File Input Box */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto">
                            <Upload size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                                {file ? file.name : 'Select CSV File for Batch Upload'}
                            </h3>
                            <p className="text-gray-500 text-xs mt-1">
                                Maximum 1,000 transaction rows per CSV upload
                            </p>
                        </div>

                        <div className="flex items-center justify-center pt-2">
                            <label className="cursor-pointer px-6 py-3 bg-primary text-white text-xs font-semibold rounded-2xl hover:bg-primary/90 transition-all shadow-md active:scale-95">
                                <span>Browse CSV File</span>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Preview Table */}
                    {preview.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">File Preview</h3>
                                    <p className="text-xs text-gray-500">{preview.length - 1} rows detected</p>
                                </div>
                                <Button
                                    onClick={handleUpload}
                                    disabled={uploading || processing}
                                    className="flex items-center space-x-2 bg-primary text-white rounded-2xl"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Process Batch</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-gray-50/60 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wider">
                                            {preview[0]?.map((col, i) => (
                                                <th key={i} className="py-3 px-4">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
                                        {preview.slice(1).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="py-2.5 px-4">{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rules & Status Sidebar Column */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-blue-50 text-primary rounded-2xl">
                                <FileText size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900 text-base">Required CSV Format</h3>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Ensure the first row of your CSV contains exact column headers:
                        </p>

                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 font-mono text-xs text-gray-800 leading-relaxed">
                            service,phone,amount,variation_code<br />
                            airtime,08012345678,100,mtn<br />
                            data,08123456789,1000,mtn-1gb
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 pt-2">
                            <div className="flex items-start space-x-2">
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                <span>Batch transactions execute sequentially</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                <span>Failed rows automatically log reason in final output CSV</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Status Box */}
                    {jobStatus && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 text-base">Batch Progress</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    jobStatus.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {jobStatus.status}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                    <span>Processed {jobStatus.processed || 0} of {jobStatus.total || 0}</span>
                                    <span>{Math.round(((jobStatus.processed || 0) / (jobStatus.total || 1)) * 100)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${Math.round(((jobStatus.processed || 0) / (jobStatus.total || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {jobStatus.status === 'completed' && (
                                <Button
                                    onClick={downloadResults}
                                    className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl"
                                >
                                    <Download size={16} />
                                    <span>Download Results CSV</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
