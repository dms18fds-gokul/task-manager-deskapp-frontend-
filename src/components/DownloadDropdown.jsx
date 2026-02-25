
import React, { useState, useRef, useEffect } from 'react';
import { FaDownload, FaFilePdf, FaFileExcel, FaFileWord, FaChevronDown } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const DownloadDropdown = ({ data, fileName = "download", columns = [], summaryInfo = [], multiData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to extract row data based on columns
    const getRowData = (item) => {
        return columns.map(col => {
            if (typeof col.accessor === 'function') {
                return col.accessor(item);
            }
            // value retrieval via path "obj.prop" could be implemented if needed, 
            // but for now assume direct key or simple accessor
            return item[col.accessor] || "";
        });
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        doc.text(`${fileName}`, 14, 15);

        let currentY = 22;
        if (summaryInfo && summaryInfo.length > 0) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            summaryInfo.forEach(line => {
                doc.text(line, 14, currentY);
                currentY += 6;
            });
            currentY += 2; // Extra space before table
        }

        if (multiData && multiData.length > 0) {
            multiData.forEach((table, index) => {
                if (index > 0) {
                    currentY = doc.lastAutoTable.finalY + 15;
                }
                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(12);
                doc.setTextColor(20, 20, 20);
                doc.text(table.title, 14, currentY);
                currentY += 5;

                const tableColumn = table.columns.map(col => col.header);
                const tableRows = table.data.map(item => {
                    return table.columns.map(col => typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] || ""));
                });

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: currentY,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [79, 70, 229] }
                });
            });
        } else {
            const tableColumn = columns.map(col => col.header);
            const tableRows = data.map(item => getRowData(item));

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: currentY,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [79, 70, 229] }
            });
        }

        doc.save(`${fileName}.pdf`);
        setIsOpen(false);
    };

    const handleDownloadExcel = () => {
        const workbook = XLSX.utils.book_new();

        const processTableToSheet = (tableData, tableColumns, title, isSingle) => {
            const excelData = tableData.map(item => {
                const row = {};
                tableColumns.forEach(col => {
                    let val = "";
                    if (typeof col.accessor === 'function') {
                        val = col.accessor(item);
                    } else {
                        val = item[col.accessor] || "";
                    }
                    row[col.header] = val;
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData, { origin: (isSingle && summaryInfo.length > 0) ? summaryInfo.length + 1 : 0 });

            if (isSingle && summaryInfo && summaryInfo.length > 0) {
                summaryInfo.forEach((line, index) => {
                    XLSX.utils.sheet_add_aoa(worksheet, [[line]], { origin: `A${index + 1}` });
                });
            }

            // Excel sheet names max 31 characters
            let sheetName = title ? title.substring(0, 31) : "Sheet1";
            // Replace invalid sheet name characters: \ / ? * : [ ]
            sheetName = sheetName.replace(/[\\/?*:[\]]/g, '');
            if (!sheetName) sheetName = "Sheet1";

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        };

        if (multiData && multiData.length > 0) {
            multiData.forEach((table) => {
                processTableToSheet(table.data, table.columns, table.title, false);
            });
        } else {
            processTableToSheet(data, columns, "Sheet1", true);
        }

        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        setIsOpen(false);
    };

    const handleDownloadWord = () => {
        let tablesHtml = "";

        const generateTableHtml = (tableData, tableColumns, title) => {
            const tableHeader = tableColumns.map(col => `<th style="border: 1px solid #000; padding: 5px; background: #eee;">${col.header}</th>`).join('');
            const tableBody = tableData.map(item => {
                const cells = tableColumns.map(col => {
                    let val = typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] || "");
                    return `<td style="border: 1px solid #000; padding: 5px;">${val}</td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            return `
                ${title ? `<h3>${title}</h3>` : ''}
                <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
                    <thead><tr>${tableHeader}</tr></thead>
                    <tbody>${tableBody}</tbody>
                </table>
            `;
        };

        if (multiData && multiData.length > 0) {
            tablesHtml = multiData.map(table => generateTableHtml(table.data, table.columns, table.title)).join('');
        } else {
            tablesHtml = generateTableHtml(data, columns, "");
        }

        const summaryHtml = summaryInfo && summaryInfo.length > 0
            ? summaryInfo.map(line => `<p style="margin: 2px 0; color: #666;">${line}</p>`).join('')
            : "";

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${fileName}</title></head>
            <body>
                <h2>${fileName}</h2>
                ${summaryHtml}
                <br/>
                ${tablesHtml}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Main Round Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 transform active:scale-95 z-20 relative
                    ${isOpen ? 'bg-indigo-600 rotate-45' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                title="Download Options"
            >
                {isOpen ? <FaChevronDown className="text-sm" /> : <FaDownload className="text-sm" />}
            </button>

            {/* Three-Wing Options */}
            <div className={`absolute top-0 left-0 w-full h-full pointer-events-none z-10 transition-all duration-300 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}>

                {/* PDF Option - Left-Bottom Wing */}
                <button
                    onClick={handleDownloadPDF}
                    className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md bg-red-500 hover:bg-red-600 transition-all duration-300 pointer-events-auto
                        ${isOpen ? '-translate-x-12 translate-y-2' : 'translate-x-0 translate-y-0'}`}
                    title="PDF"
                >
                    <FaFilePdf size={14} />
                </button>

                {/* Excel Option - Bottom Wing */}
                <button
                    onClick={handleDownloadExcel}
                    className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md bg-emerald-500 hover:bg-emerald-600 transition-all duration-300 pointer-events-auto
                        ${isOpen ? 'translate-x-0 translate-y-12' : 'translate-x-0 translate-y-0'}`}
                    title="Excel"
                >
                    <FaFileExcel size={14} />
                </button>

                {/* Word Option - Right-Bottom Wing */}
                <button
                    onClick={handleDownloadWord}
                    className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md bg-blue-500 hover:bg-blue-600 transition-all duration-300 pointer-events-auto
                        ${isOpen ? 'translate-x-12 translate-y-2' : 'translate-x-0 translate-y-0'}`}
                    title="Word"
                >
                    <FaFileWord size={14} />
                </button>
            </div>
        </div>
    );
};

export default DownloadDropdown;
