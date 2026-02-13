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
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Save scanned barcode
  const saveScannedBarcode = (scannedValue: string) => {
    const cleanValue = scannedValue.trim()
    if (!cleanValue) return

    setScannedItems(prev => {
      if (prev.some(item => item.serialNumber === cleanValue)) {
        setMessage({ type: 'error', text: `Serial number ${cleanValue} already scanned!` })
        setTimeout(() => setMessage(null), 2000)
        return prev
      }

      const newItem: ScannedItem = {
        id: Date.now().toString(),
        serialNumber: cleanValue,
        timestamp: new Date(),
      }

      setMessage({ type: 'success', text: `Scanned: ${cleanValue}` })
      setTimeout(() => setMessage(null), 2000)

      return [...prev, newItem]
    })

    setCurrentScan('')

    // Refocus for next scan
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Keep input focused when scanning enabled
  useEffect(() => {
    if (!isScanning) return

    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isScanning])

  const toggleScanning = () => {
    setIsScanning(prev => !prev)
    setCurrentScan('')

    if (!isScanning) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
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

    const data = [
      ['Count', 'Serial Number'],
      ...scannedItems.map((item, index) => [
        index + 1, // Count starting from 1
        item.serialNumber,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Scanned Serial Numbers')

    // Set column widths: Count, Serial Number
    ws['!cols'] = [{ wch: 10 }, { wch: 30 }]

    const fileName = `scanned_serial_numbers_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    setMessage({ type: 'success', text: `Excel file downloaded: ${fileName}` })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Barcode Serial to Excel</h1>
        <p>Property of Vuyo Mbanjwa. Licensed</p>
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
          <span className="stat-value">
            <span style={{ 
              display: 'inline-block', 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: isScanning ? '#ffffff' : '#999999',
              marginRight: '8px',
              boxShadow: isScanning ? '0 0 8px rgba(255, 255, 255, 0.6)' : '0 0 8px rgba(153, 153, 153, 0.6)'
            }}></span>
            {isScanning ? 'Ready' : 'Paused'}
          </span>
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
            onChange={(e) => {
              const value = e.target.value
              setCurrentScan(value)

              if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
              }

              autoSaveTimeoutRef.current = setTimeout(() => {
                if (value.trim().length > 0) {
                  saveScannedBarcode(value)
                }
              }, 300)
            }}
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
            scannedItems.map(item => (
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
