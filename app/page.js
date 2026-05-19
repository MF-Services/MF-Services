'use client'
import { useState } from 'react'
import CablePlanConfigurator from '../components/CablePlanConfigurator'
import SpecGenerator from '../components/SpecGenerator'
import OverpressureCalculator from '../components/OverpressureCalculator'

const TABS = [
  { id: 'hardwareSpec', label: 'Hardware Spec' },
  { id: 'cablePlan', label: 'Cable Plan' },
  { id: 'overpressure', label: 'Overpressure Calculator' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('hardwareSpec')

  return (
    <div className="mf-page-shell" style={{ minHeight: '100vh', background: '#F8F9FA', color: '#0F1C2E', fontFamily: 'DM Sans, sans-serif' }}>
      <div className="mf-page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 32px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, background: '#FFFFFF', borderRadius: 16, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: 12,
                padding: '14px 18px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === tab.id ? '#00387B' : '#F3F4F6',
                color: activeTab === tab.id ? '#FFFFFF' : '#374151',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'hardwareSpec' && <SpecGenerator />}
        {activeTab === 'cablePlan' && <CablePlanConfigurator />}
        {activeTab === 'overpressure' && <OverpressureCalculator />}
      </div>
    </div>
  )
}