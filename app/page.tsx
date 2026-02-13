'use client'

import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'

interface ScannedItem {
  id: string
  serialNumber: string
  timestamp: Date
}

export default function Home() {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentScan, setCurrentScan] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus the input field when component mounts or scanning is enabled
    if (isScanning && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isScanning])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isScanning) {
      e.preventDefault()
      return
    }

    // If Enter is pressed, process the scanned barcode
    if (e.key === 'Enter') {
      e.preventDefault()
      const scannedValue = currentScan.trim()
      if (scannedValue) {
        handleScanSuccess(scannedValue)
        setCurrentScan('')
        // Refocus input for next scan
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 100)
      }
    }
  }

  const toggleScanning = () => {
    setIsScanning(prev => !prev)
    if (!isScanning && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const handleScanSuccess = (serialNumber: string) => {
    // Check if already scanned
    if (scannedItems.some(item => item.serialNumber === serialNumber)) {
      setMessage({ type: 'error', text: `Serial number ${serialNumber} already scanned!` })
      return
    }

    const newItem: ScannedItem = {
      id: Date.now().toString(),
      serialNumber,
      timestamp: new Date(),
    }

    setScannedItems(prev => [...prev, newItem])
    setMessage({ type: 'success', text: `Scanned: ${serialNumber}` })
    
    // Clear message after 2 seconds
    setTimeout(() => setMessage(null), 2000)
  }

  const removeItem = (id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id))
  }

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all scanned items?')) {
      setScannedItems([])
      setMessage({ type: 'success', text: 'All items cleared' })
      setTimeout(() => setMessage(null), 2000)
    }
  }

  const downloadExcel = () => {
    if (scannedItems.length === 0) {
      setMessage({ type: 'error', text: 'No serial numbers to export!' })
      return
    }

    // Prepare data for Excel
    const data = [
      ['Serial Number', 'Timestamp'], // Header row
      ...scannedItems.map(item => [
        item.serialNumber,
        item.timestamp.toLocaleString(),
      ]),
    ]

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Scanned Serial Numbers')

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Serial Number column
      { wch: 25 }, // Timestamp column
    ]

    // Generate Excel file and download
    const fileName = `scanned_serial_numbers_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    setMessage({ type: 'success', text: `Excel file downloaded: ${fileName}` })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📱 Barcode Serial to Excel</h1>
        <p>Scan serial numbers and export to Excel</p>
      </div>

      {message && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}

      <div className="stats">
        <div className="stat-item">
          <span className="stat-value">{scannedItems.length}</span>
          <span className="stat-label">Total Scanned</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{isScanning ? '🟢 Ready' : '🔴 Paused'}</span>
          <span className="stat-label">Scanner Status</span>
        </div>
      </div>

      <div className="scanner-section">
        <div className="scanner-container zebra-scanner">
          <div className="scanner-instructions">
            <h3>Zebra Scanner Ready</h3>
            <p>Point your Zebra scanner at a barcode and scan</p>
            <p className="scanner-hint">The scanner will automatically capture the barcode</p>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="scanner-input"
            value={currentScan}
            onChange={(e) => setCurrentScan(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Scan barcode here..."
            autoFocus
            disabled={!isScanning}
          />
        </div>
        <div className="scanner-controls">
          <button 
            className={isScanning ? 'btn btn-danger' : 'btn btn-primary'} 
            onClick={toggleScanning}
          >
            {isScanning ? 'Pause Scanning' : 'Resume Scanning'}
          </button>
          {scannedItems.length > 0 && (
            <>
              <button className="btn btn-success" onClick={downloadExcel}>
                Download Excel
              </button>
              <button className="btn btn-danger" onClick={clearAll}>
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      <div className="scanned-list">
        <h2>Scanned Serial Numbers ({scannedItems.length})</h2>
        <div className="scanned-items">
          {scannedItems.length === 0 ? (
            <div className="empty-state">
              <p>No serial numbers scanned yet.</p>
              <p>Use your Zebra scanner to scan barcodes.</p>
            </div>
          ) : (
            scannedItems.map((item) => (
              <div key={item.id} className="scanned-item">
                <span>{item.serialNumber}</span>
                <button
                  className="remove-btn"
                  onClick={() => removeItem(item.id)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <footer className="footer">
        <p>Property of Vuyo Mbanjwa. Licensed</p>
      </footer>
    </div>
  )
}
