/**
 * Emergency Crash Prevention System
 * Provides global error handling and safe property access
 */
(function () {
  'use strict'
  console.log('🚨 EMERGENCY CRASH PREVENTION LOADING...')

  // Immediate error catching
  window.addEventListener('error', function (event) {
    console.log(
      '🛡️ Emergency caught error:',
      event.error?.message || 'Unknown'
    )
    event.preventDefault()
    return true
  })

  window.addEventListener('unhandledrejection', function (event) {
    console.log('🛡️ Emergency caught rejection:', event.reason)
    event.preventDefault()
  })

  // Safe property access
  window.safeAccess = function (obj, path, defaultValue = null) {
    try {
      if (!obj) return defaultValue
      const keys = path.split('.')
      let current = obj
      for (const key of keys) {
        if (current === null || current === undefined) return defaultValue
        current = current[key]
      }
      return current !== undefined ? current : defaultValue
    } catch (e) {
      return defaultValue
    }
  }

  // Emergency cleanup
  window.emergencyCleanup = function () {
    console.log('🚨 EMERGENCY CLEANUP')
    try {
      // Clear intervals and timeouts
      for (let i = 1; i < 10000; i++) {
        clearInterval(i)
        clearTimeout(i)
      }
    } catch (e) {}
  }

  console.log('✅ Emergency protection active')
})()
