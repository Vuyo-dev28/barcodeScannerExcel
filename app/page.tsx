'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import * as XLSX from 'xlsx'

interface ScannedItem {
  id: string
  serialNumber: string
  timestamp: Date
}

export default function Home() {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const qrCodeRegionId = 'qr-reader'

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setMessage(null)
      const html5QrCode = new Html5Qrcode(qrCodeRegionId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Error starting scanner:', err)
      setMessage({ type: 'error', text: 'Failed to start camera. Please check permissions.' })
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
      setIsScanning(false)
    } catch (err) {
      console.error('Error stopping scanner:', err)
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
        <h1>📱 iKhokha Barcode Scanner</h1>
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
          <span className="stat-value">{isScanning ? '🟢' : '🔴'}</span>
          <span className="stat-label">Scanner Status</span>
        </div>
      </div>

      <div className="scanner-section">
        <div className="scanner-container">
          <div id={qrCodeRegionId} style={{ width: '100%' }}></div>
        </div>
        <div className="scanner-controls">
          {!isScanning ? (
            <button className="btn btn-primary" onClick={startScanning}>
              Start Scanning
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopScanning}>
              Stop Scanning
            </button>
          )}
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
              <p>Click "Start Scanning" to begin.</p>
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
    </div>
  )
}
