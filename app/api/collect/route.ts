import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const DATA_FILE = path.join(process.cwd(), 'youtube_data.json')

export async function POST() {
  try {
    // Run the Python collector
    execSync('python3 cli.py collect', { cwd: process.cwd(), timeout: 30000 })

    // Read updated data
    let added = 0
    let total = 0
    let last_update: string | null = null

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8')
        const data = JSON.parse(raw)
        added = data.videos?.length || 0
        total = data.videos?.length || 0
        last_update = data.last_update || null
      } catch (e) {
        // ignore parse errors
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功收集 ${added} 部影片`,
      added,
      total,
      last_update,
    })
  } catch (error: any) {
    console.error('Collect API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '收集失敗',
        stderr: error.stderr?.toString() || '',
      },
      { status: 500 }
    )
  }
}
