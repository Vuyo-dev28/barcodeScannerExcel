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
  const scanBufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const scannedItemsRef = useRef<ScannedItem[]>([])
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    scannedItemsRef.current = scannedItems
  }, [scannedItems])

  // Function to save scanned barcode
  const saveScannedBarcode = (scannedValue: string) => {
    if (!scannedValue.trim()) return

    // Check if already scanned
    if (scannedItemsRef.current.some(item => item.serialNumber === scannedValue.trim())) {
      setMessage({ type: 'error', text: `Serial number ${scannedValue.trim()} already scanned!` })
      setTimeout(() => setMessage(null), 2000)
    } else {
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        serialNumber: scannedValue.trim(),
        timestamp: new Date(),
      }
      setScannedItems(prev => [...prev, newItem])
      setMessage({ type: 'success', text: `Scanned: ${scannedValue.trim()}` })
      setTimeout(() => setMessage(null), 2000)
    }
    
    scanBufferRef.current = ''
    setCurrentScan('')
    
    // Clear any pending auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }
    
    // Refocus input for next scan
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 50)
  }

  useEffect(() => {
    // Keep input field focused when scanning is enabled
    const keepFocused = () => {
      if (isScanning && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }

    // Focus immediately and set up interval to keep it focused
    if (isScanning) {
      keepFocused()
      const focusInterval = setInterval(keepFocused, 500)
      return () => clearInterval(focusInterval)
    }
  }, [isScanning])

  useEffect(() => {
    // Global keyboard listener for Zebra scanner auto-capture
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isScanning) return

      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current

      // If Enter is pressed, immediately save the scanned barcode
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        
        const scannedValue = scanBufferRef.current
        if (scannedValue) {
          saveScannedBarcode(scannedValue)
        }
        return
      }

      // Handle character input (Zebra scanners send characters very quickly)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If more than 500ms passed since last key, reset buffer (new scan)
        if (timeSinceLastKey > 500) {
          scanBufferRef.current = ''
          // Clear any pending auto-save timeout
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
            autoSaveTimeoutRef.current = null
          }
        }
        
        scanBufferRef.current += e.key
        setCurrentScan(scanBufferRef.current)
        lastKeyTimeRef.current = now

        // Clear existing auto-save timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }

        // Set auto-save timeout - if no more characters come in 200ms, save automatically
        // This handles cases where Enter might not be captured
        autoSaveTimeoutRef.current = setTimeout(() => {
          const valueToSave = scanBufferRef.current
          if (valueToSave && valueToSave.length > 0) {
            saveScannedBarcode(valueToSave)
          }
        }, 200)

        // Auto-focus input if not already focused
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
        }
      }
    }

    // Add global listener
    window.addEventListener('keydown', handleGlobalKeyDown, true)
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true)
      // Cleanup auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isScanning])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Let the global handler process it, but prevent default for Enter
    if (e.key === 'Enter' && isScanning) {
      e.preventDefault()
    }
  }

  const toggleScanning = () => {
    setIsScanning(prev => !prev)
    scanBufferRef.current = ''
    setCurrentScan('')
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
