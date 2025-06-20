const fs = require('fs')

function findJavaScriptError () {
  const html = fs.readFileSync('src/static/index.html', 'utf8')
  const scriptMatch = html.match(/<script[^>]*>(.*?)<\/script>/s)

  if (!scriptMatch) {
    console.log('❌ No script tag found')
    return
  }

  const js = scriptMatch[1]
  const lines = js.split('\n')

  console.log(`📊 Total JavaScript lines: ${lines.length}`)

  // Try to find the error by testing chunks
  const errorLine = -1
  let errorMessage = ''

  // Test the entire script first
  try {
    new Function(js)
    console.log('✅ Full JavaScript is valid (this should not happen)')
    return
  } catch (error) {
    console.log('❌ Full JavaScript error:', error.message)
    errorMessage = error.message
  }

  // Binary search for the error
  function testChunk (startLine, endLine) {
    if (startLine >= endLine) return startLine

    const chunk = lines.slice(startLine, endLine).join('\n')
    try {
      new Function(chunk)
      // This chunk is fine, error is after
      return testChunk(endLine, lines.length)
    } catch (error) {
      if (endLine - startLine === 1) {
        // Found the problematic line
        return startLine
      }
      // Error is in this chunk, narrow it down
      const midPoint = Math.floor((startLine + endLine) / 2)
      const firstHalf = testChunk(startLine, midPoint)
      if (firstHalf !== -1) return firstHalf
      return testChunk(midPoint, endLine)
    }
  }

  // Find error line by testing progressively larger chunks
  for (let i = 1; i <= lines.length; i += 100) {
    const chunk = lines.slice(0, i).join('\n')
    try {
      new Function(chunk)
    } catch (error) {
      console.log(`❌ Error found around line ${i}: ${error.message}`)

      // Narrow down to exact line
      for (let j = Math.max(0, i - 100); j < i; j++) {
        const testChunk = lines.slice(0, j + 1).join('\n')
        try {
          new Function(testChunk)
        } catch (err) {
          console.log(`🎯 Exact error at line ${j + 1}:`)
          console.log(`Line content: ${lines[j]}`)
          console.log(`Error: ${err.message}`)

          // Show context
          console.log('\n📋 Context (5 lines before and after):')
          for (
            let k = Math.max(0, j - 5);
            k <= Math.min(lines.length - 1, j + 5);
            k++
          ) {
            const marker = k === j ? '>>> ' : '    '
            console.log(`${marker}${k + 1}: ${lines[k]}`)
          }
          return
        }
      }
      break
    }
  }
}

findJavaScriptError()
