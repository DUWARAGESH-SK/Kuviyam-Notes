import { useState } from 'react'

function App() {
  return (
    <div className="w-[400px] h-[500px] p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-tokyo-accent">Kuviyam</h1>
      <div className="flex-1 bg-tokyo-card rounded-lg p-4 shadow-lg">
        <p>Your ideas, gathered.</p>
      </div>
    </div>
  )
}

export default App
